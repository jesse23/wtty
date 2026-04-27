/**
 * SGR mouse sequence helpers.
 *
 * ghostty-web bug: handleMouseMove always encodes motion as SGR button-32
 * (\x1b[<32;col;rowM) regardless of whether a button is held.  It uses its
 * own mouseButtonsPressed bitmask; when no button is pressed the bitmask is 0,
 * and 0+32=32 — the same Cb value as a left-button drag.  Real terminals use
 * Cb=35 (32+3, "no button") for hover and Cb=32 for left-button drag.
 *
 * Impact on vim: with `set mouse=a` vim requests mode 1003 (any-event
 * tracking).  Every hover move arrives as \x1b[<32;…M which vim decodes as
 * <LeftDrag>, toggling visual mode on each pixel of cursor movement.
 *
 * The two exported functions implement the fixes applied in onData:
 *
 * - rewriteHoverMotion: when the DOM reports no button held (e.buttons===0),
 *   rewrite \x1b[<32; → \x1b[<35; so vim receives the correct no-button code
 *   (Cb=35 per the SGR spec).  The position is still forwarded so vim can
 *   track the cursor for subsequent drag operations.
 *
 * - isDuplicateDrag: ghostty-web fires multiple mousemove events for the same
 *   character cell while the pointer stays within it.  Vim treats a <LeftDrag>
 *   at the same cell twice as a visual-mode toggle (enter → exit), so
 *   consecutive identical drag sequences must be deduplicated.
 */

/** Prefix that ghostty-web emits for both hover and left-button drag. */
const DRAG_PREFIX = '\x1b[<32;';
/** Correct SGR prefix for no-button hover motion (Cb = 32 + 3 = 35). */
const HOVER_PREFIX = '\x1b[<35;';

/**
 * If `isHover` is true and `data` is a ghostty-web hover-misencoded drag
 * sequence, rewrite the button byte from 32 to 35 (the correct SGR no-button
 * code) and return the corrected sequence.  Otherwise return `data` unchanged.
 *
 * @param data    Raw SGR sequence from ghostty-web's onData callback.
 * @param isHover Whether the originating DOM mousemove had `e.buttons === 0`.
 */
export function rewriteHoverMotion(data: string, isHover: boolean): string {
  if (isHover && data.startsWith(DRAG_PREFIX)) {
    return HOVER_PREFIX + data.slice(DRAG_PREFIX.length);
  }
  return data;
}

/**
 * Returns true when `data` is a left-button drag sequence (`\x1b[<32;…M`)
 * that is identical to the previous drag sequence, indicating the pointer
 * has not moved to a new character cell.
 *
 * Callers should maintain `lastDragSeq` state and pass it in; on a false
 * return they update `lastDragSeq = data`, on a true return they skip sending.
 *
 * @param data        Raw SGR sequence from ghostty-web's onData callback.
 * @param lastDragSeq The last drag sequence that was forwarded to the PTY.
 */
export function isDuplicateDrag(data: string, lastDragSeq: string): boolean {
  return data.startsWith(DRAG_PREFIX) && data === lastDragSeq;
}
