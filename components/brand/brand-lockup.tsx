"use client";

import { BRAND_LOGO_URL, BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

type BrandLockupProps = {
  subtitle?: string;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  description?: string | null;
  tone?: "default" | "light";
};

const sizeMap = {
  sm: {
    logo: "h-auto w-[172px]",
    title: "text-sm",
    subtitle: "text-[13px]",
    description: "text-[11px]",
  },
  md: {
    logo: "h-auto w-[220px]",
    title: "text-base",
    subtitle: "text-xs",
    description: "text-xs",
  },
  lg: {
    logo: "h-auto w-[280px]",
    title: "text-xl",
    subtitle: "text-sm",
    description: "text-sm",
  },
} as const;

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const styles = sizeMap[size];

  return (
    <img src={BRAND_LOGO_URL} alt="Consult Services Tecnologia" className={styles.logo} />
  );
}

export function BrandLockup({
  subtitle = BRAND_SUBTITLE,
  align = "left",
  size = "md",
  description = "Clareza operacional em tempo real",
  tone = "default",
}: BrandLockupProps) {
  const styles = sizeMap[size];
  const textAlign = align === "center" ? "text-center" : "text-left";
  const wrapperAlign = align === "center" ? "items-center" : "items-start";
  const isLight = tone === "light";

  return (
    <div className={`flex flex-col ${wrapperAlign}`}>
      <BrandMark size={size} />
      <div className={`mt-3 min-w-0 ${textAlign}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${isLight ? "text-(--brand-highlight)" : "text-(--accent)"}`}>
          {BRAND_NAME}
        </p>
        <p className={`mt-1 font-semibold leading-5 ${isLight ? "text-white" : "text-(--text-primary)"} ${styles.title}`}>{subtitle}</p>
        {description ? (
          <p className={`mt-1 leading-5 ${isLight ? "text-white/65" : "text-(--text-secondary)"} ${styles.description}`}>{description}</p>
        ) : null}
      </div>
    </div>
  );
}
