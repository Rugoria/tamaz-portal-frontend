"use client";

import { useCallback, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { useLocalizedFormats } from "@/i18n/formats";
import { api, ApiError } from "@/lib/api";
import { fileSize } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { CaseFileDto, DownloadUrlDto, PreviewUrlDto, ReadinessDto, RecordItemDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/states";
import { GalleryDialog } from "@/components/case/GalleryDialog";
import { ScanUploadDialog } from "@/components/case/ScanUploadDialog";
import { StlViewerDialog } from "@/components/case/StlViewer";
import { useRecordUpload, type UploadState } from "@/components/case/recordUpload";
import { SlotArt } from "@/components/case/steps/slotArt";
import { StlThumb } from "@/components/case/steps/StlThumb";

const today = () => new Date().toISOString().slice(0, 10);
const DAY = 24 * 3600 * 1000;

/** Files the person has already opened. A file is marked NEW until then (only for a day after it was added). */
function useSeen(caseId: string) {
  const key = `tz.seen.${caseId}`;
  const [seen, setSeen] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      return new Set<string>(); // storage can be blocked: everything just stays NEW
    }
  });
  const mark = useCallback((id: string) => {
    setSeen((s) => {
      if (s.has(id)) return s;
      const n = new Set(s).add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...n]));
      } catch {
        /* ignore */
      }
      return n;
    });
  }, [key]);
  const isNew = (f: CaseFileDto) => !seen.has(f.id) && Date.now() - Date.parse(f.createdAt) < DAY;
  return { isNew, mark };
}

/**
 * Step 1: the records. 3D models as cards (a picture of the scan, its jaw and date), photos as named slots. Which records are
 * required comes from the server; optional slots never block sending. Everything here is read-only while the case is with Tamaz.
 */
export function RecordsStep({ caseId, files, filesError, readiness, editable, onChanged, onRetry }: {
  caseId: string;
  files: CaseFileDto[] | undefined;
  filesError: boolean;
  readiness: ReadinessDto | undefined;
  editable: boolean;
  onChanged: () => void | Promise<unknown>;
  onRetry: () => void;
}) {
  const t = useT();
  const { state, start, startMany, clear } = useRecordUpload(caseId, onChanged);
  const { isNew, mark } = useSeen(caseId);
  const [message, setMessage] = useState<string | null>(null);
  const [scanFor, setScanFor] = useState<{ requirementId: string | null; label: string } | null>(null);
  const [galleryFor, setGalleryFor] = useState<string | null | undefined>(undefined);
  const [viewing, setViewing] = useState<CaseFileDto | null>(null);
  const [preview, setPreview] = useState<{ file: CaseFileDto; item: RecordItemDto | null } | null>(null);
  const [date, setDate] = useState(today());

  const photoCount = (files ?? []).filter((f) => f.fileType === "PHOTO").length;
  const previews = useApi<PreviewUrlDto[]>(photoCount > 0 ? `/cases/${caseId}/files/previews?n=${photoCount}` : null);
  const pictureOf = (id: string) => previews.data?.find((p) => p.fileId === id)?.url;

  const listed = !!readiness && !readiness.fallbackRule;
  const items = readiness?.items ?? [];
  const modelItems = items.filter((i) => i.kind === "STL");
  const photoItems = items.filter((i) => i.kind === "PHOTO");
  const slotOf = (i: RecordItemDto) => i.requirementId ?? i.kind;
  const filesOf = (i: RecordItemDto) => (files ?? []).filter((f) => (i.requirementId ? f.requirementId === i.requirementId : f.fileType === i.kind && !f.requirementId));
  const listedIds = new Set(items.map((i) => i.requirementId).filter(Boolean));
  const stray = (kind: "STL" | "PHOTO") => (files ?? []).filter((f) => f.fileType === kind && (!f.requirementId || !listedIds.has(f.requirementId)));
  // With no required slot the minimum applies instead: one STL model and one photo, in any slot.
  const minimum = !!readiness?.minimumRule;
  const requiredItems = minimum ? [{ done: (files ?? []).some((f) => f.fileType === "STL") }, { done: (files ?? []).some((f) => f.fileType === "PHOTO") }] : items.filter((i) => i.required).map((i) => ({ done: i.fileCount > 0 }));
  const doneCount = requiredItems.filter((i) => i.done).length;
  const failedSlots = Object.entries(state).filter(([, s]) => s.status === "failed");
  const uploading = Object.entries(state).filter(([, s]) => s.status === "uploading");

  async function download(f: CaseFileDto) {
    setMessage(null);
    try {
      const { downloadUrl } = await api<DownloadUrlDto>(`/cases/${caseId}/files/${f.id}/download-url`);
      window.open(downloadUrl, "_blank", "noopener");
    } catch {
      setMessage("We couldn't prepare that download. Try again.");
    }
  }

  async function remove(f: CaseFileDto) {
    setMessage(null);
    try {
      await api(`/cases/${caseId}/files/${f.id}`, { method: "DELETE" });
      await onChanged();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "We couldn't remove that file. Try again.");
    }
  }

  const block = "flex flex-col gap-4 rounded-xl border border-line bg-surface p-5";

  return (
    <div className="flex flex-col gap-4">
      {filesError && <ErrorState title={t("We couldn't load the files.")} onRetry={onRetry} />}
      {message && <div role="alert" className="rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm text-red">{t(message)}</div>}

      {!readiness && !filesError && <div className="tz-pulse h-32 rounded-xl border border-line bg-surface" aria-busy="true" aria-label={t("Loading")} />}

      {readiness && (
        <>
          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{t("{a} of {b} required records done", { a: doneCount, b: requiredItems.length })}</span>
              {!editable && <span className="text-sm text-muted">{t("Records can't be changed while the case is with Tamaz.")}</span>}
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={requiredItems.length} aria-valuenow={doneCount} aria-label={t("Required records done")} className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${requiredItems.length ? (doneCount / requiredItems.length) * 100 : 0}%`, background: doneCount === requiredItems.length ? "#1B7A3E" : "#1D6FE8", transition: "width .2s" }} />
            </div>
            {/* Spoken for people using a screen reader, while pictures and bars carry the same news on screen. */}
            <div className="sr-only" aria-live="polite">
              {uploading.map(([, s]) => `${(s as Extract<UploadState, { status: "uploading" }>).name} ${(s as Extract<UploadState, { status: "uploading" }>).progress}%`).join(", ")}
            </div>
          </section>

          {failedSlots.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-line bg-red-soft px-4 py-3 text-sm text-red">
              <span>{failedSlots.map(([, s]) => `${s.name}: ${t((s as Extract<UploadState, { status: "failed" }>).error)}`).join(" · ")}</span>
              <button onClick={() => failedSlots.forEach(([k]) => clear(k))} className="min-h-9 font-medium underline">{t("Dismiss")}</button>
            </div>
          )}

          {/* ---- 3D models ---- */}
          <section className={block} aria-label={t("3D models")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 text-[17px] font-semibold">{t("3D models")}</h3>
              {editable && !listed && !(files ?? []).some((f) => f.fileType === "STL") && <Button variant="primary" onClick={() => setScanFor({ requirementId: null, label: "3D model (STL)" })}>{t("Add a 3D model")}</Button>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent bg-accent-soft px-4 font-medium text-accent-deep">{t("Digital model")}<span className="text-[13px] font-normal">{t("Upload STL files")}</span></span>
              <span className="text-sm text-muted">{t("or")}</span>
              <span aria-disabled="true" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-line px-4 text-muted">{t("Impressions (physical)")}<span className="rounded bg-pending-bg px-1.5 py-0.5 text-[11px] text-pending-ink">{t("Pending client decision")}</span></span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {modelItems.map((item) => {
                const mine = filesOf(item);
                if (mine.length === 0) {
                  const slot = slotOf(item);
                  const up = state[slot];
                  return (
                    <div key={slot} className="flex flex-col gap-2 rounded-xl border border-dashed p-4" style={{ borderColor: up?.status === "failed" ? "#B3261E" : "#A9BBD0" }}>
                      <div className="flex items-center justify-between gap-2"><b>{t(listed ? item.label : "3D models")}</b>{item.required && <Chip label="Required" tone="aqua" />}</div>
                      <div className="text-sm text-muted">{t("No model yet")}</div>
                      {editable && listed && <div><Button onClick={() => setScanFor({ requirementId: item.requirementId, label: item.label })}>{t("Upload")}</Button></div>}
                    </div>
                  );
                }
                return mine.map((f) => <ModelCard key={f.id} caseId={caseId} f={f} label={listed ? item.label : undefined} isNew={isNew(f)} editable={editable} onView={(x) => { mark(x.id); setViewing(x); }} onDownload={download} onRemove={remove} />);
              })}
              {listed && stray("STL").map((f) => <ModelCard key={f.id} caseId={caseId} f={f} label={t("Other 3D model")} isNew={isNew(f)} editable={editable} onView={(x) => { mark(x.id); setViewing(x); }} onDownload={download} onRemove={remove} />)}
            </div>
          </section>

          {/* ---- Photos ---- */}
          <section className={block} aria-label={t("Photos")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 text-[17px] font-semibold">{t("Photos")}</h3>
              {editable && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[13px] text-muted">
                    {t("Taken on")}
                    <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="!h-9 w-[150px]" aria-label={t("Date the photo was taken")} />
                  </label>
                  <Button onClick={() => setGalleryFor(null)}>{t("Add from this patient's photos")}</Button>
                </div>
              )}
            </div>
            <div className="text-[13px] text-muted">{t("JPEG or PNG. Each photo has a “Taken on” date, today by default.")}</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
              {listed && photoItems.map((item) => {
                const f = filesOf(item)[0];
                return (
                  <PhotoTile key={slotOf(item)} label={item.label} required={item.required} file={f} picture={f ? pictureOf(f.id) : undefined} upload={state[slotOf(item)]} editable={editable} isNew={f ? isNew(f) : false}
                    onPick={(list) => startMany(slotOf(item), "PHOTO", item.requirementId, list.slice(0, 1), { capturedOn: date })}
                    onOpen={() => { if (f) { mark(f.id); setPreview({ file: f, item }); } }} />
                );
              })}
              {(listed ? stray("PHOTO") : (files ?? []).filter((f) => f.fileType === "PHOTO")).map((f) => (
                <PhotoTile key={f.id} label={f.originalFilename} required={false} file={f} picture={pictureOf(f.id)} upload={undefined} editable={editable} isNew={isNew(f)} onPick={() => {}} onOpen={() => { mark(f.id); setPreview({ file: f, item: null }); }} plain />
              ))}
              {editable && (
                <AddPhotosTile label={listed ? "More photos" : "Add photos"} upload={state["extra"]} onPick={(list) => startMany("extra", "PHOTO", null, list, { capturedOn: date })} />
              )}
            </div>
            {!listed && photoCount === 0 && <div className="rounded-lg border border-dashed border-[#A9BBD0] p-3.5 text-sm text-muted">{t("No photos yet.")}</div>}
          </section>
        </>
      )}

      {scanFor && <ScanUploadDialog caseId={caseId} requirementId={scanFor.requirementId} label={scanFor.label} onClose={() => setScanFor(null)} onUploaded={onChanged} />}
      {galleryFor !== undefined && <GalleryDialog caseId={caseId} requirementId={galleryFor} onClose={() => setGalleryFor(undefined)} onAdded={onChanged} />}
      {viewing && <StlViewerDialog caseId={caseId} file={viewing} onClose={() => setViewing(null)} />}
      {preview && (
        <PhotoPreview
          file={preview.file}
          label={preview.item?.label ?? preview.file.originalFilename}
          picture={pictureOf(preview.file.id)}
          editable={editable}
          onClose={() => setPreview(null)}
          onDownload={() => download(preview.file)}
          onDelete={async () => { await remove(preview.file); setPreview(null); }}
          onReplace={async (file) => {
            const slot = preview.item ? slotOf(preview.item) : "extra";
            const ok = await start(slot, "PHOTO", preview.item?.requirementId ?? null, file, { capturedOn: date });
            if (ok) await remove(preview.file);
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}

function ModelCard({ caseId, f, label, isNew, editable, onView, onDownload, onRemove }: { caseId: string; f: CaseFileDto; label?: string; isNew: boolean; editable: boolean; onView: (f: CaseFileDto) => void; onDownload: (f: CaseFileDto) => void; onRemove: (f: CaseFileDto) => void }) {
  const t = useT();
  const { dateOnly } = useLocalizedFormats();
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="relative">
        <StlThumb caseId={caseId} fileId={f.id} sizeBytes={f.sizeBytes} label={f.originalFilename} />
        {isNew && <span className="absolute start-2.5 top-2.5 rounded bg-deep-aqua px-2 py-0.5 text-[11px] font-semibold tracking-[.6px] text-deep">{t("NEW")}</span>}
      </div>
      <div className="flex flex-col gap-1 p-3.5">
        <b>{label ?? (f.arch === "UPPER" ? t("Upper jaw") : f.arch === "LOWER" ? t("Lower jaw") : t("3D model"))}</b>
        {label && f.arch && <span className="text-[13px] text-muted">{t(f.arch === "UPPER" ? "Upper jaw" : "Lower jaw")}</span>}
        <span className="break-all font-mono text-[13px]">{f.originalFilename}</span>
        <span className="text-[13px] text-muted">{fileSize(f.sizeBytes)} · {dateOnly(f.capturedOn ?? f.createdAt)}</span>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
          <button onClick={() => onView(f)} className="min-h-9 text-[14px] font-medium text-accent">{t("View in 3D")}</button>
          <button onClick={() => onDownload(f)} className="min-h-9 text-[14px] font-medium text-accent">{t("Download")}</button>
          {editable && <button onClick={() => onRemove(f)} className="min-h-9 text-[14px] font-medium text-red">{t("Remove")}</button>}
        </div>
      </div>
    </div>
  );
}

/** One named photo slot: empty (a drawing and Upload), uploading, filled (the picture), or failed. A file can be chosen or dropped on it. */
function PhotoTile({ label, required, file, picture, upload, editable, isNew, onPick, onOpen, plain }: {
  label: string; required: boolean; file: CaseFileDto | undefined; picture: string | undefined; upload: UploadState | undefined; editable: boolean; isNew: boolean;
  onPick: (files: File[]) => void; onOpen: () => void; plain?: boolean;
}) {
  const t = useT();
  const { dateOnly } = useLocalizedFormats();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const uploading = upload?.status === "uploading";
  const failed = upload?.status === "failed";
  const filled = !!file && !uploading;
  const open = () => (filled ? onOpen() : editable && !uploading && input.current?.click());

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-surface" style={{ borderColor: failed ? "#B3261E" : drag ? "#1D6FE8" : "#D3DFEC" }}
      onDragOver={editable && !filled ? (e) => { e.preventDefault(); setDrag(true); } : undefined} onDragLeave={() => setDrag(false)}
      onDrop={editable && !filled ? (e) => { e.preventDefault(); setDrag(false); const list = Array.from(e.dataTransfer.files); if (list.length) onPick(list); } : undefined}>
      <button type="button" onClick={open} disabled={!filled && (!editable || uploading)} aria-label={filled ? `${label}: ${t("Open")}` : `${label}: ${t("Upload")}`}
        className="relative flex h-[104px] items-center justify-center overflow-hidden disabled:cursor-default" style={{ background: failed ? "#FCE8E6" : filled ? "#BFCFE2" : "#EEF3F9" }}>
        {filled && picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picture} alt={label} className="h-full w-full object-cover" />
        ) : filled ? (
          <div className="tz-pulse h-full w-full bg-surface-2" />
        ) : (
          <SlotArt label={label} stroke={failed ? "#B3261E" : "#7E93AE"} size={76} />
        )}
        {isNew && filled && <span className="absolute start-2 top-2 rounded bg-ink px-2 py-0.5 text-[11px] font-semibold tracking-[.6px] text-white">{t("NEW")}</span>}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
            <b>{upload.progress}%</b>
            <div role="progressbar" aria-valuenow={upload.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("Upload progress")} className="h-1.5 w-[70%] rounded bg-[#C9D6E6]"><div className="h-1.5 rounded bg-accent" style={{ width: `${upload.progress}%` }} /></div>
          </div>
        )}
        {failed && <span className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red font-semibold text-white" aria-hidden="true">!</span>}
      </button>
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <b className="min-w-0 truncate text-sm" title={label}>{plain ? t("Photo") : t(label)}</b>
          {required && <span className="rounded-full bg-aqua-soft px-2 text-xs font-semibold text-aqua-deep">{t("Required")}</span>}
        </div>
        {filled ? (
          <span className="truncate text-xs text-muted" title={file.originalFilename}>{t("Taken")} {dateOnly(file.capturedOn ?? file.createdAt)} · {file.originalFilename}</span>
        ) : failed ? (
          <span className="text-[13px] font-medium text-red">{t("Upload failed. Retry")} <span className="font-normal">· {t(upload.error)}</span></span>
        ) : uploading ? (
          <span className="text-[13px] text-muted">{t("Uploading {n}%", { n: upload.progress })}</span>
        ) : editable ? (
          <button type="button" onClick={() => input.current?.click()} className="min-h-9 self-start text-[13px] font-medium text-accent-deep">{t("Upload")}</button>
        ) : (
          <span className="text-[13px] text-muted">{t("Not provided")}</span>
        )}
      </div>
      <input ref={input} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label={`${t("Choose a photo")}: ${label}`}
        onChange={(e) => { const list = Array.from(e.target.files ?? []); e.target.value = ""; if (list.length) onPick(list); }} />
    </div>
  );
}

function AddPhotosTile({ label, upload, onPick }: { label: string; upload: UploadState | undefined; onPick: (files: File[]) => void }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const uploading = upload?.status === "uploading";
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#A9BBD0] bg-bg p-3 text-center"
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const list = Array.from(e.dataTransfer.files); if (list.length) onPick(list); }}>
      <span className="text-sm font-medium">{uploading ? t("Uploading {n}%", { n: upload.progress }) : t(label)}</span>
      <Button onClick={() => input.current?.click()} disabled={uploading}>{t("Select photos")}</Button>
      <input ref={input} type="file" multiple accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label={t("Choose photos")}
        onChange={(e) => { const list = Array.from(e.target.files ?? []); e.target.value = ""; if (list.length) onPick(list); }} />
    </div>
  );
}

function PhotoPreview({ file, label, picture, editable, onClose, onDownload, onDelete, onReplace }: { file: CaseFileDto; label: string; picture: string | undefined; editable: boolean; onClose: () => void; onDownload: () => void; onDelete: () => void | Promise<void>; onReplace: (f: File) => void | Promise<void> }) {
  const t = useT();
  const { dateOnly } = useLocalizedFormats();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={t(label)} onClose={onClose} width={720}>
      <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-xl bg-[#EEF3F9]">
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picture} alt={label} className="max-h-[60vh] w-auto max-w-full object-contain" />
        ) : (
          <div className="tz-pulse h-64 w-full" />
        )}
      </div>
      <div className="text-sm text-muted">{t("Taken")} {dateOnly(file.capturedOn ?? file.createdAt)} · {file.originalFilename} · {fileSize(file.sizeBytes)}</div>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>{t("Close")}</Button>
        <Button onClick={onDownload}>{t("Download")}</Button>
        {editable && (
          <>
            <Button onClick={() => input.current?.click()} disabled={busy}>{t("Replace")}</Button>
            <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); await onDelete(); }}>{t("Delete")}</Button>
            <input ref={input} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label={t("Choose a photo")}
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { setBusy(true); await onReplace(f); } }} />
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
