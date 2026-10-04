/**
 * The adjustments and effects on small pictures whose results can be worked out
 * by hand, and the properties that must hold for any picture: a blur keeps a flat
 * colour flat and does not bleed the colour of transparent pixels, and noise with
 * the same seed is the same noise.
 */
import { checker, load } from '../tools/load.mjs';

const F = await load('core/filters');
const { check, done } = checker();

const flat = (w, h, rgba) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return { data, width: w, height: h };
};
const px = (p, x, y) => [...p.data.slice((y * p.width + x) * 4, (y * p.width + x) * 4 + 4)];
const one = (rgba, fn) => {
  const p = flat(1, 1, rgba);
  fn(p);
  return px(p, 0, 0);
};

check('invert', one([10, 20, 30, 77], F.invert), [245, 235, 225, 77]);
check('black and white', one([255, 0, 0, 255], F.blackAndWhite), [76, 76, 76, 255]);
check('sepia of white', one([255, 255, 255, 255], F.sepia), [255, 255, 239, 255]);
check('brightness up', one([100, 100, 100, 255], (p) => F.brightnessContrast(p, 20, 0)), [151, 151, 151, 255]);
check('no change', one([12, 130, 250, 255], (p) => F.brightnessContrast(p, 0, 0)), [12, 130, 250, 255]);
check('contrast down to grey', one([0, 255, 30, 255], (p) => F.brightnessContrast(p, 0, -100)), [128, 128, 128, 255]);
check('contrast up to extremes', one([100, 160, 130, 255], (p) => F.brightnessContrast(p, 0, 100)), [0, 255, 255, 255]);
check('hue turns red to green', one([255, 0, 0, 255], (p) => F.hueSaturation(p, 120, 0, 0)), [0, 255, 0, 255]);
check('no saturation is grey', one([255, 0, 0, 255], (p) => F.hueSaturation(p, 0, -100, 0)), [128, 128, 128, 255]);
check('full lightness is white', one([20, 90, 200, 255], (p) => F.hueSaturation(p, 0, 0, 100)), [255, 255, 255, 255]);
check('posterize to 2', one([100, 140, 255, 255], (p) => F.posterize(p, 2)), [0, 255, 255, 255]);
check('threshold', one([200, 200, 200, 255], (p) => F.threshold(p, 128)), [255, 255, 255, 255]);
check('transparent pixels keep their colour', one([1, 2, 3, 0], F.blackAndWhite), [1, 2, 3, 0]);

const ramp = { data: new Uint8ClampedArray([50, 50, 50, 255, 100, 100, 100, 255, 150, 150, 150, 255]), width: 3, height: 1 };
F.autoLevel(ramp);
check('auto level stretches', [px(ramp, 0, 0)[0], px(ramp, 1, 0)[0], px(ramp, 2, 0)[0]], [0, 128, 255]);

const solid = flat(20, 20, [40, 80, 120, 255]);
F.gaussianBlur(solid, 6);
check('a blur keeps a flat colour', px(solid, 10, 3), [40, 80, 120, 255]);

// Red on the left, transparent on the right: the edge may fade but must stay red.
const half = flat(20, 1, [0, 0, 0, 0]);
for (let x = 0; x < 10; x++) half.data.set([255, 0, 0, 255], x * 4);
F.gaussianBlur(half, 4);
const edge = px(half, 10, 0);
check('blur fades the edge', edge[3] > 0 && edge[3] < 255, true);
check('blur bleeds no black', edge.slice(0, 3), [255, 0, 0]);

const dot = flat(9, 9, [0, 0, 0, 255]);
dot.data.set([255, 255, 255, 255], (4 * 9 + 4) * 4);
F.gaussianBlur(dot, 4);
check('blur spreads a dot', px(dot, 4, 4)[0] < 255 && px(dot, 5, 4)[0] > 0, true);
check('blur is symmetric', px(dot, 3, 4), px(dot, 5, 4));

const step = { data: new Uint8ClampedArray([100, 100, 100, 255, 100, 100, 100, 255, 200, 200, 200, 255, 200, 200, 200, 255]), width: 4, height: 1 };
F.sharpen(step, 100, 2);
check('sharpen widens a step', px(step, 1, 0)[0] < 100 && px(step, 2, 0)[0] > 200, true);

const a = flat(10, 10, [128, 128, 128, 255]);
const b = flat(10, 10, [128, 128, 128, 255]);
F.addNoise(a, 50, 50, 100, 7);
F.addNoise(b, 50, 50, 100, 7);
check('noise is seeded', [...a.data], [...b.data]);
check('noise changes pixels', [...a.data].some((v, i) => v !== 128 && i % 4 !== 3), true);

const checks = flat(4, 2, [0, 0, 0, 255]);
checks.data.set([255, 255, 255, 255], 0);
F.pixelate(checks, 2);
check('pixelate averages a cell', px(checks, 1, 1), [64, 64, 64, 255]);
check('pixelate keeps other cells', px(checks, 3, 0), [0, 0, 0, 255]);

const plain = flat(5, 5, [90, 90, 90, 255]);
F.emboss(plain, 45);
check('emboss of flat is mid grey', px(plain, 2, 2), [128, 128, 128, 255]);
const calm = flat(5, 5, [90, 90, 90, 255]);
F.edgeDetect(calm);
check('no edges is white', px(calm, 2, 2), [255, 255, 255, 255]);

const room = flat(11, 11, [200, 200, 200, 255]);
F.vignette(room, 50, 100);
check('vignette leaves the centre', px(room, 5, 5)[0] > 190, true);
check('vignette darkens a corner', px(room, 0, 0)[0], 0);

const streak = flat(9, 1, [0, 0, 0, 255]);
streak.data.set([255, 255, 255, 255], 4 * 4);
F.motionBlur(streak, 0, 4);
check('motion blur along a row', px(streak, 3, 0)[0] > 0 && px(streak, 5, 0)[0] === px(streak, 3, 0)[0], true);

const two = flat(6, 6, [0, 0, 0, 255]);
for (let i = 0; i < 18; i++) two.data.set([250, 250, 250, 255], i * 4);
F.oilPaint(two, 1);
check('oil paint keeps flat areas', px(two, 0, 0), [250, 250, 250, 255]);

done('filters');
