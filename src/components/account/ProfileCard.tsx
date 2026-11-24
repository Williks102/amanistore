'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { EMPTY_PROFILE, type Profile } from '@/lib/profile';

/** Coordonnées enregistrées: elles préremplissent le formulaire de commande. */
export function ProfileCard() {
  const { profile, isLoading, loaded, save } = useProfile(true);
  const { toast } = useToast();
  const [form, setForm] = useState<Profile>(EMPTY_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) setForm(profile);
  }, [loaded, profile]);

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const problem = await save(form);
    setSaving(false);
    if (problem) setError(problem);
    else toast({ title: 'Coordonnées enregistrées', description: 'Elles seront préremplies à votre prochaine commande.' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes coordonnées</CardTitle>
        <CardDescription>Préremplies à chaque commande, pour ne pas tout retaper.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate aria-busy={isLoading}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nom complet</Label>
            <Input id="profile-name" autoComplete="name" value={form.name} onChange={set('name')} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Numéro de téléphone</Label>
            <Input id="profile-phone" type="tel" autoComplete="tel" placeholder="Ex: 77 123 45 67" value={form.phone} onChange={set('phone')} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-address">Lieu de livraison</Label>
            <Textarea id="profile-address" autoComplete="street-address" placeholder="Quartier, rue, repère" value={form.address} onChange={set('address')} disabled={isLoading} />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving || isLoading}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…</> : 'Enregistrer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
