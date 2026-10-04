# HTML Paint

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<a href="README.fr.md">🇫🇷 Français</a> ·
<a href="README.ar.md">🇸🇦 العربية</a> ·
<a href="README.bn.md">🇧🇩 বাংলা</a> ·
<a href="README.pt.md">🇧🇷 Português</a> ·
<a href="README.ru.md">🇷🇺 Русский</a> ·
<a href="README.ur.md">🇵🇰 اردو</a> ·
<a href="README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<b>🇩🇪 Deutsch</b> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Ein Bildbearbeitungsprogramm im Geiste von Paint.NET, als **eine einzige eigenständige
HTML-Datei**. Ebenen, Auswahlen, Anpassungen und Effekte, ein Verlauf, durch den Sie sich
zurückbewegen können — und nichts verlässt die Seite: Sie öffnet sich von der Festplatte,
funktioniert offline und lädt nichts aus dem Netzwerk.

Die Benutzeroberfläche gibt es in 17 Sprachen (Ansicht → Sprache…) — Englisch, Chinesisch,
Hindi, Spanisch, Französisch, Arabisch, Bengalisch, Portugiesisch, Russisch, Urdu,
Indonesisch, Deutsch, Japanisch, Marathi, Telugu, Türkisch und Ukrainisch; Arabisch und Urdu
von rechts nach links. Es gibt ein helles und ein dunkles Design, und die Oberfläche passt
sich einem Smartphone-Bildschirm ebenso an wie einem Desktop.

## Verwendung

Laden Sie `paint-v<version>.html` von den
[Releases](https://github.com/MarketKernel/html-paint/releases) herunter, oder erstellen Sie
sie selbst (siehe unten), und öffnen Sie sie in einem Browser — Chrome, Edge, Firefox oder
Safari. Diese eine Datei ist das gesamte Programm: Kopieren Sie sie, wohin Sie wollen,
verschicken Sie sie per Mail, oder speichern Sie sie auf einem USB-Stick.

Oder öffnen Sie sie auf [GitHub Pages](https://marketkernel.github.io/html-paint/) und
installieren Sie sie als App (die Installieren-Schaltfläche in der Adressleiste; auf dem
iPhone über Teilen → Zum Home-Bildschirm). Von da an funktioniert sie offline und
aktualisiert sich beim nächsten Start selbst, sobald eine neue Version veröffentlicht wurde.

Ziehen Sie ein Bild auf das Fenster, um es zu öffnen oder als Ebene hinzuzufügen.

## Was es kann

**Werkzeuge** — je eine Taste; erneutes Drücken wechselt zum nächsten Werkzeug auf
derselben Taste.

| Werkzeug | Taste | |
|---|---|---|
| Rechteck-, Ellipsen- und Lassoauswahl | S | Shift fügt der Auswahl hinzu, Alt subtrahiert, beide zusammen schneiden |
| Zauberstab | W | Ähnliche Farben, zusammenhängend oder über das ganze Bild, nach Toleranz |
| Ausgewählte Pixel verschieben | M | Ziehen zum Verschieben, Ziehpunkte zum Skalieren, außerhalb zum Drehen; Enter übernimmt, Esc setzt zurück |
| Auswahl verschieben | M | Nur der Umriss; Pfeiltasten verschieben in Einzelschritten |
| Zoom, Verschieben | Z, H | Leertaste oder die mittlere Maustaste verschiebt mit jedem Werkzeug; ⌘/Strg + Mausrad oder eine Kneifgeste zoomt |
| Pinsel | B | Breite, Härte, Deckkraft, Kantenglättung; Stiftdruck |
| Stift | P | Einzelne Pixel |
| Radiergummi | E | |
| Airbrush | A | Sprüht, solange die Taste gedrückt ist |
| Farbeimer | F | Toleranz, zusammenhängend oder global, die Ebene oder das ganze Bild |
| Verlauf | G | Linear, reflektiert, radial, konisch; Vordergrund- → Hintergrundfarbe |
| Pipette | K | Aus der Ebene oder dem Bild; kann zum vorherigen Werkzeug zurückkehren |
| Kopierstempel | L | Strg+Klick (⌘+Klick) legt die Quelle fest |
| Text | T | Direkt eingetippt; Schriftart, Größe, Fett, Kursiv, Unterstrichen, Ausrichtung |
| Linie, Rechteck, Ellipse | O | Kontur, Füllung oder beides; Strichart, abgerundete Ecken, Pfeile; Shift schränkt ein |
| Kurve | O | Eine Bézierkurve: eine Linie ausziehen und an ihren beiden Kontrollpunkten biegen; Enter übernimmt |

Die linke Maustaste malt mit der Vordergrundfarbe, die rechte mit der Hintergrundfarbe. X
vertauscht sie, D setzt sie auf Schwarz und Weiß zurück, `[` und `]` ändern die Pinselgröße.

**Ebenen** — hinzufügen, löschen, duplizieren, nach unten vereinen, neu anordnen (im
Bedienfeld ziehen), ausblenden, umbenennen; Deckkraft und 17 Mischmodi (Multiplizieren,
Bildschirm, Überlagern, Weiches Licht, Differenz, Farbton…).

**Bearbeiten** — Rückgängig machen und Wiederholen jedes Schritts, mit einem
Verlauf-Bedienfeld, um zu jedem davon zu springen; Ausschneiden, Kopieren, Vereint kopieren;
Einfügen in die Ebene (schwebend, zum Platzieren), in eine neue Ebene oder als neues Bild —
auch aus der Zwischenablage des Systems; Alles auswählen, Auswahl aufheben, Auswahl
umkehren; Auswahl löschen oder füllen.

**Bild** — Auf Auswahl zuschneiden, Größe ändern (weich oder nächster Nachbar),
Leinwandgröße mit Ausrichtung, Spiegeln, Drehen, Bild reduzieren.

**Anpassungen** — Automatische Tonwertkorrektur, Schwarzweiß, Helligkeit und Kontrast,
Farbton und Sättigung, Farben invertieren, Posterisieren, Sepia, Schwellenwert.

**Effekte** — Gaußscher Weichzeichner, Bewegungsunschärfe, Scharfzeichnen, Rauschen,
Verpixeln, Relief, Kantenerkennung, Ölgemälde, Vignette. Jene mit Einstellungen zeigen beim
Ändern eine Vorschau direkt im Bild. Anpassungen und Effekte beschränken sich auf die
Auswahl, falls eine vorhanden ist.

**Dateien** — PNG, JPEG, WebP, GIF, BMP, SVG und mehr lassen sich öffnen; PNG, JPEG und
WebP speichern das reduzierte Bild. **OpenRaster (.ora)** behält die Ebenen samt Namen,
Deckkraft, Sichtbarkeit und Mischmodi — auch GIMP, Krita und MyPaint öffnen es. Wo der
Browser einer Seite erlaubt, Dateien zu schreiben (Chrome, Edge), speichert ⌘S / Strg+S in
die geöffnete Datei zurück; andernorts ist Speichern ein Download.

## Build

```sh
npm install
npm run build        # → build/paint.html
npm run watch        # baut bei jeder Änderung neu, unminifiziert
npm run check        # Typprüfung, Unit-Tests, Build, Browser-Tests
npm run shots        # Screenshots der wichtigsten Ansichten nach shots/
```

Node 20 oder neuer. Die Browser-Tests steuern die gebaute Seite in einem lokalen Chrome über
das DevTools-Protokoll; setzen Sie `CHROME=/path/to/chrome`, falls es sich an einem
ungewöhnlichen Ort befindet.

Der Build schreibt außerdem `build/pages/`: dieselbe Seite als PWA — ein Manifest, Icons und
ein Service Worker. Deren PNG-Icons liegen in `assets/pwa/`; sobald sich das Icon in
`src/app/icons.ts` ändert, zeichnet `node tools/icons.mjs` sie neu (mit Chrome).

## Releases

GitHub Actions übernimmt die Veröffentlichung:

- jeder Push nach `main` wird getestet und auf GitHub Pages veröffentlicht (Settings →
  Pages → Source: GitHub Actions, einmalig);
- ein Tag `v<version>` baut, testet und veröffentlicht ein Release mit
  `paint-v<version>.html` und seiner `SHA256SUMS.txt`. Das Tag muss mit der Version in
  `package.json` übereinstimmen:

  ```sh
  npm version 0.2.0      # schreibt package.json, committet, taggt v0.2.0
  git push --follow-tags
  ```

## Aufbau

```
src/
  core/            kein DOM, läuft unter den Tests in Node
    color.ts       RGB, HSV, HSL, Hex; Farbabstand; die Palette
    raster.ts      Flutfüllung (Eimer, Zauberstab), Stiftlinien, Maskenumrisse, Rechtecke
    filters.ts     die Anpassungen und Effekte, auf reinen Pixel-Arrays
    zip.ts, ora.ts ZIP und die stack.xml von OpenRaster
    i18n.ts        t(), tn(), N_()
  app/             die Seite
    template.html, styles.css
    main.ts        startet alles
    app.ts         der Zustand: Dokument, Verlauf, Farben, Einstellungen, die Live-Vorschau
    document.ts    das Bild und seine Ebenen
    selection.ts   Auswahlen als Masken
    history.ts     Rückgängig machen und Wiederholen
    view.ts        der Arbeitsbereich: Zoom, Scrollen, Zeichnen, Zeigereingabe
    tools/         eine Datei je Werkzeugart
    commands.ts    Menüs und Tastenkombinationen
    ops.ts         die Befehle für Bearbeiten, Bild und Ebenen
    effects.ts     die Menüs Anpassungen und Effekte
    io.ts          Öffnen und Speichern
    prompts.ts     Dialoge hinter den Befehlen
    ui/            Menüleiste, Werkzeugkasten, Bedienfelder, Dialoge
  locales/         ru.json, uk.json — mit dem englischen Text als Schlüssel
  pwa/sw.js        der Service Worker des GitHub-Pages-Builds
assets/pwa/        die PNG-Icons der PWA
tests/             Unit-Tests (Node) und der Browser-Test (tests/app.mjs)
tools/             load.mjs (kompiliert src/ für die Tests), i18n.mjs (findet die Zeichenketten),
                   icons.mjs (zeichnet assets/pwa/)
build.mjs          bündelt alles in build/paint.html und build/pages/
.github/workflows/ Tests, das GitHub-Pages-Deployment, Releases aus v*-Tags
```

## Übersetzungen

Jede angezeigte Zeichenkette ist ein `t('English text')` (oder `N_('…')`, wo eine Tabelle
gebaut wird, bevor die Sprache feststeht) mit einem reinen String-Literal. `node
tools/i18n.mjs` listet auf, was in jedem Wörterbuch fehlt oder nicht mehr gebraucht wird;
`npm test` schlägt fehl, bis sie übereinstimmen. Der Wert eines Plurals ist ein Objekt mit
einer Form für jede Pluralkategorie der Sprache (`one`, `few`, `many`, `other`…). Eine neue
Sprache ist eine neue `src/locales/<code>.json` und eine Zeile in `src/app/language.ts`.

Diese README ist in `docs/readme/README.<code>.md` übersetzt; die Liste der Sprachen
zwischen den Markierungen `<!-- languages -->` ist in jeder gleich.

## Lizenz

MIT
