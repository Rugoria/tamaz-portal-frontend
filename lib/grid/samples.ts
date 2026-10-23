import type { AdminPatientRow, AdminTransferJobDto, CaseDto, CaseStatus, PatientSummary, Role, UserDto } from "@/lib/types";

/** Made-up rows for the builder's live preview. They never come from the database and contain no real people. */

const NAMES = ["Amira Hale", "Oliver Bennett", "Priya Shah", "Wei Chen", "Daniel Reyes", "Claire Dubois", "Tomas Berg", "Marta Alvarez", "Ali Raza", "Sara Lindqvist", "Noor Haddad", "Ben Carter", "Lena Fischer", "Yusuf Demir", "Grace Mensah", "Hugo Martin"];
const SENDERS: { name: string; role: Role; id: string }[] = [
  { name: "Northgate Dental", role: "CLINIC", id: "s1" },
  { name: "Harbour Smile Clinic", role: "CLINIC", id: "s2" },
  { name: "Dr Chidi Okafor", role: "DOCTOR", id: "s3" },
  { name: "Willow Park Orthodontics", role: "CLINIC", id: "s4" },
  { name: "Dr Elena Voss", role: "DOCTOR", id: "s5" },
];
const STATUSES: CaseStatus[] = ["DRAFT", "READY_FOR_SUBMISSION", "SUBMITTED_EXTERNAL", "DESIGN_REJECTED", "DESIGN_APPROVED", "PRODUCTION", "SHIPPED", "COMPLETED", "FAILED", "SUBMISSION_QUEUED"];

function iso(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function cases(n: number): CaseDto[] {
  return Array.from({ length: n }, (_, i) => {
    const s = SENDERS[i % SENDERS.length];
    const status = STATUSES[(i * 3) % STATUSES.length];
    return {
      id: `sample-${i}`, ownerId: s.id, ownerName: s.name, ownerRole: s.role,
      customerId: i % 3 === 0 ? `c${i}` : null, customerName: null, customerEmail: null,
      patientFullName: NAMES[i % NAMES.length], caseNumber: 1 + Math.floor(i / NAMES.length), status, displayStatus: "",
      paymentStatus: status === "DESIGN_APPROVED" ? "DUE" : status === "PRODUCTION" || status === "SHIPPED" || status === "COMPLETED" ? "PAID" : "NOT_DUE",
      createdAt: iso(60 - i * 2), updatedAt: iso(30 - i),
    };
  });
}

export function sampleRows(grid: string): unknown[] {
  switch (grid) {
    case "ADMIN_SUBMISSIONS":
      return cases(24).map((c, i): AdminTransferJobDto => ({
        id: c.id, caseId: c.id, patientFullName: c.patientFullName, caseStatus: c.status, ownerId: c.ownerId, ownerName: c.ownerName, ownerRole: c.ownerRole,
        submissionVersion: 1 + (i % 3), status: i % 7 === 0 ? "FAILED" : i % 5 === 0 ? "IN_PROGRESS" : "SUCCEEDED", attemptCount: 1 + (i % 4),
        externalCaseId: i % 7 === 0 ? null : `REF-${1000 + i}`, lastError: i % 7 === 0 ? "Timeout after 30 seconds (504)" : null, createdAt: c.createdAt, updatedAt: c.updatedAt,
      }));
    case "ADMIN_PATIENTS":
      return cases(24).map((c, i): AdminPatientRow => ({
        patientKey: c.patientFullName.toLowerCase(), name: c.patientFullName, ownerId: c.ownerId, ownerName: c.ownerName, ownerRole: c.ownerRole,
        caseCount: 1 + (i % 3), latestCaseId: c.id, latestStatus: c.status, needsAction: c.status === "DESIGN_REJECTED" || c.status === "FAILED",
        linked: c.customerId !== null, lastUpdatedAt: c.updatedAt,
      }));
    case "ADMIN_PATIENT_ACCOUNTS":
    case "ADMIN_CLINICS":
    case "ADMIN_DOCTORS": {
      const role: Role = grid === "ADMIN_PATIENT_ACCOUNTS" ? "CUSTOMER" : grid === "ADMIN_CLINICS" ? "CLINIC" : "DOCTOR";
      return Array.from({ length: 20 }, (_, i): UserDto => {
        const name = role === "CUSTOMER" ? NAMES[i % NAMES.length] : role === "CLINIC" ? `${["Northgate", "Harbour", "Willow Park", "Riverside", "Kingsway"][i % 5]} Dental ${i + 1}` : `Dr ${NAMES[i % NAMES.length]}`;
        return { id: `u${i}`, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`, fullName: name, role, enabled: i % 6 !== 0, createdAt: iso(120 - i * 5) };
      });
    }
    case "PRO_PATIENTS":
      return cases(24).map((c, i): PatientSummary => ({
        patientKey: c.patientFullName.toLowerCase(), name: c.patientFullName, caseCount: 1 + (i % 3), latestCaseId: c.id, latestStatus: c.status,
        latestDisplayStatus: "", needsAction: c.status === "DESIGN_REJECTED" || c.status === "FAILED", linked: c.customerId !== null, linkedCustomerId: c.customerId,
        firstCaseAt: c.createdAt, lastUpdatedAt: c.updatedAt,
      }));
    default:
      return cases(24);
  }
}
