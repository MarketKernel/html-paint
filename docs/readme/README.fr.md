# HTML Paint

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<b>🇫🇷 Français</b> ·
<a href="README.ar.md">🇸🇦 العربية</a> ·
<a href="README.bn.md">🇧🇩 বাংলা</a> ·
<a href="README.pt.md">🇧🇷 Português</a> ·
<a href="README.ru.md">🇷🇺 Русский</a> ·
<a href="README.ur.md">🇵🇰 اردو</a> ·
<a href="README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Un éditeur d'image dans l'esprit de Paint.NET, en **un seul fichier HTML autonome**. Des
calques, des sélections, des réglages et des effets, un historique dans lequel vous pouvez
revenir en arrière — et rien ne quitte la page : elle s'ouvre depuis le disque, fonctionne
hors ligne et ne charge rien depuis le réseau.

L'interface existe en 17 langues (Affichage → Langue…) — anglais, chinois, hindi, espagnol,
français, arabe, bengali, portugais, russe, ourdou, indonésien, allemand, japonais, marathi,
télougou, turc et ukrainien ; l'arabe et l'ourdou s'affichent de droite à gauche. Elle propose
un thème clair ou sombre, et s'adapte aussi bien à l'écran d'un téléphone qu'à celui d'un
ordinateur de bureau.

## L'utiliser

Téléchargez `paint-v<version>.html` depuis les
[releases](https://github.com/MarketKernel/html-paint/releases), ou générez-le (voir
plus bas), puis ouvrez-le dans un navigateur — Chrome, Edge, Firefox ou Safari. Ce seul
fichier constitue le programme entier : copiez-le où vous voulez, envoyez-le par e-mail,
mettez-le sur une clé USB.

Ou bien ouvrez-le sur [GitHub Pages](https://marketkernel.github.io/html-paint/) et
installez-le comme une application (le bouton d'installation dans la barre d'adresse ;
Partager → Sur l'écran d'accueil sur un iPhone). Il fonctionne ensuite hors ligne, et se
met à jour tout seul au prochain démarrage après un nouveau déploiement.

Déposez une image sur la fenêtre pour l'ouvrir, ou pour l'ajouter comme calque.

## Ce qu'il fait

**Outils** — une touche chacun ; appuyer de nouveau passe à l'outil suivant sur la même touche.

| Outil | Touche | |
|---|---|---|
| Sélection rectangulaire, elliptique et lasso | S | Shift ajoute à la sélection, Alt soustrait, les deux intersectent |
| Baguette magique | W | Couleurs similaires, contiguës ou sur toute l'image, selon la tolérance |
| Déplacer les pixels sélectionnés | M | Glisser pour déplacer, poignées pour redimensionner, à l'extérieur pour pivoter ; Entrée valide, Échap annule |
| Déplacer la sélection | M | Le contour seul ; les flèches le déplacent finement |
| Zoom, main | Z, H | Espace ou le bouton du milieu déplace la vue avec n'importe quel outil ; ⌘/Ctrl + molette ou un pincement zoome |
| Pinceau | B | Largeur, dureté, opacité, anticrénelage ; pression du stylet |
| Crayon | P | Pixel par pixel |
| Gomme | E | |
| Aérographe | A | Vaporise tant que le bouton est maintenu |
| Pot de peinture | F | Tolérance, contigu ou global, le calque ou toute l'image |
| Dégradé | G | Linéaire, réfléchi, radial, conique ; de la couleur principale à la secondaire |
| Pipette | K | Depuis le calque ou l'image ; peut revenir à l'outil précédent |
| Tampon de duplication | L | Ctrl+clic (⌘+clic) choisit la source |
| Texte | T | Saisi sur place ; police, taille, gras, italique, souligné, alignement |
| Ligne, rectangle, ellipse | O | Contour, remplissage ou les deux ; tirets, coins arrondis, flèches ; Shift contraint |
| Courbe | O | Une courbe de Bézier : tracez une ligne, courbez-la par ses deux points de contrôle ; Entrée valide |

Le bouton gauche peint avec la couleur principale, le droit avec la secondaire. X les permute,
D les réinitialise en noir et blanc, `[` et `]` changent la taille du pinceau.

**Calques** — ajouter, supprimer, dupliquer, fusionner avec le calque du dessous, réordonner
(glisser dans le panneau), masquer, renommer ; opacité et 17 modes de fusion (produit, écran,
incrustation, lumière tamisée, différence, teinte…).

**Édition** — annuler et rétablir chaque étape, avec un panneau Historique pour revenir à
n'importe laquelle d'entre elles ; couper, copier, copier fusionné ; coller dans le calque
(en flottant, pour le placer), dans un nouveau calque ou comme nouvelle image — aussi depuis
le presse-papiers du système ; tout sélectionner, désélectionner, inverser la sélection ;
effacer ou remplir la sélection.

**Image** — rogner à la sélection, redimensionner (lissé ou plus proche voisin), taille du
canevas avec un ancrage, retourner, pivoter, aplatir.

**Réglages** — niveaux automatiques, noir et blanc, luminosité et contraste, teinte et
saturation, inverser les couleurs, postérisation, sépia, seuil.

**Effets** — flou gaussien, flou directionnel, netteté, bruit, pixelliser, relief, détection
des contours, peinture à l'huile, vignette. Ceux qui ont des réglages s'aperçoivent sur
l'image pendant que vous les modifiez. Les réglages et les effets se limitent à la sélection
quand il y en a une.

**Fichiers** — PNG, JPEG, WebP, GIF, BMP, SVG et d'autres s'ouvrent ; PNG, JPEG et WebP
enregistrent l'image aplatie. **OpenRaster (.ora)** conserve les calques, avec leurs noms,
leur opacité, leur visibilité et leurs modes de fusion — GIMP, Krita et MyPaint l'ouvrent
aussi. Là où le navigateur permet à une page d'écrire des fichiers (Chrome, Edge), ⌘S / Ctrl+S
enregistre dans le fichier ouvert ; ailleurs, un enregistrement est un téléchargement.

## Générer

```sh
npm install
npm run build        # → build/paint.html
npm run watch        # régénère à chaque changement, non minifié
npm run check        # vérification des types, tests unitaires, build, tests navigateur
npm run shots        # captures d'écran des écrans principaux dans shots/
```

Node 20 ou plus récent. Les tests navigateur pilotent la page générée dans un Chrome local via
le protocole DevTools ; définissez `CHROME=/path/to/chrome` s'il se trouve ailleurs que
d'habitude.

La génération écrit aussi `build/pages/` : la même page en PWA — un manifeste, des icônes et
un service worker. Ses icônes PNG sont conservées dans `assets/pwa/` ; après un changement de
l'icône dans `src/app/icons.ts`, `node tools/icons.mjs` les redessine (avec Chrome).

## Releases

GitHub Actions s'occupe de la publication :

- chaque push sur `main` est testé et déployé sur GitHub Pages (Settings → Pages → Source :
  GitHub Actions, une seule fois) ;
- un tag `v<version>` génère, teste et publie une release avec `paint-v<version>.html` et son
  `SHA256SUMS.txt`. Le tag doit correspondre à la version dans `package.json` :

  ```sh
  npm version 0.2.0      # écrit package.json, commit, tague v0.2.0
  git push --follow-tags
  ```

## Organisation

```
src/
  core/            sans DOM, s'exécute dans Node pour les tests
    color.ts       RVB, TSV, TSL, hexadécimal ; distance de couleur ; la palette
    raster.ts      remplissage (pot, baguette), lignes au crayon, contours de masques, rectangles
    filters.ts     les réglages et effets, sur de simples tableaux de pixels
    zip.ts, ora.ts ZIP et le stack.xml d'OpenRaster
    i18n.ts        t(), tn(), N_()
  app/             la page
    template.html, styles.css
    main.ts        démarre tout
    app.ts         l'état : document, historique, couleurs, réglages, l'aperçu en cours
    document.ts    l'image et ses calques
    selection.ts   les sélections comme masques
    history.ts     annuler et rétablir
    view.ts        l'espace de travail : zoom, défilement, dessin, entrée du pointeur
    tools/         un fichier par type d'outil
    commands.ts    menus et raccourcis clavier
    ops.ts         les commandes Édition, Image et Calques
    effects.ts     les menus Réglages et Effets
    io.ts          ouverture et enregistrement
    prompts.ts     les boîtes de dialogue des commandes
    ui/            barre de menus, boîte à outils, panneaux, boîtes de dialogue
  locales/         ru.json, uk.json — indexés par le texte anglais
  pwa/sw.js        le service worker de la génération GitHub Pages
assets/pwa/        les icônes PNG de la PWA
tests/             tests unitaires (Node) et le test navigateur (tests/app.mjs)
tools/             load.mjs (compile src/ pour les tests), i18n.mjs (trouve les chaînes),
                   icons.mjs (dessine assets/pwa/)
build.mjs          assemble le tout dans build/paint.html et build/pages/
.github/workflows/ tests, déploiement GitHub Pages, releases depuis les tags v*
```

## Traductions

Chaque chaîne affichée est un `t('texte anglais')` (ou `N_('…')` quand une table est
construite avant que la langue soit connue) avec un littéral de chaîne simple.
`node tools/i18n.mjs` liste ce qui manque ou n'est plus nécessaire dans chaque dictionnaire ;
`npm test` échoue tant qu'ils ne correspondent pas. La valeur d'un pluriel est un objet avec
une forme par catégorie grammaticale de la langue (`one`, `few`, `many`, `other`…). Une
nouvelle langue, c'est un nouveau `src/locales/<code>.json` et une ligne dans
`src/app/language.ts`.

Ce README est traduit dans `docs/readme/README.<code>.md` ; la liste des langues entre les
balises `<!-- languages -->` est la même dans chacun.

## Licence

MIT
