import { useNavigate } from "react-router";
import { useFinance } from "../context/FinanceContext";
import { TrendingUp, Shield, PiggyBank, CreditCard, BarChart3, ChevronRight } from "lucide-react";
const fmt = (n) => n >= 1e5 ? `\u20B9${(n / 1e5).toFixed(1)}L` : `\u20B9${n.toLocaleString("en-IN")}`;
function GaugeChart({ score }) {
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#3B82F6" : score >= 40 ? "#F59E0B" : "#EF4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Work";
  const radius = 80;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - score / 100 * circumference;
  return <div className="flex flex-col items-center py-4">
      <div className="relative" style={{ width: 220, height: 120 }}>
        <svg width="220" height="120" viewBox="0 0 220 120">
          {
    /* Background arc */
  }
          <path
    d="M 20 110 A 90 90 0 0 1 200 110"
    fill="none"
    stroke="#F3F4F6"
    strokeWidth="20"
    strokeLinecap="round"
  />
          {
    /* Score arc */
  }
          <path
    d="M 20 110 A 90 90 0 0 1 200 110"
    fill="none"
    stroke={color}
    strokeWidth="20"
    strokeLinecap="round"
    strokeDasharray={`${score / 100 * 283} 283`}
  />
          {
    /* Center text */
  }
          <text x="110" y="95" textAnchor="middle" fill={color} style={{ fontSize: "2.5rem", fontWeight: 800 }}>{score}</text>
          <text x="110" y="112" textAnchor="middle" fill="#9CA3AF" style={{ fontSize: "0.7rem" }}>OUT OF 100</text>
        </svg>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color }}>{label}</span>
      </div>
      <p className="text-gray-400 mt-1 text-center max-w-xs" style={{ fontSize: "0.85rem" }}>
        Your money health score based on savings, investments, emergency fund & debt management.
      </p>
    </div>;
}
function ScoreCard({
  icon: Icon,
  label,
  score,
  detail,
  color,
  bgColor
}) {
  const barColor = score >= 80 ? "#10B981" : score >= 60 ? "#3B82F6" : score >= 40 ? "#F59E0B" : "#EF4444";
  return <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</p>
          <p className="text-gray-400" style={{ fontSize: "0.78rem" }}>{detail}</p>
        </div>
        <div className="text-right">
          <span style={{ fontWeight: 800, fontSize: "1.4rem", color: barColor }}>{score}</span>
          <span className="text-gray-300" style={{ fontSize: "0.8rem" }}>/100</span>
        </div>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full">
        <div
    className="h-2.5 rounded-full transition-all duration-500"
    style={{ width: `${score}%`, backgroundColor: barColor }}
  />
      </div>
    </div>;
}
function HealthScore() {
  const navigate = useNavigate();
  const { userData, metrics } = useFinance();
  const { healthScore, emergencyFundScore, savingsScore, debtScore, investmentScore, emergencyFundMonths, monthlySavings } = metrics;
  const income = parseFloat(userData.income) || 8e4;
  const expenses = parseFloat(userData.expenses) || 45e3;
  const savings = parseFloat(userData.savings) || 2e5;
  const scoreCards = [
    {
      icon: Shield,
      label: "Emergency Fund Score",
      score: emergencyFundScore,
      detail: `${emergencyFundMonths.toFixed(1)} of 6 months covered (${fmt(savings)} of ${fmt(expenses * 6)})`,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: PiggyBank,
      label: "Savings Score",
      score: savingsScore,
      detail: `${Math.round(monthlySavings / income * 100)}% savings rate \xB7 ${fmt(monthlySavings)}/month saved`,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: CreditCard,
      label: "Debt Management Score",
      score: debtScore,
      detail: "Debt-to-income ratio is healthy \xB7 No high-interest debt detected",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: BarChart3,
      label: "Investment Score",
      score: investmentScore,
      detail: `SIP consistency \xB7 Equity + Debt allocation optimized`,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];
  const suggestions = [
    {
      priority: "high",
      title: emergencyFundMonths < 6 ? "Build Emergency Fund" : "Increase SIP Amount",
      desc: emergencyFundMonths < 6 ? `Top up emergency fund by ${fmt(Math.max(0, expenses * 6 - savings))} to reach the recommended 6-month buffer.` : `You've covered 6 months of expenses. Consider increasing your SIP by \u20B95,000/month.`,
      impact: "+8 points"
    },
    {
      priority: "medium",
      title: "Diversify Investments",
      desc: "Add international equity funds (NASDAQ/S&P 500 ETF) for geographic diversification \u2014 10% of SIP.",
      impact: "+5 points"
    },
    {
      priority: "medium",
      title: "Get Health Insurance",
      desc: "A \u20B910 lakh family floater plan protects your savings from medical emergencies. Premium: ~\u20B912,000/year.",
      impact: "+4 points"
    },
    {
      priority: "low",
      title: "Maximize 80C Deductions",
      desc: "Invest \u20B91.5L in ELSS via SIP for tax savings. This reduces tax liability by up to \u20B946,800.",
      impact: "+3 points"
    }
  ];
  const priorityColors = {
    high: "bg-red-50 border-red-400 text-red-800",
    medium: "bg-amber-50 border-amber-400 text-amber-800",
    low: "bg-green-50 border-green-400 text-green-800"
  };
  const priorityLabels = {
    high: "High Priority",
    medium: "Medium",
    low: "Nice to Have"
  };
  return <div>
      {
    /* Header */
  }
      <div className="mb-7">
        <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Money Health Score</h1>
        <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.9rem" }}>A comprehensive view of your financial wellness</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {
    /* Left: Gauge + Score Breakdown */
  }
        <div className="lg:col-span-2 space-y-5">
          {
    /* Gauge Card */
  }
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <GaugeChart score={healthScore} />
              <div className="flex-1 grid grid-cols-2 gap-3">
                {[
    { label: "Emergency Fund", score: emergencyFundScore },
    { label: "Savings Rate", score: savingsScore },
    { label: "Debt Health", score: debtScore },
    { label: "Investments", score: investmentScore }
  ].map((item) => {
    const c = item.score >= 80 ? "#10B981" : item.score >= 60 ? "#3B82F6" : item.score >= 40 ? "#F59E0B" : "#EF4444";
    return <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-gray-500 mb-1" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{item.label}</p>
                      <p style={{ fontSize: "1.4rem", fontWeight: 800, color: c }}>{item.score}</p>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${item.score}%`, backgroundColor: c }} />
                      </div>
                    </div>;
  })}
              </div>
            </div>
          </div>

          {
    /* Score Cards */
  }
          <div className="grid sm:grid-cols-2 gap-4">
            {scoreCards.map((card) => <ScoreCard key={card.label} {...card} />)}
          </div>
        </div>

        {
    /* Right: Suggestions */
  }
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-gray-800" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                How to Improve Your Score
              </h3>
            </div>
            <p className="text-gray-400 mb-4" style={{ fontSize: "0.8rem" }}>
              Follow these steps to reach an <span className="text-green-600 font-semibold">Excellent (80+)</span> score:
            </p>
            <div className="space-y-3">
              {suggestions.map((s, i) => <div key={i} className={`p-3 rounded-xl border-l-4 ${priorityColors[s.priority]}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>{s.title}</p>
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-white/60 text-xs font-semibold">
                      {s.impact}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>{s.desc}</p>
                  <span className="inline-block mt-1 text-xs font-semibold opacity-70">{priorityLabels[s.priority]}</span>
                </div>)}
            </div>
          </div>

          {
    /* Compare */
  }
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
            <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Your Score vs India Average</h4>
            <div className="mt-4 space-y-3">
              {[
    { label: "Your Score", score: healthScore, width: healthScore },
    { label: "India Average", score: 52, width: 52 },
    { label: "Top 10%", score: 85, width: 85 }
  ].map((item) => <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: "0.8rem" }} className="text-blue-100">{item.label}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.score}</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full">
                    <div className="h-2 rounded-full bg-white" style={{ width: `${item.width}%` }} />
                  </div>
                </div>)}
            </div>
          </div>

          <button
    onClick={() => navigate("/app/chat")}
    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
    style={{ fontWeight: 600, fontSize: "0.9rem" }}
  >
            Get Personalized Advice
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>;
}
export {
  HealthScore
};
