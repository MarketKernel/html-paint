# HTML Paint

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<b>🇨🇳 中文</b> ·
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
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

一款具有 Paint.NET 风格的图像编辑器，以**单个独立的 HTML 文件**呈现。图层、选区、调整和效果，
一份可以逐步回退的历史记录——所有内容都不会离开这个页面：它可以从磁盘直接打开，离线工作，
不从网络加载任何东西。

界面支持 17 种语言（视图 → 语言…）——中文、英语、印地语、西班牙语、法语、阿拉伯语、孟加拉语、
葡萄牙语、俄语、乌尔都语、印尼语、德语、日语、马拉地语、泰卢固语、土耳其语和乌克兰语；阿拉伯语
和乌尔都语从右到左显示。界面提供浅色或深色主题，在手机屏幕和桌面屏幕上都能良好适配。

## 使用方法

从[发布页面](https://github.com/MarketKernel/html-paint/releases)下载 `paint-v<version>.html`，
或自行构建（见下文），然后在浏览器中打开——Chrome、Edge、Firefox 或 Safari。这一个文件就是完整的
程序：可以复制到任何地方、通过邮件发送、放到 U 盘上。

也可以在 [GitHub Pages](https://marketkernel.github.io/html-paint/) 上打开它，并将其安装为应用
（地址栏中的安装按钮；在 iPhone 上是「共享」→「添加到主屏幕」）。安装后即可离线使用，并在每次新
版本部署后的下次启动时自动更新。

将图片拖放到窗口上即可打开它，或将其作为图层添加。

## 功能

**工具**——每个工具一个快捷键；再次按下同一个键会切换到共用该键的下一个工具。

| 工具 | 快捷键 | |
|---|---|---|
| 矩形、椭圆和套索选择 | S | Shift 添加到选区，Alt 减去，两者同时按下则取交集 |
| 魔棒 | W | 按容差选择相近颜色，可选连续区域或整幅图像 |
| 移动选中的像素 | M | 拖动以移动，用控制点缩放，在外部拖动可旋转；Enter 应用，Esc 还原 |
| 移动选区 | M | 仅移动选区轮廓；方向键可微调 |
| 缩放、平移 | Z, H | 使用任意工具时，空格键或鼠标中键可平移；⌘/Ctrl + 滚轮或双指缩放 |
| 画笔 | B | 宽度、硬度、不透明度、抗锯齿；支持笔压 |
| 铅笔 | P | 绘制单个像素 |
| 橡皮擦 | E | |
| 喷枪 | A | 按住按钮时持续喷涂 |
| 油漆桶 | F | 容差，连续或全局，作用于图层或整幅图像 |
| 渐变 | G | 线性、反射、径向、锥形；从主色过渡到辅助颜色 |
| 吸管 | K | 从图层或图像中取色；可以返回上一个工具 |
| 仿制图章 | L | Ctrl+单击（⌘+单击）选取来源 |
| 文字 | T | 就地输入；字体、大小、粗体、斜体、下划线、对齐方式 |
| 直线、矩形、椭圆 | O | 轮廓、填充或两者皆有；虚线样式、圆角、箭头；Shift 约束形状 |
| 曲线 | O | 贝塞尔曲线：拖出一条线，通过两个控制点弯曲它；Enter 应用 |

左键用主色绘制，右键用辅助颜色绘制。X 交换两色，D 将它们重置为黑白，`[` 和 `]` 改变画笔大小。

**图层**——添加、删除、复制、向下合并、重新排序（在面板中拖动）、隐藏、重命名；不透明度和 17 种
混合模式（正片叠底、滤色、叠加、柔光、差值、色相……）。

**编辑**——每一步都可撤销和重做，History（历史记录）面板可跳转到其中任意一步；剪切、复制、合并
复制；粘贴到图层（浮动状态，便于摆放位置）、粘贴为新图层或新图像——也可以从系统剪贴板粘贴；全选、
取消选择、反向选择；清除或填充选区。

**图像**——裁剪到选区、调整大小（平滑或最近邻）、带锚点的画布大小调整、翻转、旋转、拼合图层。

**调整**——自动色阶、黑白、亮度和对比度、色相和饱和度、反相、色调分离、怀旧的棕褐色、阈值。

**效果**——高斯模糊、动感模糊、锐化、杂色、马赛克、浮雕、边缘检测、油画、暗角。带有参数的效果会
在调整时实时预览。调整和效果在存在选区时只作用于选区范围。

**文件**——可以打开 PNG、JPEG、WebP、GIF、BMP、SVG 等格式；PNG、JPEG 和 WebP 会保存拼合后的图像。
**OpenRaster（.ora）**保留图层及其名称、不透明度、可见性和混合模式——GIMP、Krita 和 MyPaint 也能
打开它。在允许页面直接写入文件的浏览器中（Chrome、Edge），⌘S / Ctrl+S 会保存回已打开的文件；在
其他浏览器中，保存即是下载。

## 构建

```sh
npm install
npm run build        # → build/paint.html
npm run watch        # 每次改动后自动重新构建，不压缩
npm run check        # 类型检查、单元测试、构建、浏览器测试
npm run shots         # 将主要界面的截图保存到 shots/
```

需要 Node 20 或更高版本。浏览器测试通过 DevTools 协议驱动本地 Chrome 打开构建好的页面；如果 Chrome
安装在非常规位置，设置 `CHROME=/path/to/chrome`。

构建还会生成 `build/pages/`：同一页面以 PWA 形式呈现——包含清单文件、图标和 service worker。其 PNG
图标保存在 `assets/pwa/` 中；在 `src/app/icons.ts` 里的图标发生变化后，运行 `node tools/icons.mjs`
（需要用到 Chrome）重新绘制它们。

## 发布

发布流程由 GitHub Actions 完成：

- 每次推送到 `main` 都会经过测试并部署到 GitHub Pages（需在 Settings → Pages → Source 中选择一次
  GitHub Actions）；
- 打上 `v<version>` 标签会触发构建、测试并发布一个包含 `paint-v<version>.html` 及其
  `SHA256SUMS.txt` 的发布版本。标签必须与 `package.json` 中的版本号一致：

  ```sh
  npm version 0.2.0      # 写入 package.json，提交，打上 v0.2.0 标签
  git push --follow-tags
  ```

## 目录结构

```
src/
  core/            不依赖 DOM，在测试中运行于 Node
    color.ts       RGB、HSV、HSL、十六进制；颜色距离；调色板
    raster.ts      泛洪填充（油漆桶、魔棒）、铅笔线条、蒙版轮廓、矩形
    filters.ts     作用于原始像素数组的调整与效果
    zip.ts, ora.ts ZIP 和 OpenRaster 的 stack.xml
    i18n.ts        t()、tn()、N_()
  app/             页面本体
    template.html, styles.css
    main.ts        启动入口
    app.ts         状态：文档、历史记录、颜色、设置、实时预览
    document.ts    图像及其图层
    selection.ts   以蒙版表示的选区
    history.ts     撤销与重做
    view.ts        工作区：缩放、滚动、绘制、指针输入
    tools/         每种工具一个文件
    commands.ts    菜单和键盘快捷键
    ops.ts         编辑、图像和图层相关的命令
    effects.ts     调整和效果菜单
    io.ts          打开与保存
    prompts.ts     命令背后的对话框
    ui/            菜单栏、工具箱、面板、对话框
  locales/         ru.json、uk.json——以英文文本为键
  pwa/sw.js        GitHub Pages 构建版本的 service worker
assets/pwa/        PWA 的 PNG 图标
tests/             单元测试（Node）和浏览器测试（tests/app.mjs）
tools/             load.mjs（为测试编译 src/）、i18n.mjs（查找字符串）、
                   icons.mjs（绘制 assets/pwa/）
build.mjs          将所有内容打包进 build/paint.html 和 build/pages/
.github/workflows/ 测试、GitHub Pages 部署、从 v* 标签发布版本
```

## 翻译

界面显示的每个字符串都是 `t('English text')`（或者在语言确定之前就已建好的表格中使用
`N_('…')`），并且使用纯字符串字面量。`node tools/i18n.mjs` 会列出每个词典缺少或不再需要的内容；
`npm test` 在两者一致之前都会失败。复数形式的值是一个对象，为该语言的每个复数类别（`one`、`few`、
`many`、`other`……）提供一种形式。新增一种语言需要新建 `src/locales/<code>.json` 并在
`src/app/language.ts` 中加入一行。

本 README 的翻译位于 `docs/readme/README.<code>.md`；`<!-- languages -->` 标记之间的语言列表在
每个版本中都保持一致。

## 许可证

MIT
