import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './exports';

describe('CSV export', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('Ade, "Ace"')).toBe('"Ade, ""Ace"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell(null)).toBe('');
  });

  it('neutralises spreadsheet formulas but keeps real negative numbers', () => {
    expect(csvCell('=HYPERLINK("x")')).toContain("'=");
    expect(csvCell('+cmd|calc')).toBe("'+cmd|calc");
    expect(csvCell('+2348031112222')).toBe('+2348031112222'); // a phone number, not a formula
    expect(csvCell(-5)).toBe('-5');
  });

  it('joins rows with a header', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('a,b\r\n1,"x,y"');
  });
});
