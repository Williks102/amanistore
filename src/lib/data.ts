import type { Shoe } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getImage = (id: string) => {
  const img = PlaceHolderImages.find((p) => p.id === id);
  if (!img) throw new Error(`Image with id ${id} not found.`);
  return { id, url: img.imageUrl, hint: img.imageHint };
};

export const shoes: Shoe[] = [
  {
    id: 1,
    name: 'Urban Stride Sneaker',
    description:
      'A versatile and stylish sneaker designed for the modern city dweller. Features a breathable mesh upper, cushioned insole, and a durable rubber outsole for all-day comfort and support. Perfect for casual outings and light athletic activities.',
    price: 45000,
    categoryId: 1, // Sneakers
    gridImage: getImage('urban-stride-sneaker-grid'),
    availableSizes: [39, 40, 41, 42, 43, 44],
    availableColors: [
      { name: 'Onyx Black', hex: '#353839' },
      { name: 'Cloud White', hex: '#F5F5F5' },
      { name: 'Steel Gray', hex: '#A9A9A9' },
    ],
    detailImages: [
      getImage('urban-stride-sneaker-1'),
      getImage('urban-stride-sneaker-2'),
      getImage('urban-stride-sneaker-3'),
    ],
  },
  {
    id: 2,
    name: 'Classic Leather Loafer',
    description:
      'Experience timeless elegance with our Classic Leather Loafers. Made from premium full-grain leather, these shoes feature a sleek design with meticulous stitching. The cushioned footbed and flexible sole provide superior comfort for formal events or office wear.',
    price: 75000,
    categoryId: 2, // Formal
    gridImage: getImage('classic-leather-loafer-grid'),
    availableSizes: [40, 41, 42, 43, 44, 45],
    availableColors: [
      { name: 'Mahogany Brown', hex: '#4C2722' },
      { name: 'Jet Black', hex: '#222222' },
    ],
    detailImages: [
      getImage('classic-leather-loafer-1'),
      getImage('classic-leather-loafer-2'),
      getImage('classic-leather-loafer-3'),
    ],
  },
  {
    id: 3,
    name: 'Vista Running Shoe',
    description:
      'Engineered for performance, the Vista Running Shoe offers a lightweight and responsive ride. Its advanced foam midsole provides excellent energy return, while the engineered mesh upper ensures breathability. Ideal for runners of all levels.',
    price: 62000,
    categoryId: 3, // Sport
    gridImage: getImage('vista-running-shoe-grid'),
    availableSizes: [38, 39, 40, 41, 42],
    availableColors: [
      { name: 'Ocean Blue', hex: '#0077BE' },
      { name: 'Crimson Red', hex: '#DC143C' },
      { name: 'Volt Green', hex: '#CEFF00' },
    ],
    detailImages: [
      getImage('vista-running-shoe-1'),
      getImage('vista-running-shoe-2'),
      getImage('vista-running-shoe-3'),
    ],
  },
];
