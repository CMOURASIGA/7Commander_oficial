function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type VoiceGlyphProps = {
  state: "idle" | "listening" | "processing" | "paused";
  className?: string;
};

export function VoiceGlyph({ state, className }: VoiceGlyphProps) {
  if (state === "processing") {
    return (
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className={joinClasses("h-6 w-6", className)}
        fill="none"
      >
        <rect x="8" y="20" width="6" height="8" rx="3" fill="currentColor" opacity="0.55" />
        <rect x="21" y="14" width="6" height="20" rx="3" fill="currentColor" />
        <rect x="34" y="18" width="6" height="12" rx="3" fill="currentColor" opacity="0.75" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={joinClasses("h-6 w-6", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="18" y="8" width="12" height="19" rx="6" />
      <path d="M13 22c0 6.08 4.92 11 11 11s11-4.92 11-11" />
      <path d="M24 33v7" />
      <path d="M18 40h12" />
      {state !== "paused" ? (
        <>
          <path d="M37.5 16.5c2.2 1.86 3.5 4.61 3.5 7.5s-1.3 5.64-3.5 7.5" opacity={state === "idle" ? 0.55 : 1} />
          <path d="M10.5 16.5C8.3 18.36 7 21.11 7 24s1.3 5.64 3.5 7.5" opacity={state === "idle" ? 0.55 : 1} />
        </>
      ) : (
        <path d="M11 11l26 26" />
      )}
    </svg>
  );
}
