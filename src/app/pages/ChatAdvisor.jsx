import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
const fmt = (n) => n >= 1e7 ? `\u20B9${(n / 1e7).toFixed(1)} Crore` : n >= 1e5 ? `\u20B9${(n / 1e5).toFixed(1)} Lakh` : `\u20B9${n.toLocaleString("en-IN")}`;
function getAIResponse(input, metrics, userData) {
  const query = input.toLowerCase();
  const income = parseFloat(userData.income) || 8e4;
  const expenses = parseFloat(userData.expenses) || 45e3;
  const savings = parseFloat(userData.savings) || 2e5;
  const { monthlySavings, recommendedSIP, healthScore, wealthAt10Years, emergencyFundMonths } = metrics;
  if (query.includes("car") || query.includes("vehicle")) {
    const maxCarBudget = income * 12 * 0.4;
    const maxEmi = Math.round(income * 0.1);
    return `Based on your monthly income of ${fmt(income)}, here's my recommendation for buying a car:

\u{1F697} **Max Car Budget:** ${fmt(maxCarBudget)} (within 40% of annual income)
\u{1F4CB} **Max EMI:** ${fmt(maxEmi)}/month (10% of income)
\u{1F4A1} **Tips:**
\u2022 Save at least 20% as down payment first
\u2022 Choose a fuel-efficient car for lower running costs
\u2022 3-year loan is better than 5-year for lower interest
\u2022 Consider used cars \u2014 better value for money

Your current savings of ${fmt(savings)} should cover a good down payment. Would you like a detailed EMI plan?`;
  }
  if (query.includes("invest") || query.includes("sip") || query.includes("mutual fund")) {
    return `Here's your personalized investment breakdown for ${fmt(recommendedSIP)}/month:

\u{1F4C8} **Equity Mutual Funds (60%):** ${fmt(Math.round(recommendedSIP * 0.6))}/month
\u2022 Nifty 50 Index Fund \u2014 Low cost, market returns
\u2022 Mid-cap Fund \u2014 Higher growth potential

\u{1F3E6} **Debt Funds (25%):** ${fmt(Math.round(recommendedSIP * 0.25))}/month
\u2022 Short-duration debt fund for stability

\u{1F4B0} **Liquid Fund (15%):** ${fmt(Math.round(recommendedSIP * 0.15))}/month
\u2022 Emergency access + 6-7% returns

\u{1F4CA} **10-Year Projection:** ${fmt(wealthAt10Years)} at 12% p.a.

Want me to recommend specific mutual fund names?`;
  }
  if (query.includes("health score") || query.includes("score")) {
    const suggestions = healthScore < 70 ? "Increase your monthly SIP, build emergency fund to 6 months" : "Maintain your investments, consider increasing equity allocation";
    return `Your **Money Health Score is ${healthScore}/100** \u{1F3AF}

${healthScore >= 80 ? "\u{1F7E2} Excellent" : healthScore >= 60 ? "\u{1F535} Good" : "\u{1F7E1} Fair"} \u2014 here's the breakdown:

\u{1F3E6} Emergency Fund: ${emergencyFundMonths.toFixed(1)} months covered
\u{1F4B8} Savings Rate: ${Math.round(monthlySavings / income * 100)}%
\u{1F4C8} Investment Health: Building up
\u{1F4B3} Debt Score: Low (80/100)

\u{1F4A1} **To improve:** ${suggestions}

Check the Health Score page for detailed analysis!`;
  }
  if (query.includes("house") || query.includes("home") || query.includes("flat") || query.includes("property")) {
    const affordableHome = income * 60;
    const monthlyEmi = Math.round(income * 0.3);
    const yearsToSave = Math.max(0, Math.round((affordableHome * 0.2 - savings) / monthlySavings / 12));
    return `Great goal! Here's your home buying analysis:

\u{1F3E0} **Affordable Price Range:** ${fmt(affordableHome)} (60x your monthly income)
\u{1F4CB} **Max Home Loan EMI:** ${fmt(monthlyEmi)}/month (30% of income)
\u{1F4B0} **Down Payment Needed:** ${fmt(affordableHome * 0.2)} (20%)
\u23F0 **Time to Save Down Payment:** ~${yearsToSave} more years

\u{1F4CC} **Smart Steps:**
1. Continue your current savings rate
2. Park savings in debt mutual funds (7-8%)
3. Get pre-approved for a loan
4. Look for PMAY subsidy if eligible

Shall I build a month-by-month savings plan for this goal?`;
  }
  if (query.includes("retire") || query.includes("retirement")) {
    const age = parseFloat(userData.age) || 28;
    const retireAge = 50;
    const yearsToRetire = Math.max(0, retireAge - age);
    const corpusNeeded = expenses * 12 * 25;
    return `Retirement Planning for ${userData.name.split(" ")[0]}:

\u{1F4C5} **Target Retirement Age:** ${retireAge} (${yearsToRetire} years away)
\u{1F4B0} **Corpus Needed:** ${fmt(corpusNeeded)} (25x annual expenses)
\u{1F4C8} **Current SIP:** ${fmt(recommendedSIP)}/month

\u{1F3AF} **Strategy:**
\u2022 Years 1-10: Aggressive (80% equity, 20% debt)
\u2022 Years 11-${yearsToRetire}: Balanced (60% equity, 40% debt)
\u2022 At retirement: Move to dividend & FD income

\u{1F4A1} Start NPS (National Pension System) for additional tax benefits up to \u20B950,000 under 80CCD(1B).

Want a detailed retirement corpus calculator?`;
  }
  if (query.includes("save") || query.includes("saving") || query.includes("reduce expense")) {
    const potentialSaving = Math.round(expenses * 0.15);
    return `Here are AI-powered tips to boost your savings:

\u{1F4A1} **Quick Wins (Save ${fmt(potentialSaving)}/month more):**

1. \u{1F355} Cook at home 4 days/week \u2192 Save \u20B93,000-5,000/month
2. \u{1F4F1} Bundle subscriptions (OTT, gym) \u2192 Save \u20B92,000/month
3. \u{1F687} Use metro/public transport 3x/week \u2192 Save \u20B91,500/month
4. \u{1F6CD}\uFE0F 24-hour rule before any purchase > \u20B91,000
5. \u{1F4B3} Use UPI cashback offers \u2192 Earn \u20B9500-1,000/month back

\u{1F3AF} **30-Day Challenge:** Cut one major expense category by 20%.

Your current savings rate is ${Math.round(monthlySavings / income * 100)}%. With these tips, you could reach ${Math.round((monthlySavings + potentialSaving) / income * 100)}%!`;
  }
  if (query.includes("tax") || query.includes("80c") || query.includes("deduction")) {
    return `Smart Tax Planning for FY 2026-27:

\u{1F4CB} **Section 80C (Limit: \u20B91,50,000/year):**
\u2022 ELSS Mutual Funds \u2014 Best returns + 3yr lock-in
\u2022 PPF \u2014 Safe, 7.1% returns, 15yr
\u2022 Life Insurance Premium
\u2022 Home Loan Principal

\u{1F4B0} **Additional Deductions:**
\u2022 80D (Health Insurance) \u2014 \u20B925,000
\u2022 80CCD(1B) NPS \u2014 \u20B950,000
\u2022 HRA exemption if renting

\u{1F3AF} **Your Tax Saving Potential:**
\u2022 Invest \u20B912,500/month in ELSS SIP
\u2022 Get \u20B91.5L deduction under 80C
\u2022 Potential tax saved: \u20B930,000-46,800/year

Should I create a complete tax optimization plan for you?`;
  }
  if (query.includes("emergency") || query.includes("fund")) {
    const target = Math.round(expenses * 6);
    const current = savings;
    const deficit = Math.max(0, target - current);
    const monthsToTarget = deficit > 0 ? Math.ceil(deficit / (monthlySavings * 0.3)) : 0;
    return `Emergency Fund Analysis:

\u{1F3AF} **Target:** ${fmt(target)} (6 months of expenses)
\u2705 **Current:** ${fmt(current)}
${deficit > 0 ? `\u2757 **Gap:** ${fmt(deficit)}` : "\u{1F389} **Status:** Fully funded!"}

${deficit > 0 ? `\u23F0 **Time to Build:** ~${monthsToTarget} months (saving 30% of surplus)

\u{1F4CC} **Where to Park Emergency Fund:**
\u2022 Liquid Mutual Funds (instant withdrawal)
\u2022 High-interest savings account (6-7%)
\u2022 Sweep FD linked to savings account

\u{1F4A1} Set up auto-transfer of ${fmt(Math.round(monthlySavings * 0.3))}/month to a dedicated emergency fund account.` : "Your emergency fund is solid. Now focus all surplus on investments!"}

Want help setting up an auto-SIP for your emergency fund?`;
  }
  return `Thanks for your question! Based on your financial profile:

\u{1F4B0} Income: ${fmt(income)}/month
\u{1F4B8} Expenses: ${fmt(expenses)}/month
\u{1F4C8} Monthly Savings: ${fmt(monthlySavings)}/month
\u{1F3E6} Health Score: ${healthScore}/100

I can help you with:
\u2022 Investment planning and SIP strategy
\u2022 Home buying or car purchase analysis
\u2022 Tax saving recommendations
\u2022 Retirement planning
\u2022 Emergency fund building
\u2022 Expense reduction tips

What specific financial goal would you like to work on today?`;
}
const suggestedPrompts = [
  "Can I afford a car?",
  "How much should I invest monthly?",
  "How to improve my health score?",
  "Help me plan for a house",
  "How to save tax?",
  "When can I retire?"
];
function ChatAdvisor() {
  const { userData, metrics } = useFinance();
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "ai",
      text: `Hi ${userData.name.split(" ")[0]}! \u{1F44B} I'm your AI Financial Advisor. I've analyzed your financial profile and I'm ready to help you make smarter money decisions.

You can ask me anything \u2014 from investment strategies to whether you can afford that car you've been eyeing. What's on your mind?`,
      timestamp: /* @__PURE__ */ new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);
  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now().toString(), role: "user", text, timestamp: /* @__PURE__ */ new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    const delay = 1200 + Math.random() * 800;
    setTimeout(() => {
      const aiReply = getAIResponse(text, metrics, userData);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", text: aiReply, timestamp: /* @__PURE__ */ new Date() }
      ]);
      setIsTyping(false);
    }, delay);
  };
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };
  const formatText = (text) => {
    return text.split("\n").map((line, i) => {
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return <p key={i} className={line === "" ? "h-2" : ""} dangerouslySetInnerHTML={{ __html: boldLine }} style={{ fontSize: "0.875rem", lineHeight: 1.7 }} />;
    });
  };
  return <div className="flex flex-col h-[calc(100vh-8rem)]">
      {
    /* Header */
  }
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1rem" }}>AI Financial Advisor</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-green-600" style={{ fontSize: "0.75rem", fontWeight: 500 }}>Online · Always available</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-blue-600" style={{ fontSize: "0.78rem", fontWeight: 600 }}>Personalized to your profile</span>
        </div>
      </div>

      {
    /* Messages */
  }
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === "ai" ? "bg-blue-600" : "bg-gray-200"}`}
  >
              {msg.role === "ai" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-gray-500" />}
            </div>
            <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div
    className={`px-4 py-3 rounded-2xl ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm"}`}
  >
                {msg.role === "ai" ? <div className="space-y-0.5">{formatText(msg.text)}</div> : <p style={{ fontSize: "0.875rem" }}>{msg.text}</p>}
              </div>
              <span className="text-gray-300 px-1" style={{ fontSize: "0.7rem" }}>
                {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>)}

        {isTyping && <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => <div
    key={i}
    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
    style={{ animationDelay: `${i * 0.15}s` }}
  />)}
              </div>
            </div>
          </div>}
        <div ref={bottomRef} />
      </div>

      {
    /* Suggested prompts */
  }
      {messages.length <= 1 && <div className="flex flex-wrap gap-2 mt-3">
          {suggestedPrompts.map((prompt) => <button
    key={prompt}
    onClick={() => sendMessage(prompt)}
    className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
    style={{ fontSize: "0.8rem", fontWeight: 500 }}
  >
              {prompt}
            </button>)}
        </div>}

      {
    /* Input */
  }
      <div className="mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
        <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKey}
    placeholder="Ask anything about your finances..."
    className="flex-1 outline-none text-gray-800 placeholder-gray-400 bg-transparent"
    style={{ fontSize: "0.9rem" }}
    disabled={isTyping}
  />
        <button
    onClick={() => sendMessage(input)}
    disabled={!input.trim() || isTyping}
    className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
  >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>;
}
export {
  ChatAdvisor
};
