import { createContext, useContext, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/apiBaseUrl";
const STORAGE_KEYS = {
  token: "token",
  user: "user",
  legacyToken: "aimm_token",
  legacyUser: "aimm_user"
};
function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function readStoredUser() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.user)) || safeJsonParse(localStorage.getItem(STORAGE_KEYS.legacyUser));
}
function readStoredToken() {
  const primary = (localStorage.getItem(STORAGE_KEYS.token) || "").trim();
  if (primary) return primary;
  const legacy = (localStorage.getItem(STORAGE_KEYS.legacyToken) || "").trim();
  return legacy || null;
}
function writeStoredAuth(user, token) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.legacyUser, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.legacyToken, token);
}
function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.legacyUser);
  localStorage.removeItem(STORAGE_KEYS.legacyToken);
}

function formatApiError(data, fallbackMessage) {
  const fallback = String(fallbackMessage || "Request failed");
  if (!data) return fallback;

  const detail = data?.detail ?? data?.message ?? data?.error;
  if (!detail) return fallback;

  if (typeof detail === "string") return detail;

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
        if (msg && loc.length) return `${loc.join(".")}: ${msg}`;
        return msg;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join("; ");
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
const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => ({ ok: false, message: "Auth not initialized" }),
  register: async () => ({ ok: false, message: "Auth not initialized" }),
  logout: async () => {
  },
  authHeaders: () => ({})
});
function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    return readStoredUser();
  });
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return null;
    return readStoredToken();
  });
  const value = useMemo(() => {
    const authHeaders = () => {
      const t = token || readStoredToken();
      return t ? { Authorization: `Bearer ${t}` } : {};
    };
    const logout = async () => {
      try {
        const t = token || readStoredToken();
        if (t) {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { ...authHeaders() }
          }).catch(() => null);
        }
      } finally {
        clearStoredAuth();
        setUser(null);
        setToken(null);
      }
    };
    const login = async ({ email, password }) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) return { ok: false, message: "Enter email and password." };
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = formatApiError(data, "Invalid credentials");
          return { ok: false, message: `${String(message)} (HTTP ${res.status})` };
        }
        const nextToken = String(data?.access_token || "").trim();
        const nextUser = {
          name: String(data?.user?.name || ""),
          email: String(data?.user?.email || normalizedEmail).toLowerCase(),
          role: data?.user?.role ? String(data.user.role) : void 0
        };
        if (!nextToken) return { ok: false, message: "Login failed." };
        writeStoredAuth(nextUser, nextToken);
        setUser(nextUser);
        setToken(nextToken);
        console.log("Token:", localStorage.getItem(STORAGE_KEYS.token));
        return { ok: true };
      } catch {
        return { ok: false, message: `API not reachable. Start the backend on ${API_BASE_URL}.` };
      }
    };
    const register = async ({ name, email, password }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = name.trim();
      if (!normalizedName) return { ok: false, message: "Enter your name." };
      if (!normalizedEmail) return { ok: false, message: "Enter your email." };
      if (!password || password.length < 6) return { ok: false, message: "Password must be at least 6 characters." };
      try {
        const res = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: normalizedName, email: normalizedEmail, password })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = formatApiError(data, "Signup failed");
          return { ok: false, message: `${String(message)} (HTTP ${res.status})` };
        }
        const nextToken = String(data?.access_token || "").trim();
        const nextUser = {
          name: String(data?.user?.name || normalizedName),
          email: String(data?.user?.email || normalizedEmail).toLowerCase(),
          role: data?.user?.role ? String(data.user.role) : void 0
        };
        if (!nextToken) return { ok: false, message: "Signup failed." };
        writeStoredAuth(nextUser, nextToken);
        setUser(nextUser);
        setToken(nextToken);
        console.log("Token:", localStorage.getItem(STORAGE_KEYS.token));
        return { ok: true };
      } catch {
        return { ok: false, message: `API not reachable. Start the backend on ${API_BASE_URL}.` };
      }
    };
    return {
      user,
      token,
      isAuthenticated: Boolean(user && (token || readStoredToken())),
      login,
      register,
      logout,
      authHeaders
    };
  }, [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
function useAuth() {
  return useContext(AuthContext);
}
export {
  AuthProvider,
  useAuth
};
