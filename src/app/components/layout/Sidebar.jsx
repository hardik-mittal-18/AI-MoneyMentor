import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Settings as SettingsIcon,
  Briefcase,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import { useAuth } from "../../context/AuthContext";
import { useMembership } from "../../context/MembershipContext";
const navItems = [
  { to: "/app/broker", label: "Broker Dashboard", icon: Briefcase },
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/sip-planner", label: "SIP Planner", icon: TrendingUp },
  { to: "/app/ai-advisor", label: "AI Advisor", icon: MessageSquare },
  { to: "/app/audit-logs", label: "Audit Logs", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon }
];
function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { userData } = useFinance();
  const { user: authUser, logout } = useAuth();
  const { plan } = useMembership();

  const planLabel = plan === "gold" ? "Gold Member" : plan === "silver" ? "Silver Member" : plan === "normal" ? "Normal" : "Free";

  const displayName =
    (typeof authUser?.name === "string" && authUser.name.trim()) ||
    (typeof userData?.name === "string" && userData.name.trim()) ||
    (typeof authUser?.email === "string" && authUser.email.trim()) ||
    "User";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
  const SidebarContent = () => <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {
    /* Logo */
  }
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-gray-900" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            AI Money
          </span>
          <span className="text-blue-600" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            Mentor
          </span>
        </div>
      </div>

      {
    /* Nav Items */
  }
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => <NavLink
    key={item.to}
    to={item.to}
    onClick={() => setMobileOpen(false)}
    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${isActive ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
  >
            {({ isActive }) => <>
                <item.icon
    className={`w-5 h-5 transition-colors ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
  />
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </>}
          </NavLink>)}
      </nav>

      {
    /* User + Logout */
  }
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs" style={{ fontWeight: 600 }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 truncate" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {displayName}
            </p>
            <p className="text-gray-400 truncate" style={{ fontSize: "0.75rem" }}>
              {planLabel}
            </p>
          </div>
        </div>
        <button
    onClick={async () => {
      await logout();
      navigate("/", { replace: true });
    }}
    className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
  >
          <LogOut className="w-4 h-4" />
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Sign Out</span>
        </button>
      </div>
    </div>;
  return <>
      {
    /* Desktop Sidebar */
  }
      <aside className="hidden lg:flex lg:flex-col w-60 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      {
    /* Mobile Header */
  }
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            <span className="text-gray-900">AI Money</span>
            <span className="text-blue-600">Mentor</span>
          </span>
        </div>
        <button
    onClick={() => setMobileOpen(!mobileOpen)}
    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
  >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {
    /* Mobile Drawer */
  }
      {mobileOpen && <>
          <div
    className="lg:hidden fixed inset-0 z-40 bg-black/30"
    onClick={() => setMobileOpen(false)}
  />
          <div className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64">
            <SidebarContent />
          </div>
        </>}
    </>;
}
export {
  Sidebar
};
