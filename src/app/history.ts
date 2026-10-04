// Undo and redo. An entry knows how to take itself back and to do itself again; the
// page makes two kinds (app.ts): a patch of one layer's pixels, and a whole document
// state, which holds layers and canvases by reference and so costs little.

export interface Entry {
  name: string;
  icon: string;
  // Roughly how many bytes it holds on to, so a long history can be trimmed.
  bytes: number;
  undo(): void;
  redo(): void;
}

const MAX_ENTRIES = 200;
const MAX_BYTES = 768 * 1024 * 1024;

export class History {
  entries: Entry[] = [];
  // How many of the entries are done: the ones after it are there to redo.
  index = 0;
  // index when the document was last opened or saved; -1 when no state matches it.
  private saved = 0;

  push(entry: Entry): void {
    this.entries.length = this.index;
    if (this.saved > this.index) this.saved = -1;
    this.entries.push(entry);
    this.index++;
    let bytes = this.entries.reduce((n, e) => n + e.bytes, 0);
    while (this.entries.length > 1 && (this.entries.length > MAX_ENTRIES || bytes > MAX_BYTES)) {
      bytes -= this.entries.shift()!.bytes;
      this.index--;
      this.saved = this.saved > 0 ? this.saved - 1 : -1;
    }
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.entries.length;
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    this.entries[--this.index]!.undo();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo) return false;
    this.entries[this.index++]!.redo();
    return true;
  }

  // Undoes or redoes as far as it takes to have `index` entries done.
  goTo(index: number): void {
    while (this.index > index && this.undo());
    while (this.index < index && this.redo());
  }

  clear(): void {
    this.entries = [];
    this.index = 0;
    this.saved = 0;
  }

  markSaved(index = this.index): void {
    this.saved = index;
  }

  get dirty(): boolean {
    return this.saved !== this.index;
  }
}
