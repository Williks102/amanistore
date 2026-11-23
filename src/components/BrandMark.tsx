/** Monogramme « A » d'Amani's (même dessin que le favicon `src/app/icon.svg`). */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="9" fill="hsl(var(--primary))" />
      <path
        d="M8.5 24 16 8l7.5 16M11.3 18.6h9.4"
        fill="none"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
