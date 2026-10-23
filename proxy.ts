import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';
import {isLocale, languageCookie, routing} from './i18n/routing';

const handle = createMiddleware(routing);
export default function proxy(request: NextRequest) {
  const preference = request.cookies.get(languageCookie)?.value;
  if (isLocale(preference)) {
    // A URL language still takes precedence. Only an explicitly saved preference
    // overrides browser detection on links that do not include a language.
    const headers = new Headers(request.headers);
    headers.set('accept-language', preference);
    return handle(new NextRequest(request, {headers}));
  }
  return handle(request);
}
export const config = {matcher: ['/((?!api|_next|.*\\..*).*)']};
