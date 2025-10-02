'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendContactMessage } from '@/app/actions';
import { Loader2, MapPin, Phone } from 'lucide-react';
import { getCategories } from '@/services/categoryService';
import type { Category } from '@/lib/types';


const locations = [
  {
    name: "Amani'store - Palm Club",
    address: "Cocody, Cité des arts",
    phone: "+225 07 01 02 03 04",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Palm+Club+Hotel+Cocody+Abidjan"
  },
  {
    name: "Amani'store - Rond-point ADO",
    address: "Plateau, près de l'échangeur",
    phone: "+225 07 02 03 04 05",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Echangeur+de+l'amitié+ivoiro-japonaise+Abidjan"
  },
  {
    name: "Amani'store - Marcory",
    address: "Marcory, près du centre commercial",
    phone: "+225 07 03 04 05 06",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Cap+Sud+Marcory+Abidjan"
  }
];


export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

   useState(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories for header:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    
    const result = await sendContactMessage(formData);
    
    if (result.success) {
      toast({
        title: 'Message envoyé !',
        description: 'Merci de nous avoir contactés. Nous vous répondrons bientôt.',
      });
      (event.target as HTMLFormElement).reset();
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
    
    setIsSubmitting(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
       <Header categories={categories} onToggleSidebar={() => {}} />
       <main className="flex-grow container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-3xl">Contactez-nous</CardTitle>
                <CardDescription>
                  Vous avez une question ou une suggestion ? Remplissez le formulaire.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom</Label>
                      <Input id="name" name="name" placeholder="Votre nom complet" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" placeholder="Votre adresse e-mail" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet</Label>
                    <Input id="subject" name="subject" placeholder="Le sujet de votre message" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" name="message" placeholder="Tapez votre message ici..." required rows={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi en cours...
                      </>
                    ) : (
                      'Envoyer le message'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-8">
                 <div className="text-center lg:text-left">
                    <h2 className="text-3xl font-bold">Nos Boutiques</h2>
                    <p className="text-muted-foreground mt-2">Venez nous rendre visite dans nos points de vente.</p>
                 </div>
                 <div className="space-y-6">
                    {locations.map((location) => (
                        <Card key={location.name}>
                            <CardContent className="pt-6 flex flex-col sm:flex-row gap-6">
                                <div className="flex-grow">
                                    <h3 className="text-lg font-semibold">{location.name}</h3>
                                    <div className="text-muted-foreground mt-2 space-y-2">
                                        <p className="flex items-center">
                                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                                            <span>{location.address}</span>
                                        </p>
                                        <p className="flex items-center">
                                            <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                                            <span>{location.phone}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 self-center">
                                    <Button asChild>
                                        <a href={location.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                                            Voir sur la carte
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                 </div>
            </div>
        </div>
      </main>
    </div>
  );
}
