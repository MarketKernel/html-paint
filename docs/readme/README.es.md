# HTML Paint

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<b>🇪🇸 Español</b> ·
<a href="README.fr.md">🇫🇷 Français</a> ·
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

Un editor de imágenes al estilo de Paint.NET, como **un único archivo HTML independiente**.
Capas, selecciones, ajustes y efectos, un historial por el que se puede retroceder paso a
paso, y nada sale de la página: se abre desde el disco, funciona sin conexión y no carga
nada de la red.

La interfaz está disponible en 17 idiomas (Ver → Idioma…): inglés, chino, hindi, español,
francés, árabe, bengalí, portugués, ruso, urdu, indonesio, alemán, japonés, maratí, telugu,
turco y ucraniano; árabe y urdu de derecha a izquierda. Viene con tema claro u oscuro, y se
adapta tanto a la pantalla de un teléfono como a la de un escritorio.

## Cómo usarlo

Descargue `paint-v<version>.html` desde las
[versiones publicadas](https://github.com/MarketKernel/html-paint/releases), o compílelo
usted mismo (más abajo), y ábralo en un navegador: Chrome, Edge, Firefox o Safari. Ese único
archivo es el programa entero: cópielo donde quiera, envíelo por correo, guárdelo en una
memoria USB.

O ábralo en [GitHub Pages](https://marketkernel.github.io/html-paint/) e instálelo como
aplicación (el botón de instalar en la barra de direcciones; en un iPhone: Compartir →
Añadir a pantalla de inicio). A partir de entonces funciona sin conexión, y se actualiza
solo en el siguiente inicio tras una nueva publicación.

Suelte una imagen sobre la ventana para abrirla, o para añadirla como una capa.

## Qué hace

**Herramientas** — una tecla cada una; al pulsarla de nuevo se pasa a la siguiente
herramienta que comparte esa tecla.

| Herramienta | Tecla | |
|---|---|---|
| Selección rectangular, elíptica y de lazo | S | Shift añade a la selección, Alt resta, ambas intersecan |
| Varita mágica | W | Colores similares, contiguos o en toda la imagen, según la tolerancia |
| Mover los píxeles seleccionados | M | Arrastre para mover, los tiradores escalan, fuera gira; Enter aplica, Esc deshace |
| Mover la selección | M | Solo el contorno; las flechas la desplazan un poco |
| Zoom, mano | Z, H | Espacio o el botón central desplazan con cualquier herramienta; ⌘/Ctrl + rueda o un pellizco hacen zoom |
| Pincel | B | Ancho, dureza, opacidad, suavizado; presión del lápiz óptico |
| Lápiz | P | Píxeles individuales |
| Borrador | E | |
| Aerógrafo | A | Rocía mientras se mantiene pulsado el botón |
| Bote de pintura | F | Tolerancia, contiguo o global, la capa o toda la imagen |
| Degradado | G | Lineal, reflejado, radial, cónico; del color primario al secundario |
| Cuentagotas | K | De la capa o de la imagen; puede volver a la herramienta anterior |
| Tampón de clonar | L | Ctrl+clic (⌘+clic) elige el origen |
| Texto | T | Se escribe en su sitio; fuente, tamaño, negrita, cursiva, subrayado, alineación |
| Línea, rectángulo, elipse | O | Contorno, relleno o ambos; trazos, esquinas redondeadas, flechas; Shift restringe |
| Curva | O | Una curva de Bézier: arrastre una línea y dóblela por sus dos puntos de control; Enter aplica |

El botón izquierdo pinta con el color primario, el derecho con el secundario. X los
intercambia, D los restablece a blanco y negro, `[` y `]` cambian el tamaño del pincel.

**Capas** — añadir, eliminar, duplicar, combinar hacia abajo, reordenar (arrastrando en el
panel), ocultar, renombrar; opacidad y 17 modos de fusión (multiplicar, pantalla,
superposición, luz suave, diferencia, tono…).

**Edición** — deshacer y rehacer cada paso, con un panel de historial para saltar a
cualquiera de ellos; cortar, copiar, copiar combinado; pegar en la capa (flotante, para
colocarlo), en una capa nueva o como una imagen nueva, también desde el portapapeles del
sistema; seleccionar todo, deseleccionar, invertir la selección; borrar o rellenar la
selección.

**Imagen** — recortar a la selección, cambiar el tamaño (suave o vecino más cercano),
tamaño del lienzo con un anclaje, voltear, girar, aplanar.

**Ajustes** — niveles automáticos, blanco y negro, brillo y contraste, tono y saturación,
invertir colores, posterizar, sepia, umbral.

**Efectos** — desenfoque gaussiano, desenfoque de movimiento, enfocar, ruido, pixelar,
relieve, detectar bordes, pintura al óleo, viñeta. Los que tienen ajustes se previsualizan
sobre la imagen mientras se cambian. Los ajustes y los efectos se limitan a la selección
cuando hay una.

**Archivos** — se abren PNG, JPEG, WebP, GIF, BMP, SVG y más; PNG, JPEG y WebP guardan la
imagen aplanada. **OpenRaster (.ora)** conserva las capas, con sus nombres, opacidad,
visibilidad y modos de fusión; también lo abren GIMP, Krita y MyPaint. Donde el navegador
permite que una página escriba archivos (Chrome, Edge), ⌘S / Ctrl+S guarda de vuelta en el
archivo abierto; en los demás, guardar es una descarga.

## Compilar

```sh
npm install
npm run build        # → build/paint.html
npm run watch        # recompila con cada cambio, sin minificar
npm run check        # comprobación de tipos, pruebas unitarias, compilación, pruebas de navegador
npm run shots        # capturas de las pantallas principales en shots/
```

Node 20 o posterior. Las pruebas de navegador manejan la página compilada en un Chrome local
mediante el protocolo DevTools; defina `CHROME=/path/to/chrome` si está en un sitio poco
habitual.

La compilación también genera `build/pages/`: la misma página como PWA, con un manifest,
iconos y un service worker. Sus iconos PNG se guardan en `assets/pwa/`; cuando cambia el
icono de `src/app/icons.ts`, `node tools/icons.mjs` los vuelve a dibujar (con Chrome).

## Publicaciones

GitHub Actions se encarga de publicar:

- cada push a `main` se prueba y se despliega en GitHub Pages (Settings → Pages → Source:
  GitHub Actions, una sola vez);
- una etiqueta `v<version>` compila, prueba y publica una versión con `paint-v<version>.html`
  y su `SHA256SUMS.txt`. La etiqueta debe coincidir con la versión de `package.json`:

  ```sh
  npm version 0.2.0      # escribe package.json, confirma el cambio y etiqueta v0.2.0
  git push --follow-tags
  ```

## Estructura

```
src/
  core/            sin DOM, se ejecuta en Node bajo las pruebas
    color.ts       RGB, HSV, HSL, hexadecimal; distancia de color; la paleta
    raster.ts      relleno por inundación (bote, varita), líneas de lápiz, contornos de máscara, rectángulos
    filters.ts     los ajustes y efectos, sobre matrices de píxeles planas
    zip.ts, ora.ts ZIP y el stack.xml de OpenRaster
    i18n.ts        t(), tn(), N_()
  app/             la página
    template.html, styles.css
    main.ts        arranca todo
    app.ts         el estado: documento, historial, colores, ajustes, la vista previa en vivo
    document.ts    la imagen y sus capas
    selection.ts   las selecciones como máscaras
    history.ts     deshacer y rehacer
    view.ts        el espacio de trabajo: zoom, desplazamiento, dibujo, entrada del puntero
    tools/         un archivo por cada tipo de herramienta
    commands.ts    menús y atajos de teclado
    ops.ts         los comandos de Edición, Imagen y Capas
    effects.ts     los menús de Ajustes y Efectos
    io.ts          apertura y guardado
    prompts.ts     diálogos detrás de los comandos
    ui/            barra de menú, caja de herramientas, paneles, diálogos
  locales/         ru.json, uk.json — indexados por el texto en inglés
  pwa/sw.js        el service worker de la compilación de GitHub Pages
assets/pwa/        los iconos PNG de la PWA
tests/             pruebas unitarias (Node) y la prueba de navegador (tests/app.mjs)
tools/             load.mjs (compila src/ para las pruebas), i18n.mjs (busca las cadenas),
                   icons.mjs (dibuja assets/pwa/)
build.mjs          empaqueta todo en build/paint.html y build/pages/
.github/workflows/ pruebas, el despliegue a GitHub Pages, publicaciones desde las etiquetas v*
```

## Traducciones

Cada cadena mostrada es un `t('texto en inglés')` (o `N_('…')` donde se construye una tabla
antes de conocer el idioma) con un literal de cadena simple. `node tools/i18n.mjs` indica qué
le falta o le sobra a cada diccionario; `npm test` falla hasta que coinciden. El valor de un
plural es un objeto con una forma para cada categoría gramatical del idioma (`one`, `few`,
`many`, `other`…). Un idioma nuevo es un nuevo `src/locales/<code>.json` y una línea en
`src/app/language.ts`.

Este README se traduce en `docs/readme/README.<code>.md`; la lista de idiomas entre las
marcas `<!-- languages -->` es la misma en cada uno.

## Licencia

MIT
