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
<b>🇧🇷 Português</b> ·
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

Um editor de imagens no espírito do Paint.NET, como **um único arquivo HTML independente**.
Camadas, seleções, ajustes e efeitos, um histórico pelo qual você pode voltar — e nada sai
da página: ela abre a partir do disco, funciona offline e não carrega nada da rede.

A interface está disponível em 17 idiomas (Exibir → Idioma…) — inglês, chinês, hindi,
espanhol, francês, árabe, bengali, português, russo, urdu, indonésio, alemão, japonês,
marati, telugu, turco e ucraniano; árabe e urdu da direita para a esquerda. Vem com tema
claro ou escuro, e se adapta tanto à tela de um celular quanto à de um desktop.

## Como usar

Baixe o `paint-v<version>.html` nas
[releases](https://github.com/MarketKernel/html-paint/releases), ou compile-o (abaixo), e
abra-o em um navegador — Chrome, Edge, Firefox ou Safari. Esse único arquivo é o programa
inteiro: copie-o para qualquer lugar, envie por e-mail, coloque em um pendrive.

Ou abra-o no [GitHub Pages](https://marketkernel.github.io/html-paint/) e instale-o como
aplicativo (o botão de instalação na barra de endereço; Compartilhar → Adicionar à Tela de
Início em um iPhone). A partir daí, funciona offline, e se atualiza sozinho na próxima vez
que abrir depois de um novo lançamento.

Solte uma imagem sobre a janela para abri-la, ou para adicioná-la como camada.

## O que ele faz

**Ferramentas** — uma tecla para cada uma; pressioná-la de novo passa para a próxima
ferramenta na mesma tecla.

| Ferramenta | Tecla | |
|---|---|---|
| Seleção retangular, elíptica e laço | S | Shift adiciona à seleção, Alt subtrai, os dois juntos intersectam |
| Varinha mágica | W | Cores semelhantes, contíguas ou em toda a imagem, por tolerância |
| Mover pixels selecionados | M | Arraste para mover, alças para redimensionar, fora delas para girar; Enter aplica, Esc desfaz |
| Mover seleção | M | Só o contorno; as setas movem aos poucos |
| Zoom, mão | Z, H | Espaço ou o botão do meio navega com qualquer ferramenta; ⌘/Ctrl + roda do mouse ou um gesto de pinça dá zoom |
| Pincel | B | Largura, dureza, opacidade, suavização; pressão da caneta |
| Lápis | P | Pixels individuais |
| Borracha | E | |
| Aerógrafo | A | Pulveriza enquanto o botão é mantido pressionado |
| Balde de tinta | F | Tolerância, contígua ou global, a camada ou a imagem inteira |
| Gradiente | G | Linear, refletido, radial, cônico; cor primária → secundária |
| Conta-gotas | K | Da camada ou da imagem; pode voltar à ferramenta anterior |
| Carimbo | L | Ctrl+clique (⌘+clique) escolhe a origem |
| Texto | T | Digitado no lugar; fonte, tamanho, negrito, itálico, sublinhado, alinhamento |
| Linha, retângulo, elipse | O | Contorno, preenchimento ou os dois; traços, cantos arredondados, setas; Shift restringe |
| Curva | O | Uma curva de Bézier: puxe uma linha, curve-a pelos dois pontos de controle; Enter aplica |

O botão esquerdo pinta com a cor primária, o direito com a secundária. X as troca, D as
redefine para preto e branco, `[` e `]` mudam o tamanho do pincel.

**Camadas** — adicionar, excluir, duplicar, mesclar com a de baixo, reordenar (arraste no
painel), ocultar, renomear; opacidade e 17 modos de mesclagem (multiplicação, tela,
sobreposição, luz suave, diferença, matiz…).

**Editar** — desfazer e refazer cada passo, com um painel de Histórico para saltar para
qualquer um deles; recortar, copiar, copiar mesclado; colar na camada (flutuando, para
posicionar), em uma nova camada ou como nova imagem — também a partir da área de
transferência do sistema; selecionar tudo, desmarcar seleção, inverter a seleção; apagar ou
preencher a seleção.

**Imagem** — cortar para seleção, redimensionar (suave ou vizinho mais próximo), tamanho da
tela com âncora, inverter, girar, nivelar.

**Ajustes** — níveis automáticos, preto e branco, brilho e contraste, matiz e saturação,
inverter cores, posterizar, sépia, limiar.

**Efeitos** — desfoque gaussiano, desfoque de movimento, nitidez, ruído, pixelizar, relevo,
detectar bordas, pintura a óleo, vinheta. Os que têm configurações mostram a prévia na
imagem enquanto você as altera. Ajustes e efeitos respeitam a seleção, quando há uma.

**Arquivos** — PNG, JPEG, WebP, GIF, BMP, SVG e outros abrem; PNG, JPEG e WebP salvam a
imagem nivelada. O **OpenRaster (.ora)** mantém as camadas, com seus nomes, opacidade,
visibilidade e modos de mesclagem — o GIMP, o Krita e o MyPaint também o abrem. Onde o
navegador permite que a página grave arquivos (Chrome, Edge), ⌘S / Ctrl+S salva de volta no
arquivo aberto; nos demais casos, salvar é um download.

## Compilar

```sh
npm install
npm run build        # → build/paint.html
npm run watch         # recompila a cada alteração, sem minificação
npm run check         # verificação de tipos, testes unitários, build, testes de navegador
npm run shots         # capturas de tela das telas principais em shots/
```

Node 20 ou mais recente. Os testes de navegador controlam a página compilada em um Chrome
local pelo protocolo DevTools; defina `CHROME=/path/to/chrome` se ele estiver em um lugar
incomum.

O build também grava `build/pages/`: a mesma página como PWA — um manifest, ícones e um
service worker. Os ícones PNG ficam em `assets/pwa/`; depois que o ícone em
`src/app/icons.ts` muda, `node tools/icons.mjs` os desenha de novo (usando o Chrome).

## Lançamentos

O GitHub Actions cuida da publicação:

- cada push para `main` é testado e publicado no GitHub Pages (Settings → Pages → Source:
  GitHub Actions, uma vez);
- uma tag `v<version>` compila, testa e publica uma release com `paint-v<version>.html` e
  seu `SHA256SUMS.txt`. A tag precisa corresponder à versão do `package.json`:

  ```sh
  npm version 0.2.0      # grava o package.json, cria o commit, cria a tag v0.2.0
  git push --follow-tags
  ```

## Estrutura

```
src/
  core/            sem DOM, roda em Node nos testes
    color.ts       RGB, HSV, HSL, hex; distância de cor; a paleta
    raster.ts      preenchimento (balde, varinha), linhas do lápis, contornos de máscara, retângulos
    filters.ts     os ajustes e efeitos, sobre arrays de pixels simples
    zip.ts, ora.ts ZIP e o stack.xml do OpenRaster
    i18n.ts        t(), tn(), N_()
  app/             a página
    template.html, styles.css
    main.ts        inicia tudo
    app.ts         o estado: documento, histórico, cores, configurações, a prévia ao vivo
    document.ts    a imagem e suas camadas
    selection.ts   seleções como máscaras
    history.ts     desfazer e refazer
    view.ts        a área de trabalho: zoom, rolagem, desenho, entrada do ponteiro
    tools/         um arquivo por tipo de ferramenta
    commands.ts    menus e atalhos de teclado
    ops.ts         os comandos de Editar, Imagem e Camadas
    effects.ts     os menus de Ajustes e Efeitos
    io.ts          abrir e salvar
    prompts.ts     diálogos por trás dos comandos
    ui/            barra de menus, caixa de ferramentas, painéis, diálogos
  locales/         ru.json, uk.json — indexados pelo texto em inglês
  pwa/sw.js        o service worker do build do GitHub Pages
assets/pwa/        os ícones PNG do PWA
tests/             testes unitários (Node) e o teste de navegador (tests/app.mjs)
tools/             load.mjs (compila src/ para os testes), i18n.mjs (localiza as strings),
                   icons.mjs (desenha assets/pwa/)
build.mjs          empacota tudo em build/paint.html e build/pages/
.github/workflows/ testes, o deploy no GitHub Pages, releases a partir das tags v*
```

## Traduções

Toda string exibida é um `t('English text')` (ou `N_('…')` onde uma tabela é montada antes
de o idioma ser conhecido) com um literal de string simples. `node tools/i18n.mjs` lista o
que falta ou não é mais necessário em cada dicionário; `npm test` falha até que coincidam.
O valor de um plural é um objeto com uma forma para cada categoria de plural do idioma
(`one`, `few`, `many`, `other`…). Um novo idioma é um novo `src/locales/<code>.json` e uma
linha em `src/app/language.ts`.

Este README é traduzido em `docs/readme/README.<code>.md`; a lista de idiomas entre as
marcas `<!-- languages -->` é a mesma em todos eles.

## Licença

MIT
