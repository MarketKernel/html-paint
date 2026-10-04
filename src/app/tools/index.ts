// All tools, in the order the toolbox shows them: two columns, related tools side by side.

import { curve } from './curve';
import { bucket, gradient } from './fill';
import { movePixels } from './move';
import { airbrush, cloneStamp, eraser, paintbrush, pencil } from './paint';
import { ellipseSelect, lasso, magicWand, moveSelection, rectSelect } from './select';
import { ellipse, line, rectangle } from './shapes';
import { text } from './text';
import type { Tool } from './tool';
import { pan, picker, zoom } from './view-tools';

export const TOOLS: Tool[] = [
  rectSelect,
  movePixels,
  ellipseSelect,
  moveSelection,
  lasso,
  magicWand,
  zoom,
  pan,
  paintbrush,
  pencil,
  eraser,
  airbrush,
  bucket,
  gradient,
  picker,
  cloneStamp,
  line,
  curve,
  rectangle,
  ellipse,
  text,
];
