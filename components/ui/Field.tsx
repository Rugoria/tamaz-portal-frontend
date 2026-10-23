"use client";
import {useT} from "@/i18n/client";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const INPUT =
  "h-11 w-full min-w-0 rounded-lg border bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 disabled:bg-bg disabled:text-muted";

/** A labelled field with optional hint and error text. */
export function Field({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const translate = useT();
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${className}`}>
      {translate(label)}
      {children}
      {error ? (
        <span className="text-[13px] font-normal text-red">{translate(error)}</span>
      ) : hint ? (
        <span className="text-[13px] font-normal text-muted">{translate(hint)}</span>
      ) : null}
    </label>
  );
}

export function Input({ invalid, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`${INPUT} ${invalid ? "border-red" : "border-line"} ${className}`} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({
  invalid,
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={`w-full resize-none rounded-lg border bg-surface px-3 py-2.5 text-[15px] text-ink ${invalid ? "border-red" : "border-line"} ${className}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
