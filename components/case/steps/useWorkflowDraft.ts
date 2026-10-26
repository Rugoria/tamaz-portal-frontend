"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { WorkflowDeliveryDto, WorkflowDraftDto, WorkflowPaymentDto, WorkflowPlanDto } from "@/lib/types";

export const EMPTY_PLAN: WorkflowPlanDto = { text: "", classes: {}, extraction: [], widths: {}, aligners: "BOTH_PASSIVE", trimming: "STANDARD" };
export const EMPTY_DELIVERY: WorkflowDeliveryDto = { bondingDay: null, bondingMonth: null, notes: "" };
export const EMPTY_PAYMENT: WorkflowPaymentDto = { payer: null, means: null };
const NOTHING: WorkflowDraftDto = { plan: null, delivery: null, payment: null, forwardTo: null };

export type SaveState = "idle" | "saving" | "saved" | "failed";

export const PLAN_MIN = 10;
export const planDone = (d: WorkflowDraftDto) => (d.plan?.text.trim().length ?? 0) >= PLAN_MIN;
export const paymentDone = (d: WorkflowDraftDto) => !!d.payment?.payer && !!d.payment?.means;

/**
 * The answers on steps 2 to 4 (treatment plan, delivery, payment). They are saved on the server a moment after each change,
 * so the page remembers them; the status line says Saving, Saved, or that saving failed (with a retry).
 */
export function useWorkflowDraft(caseId: string, editable: boolean) {
  const loaded = useApi<WorkflowDraftDto>(`/cases/${caseId}/workflow-draft`, { revalidateOnFocus: false, revalidateIfStale: false });
  // Until the person changes something, what the server sent is what is shown.
  const [local, setLocal] = useState<WorkflowDraftDto | null>(null);
  const draft = local ?? loaded.data ?? NOTHING;
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<WorkflowDraftDto>(draft);
  const dirty = useRef(false);

  useEffect(() => {
    latest.current = draft;
  });

  const save = useCallback(async () => {
    if (!editable || !dirty.current) return true;
    setState("saving");
    try {
      await api<WorkflowDraftDto>(`/cases/${caseId}/workflow-draft`, { method: "PUT", body: latest.current });
      dirty.current = false;
      setState("saved");
      return true;
    } catch {
      setState("failed");
      return false;
    }
  }, [caseId, editable]);

  const update = useCallback(
    (patch: Partial<WorkflowDraftDto>) => {
      if (!editable) return;
      const next = { ...latest.current, ...patch };
      latest.current = next;
      dirty.current = true;
      setLocal(next);
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 700);
    },
    [editable, save],
  );

  /** Saves right now (used when moving to the next step) and says whether it worked. */
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    return save();
  }, [save]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { draft, ready: !!loaded.data || !!loaded.error, loadError: !!loaded.error, reload: loaded.reload, state, update, flush };
}
