export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Ariadne's Thread">
      <path
        d="M8 38 C16 38 12 16 21 16 C29 16 26 34 34 32 C39 30.8 38 14 41 11"
        fill="none"
        stroke="var(--dot)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="8" cy="38" r="3.4" fill="var(--dot)" />
      <circle cx="21" cy="16" r="3.4" fill="var(--dot)" />
      <circle cx="34" cy="32" r="3.4" fill="var(--dot)" />
      <circle cx="41" cy="11" r="4.6" fill="var(--logo-dot)" />
    </svg>
  );
}

/** Small thread icon used inside outlined buttons (Synthesize, bookmarklet). */
export function ThreadIcon({ size = 14, muted = false, working = false }: { size?: number; muted?: boolean; working?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={working ? "threadWorking" : undefined}>
      <path
        d="M8 38 C16 38 12 16 21 16 C29 16 26 34 34 32 C39 30.8 38 14 41 11"
        fill="none"
        stroke={muted ? "var(--dot)" : "currentColor"}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {working ? (
        /* While working the dot rides the thread itself (offset-path in CSS). */
        <circle r="5" fill="var(--logo-dot)" className="tDot" />
      ) : (
        <circle cx="41" cy="11" r="5" fill="var(--logo-dot)" />
      )}
    </svg>
  );
}
