"use client";

import {useT} from "@/i18n/client";

import Link from "@/i18n/navigation";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink font-semibold hover:brightness-95 disabled:bg-surface-2 disabled:text-muted",
  secondary: "border border-ink bg-surface text-ink hover:bg-surface-2 disabled:border-line disabled:text-muted",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  danger: "border border-red bg-surface text-red hover:bg-red-soft",
  link: "bg-transparent text-accent hover:text-ink px-1",
};

export function buttonClass(variant: Variant = "secondary", size: "md" | "lg" | "sm" = "md", extra = ""): string {
  const h = size === "lg" ? "h-12 px-5 text-[15px]" : size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-[18px]";
  return `${BASE} ${VARIANT[variant]} ${variant === "link" ? "min-h-11" : h} ${extra}`.trim();
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  loading?: boolean;
}

export function Button({ variant = "secondary", size = "md", loading, className = "", disabled, children, ...rest }: Props) {
  const translate = useT();
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? translate("Please wait") : children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, `no-underline ${className}`)}>
      {children}
    </Link>
  );
}
