import type { ReactNode } from 'react';

/** État vide des listes: une phrase claire, et si possible la suite à donner. */
export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
      {icon ? <div aria-hidden="true" className="text-muted-foreground">{icon}</div> : null}
      <p className="font-medium text-foreground">{title}</p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
