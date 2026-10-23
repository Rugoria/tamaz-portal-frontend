import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "../globals.css";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {cookies} from 'next/headers';
import {isLocale, languageCookie} from '@/i18n/routing';
import {LanguagePreferenceProvider} from '@/components/LanguageSelector';

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "tamaz",
  description: "tamaz portals for clinics, doctors, patients and the tamaz team",
  robots: {index: false, follow: false},
};

export default async function RootLayout({ children, params }: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const remembered = !!(await cookies()).get(languageCookie)?.value;
  return (
    <html lang={locale === 'en' ? 'en-US' : locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={figtree.variable}>
      <body><NextIntlClientProvider messages={messages}><LanguagePreferenceProvider remembered={remembered}>{children}</LanguagePreferenceProvider></NextIntlClientProvider></body>
    </html>
  );
}
