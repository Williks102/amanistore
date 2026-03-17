'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import Header from '@/components/Header';
import { StyleGuideAssistant } from '@/components/StyleGuideAssistant';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Category, Shoe } from '@/lib/types';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
import { useCart } from '@/hooks/use-cart';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const [shoe, setShoe] = useState<Shoe | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCheckout } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [products, fetchedCategories] = await Promise.all([getProducts(), getCategories()]);
        setCategories(fetchedCategories);
        const currentShoe = products.find((product) => product.id === params.id) || null;
        setShoe(currentShoe);
      } catch (error) {
        console.error('Failed to fetch product page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (!shoe) return;
    setSelectedSize(shoe.availableSizes[0] || null);
    setSelectedColor(shoe.availableColors[0]?.name || null);
  }, [shoe]);

  const totalPrice = useMemo(() => (shoe ? shoe.price * quantity : 0), [shoe, quantity]);

  const validateSelection = () => {
    if (!shoe || !selectedSize || !selectedColor) {
      toast({
        title: 'Sélection requise',
        description: "Veuillez sélectionner une taille et une couleur.",
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!shoe || !validateSelection() || !selectedSize || !selectedColor) return;
    addItem(shoe, quantity, selectedSize, selectedColor);
    toast({
      title: 'Ajouté au panier !',
      description: `${quantity} x ${shoe.name} (Taille: ${selectedSize}, Couleur: ${selectedColor})`,
    });
  };

  const handleBuyNow = () => {
    if (!shoe || !validateSelection() || !selectedSize || !selectedColor) return;
    addItem(shoe, quantity, selectedSize, selectedColor);
    openCheckout();
  };

  const handleShareOnWhatsApp = () => {
    if (!shoe || !validateSelection() || !selectedSize || !selectedColor) return;

    const shopNumber = '2250172698282';
    const message = `Bonjour, je souhaiterais acheter cette chaussure : *${shoe.name}*.\n\n*Options choisies :*\n- Taille : ${selectedSize}\n- Couleur : ${selectedColor}\n- Quantité : ${quantity}`;
    const whatsappUrl = `https://wa.me/${shopNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header categories={categories} onToggleSidebar={() => undefined} />
      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la boutique
          </Link>
        </Button>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-1/2" />
            </div>
          </div>
        ) : !shoe ? (
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold mb-2">Produit introuvable</h1>
            <p className="text-muted-foreground mb-6">Le lien produit est invalide ou le produit n'existe plus.</p>
            <Button asChild>
              <Link href="/shop">Voir tous les produits</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <Carousel className="w-full">
                <CarouselContent>
                  {shoe.detailImages.map((image, index) => (
                    <CarouselItem key={image.id || index}>
                      <div className="aspect-square relative rounded-lg overflow-hidden border">
                        <Image src={image.url} alt={`${shoe.name} - vue ${index + 1}`} fill className="object-cover" data-ai-hint={image.hint} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl font-bold font-headline">{shoe.name}</h1>
              <p className="text-muted-foreground">{shoe.description}</p>
              <div className="bg-accent/50 rounded-lg p-4">
                <p className="text-3xl font-bold text-primary">{`${totalPrice.toLocaleString('fr-FR')} XOF`}</p>
              </div>

              <div>
                <Label className="text-lg font-semibold">Couleur</Label>
                <div className="flex items-center gap-3 mt-2">
                  {shoe.availableColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 focus:outline-none',
                        selectedColor === color.name ? 'ring-2 ring-offset-2 ring-primary' : 'border-border'
                      )}
                      style={{ backgroundColor: color.hex }}
                      aria-label={`Select color ${color.name}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold">Taille</Label>
                <RadioGroup value={selectedSize?.toString()} onValueChange={(val) => setSelectedSize(Number(val))} className="grid grid-cols-4 gap-2 mt-2">
                  {shoe.availableSizes.map((size) => (
                    <div key={size} className="flex items-center">
                      <RadioGroupItem value={size.toString()} id={`size-${size}`} className="sr-only" />
                      <Label
                        htmlFor={`size-${size}`}
                        className={cn(
                          'flex items-center justify-center w-full h-10 rounded-md border text-sm font-medium cursor-pointer transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          selectedSize === size ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'
                        )}
                      >
                        {size}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-3 block">Quantité</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />
              <StyleGuideAssistant shoeDescription={shoe.description} />
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-5 w-5" /> Ajouter au panier
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button size="lg" variant="secondary" onClick={handleBuyNow}>Acheter</Button>
                  <Button onClick={handleShareOnWhatsApp} variant="outline" className="bg-green-500 hover:bg-green-600 text-white">
                    <WhatsAppIcon className="mr-2 h-5 w-5" /> WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
