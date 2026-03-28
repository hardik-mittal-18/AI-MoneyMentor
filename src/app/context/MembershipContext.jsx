import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { useAuth } from "./AuthContext";

const MembershipContext = createContext({
  plan: "free",
  price: 0,
  startDate: null,
  isLoading: false,
  refresh: async () => ({ ok: false }),
  buy: async () => ({ ok: false })
});

function normalizePlan(plan) {
  const p = String(plan || "").trim().toLowerCase();
  if (p === "free" || p === "normal" || p === "silver" || p === "gold") return p;
  return "free";
}

function formatApiError(data, fallbackMessage) {
  const fallback = String(fallbackMessage || "Request failed");
  if (!data) return fallback;

  const detail = data?.detail ?? data?.message ?? data?.error;
  if (!detail) return fallback;

  if (typeof detail === "string") return detail;

  // FastAPI/Pydantic validation errors: { detail: [ { loc, msg, type }, ... ] }
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => {
        if (!item) return null;

        if (typeof item === "string") return item;

        const msg = typeof item?.msg === "string" ? item.msg : null;
        const loc = Array.isArray(item?.loc)
          ? item.loc
              .filter((p) => typeof p === "string" || typeof p === "number")
              .map(String)
              .filter((p) => p !== "body")
          : [];

        // Prefer "field: message" when we have a location.
        if (msg && loc.length) return `${loc.join(".")}: ${msg}`;
        if (msg) return msg;

        return null;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join("; ");
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  if (typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return String(detail);
}

function MembershipProvider({ children }) {
  const { isAuthenticated, token, authHeaders, logout } = useAuth();
  const [plan, setPlan] = useState("free");
  const [price, setPrice] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUnauthorized = async () => {
    try {
      await logout();
    } finally {
      // Fallback UX requirement
      window.alert("Session expired. Please login again");
      window.location.assign("/login");
    }
  };

  const refresh = async () => {
    if (!isAuthenticated) {
      setPlan("free");
      setPrice(0);
      setStartDate(null);
      return { ok: true, plan: "free" };
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/membership/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json", ...authHeaders() }
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return { ok: false, message: "Unauthorized" };
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, message: `${formatApiError(data, "Failed to load membership status")} (HTTP ${res.status})` };
      }
      const nextPlan = normalizePlan(data?.plan);
      setPlan(nextPlan);
      setPrice(Number(data?.price || 0));
      setStartDate(data?.start_date || null);
      return { ok: true, plan: nextPlan };
    } catch {
      return { ok: false, message: "Membership API not reachable." };
    } finally {
      setIsLoading(false);
    }
  };

  const buy = async (nextPlan) => {
    const p = normalizePlan(nextPlan);
    if (!isAuthenticated) return { ok: false, message: "Please login first." };

    setIsLoading(true);
    try {
      const requestBody = { plan: p };
      // Debugging: helps diagnose FastAPI 422 (missing/invalid request body)
      console.log("/membership/buy request:", requestBody);
      const res = await fetch(`${API_BASE_URL}/membership/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(requestBody)
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return { ok: false, message: "Unauthorized" };
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, message: `${formatApiError(data, "Purchase failed")} (HTTP ${res.status})` };
      }
      const serverPlan = normalizePlan(data?.membership?.plan || p);
      setPlan(serverPlan);
      setPrice(Number(data?.membership?.price || 0));
      setStartDate(data?.membership?.start_date || null);
      // Ensure UI stays consistent with backend truth.
      await refresh();
      return { ok: true, plan: serverPlan, payment: data?.payment };
    } catch {
      return { ok: false, message: "Membership API not reachable." };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Debugging requirement
    console.log("Current Plan:", plan);
  }, [plan]);

  const value = useMemo(
    () => ({ plan, price, startDate, isLoading, refresh, buy }),
    [plan, price, startDate, isLoading]
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

function useMembership() {
  return useContext(MembershipContext);
}

export { MembershipProvider, useMembership };
