import { describe, expect, it } from 'vitest';
import { getDisplayRange, generatePageNumbers } from './TablePagination';

describe('TablePagination helpers', () => {
  it('calculates a correct display range', () => {
    expect(getDisplayRange(1, 10, 42)).toEqual({ start: 1, end: 10, total: 42 });
    expect(getDisplayRange(2, 10, 42)).toEqual({ start: 11, end: 20, total: 42 });
    expect(getDisplayRange(5, 10, 42)).toEqual({ start: 41, end: 42, total: 42 });
  });

  it('creates correct page numbers around the current page', () => {
    expect(generatePageNumbers(1, 5)).toEqual([1, 2, 3]);
    expect(generatePageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(generatePageNumbers(5, 12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
