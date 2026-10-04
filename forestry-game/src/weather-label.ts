import type { Language } from './i18n';

const labels: Record<string, [string, string]> = {
  frozen: ['Frozen', 'Gelé'],
  normal: ['Normal', 'Normal'],
  wet: ['Wet', 'Humide'],
  thaw: ['Thaw', 'Dégel'],
};

/** Display label for a weather category ID; unknown IDs are shown unchanged. */
export function weatherLabel(weather: string, language: Language) {
  return labels[weather]?.[language === 'fr' ? 1 : 0] ?? weather;
}
