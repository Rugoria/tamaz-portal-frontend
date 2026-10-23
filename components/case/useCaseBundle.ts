"use client";

import { useApi } from "@/lib/hooks";
import { pollMs, useRealtimeLive } from "@/lib/realtime";
import type { CaseDto, CaseFileDto, ReadinessDto, CommentDto, DesignReviewDto, StatusHistoryDto, TransferJobDto } from "@/lib/types";

/** Everything the staff case page shows, each piece loading on its own. */
export function useCaseBundle(id: string) {
  // While a case is being delivered the background sender moves it along within seconds. The live stream announces each step; without
  // it, look again every 3 seconds (every 10 while the stream is open, as a safety net).
  const streaming = useRealtimeLive();
  const queuedMs = pollMs(3000, streaming, 10000);
  const c = useApi<CaseDto>(`/cases/${id}`, { refreshInterval: (latest) => (latest?.status === "SUBMISSION_QUEUED" ? queuedMs : 0) });
  const live = c.data?.status === "SUBMISSION_QUEUED" ? { refreshInterval: queuedMs } : undefined;
  const files = useApi<CaseFileDto[]>(`/cases/${id}/files`);
  const readiness = useApi<ReadinessDto>(`/cases/${id}/files/readiness`);
  const comments = useApi<CommentDto[]>(`/cases/${id}/comments`);
  const reviews = useApi<DesignReviewDto[]>(`/cases/${id}/design-reviews`, live);
  const jobs = useApi<TransferJobDto[]>(`/cases/${id}/transfer-jobs`, live);
  const history = useApi<StatusHistoryDto[]>(`/cases/${id}/status-history`, live);

  async function reloadAll() {
    await Promise.all([c.reload(), files.reload(), readiness.reload(), comments.reload(), reviews.reload(), jobs.reload(), history.reload()]);
  }

  return { c, files, readiness, comments, reviews, jobs, history, reloadAll };
}
