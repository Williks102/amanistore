'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError('Entrez une adresse e-mail valide.');
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      auth.languageCode = 'fr'; // l'e-mail de réinitialisation part en français
      await sendPasswordResetEmail(auth, address);
      setSent(true);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/too-many-requests') setError('Trop de demandes. Réessayez dans quelques minutes.');
      else if (code === 'auth/invalid-email') setError('Entrez une adresse e-mail valide.');
      // Tout autre cas (dont « compte inconnu »): même réponse que le succès, pour ne pas révéler quelles adresses ont un compte.
      else setSent(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>Entrez votre adresse e-mail: nous vous envoyons un lien pour choisir un nouveau mot de passe.</CardDescription>
        </CardHeader>
        {sent ? (
          <CardContent className="space-y-4 text-center" role="status">
            <MailCheck aria-hidden="true" className="mx-auto h-10 w-10 text-primary" />
            <p className="font-medium">Si un compte existe avec cette adresse, un e-mail vient de partir.</p>
            <p className="text-sm text-muted-foreground">Pensez à regarder dans les courriers indésirables. Le lien est valable un temps limité.</p>
          </CardContent>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <CardContent className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" autoComplete="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'reset-error' : undefined} />
              {error && <p id="reset-error" role="alert" className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…</> : 'Envoyer le lien'}
              </Button>
            </CardFooter>
          </form>
        )}
        <CardFooter className="justify-center">
          <Link href="/login" className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4 hover:text-primary">Retour à la connexion</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
