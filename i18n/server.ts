import 'server-only';
import {getLocale} from 'next-intl/server';
import {redirect as nextRedirect} from 'next/navigation';
export async function redirect(path: string): Promise<never> {
  const locale = await getLocale();
  nextRedirect(`/${locale}${path === '/' ? '' : path}`);
}
