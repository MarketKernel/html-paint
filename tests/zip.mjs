/**
 * ZIP and OpenRaster: what is written reads back the same, a deflated archive (as
 * GIMP and Krita write them) reads too, and stack.xml keeps names, offsets, opacity,
 * visibility and blend modes — and the order of the layers.
 */
import { deflateRawSync } from 'node:zlib';
import { checker, load } from '../tools/load.mjs';

const Z = await load('core/zip', 'core/ora');
const { check, done } = checker();
const enc = new TextEncoder();
const dec = new TextDecoder();

check('crc32', Z.crc32(enc.encode('The quick brown fox jumps over the lazy dog')), 0x414fa339);
check('crc32 of nothing', Z.crc32(new Uint8Array()), 0);

const files = [
  { name: 'mimetype', data: enc.encode('image/openraster') },
  { name: 'data/слой 1.png', data: new Uint8Array([1, 2, 3, 250]) },
  { name: 'empty', data: new Uint8Array() },
];
const zip = Z.writeZip(files);
check('mimetype first, stored, at offset 38', dec.decode(zip.slice(38, 54)), 'image/openraster');
const back = await Z.readZip(zip);
check('round trip names', back.map((f) => f.name), files.map((f) => f.name));
check('round trip data', back.map((f) => [...f.data]), files.map((f) => [...f.data]));

// A deflated entry, written by hand the way other programs write them.
const text = enc.encode('hello hello hello hello hello');
const packed = deflateRawSync(text);
const name = enc.encode('a.txt');
const local = Buffer.alloc(30);
local.writeUInt32LE(0x04034b50, 0);
local.writeUInt16LE(20, 4);
local.writeUInt16LE(8, 8);
local.writeUInt32LE(Z.crc32(text), 14);
local.writeUInt32LE(packed.length, 18);
local.writeUInt32LE(text.length, 22);
local.writeUInt16LE(name.length, 26);
const central = Buffer.alloc(46);
central.writeUInt32LE(0x02014b50, 0);
central.writeUInt16LE(8, 10);
central.writeUInt32LE(Z.crc32(text), 16);
central.writeUInt32LE(packed.length, 20);
central.writeUInt32LE(text.length, 24);
central.writeUInt16LE(name.length, 28);
central.writeUInt32LE(0, 42);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(1, 8);
end.writeUInt16LE(1, 10);
end.writeUInt32LE(46 + name.length, 12);
end.writeUInt32LE(30 + name.length + packed.length, 16);
const deflated = Buffer.concat([local, name, packed, central, name, end]);
const inflated = await Z.readZip(new Uint8Array(deflated));
check('reads deflate', dec.decode(inflated[0].data), 'hello hello hello hello hello');

let refused = false;
try {
  await Z.readZip(enc.encode('not a zip at all, not even close to one'));
} catch {
  refused = true;
}
check('refuses a non-ZIP', refused, true);

const stack = {
  width: 640,
  height: 480,
  layers: [
    { name: 'Background', src: 'data/0.png', x: 0, y: 0, opacity: 1, visible: true, blend: 'normal' },
    { name: 'Shade & "light" <1>', src: 'data/1.png', x: 5, y: -3, opacity: 0.5, visible: false, blend: 'multiply' },
    { name: 'Glow', src: 'data/2.png', x: 0, y: 0, opacity: 0.25, visible: true, blend: 'additive' },
  ],
};
const xml = Z.writeStack(stack);
check('top layer first in the file', xml.indexOf('Glow') < xml.indexOf('Background'), true);
check('additive is svg:plus', xml.includes('composite-op="svg:plus"'), true);
check('stack round trip', Z.readStack(xml), stack);

// As Krita writes it: a group with an offset and its own opacity, and a mode this page lacks.
const krita = `<?xml version='1.0' encoding='UTF-8'?>
<image w="100" h="50" version="0.0.1">
 <stack>
  <stack name="Group" x="10" y="20" opacity="0.5" visibility="visible">
   <layer name="Inner" src="data/a.png" x="1" y="2" opacity="0.5" composite-op="svg:screen"/>
  </stack>
  <layer name="Odd" src="data/b.png" composite-op="krita:dissolve" visibility="hidden"/>
 </stack>
</image>`;
check('groups flatten', Z.readStack(krita), {
  width: 100,
  height: 50,
  layers: [
    { name: 'Odd', src: 'data/b.png', x: 0, y: 0, opacity: 1, visible: false, blend: 'normal' },
    { name: 'Inner', src: 'data/a.png', x: 11, y: 22, opacity: 0.25, visible: true, blend: 'screen' },
  ],
});
check('composite op', Z.compositeOp('additive'), 'lighter');

done('zip');
