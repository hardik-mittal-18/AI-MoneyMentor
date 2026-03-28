import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { Landing } from "./pages/Landing";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { ChatAdvisor } from "./pages/ChatAdvisor";
import { HealthScore } from "./pages/HealthScore";
import { Reports } from "./pages/Reports";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { useAuth } from "./context/AuthContext";
import { BrokerDashboard } from "./pages/BrokerDashboard";
import { SipPlanner } from "./pages/SipPlanner";
import { AIAdvisorValidated } from "./pages/AIAdvisorValidated";
import { AuditLogs } from "./pages/AuditLogs";
import { Settings } from "./pages/Settings";
import { Membership } from "./pages/Membership";
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing
  },
  {
    path: "/login",
    Component: Login
  },
  {
    path: "/register",
    Component: Register
  },
  {
    path: "/onboarding",
    element: <RequireAuth>
        <Onboarding />
      </RequireAuth>
  },
  {
    path: "/app",
    element: <RequireAuth>
        <AppLayout />
      </RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/app/broker" replace /> },
      { path: "broker", Component: BrokerDashboard },
      { path: "dashboard", Component: Dashboard },
      { path: "sip-planner", Component: SipPlanner },
      { path: "membership", Component: Membership },
      { path: "ai-advisor", Component: AIAdvisorValidated },
      { path: "audit-logs", Component: AuditLogs },
      { path: "settings", Component: Settings },
      // Keep existing routes (backward compatibility)
      { path: "chat", Component: ChatAdvisor },
      { path: "health-score", Component: HealthScore },
      { path: "reports", Component: Reports },
      { path: "profile", Component: Profile }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);
export {
  router
};
