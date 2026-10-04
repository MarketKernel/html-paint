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
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<b>🇹🇷 Türkçe</b> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Paint.NET ruhunda bir görüntü düzenleyici, **tek başına bir HTML dosyası** olarak. Katmanlar,
seçimler, ayarlamalar ve efektler, adım adım geri dönebileceğiniz bir geçmiş — ve hiçbir şey
sayfadan çıkmaz: diskten açılır, çevrimdışı çalışır ve ağdan hiçbir şey yüklemez.

Arayüz 17 dilde kullanılabilir (Görünüm → Dil…) — İngilizce, Çince, Hintçe, İspanyolca,
Fransızca, Arapça, Bengalce, Portekizce, Rusça, Urduca, Endonezce, Almanca, Japonca, Marathi,
Telugu, Türkçe ve Ukraynaca; Arapça ve Urduca sağdan sola yazılır. Açık ya da koyu temayla
gelir ve bir telefonun ekranına da bir masaüstününküne de uyar.

## Kullanım

`paint-v<sürüm>.html` dosyasını
[releases](https://github.com/MarketKernel/html-paint/releases) sayfasından indirin, ya da
(aşağıda anlatıldığı gibi) kendiniz derleyin, ve bir tarayıcıda açın — Chrome, Edge, Firefox
ya da Safari. Bu tek dosya programın tamamıdır: istediğiniz yere kopyalayabilir, e-postayla
gönderebilir, bir USB belleğe koyabilirsiniz.

Ya da [GitHub Pages](https://marketkernel.github.io/html-paint/) üzerinde açın ve bir
uygulama olarak yükleyin (adres çubuğundaki yükleme düğmesi; iPhone'da Paylaş → Ana Ekrana
Ekle). O andan sonra çevrimdışı çalışır ve yeni bir dağıtımdan sonraki ilk açılışta kendini
günceller.

Bir görüntüyü pencerenin üzerine bırakarak açabilir ya da katman olarak ekleyebilirsiniz.

## Neler yapabilir

**Araçlar** — her birinin bir tuşu vardır; aynı tuşa tekrar basmak aynı tuştaki bir sonraki
araca geçer.

| Araç | Tuş | |
|---|---|---|
| Dikdörtgen, elips ve serbest seçim | S | Shift seçime ekler, Alt çıkarır, ikisi birden kesiştirir |
| Sihirli değnek | W | Benzer renkler, bitişik ya da tüm görüntüde, toleransa göre |
| Seçili pikselleri taşı | M | Taşımak için sürükleyin, ölçeklemek için tutamaçlar, döndürmek için dışarı; Enter uygular, Esc geri alır |
| Seçimi taşı | M | Yalnızca çerçeve; ok tuşları ince ayarla hareket ettirir |
| Yakınlaştırma, el | Z, H | Herhangi bir araçla boşluk tuşu ya da orta düğme kaydırır; ⌘/Ctrl + tekerlek ya da sıkıştırma yakınlaştırır |
| Fırça | B | Genişlik, sertlik, opaklık, kenar yumuşatma; kalem basıncı |
| Kalem | P | Tek tek pikseller |
| Silgi | E | |
| Hava fırçası | A | Düğme basılı tutulduğu sürece püskürtür |
| Boya kovası | F | Tolerans, bitişik ya da genel, katman ya da tüm görüntü |
| Degrade | G | Doğrusal, yansıyan, radyal, açısal; birincil → ikincil renk |
| Renk seçici | K | Katmandan ya da görüntüden; önceki araca dönebilir |
| Klon damgası | L | Ctrl+tıklama (⌘+tıklama) kaynağı seçer |
| Metin | T | Yerinde yazılır; yazı tipi, boyut, kalın, italik, altı çizili, hizalama |
| Çizgi, dikdörtgen, elips | O | Kontur, dolgu ya da ikisi birden; çizgi tipi, yuvarlatılmış köşeler, oklar; Shift kısıtlar |
| Eğri | O | Bir Bézier eğrisi: bir çizgi sürükleyip iki kontrol noktasından eğin; Enter uygular |

Sol düğme birincil renkle, sağ düğme ikincil renkle boyar. X renkleri değiştirir, D onları
siyah ve beyaza sıfırlar, `[` ve `]` fırça boyutunu değiştirir.

**Katmanlar** — ekleme, silme, çoğaltma, alttakiyle birleştirme, yeniden sıralama (panelde
sürükleyerek), gizleme, yeniden adlandırma; opaklık ve 17 karışım modu (çarpma, ekran,
kaplama, yumuşak ışık, fark, ton…).

**Düzen** — her adımın geri alınması ve yinelenmesi, dilediğine atlamak için bir Geçmiş
paneliyle; kesme, kopyalama, birleştirilmiş kopyalama; katmana yapıştırma (yerleştirmek için
yüzen biçimde), yeni bir katmana ya da yeni bir görüntü olarak yapıştırma — sistem panosundan
da; tümünü seçme, seçimi kaldırma, seçimi ters çevirme; seçimi silme ya da doldurma.

**Görüntü** — seçime kırpma, yeniden boyutlandırma (yumuşak ya da en yakın komşu), çapalı
tuval boyutu, çevirme, döndürme, düzleştirme.

**Ayarlamalar** — otomatik düzey, siyah beyaz, parlaklık ve kontrast, ton ve doygunluk,
renkleri negatife çevirme, posterize, sepya, eşik.

**Efektler** — Gauss bulanıklığı, hareket bulanıklığı, netleştirme, gürültü, pikselleştirme,
kabartma, kenar belirleme, yağlı boya, vinyet. Ayarları olanlar, siz değiştirdikçe görüntü
üzerinde önizlenir. Ayarlamalar ve efektler, bir seçim varsa onunla sınırlı kalır.

**Dosyalar** — PNG, JPEG, WebP, GIF, BMP, SVG ve daha fazlası açılır; PNG, JPEG ve WebP
görüntüyü düzleştirilmiş olarak kaydeder. **OpenRaster (.ora)** katmanları adları,
opaklıkları, görünürlükleri ve karışım modlarıyla birlikte saklar — GIMP, Krita ve MyPaint da
bu dosyayı açabilir. Tarayıcı bir sayfanın dosya yazmasına izin verdiğinde (Chrome, Edge),
⌘S / Ctrl+S açılan dosyanın üzerine kaydeder; diğer durumlarda kaydetme bir indirme olur.

## Derleme

```sh
npm install
npm run build         # → build/paint.html
npm run watch          # her değişiklikte yeniden derler, küçültülmemiş
npm run check          # tür denetimi, birim testleri, derleme, tarayıcı testleri
npm run shots          # ana ekranların görüntülerini shots/ içine alır
```

Node 20 ya da üzeri gerekir. Tarayıcı testleri, derlenmiş sayfayı DevTools protokolü
üzerinden yerel bir Chrome ile çalıştırır; Chrome alışılmadık bir yerdeyse
`CHROME=/yol/chrome` ayarlayın.

Derleme ayrıca `build/pages/` içine de yazar: aynı sayfanın bir PWA hâli — bir manifest,
simgeler ve bir servis çalışanı. PNG simgeleri `assets/pwa/` içinde tutulur; `src/app/icons.ts`
içindeki simge değiştikten sonra `node tools/icons.mjs` onları (Chrome ile) yeniden çizer.

## Sürümler

Yayınlamayı GitHub Actions yapar:

- `main`'e yapılan her gönderim test edilir ve GitHub Pages'e dağıtılır (Settings → Pages →
  Source: GitHub Actions, bir kere ayarlanır);
- bir `v<sürüm>` etiketi derler, test eder ve `paint-v<sürüm>.html` ile `SHA256SUMS.txt`
  dosyasını içeren bir sürüm yayınlar. Etiket, `package.json`'daki sürümle eşleşmelidir:

  ```sh
  npm version 0.2.0      # package.json'ı yazar, commit eder, v0.2.0 etiketler
  git push --follow-tags
  ```

## Yerleşim

```
src/
  core/            DOM yok, testler altında Node'da çalışır
    color.ts       RGB, HSV, HSL, hex; renk uzaklığı; palet
    raster.ts      alan doldurma (kova, değnek), kalem çizgileri, maske dış hatları, dikdörtgenler
    filters.ts     düz piksel dizileri üzerinde ayarlamalar ve efektler
    zip.ts, ora.ts ZIP ve OpenRaster'ın stack.xml'i
    i18n.ts        t(), tn(), N_()
  app/             sayfa
    template.html, styles.css
    main.ts        her şeyi başlatır
    app.ts         durum: belge, geçmiş, renkler, ayarlar, canlı önizleme
    document.ts    görüntü ve katmanları
    selection.ts   maske olarak seçimler
    history.ts     geri alma ve yineleme
    view.ts        çalışma alanı: yakınlaştırma, kaydırma, çizim, imleç girişi
    tools/         araç türü başına bir dosya
    commands.ts    menüler ve klavye kısayolları
    ops.ts         Düzen, Görüntü ve Katmanlar komutları
    effects.ts     Ayarlamalar ve Efektler menüleri
    io.ts          açma ve kaydetme
    prompts.ts     komutların arkasındaki iletişim kutuları
    ui/            menü çubuğu, araç kutusu, paneller, iletişim kutuları
  locales/         ru.json, uk.json — İngilizce metinle anahtarlanır
  pwa/sw.js        GitHub Pages derlemesinin servis çalışanı
assets/pwa/        PWA'nın PNG simgeleri
tests/             birim testleri (Node) ve tarayıcı testi (tests/app.mjs)
tools/             load.mjs (testler için src/'yi derler), i18n.mjs (metinleri bulur),
                   icons.mjs (assets/pwa/'yi çizer)
build.mjs          her şeyi build/paint.html ve build/pages/ içine paketler
.github/workflows/ testler, GitHub Pages dağıtımı, v* etiketlerinden sürümler
```

## Çeviriler

Gösterilen her metin, düz bir dize değişmez değeriyle yazılmış bir `t('English text')`'tir
(ya da dil belli olmadan bir tablo oluşturulan yerlerde `N_('…')`). `node tools/i18n.mjs`, her
sözlükte neyin eksik ya da artık gereksiz olduğunu listeler; `npm test`, bunlar eşleşene kadar
başarısız olur. Bir çoğulun değeri, dilin her çoğul kategorisi (`one`, `few`, `many`,
`other`…) için bir biçim içeren bir nesnedir. Yeni bir dil, yeni bir `src/locales/<kod>.json`
dosyası ve `src/app/language.ts` içinde bir satırdır.

Bu README, `docs/readme/README.<kod>.md` dosyalarında çevrilir; `<!-- languages -->`
işaretleri arasındaki dil listesi her birinde aynıdır.

## Lisans

MIT
