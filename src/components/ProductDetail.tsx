'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Shoe } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { StyleGuideLauncher } from '@/components/StyleGuideAssistant';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { canonicalColor } from '@/lib/colors';
import { availableStock, stockSummary } from '@/lib/stock';
import { SITE, whatsappLink } from '@/lib/site';
import { cn } from '@/lib/utils';

const MAX_PER_LINE = 20; // même plafond que le serveur

export function ProductDetail({ shoe }: { shoe: Shoe }) {
  const { addItem, openCheckout } = useCart();
  const { toast } = useToast();

  const images = useMemo(() => {
    const all = [shoe.gridImage, ...(shoe.detailImages ?? [])].filter((i) => i?.url);
    return all.filter((img, i) => all.findIndex((o) => o.url === img.url) === i);
  }, [shoe]);
  const colors = useMemo(() => shoe.availableColors.map((c) => ({ name: c.name, hex: canonicalColor(c.name)?.hex ?? c.hex })), [shoe]);
  const summary = stockSummary(shoe);

  const [imageIndex, setImageIndex] = useState(0);
  // Une couleur seule est présélectionnée; la pointure ne l'est jamais (aucun choix silencieux).
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0].name : null);
  const [size, setSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const colorRef = useRef<HTMLFieldSetElement>(null);
  const sizeRef = useRef<HTMLFieldSetElement>(null);

  const stockLeft = size !== null ? availableStock(shoe, size) : null;
  const maxQty = Math.min(stockLeft ?? MAX_PER_LINE, MAX_PER_LINE);
  const total = shoe.price * quantity;

  /** Vérifie le choix; sinon explique, et amène la cliente sur la partie à compléter. */
  const validate = (): { size: number; color: string } | null => {
    if (colors.length > 1 && !color) {
      setError('Choisissez une couleur.');
      colorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return null;
    }
    if (size === null) {
      setError('Choisissez une pointure.');
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return null;
    }
    setError(null);
    return { size, color: color ?? colors[0]?.name ?? '' };
  };

  const handleAdd = () => {
    const choice = validate();
    if (!choice) return;
    addItem(shoe, quantity, choice.size, choice.color);
    toast({ title: 'Ajouté au panier', description: `${quantity} × ${shoe.name} (pointure ${choice.size}, ${choice.color})` });
  };

  const handleBuyNow = () => {
    const choice = validate();
    if (!choice) return;
    addItem(shoe, quantity, choice.size, choice.color);
    openCheckout();
  };

  const handleWhatsApp = () => {
    const choice = validate();
    if (!choice) return;
    const message =
      `Bonjour, je souhaiterais acheter cette chaussure : *${shoe.name}*.\n${SITE.url}/produit/${shoe.id}\n\n` +
      `*Options choisies :*\n- Pointure : ${choice.size}\n- Couleur : ${choice.color}\n- Quantité : ${quantity}`;
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

          {colors.length > 0 && (
            <fieldset ref={colorRef} className="space-y-2">
              <legend className="text-lg font-semibold">
                Couleur{color ? <span className="font-normal text-muted-foreground"> : {color}</span> : null}
              </legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c.name} type="button" aria-pressed={color === c.name} onClick={() => { setColor(c.name); setError(null); }} className={chip(color === c.name)}>
                    <span aria-hidden="true" className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset ref={sizeRef} className="space-y-2">
            <legend className="text-lg font-semibold">
              Pointure{size !== null ? <span className="font-normal text-muted-foreground"> : {size}</span> : null}
            </legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {shoe.availableSizes.map((s) => {
                const left = availableStock(shoe, s);
                const soldOut = left === 0;
                const selected = size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={soldOut}
                    aria-pressed={selected}
                    aria-label={soldOut ? `Pointure ${s}, épuisée` : `Pointure ${s}`}
                    onClick={() => { setSize(s); setError(null); setQuantity((q) => Math.min(q, Math.max(1, availableStock(shoe, s) ?? MAX_PER_LINE))); }}
                    className={cn(
                      'h-11 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-accent',
                      soldOut && 'cursor-not-allowed opacity-40 line-through hover:bg-background'
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {stockLeft !== null && stockLeft > 0 && stockLeft <= 3 && <p className="text-sm text-amber-800">Plus que {stockLeft} en stock</p>}
          </fieldset>

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

          <StyleGuideLauncher shoeDescription={shoe.description} />
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
