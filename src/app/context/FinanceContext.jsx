import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const baseUser = {
  name: "",
  age: "28",
  income: "80000",
  expenses: "45000",
  savings: "200000",
  goals: "Buy a house in 5 years and retire comfortably by 50"
};

function readAuthUserFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("aimm_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getInitialUserData() {
  const stored = readAuthUserFromStorage();
  const nameFromAuth = typeof stored?.name === "string" ? stored.name.trim() : "";
  const emailFromAuth = typeof stored?.email === "string" ? stored.email.trim() : "";
  const fallbackName = emailFromAuth ? emailFromAuth.split("@")[0] : "User";
  return {
    ...baseUser,
    name: nameFromAuth || fallbackName
  };
}
function calculateMetrics(user) {
  const income = parseFloat(user.income) || 8e4;
  const expenses = parseFloat(user.expenses) || 45e3;
  const savings = parseFloat(user.savings) || 2e5;
  const monthlySavings = Math.max(0, income - expenses);
  const savingsRate = income > 0 ? monthlySavings / income : 0;
  const emergencyFundMonths = expenses > 0 ? savings / expenses : 0;
  const emergencyFundScore = Math.min(100, Math.round(emergencyFundMonths / 6 * 100));
  const savingsScore = Math.min(100, Math.round(savingsRate * 200));
  const debtScore = 80;
  const investmentScore = Math.min(100, Math.round(savingsRate * 250));
  const healthScore = Math.round((emergencyFundScore + savingsScore + debtScore + investmentScore) / 4);
  const recommendedSIP = Math.round(monthlySavings * 0.7);
  const annualReturn = 0.12;
  const monthlyRate = annualReturn / 12;
  const existingSavingsReturn = 0.08;
  const wealthProjection = [];
  for (let year = 1; year <= 15; year++) {
    const months = year * 12;
    const sipFV = recommendedSIP * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const savingsFV = savings * Math.pow(1 + existingSavingsReturn, year);
    const totalWealth = Math.round(sipFV + savingsFV);
    wealthProjection.push({ year: `Year ${year}`, wealth: totalWealth });
  }
  const wealthAt5Years = wealthProjection[4]?.wealth || 0;
  const wealthAt10Years = wealthProjection[9]?.wealth || 0;
  const incomeBreakdown = [
    { name: "Expenses", value: Math.round(expenses / income * 100), color: "#EF4444" },
    { name: "Savings/Invest", value: Math.round(monthlySavings * 0.7 / income * 100), color: "#3B82F6" },
    { name: "Emergency", value: Math.round(monthlySavings * 0.3 / income * 100), color: "#10B981" }
  ];
  const sipAmount = recommendedSIP;
  const investmentAllocation = [
    { name: "Equity Mutual Funds", value: 60, color: "#3B82F6", amount: Math.round(sipAmount * 0.6) },
    { name: "Debt Funds", value: 25, color: "#8B5CF6", amount: Math.round(sipAmount * 0.25) },
    { name: "Liquid / FD", value: 15, color: "#10B981", amount: Math.round(sipAmount * 0.15) }
  ];
  return {
    monthlySavings,
    savingsRate,
    emergencyFundMonths,
    recommendedSIP,
    healthScore,
    emergencyFundScore,
    savingsScore,
    debtScore,
    investmentScore,
    wealthAt5Years,
    wealthAt10Years,
    wealthProjection,
    incomeBreakdown,
    investmentAllocation
  };
}
const FinanceContext = createContext({
  userData: baseUser,
  setUserData: () => {
  },
  hasOnboarded: false,
  setHasOnboarded: () => {
  },
  metrics: calculateMetrics(baseUser)
});
function FinanceProvider({ children }) {
  const { user: authUser } = useAuth();
  const [userData, setUserDataState] = useState(getInitialUserData);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const nextName = typeof authUser?.name === "string" ? authUser.name.trim() : "";
    if (!nextName) return;
    setUserDataState((prev) => prev && prev.name === nextName ? prev : {
      ...prev,
      name: nextName
    });
  }, [authUser?.name]);

  const setUserData = (data) => {
    setUserDataState(data);
  };
  const metrics = calculateMetrics(userData);
  return <FinanceContext.Provider value={{ userData, setUserData, hasOnboarded, setHasOnboarded, metrics }}>
      {children}
    </FinanceContext.Provider>;
}
function useFinance() {
  return useContext(FinanceContext);
}
export {
  FinanceProvider,
  useFinance
};
