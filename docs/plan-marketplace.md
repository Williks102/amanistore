# Plan: Amani's en place de marché (sacs, chaussures, bijoux, vêtements)

Statut: **plan, rien n'est codé.** Il part de ce que la boutique sait déjà faire (attributs de produit, commande invité, validation de livraison par code, notifications, rôles) et propose d'y ajouter des **vendeuses et vendeurs** sans tout réécrire.

## 1. Ce que veut dire « place de marché »
Aujourd'hui: **une boutique**, un seul vendeur (vous), un seul stock, une seule équipe.
Demain: **plusieurs vendeurs** publient leurs articles; la cliente achète au même endroit; Amani's encaisse une **commission** et garantit la confiance (qualité, livraison, litiges).

Ce qui change vraiment (et qui est difficile):
1. **La confiance**: une cliente achète à un inconnu. Il faut vérifier les vendeurs, modérer les annonces, gérer les litiges.
2. **L'argent**: qui encaisse, quand le vendeur est payé, comment la commission est prélevée.
3. **Les commandes multi-vendeurs**: un panier peut contenir un sac de A et des boucles d'oreilles de B, livrés par deux personnes différentes.
4. **Les abus**: contrefaçons, faux avis, vendeurs qui disparaissent après paiement.

## 2. Recommandation: démarrer petit et fermé
**Phase pilote sur invitation**: 5 à 20 vendeurs que vous connaissez, **paiement à la livraison** comme aujourd'hui (le code de validation de livraison existe déjà), commissions calculées automatiquement et **reversées à la main** au début. On automatise l'argent seulement quand le volume le justifie.

Pourquoi: la partie « paiement en ligne et reversement automatique » est la plus chère, la plus réglementée et la plus risquée. Le pilote prouve d'abord que des vendeurs publient et que des clientes achètent.

## 3. Ce qui est déjà prêt (à réutiliser)
| Besoin marché | Déjà là |
|---|---|
| Sacs, bijoux, vêtements, chaussures | **Attributs de produit** (Pointure, Taille, Matière, Couleur…, 2 par produit, stock par combinaison) |
| Commande sans compte, anti-robot, limites | `createOrder` (invité, secret de commande, limites par IP et téléphone) |
| Confirmer la remise au client | Code de livraison à 6 chiffres, `validateOrderDelivery` |
| Alerter l'équipe | Notifications Telegram / e-mail |
| Rôles et accès côté serveur | `roles/{uid}`, `requireRole`, règles Firestore testées |
| Admin mobile, tableau de bord | Admin par sources, `DashboardView` |

## 4. Ce qu'il faut construire

### 4.1 Vendeurs
- Collection `sellers/{id}`: nom de la boutique, responsable, téléphone, ville, pièce d'identité vérifiée (oui/non, jamais l'image dans la base publique), statut (`en attente`, `actif`, `suspendu`), taux de commission, coordonnées de paiement (accès admin seulement).
- Nouveau rôle **`seller`** dans `roles/{uid}` avec son `sellerId`. Un vendeur ne voit et ne modifie **que ses produits et ses commandes** (contrôle côté serveur à chaque action, jamais le `sellerId` envoyé par le navigateur).
- **Inscription sur invitation** au début (code d'invitation créé par l'admin), puis candidature ouverte avec validation manuelle.

### 4.2 Produits
- `shoes.sellerId` (à renommer `products` plus tard; pas urgent). Produit **en attente de validation** tant qu'un modérateur ne l'a pas approuvé (au moins pour les nouveaux vendeurs).
- **Gabarits par catégorie** pour que le vendeur n'invente pas: Chaussures = Pointure + Couleur, Vêtements = Taille + Couleur, Bijoux = Matière (+ Taille de bague), Sacs = Couleur. Cela réutilise le système d'attributs (le gabarit pré-remplit les attributs).
- Limites par vendeur: nombre de produits, nombre et poids des photos (déjà 5 Mo par image), prix dans la fourchette existante.
- Page **boutique du vendeur** (`/vendeur/[slug]`), filtre « vendeur » dans la boutique, nom du vendeur sur la fiche produit.

### 4.3 Commandes multi-vendeurs
- Une commande client contient des lignes de plusieurs vendeurs. On la **découpe en sous-commandes par vendeur** (`orders/{id}/parts/{sellerId}`) avec **un statut et un code de livraison par vendeur**.
- La cliente voit **une** commande avec le suivi de chaque colis; chaque vendeur ne voit que sa part, **sans le téléphone ni l'adresse complète tant qu'il n'a pas accepté** la commande (réduit la fuite de données et le contournement de la commission).
- Frais de livraison par vendeur ou par zone (décision à prendre, voir section 8).

### 4.4 Argent: commission et reversements
- **Registre** (`ledger`): une ligne par événement (vente livrée, commission, remboursement, versement), jamais modifiée, seulement complétée. Les soldes se calculent à partir du registre.
- Étape 1: commission calculée à la **livraison confirmée** (code validé), reversement **manuel** hebdomadaire par Mobile Money, avec un relevé exportable.
- Étape 2 (plus tard): **paiement en ligne** (Mobile Money ou carte) avec **séquestre**: l'argent n'est reversé au vendeur qu'après confirmation de livraison. Voir les risques réglementaires en section 7.

### 4.5 Confiance et litiges
- **Délai de réclamation** après livraison (par exemple 48 h) avant le reversement.
- Retours et litiges: ouverture par la cliente, échange de messages, décision de l'admin (remboursement, échange, rejet).
- **Avis vérifiés**: seulement après une commande livrée et validée par code.
- Signalement d'une annonce, suspension d'un vendeur, historique des décisions.

### 4.6 Vendeur: son espace
Version mobile d'abord (la plupart publieront depuis leur téléphone): ajouter un produit avec photos, gérer le stock, voir les commandes à préparer, voir son solde et ses versements. Réutilise les composants de l'admin (cartes, pas de tableaux larges).

### 4.7 Découvrabilité
Recherche et filtres par catégorie, **attribut** (déjà fait), vendeur, ville. Pages indexables (le sitemap existe, à étendre aux vendeurs).

## 5. Étapes (une PR par étape, comme d'habitude, mesurées de 320 à 1280 px)
| # | Étape | Contenu | Reste invisible pour les clientes |
|---|---|---|---|
| 1 | **Vendeurs et rôle `seller`** | collection `sellers`, rôle, règles Firestore + tests, actions serveur avec contrôle de propriété | oui |
| 2 | **Produits par vendeur** | `sellerId`, gabarits par catégorie, statut de validation, file de modération (admin) | oui |
| 3 | **Espace vendeur** | publier, modifier, stock, photos, depuis le téléphone | oui |
| 4 | **Commandes découpées** | sous-commandes par vendeur, code de livraison par vendeur, notifications au vendeur, masquage des coordonnées | partiellement |
| 5 | **Registre et commissions** | ledger, calcul à la livraison, relevé, export, écran de reversement manuel | oui |
| 6 | **Vitrine vendeurs** | pages vendeur, filtre vendeur, mention sur la fiche et le panier | **oui, ouverture du pilote** |
| 7 | **Litiges, retours, avis vérifiés** | ouverture, messagerie simple, décisions | oui |
| 8 | **Légal et confiance** | conditions de vente, conditions vendeur, livraison, confidentialité, signalement | oui |
| 9 | **Paiement en ligne et séquestre** | à décider après le pilote | oui |

Les étapes 1 à 5 sont **invisibles** du public: on peut les faire pendant que la boutique actuelle tourne normalement. Le pilote s'ouvre à l'étape 6.

## 6. Sécurité (à ne pas défaire)
- Un vendeur **ne peut jamais** lire les données d'un autre vendeur ni choisir son propre `sellerId`: il est lu depuis `roles/{uid}` côté serveur.
- Le prix, la commission et le stock restent calculés côté serveur (`createOrder`), jamais pris du navigateur.
- Téléphone et adresse de la cliente: visibles du vendeur **seulement pour ses colis acceptés**, jamais dans une notification Telegram ou e-mail (règle déjà en place).
- Limites de débit par vendeur (publication, upload de photos), journal des actions sensibles (suspension, remboursement, modification de commission).
- Règles Firestore: tout nouveau type de document a ses règles **et** ses tests (`tests/rules`).
- Vérifier l'identité du vendeur avant de lui verser de l'argent; ne jamais stocker de numéro de carte (le prestataire de paiement s'en charge).

## 7. Risques et parades
| Risque | Parade |
|---|---|
| Contrefaçons, annonces trompeuses | Modération avant publication pour les nouveaux vendeurs, signalement, suspension, liste de marques interdites |
| Vendeur qui ne livre pas | Reversement après livraison confirmée, délai de réclamation, suspension, avis vérifiés |
| Contournement de la commission (échange de numéros) | Coordonnées masquées jusqu'à l'acceptation, commission modeste, valeur du service (confiance, livraison) |
| Fraude au paiement | Paiement à la livraison au départ; prestataire agréé plus tard |
| **Réglementation de l'argent encaissé pour autrui** | **À faire vérifier par un juriste ou le prestataire de paiement avant l'étape 9** (agrément, séquestre, fiscalité de la commission). Je ne peux pas l'affirmer à votre place |
| Données personnelles des clientes | Accès minimal, masquage, durée de conservation, page de confidentialité (étape 8) |
| Qualité inégale des photos et descriptions | Gabarits, minimum de photos, modération, conseils de publication |
| Charge de modération pour une petite équipe | Pilote restreint, file de modération simple, règles claires, seuil de confiance (un vendeur fiable publie sans validation) |
| Coût de l'hébergement et de la base | Limites par vendeur; surveiller les lectures Firestore, les images Cloudinary et les journaux Vercel |

## 8. Décisions à prendre (recommandation en premier)
1. **Qui encaisse?** Recommandé au début: **paiement à la livraison** (comme aujourd'hui), commission reversée à la main. Plus tard: paiement en ligne avec séquestre.
2. **Qui livre?** Recommandé: **le vendeur livre** (ou son coursier) dans sa zone, avec le code de livraison. Alternative: Amani's collecte tout (plus de contrôle, plus de logistique).
3. **Commission**: pourcentage unique (par exemple entre 8 et 15 %, à fixer avec vos vendeurs) ou par catégorie. Recommandé: **un seul taux** au pilote, modifiable par vendeur.
4. **Pilote**: combien de vendeurs et dans quelles villes? Recommandé: **10 vendeurs maximum, une ou deux villes**.
5. **Vos propres articles**: restent-ils vendus par Amani's comme un vendeur (« Amani's » = `seller`)? Recommandé: **oui**, ce qui évite deux circuits.

## 9. Ce que je ne sais pas (à vérifier avant de promettre)
- Les **prestataires de paiement** disponibles dans vos pays (Mobile Money, cartes), leurs frais, et s'ils permettent un séquestre et des reversements à des tiers. À comparer avec leurs conditions actuelles.
- Les **obligations légales** pour une place de marché (statut, déclaration, TVA/impôt sur la commission, contrats avec les vendeurs).
- Le volume réel: nombre de vendeurs, d'articles et de commandes visés, pour dimensionner les limites.

## 10. Ce qu'on ne fait pas au départ
Application mobile native, messagerie en direct, promotions par vendeur, livraison gérée par Amani's, paiement multi-devises, classement algorithmique, programme de fidélité.
