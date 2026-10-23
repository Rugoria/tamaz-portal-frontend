import type { ReactNode } from "react";
import {LanguageSelector} from '@/components/LanguageSelector';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 pb-16 pt-12 sm:pt-[72px]">
      <LanguageSelector/>
      <div className="text-[32px] font-semibold tracking-[-.5px] sm:text-4xl">tamaz</div>
      {children}
    </main>
  );
}
