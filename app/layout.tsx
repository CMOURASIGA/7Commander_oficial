import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { KairosAuthProvider } from "@/components/auth/kairos-auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { isAuthRequired } from "@/lib/env";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authRequired = isAuthRequired();

  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <KairosAuthProvider required={authRequired}>
              <AppShell>{children}</AppShell>
            </KairosAuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
