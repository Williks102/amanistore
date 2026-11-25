'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Filet de sécurité Radix: quand on change de page pendant qu'un menu ou un tiroir est ouvert
 * (ex.: « Admin » dans le menu du compte), la page précédente disparaît avant que Radix libère
 * le corps du document, qui garde `pointer-events: none` et bloque tous les clics jusqu'à
 * l'actualisation. Après chaque navigation, on libère le corps si plus rien n'est ouvert.
 */
export function BodyUnlock() {
  const pathname = usePathname();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const open = document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]');
      if (!open && document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
