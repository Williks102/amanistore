'use client';

import { useEffect, useState } from 'react';
import { Cart } from './Cart';

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {children}
      <Cart />
    </>
  );
};
