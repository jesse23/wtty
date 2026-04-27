import { describe, expect, test } from 'bun:test';
import { isDuplicateDrag, rewriteHoverMotion } from './mouse';

describe('rewriteHoverMotion', () => {
  test('rewrites \\x1b[<32; to \\x1b[<35; when isHover is true', () => {
    expect(rewriteHoverMotion('\x1b[<32;8;4M', true)).toBe('\x1b[<35;8;4M');
  });

  test('preserves col;row and M suffix after rewrite', () => {
    expect(rewriteHoverMotion('\x1b[<32;120;50M', true)).toBe('\x1b[<35;120;50M');
  });

  test('returns data unchanged when isHover is false (drag)', () => {
    expect(rewriteHoverMotion('\x1b[<32;8;4M', false)).toBe('\x1b[<32;8;4M');
  });

  test('returns data unchanged for non-motion sequences regardless of isHover', () => {
    // left press
    expect(rewriteHoverMotion('\x1b[<0;8;4M', true)).toBe('\x1b[<0;8;4M');
    // left release
    expect(rewriteHoverMotion('\x1b[<0;8;4m', true)).toBe('\x1b[<0;8;4m');
    // scroll up
    expect(rewriteHoverMotion('\x1b[<64;8;4M', true)).toBe('\x1b[<64;8;4M');
    // middle drag
    expect(rewriteHoverMotion('\x1b[<33;8;4M', true)).toBe('\x1b[<33;8;4M');
  });

  test('returns data unchanged for plain text', () => {
    expect(rewriteHoverMotion('hello', true)).toBe('hello');
  });

  test('does not rewrite when isHover is false even for button-32', () => {
    // pointer moved to a new cell while button is held — must not rewrite
    const drag = '\x1b[<32;9;4M';
    expect(rewriteHoverMotion(drag, false)).toBe(drag);
  });
});

describe('isDuplicateDrag', () => {
  test('returns true for identical consecutive button-32 sequences', () => {
    const seq = '\x1b[<32;8;4M';
    expect(isDuplicateDrag(seq, seq)).toBe(true);
  });

  test('returns false when position changes', () => {
    expect(isDuplicateDrag('\x1b[<32;9;4M', '\x1b[<32;8;4M')).toBe(false);
  });

  test('returns false when lastDragSeq is empty (first drag event)', () => {
    expect(isDuplicateDrag('\x1b[<32;8;4M', '')).toBe(false);
  });

  test('returns false for non-drag sequences even if identical', () => {
    // press, release, scroll must never be deduped
    expect(isDuplicateDrag('\x1b[<0;8;4M', '\x1b[<0;8;4M')).toBe(false);
    expect(isDuplicateDrag('\x1b[<0;8;4m', '\x1b[<0;8;4m')).toBe(false);
    expect(isDuplicateDrag('\x1b[<64;8;4M', '\x1b[<64;8;4M')).toBe(false);
  });

  test('returns false when row differs', () => {
    expect(isDuplicateDrag('\x1b[<32;8;5M', '\x1b[<32;8;4M')).toBe(false);
  });

  test('returns true only for exact string match', () => {
    expect(isDuplicateDrag('\x1b[<32;8;4M', '\x1b[<32;8;4M')).toBe(true);
    expect(isDuplicateDrag('\x1b[<32;8;4M', '\x1b[<35;8;4M')).toBe(false);
  });
});
