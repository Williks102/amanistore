# Audit de l'interface (23/11/2026) et plan de refonte

Méthode, reprise du dépôt Fiberoperate (`docs/audit-interface.md`) : captures de 5 écrans publics à 390 px (téléphone), 768 px (tablette) et 1280 px (PC) avec les vraies données de la boutique (66 produits), mesures automatiques (défilement horizontal, taille des zones tactiles, polices, contrastes calculés) et relecture à l'œil. Grille : accessibilité, tactile, mobile d'abord, jetons de couleur.

**Limites de cet audit.** Les écrans de connexion requise (`/admin`, `/dashboard`, `/validate-delivery`) n'ont pas été mesurés : ils demandent un compte. Les images (Cloudinary) ne se chargeaient pas dans l'environnement de mesure, donc la hiérarchie photo / texte des fiches produit n'est pas jugée ici. Pas de test sur un vrai téléphone.

## Ce qui est bon
- Aucun défilement horizontal à 390, 768 et 1280 px sur les 5 écrans mesurés.
- Libellés visibles au-dessus des champs ; messages en français ; navigation claire (Accueil, Boutique, Catégories, Contact).
- Les titres en serif (Playfair Display) donnent déjà un ton « boutique », à garder.

## Ce qui manquait (constats)
1. **Aucune couleur de marque** : palette gris et bleu marine, `--accent` identique à `--secondary`. Les boutons d'achat ne ressortent pas. Fond froid (`#F1F2F4`).
2. **Texte secondaire sous le seuil AA** : `--muted-foreground` (`#64748B`) sur le fond de page vaut **4,25:1** (seuil 4,5:1). Concerne les sous-titres, les descriptions de formulaires et les liens du pied de page.
3. **Zones tactiles trop petites** (cible : 44 px) : boutons de 40 × 40 px (menu, panier, ajout rapide « Commander », « Filtres », tri), **champs de formulaire de 40 px de haut**, liens de **18 px** de haut (« S'inscrire », « Se connecter », pied de page). Mesure à 390 px : 18 à 85 éléments trop petits selon l'écran, 85 sur la boutique.
4. **Fiche de connexion collée aux bords** à 390 px (aucune marge), centrée verticalement avec beaucoup de vide.
5. **Lien « Valider Livraison » visible de tous** dans la barre du haut, alors que la page demande maintenant un rôle `orderManager` : à montrer seulement au personnel.
6. **Aucun état de stock** sur les cartes produit alors que le stock par pointure existe (badges « Épuisé » / « Plus que N » absents).
7. **Écrans à plat** : cartes, listes et badges d'état gris ; états de commande (En attente, Prêt, Livré, Annulé) sans couleur ni distinction visuelle dans l'admin.
8. **Détails** : favicon en emoji, règle `font-family: Arial` résiduelle dans `globals.css`, polices chargées par des balises `<link>` Google Fonts (plus lourd sur mobile que `next/font`).

## Plan (une PR par étape)
1. **Charte visuelle** (*fait dans cette PR*) : jetons de couleur dans `globals.css` (fond crème, encre chaude, bordures beige, accent terre cuite, mode sombre chaud), `next/font` pour Playfair Display et le texte, remplacement des couleurs en dur par les jetons, suppression de la règle `Arial`. Contrastes calculés et notés (voir ci-dessous).
2. **Mobile et tactile** (*fait*) : champs, boutons et liens à 44 px au moins, marges de la carte de connexion, lien « Valider Livraison » réservé au personnel.
3. **Boutique** (*fait*) : badges de stock sur les cartes, pointures épuisées désactivées, couleurs à 44 px avec leur nom écrit, état d'erreur « Réessayer », images dimensionnées par écran. (La barre d'achat fixe en bas de la fiche produit existait déjà: je l'avais mise au plan à tort.)
4. **Admin** (*fait*) : badges d'état colorés avec texte, navigation groupée (Vue d'ensemble / Ventes / Boutique / Clients / Équipe), états vides, chargements en squelette.
5. **Détails** : logo/monogramme à la place de l'emoji, ton des messages d'erreur et des toasts.

### Palette retenue (contrastes calculés, WCAG)
| Usage | Couleurs | Contraste |
|---|---|---|
| Texte courant | encre `#1F1E1D` sur crème `#FAF9F5` | 15,8:1 |
| Texte discret | `#5F5B53` sur crème | 6,4:1 |
| Bouton principal | blanc sur `#B8532F` | 4,9:1 |
| Accent en texte | `#B8532F` sur crème | 4,6:1 |
| Mode sombre | crème sur `#262624` | 14,4:1 |

Écarté : l'orange clair `#D97757` avec du texte blanc (**3,1:1**, sous le seuil AA).
Inspiration : l'ambiance chaleureuse de l'interface de Claude (crème, serif, terre cuite), sans reprendre sa marque ni son logo.

### Résultat de l'étape 1 (mesuré après la refonte, mêmes écrans et mêmes tailles)
| Mesure | Avant | Après |
|---|---|---|
| Défilement horizontal (5 écrans × 3 tailles) | aucun | aucun |
| Fond de page | gris froid `#F1F2F4` | crème `#FAF9F5` |
| Texte secondaire sur le fond | 4,25:1 (échec AA) | 6,4:1 |
| Bouton principal | marine, comme tout le reste | terre cuite, 4,9:1 avec du texte blanc |
| Contour des champs | pâle, quasi invisible | 3:1 au moins (non-texte) |
| Contrastes protégés par un test | aucun | 34 (`src/lib/contrast.test.ts`, thèmes clair et sombre) |
| Polices | Google Fonts par `<link>` | Inter et Playfair Display embarquées (`@fontsource`) |
| Zones tactiles trop petites (390 px, boutique) | 85 | 85 : **inchangé, c'est l'étape 2** |

Changements de détail : prix des cartes en `text-primary` plein (il était à 80 % d'opacité, donc sous 4,5:1), boutons WhatsApp en `green-700` (le `green-500` avec du texte blanc ne faisait que 2,3:1), encadrés du code de livraison passés des bleus en dur aux jetons, fonds de connexion et d'inscription sur `bg-background`. Le texte courant passe de PT Sans à Inter (plus lisible en petit, chiffres plus nets pour les prix) ; Playfair Display reste pour les titres de produits.

### Résultat de l'étape 2 (mesuré avec un appareil tactile à 390 et 768 px, souris à 1280 px)
| Mesure | Avant | Après |
|---|---|---|
| Éléments cliquables sous 44 × 44 px (5 écrans × 3 tailles) | 18 à 91 par écran | **0** |
| Défilement horizontal | aucun | aucun |
| Carte de connexion à 390 px | collée aux bords | marge de 16 px |
| Lien « Valider Livraison » | visible de tous | réservé aux comptes `admin` et `orderManager` |
| Liens des catégories du pied de page | menaient à une ancre inexistante, 17 px de haut | mènent à `/shop?category=…`, 44 px |

Changements : boutons, champs, listes déroulantes et menus à 44 px (composants partagés `ui/`), flèches de carrousel de 44 px, liens du pied de page et du menu mobile à 44 px, réseaux sociaux de 44 px, « Tous droits réservés » en français. Les écrans qui demandent une connexion (`/admin`, `/dashboard`) n'ont pas été mesurés, mais ils utilisent les mêmes composants.

### Résultat de l'étape 3
- **Badges de stock** sur les cartes: « Épuisé » (et bouton d'ajout rapide désactivé), « Plus que N » à 3 paires ou moins. Pas de badge quand le stock n'est pas suivi. L'ajout rapide choisit la première pointure **en stock** (avant: toujours la première, même épuisée).
- **Fiche produit**: pastilles de couleur de 32 à 44 px de zone cliquable, nom de la couleur choisie écrit à côté du libellé (l'information n'est plus portée par la couleur seule), libellés en français, « CFA » remplacé par « XOF » comme partout ailleurs.
- **État d'erreur** (boutique et accueil): avant, si Firestore ne répondait pas, la boutique affichait « Aucun produit trouvé », ce qui est faux. Mesuré en coupant Firestore: l'erreur s'affiche en 1 s avec « Réessayer » (`LoadError`), et un chargement normal n'affiche pas d'erreur (66 produits). Cause: une réponse vide venant du cache est maintenant traitée comme « serveur injoignable ».
- **Images**: attribut `sizes` sur les cartes (le navigateur ne télécharge plus une image de 600 px pour une carte de 390 px).
- Limite: les badges de stock ne sont vérifiés que par les tests de leur logique (3 tests), pas à l'écran, car aucun produit de la boutique n'a de stock renseigné et je ne modifie pas vos données.

### Résultat de l'étape 4
- **Badges d'état de commande** (`OrderStatusBadge`): En attente en ambre, Prêt en terre cuite, Livré en vert, Annulé en gris, **toujours avec le texte et un point** (jamais la couleur seule). Utilisés dans l'admin (nouvelle colonne « Statut », le menu de changement de statut est séparé et étiqueté), dans la validation de livraison et dans « Mon compte ». Contrastes des deux couleurs fixes ajoutés au test.
- **Navigation groupée**: Vue d'ensemble, Ventes (Commandes, Valider Livraison, Promotions), Boutique (Produits, Créer un produit, Catégories, Collections), Clients (Messages), et **Équipe → Rôles et accès** pour les admins (la page `/admin/roles` n'avait aucun lien dans l'interface). Chaque rôle ne voit que ses groupes.
- **États vides** avec une phrase et la suite à donner: commandes (selon le filtre), produits, catégories, collections, codes promo, messages.
- **Chargement en squelette** à la place de la roue.
- **Accessibilité**: boutons de suppression (icône seule) avec un nom (« Supprimer la catégorie X »), menu de statut étiqueté par client.
- **Non mesuré**: l'admin demande une connexion, je n'ai donc pas pu le capturer ni mesurer ses zones tactiles. Il utilise les composants de l'étape 2 (44 px). À vérifier sur votre téléphone.

Pas encore fait (étape suivante) : logo et favicon. L'aspect des images n'a pas pu être jugé (Cloudinary inaccessible depuis l'environnement de mesure).

## Règles à tenir (reprises dans `CLAUDE.md`)
Mobile d'abord (360 px puis `md`), zones tactiles de 44 px au moins, contraste AA (4,5:1), jamais l'information par la couleur seule, rien d'accessible uniquement au survol, couleurs uniquement par les jetons de `globals.css`, animations de 200 ms au plus et coupées si l'utilisateur réduit les animations, libellé toujours visible au-dessus d'un champ, trois états (chargement, vide, erreur) sur chaque liste.
