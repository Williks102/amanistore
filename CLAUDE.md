# CLAUDE.md — Amani's (boutique de chaussures)

## Stack
Next.js (App Router), Firebase (Auth, Firestore, Admin SDK dans les Server Actions), Cloudinary pour les images, Tailwind et composants shadcn/ui. Interface et messages en **français**, code en **anglais**.

## Tests
- `npm test` : tests unitaires (Server Actions, rôles, promos, stock), sans réseau.
- `npm run test:rules` : règles Firestore avec l'émulateur.
- Avant toute PR : `npx tsc --noEmit`, `npm test`, `npm run test:rules`, `npx next build`.

## Sécurité (à ne pas défaire)
- Toute Server Action sensible vérifie le jeton Firebase et le rôle (`src/lib/server-auth.ts`, rôles lus dans `roles/{uid}`, jamais dans `users/{uid}`).
- Une commande se crée seulement par `createOrder` (prix, remise, stock et code de livraison calculés côté serveur). Elle accepte les **invités** (jeton absent): limite de débit plus stricte (3 par 10 min et par IP), champ piège anti-robot, au plus 3 commandes en attente par numéro de téléphone, et un **secret propre à la commande** (renvoyé une seule fois, gardé sur l'appareil, relu par `getGuestOrder`). Un jeton fourni mais invalide est refusé, jamais traité comme un invité. Le secret ne sort jamais du serveur (`orderFromDoc` le retire). À la connexion, `claimGuestOrders` rattache au compte les commandes d'invité de l'appareil (preuve: le secret, supprimé ensuite).
- Le profil client (`users/{uid}`: nom, téléphone, adresse) est borné par les règles (100, 30 et 500 caractères) et ne permet toujours aucun rôle.
- Un produit au prix hors 1 000 à 1 000 000 XOF est masqué de la boutique et refusé par `createOrder`; pointures (16 à 50) et couleurs (palette `src/lib/colors.ts`) sont validées côté serveur.
- **Notifications de commande** (`src/lib/notify.ts`): Telegram et/ou e-mail (Resend), activés par les variables `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `NOTIFY_EMAIL_TO` (et `NOTIFY_EMAIL_FROM`), saisies dans Vercel uniquement. Le message ne contient jamais téléphone, adresse ni code de livraison (services tiers); l'envoi part après la réponse (`after`) et ne peut pas faire échouer une commande; les jetons ne sont jamais journalisés ni renvoyés au navigateur.
- Les règles Firestore refusent par défaut ; les modifier impose de mettre à jour `tests/rules`.

## Pièges connus (vus en production)
- **Une Server Action ne renvoie que des objets simples.** Un champ Timestamp Firestore (`claimedAt`, `date`…) fait échouer la réponse et vide l'admin. Tout document renvoyé passe par `plainDoc` / `orderFromDoc` (`src/app/actions.ts`), et les commandes par une liste blanche de champs. Un test le garantit: ne pas le contourner.
- Un fichier `'use server'` n'exporte que des fonctions asynchrones.
- Une panne de lecture ne doit jamais s'afficher comme « introuvable » ou « aucune donnée »: erreur explicite avec « Réessayer » (`LoadError`, `src/app/error.tsx`), et chargement de l'admin source par source.
- Contrôler les **journaux d'erreurs de Vercel** après une mise en ligne importante.

## Produits et attributs
- Un produit décrit ses choix par **attributs** (Pointure, Couleur, Taille, Matière…), 2 au plus, créés dans l'admin (`attributes`) et copiés sur le produit (`options`); stock par combinaison ou partagé par premier attribut (`variantStock`). Tout passe par `src/lib/attributes.ts` (`productOptions` lit aussi les produits anciens). Plan et état: `docs/plan-attributs.md`.
- Le serveur relit les attributs en base et revalide chaque choix dans `createOrder`: jamais de nom, valeur ou stock pris du navigateur.

## Interface et charte visuelle
Objectif : une boutique **chaleureuse, moderne et utilisable au téléphone** (audit et plan : `docs/audit-interface.md`).
- **Jetons de couleur** uniquement (`src/app/globals.css`) : pas de couleur en dur dans les écrans. Une nouvelle charte se branche en changeant ces valeurs.
- **Mobile d'abord** (360 px puis `md`), zones tactiles de **44 px** au moins, contraste **AA** (4,5:1) vérifié par calcul, jamais l'information par la couleur seule (un badge porte du texte), rien d'accessible uniquement au survol, pas de défilement horizontal de la page.
- Libellé toujours visible au-dessus d'un champ ; chaque liste a ses états chargement, vide et erreur ; animations de 200 ms au plus, coupées si `prefers-reduced-motion`.
- Chaque refonte se fait **une PR par étape**, mesurée à 390, 768 et 1280 px avant et après.
- **Mesurer aussi les fenêtres** (panier, formulaire de commande, filtres) à 320, 360 et 390 px: aucun élément ne doit dépasser de sa fenêtre ni être coupé. Un prix coupé dans le panier a échappé à la seule mesure de la taille des boutons.
