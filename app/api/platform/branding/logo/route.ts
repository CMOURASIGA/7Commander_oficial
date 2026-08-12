import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requirePlatformAdmin } from "@/lib/platform-admin";

const BUCKET = "brand-assets";

export async function POST(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const form = await request.formData();
  const file = form.get("file");
  const organizationId = String(form.get("organizationId") || "draft").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Envie uma imagem de ate 2 MB." }, { status: 400 });
  }
  const buckets = await access.db.storage.listBuckets();
  if (buckets.error) return NextResponse.json({ error: buckets.error.message }, { status: 500 });
  if (!buckets.data.some((bucket) => bucket.name === BUCKET)) {
    const created = await access.db.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] });
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 500 });
  }
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const path = `organizations/${organizationId}/${randomUUID()}.${extension}`;
  const uploaded = await access.db.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) return NextResponse.json({ error: uploaded.error.message }, { status: 500 });
  const { data } = access.db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
