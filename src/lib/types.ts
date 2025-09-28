export type ShoeColor = {
  name: string;
  hex: string;
};

export type ShoeImage = {
  id: string;
  url: string;
  hint: string;
};

export type Shoe = {
  id: number;
  name: string;
  description: string;
  price: number;
  gridImage: ShoeImage;
  availableSizes: number[];
  availableColors: ShoeColor[];
  detailImages: ShoeImage[];
};
