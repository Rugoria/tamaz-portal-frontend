import {getRequestConfig} from 'next-intl/server';
import {isLocale} from './routing';
import en from '../messages/en.json';
import ar from '../messages/ar.json';
import fr from '../messages/fr.json';
import es from '../messages/es.json';

const catalog = {en, ar, fr, es};
export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : 'en';
  return {locale, messages: {ui: {...en, ...catalog[locale]}}};
});
