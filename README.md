# HTML Paint

An image editor in the spirit of Paint.NET, as **one standalone HTML file**. Layers,
selections, adjustments and effects, a history you can step back through — and nothing
leaves the page: it opens from disk, works offline, and loads nothing from the network.

The interface is in English, Russian and Ukrainian (View → Language), in a light or a dark
theme, and fits a phone's screen as well as a desktop's.

## Use it

Build it (below) and open `build/paint.html` in a browser — Chrome, Edge, Firefox or
Safari. That one file is the whole program: copy it anywhere, mail it, put it on a USB stick.

Drop an image on the window to open it, or to add it as a layer.

## What it does

**Tools** — one key each; pressing it again moves to the next tool on the same key.

| Tool | Key | |
|---|---|---|
| Rectangle, ellipse and lasso select | S | Shift adds to the selection, Alt subtracts, both intersect |
| Magic wand | W | Similar colours, contiguous or over the whole image, by tolerance |
| Move selected pixels | M | Drag to move, handles to scale, outside to rotate; Enter applies, Esc puts back |
| Move selection | M | The outline only; arrow keys nudge |
| Zoom, pan | Z, H | Space or the middle button pans with any tool; ⌘/Ctrl + wheel or a pinch zooms |
| Paintbrush | B | Width, hardness, opacity, antialiasing; pen pressure |
| Pencil | P | Single pixels |
| Eraser | E | |
| Airbrush | A | Sprays while the button is held |
| Paint bucket | F | Tolerance, contiguous or global, the layer or the whole image |
| Gradient | G | Linear, reflected, radial, conical; primary → secondary colour |
| Color picker | K | From the layer or the image; can go back to the previous tool |
| Clone stamp | L | Ctrl+click (⌘+click) picks the source |
| Text | T | Typed in place; font, size, bold, italic, underline, alignment |
| Line, rectangle, ellipse | O | Outline, fill or both; dashes, rounded corners, arrows; Shift constrains |
| Curve | O | A Bézier curve: drag out a line, bend it by its two control points; Enter applies |

The left button paints with the primary colour, the right with the secondary. X swaps them,
D resets them to black and white, `[` and `]` change the brush size.

**Layers** — add, delete, duplicate, merge down, reorder (drag in the panel), hide, rename;
opacity and 17 blend modes (multiply, screen, overlay, soft light, difference, hue…).

**Edit** — undo and redo of every step, with a History panel to jump to any of them; cut,
copy, copy merged; paste into the layer (floating, to place it), into a new layer or as a
new image — from the system clipboard too; select all, deselect, invert the selection;
erase or fill the selection.

**Image** — crop to selection, resize (smooth or nearest neighbour), canvas size with an
anchor, flip, rotate, flatten.

**Adjustments** — auto-level, black and white, brightness and contrast, hue and saturation,
invert colours, posterize, sepia, threshold.

**Effects** — Gaussian blur, motion blur, sharpen, noise, pixelate, emboss, edge detect,
oil painting, vignette. Those with settings preview on the image as you change them.
Adjustments and effects keep to the selection when there is one.

**Files** — PNG, JPEG, WebP, GIF, BMP, SVG and more open; PNG, JPEG and WebP save the
image flattened. **OpenRaster (.ora)** keeps the layers, with their names, opacity,
visibility and blend modes — GIMP, Krita and MyPaint open it too. Where the browser lets a
page write files (Chrome, Edge), ⌘S / Ctrl+S saves back to the file opened; elsewhere a
save is a download.

## Build

```sh
npm install
npm run build        # → build/paint.html
npm run watch        # rebuilds on every change, unminified
npm run check        # typecheck, unit tests, build, browser tests
npm run shots        # screenshots of the main screens into shots/
```

Node 20 or later. The browser tests drive the built page in a local Chrome over the
DevTools protocol; set `CHROME=/path/to/chrome` if it is somewhere unusual.

## Layout

```
src/
  core/            no DOM, runs in Node under the tests
    color.ts       RGB, HSV, HSL, hex; colour distance; the palette
    raster.ts      flood fill (bucket, wand), pencil lines, mask outlines, rectangles
    filters.ts     the adjustments and effects, on plain pixel arrays
    zip.ts, ora.ts ZIP and OpenRaster's stack.xml
    i18n.ts        t(), tn(), N_()
  app/             the page
    template.html, styles.css
    main.ts        starts everything
    app.ts         the state: document, history, colours, settings, the live preview
    document.ts    the image and its layers
    selection.ts   selections as masks
    history.ts     undo and redo
    view.ts        the workspace: zoom, scroll, drawing, pointer input
    tools/         one file per kind of tool
    commands.ts    menus and keyboard shortcuts
    ops.ts         the Edit, Image and Layers commands
    effects.ts     the Adjustments and Effects menus
    io.ts          opening and saving
    prompts.ts     dialogs behind commands
    ui/            menu bar, toolbox, panels, dialogs
  locales/         ru.json, uk.json — keyed by the English text
tests/             unit tests (Node) and the browser test (tests/app.mjs)
tools/             load.mjs (compiles src/ for the tests), i18n.mjs (finds the strings)
build.mjs          bundles everything into build/paint.html
```

## Translations

Every string shown is a `t('English text')` (or `N_('…')` where a table is built before the
language is known) with a plain string literal. `node tools/i18n.mjs` lists what each
dictionary lacks or no longer needs; `npm test` fails until they match. A new language is a
new `src/locales/<code>.json` and a line in `src/app/language.ts`.

## License

MIT
