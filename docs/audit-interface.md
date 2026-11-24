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
5. **Détails** (*fait*) : monogramme à la place de l'emoji, langue de la page, ton des messages.

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

### Résultat de l'étape 5
- **Favicon**: monogramme « A » terre cuite (`src/app/icon.svg`) à la place de l'emoji 👟 ; le même dessin sert de marque dans l'en-tête (`BrandMark`).
- **Langue de la page**: `<html lang="fr">` (elle déclarait `en`, ce qui fait mal lire le français aux lecteurs d'écran) et description du site en français.
- Les messages d'erreur et les toasts utilisent déjà les jetons (rayon, couleurs), rien à changer.

## Refonte de l'accueil (24/11/2026)
Constats avant: aucun titre principal (`h1`), hero = image avec le texte incrusté et sans bouton, aucune action visible au premier écran sur téléphone, cartes de catégorie = `div` cliquables (pas des liens), « Meilleures Ventes » = les 3 **plus anciens** produits et « Recommandations pour vous » = les 3 suivants (aucune vente ni personnalisation), filtres de la boutique dupliqués sur l'accueil.

| Mesure (accueil) | Avant | Après |
|---|---|---|
| `h1` | 0 | 1 |
| Actions visibles au premier écran à 390 px | aucune | « Voir la boutique » et « Commander sur WhatsApp » |
| Hauteur de la page à 390 px | 6 921 px | 4 508 px (−35 %) |
| Éléments sous 44 px / défilement horizontal | 0 / aucun | 0 / aucun |
| Cartes de catégorie | `div` cliquables, flèches cachées sur téléphone | liens `/shop?category=…`, 2 colonnes, nombre de modèles |
| Sections | Catégories, Collections, Nouveautés, « Meilleures Ventes », « Recommandations » | Nouveautés, Catégories, Collections, « Sélection Amani's », contact |

Décisions: le hero est écrit (accroche issue du pied de page de la boutique) avec les images des coups de cœur, sinon des nouveautés; garanties limitées à ce qui existe (adresse à la commande, code de validation, WhatsApp); « Meilleures ventes » et « Recommandations » supprimées (fausses) et remplacées par **« Sélection Amani's »**, alimentée par une case **« Coup de cœur »** dans l'admin (la section n'apparaît que si au moins un produit est coché); filtres retirés de l'accueil, la loupe mène à `/shop?search=1`; la boutique comprend maintenant `?collection=` et affiche « Catégorie : X · Voir toute la boutique ». Les catégories et collections sans produit n'ont pas de vignette.

Aperçu de partage (Open Graph) généré en français (`src/app/opengraph-image.tsx`). L'adresse publique (`https://amanis.vercel.app`) est dans `src/lib/site.ts` (`SITE.url`); avec un domaine personnalisé, définir `NEXT_PUBLIC_SITE_URL` sur l'hébergement.

À valider par la boutique: le texte de l'accroche et des 3 garanties, le choix des coups de cœur, et quelle collection mettre en avant. Le fichier `src/components/Hero-clean.tsx` (bannières Cloudinary) n'est plus utilisé, je l'ai laissé.

## Refonte de la boutique (24/11/2026)
Mesures de départ (boutique, 390 px, 66 produits visibles sur 67): page de **34 078 px**, 66 cartes d'un coup en une colonne de 466 px, premier produit à 638 px; fiche produit = fenêtre modale sans adresse partageable; ajout rapide qui choisissait seul la première pointure et la première couleur; commande impossible sans compte.

**Anomalies de données trouvées** (lecture du catalogue public): un produit à **7 000 022 XOF** (« Escarpin Marron a boucle »), invisible dans la boutique à cause du filtre de prix par défaut; pointures « 3 » et « 3637 »; **40 noms de couleur** pour une quinzaine de couleurs réelles (« Noir / noir / Noire », « Marron / Maron / marron », 5 écritures de « bleu nuit ») avec des codes faux (un « Rouge » en noir, un « marron » en orange); noms de produit en double (« Escarpin » ×8); catégories à un seul produit.

| Mesure | Avant | Après |
|---|---|---|
| Hauteur de la boutique à 390 px | 34 078 px | 4 838 px (24 produits, « Voir plus ») |
| Premier produit à 390 px | 638 px | 309 px |
| Catégories dans les filtres | non, menu seulement | puces-liens en haut de la liste |
| Fiche produit | fenêtre sans adresse | page `/produit/…` partageable, aperçu WhatsApp, données structurées |
| Pointure | première choisie à la place de la cliente | jamais présélectionnée, message si oubliée |
| Commande sans compte | impossible | possible, avec garde-fous |
| Éléments sous 44 px (5 écrans × 3 tailles + fiche + fenêtres) | 18 à 91 par écran | 0 |
| Produit au prix absurde | invisible par accident, commandable en théorie | masqué, refusé par le serveur, signalé dans l'admin |
| Sitemap | aucun | 3 pages + 66 produits; `robots.txt` interdit l'admin et le compte |

### Étape 1: données et saisie
Palette officielle de 19 couleurs (`src/lib/colors.ts`) avec reconnaissance des écritures historiques; sélecteur de palette dans l'admin; validation côté serveur (prix 1 000 à 1 000 000 XOF, pointures 16 à 50, couleurs); page admin **Qualité du catalogue** (anomalies par produit, noms en double) et action **Normaliser les couleurs** (aperçu de chaque changement, puis confirmation; les produits avec une couleur inconnue sont ignorés et listés). Les filtres de la boutique s'adaptent: curseur de prix au prix max réel, pointures valides seulement, couleurs regroupées par nom avec libellé.

### Étape 2: page produit
`/produit/[id]` rendue côté serveur (lecture publique via l'API REST de Firestore): titre et aperçu de partage, URL canonique, JSON-LD `Product`. Pointure obligatoire (message et défilement vers le choix), couleur seule présélectionnée, quantité plafonnée au stock, barre d'achat compacte sur téléphone, lien du produit dans le message WhatsApp. Les cartes sont des liens; plus d'ajout rapide. L'assistant de style (IA) ne s'exécute plus qu'à la demande: avant, chaque ouverture d'une fiche lançait un appel payant, même pour un robot.

### Étape 3: liste et filtres
2 colonnes sur téléphone, « Voir plus » par 24, catégories en puces-liens, filtres actifs en puces retirables, produits épuisés en fin de liste, états vide et erreur.

### Étape 4: panier et commande sans compte
`createOrder` accepte les invités: limite de débit stricte (3 par 10 min et par IP), champ piège anti-robot, 3 commandes en attente au plus par numéro, **secret propre à chaque commande** renvoyé une seule fois et gardé sur l'appareil pour relire la confirmation et le code de livraison (`getGuestOrder`, comparaison à temps constant). Le secret ne sort jamais du serveur. Un jeton invalide est refusé, jamais pris pour un invité. Panier: quantités plafonnées au stock, total par ligne, confirmation avant de vider.

### Étape 5: référencement
`sitemap.xml` (produits affichables seulement) et `robots.txt`.

### Correction après mise en ligne (signalée par la boutique)
Sur téléphone, le prix d'une ligne du panier était coupé à droite du sélecteur de quantité (la ligne dépassait de 14 px de sa fenêtre à 390 px et de 36 px à 360 px, bouton de suppression compris). Cause: fenêtre du panier étroite (3/4 de l'écran) et conteneur de défilement qui laissait la ligne s'élargir. Correction: panier à 92 % de la largeur, défilement simple, prix qui passe sous le sélecteur si la place manque. Mesuré après correction: aucun dépassement à 320, 360, 390 et 768 px pour le panier, le formulaire de commande et le panneau de filtres, ni à 320 et 360 px pour les pages principales et la fiche produit. Leçon: la mesure ne vérifiait que la taille des boutons, pas le contenu coupé; la règle est ajoutée à `CLAUDE.md`.

### Correction: « Coup de cœur » introuvable dans l'admin (signalé par la boutique)
La case existait, mais seulement dans la fenêtre « Modifier » et dans le formulaire de création, à 775 px du haut d'une fenêtre de 760 px (formulaire de 1 380 px): invisible sans défiler, et rien dans la liste. Maintenant: bouton **« Mettre en avant »** sur chaque produit de la liste (un geste, état « Retirer de la sélection »), bandeau qui explique l'effet sur l'accueil (nombre de coups de cœur, 3 en haut de l'accueil, 6 dans la sélection, les plus récents d'abord), et la case remontée en 2e position dans « Modifier » (205 px du haut) et dans « Créer un produit ». La liste devient une liste de cartes lisible sur téléphone (le tableau à 4 colonnes y était serré), boutons à 44 px. Leçon: une fonction qui n'est pas visible sans défiler n'existe pas pour l'utilisatrice; vérifier la position des options annoncées.

### Page « Mon compte » (24/11/2026)
Constats (lecture du code, page non mesurable sans connexion): articles sans quantité ni couleur (une commande de 3 paires = une ligne), numéro tronqué « #a1b2c3... », une erreur de chargement affichée comme « aucune commande en cours », aucun profil (nom, téléphone et adresse retapés à chaque commande), **aucun « mot de passe oublié » sur tout le site**, commandes sans compte introuvables (la page renvoyait vers la connexion), pas d'en-tête de boutique, pas de lien vers les produits ni de moyen de recommander ou de poser une question.

| Mesure | Avant | Après |
|---|---|---|
| Quantité et couleur par article | absentes | oui, avec total par ligne, sous-total, remise et total |
| Numéro de commande | `#a1b2c3...` | `N° A1B2C3` |
| Erreur de chargement | faux « aucune commande » | message d'erreur avec « Réessayer » |
| Mot de passe oublié | inexistant | page dédiée, e-mail en français, même réponse que le compte existe ou non |
| Coordonnées | retapées à chaque commande | enregistrées, préremplies (case « Enregistrer mes coordonnées ») |
| Commande sans compte | introuvable | visible sur l'appareil, rattachée au compte à la connexion |
| Actions par commande | aucune | Recommander (stock et disponibilité contrôlés), question WhatsApp (numéro de commande, jamais le code de livraison), copier le code |
| Éléments sous 44 px, débordement (320, 390, 1280 px, maquette de commandes) | n/a | 0, aucun |

Détails: la barre de suivi annonce « Étape 2 sur 3 : Prêt » aux lecteurs d'écran; chaque état a une explication littérale (« Votre commande est préparée »), sans promesse de délai ni de procédure. Les règles Firestore bornent le profil (nom 100, téléphone 30, adresse 500 caractères), vérifiées par mutation. `claimGuestOrders` exige le secret de la commande, le supprime après rattachement, et refuse les commandes d'autrui. Le profil n'est lu que quand la fenêtre de commande s'ouvre (pas à chaque page).

Limites: je n'ai pas pu tester la connexion, l'e-mail de réinitialisation ni le rattachement de bout en bout (pas d'accès administrateur Firebase, et je n'envoie pas d'e-mail ni n'écris dans votre base). La logique serveur et les règles sont couvertes par des tests; l'affichage a été vérifié avec une maquette de commandes.

### Tableau de bord de l'admin (24/11/2026)
Avant: quatre compteurs (nombre de produits, de commandes, de catégories, de promotions), qui n'aident à aucune décision.

Après (`DashboardView`, calcul dans `src/lib/dashboard-stats.ts`, 19 tests vérifiés par mutation), chaque bloc n'apparaît que pour les rôles concernés:
| Bloc | Contenu | Rôles |
|---|---|---|
| À traiter | commandes en attente et prêtes à livrer (les plus anciennes d'abord, avec leur âge), messages de la semaine, boutons vers l'écran concerné | admin, orderManager (messages: admin) |
| Activité | 7 et 30 derniers jours: commandes, chiffre d'affaires, panier moyen, livrées, variation par rapport à la période précédente; courbe des commandes sur 14 jours | admin, orderManager |
| Ventes | meilleures ventes (30 jours ou depuis le début, avec le badge « Coup de cœur » et un lien pour choisir les coups de cœur), commandes avec ou sans compte | admin, orderManager |
| Stock et catalogue | produits épuisés, pointures presque épuisées (3 ou moins), produits jamais commandés, anomalies du catalogue | admin, productManager |
| Codes promo | utilisation, remises réellement accordées, expiration proche, presque épuisé, limite atteinte | admin |

Règles de calcul (testées): une commande annulée n'est jamais comptée; périodes glissantes comparées à la période précédente de même durée; pas de variation affichée quand il n'y avait rien avant (« Pas de comparaison possible », jamais un « +∞ % »); jours en UTC (identique à l'heure locale en Côte d'Ivoire et au Sénégal); « jamais commandés » masqué tant qu'il n'y a aucune commande; une commande rattachée à un compte compte comme « avec compte ». Les variations s'écrivent avec leur signe et des mots (la couleur ne porte pas seule l'information); la courbe a une description pour les lecteurs d'écran.

Les calculs se font dans le navigateur à partir des données déjà chargées, qui sont déjà filtrées par rôle côté serveur (un `productManager` ne reçoit ni commandes ni codes promo). Limite: toutes les commandes sont chargées; à plusieurs milliers de commandes il faudra calculer côté serveur.

Mesures sur des données fictives (320, 390 et 1280 px; rôles admin, orderManager, productManager): aucun débordement, aucun élément sous 44 px. Corrigé en route: le chiffre d'affaires se coupait sur deux lignes sur téléphone.

### Fiche de commande et notification (24/11/2026)
Constats: la liste des commandes n'affichait que nom, téléphone et total; **les articles, pointures, couleurs et l'adresse de livraison ne se voyaient que par la recherche du code de livraison**, et rien ne prévenait la boutique d'une nouvelle commande (il fallait ouvrir l'admin).

- **Liste des commandes** en cartes (lisibles sur téléphone): numéro, état, badge « Invité », cliente, nombre d'articles, total, bouton « Détails ».
- **Fiche de commande**: articles à préparer (quantité, pointure, couleur, prix), cliente (téléphone, e-mail, adresse), totaux « à encaisser », changement de statut, **Appeler**, **WhatsApp** (seulement si le numéro commence par un indicatif +225, +221… : on ne devine pas le pays), copier le numéro et l'adresse, **Imprimer** (seule la fiche sort sur le papier). Le code de livraison n'y figure volontairement pas.
- **Notification de nouvelle commande** par Telegram et/ou e-mail (gratuits), configurée par variables dans Vercel; carte « Notifications » dans le tableau de bord (état des canaux, message de test, mode d'emploi). Le message est minimal: numéro, nombre d'articles, total, prénom; pas de téléphone, d'adresse ni de code.
- Pourquoi pas WhatsApp: l'API officielle facture les messages envoyés par une entreprise hors de la fenêtre de 24 h (seules les réponses à une cliente qui a écrit en premier sont gratuites); elle demande aussi un compte Meta vérifié, un numéro dédié et des modèles de message approuvés. Les tarifs exacts par pays sont à vérifier sur la page officielle de Meta.

Vérifié dans le navigateur (320, 390, 1280 px, données fictives): aucun débordement, aucun élément sous 44 px, impression limitée à la fiche. Le serveur est couvert par 21 tests supplémentaires (vérifiés par mutation): notification programmée après la réponse, jamais de donnée personnelle, panne sans effet sur la commande, réservée aux admins pour l'état et le test.
Non testé: l'envoi réel vers Telegram ou Resend (pas d'identifiants dans mon environnement).

**Correction après configuration (signalée par la boutique: « mauvaise configuration »)**: la carte disait seulement « Non configuré », sans dire pourquoi. Maintenant elle explique, sans jamais afficher les valeurs: variable absente (avec son nom exact), format inattendu (avec l'attendu), ou rappel qu'une variable ajoutée dans Vercel ne s'applique qu'après un redéploiement et pour l'environnement « Production ». Les valeurs collées avec un espace, un retour à la ligne ou des guillemets (cause probable) sont désormais acceptées. Le test d'envoi traduit le refus de Telegram ou de Resend en consigne (jeton refusé, chat introuvable, bouton « Démarrer » jamais touché, limite d'envois…). Leçon: un message d'erreur doit dire quoi corriger, pas seulement qu'il y a une erreur.

### Incident du 24/11: l'admin ne chargeait plus les données (journaux de production)
Signalé par la boutique («l'admin a-t-il un problème pour récupérer les données de la base ?»). Les journaux d'erreurs de Vercel (24 h) montrent:
1. **Cause du défaut (10 occurrences sur `/admin` et `/dashboard`, 2 utilisateurs, dès le test de rattachement d'une commande)**: « Only plain objects… can be passed to Client Components… Classes or null prototypes are not supported », avec `claimedAt: {_seconds…}`. Le rattachement d'une commande d'invité écrit `claimedAt` (Timestamp Firestore); `orderFromDoc` renvoyait ce champ tel quel, et la réponse de `getOrders` / `getOrdersForUser` échouait **pour toutes les commandes**. Comme l'admin chargeait toutes ses sources d'un bloc, **tout l'admin restait vide**. Défaut introduit par ma PR sur le rattachement, jamais vu en test car mon faux Firestore n'avait pas de Timestamp. Les données ne sont ni perdues ni abîmées.
2. **Coupures réseau vers Firestore (4 en 24 h)**: `fetch failed` (ECONNRESET, ETIMEDOUT). Sur la fiche produit, une panne passagère s'affichait comme « page introuvable ».
3. **Assistant de style (IA)**: 17 échecs depuis août, « API key… GEMINI_API_KEY » absente. Les visiteurs voyaient une erreur.
4. **Notifications Telegram**: 3 délais dépassés (limite de 4 s) puis une limite d'envois (HTTP 429, « retry after 26 »): Telegram joignable, mais chaque relance du test prolonge l'attente.

Corrections: conversion générale des valeurs Firestore en objets simples (dates en chaîne ISO) et liste blanche des champs de commande; **chargement de l'admin source par source** (une source en échec n'efface plus les autres; bandeau qui dit laquelle manque, avec « Réessayer », et chargement limité à ce que le rôle permet); lecture produit retentée une fois, et une panne s'affiche en erreur avec « Réessayer » (jamais en faux « introuvable »), page d'erreur en français; assistant de style masqué tant qu'aucune clé Gemini n'est configurée; délai Telegram porté à 8 s et consigne qui indique les secondes d'attente.
Tests (10 de plus, vérifiés par mutation): aucune action ne renvoie de classe (commandes, produits, catégories, collections, promos, messages), lecture produit (404, panne, retentative, accès refusé), délai et consigne Telegram.
Leçon: un faux Firestore doit contenir les vrais types (Timestamp) et il faut lire les journaux de production après une mise en ligne.

### Limites
Une commande d'invité n'est pas rattachée à un compte et ne se relit que sur l'appareil qui l'a passée (ou avec le code de validation, par WhatsApp). Je n'ai pas pu passer une vraie commande de bout en bout (pas d'accès administrateur Firebase dans mon environnement, et je n'écris pas dans votre base): le serveur est couvert par 140 tests, le parcours jusqu'au formulaire a été vérifié dans le navigateur. Le téléphone n'est pas testé en réel, et les photos ne se chargeaient pas dans mon environnement.

## Reste à faire
Vérifier à l'œil, sur un vrai téléphone, l'admin et les badges de stock (non mesurables dans mon environnement), puis ajuster. Le mode sombre est défini et testé mais sans bouton pour l'activer. L'aspect des images n'a pas pu être jugé (Cloudinary inaccessible depuis l'environnement de mesure).

## Règles à tenir (reprises dans `CLAUDE.md`)
Mobile d'abord (360 px puis `md`), zones tactiles de 44 px au moins, contraste AA (4,5:1), jamais l'information par la couleur seule, rien d'accessible uniquement au survol, couleurs uniquement par les jetons de `globals.css`, animations de 200 ms au plus et coupées si l'utilisateur réduit les animations, libellé toujours visible au-dessus d'un champ, trois états (chargement, vide, erreur) sur chaque liste.
