"use client";

import { useCallback, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { CaseFileDto, UploadUrlDto } from "@/lib/types";

export type Kind = "STL" | "PHOTO";

/** The state of one required record while a file is going up: nothing is shown for a record that is idle. */
export type UploadState = { status: "uploading"; name: string; progress: number } | { status: "failed"; name: string; error: string };

async function sha256(file: File): Promise<string | undefined> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return undefined; // the checksum is optional
  }
}

/** PUT the file straight to storage with progress. The file never passes through the backend. */
function putWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage answered ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("The upload could not reach storage."));
    xhr.send(file);
  });
}

function omit(s: Record<string, UploadState>, slot: string): Record<string, UploadState> {
  const copy = { ...s };
  delete copy[slot];
  return copy;
}

/** What the browser can check before uploading; the server checks the same rules again. */
export function checkFile(kind: Kind, file: File): string | null {
  const name = file.name.trim().toLowerCase();
  if (kind === "STL") return name.endsWith(".stl") ? null : "Only STL files (.stl) are accepted.";
  const ok = (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")) && (file.type === "image/jpeg" || file.type === "image/png");
  return ok ? null : "Photos must be JPEG or PNG.";
}

/**
 * Uploads records one at a time per slot. `slot` is the required record's id (or the kind when no list is set), so each
 * row on the screen shows its own progress or failure. A record only counts as complete once the server has checked
 * the stored file; "failed" stays on screen until the person tries again.
 */
export function useRecordUpload(caseId: string, onDone: () => void | Promise<unknown>) {
  const [state, setState] = useState<Record<string, UploadState>>({});

  const start = useCallback(
    async (slot: string, kind: Kind, requirementId: string | null, file: File, extra: { arch?: string | null; capturedOn?: string | null } = {}) => {
      const bad = checkFile(kind, file);
      if (bad) {
        setState((s) => ({ ...s, [slot]: { status: "failed", name: file.name, error: bad } }));
        return false;
      }
      setState((s) => ({ ...s, [slot]: { status: "uploading", name: file.name, progress: 0 } }));
      const contentType = file.type || (kind === "STL" ? "model/stl" : "image/jpeg");
      try {
        const target = await api<UploadUrlDto>(`/cases/${caseId}/files/upload-url`, { method: "POST", body: { originalFilename: file.name, contentType, fileType: kind } });
        await putWithProgress(target.uploadUrl, file, contentType, (p) => setState((s) => ({ ...s, [slot]: { status: "uploading", name: file.name, progress: p } })));
        await api<CaseFileDto>(`/cases/${caseId}/files`, {
          method: "POST",
          body: { storageKey: target.storageKey, originalFilename: file.name, contentType, fileType: kind, sizeBytes: file.size, checksum: await sha256(file), requirementId, arch: extra.arch ?? null, capturedOn: extra.capturedOn || null },
        });
        setState((s) => omit(s, slot));
        await onDone();
        return true;
      } catch (e) {
        setState((s) => ({ ...s, [slot]: { status: "failed", name: file.name, error: e instanceof ApiError ? e.message : "The upload didn't finish. Try again." } }));
        return false;
      }
    },
    [caseId, onDone],
  );

  /** Several files one after the other into the same slot; stops at the first failure so its message stays on screen. */
  const startMany = useCallback(
    async (slot: string, kind: Kind, requirementId: string | null, files: File[], extra: { arch?: string | null; capturedOn?: string | null } = {}) => {
      for (const f of files) {
        const bad = checkFile(kind, f);
        if (bad) return setState((s) => ({ ...s, [slot]: { status: "failed", name: f.name, error: bad } }));
      }
      for (const f of files) {
        const ok = await start(slot, kind, requirementId, f, extra);
        if (ok === false) return;
      }
    },
    [start],
  );

  const clear = useCallback((slot: string) => setState((s) => omit(s, slot)), []);

  return { state, start, startMany, clear };
}
