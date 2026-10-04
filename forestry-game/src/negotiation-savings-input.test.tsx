import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import NegotiationSavingsInput, { parseNegotiationSavings } from './NegotiationSavingsInput';
import CollaborationLab from './CollaborationLab';
import { LanguageProvider } from './i18n';
import { createGame } from './simulation/engine';
import { quebec } from './scenarios/quebec';
afterEach(() => vi.unstubAllGlobals());
it.each([['123.45', 123.45], ['-123.45', -123.45], ['123.456', 123.456], ['.005', .005], ['-0.01', -.01], ['1e2', 100]])('commits complete decimal values without rounding %s', (text, expected) => {
  expect(parseNegotiationSavings(text)).toBe(expected);
});
it.each(['', '-', '.', '1e', '1e999', 'Infinity', 'NaN', 'wrong', '0x123'])('keeps incomplete or nonfinite text out of the saved game (%s)', text => {
  expect(parseNegotiationSavings(text)).toBeNull();
});
it('renders saved values rounded for display with decimal keyboard and company label', () => {
  const html = renderToStaticMarkup(<NegotiationSavingsInput value={123.456} label="Savings for company 1" onCommit={() => {}}/>);
  expect(html).toContain('value="123.46"');
  expect(renderToStaticMarkup(<NegotiationSavingsInput value={439.83333333333337} label="Savings" onCommit={() => {}}/>)).toContain('value="439.83"');
  expect(renderToStaticMarkup(<NegotiationSavingsInput value={100} label="Savings" onCommit={() => {}}/>)).toContain('value="100"');
  expect(html).toContain('inputMode="decimal"');
  expect(html).toContain('aria-label="Savings for company 1"');
});
it('gives French instructions for commit, Escape and invalid publication', () => {
  vi.stubGlobal('localStorage', { getItem: () => 'fr' });
  const html = renderToStaticMarkup(<LanguageProvider><CollaborationLab game={createGame(quebec)} onChange={() => {}}/></LanguageProvider>);
  expect(html).toContain('Échap rétablit la valeur enregistrée');
  expect(html).not.toContain('Press Enter or leave the savings field');
});

it('accepts French decimal commas without permitting ambiguous English punctuation', () => {
  expect(parseNegotiationSavings('-123,456', 'fr')).toBe(-123.456);
  expect(parseNegotiationSavings('123,45', 'fr')).toBe(123.45);
  expect(parseNegotiationSavings('-0,01', 'fr')).toBe(-0.01);
  expect(parseNegotiationSavings('123,45.67', 'fr')).toBeNull();
  expect(parseNegotiationSavings('1.234,5', 'fr')).toBeNull();
  expect(parseNegotiationSavings('123,456', 'en')).toBeNull();
  expect(parseNegotiationSavings('1,2,3', 'fr')).toBeNull();
});
it('shows rounded saved values with a French decimal separator', () => {
  vi.stubGlobal('localStorage', { getItem: () => 'fr' });
  const html = renderToStaticMarkup(<LanguageProvider><NegotiationSavingsInput value={123.456} label="Économies" onCommit={() => {}}/></LanguageProvider>);
  expect(html).toContain('value="123,46"');
});
