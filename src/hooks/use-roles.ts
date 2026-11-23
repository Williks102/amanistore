'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { getMyRoles } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import type { Roles } from '@/lib/server-auth';

/**
 * Rôles de l'utilisateur connecté, vérifiés par le serveur (jeton + roles/{uid}).
 * `roles` vaut null tant que le chargement n'est pas terminé ou si l'utilisateur est déconnecté.
 */
export function useRoles(): { roles: Roles | null; isRolesLoading: boolean; hasStaffAccess: boolean } {
  const { user, isUserLoading } = useUser();
  const [roles, setRoles] = useState<Roles | null>(null);
  const [isRolesLoading, setIsRolesLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setRoles(null);
      setIsRolesLoading(false);
      return;
    }
    let cancelled = false;
    setIsRolesLoading(true);
    (async () => {
      const { roles: fetched } = await getMyRoles(await getIdToken());
      if (cancelled) return;
      setRoles(fetched);
      setIsRolesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, isUserLoading]);

  const hasStaffAccess = !!roles && (roles.admin || roles.productManager || roles.orderManager);
  return { roles, isRolesLoading, hasStaffAccess };
}
