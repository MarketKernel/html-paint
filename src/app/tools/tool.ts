// What every tool has. The view hands a tool pointer events in image coordinates;
// a tool that leaves work open (text being typed, pixels being moved) finishes it in
// commit() — called before any command, an undo, a change of tool or layer — and
// drops it in cancel().

export type OptionId =
  | 'size'
  | 'hardness'
  | 'opacity'
  | 'antialias'
  | 'tolerance'
  | 'floodMode'
  | 'sampling'
  | 'shapeStyle'
  | 'dash'
  | 'radius'
  | 'arrows'
  | 'gradient'
  | 'selectMode'
  | 'font'
  | 'fontSize'
  | 'textStyle'
  | 'align'
  | 'density'
  | 'pickerAfter'
  | 'moveHint'
  | 'cloneHint';

export interface ToolEvent {
  // Image coordinates, fractional: the middle of pixel (3, 4) is (3.5, 4.5).
  x: number;
  y: number;
  // 0 for the main button (primary colour), 2 for the other one (secondary colour).
  button: 0 | 2;
  shift: boolean;
  alt: boolean;
  // ⌘ on a Mac, Ctrl elsewhere.
  mod: boolean;
  pressure: number;
}

export interface Tool {
  id: string;
  // English, translated where shown.
  label: string;
  hint: string;
  key: string;
  icon: string;
  options: OptionId[];
  cursor?: string;
  // Shows the brush's outline under the pointer.
  brushCursor?: boolean;
  down?(e: ToolEvent): void;
  move?(e: ToolEvent): void;
  up?(e: ToolEvent): void;
  // The pointer over the image with no button down; null once it leaves.
  hover?(e: ToolEvent | null): void;
  // Drawn over the image, in image coordinates; zoom gives the size of a screen pixel.
  overlay?(ctx: CanvasRenderingContext2D, zoom: number): void;
  activate?(): void;
  deactivate?(): void;
  commit?(): void;
  cancel?(): boolean;
  // The gesture under way is broken off (a second finger, a cancelled pointer, another
  // tool chosen mid-stroke): what it was doing is dropped, but not work left open before
  // it — floating pixels stay, a text box stays. Without it, cancel() does.
  abort?(): void;
  // A key pressed while the tool is active; true when the tool used it.
  keydown?(e: KeyboardEvent): boolean;
  // Something the tool shows (a typed text's settings) changed.
  optionsChanged?(): void;
}
