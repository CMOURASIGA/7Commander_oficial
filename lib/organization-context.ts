import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationRole = "owner" | "admin" | "manager" | "member";

export type OrganizationContext = {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
};

function organizationSlug(email: string, userId: string): string {
  const base = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "empresa";
  return `${base}-${userId.slice(0, 8)}`;
}

export async function resolveOrganizationContext(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<OrganizationContext | null> {
  const membership = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership.data) {
    const organization = Array.isArray(membership.data.organizations)
      ? membership.data.organizations[0]
      : membership.data.organizations;
    return {
      organizationId: membership.data.organization_id,
      organizationName: organization?.name ?? "Empresa",
      role: membership.data.role as OrganizationRole,
    };
  }

  if (membership.error) {
    console.error("[organization-context] membership lookup failed", membership.error);
    return null;
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const pendingInvite = normalizedEmail
    ? await supabase
        .from("organization_invites")
        .select("id, organization_id, role, organizations(name)")
        .eq("email", normalizedEmail)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  if (pendingInvite.data) {
    const accepted = await supabase.from("organization_members").insert({
      organization_id: pendingInvite.data.organization_id,
      user_id: userId,
      role: pendingInvite.data.role,
      status: "active",
    });
    if (accepted.error) throw accepted.error;
    await supabase.from("organization_invites").update({ status: "accepted" }).eq("id", pendingInvite.data.id);
    const organization = Array.isArray(pendingInvite.data.organizations)
      ? pendingInvite.data.organizations[0]
      : pendingInvite.data.organizations;
    return {
      organizationId: pendingInvite.data.organization_id,
      organizationName: organization?.name ?? "Empresa",
      role: pendingInvite.data.role as OrganizationRole,
    };
  }

  const fallbackName = normalizedEmail ? normalizedEmail.split("@")[0] : "Nova empresa";
  const createdOrganization = await supabase
    .from("organizations")
    .insert({
      name: fallbackName,
      slug: organizationSlug(normalizedEmail, userId),
      created_by: userId,
    })
    .select("id, name")
    .single();
  if (createdOrganization.error || !createdOrganization.data) throw createdOrganization.error;

  const createdMembership = await supabase.from("organization_members").insert({
    organization_id: createdOrganization.data.id,
    user_id: userId,
    role: "owner",
    status: "active",
  });
  if (createdMembership.error) throw createdMembership.error;

  return {
    organizationId: createdOrganization.data.id,
    organizationName: createdOrganization.data.name,
    role: "owner",
  };
}
