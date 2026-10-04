/**
 * The flood fill under the paint bucket and the magic wand, pencil lines, mask
 * outlines and the rectangle helpers.
 */
import { checker, load } from '../tools/load.mjs';

const R = await load('core/raster');
const { check, done } = checker();

// A picture from text: each character a pixel of the colour it names.
const COLORS = { '.': [255, 255, 255, 255], '#': [0, 0, 0, 255], r: [250, 0, 0, 255], R: [200, 0, 0, 255], _: [0, 0, 0, 0] };
function picture(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) => [...row].forEach((ch, x) => data.set(COLORS[ch], (y * width + x) * 4)));
  return { data, width, height };
}
const show = (region, w, h) =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (region.mask[y * w + x] ? 'x' : '.')).join(''));

const ring = picture([
  '.......',
  '.#####.',
  '.#...#.',
  '.#...#.',
  '.#####.',
  '.......',
]);
const inside = R.floodRegion(ring, 3, 3, 0, true);
check('inside the ring', show(inside, 7, 6), ['.......', '.......', '..xxx..', '..xxx..', '.......', '.......']);
check('inside bounds', inside.bounds, { x: 2, y: 2, w: 3, h: 2 });
const outside = R.floodRegion(ring, 0, 0, 0, true);
check('outside the ring', show(outside, 7, 6), ['xxxxxxx', 'x.....x', 'x.....x', 'x.....x', 'x.....x', 'xxxxxxx']);
const everywhere = R.floodRegion(ring, 0, 0, 0, false);
check('global takes both', everywhere.mask.filter(Boolean).length, 42 - 14);
check('off the picture', R.floodRegion(ring, 7, 0, 0, true), null);

// A spiral corridor, where a fill that only looks one row away would stop.
const spiral = picture([
  '.........',
  '#######.#',
  '#.....#.#',
  '#.###.#.#',
  '#.#...#.#',
  '#.#####.#',
  '#.......#',
  '#########',
]);
const corridor = R.floodRegion(spiral, 0, 0, 0, true);
check('fills a spiral', corridor.mask[4 * 9 + 3], 255);
check('spiral count', corridor.mask.filter(Boolean).length, 9 + 1 + 6 + 3 + 5 + 2 + 7);

const reds = picture(['rR.', 'Rr.']);
check('tolerance 0 keeps 250 apart from 200', R.floodRegion(reds, 0, 0, 0, false).mask.filter(Boolean).length, 2);
check('tolerance 0.2 joins them', R.floodRegion(reds, 0, 0, 0.2, false).mask.filter(Boolean).length, 4);
check('tolerance 1 takes all', R.floodRegion(reds, 0, 0, 1, true).mask.filter(Boolean).length, 6);
const holes = picture(['_#_', '___']);
check('transparent is one colour', R.floodRegion(holes, 0, 0, 0, true).mask.filter(Boolean).length, 5);

check('a line', R.linePixels(0, 0, 3, 1), [[0, 0], [1, 0], [2, 1], [3, 1]]);
check('a point', R.linePixels(2.7, 5.1, 2.2, 5.9), [[2, 5]]);
check('steep, backwards', R.linePixels(0, 3, 0, 0), [[0, 3], [0, 2], [0, 1], [0, 0]]);

const square = new Uint8Array([0, 0, 0, 0, 255, 255, 0, 255, 255]);
check('outline of a square', R.maskOutline(square, 3, 3), [1, 1, 3, 1, 1, 3, 3, 3, 1, 1, 1, 3, 3, 1, 3, 3]);
check('bounds of a square', R.alphaBounds(square, 3, 3), { x: 1, y: 1, w: 2, h: 2 });
check('bounds of nothing', R.alphaBounds(new Uint8Array(4), 2, 2), null);
check('bounds in RGBA', R.alphaBounds(new Uint8Array([0, 0, 0, 0, 9, 9, 9, 9]), 2, 1, 4, 3), { x: 1, y: 0, w: 1, h: 1 });

check('intersect', R.intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 8, w: 10, h: 10 }), { x: 5, y: 8, w: 5, h: 2 });
check('apart', R.intersect({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 }), null);
check('union', R.union({ x: 0, y: 0, w: 2, h: 2 }, { x: 5, y: -1, w: 1, h: 1 }), { x: 0, y: -1, w: 6, h: 3 });
check('inflate', R.inflate({ x: 1.5, y: 2, w: 1, h: 1 }, 2), { x: -1, y: 0, w: 6, h: 5 });

done('raster');
