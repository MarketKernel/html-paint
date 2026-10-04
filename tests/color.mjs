/**
 * Colour conversions: hex in its four lengths, HSV and HSL both ways, and the
 * distance the paint bucket's tolerance is measured in.
 */
import { checker, load } from '../tools/load.mjs';

const C = await load('core/color');
const { check, done } = checker();

check('#rgb', C.parseHex('#f80'), { r: 255, g: 136, b: 0, a: 255 });
check('#rgba', C.parseHex('f808'), { r: 255, g: 136, b: 0, a: 136 });
check('#rrggbb', C.parseHex(' #1A2b3C '), { r: 26, g: 43, b: 60, a: 255 });
check('#rrggbbaa', C.parseHex('#1a2b3c80'), { r: 26, g: 43, b: 60, a: 128 });
check('not hex', C.parseHex('#12345'), null);
check('not hex either', C.parseHex('red'), null);
check('hex opaque', C.toHex(C.rgba(255, 0, 128)), '#FF0080');
check('hex with alpha', C.toHex(C.rgba(255, 0, 128, 64)), '#FF008040');
check('hex forced alpha', C.toHex(C.rgba(0, 0, 0), true), '#000000FF');
check('css', C.toCss(C.rgba(1, 2, 3, 51)), 'rgba(1, 2, 3, 0.2)');

check('hsv of red', C.rgbToHsv(C.rgba(255, 0, 0)), { h: 0, s: 1, v: 1 });
check('hsv of grey', C.rgbToHsv(C.rgba(128, 128, 128)).s, 0);
check('rgb of cyan', C.hsvToRgb({ h: 180, s: 1, v: 1 }), { r: 0, g: 255, b: 255, a: 255 });
check('rgb at 360°', C.hsvToRgb({ h: 360, s: 1, v: 1 }), { r: 255, g: 0, b: 0, a: 255 });
let roundTrips = true;
for (let i = 0; i < 2000; i++) {
  const c = C.rgba(Math.random() * 256, Math.random() * 256, Math.random() * 256);
  const viaHsv = C.hsvToRgb(C.rgbToHsv(c));
  const viaHsl = C.hslToRgb(C.rgbToHsl(c));
  if (!C.sameColor(c, viaHsv) || !C.sameColor(c, viaHsl)) roundTrips = false;
}
check('HSV and HSL round trips', roundTrips, true);
check('hsl of yellow', C.rgbToHsl(C.rgba(255, 255, 0)), { h: 60, s: 1, l: 0.5 });

check('distance to itself', C.distance(C.rgba(10, 20, 30), C.rgba(10, 20, 30)), 0);
check('black to transparent white', C.distance(C.rgba(0, 0, 0), C.rgba(255, 255, 255, 0)), 1);
check('two transparent colours are one', C.distance(C.rgba(255, 0, 0, 0), C.rgba(0, 0, 255, 0)), 0);
check('black to white', Math.round(C.distance(C.rgba(0, 0, 0), C.rgba(255, 255, 255)) * 1000), 866);
check('palette size', C.DEFAULT_PALETTE.length, 48);
check('palette parses', C.DEFAULT_PALETTE.every((h) => C.parseHex(h)), true);

done('color');
