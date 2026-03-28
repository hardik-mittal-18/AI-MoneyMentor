import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { useAuth } from "../context/AuthContext";
import { useMembership } from "../context/MembershipContext";
import { canAccessFeature } from "../lib/membershipAccess";
import { UpgradeRequiredDialog } from "../components/membership/UpgradeRequiredDialog";
import { useNavigate } from "react-router";
function formatINR(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(safe);
}
function Spinner({ label }) {
  return <span className="inline-flex items-center gap-2" aria-label={label}>
      <span
    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    aria-hidden="true"
  />
      <span className="text-sm">{label}</span>
    </span>;
}
function MetricCard({ label, value, hint }) {
  return <Card className="rounded-2xl transition-colors hover:bg-accent/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm" style={{ fontWeight: 700 }}>
          {label}
        </CardTitle>
        {hint ? <CardDescription className="text-xs" style={{ fontSize: "0.8rem" }}>
            {hint}
          </CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl" style={{ fontWeight: 800 }}>
          {value}
        </div>
      </CardContent>
    </Card>;
}
function Dashboard() {
  const navigate = useNavigate();
  const { authHeaders, logout } = useAuth();
  const { plan } = useMembership();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [income, setIncome] = useState("80000");
  const [expenses, setExpenses] = useState("45000");
  const [savings, setSavings] = useState("200000");
  const [goal, setGoal] = useState("Buy a home down payment");
  const [years, setYears] = useState("5");
  const pipelineStepLabels = useMemo(
    () => [
      "Processing Data...",
      "Detecting Anomalies...",
      "Generating Recommendations...",
      "Applying Fixes...",
      "Calculating Savings..."
    ],
    []
  );
  const [autoMode, setAutoMode] = useState(true);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStepIndex, setPipelineStepIndex] = useState(-1);
  const [pipelineVisibleSteps, setPipelineVisibleSteps] = useState([]);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);
  const pipelineTimerRef = useRef(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const [chatQuery, setChatQuery] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  useEffect(() => {
    return () => {
      if (pipelineTimerRef.current) {
        window.clearInterval(pipelineTimerRef.current);
        pipelineTimerRef.current = null;
      }
    };
  }, []);
  const parsed = useMemo(() => {
    const incomeValue = Number(income);
    const expensesValue = Number(expenses);
    const savingsValue = Number(savings);
    const yearsValue = Number(years);
    return {
      incomeValue,
      expensesValue,
      savingsValue,
      yearsValue
    };
  }, [income, expenses, savings, years]);
  async function handleAnalyzeSubmit(e) {
    e.preventDefault();
    setAnalysisError(null);
    const goalValue = goal.trim();
    if (!goalValue) {
      setAnalysisError("Goal is required.");
      return;
    }
    if (!Number.isFinite(parsed.incomeValue) || parsed.incomeValue <= 0) {
      setAnalysisError("Income must be a positive number.");
      return;
    }
    if (!Number.isFinite(parsed.expensesValue) || parsed.expensesValue <= 0) {
      setAnalysisError("Expenses must be a positive number.");
      return;
    }
    if (!Number.isFinite(parsed.savingsValue) || parsed.savingsValue < 0) {
      setAnalysisError("Savings must be 0 or more.");
      return;
    }
    if (!Number.isFinite(parsed.yearsValue) || parsed.yearsValue <= 0) {
      setAnalysisError("Years must be a positive number.");
      return;
    }
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/analyze-finance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income: parsed.incomeValue,
          expenses: parsed.expensesValue,
          savings: parsed.savingsValue,
          goal: goalValue,
          years: Math.round(parsed.yearsValue)
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      setAnalysis(data);
      setAnalysisVersion((v) => v + 1);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to analyze finance.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage) ? `API not reachable. Start the backend on ${API_BASE_URL}.` : rawMessage;
      setAnalysisError(message);
    } finally {
      setAnalysisLoading(false);
    }
  }
  async function handleChatSubmit(e) {
    e.preventDefault();
    setChatError(null);
    const query = chatQuery.trim();
    if (!query) return;
    setChatLoading(true);
    setChatQuery("");
    setChatMessages((prev) => [...prev, { role: "user", content: query }]);
    try {
      const tryNewContract = async () => fetch(`${API_BASE_URL}/ai-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const tryLegacyContract = async () => fetch(`${API_BASE_URL}/ai-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          income: Number.isFinite(parsed.incomeValue) && parsed.incomeValue > 0 ? parsed.incomeValue : 1,
          expenses: Number.isFinite(parsed.expensesValue) && parsed.expensesValue >= 0 ? parsed.expensesValue : 0
        })
      });
      let res = await tryNewContract();
      if (res.status === 422) {
        res = await tryLegacyContract();
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      const advice = String(data?.advice ?? data?.answer ?? "").trim();
      if (!advice) throw new Error("Empty response from AI.");
      setChatMessages((prev) => [...prev, { role: "assistant", content: advice }]);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to get AI advice.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage) ? `API not reachable. Start the backend on ${API_BASE_URL}.` : rawMessage;
      setChatError(message);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry \u2014 I couldn't fetch advice right now." }]);
    } finally {
      setChatLoading(false);
    }
  }
  async function handleRunPipeline() {
    if (pipelineRunning) return;
    if (!canAccessFeature("automation", plan)) {
      setUpgradeOpen(true);
      return;
    }
    setPipelineError(null);
    setPipelineResult(null);
    setPipelineRunning(true);
    setPipelineStepIndex(0);
    setPipelineVisibleSteps([pipelineStepLabels[0]]);
    if (pipelineTimerRef.current) {
      window.clearInterval(pipelineTimerRef.current);
      pipelineTimerRef.current = null;
    }
    pipelineTimerRef.current = window.setInterval(() => {
      setPipelineStepIndex((prev) => {
        const next = prev < 0 ? 0 : Math.min(prev + 1, pipelineStepLabels.length - 1);
        setPipelineVisibleSteps((current) => {
          const nextLabel = pipelineStepLabels[next];
          if (!nextLabel) return current;
          return current.includes(nextLabel) ? current : [...current, nextLabel];
        });
        return next;
      });
    }, 900);
    try {
      const res = await fetch(`${API_BASE_URL}/run-ai-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ mode: autoMode ? "auto" : "manual" })
      });
      if (res.status === 401) {
        setPipelineError("Session expired. Please login again");
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      setPipelineResult(data);
      setPipelineStepIndex(pipelineStepLabels.length);
      setPipelineVisibleSteps(pipelineStepLabels);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to run pipeline.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage) ? `API not reachable. Start the backend on ${API_BASE_URL}.` : rawMessage;
      setPipelineError(message);
    } finally {
      setPipelineRunning(false);
      if (pipelineTimerRef.current) {
        window.clearInterval(pipelineTimerRef.current);
        pipelineTimerRef.current = null;
      }
    }
  }
  return <div className="space-y-8">
      <UpgradeRequiredDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        onUpgrade={() => navigate("/app/membership")}
      />
      <div className="rounded-2xl border bg-card p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="relative">
          <h1 className="text-foreground" style={{ fontWeight: 800, fontSize: "1.5rem" }}>
            AI Personal Finance Advisor
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.9rem" }}>
            Enter your numbers, get real-time insights, and chat with your AI advisor.
          </p>
        </div>
      </div>

      {
    /* AutoCost AI Pipeline */
  }
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>AutoCost AI</CardTitle>
              <CardDescription style={{ fontSize: "0.85rem" }}>
                Single-click enterprise cost optimization automation.
              </CardDescription>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
    checked={autoMode}
    onCheckedChange={(v) => setAutoMode(Boolean(v))}
    disabled={pipelineRunning}
  />
                <span className="text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                  {autoMode ? "Auto mode" : "Manual mode"}
                </span>
              </div>

              <Button onClick={handleRunPipeline} disabled={pipelineRunning}>
                {pipelineRunning ? <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running…
                  </span> : "Run Full AI Pipeline"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {pipelineError ? <Alert variant="destructive" className="animate-in fade-in-0 duration-200">
              <AlertTitle>Pipeline failed</AlertTitle>
              <AlertDescription>{pipelineError}</AlertDescription>
            </Alert> : null}

          {pipelineRunning || pipelineResult || pipelineError ? <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-foreground mb-3" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                Pipeline Progress
              </p>
              <div className="space-y-2">
                {pipelineStepLabels.map((label, idx) => {
    const isVisible = pipelineVisibleSteps.includes(label);
    const isDone = pipelineResult ? true : pipelineStepIndex > idx;
    const isActive = pipelineRunning && pipelineStepIndex === idx;
    if (!isVisible && !pipelineResult) return null;
    return <div key={label} className="flex items-center gap-2 text-sm">
                      {isDone ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4" />}
                      <span style={{ fontWeight: isActive ? 700 : 600 }}>
                        {label}
                      </span>
                    </div>;
  })}
              </div>
            </div> : null}

          {pipelineResult ? <div className="space-y-6 animate-in fade-in-0 duration-300">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <MetricCard
    label="Total Cost Before"
    value={formatINR(pipelineResult.total_before)}
    hint="Baseline spend"
  />
                <MetricCard
    label="Total Cost After"
    value={formatINR(pipelineResult.total_after)}
    hint="After fixes"
  />
                <Card className="rounded-2xl transition-colors hover:bg-accent/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm" style={{ fontWeight: 700 }}>
                      Savings (₹)
                    </CardTitle>
                    <CardDescription className="text-xs" style={{ fontSize: "0.8rem" }}>
                      Highlighted impact
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl text-green-600" style={{ fontWeight: 800 }}>
                      {formatINR(pipelineResult.savings)}
                    </div>
                  </CardContent>
                </Card>
                <MetricCard
    label="Anomalies Detected"
    value={String(pipelineResult.anomalies.length)}
    hint="Duplicates, spikes, high costs"
  />
                <MetricCard
    label="AI Confidence Score (%)"
    value={pipelineResult.ai_confidence_score != null ? `${pipelineResult.ai_confidence_score.toFixed(2)}%` : "\u2014"}
    hint="Average confidence"
  />
              </div>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Before vs After</CardTitle>
                  <CardDescription style={{ fontSize: "0.85rem" }}>
                    Cost comparison for the full dataset.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
    data={[
      { name: "Before", cost: pipelineResult.total_before },
      { name: "After", cost: pipelineResult.total_after }
    ]}
    barGap={8}
  >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                        <YAxis
    tick={{ fontSize: 11, fill: "#9CA3AF" }}
    tickLine={false}
    axisLine={false}
    tickFormatter={(v) => `${Math.round(v / 1e3)}k`}
  />
                        <Tooltip
    formatter={(v) => formatINR(Number(v))}
    contentStyle={{ borderRadius: 12, borderColor: "#eee" }}
  />
                        <Bar dataKey="cost" name="Total Cost" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Anomalies</CardTitle>
                  <CardDescription style={{ fontSize: "0.85rem" }}>
                    Highlighted in red for quick review.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Expected Savings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipelineResult.anomalies.map((a) => <TableRow key={`${a.record_id}-${a.type}`} className="bg-red-50/60">
                          <TableCell className="text-red-600" style={{ fontWeight: 700 }}>
                            {a.type}
                          </TableCell>
                          <TableCell className="text-red-600">{a.service}</TableCell>
                          <TableCell className="text-red-600">{a.date}</TableCell>
                          <TableCell className="text-red-600">{a.owner}</TableCell>
                          <TableCell className="text-red-600" style={{ fontWeight: 700 }}>
                            {formatINR(a.cost_inr)}
                          </TableCell>
                          <TableCell className="text-red-600">{Math.round(a.confidence_score * 100)}%</TableCell>
                          <TableCell className="text-red-600" style={{ fontWeight: 700 }}>
                            {formatINR(a.expected_savings)}
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Actions Applied</CardTitle>
                  <CardDescription style={{ fontSize: "0.85rem" }}>
                    Automation outputs from the pipeline.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Record</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Savings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipelineResult.actions.length === 0 ? <TableRow>
                          <TableCell colSpan={3} className="text-muted-foreground">
                            No actions applied (manual mode).
                          </TableCell>
                        </TableRow> : pipelineResult.actions.map((x, idx) => <TableRow key={`${x.record_id}-${idx}`}>
                            <TableCell style={{ fontWeight: 700 }}>{x.record_id}</TableCell>
                            <TableCell>{x.action_taken}</TableCell>
                            <TableCell className="text-green-600" style={{ fontWeight: 700 }}>
                              {formatINR(x.savings_generated)}
                            </TableCell>
                          </TableRow>)}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Audit Logs</CardTitle>
                  <CardDescription style={{ fontSize: "0.85rem" }}>
                    Timestamped actions for traceability.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Savings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipelineResult.logs.length === 0 ? <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground">
                            No audit logs (manual mode).
                          </TableCell>
                        </TableRow> : pipelineResult.logs.map((l, idx) => <TableRow key={`${l.timestamp}-${idx}`}>
                            <TableCell>{new Date(l.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{l.issue}</TableCell>
                            <TableCell>{l.action_taken}</TableCell>
                            <TableCell className="text-green-600" style={{ fontWeight: 700 }}>
                              {formatINR(l.savings_generated)}
                            </TableCell>
                          </TableRow>)}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {
    /* Input Section */
  }
        <Card className="lg:col-span-4 rounded-2xl">
          <CardHeader>
            <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Financial Inputs</CardTitle>
            <CardDescription style={{ fontSize: "0.85rem" }}>
              Update values and run analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyzeSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="income">Income (monthly)</Label>
                <Input
    id="income"
    type="number"
    inputMode="decimal"
    min={0}
    value={income}
    onChange={(e) => setIncome(e.target.value)}
    placeholder="e.g., 80000"
  />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expenses">Expenses (monthly)</Label>
                <Input
    id="expenses"
    type="number"
    inputMode="decimal"
    min={0}
    value={expenses}
    onChange={(e) => setExpenses(e.target.value)}
    placeholder="e.g., 45000"
  />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="savings">Savings (current)</Label>
                <Input
    id="savings"
    type="number"
    inputMode="decimal"
    min={0}
    value={savings}
    onChange={(e) => setSavings(e.target.value)}
    placeholder="e.g., 200000"
  />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="goal">Goal</Label>
                <Textarea
    id="goal"
    value={goal}
    onChange={(e) => setGoal(e.target.value)}
    placeholder="e.g., Build a ₹10L emergency fund in 2 years"
  />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="years">Years</Label>
                <Input
    id="years"
    type="number"
    inputMode="numeric"
    min={1}
    value={years}
    onChange={(e) => setYears(e.target.value)}
    placeholder="e.g., 5"
  />
              </div>

              {analysisError ? <Alert variant="destructive" className="animate-in fade-in-0 duration-200">
                  <AlertTitle>Analysis failed</AlertTitle>
                  <AlertDescription>{analysisError}</AlertDescription>
                </Alert> : null}

              <Button type="submit" className="w-full" disabled={analysisLoading}>
                {analysisLoading ? <Spinner label="Analyzing" /> : "Analyze Finance"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {
    /* Output Section */
  }
        <div className="lg:col-span-8 space-y-6">
          <div
    key={analysisVersion}
    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in-0 duration-300"
  >
            <MetricCard
    label="Health Score"
    value={analysis ? `${analysis.health_score} / 100` : "\u2014"}
    hint="Overall money health"
  />
            <MetricCard
    label="Savings Rate"
    value={analysis ? `${analysis.savings_rate.toFixed(2)}%` : "\u2014"}
    hint="Income minus expenses"
  />
            <MetricCard
    label="Emergency Fund"
    value={analysis ? `${analysis.emergency_fund_months.toFixed(2)} months` : "\u2014"}
    hint="Savings buffer"
  />
            <MetricCard
    label="SIP Recommendation"
    value={analysis ? `${formatINR(analysis.sip_recommendation)} / month` : "\u2014"}
    hint="Suggested monthly investing"
  />
            <MetricCard
    label="Investment Projection"
    value={analysis ? formatINR(analysis.investment_projection) : "\u2014"}
    hint="Projected wealth at horizon"
  />
          </div>

          <Card
    key={analysisVersion}
    className="rounded-2xl overflow-hidden border-primary/20 bg-primary/5 animate-in fade-in-0 duration-300"
  >
            <CardHeader className="pb-3">
              <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Advisor Notes</CardTitle>
              <CardDescription style={{ fontSize: "0.85rem" }}>
                Actionable guidance based on your inputs.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-foreground whitespace-pre-line" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                {analysis?.advice || "Run an analysis to see your personalized advice."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {
    /* AI Chat Section */
  }
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>AI Chat</CardTitle>
          <CardDescription style={{ fontSize: "0.85rem" }}>
            Ask anything about saving, investing, goals, or budgeting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {chatError ? <Alert variant="destructive" className="animate-in fade-in-0 duration-200">
              <AlertTitle>Chat failed</AlertTitle>
              <AlertDescription>{chatError}</AlertDescription>
            </Alert> : null}

          <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {chatMessages.length === 0 ? <div className="text-muted-foreground text-sm">
                Start by asking: "How do I reduce expenses without sacrificing lifestyle?"
              </div> : null}

            {chatMessages.map((m, idx) => <div
    key={`${idx}-${m.role}`}
    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in-0 duration-200`}
  >
                <div
    className={m.role === "user" ? "max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm" : "max-w-[85%] rounded-2xl bg-muted text-foreground px-4 py-3 text-sm"}
  >
                  {m.content}
                </div>
              </div>)}

            {chatLoading ? <div className="flex justify-start animate-in fade-in-0 duration-200">
                <div className="max-w-[85%] rounded-2xl bg-muted text-foreground px-4 py-3 text-sm">
                  <Spinner label="Thinking" />
                </div>
              </div> : null}
          </div>

          <form onSubmit={handleChatSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
    value={chatQuery}
    onChange={(e) => setChatQuery(e.target.value)}
    placeholder="Type your question..."
    disabled={chatLoading}
  />
            <Button type="submit" disabled={chatLoading || !chatQuery.trim()} className="sm:w-36">
              {chatLoading ? "Sending" : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>;
}
export {
  Dashboard
};
