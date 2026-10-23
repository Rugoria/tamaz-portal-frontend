// Shapes returned by the Spring Boot backend (see the DTO records in src/main/java).

export type Role = "ADMIN" | "CLINIC" | "DOCTOR" | "CUSTOMER";

export type CaseStatus =
  | "DRAFT"
  | "READY_FOR_SUBMISSION"
  | "SUBMISSION_QUEUED"
  | "SUBMITTED_EXTERNAL"
  | "DESIGN_REJECTED"
  | "DESIGN_APPROVED"
  | "PRODUCTION"
  | "SHIPPED"
  | "COMPLETED"
  | "FAILED";

export type PaymentStatus = "NOT_DUE" | "DUE" | "PAID";
export type TransferJobStatus = "QUEUED" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface SessionUser {
  email: string;
  fullName: string;
  role: Role;
}

export interface LoginResponse extends SessionUser {
  token: string;
}

export interface CaseDto {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerRole: Role;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  patientFullName: string;
  caseNumber: number;
  status: CaseStatus;
  displayStatus: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatientSummary {
  patientKey: string;
  name: string;
  caseCount: number;
  latestCaseId: string;
  latestStatus: CaseStatus;
  latestDisplayStatus: string;
  needsAction: boolean;
  linked: boolean;
  linkedCustomerId: string | null;
  firstCaseAt: string;
  lastUpdatedAt: string;
}

export interface CommentDto {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface StatusHistoryDto {
  id: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  note: string | null;
  createdAt: string;
}

export interface CaseFileDto {
  id: string;
  fileType: "STL" | "PHOTO" | "ETL" | "SCAN";
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  checksum: string | null;
  version: number;
  requirementId: string | null;
  arch: "UPPER" | "LOWER" | null;
  capturedOn: string | null;
  createdAt: string;
}

export interface GalleryPhotoDto {
  fileId: string;
  originalFilename: string;
  capturedOn: string | null;
  createdAt: string;
  caseNumber: number;
  url: string;
}

export interface PreviewUrlDto {
  fileId: string;
  url: string;
}

export interface RecordItemDto {
  requirementId: string | null;
  kind: "STL" | "PHOTO";
  label: string;
  fileCount: number;
  status: "MISSING" | "COMPLETE";
  required: boolean;
}

export interface ReadinessDto {
  ready: boolean;
  fallbackRule: boolean;
  /** No slot is required: at least one STL model and one photo (any slot) are still needed. */
  minimumRule: boolean;
  items: RecordItemDto[];
  missing: string[];
}

export interface RecordRequirementDto {
  id: string;
  kind: "STL" | "PHOTO";
  label: string;
  sortOrder: number;
  active: boolean;
  required: boolean;
}

export interface UploadUrlDto {
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
}

export interface DownloadUrlDto {
  downloadUrl: string;
  expiresAt: string;
}

export interface DesignReviewDto {
  id: string;
  submissionVersion: number;
  decision: "APPROVED" | "REJECTED";
  comments: string | null;
  createdAt: string;
}

export interface TransferJobDto {
  id: string;
  caseId: string;
  submissionVersion: number;
  idempotencyKey: string;
  status: TransferJobStatus;
  attemptCount: number;
  externalCaseId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTransferJobDto {
  id: string;
  caseId: string;
  patientFullName: string;
  caseStatus: CaseStatus;
  ownerId: string;
  ownerName: string;
  ownerRole: Role;
  submissionVersion: number;
  status: TransferJobStatus;
  attemptCount: number;
  externalCaseId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDto {
  id: string;
  withClient: boolean;
  otherPartyId: string | null;
  otherPartyName: string | null;
  otherPartyRole: Role | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageDto {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  mine: boolean;
  body: string;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: "CASE_STATUS" | "CHAT_MESSAGE" | "APPOINTMENT" | "GENERAL";
  caseId: string | null;
  conversationId: string | null;
  messageCount: number;
  channel: "EMAIL" | "IN_APP";
  subject: string;
  body: string;
  status: string;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
}

export interface DoctorProfileDto {
  id: string;
  email: string;
  fullName: string;
  profileComplete: boolean;
  clinicName: string | null;
  contactNumber: string | null;
  addressLine: string | null;
  city: string | null;
  postcode: string | null;
  state: string | null;
  country: string | null;
  toothNumbering: ToothNumbering;
  role: Role;
}

/** The dental notation SimplyCeph takes for a doctor: Universal (American), Viola (their default) or Palmer. */
export type ToothNumbering = "UNIVERSAL" | "VIOLA" | "PALMER";

/** What the Profile page's Details tab saves (PUT /me/profile). Only the contact number is required; a doctor also needs a name. */
export interface ProfileInput {
  fullName: string;
  clinicName: string;
  contactNumber: string;
  addressLine: string;
  city: string;
  postcode: string;
  state: string;
  country: string;
  toothNumbering: ToothNumbering;
}

/** The treatment plan the manufacturer made and the doctor has not decided on yet. */
export interface PlanReviewDto {
  pending: boolean;
  canApprove: boolean;
  /** False until the manufacturer has said which value means "revise"; the button is then not shown. */
  canRequestChanges: boolean;
  plansCreated: number;
}

export interface OfficeDto {
  id: string;
  name: string;
  address: string | null;
  room: string | null;
  note: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  billingRoom: string | null;
  billingNote: string | null;
  billingName: string | null;
  vat: string | null;
}

export interface OfficeInput {
  name: string;
  address: string;
  room: string;
  note: string;
  phone: string;
  email: string;
  billingAddress: string;
  billingRoom: string;
  billingNote: string;
  billingName: string;
  vat: string;
}

/** Answers by question key (see components/profile/preferenceQuestions.ts) and a free note. */
export interface PreferencesDto {
  answers: Record<string, string>;
  /** The note under the aligner questions. */
  extra: string;
  /** The note under the bracket questions. */
  bracketsExtra: string;
}

export interface ClinicSummary {
  id: string;
  name: string;
}

export interface ClearMovesConfigDto {
  apiBaseUrl: string | null;
  credentialReference: string | null;
  webhookSecretSet: boolean;
  shippingAddress: string | null;
  updatedAt: string | null;
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export type BookingStatus = "BOOKED" | "CANCELLED_BY_PATIENT" | "CANCELLED_BY_CLINIC";

/** A slot a clinic opened, with its booking when someone holds it. Times are ISO instants (UTC). */
export interface SlotDto {
  id: string;
  startsAt: string;
  endsAt: string;
  booking: { bookingId: string; patientId: string; patientName: string } | null;
}

export interface OpenSlotDto {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface BookingDto {
  id: string;
  status: BookingStatus;
  slotId: string;
  startsAt: string;
  endsAt: string;
  clinicId: string;
  clinicName: string;
  patientId: string;
  patientName: string;
  cancelledAt: string | null;
  /** Until when the patient may cancel or move it. After this only the clinic can. */
  patientCanChangeUntil: string;
}

export interface AdminMetrics {
  range: number;
  timeZone: string;
  generatedAt: string;
  enoughData: boolean;
  tiles: { totalCases: number; totalCasesBefore: number; newToday: number; newYesterday: number; newThisWeek: number; newPreviousWeek: number; failedDeliveries: number };
  daily: { date: string; count: number }[];
  growthStart: number;
  growthEnd: number;
  byStatus: { status: CaseStatus; count: number }[];
  busiest: { id: string; name: string; role: Role; count: number }[];
}

export interface AdminPatientRow {
  patientKey: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerRole: Role;
  caseCount: number;
  latestCaseId: string;
  latestStatus: CaseStatus;
  needsAction: boolean;
  linked: boolean;
  lastUpdatedAt: string;
}

export interface PatientDetailsDto {
  officeId: string | null;
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  treatmentStatus: "IN_TREATMENT" | "COMPLETED";
  responsibleDoctor: string | null;
}

export interface WorkflowPlanDto {
  text: string;
  classes: Record<string, string>;
  extraction: string[];
  widths: Record<string, number>;
  aligners: "BOTH_PASSIVE" | "BOTH_ACTIVE" | "UPPER_ONLY" | "LOWER_ONLY";
  trimming: "STANDARD" | "GUM";
}
export interface WorkflowDeliveryDto {
  bondingDay: number | null;
  bondingMonth: number | null;
  notes: string;
}
export interface WorkflowPaymentDto {
  payer: "SKIP" | "PATIENT" | "CLINIC" | null;
  means: "CASH" | "TRANSFER" | "CARD" | "SKIP" | null;
}
/** What a doctor fills in on steps 2 to 4 (pending the client's decision). Any part can be null until it is first saved. */
export interface WorkflowDraftDto {
  plan: WorkflowPlanDto | null;
  delivery: WorkflowDeliveryDto | null;
  payment: WorkflowPaymentDto | null;
}
