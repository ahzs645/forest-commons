import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('./maps/LazyMap', () => ({ default: () => null }));
import { ClassroomCampaignStatus } from './Classroom';
import { LanguageProvider } from './i18n';
afterEach(() => vi.unstubAllGlobals());
it('replaces reset readiness with an explicit localized completion message', () => {
  for (const language of ['en', 'fr']) {
    vi.stubGlobal('localStorage', { getItem: () => language });
    const ready = { purchase: false, production: false, transport: false };
    const render = (complete: boolean) => renderToStaticMarkup(<LanguageProvider><ClassroomCampaignStatus complete={complete} ready={ready} /></LanguageProvider>);
    const active = render(false), complete = render(true);
    expect(active).toContain(language === 'en' ? 'Planning' : 'Planification');
    expect(active).not.toContain('role="status"');
    expect(complete).toContain('role="status"');
    expect(complete).toContain(language === 'en' ? 'Campaign complete.' : 'Campagne terminée.');
    expect(complete).not.toContain(language === 'en' ? 'Planning' : 'Planification');
  }
});
