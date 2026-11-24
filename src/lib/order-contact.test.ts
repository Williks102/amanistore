import { describe, it, expect } from 'vitest';
import { customerWhatsappLink, internationalDigits, telHref } from './order-contact';

describe('contact de la cliente', () => {
  it('indicatif explicite (+ ou 00): chiffres pour wa.me', () => {
    expect(internationalDigits('+225 07 12 34 56 78')).toBe('2250712345678');
    expect(internationalDigits('+221 77 123 45 67')).toBe('221771234567');
    expect(internationalDigits('00225 0712345678')).toBe('2250712345678');
  });

  it('sans indicatif: on ne devine pas le pays', () => {
    expect(internationalDigits('77 123 45 67')).toBeNull();
    expect(internationalDigits('0172698282')).toBeNull();
    expect(internationalDigits('(225) 07-12-34-56-78')).toBeNull();
  });

  it('numéros absurdes refusés', () => {
    expect(internationalDigits('+12')).toBeNull();
    expect(internationalDigits('+' + '1'.repeat(20))).toBeNull();
    expect(internationalDigits('')).toBeNull();
  });

  it('lien d’appel: chiffres et +', () => {
    expect(telHref(' +221 77 123-45.67 ')).toBe('tel:+221771234567');
  });

  it('lien WhatsApp: message encodé, ou null sans indicatif', () => {
    expect(customerWhatsappLink('+221 77 123 45 67', 'Bonjour & merci')).toBe('https://wa.me/221771234567?text=Bonjour%20%26%20merci');
    expect(customerWhatsappLink('77 123 45 67', 'Bonjour')).toBeNull();
  });
});
