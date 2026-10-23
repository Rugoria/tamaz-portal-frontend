import type { CaseStatus, PaymentStatus, Role, TransferJobStatus } from "./types";

/** Chip keys used by the design (TzChip). "review" is the design-ready-for-review state, which is pending a client decision. */
export type ChipKey =
  | "draft" | "ready" | "submitting" | "under_review" | "changes" | "approved" | "production" | "shipped"
  | "completed" | "action" | "review" | "queued" | "inprogress" | "succeeded" | "failed" | "active" | "open" | "booked";

export type Tone = "neutral" | "outline" | "blue" | "amber" | "aqua" | "quiet" | "red" | "green";

export const CHIPS: Record<ChipKey, [string, Tone]> = {
  draft: ["Draft", "neutral"],
  ready: ["Ready to submit", "outline"],
  submitting: ["Submitting", "blue"],
  under_review: ["Under review", "blue"],
  changes: ["Changes requested", "amber"],
  approved: ["Design approved", "aqua"],
  production: ["In production", "blue"],
  shipped: ["Shipped", "aqua"],
  completed: ["Completed", "quiet"],
  action: ["Action required", "red"],
  review: ["Design ready for review", "amber"],
  queued: ["Queued", "neutral"],
  inprogress: ["In progress", "blue"],
  succeeded: ["Succeeded", "aqua"],
  failed: ["Failed", "red"],
  active: ["Active", "green"],
  open: ["Open", "aqua"],
  booked: ["Booked", "blue"],
};

export const TONES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: "#E6EBF1", fg: "#3A4A60", bd: "#D3DFEC" },
  outline: { bg: "#FFFFFF", fg: "#1456B8", bd: "#1D6FE8" },
  blue: { bg: "#E3EDFC", fg: "#1456B8", bd: "#E3EDFC" },
  amber: { bg: "#FBF0D6", fg: "#8A5A00", bd: "#F0DDA8" },
  aqua: { bg: "#D6F0F7", fg: "#0B5F78", bd: "#D6F0F7" },
  quiet: { bg: "#EDF4F7", fg: "#3F6B78", bd: "#DCE9EE" },
  red: { bg: "#FCE8E6", fg: "#B3261E", bd: "#F0C4C0" },
  green: { bg: "#DDF3E6", fg: "#1B6B3F", bd: "#DDF3E6" },
};

export const CASE_CHIP: Record<CaseStatus, ChipKey> = {
  DRAFT: "draft",
  READY_FOR_SUBMISSION: "ready",
  SUBMISSION_QUEUED: "submitting",
  SUBMITTED_EXTERNAL: "under_review",
  DESIGN_REJECTED: "changes",
  DESIGN_APPROVED: "approved",
  PRODUCTION: "production",
  SHIPPED: "shipped",
  COMPLETED: "completed",
  FAILED: "action",
};

export const JOB_CHIP: Record<TransferJobStatus, ChipKey> = {
  QUEUED: "queued",
  IN_PROGRESS: "inprogress",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  CLINIC: "Clinic",
  DOCTOR: "Doctor",
  CUSTOMER: "Patient",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  NOT_DUE: "Not due",
  DUE: "Payment due",
  PAID: "Paid",
};

export const IN_PROGRESS: CaseStatus[] = ["SUBMISSION_QUEUED", "SUBMITTED_EXTERNAL", "DESIGN_APPROVED", "PRODUCTION", "SHIPPED"];

/** The six steps of the progress panel, and where each status sits on it. paused = shown as a pause marker. */
export const JOURNEY = ["Preparing", "Under review", "Design approved", "In production", "Shipped", "Completed"];

export const JOURNEY_POS: Record<CaseStatus, { cur: number; paused: boolean }> = {
  DRAFT: { cur: 0, paused: false },
  READY_FOR_SUBMISSION: { cur: 0, paused: false },
  SUBMISSION_QUEUED: { cur: 0, paused: false },
  SUBMITTED_EXTERNAL: { cur: 1, paused: false },
  DESIGN_REJECTED: { cur: 1, paused: true },
  DESIGN_APPROVED: { cur: 2, paused: false },
  PRODUCTION: { cur: 3, paused: false },
  SHIPPED: { cur: 4, paused: false },
  COMPLETED: { cur: 5, paused: false },
  FAILED: { cur: 0, paused: true },
};

/** What a patient reads under the progress panel (wording from the design). */
export const PATIENT_EXPLAIN: Record<CaseStatus, string> = {
  DRAFT: "Your clinic is preparing your case.",
  READY_FOR_SUBMISSION: "Your clinic is about to send your design.",
  SUBMISSION_QUEUED: "Your design is being sent for review.",
  SUBMITTED_EXTERNAL: "Tamaz is reviewing your design.",
  DESIGN_REJECTED: "Your design needs a few changes. Your clinic is working on it.",
  DESIGN_APPROVED: "Your design is approved.",
  PRODUCTION: "Your aligners are being made.",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  FAILED: "There's a delay with your case. The team has been told.",
};

/** The banner on the clinic/doctor case page: stage, status line, help line. */
export const STAFF_BANNER: Record<CaseStatus, { stage: string; status: string; help: string; tone: "p" | "a" | "r"; badge: string }> = {
  DRAFT: { stage: "Preparing the case", status: "Not sent yet.", help: "Add the required records and any notes, then continue.", tone: "p", badge: "Placing a new case" },
  READY_FOR_SUBMISSION: { stage: "Ready to send", status: "Waiting for you to send it.", help: "Check everything, then send it to Tamaz.", tone: "p", badge: "Ready to send" },
  SUBMISSION_QUEUED: { stage: "Sending", status: "Your case is being delivered to Tamaz.", help: "This only takes a moment.", tone: "p", badge: "Sending" },
  SUBMITTED_EXTERNAL: { stage: "Records review", status: "Your case is being processed. A quality check of the provided data is in progress.", help: "Please wait for the check results.", tone: "p", badge: "The case is under review" },
  DESIGN_REJECTED: { stage: "Changes requested", status: "Tamaz asked for changes.", help: "Read their comments in Activity, upload corrected files, then send again.", tone: "a", badge: "Changes requested" },
  DESIGN_APPROVED: { stage: "Design approved", status: "Tamaz approved the design.", help: "Nothing to do for now.", tone: "p", badge: "Design approved" },
  PRODUCTION: { stage: "In production", status: "Your aligners are being made.", help: "Nothing to do for now.", tone: "p", badge: "In production" },
  SHIPPED: { stage: "Shipped", status: "Shipped.", help: "Nothing to do for now.", tone: "p", badge: "Shipped" },
  COMPLETED: { stage: "Completed", status: "Completed.", help: "Nothing to do for now.", tone: "p", badge: "Completed" },
  FAILED: { stage: "Delivery problem", status: "We couldn't deliver this case to Tamaz. Our team has been told.", help: "Try sending again.", tone: "r", badge: "Delivery problem" },
};
