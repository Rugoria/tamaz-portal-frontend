// Live smoke test of the running stack through the portal (default http://localhost:3001): signs in as each role, opens every main
// page (a signed-in page answers 200; a redirect means the role was refused) and calls the main data endpoints through the proxy.
// Needs the backend (with the demo accounts from its seed script) and this portal both running. Usage: node scripts/smoke.mjs [portalUrl]
const PORTAL = process.argv[2] ?? "http://localhost:3001";
let pass = 0, fail = 0;
const check = (n, ok, x = "") => { if (ok) pass++; else fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "  " + x}`); };

async function session(email, password) {
  const res = await fetch(`${PORTAL}/api/session/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  return { ok: res.ok, cookie, user: res.ok ? await res.json() : null };
}
const get = (path, cookie) => fetch(PORTAL + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
const api = async (path, cookie, init = {}) => { const r = await fetch(`${PORTAL}/api${path}`, { ...init, headers: { "Content-Type": "application/json", cookie, ...(init.headers ?? {}) } }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, json: j }; };

const accounts = {
  admin: ["admin@orthodontics.local", "ChangeMe123!", ["/en/admin", "/en/admin/cases", "/en/admin/submissions", "/en/admin/patients", "/en/admin/accounts", "/en/admin/views", "/en/admin/settings", "/en/admin/audit", "/en/admin/messages", "/en/admin/account"], ["/en/clinic", "/en/customer/aligners"]],
  clinic: ["northgate@example.com", "longenough1", ["/en/clinic", "/en/clinic/patients", "/en/clinic/cases", "/en/clinic/messages", "/en/clinic/appointments", "/en/clinic/notifications", "/en/clinic/profile", "/en/clinic/account"], ["/en/admin", "/en/doctor", "/en/customer/aligners"]],
  doctor: ["dr.okafor@example.com", "longenough1", ["/en/doctor", "/en/doctor/patients", "/en/doctor/cases", "/en/doctor/messages", "/en/doctor/profile", "/en/doctor/account"], ["/en/admin", "/en/clinic", "/en/customer/aligners"]],
  patient: ["amira.hale@example.com", "longenough1", ["/en/customer/aligners", "/en/customer/messages", "/en/customer/clinics", "/en/customer/appointments", "/en/customer/notifications", "/en/customer/account"], ["/en/admin", "/en/clinic"]],
};

const sessions = {};
for (const [role, [email, pw, pages, forbidden]] of Object.entries(accounts)) {
  const s = await session(email, pw);
  sessions[role] = s;
  check(`${role}: signs in through the portal`, s.ok && !!s.cookie, JSON.stringify(s.user));
  for (const p of pages) {
    const r = await get(p, s.cookie);
    check(`${role}: ${p} opens`, r.status === 200, String(r.status));
  }
  for (const p of forbidden) {
    const r = await get(p, s.cookie);
    check(`${role}: ${p} is refused`, r.status !== 200, String(r.status));
  }
}
const anon = await get("/en/admin");
check("not signed in: an admin page redirects to sign in", anon.status >= 300 && anon.status < 400);
for (const p of ["/en/login", "/en/register", "/en/register/doctor", "/en/forgot-password", "/en/reset-password?token=x"]) {
  const r = await get(p);
  check(`public page ${p} opens`, r.status === 200, String(r.status));
}

// data through the proxy
const A = sessions.admin.cookie, C = sessions.clinic.cookie, P = sessions.patient.cookie;
let r = await api("/admin/metrics?range=30", A);
check("admin metrics", r.status === 200 && r.json.daily.length === 30);
r = await api("/views/grids", A);
check("view grids for admin", r.status === 200 && r.json.length === 9);
r = await api("/cases?size=5", C);
check("clinic cases", r.status === 200 && r.json.content.length > 0);
const caseId = r.json.content[0].id;
r = await api(`/cases/${caseId}/files/readiness`, C);
check("readiness", r.status === 200 && Array.isArray(r.json.items));
r = await api(`/cases/${caseId}/workflow-draft`, C);
check("step answers", r.status === 200);
r = await api("/cases?size=5", P);
check("patient aligners", r.status === 200);
r = await api("/admin/metrics", C);
check("clinic refused on admin metrics", r.status === 403);
r = await api("/notifications/unread-count", C);
check("unread count (Redis cache)", r.status === 200 && typeof r.json.unread === "number");
r = await api("/me/profile", C);
check("clinic profile", r.status === 200 && r.json.role === "CLINIC" && "toothNumbering" in r.json);
r = await api("/me/offices", C);
check("clinic offices", r.status === 200 && Array.isArray(r.json));
r = await api("/me/preferences", C);
check("clinic preferences", r.status === 200 && "answers" in r.json);
r = await api("/me/profile", P);
check("patient refused on the profile", r.status === 403);
r = await api("/auth/forgot-password", "", { method: "POST", body: JSON.stringify({ email: "nobody@example.com" }) });
check("forgot password answers 202 for any email", r.status === 202);
for (const [what, path, c] of [["case page", `/en/clinic/cases/${caseId}`, C]]) {
  const rr = await get(path, c);
  check(`${what} opens`, rr.status === 200, String(rr.status));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
