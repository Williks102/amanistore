import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

// Aperçu de partage (WhatsApp, Facebook, etc.): généré, donc toujours à jour avec la charte.
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 96, background: '#FAF9F5', color: '#201F1E' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ width: 120, height: 120, borderRadius: 34, background: '#B6532F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 84, fontWeight: 700 }}>
            A
          </div>
          <div style={{ fontSize: 96, fontWeight: 700, color: '#B6532F' }}>{SITE.name}</div>
        </div>
        <div style={{ marginTop: 56, fontSize: 52, lineHeight: 1.25, maxWidth: 900 }}>{SITE.tagline}</div>
        <div style={{ marginTop: 28, fontSize: 36, color: '#5F5B53' }}>{SITE.subtitle}</div>
      </div>
    ),
    size
  );
}
