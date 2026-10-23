'use client';
import {useLocale} from 'next-intl';
import {createContext, useContext, useId, useState, type ReactNode} from 'react';
import {useT} from '@/i18n/client';
import {isLocale, locales} from '@/i18n/routing';

const names = {en: 'English (US)', ar: 'العربية', fr: 'Français', es: 'Español'};
const PreferenceContext = createContext(false);
export function LanguagePreferenceProvider({remembered, children}: {remembered: boolean; children: ReactNode}) {
  return <PreferenceContext.Provider value={remembered}>{children}</PreferenceContext.Provider>;
}
export function LanguageSelector() {
  const remembered = useContext(PreferenceContext);
  const current = useLocale();
  const translate = useT();
  const id = useId();
  const [locale, setLocale] = useState(current);
  const [remember, setRemember] = useState(remembered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function updatePreference(nextLocale: string, nextRemember: boolean) {
    const previousRemember = remember;
    setLocale(nextLocale); setRemember(nextRemember); setBusy(true); setError(false);
    try {
      const response = await fetch('/api/preferences/language', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({locale: nextLocale, remember: nextRemember})});
      if (!response.ok) throw new Error();
      if (nextLocale === current) { setBusy(false); return; }
      const url = new URL(window.location.href);
      const segments = url.pathname.split('/');
      if (isLocale(segments[1])) segments[1] = nextLocale; else segments.splice(1, 0, nextLocale);
      url.pathname = segments.join('/');
      // Reload so server-rendered text, direction and the client all use one locale.
      window.location.assign(url.href);
    } catch { setLocale(current); setRemember(previousRemember); setError(true); setBusy(false); }
  }
  return <div aria-busy={busy} className="mb-3 ms-auto w-fit max-w-full text-xs">
    <div className="flex items-center justify-end gap-2">
      <span aria-hidden="true" className="text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
      </span>
      <label htmlFor={id} className="sr-only">{translate('Language')}</label>
      <div className="relative w-[132px] shrink-0">
        <select id={id} value={locale} onChange={event => void updatePreference(event.target.value, remember)} disabled={busy} className="h-8 w-full cursor-pointer appearance-none rounded-md border border-line bg-surface ps-2.5 pe-7 text-start text-xs text-ink hover:border-accent focus-visible:border-accent disabled:cursor-wait disabled:opacity-60">
          {locales.map(code => <option key={code} value={code} lang={code}>{names[code]}</option>)}
        </select>
        <svg aria-hidden="true" className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
    <label className={`mt-1 flex min-h-6 items-center justify-end gap-1.5 text-[11px] leading-4 text-muted ${busy ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" className="size-3.5 shrink-0 cursor-pointer accent-accent" checked={remember} onChange={event => void updatePreference(locale, event.target.checked)} disabled={busy}/>
      <span>{translate('Remember my language on this device')}</span>
    </label>
    {busy && <span role="status" className="mt-2 block text-xs text-muted">{translate('Applying…')}</span>}
    {error && <span role="alert" className="mt-2 block text-xs leading-5 text-red">{translate('Could not change language. Please try again.')}</span>}
  </div>;
}
