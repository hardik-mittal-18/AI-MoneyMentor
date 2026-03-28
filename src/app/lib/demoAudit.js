const STORAGE_KEY = "demo_audit_logs";
function addDemoAuditLog(event) {
  const entry = { ...event, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  const current = getDemoAuditLogs();
  const next = [entry, ...current].slice(0, 250);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
function getDemoAuditLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
function clearDemoAuditLogs() {
  localStorage.removeItem(STORAGE_KEY);
}
export {
  addDemoAuditLog,
  clearDemoAuditLogs,
  getDemoAuditLogs
};
