# Plan: attributs de produit (Pointure, Couleur, Taille, Matière…)

Statut: **étape 1 faite (PR « cœur sans interface »)**, étapes 2 à 5 à venir. Décision du propriétaire: 2 attributs par produit au maximum, une PR par étape.

## Objectif
Aujourd'hui, la pointure (nombre 16 à 50) et la couleur (palette de 19) sont écrites en dur partout. On les remplace par des **attributs** créés dans l'admin: un attribut a un nom et des valeurs (Pointure: 38, 39, 40; Taille: S, M, L; Matière: doré, argenté). Un produit choisit 0, 1 ou 2 attributs et, pour chacun, les valeurs proposées. Les chaussures, vêtements, bijoux et sacs utilisent le même mécanisme.

## Ce que le code fait aujourd'hui (à remplacer)
- `Shoe.availableSizes: number[]`, `Shoe.availableColors: ShoeColor[]`, `Shoe.stock: Record<pointure, quantité>` (stock par pointure, **toutes couleurs confondues**).
- `CartItem` et lignes de commande: `size: number`, `color: string`. Identifiant de ligne `produit-pointure-couleur`.
- Validation serveur (`createOrder`): pointure dans `availableSizes`, couleur dans la palette, stock par pointure, clé `produit|pointure`.
- Mentions « Pointure » en dur: fiche produit, panier, commande, confirmation, WhatsApp, notifications, « Recommander », tableau de bord, filtres, `size-rows.ts`, `stock.ts`, `reorder.ts`.
- Collection Firestore des produits: `shoes` (on ne la renomme pas).

## Modèle de données

### Collection `attributes/{id}` (nouvelle)
```
{ name: "Pointure", kind: "text" | "color", values: [{ label: "40", hex?: "#..." }], position: number }
```
- `kind: "color"` garde le sélecteur de pastilles (la palette actuelle devient l'attribut « Couleur », créé par la migration).
- Lecture publique, écriture réservée au serveur (rôles `admin` et `productManager`), règles Firestore + tests `tests/rules`.
- Limites: nom 1 à 40 caractères, 1 à 60 valeurs par attribut, valeur 1 à 30 caractères, pas de doublon (comparaison sans accents ni casse).

### Produit (`shoes/{id}`)
Ajouts, **les anciens champs restent lus** (voir « Compatibilité »):
```
options?: [{ attributeId, name, values: string[] }]   // 0, 1 ou 2 entrées; name = copie figée du nom
stockScope?: "combination" | "attribute1"            // absent = stock non suivi (illimité)
variantStock?: Record<clé, number>                    // clé = variantKey(valeurs choisies)
```
- `variantKey` (fonction pure): valeurs dans l'ordre des options, normalisées et encodées (pas de `.` ni `/` dans les clés Firestore).
- `stockScope: "combination"`: un stock par combinaison (Noir + 40: 3). Plafond de **100 combinaisons** par produit.
- `stockScope: "attribute1"`: un stock par valeur du premier attribut, partagé entre les valeurs du second. C'est le comportement actuel des chaussures (stock par pointure, toutes couleurs confondues); la migration l'utilise pour ne rien changer au stock existant.

### Ligne de panier / commande
```
selection?: [{ name: "Pointure", value: "40" }, { name: "Couleur", value: "Noir" }]  // copie figée
```
Les champs `size` et `color` sont **conservés** pour les produits à Pointure + Couleur (anciennes commandes, tableau de bord, « Recommander »). Les anciennes commandes ne sont jamais réécrites.

## Compatibilité (point central)
Une fonction `productOptions(shoe)` renvoie toujours la liste d'options: celle de `options` si elle existe, sinon **construite à partir des anciens champs** (Pointure = `availableSizes`, Couleur = `availableColors`). Tout le code (fiche, panier, serveur, stock, tests) passe par elle. Conséquence: pas de « jour J », on migre produit par produit, et rien ne casse tant que la migration n'est pas lancée.

## Sécurité (à ne pas défaire)
- Les valeurs choisies sont **revalidées côté serveur** contre le produit lu en base, jamais contre ce que le navigateur envoie.
- Prix, remise, stock et code de livraison restent calculés côté serveur dans la transaction de `createOrder`; le stock se décrémente sur la clé de combinaison.
- Les actions de gestion des attributs exigent jeton + rôle (`server-auth.ts`), comme les produits.
- Aucune valeur d'attribut dans les notifications au-delà de ce qui y figure déjà (jamais téléphone, adresse ni code de livraison).
- Une Server Action ne renvoie que des objets simples: les attributs passent par `plainDoc`.
- Les règles Firestore refusent par défaut; toute modification s'accompagne de tests (`npm run test:rules`).

## Étapes (une PR chacune, mesurée à 390, 768 et 1280 px; fenêtres aussi à 320, 360 et 390)
1. **Cœur sans interface**: types, `productOptions`, `variantKey`, stock par combinaison et par premier attribut, validation, plan « Recommander ». Tests unitaires d'abord (chaussure ancienne, chaussure migrée, sac sans attribut, bague, vêtement à 2 attributs, plafond de 100 combinaisons).
2. **Serveur**: actions `getAttributes`/`createAttribute`/`updateAttribute`/`deleteAttribute`; `createOrder` et `createProduct`/`updateProduct` qui acceptent `options` et `selection`, tout en acceptant les anciens paniers (`size`, `color`); règles Firestore + tests des règles.
3. **Admin**: page « Attributs » (cartes, pas de tableau); formulaire produit: choisir 0 à 2 attributs, cocher les valeurs, grille de stock (une ligne par combinaison, bouton « Générer les combinaisons »), état de chargement/vide/erreur. Remplace `SizeStockEditor`.
4. **Boutique**: fiche produit (un sélecteur par attribut, combinaison épuisée grisée avec texte), carte produit, panier, commande, confirmation, WhatsApp, notifications, « Recommander », compte client, tableau de bord. Textes « Pointure » remplacés par le nom de l'attribut.
5. **Migration et nettoyage**: bouton admin « Convertir les produits » avec **aperçu avant application** (comme « Normaliser les couleurs »), création des attributs Pointure et Couleur, `stockScope: "attribute1"` pour les chaussures déjà suivies. Filtres de la boutique par attribut. Retrait des anciens champs seulement une fois tout converti (PR séparée, plus tard).

## Risques et parades
| Risque | Parade |
|---|---|
| Commande en cours avec un ancien panier (`size`, `color`) | Le serveur accepte les deux formes; test dédié |
| Explosion du nombre de combinaisons sur téléphone | Plafond de 100, génération par bouton, saisie par ligne |
| Stock faux après migration | Aperçu obligatoire; `attribute1` conserve exactement la règle actuelle; test d'équivalence ancien/nouveau |
| Attribut renommé ou supprimé alors que des produits l'utilisent | Nom copié sur le produit; suppression refusée tant qu'un produit l'utilise |
| Réponse de Server Action non sérialisable (incident du 24/11) | `plainDoc` partout; test des objets simples étendu aux attributs |
| Régression de l'affichage mobile | Mesures 320 à 1280 px, cibles de 44 px, contraste AA |

## Hors périmètre (plus tard)
Plus de 2 attributs, images par couleur, prix différent selon la combinaison, import CSV, filtres avancés.

## Questions ouvertes
1. Stock des **nouveaux** produits: par combinaison (recommandé) ou aussi partagé par premier attribut?
2. Un attribut de type « couleur » garde-t-il les pastilles de la palette actuelle (recommandé), ou toutes les valeurs deviennent-elles du texte?
3. Sacs et bijoux sans attribut: quantité unique par produit (recommandé).

## Décisions prises (réponses du propriétaire: « avec tes recommandations »)
1. Stock des nouveaux produits **par combinaison**; le mode « premier attribut » ne sert qu'aux chaussures migrées.
2. L'attribut de type « couleur » **garde les pastilles** de la palette.
3. Sacs et bijoux sans attribut: **une quantité unique** (clé de stock `_`).

## Étape 1 (faite): `src/lib/attributes.ts`
Fonctions pures, sans interface ni accès à la base: `productOptions`, `variantKey`, `combinations`, `resolveSelection`, `availableStockFor`, `applyStockChange`, `stockSummaryFor`, `firstAvailableCombination`, `validateAttribute`, `validateProductAttributes`. Aucun écran ni action serveur ne les appelle encore: **le comportement de la boutique est inchangé.** Un test vérifie que, pour un produit ancien, le stock calculé est identique à celui de `stock.ts`.
