'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { getMyRoles } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import type { Roles } from '@/lib/server-auth';

type Role = keyof Roles;

/**
 * Affiche ses enfants uniquement si l'utilisateur possède un des rôles requis.
 * Le rôle est vérifié par le serveur (jeton vérifié + roles/{uid}). Ce composant
 * n'est qu'un confort d'interface: chaque action serveur revérifie de toute façon.
 */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      const { roles } = await getMyRoles(await getIdToken());
      if (cancelled) return;
      setStatus(roles && (roles.admin || allow.some((r) => roles[r])) ? 'allowed' : 'denied');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isUserLoading, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (status === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n&apos;avez pas les droits pour accéder à cette page.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
