'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { cn } from '@/lib/utils';

type ActionProps = {
  className?: string;
  /** Affiche seulement l'icône (barres d'outils étroites). */
  iconOnly?: boolean;
  variant?: 'ghost' | 'outline' | 'default' | 'secondary';
  /** Appelé au clic (par exemple pour fermer un menu mobile). */
  onNavigate?: () => void;
};

/** Retour à l'accueil de la boutique. */
export function HomeButton({ className, iconOnly, variant = 'ghost', onNavigate }: ActionProps) {
  return (
    <Button
      asChild
      variant={variant}
      size={iconOnly ? 'icon' : 'default'}
      className={cn(!iconOnly && 'justify-start', className)}
    >
      <Link href="/" onClick={onNavigate} aria-label="Accueil">
        <Home className={cn('h-4 w-4', !iconOnly && 'mr-2')} />
        {!iconOnly && 'Accueil'}
      </Link>
    </Button>
  );
}

/** Déconnexion Firebase puis retour à l'accueil. */
export function LogoutButton({ className, iconOnly, variant = 'ghost', onNavigate }: ActionProps) {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    onNavigate?.();
    try {
      await signOut(auth);
    } finally {
      router.replace('/');
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? 'icon' : 'default'}
      onClick={handleLogout}
      aria-label="Déconnexion"
      className={cn(!iconOnly && 'justify-start', className)}
    >
      <LogOut className={cn('h-4 w-4', !iconOnly && 'mr-2')} />
      {!iconOnly && 'Déconnexion'}
    </Button>
  );
}
