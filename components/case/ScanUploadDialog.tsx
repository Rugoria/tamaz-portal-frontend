"use client";

import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { api, ApiError } from "@/lib/api";
import { fileSize } from "@/lib/format";
import type { CaseFileDto, UploadUrlDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";

type Arch = "UPPER" | "LOWER" | "";
interface Row {
  id: number;
  file: File;
  arch: Arch;
  progress: number;
  state: "waiting" | "uploading" | "done" | "failed";
  error?: string;
}

/** A guess from the file name (or the slot's name), which the person can change. */
function guessArch(name: string): Arch {
  const n = name.toLowerCase();
  if (/(upper|maxil|top)/.test(n)) return "UPPER";
  if (/(lower|mandib|bottom)/.test(n)) return "LOWER";
  return "";
}

function put(url: string, file: File, contentType: string, onProgress: (p: number) => void): Promise<void> {
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

/**
 * Add one STL scan: choose or drop the file, say which jaw it is of, set the day the scan was made, and upload.
 * The file shows its own progress, and if it fails it can be tried again.
 */
export function ScanUploadDialog({ caseId, requirementId, label, onClose, onUploaded }: { caseId: string; requirementId: string | null; label: string; onClose: () => void; onUploaded: () => void | Promise<unknown> }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const next = useRef(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  // One STL per upload: choosing or dropping another file replaces the one chosen, so a slot never ends up with two.
  function add(list: FileList | File[]) {
    setMessage(null);
    const f = Array.from(list)[0];
    if (!f) return;
    if (!f.name.trim().toLowerCase().endsWith(".stl")) {
      setMessage("Only STL files (.stl) are accepted.");
      return;
    }
    setRows([{ id: next.current++, file: f, arch: guessArch(f.name) || guessArch(label), progress: 0, state: "waiting" }]);
  }

  const patch = (id: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));

  async function upload() {
    setBusy(true);
    setMessage(null);
    let anyFailed = false;
    for (const row of rows.filter((r) => r.state === "waiting" || r.state === "failed")) {
      patch(row.id, { state: "uploading", progress: 0, error: undefined });
      try {
        const contentType = row.file.type || "model/stl";
        const target = await api<UploadUrlDto>(`/cases/${caseId}/files/upload-url`, { method: "POST", body: { originalFilename: row.file.name, contentType, fileType: "STL" } });
        await put(target.uploadUrl, row.file, contentType, (p) => patch(row.id, { progress: p }));
        await api<CaseFileDto>(`/cases/${caseId}/files`, {
          method: "POST",
          body: { storageKey: target.storageKey, originalFilename: row.file.name, contentType, fileType: "STL", sizeBytes: row.file.size, requirementId, arch: row.arch || null, capturedOn: date || null },
        });
        patch(row.id, { state: "done", progress: 100 });
      } catch (e) {
        anyFailed = true;
        patch(row.id, { state: "failed", error: e instanceof ApiError ? e.message : "The upload didn't finish. Try again." });
      }
    }
    setBusy(false);
    await onUploaded();
    if (!anyFailed) onClose();
  }

  const waiting = rows.filter((r) => r.state === "waiting" || r.state === "failed").length;

  return (
    <Dialog title={t("Add a 3D model")} onClose={busy ? () => {} : onClose} width={680}>
      <div className="text-sm text-muted">{t(label)}</div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center ${drag ? "border-accent bg-accent-soft" : "border-[#A9BBD0] bg-bg"}`}
      >
        <div className="font-medium">{t("Drop an STL file here, or")}</div>
        <Button onClick={() => input.current?.click()} disabled={busy}>{t("Select a file")}</Button>
        <input ref={input} type="file" accept=".stl" className="sr-only" tabIndex={-1} aria-label={t("Choose an STL file")} onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-line px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="break-all text-sm font-medium">{r.file.name}</div>
                  <div className="text-xs text-muted">{fileSize(r.file.size)}</div>
                </div>
                <select value={r.arch} disabled={busy || r.state === "done"} onChange={(e) => patch(r.id, { arch: e.target.value as Arch })} aria-label={t("Which jaw")} className="h-10 rounded-lg border border-line bg-surface px-2 text-sm">
                  <option value="">{t("Jaw not set")}</option>
                  <option value="UPPER">{t("Upper jaw")}</option>
                  <option value="LOWER">{t("Lower jaw")}</option>
                </select>
                {r.state === "done" ? <span className="text-sm font-medium text-aqua-deep">✓ {t("Uploaded")}</span>
                  : <button onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} disabled={busy} aria-label={t("Remove")} className="h-9 w-9 rounded text-muted hover:bg-surface-2 disabled:opacity-40">×</button>}
              </div>
              {(r.state === "uploading" || r.state === "done") && (
                <div role="progressbar" aria-valuenow={r.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("Upload progress")} className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${r.progress}%` }} />
                </div>
              )}
              {r.state === "failed" && <div role="alert" className="text-sm text-red">{t(r.error ?? "The upload didn't finish. Try again.")}</div>}
            </div>
          ))}
        </div>
      )}

      <Field label={t("Date the scan was made")}>
        <Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="max-w-[220px]" />
      </Field>
      {message && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-3 py-2.5 text-sm text-red">{t(message)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">{t("Supported format: STL")}</span>
        <DialogActions>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t("Cancel")}</Button>
          <Button variant="primary" onClick={upload} disabled={waiting === 0} loading={busy} className="px-[22px]">{t("Upload")}</Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
