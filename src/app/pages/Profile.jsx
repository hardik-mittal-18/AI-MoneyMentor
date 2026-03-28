import { useState } from "react";
import { useNavigate } from "react-router";
import { useFinance } from "../context/FinanceContext";
import { Edit2, Save, X, CheckCircle, TrendingUp, Target, Bell, Shield, ChevronRight } from "lucide-react";
const fmt = (n) => `\u20B9${Number(n).toLocaleString("en-IN")}`;
function Profile() {
  const navigate = useNavigate();
  const { userData, setUserData, metrics } = useFinance();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(userData);
  const [saved, setSaved] = useState(false);
  const income = parseFloat(userData.income) || 8e4;
  const expenses = parseFloat(userData.expenses) || 45e3;
  const savings = parseFloat(userData.savings) || 2e5;
  const { healthScore, monthlySavings, recommendedSIP } = metrics;
  const handleSave = () => {
    setUserData(form);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3e3);
  };
  const handleCancel = () => {
    setForm(userData);
    setEditing(false);
  };
  const initials = userData.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const scoreColor = healthScore >= 80 ? "#10B981" : healthScore >= 60 ? "#3B82F6" : "#F59E0B";
  return <div>
      <div className="mb-7">
        <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Profile</h1>
        <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.9rem" }}>Manage your personal and financial information</p>
      </div>

      {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-5">
          <CheckCircle className="w-4 h-4" />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Profile updated! Your financial plan has been recalculated.</span>
        </div>}

      <div className="grid lg:grid-cols-3 gap-5">
        {
    /* Left: Profile Card */
  }
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {
    /* Avatar + Name */
  }
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                {initials}
              </div>
              <div className="flex-1">
                <h2 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.2rem" }}>{userData.name || "\u2014"}</h2>
                <p className="text-gray-400" style={{ fontSize: "0.85rem" }}>Age {userData.age || "\u2014"} · Premium Member</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scoreColor }} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: scoreColor }}>
                    Health Score: {healthScore}/100
                  </span>
                </div>
              </div>
              {!editing && <button
    onClick={() => setEditing(true)}
    className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all"
    style={{ fontSize: "0.85rem", fontWeight: 600 }}
  >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>}
            </div>

            {
    /* Fields */
  }
            <div className="grid sm:grid-cols-2 gap-5">
              {[
    { field: "name", label: "Full Name", type: "text", placeholder: "Your name" },
    { field: "age", label: "Age", type: "number", placeholder: "Your age" },
    { field: "income", label: "Monthly Income (\u20B9)", type: "number", placeholder: "e.g. 80000", prefix: "\u20B9" },
    { field: "expenses", label: "Monthly Expenses (\u20B9)", type: "number", placeholder: "e.g. 45000", prefix: "\u20B9" },
    { field: "savings", label: "Current Savings (\u20B9)", type: "number", placeholder: "e.g. 200000", prefix: "\u20B9" }
  ].map(({ field, label, type, placeholder, prefix }) => <div key={field}>
                  <label className="block text-gray-500 mb-1.5" style={{ fontSize: "0.78rem", fontWeight: 600 }}>{label}</label>
                  {editing ? <div className="relative">
                      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{prefix}</span>}
                      <input
    type={type}
    value={form[field]}
    onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
    placeholder={placeholder}
    className={`w-full border border-gray-200 rounded-xl py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 ${prefix ? "pl-8 pr-4" : "px-4"}`}
  />
                    </div> : <p className="text-gray-800 px-1" style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {prefix && field !== "age" ? `\u20B9${Number(userData[field]).toLocaleString("en-IN") || "\u2014"}` : userData[field] || "\u2014"}
                    </p>}
                </div>)}

              <div className="sm:col-span-2">
                <label className="block text-gray-500 mb-1.5" style={{ fontSize: "0.78rem", fontWeight: 600 }}>Financial Goals</label>
                {editing ? <textarea
    value={form.goals}
    onChange={(e) => setForm((prev) => ({ ...prev, goals: e.target.value }))}
    rows={3}
    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
  /> : <p className="text-gray-800 px-1" style={{ fontWeight: 500, fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {userData.goals || "No goals set yet"}
                  </p>}
              </div>
            </div>

            {editing && <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                <button
    onClick={handleSave}
    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
    style={{ fontWeight: 600, fontSize: "0.875rem" }}
  >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button
    onClick={handleCancel}
    className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
    style={{ fontWeight: 600, fontSize: "0.875rem" }}
  >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>}
          </div>

          {
    /* Preferences */
  }
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Preferences</h3>
            <div className="space-y-3">
              {[
    { icon: Bell, label: "Weekly Financial Digest", desc: "Get a summary every Monday", enabled: true },
    { icon: TrendingUp, label: "Market Alerts", desc: "Notify when your funds move \xB15%", enabled: true },
    { icon: Target, label: "Goal Reminders", desc: "Monthly check-ins on your goals", enabled: false },
    { icon: Shield, label: "Security Alerts", desc: "Notify on login from new device", enabled: true }
  ].map((item, i) => <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-gray-800" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.label}</p>
                      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{item.desc}</p>
                    </div>
                  </div>
                  <div
    className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${item.enabled ? "bg-blue-600" : "bg-gray-200"}`}
  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm m-0.5 transition-transform ${item.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </div>)}
            </div>
          </div>
        </div>

        {
    /* Right: Stats + Quick Links */
  }
        <div className="space-y-4">
          {
    /* Financial Summary */
  }
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Financial Summary</h3>
            <div className="space-y-3">
              {[
    { label: "Monthly Income", val: fmt(income), color: "text-green-600" },
    { label: "Monthly Expenses", val: fmt(expenses), color: "text-red-500" },
    { label: "Monthly Savings", val: fmt(monthlySavings), color: "text-blue-600" },
    { label: "Recommended SIP", val: fmt(recommendedSIP), color: "text-purple-600" },
    { label: "Current Savings", val: fmt(savings), color: "text-gray-700" }
  ].map((item) => <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500" style={{ fontSize: "0.82rem" }}>{item.label}</span>
                  <span className={item.color} style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.val}</span>
                </div>)}
            </div>
          </div>

          {
    /* Quick Links */
  }
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-gray-800 mb-3" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Quick Actions</h3>
            <div className="space-y-2">
              {[
    { label: "View Dashboard", path: "/app/dashboard" },
    { label: "Check Health Score", path: "/app/health-score" },
    { label: "Chat with AI Advisor", path: "/app/chat" },
    { label: "View Reports", path: "/app/reports" },
    { label: "Re-run Onboarding", path: "/onboarding" }
  ].map((link) => <button
    key={link.label}
    onClick={() => navigate(link.path)}
    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-left"
  >
                  <span className="text-gray-700" style={{ fontSize: "0.85rem", fontWeight: 500 }}>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>)}
            </div>
          </div>

          {
    /* Membership */
  }
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" />
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Premium Member</span>
            </div>
            <p className="text-blue-100 mb-3" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
              You have unlimited AI advisor chats, advanced reports, and personalized investment plans.
            </p>
            <div className="flex items-center gap-1 text-yellow-300">
              {Array.from({ length: 5 }).map((_, i) => <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
              <span className="ml-1 text-white" style={{ fontSize: "0.8rem" }}>5.0 rating</span>
            </div>
          </div>
        </div>
      </div>
    </div>;
}
export {
  Profile
};
