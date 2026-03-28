import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { addDemoAuditLog } from "../lib/demoAudit";
import { useAuth } from "../context/AuthContext";
import { useMembership } from "../context/MembershipContext";
import { API_BASE_URL } from "../lib/apiBaseUrl";
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
function SipPlanner() {
  const navigate = useNavigate();
  const { authHeaders, logout } = useAuth();
  const { plan } = useMembership();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const today = useMemo(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), []);
  const [amountPerDay, setAmountPerDay] = useState("200");
  const [investmentType, setInvestmentType] = useState("mutual_funds");
  const [startDate, setStartDate] = useState(today);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [runInfo, setRunInfo] = useState(null);
  async function refreshStatus() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sip/status`, {
        headers: { ...authHeaders() }
      });
      if (res.status === 401) {
        setError("Session expired. Please login again");
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      setStatus(data);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to load SIP status.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage) ? `API not reachable. Start the backend on ${API_BASE_URL}.` : rawMessage;
      setError(message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refreshStatus();
  }, []);
  async function handleCreateSip(e) {
    e.preventDefault();
    setError(null);
    setRunInfo(null);
    const amount = Number(amountPerDay);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount per day must be a positive number.");
      return;
    }
    if (String(plan || "free").toLowerCase() === "free" && amount > 100) {
      setUpgradeOpen(true);
      return;
    }
    if (!startDate.trim()) {
      setError("Start date is required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sip/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({
          amount_per_day: amount,
          investment_type: investmentType,
          start_date: startDate.trim()
        })
      });
      if (res.status === 401) {
        setError("Session expired. Please login again");
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      setStatus(data);
      addDemoAuditLog({ category: "sip", message: `Created demo SIP: \u20B9${amount}/day (${investmentType})` });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to create SIP.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage) ? `API not reachable. Start the backend on ${API_BASE_URL}.` : rawMessage;
      setError(message);
    } finally {
      setCreating(false);
    }
  }
  async function handleRunDaily() {
    if (running) return;
    setError(null);
    setRunInfo(null);
    setRunning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sip/run`, {
        method: "POST",
        headers: { ...authHeaders() }
      });
      if (res.status === 401) {
        setError("Session expired. Please login again");
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      const payload = data;
      setStatus(payload.status);
      const run = payload.run || {};
      setRunInfo(
        `Day ${run.day ?? payload.status.days_completed}: invested ${formatINR(Number(run.invested ?? 0))} at price ${formatINR(Number(run.price ?? 0))}`
      );
      addDemoAuditLog({ category: "sip", message: "Ran daily SIP simulation" });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to run daily SIP.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage) ? `API not reachable. Start the backend on ${API_BASE_URL}.` : rawMessage;
      setError(message);
    } finally {
      setRunning(false);
    }
  }
  return <div className="space-y-8">
      <UpgradeRequiredDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        onUpgrade={() => navigate("/app/membership")}
      />
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Daily SIP Planner</CardTitle>
          <CardDescription style={{ fontSize: "0.85rem" }}>
            Demo Mode – No real money deducted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSip} className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount per day (₹)</Label>
              <Input
    id="amount"
    type="number"
    inputMode="decimal"
    min={1}
    value={amountPerDay}
    onChange={(e) => setAmountPerDay(e.target.value)}
    placeholder="e.g., 200"
  />
            </div>

            <div className="grid gap-2">
              <Label>Investment type</Label>
              <Select value={investmentType} onValueChange={(v) => setInvestmentType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="mutual_funds">Mutual funds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="sm:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating\u2026" : "Create SIP"}
              </Button>
              <Button type="button" variant="secondary" disabled={running || !status} onClick={handleRunDaily}>
                {running ? "Running\u2026" : "Run Daily SIP (Demo)"}
              </Button>
            </div>
          </form>

          {error ? <Alert variant="destructive" className="mt-4">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert> : null}

          {runInfo ? <Alert className="mt-4">
              <AlertTitle>Daily SIP executed</AlertTitle>
              <AlertDescription>{runInfo}</AlertDescription>
            </Alert> : null}

          {loading ? <div className="mt-4 text-sm text-muted-foreground">Loading SIP status…</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total invested" value={status ? formatINR(status.total_invested) : formatINR(0)} />
        <MetricCard label="Current value" value={status ? formatINR(status.current_value) : formatINR(0)} />
        <Card className="rounded-2xl transition-colors hover:bg-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm" style={{ fontWeight: 700 }}>Profit / Loss</CardTitle>
            <CardDescription className="text-xs" style={{ fontSize: "0.8rem" }}>Simulated mark-to-market</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div
    className={status ? status.profit_loss >= 0 ? "text-2xl text-green-600" : "text-2xl text-red-600" : "text-2xl text-green-600"}
    style={{ fontWeight: 800 }}
  >
              {status ? formatINR(status.profit_loss) : formatINR(0)}
            </div>
          </CardContent>
        </Card>
        <MetricCard label="Days completed" value={status ? String(status.days_completed) : "0"} />
      </div>

      {status ? <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Status</CardTitle>
            <CardDescription style={{ fontSize: "0.85rem" }}>
              Current price: {formatINR(status.current_price)} · Units: {status.total_units.toFixed(4)}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This is a simulation only. No money is deducted and no orders are placed.
          </CardContent>
        </Card> : <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>No SIP created</CardTitle>
            <CardDescription style={{ fontSize: "0.85rem" }}>Create a SIP to start the simulation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={refreshStatus}>
              Refresh
            </Button>
          </CardContent>
        </Card>}
    </div>;
}
export {
  SipPlanner
};
