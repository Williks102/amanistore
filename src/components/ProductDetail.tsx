'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Selection, Shoe } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { StyleGuideLauncher } from '@/components/StyleGuideAssistant';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { availableStockFor, productOptions, shoeColors, stockSummaryFor, valueSoldOut } from '@/lib/attributes';
import { SITE, whatsappLink } from '@/lib/site';
import { cn } from '@/lib/utils';

const MAX_PER_LINE = 20; // même plafond que le serveur

/** « Choisissez une pointure. » pour les attributs connus, sinon « Choisissez : Matière. » */
const chooseMessage = (name: string): string => {
  const known: Record<string, string> = { pointure: 'une pointure', couleur: 'une couleur', taille: 'une taille', matiere: 'une matière' };
  const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return known[key] ? `Choisissez ${known[key]}.` : `Choisissez : ${name}.`;
};

export function ProductDetail({ shoe, styleAssistant = false }: { shoe: Shoe; styleAssistant?: boolean }) {
  const { addItem, openCheckout } = useCart();
  const { toast } = useToast();

  const images = useMemo(() => {
    const all = [shoe.gridImage, ...(shoe.detailImages ?? [])].filter((i) => i?.url);
    return all.filter((img, i) => all.findIndex((o) => o.url === img.url) === i);
  }, [shoe]);
  const options = useMemo(() => productOptions(shoe), [shoe]);
  const swatches = useMemo(() => new Map(shoeColors(shoe).map((c) => [c.name, c.hex])), [shoe]);
  const summary = stockSummaryFor(shoe);

  const [imageIndex, setImageIndex] = useState(0);
  // Un attribut à une seule valeur est présélectionné; sinon aucun choix silencieux.
  const [chosen, setChosen] = useState<Array<string | null>>(() => options.map((o) => (o.values.length === 1 ? o.values[0] : null)));
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const groupRefs = useRef<Array<HTMLFieldSetElement | null>>([]);

  const complete = chosen.every((v) => v !== null);
  const stockLeft = complete ? availableStockFor(shoe, chosen as string[]) : null;
  // Produit sans attribut (sac): quantité unique, la limite vaut pour tout le produit.
  const maxQty = Math.min(stockLeft ?? MAX_PER_LINE, MAX_PER_LINE);
  const total = shoe.price * quantity;

  const choose = (index: number, value: string) => {
    const next = chosen.map((v, i) => (i === index ? value : v));
    setChosen(next);
    setError(null);
    if (next.every((v) => v !== null)) {
      const left = availableStockFor(shoe, next as string[]);
      setQuantity((q) => Math.min(q, Math.max(1, left ?? MAX_PER_LINE)));
    }
  };

  /** Vérifie le choix; sinon explique, et amène la cliente sur la partie à compléter. */
  const validate = (): Selection | null => {
    const missing = chosen.findIndex((v) => v === null);
    if (missing !== -1) {
      setError(chooseMessage(options[missing].name));
      groupRefs.current[missing]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return null;
    }
    setError(null);
    return options.map((o, i) => ({ name: o.name, value: chosen[i] as string }));
  };

  const handleAdd = () => {
    const selection = validate();
    if (!selection) return;
    addItem(shoe, quantity, selection);
    toast({ title: 'Ajouté au panier', description: `${quantity} × ${shoe.name}${selection.length ? ` (${selection.map((s) => s.value).join(', ')})` : ''}` });
  };

  const handleBuyNow = () => {
    const selection = validate();
    if (!selection) return;
    addItem(shoe, quantity, selection);
    openCheckout();
  };

  const handleWhatsApp = () => {
    const selection = validate();
    if (!selection) return;
    const choices = selection.map((s) => `- ${s.name} : ${s.value}\n`).join('');
    const message =
      `Bonjour, je souhaiterais acheter cet article : *${shoe.name}*.\n${SITE.url}/produit/${shoe.id}\n\n` +
      `*Options choisies :*\n${choices}- Quantité : ${quantity}`;
    window.open(whatsappLink(message), '_blank', 'noopener,noreferrer');
  };

  const chip = (selected: boolean) =>
    cn(
      'flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      selected ? 'border-primary bg-primary/10 font-medium' : 'border-input bg-background hover:bg-accent'
    );

  return (
    <div className="container mx-auto px-4 pb-28 pt-4 md:pb-12 md:pt-8">
      <nav aria-label="Fil d'Ariane" className="mb-2">
        <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Retour à la boutique
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Galerie */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
            <Image
              key={images[imageIndex]?.url}
              src={images[imageIndex]?.url ?? shoe.gridImage.url}
              alt={`${shoe.name}, photo ${imageIndex + 1} sur ${images.length}`}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          {images.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Photos du produit">
              {images.map((img, i) => (
                <li key={img.url} className="shrink-0">
                  <button
                    type="button"
                    aria-label={`Voir la photo ${i + 1}`}
                    aria-current={i === imageIndex}
                    onClick={() => setImageIndex(i)}
                    className={cn('relative block h-16 w-16 overflow-hidden rounded-lg border-2 bg-secondary', i === imageIndex ? 'border-primary' : 'border-transparent')}
                  >
                    <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Informations et choix */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold leading-tight md:text-4xl">{shoe.name}</h1>
            <p className="text-2xl font-semibold text-primary">{`XOF ${shoe.price.toLocaleString('fr-FR')}`}</p>
            {summary.soldOut && <Badge variant="secondary" className="border border-border bg-background text-foreground">Épuisé</Badge>}
          </div>

          {shoe.description && <p className="text-muted-foreground">{shoe.description}</p>}

          {options.map((option, index) => (
            <fieldset key={option.attributeId} ref={(el) => { groupRefs.current[index] = el; }} className="space-y-2">
              <legend className="text-lg font-semibold">
                {option.name}{chosen[index] ? <span className="font-normal text-muted-foreground"> : {chosen[index]}</span> : null}
              </legend>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const selected = chosen[index] === value;
                  const soldOut = valueSoldOut(shoe, index, value, chosen);
                  const hex = option.kind === 'color' ? swatches.get(value) ?? '#C5C7CB' : null;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={soldOut}
                      aria-pressed={selected}
                      aria-label={soldOut ? `${option.name} ${value}, épuisé` : option.kind === 'color' ? value : `${option.name} ${value}`}
                      onClick={() => choose(index, value)}
                      className={cn(
                        hex !== null ? chip(selected) : cn(
                          'flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-accent'
                        ),
                        soldOut && 'cursor-not-allowed opacity-40 line-through hover:bg-background'
                      )}
                    >
                      {hex !== null && <span aria-hidden="true" className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: hex }} />}
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {stockLeft !== null && stockLeft > 0 && stockLeft <= 3 && <p className="text-sm text-amber-800">Plus que {stockLeft} en stock</p>}

          {error && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <p className="text-lg font-semibold">Quantité</p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon" aria-label="Diminuer la quantité" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
                <Minus className="h-4 w-4" />
              </Button>
              <span aria-live="polite" className="w-10 text-center text-xl font-bold">{quantity}</span>
              <Button type="button" variant="outline" size="icon" aria-label="Augmenter la quantité" onClick={() => setQuantity((q) => Math.min(q + 1, maxQty))} disabled={quantity >= maxQty}>
                <Plus className="h-4 w-4" />
              </Button>
              <span className="ml-2 text-sm text-muted-foreground">Total : {total.toLocaleString('fr-FR')} XOF</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button size="lg" className="hidden w-full md:inline-flex" onClick={handleAdd} disabled={summary.soldOut}>
              <ShoppingCart className="h-5 w-5" /> Ajouter au panier
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={handleBuyNow} disabled={summary.soldOut}>Acheter maintenant</Button>
            <Button size="lg" variant="outline" className="w-full" onClick={handleWhatsApp}>
              <WhatsAppIcon className="h-5 w-5" /> Commander sur WhatsApp
            </Button>
          </div>

          {styleAssistant && <StyleGuideLauncher shoeDescription={shoe.description} />}
        </div>
      </div>

      {/* Barre d'achat compacte sur téléphone: le prix et l'action principale restent à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="truncate text-lg font-bold">{`${total.toLocaleString('fr-FR')} XOF`}</p>
        </div>
        <Button size="lg" className="flex-1" onClick={handleAdd} disabled={summary.soldOut}>
          <ShoppingCart className="h-5 w-5" /> Ajouter au panier
        </Button>
      </div>
    </div>
  );
}
