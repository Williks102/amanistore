import { MessageCircle, ShieldCheck, Truck } from 'lucide-react';
import { whatsappLink } from '@/lib/site';

/**
 * Trois garanties, uniquement des fonctions qui existent dans la boutique
 * (adresse de livraison saisie à la commande, code de validation remis au client, commande par WhatsApp).
 * Texte à valider par la boutique avant d'y ajouter des promesses (zones, délais, paiement).
 */
export function TrustStrip() {
  const item = 'flex items-start gap-3 rounded-xl border border-border bg-card p-4';
  return (
    <section aria-label="Nos engagements" className="container mx-auto px-4">
      <ul className="grid gap-3 sm:grid-cols-3">
        <li className={item}>
          <Truck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Livraison à votre adresse</p>
            <p className="text-sm text-muted-foreground">Indiquez votre adresse au moment de la commande.</p>
          </div>
        </li>
        <li className={item}>
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Réception sécurisée</p>
            <p className="text-sm text-muted-foreground">Un code de validation vous est remis: donnez-le au livreur à la réception.</p>
          </div>
        </li>
        <li>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={`${item} min-h-11 h-full hover:bg-accent`}>
            <MessageCircle aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Une question ?</p>
              <p className="text-sm text-muted-foreground">Écrivez-nous sur WhatsApp.</p>
            </div>
          </a>
        </li>
      </ul>
    </section>
  );
}
