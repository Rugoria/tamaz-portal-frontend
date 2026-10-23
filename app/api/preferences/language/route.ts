import {NextRequest, NextResponse} from 'next/server';
import {isLocale, languageCookie} from '@/i18n/routing';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({error: 'Invalid origin'}, {status: 403});
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({error: 'Invalid request'}, {status: 400}); }
  if (!body || typeof body !== 'object' || !('locale' in body) || !isLocale(body.locale) || !('remember' in body) || typeof body.remember !== 'boolean') {
    return NextResponse.json({error: 'Invalid preference'}, {status: 400});
  }
  const response = NextResponse.json({ok: true});
  response.cookies.set(languageCookie, body.remember ? body.locale : '', {
    httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: body.remember ? 31536000 : 0,
  });
  return response;
}
