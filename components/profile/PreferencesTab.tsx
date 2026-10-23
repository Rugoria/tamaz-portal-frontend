"use client";

import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { PreferencesDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorState, SkeletonBlock } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { ALIGNER_QUESTIONS, BRACKET_QUESTIONS, HEIGHT_KEY, MAX_EXTRA, type PreferenceQuestion } from "./preferenceQuestions";

/**
 * The Clinical preferences tab: the aligner questions and the bracket questions (each optional, with a Clear link, and a note under each set).
 * One Save keeps everything. Saved on the profile only; nothing here is sent with a case yet.
 */
export function PreferencesTab() {
  const translate = useT();
  const { data, error, loading, reload } = useApi<PreferencesDto>("/me/preferences");
  if (loading) return <SkeletonBlock height={320} />;
  if (error || !data) return <ErrorState title={translate("We couldn't load your preferences.")} onRetry={reload} />;
  return <PreferencesForm initial={data} reload={reload} />;
}

function PreferencesForm({ initial, reload }: { initial: PreferencesDto; reload: () => Promise<unknown> }) {
  const translate = useT();
  const toast = useToast();
  const uid = useId();
  const [answers, setAnswers] = useState<Record<string, string>>(initial.answers ?? {});
  const [extra, setExtra] = useState(initial.extra ?? "");
  const [bracketsExtra, setBracketsExtra] = useState(initial.bracketsExtra ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (key: string, value: string) => setAnswers((a) => ({ ...a, [key]: value }));
  const clear = (key: string) => setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== key && !(key === "bracketPlacement" && k === HEIGHT_KEY))));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("/me/preferences", { method: "PUT", body: { answers, extra: extra.trim(), bracketsExtra: bracketsExtra.trim() } });
      await reload();
      toast(translate("Preferences saved."));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const card = (q: PreferenceQuestion) => {
    const id = `${uid}-${q.key}`;
    const picked = answers[q.key];
    const clearButton = (
      <button
        type="button"
        onClick={() => clear(q.key)}
        className={`h-11 px-2 text-sm font-medium ${picked ? "text-accent-deep" : "text-muted"}`}
        aria-label={`${translate("Clear")}: ${translate(q.title)}`}
      >
        {translate("Clear")}
      </button>
    );
    return (
      <div key={q.key} className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span id={id} className="font-semibold">{translate(q.title)}</span>
          {clearButton}
        </div>
        {q.kind === "select" ? (
          <select
            aria-labelledby={id}
            value={picked ?? ""}
            onChange={(e) => (e.target.value ? pick(q.key, e.target.value) : clear(q.key))}
            className="h-11 w-full max-w-[420px] rounded-lg border border-line bg-surface px-3 text-[15px] text-ink"
          >
            <option value="">{translate("Not chosen")}</option>
            {q.options.map((o) => (
              <option key={o.key} value={o.key}>{translate(o.label)}</option>
            ))}
          </select>
        ) : (
          <div role="radiogroup" aria-labelledby={id} className="flex flex-col">
            {q.options.map((o) => (
              <label key={o.key} className="flex min-h-11 items-start gap-3 py-2.5">
                <input type="radio" name={id} checked={picked === o.key} onChange={() => pick(q.key, o.key)} className="h-5 w-5 flex-none accent-[#1D6FE8]" />
                <span className="leading-snug">{translate(o.label)}</span>
              </label>
            ))}
          </div>
        )}
        {q.askHeightFor && picked === q.askHeightFor && (
          <label className="mt-1 flex max-w-[240px] flex-col gap-1.5 text-sm font-medium">
            {translate("Height in mm")}
            <Input
              dir="ltr"
              inputMode="decimal"
              value={answers[HEIGHT_KEY] ?? ""}
              onChange={(e) => pick(HEIGHT_KEY, e.target.value)}
              className="text-start"
              placeholder="1.5"
            />
          </label>
        )}
      </div>
    );
  };

  const note = (label: string, value: string, set: (v: string) => void) => (
    <label className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-5 py-4">
      <span className="font-semibold">{translate(label)}</span>
      <textarea
        maxLength={MAX_EXTRA}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={translate("Add any other instructions")}
        className="h-[120px] w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] text-ink"
      />
      <span className="text-[13px] text-muted">{translate("{n} of {max} characters", { n: value.length, max: MAX_EXTRA })}</span>
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm text-red">{translate(error)}</div>
      )}
      <h2 className="m-0 text-xl font-semibold">{translate("Clinical preferences for aligners")}</h2>
      {ALIGNER_QUESTIONS.map(card)}
      {note("Additional instructions", extra, setExtra)}

      <h2 className="m-0 mt-4 text-xl font-semibold">{translate("Clinical preferences for brackets")}</h2>
      {BRACKET_QUESTIONS.map(card)}
      {note("Additional instructions", bracketsExtra, setBracketsExtra)}

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} loading={busy} className="px-5">{translate("Save preferences")}</Button>
      </div>
    </div>
  );
}
