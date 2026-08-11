import { Suspense } from "react";
import { AuthCallbackClient } from "@/app/auth/callback/callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <section className="rounded-xl border border-(--border) bg-(--bg-surface) p-6 text-sm text-(--text-primary)">
          Concluindo autenticacao...
        </section>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
