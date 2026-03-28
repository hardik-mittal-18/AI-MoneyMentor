import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { useFinance } from "../context/FinanceContext";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
const fmt = (n) => n >= 1e5 ? `\u20B9${(n / 1e5).toFixed(1)}L` : `\u20B9${n.toLocaleString("en-IN")}`;
const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
function Reports() {
  const { userData, metrics } = useFinance();
  const income = parseFloat(userData.income) || 8e4;
  const expenses = parseFloat(userData.expenses) || 45e3;
  const { monthlySavings, recommendedSIP } = metrics;
  const handleExportPdf = () => {
    window.print();
  };
  const monthlyData = months.map((month, i) => {
    const variance = Math.sin(i * 1.7) * 0.1 + 1;
    return {
      month,
      income: Math.round(income * (0.95 + Math.random() * 0.1)),
      expenses: Math.round(expenses * variance * 0.95),
      savings: Math.round(monthlySavings * (0.8 + Math.random() * 0.4))
    };
  });
  monthlyData[5] = { month: "Mar", income, expenses, savings: monthlySavings };
  const sipData = months.map((month, i) => ({
    month,
    invested: Math.round(recommendedSIP * (0.85 + Math.random() * 0.3)),
    returns: Math.round(recommendedSIP * (0.85 + Math.random() * 0.3) * (1 + 0.01 * (6 - i)))
  }));
  const netWorthData = months.map((month, i) => {
    const base = parseFloat(userData.savings) || 2e5;
    return {
      month,
      netWorth: Math.round(base + monthlySavings * (i + 1) * 1.05)
    };
  });
  const summaryCards = [
    {
      label: "Avg Monthly Income",
      val: fmt(Math.round(monthlyData.reduce((s, d) => s + d.income, 0) / 6)),
      change: "+3.2%",
      up: true,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      label: "Avg Monthly Expenses",
      val: fmt(Math.round(monthlyData.reduce((s, d) => s + d.expenses, 0) / 6)),
      change: "-1.8%",
      up: false,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50"
    },
    {
      label: "Total Invested (6mo)",
      val: fmt(sipData.reduce((s, d) => s + d.invested, 0)),
      change: "+5.4%",
      up: true,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Net Worth Growth",
      val: fmt(netWorthData[5].netWorth - netWorthData[0].netWorth),
      change: "+12.3%",
      up: true,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ];
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3">
          <p className="text-gray-500 mb-2" style={{ fontSize: "0.78rem", fontWeight: 600 }}>{label}</p>
          {payload.map((p) => <div key={p.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <p style={{ fontSize: "0.8rem", color: p.color, fontWeight: 600 }}>
                {p.name}: {fmt(p.value)}
              </p>
            </div>)}
        </div>;
    }
    return null;
  };
  return <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Financial Reports</h1>
          <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.9rem" }}>October 2025 – March 2026 · 6-month summary</p>
        </div>
        <button
    onClick={handleExportPdf}
    className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all text-sm"
    style={{ fontWeight: 600 }}
  >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {
    /* Summary Cards */
  }
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500" style={{ fontSize: "0.78rem", fontWeight: 600 }}>{card.label}</p>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-gray-900" style={{ fontWeight: 800, fontSize: "1.2rem" }}>{card.val}</p>
            <div className="flex items-center gap-1 mt-1">
              {card.up ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span className={`${card.up ? "text-green-600" : "text-red-500"}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                {card.change} vs prev period
              </span>
            </div>
          </div>)}
      </div>

      {
    /* Charts */
  }
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        {
    /* Income vs Expenses Bar */
  }
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-1" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Income vs Expenses</h3>
          <p className="text-gray-400 mb-4" style={{ fontSize: "0.78rem" }}>Monthly comparison (Oct 2025 – Mar 2026)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis
    tick={{ fontSize: 10, fill: "#9CA3AF" }}
    tickLine={false}
    axisLine={false}
    tickFormatter={(v) => v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : `${(v / 1e3).toFixed(0)}k`}
  />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              <Bar dataKey="income" name="Income" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {
    /* Net Worth Area */
  }
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-1" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Net Worth Growth</h3>
          <p className="text-gray-400 mb-4" style={{ fontSize: "0.78rem" }}>Cumulative wealth over the period</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={netWorthData}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis
    tick={{ fontSize: 10, fill: "#9CA3AF" }}
    tickLine={false}
    axisLine={false}
    tickFormatter={(v) => v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : v}
  />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#3B82F6" strokeWidth={2.5} fill="url(#netWorthGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {
    /* Savings + Investment Bar */
  }
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-1" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Monthly Savings Trend</h3>
          <p className="text-gray-400 mb-4" style={{ fontSize: "0.78rem" }}>How much you saved each month</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis
    tick={{ fontSize: 10, fill: "#9CA3AF" }}
    tickLine={false}
    axisLine={false}
    tickFormatter={(v) => `${(v / 1e3).toFixed(0)}k`}
  />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="savings" name="Savings" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {
    /* Monthly transactions table */
  }
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-4" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Monthly Summary Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Month", "Income", "Expenses", "Saved"].map((h) => <th key={h} className="text-left text-gray-400 pb-2" style={{ fontSize: "0.75rem", fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row, i) => {
    const saved = row.income - row.expenses;
    const isPositive = saved > 0;
    return <tr key={row.month} className={`border-b border-gray-50 ${i === monthlyData.length - 1 ? "bg-blue-50/50" : ""}`}>
                      <td className="py-2.5 text-gray-700" style={{ fontSize: "0.82rem", fontWeight: i === monthlyData.length - 1 ? 700 : 400 }}>{row.month}</td>
                      <td className="py-2.5 text-gray-700" style={{ fontSize: "0.82rem" }}>{fmt(row.income)}</td>
                      <td className="py-2.5 text-gray-700" style={{ fontSize: "0.82rem" }}>{fmt(row.expenses)}</td>
                      <td className={`py-2.5 ${isPositive ? "text-green-600" : "text-red-500"}`} style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                        {isPositive ? "+" : ""}{fmt(saved)}
                      </td>
                    </tr>;
  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>;
}
export {
  Reports
};
