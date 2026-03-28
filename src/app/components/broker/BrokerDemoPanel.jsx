import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Loader2 } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDemoAuditLog } from "../../lib/demoAudit";
import { DemoPaymentGatewayDialog } from "../payment/DemoPaymentGatewayDialog";
import { UpgradeRequiredDialog } from "../membership/UpgradeRequiredDialog";
import { useAuth } from "../../context/AuthContext";
import { useMembership } from "../../context/MembershipContext";
import { canAccessFeature } from "../../lib/membershipAccess";
const STOCK_TO_SECTOR = {
  RELIANCE: "Energy",
  TCS: "IT",
  INFY: "IT",
  HDFCBANK: "Banking",
  ICICIBANK: "Banking",
  SBIN: "Banking",
  ITC: "FMCG",
  HINDUNILVR: "FMCG"
};
const LOCAL_DEMO_PORTFOLIO = {
  user: "Demo User",
  portfolio: [
    { stock: "RELIANCE", quantity: 10, price: 2480 },
    { stock: "TCS", quantity: 6, price: 3725 },
    { stock: "INFY", quantity: 12, price: 1488 },
    { stock: "HDFCBANK", quantity: 8, price: 1620 }
  ],
  total_value: 0
};
const RESET_TOKEN_KEY = "demo_reset_token";
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
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </span>;
}
function MetricCard({ label, value, hint, valueClassName }) {
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
        <div className={valueClassName ?? "text-2xl"} style={{ fontWeight: 800 }}>
          {value}
        </div>
      </CardContent>
    </Card>;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function jitterPct() {
  return (Math.random() - 0.5) * 0.014;
}
function seedHistory(base, points = 12) {
  const now = Date.now();
  let p = Number.isFinite(base) && base > 0 ? base : 100;
  const out = [];
  for (let i = points - 1; i >= 0; i--) {
    const t = new Date(now - i * 2e3).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    p = p * (1 + (Math.random() - 0.5) * 0.01);
    out.push({ t, price: Math.round(clamp(p, 1, 1e6) * 100) / 100 });
  }
  return out;
}
function BrokerDemoPanel({ apiBaseUrl }) {
  const navigate = useNavigate();
  const { user, authHeaders, logout } = useAuth();
  const { plan } = useMembership();
  const [status, setStatus] = useState("disconnected");
  const [portfolio, setPortfolio] = useState(null);
  const [connectError, setConnectError] = useState(null);
  const [connectNotice, setConnectNotice] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brokerBalance, setBrokerBalance] = useState(0);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const availableStocks = useMemo(
    () => ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC", "HINDUNILVR"],
    []
  );
  const [selectedStock, setSelectedStock] = useState("RELIANCE");
  const basePrices = useMemo(
    () => ({
      RELIANCE: 2500,
      TCS: 3800,
      INFY: 1500,
      HDFCBANK: 1650,
      ICICIBANK: 1150,
      SBIN: 780,
      ITC: 430,
      HINDUNILVR: 2450
    }),
    []
  );
  const [pricesByStock, setPricesByStock] = useState({});
  const [history, setHistory] = useState([]);
  const timerRef = useRef(null);
  const pricesRef = useRef({});
  const didAutoLoadRef = useRef(false);
  function applyResetView() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("disconnected");
    setConnectError(null);
    setConnectNotice(null);
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(false);
    setLoading(false);
    setPortfolio({
      user: "Demo User",
      portfolio: availableStocks.map((s) => ({ stock: s, quantity: 0, price: 0 })),
      total_value: 0
    });
    setPricesByStock(() => {
      const next = {};
      for (const s of availableStocks) next[s] = 0;
      return next;
    });
    setHistory([]);
    setBrokerBalance(0);
  }
  async function refreshBrokerBalance() {
    try {
      const res = await fetch(`${apiBaseUrl}/balance`, {
        headers: { ...authHeaders() }
      });
      if (res.status === 401) {
        setConnectError("Session expired. Please login again");
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      const parsed = data;
      setBrokerBalance(Number(parsed.balance) || 0);
    } catch {
    }
  }
  const portfolioRows = useMemo(() => {
    if (!portfolio) return [];
    return portfolio.portfolio.map((x) => ({
      ...x,
      total: (Number(x.quantity) || 0) * (Number(x.price) || 0),
      sector: STOCK_TO_SECTOR[String(x.stock).toUpperCase()] || "Other"
    }));
  }, [portfolio]);
  const profitLoss = useMemo(() => {
    if (!portfolio) return 0;
    const rows = portfolio.portfolio;
    let pl = 0;
    for (const r of rows) {
      const avg = Number(r.price) || 0;
      const cur = pricesByStock[String(r.stock).toUpperCase()] ?? avg;
      pl += (cur - avg) * (Number(r.quantity) || 0);
    }
    return Math.round(pl);
  }, [portfolio, pricesByStock]);
  const totalPortfolioValue = useMemo(() => {
    if (!portfolio) return 0;
    let total = 0;
    for (const r of portfolio.portfolio) {
      const avg = Number(r.price) || 0;
      const cur = pricesByStock[String(r.stock).toUpperCase()] ?? avg;
      total += cur * (Number(r.quantity) || 0);
    }
    return Math.round(total);
  }, [portfolio, pricesByStock]);
  const todaysChangePct = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0]?.price;
    const last = history[history.length - 1]?.price;
    if (!first || !last) return null;
    return (last - first) / first * 100;
  }, [history]);
  const currentSelectedPrice = useMemo(() => {
    const p = pricesByStock[selectedStock];
    return Number.isFinite(p) ? p : basePrices[selectedStock];
  }, [pricesByStock, selectedStock, basePrices]);
  useEffect(() => {
    pricesRef.current = pricesByStock;
  }, [pricesByStock]);
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    const base = pricesRef.current[selectedStock] ?? basePrices[selectedStock];
    setHistory(seedHistory(base, 12));
  }, [selectedStock, basePrices]);
  useEffect(() => {
    if (status !== "connected") return;
    const schedule = () => {
      const nextMs = 2e3 + Math.floor(Math.random() * 3e3);
      timerRef.current = window.setTimeout(() => {
        let nextSelected = pricesRef.current[selectedStock] ?? basePrices[selectedStock];
        setPricesByStock((prev) => {
          const next = { ...prev };
          for (const stock of availableStocks) {
            const cur = Number(next[stock] ?? basePrices[stock]);
            const updated = cur * (1 + jitterPct());
            next[stock] = Math.round(clamp(updated, 1, 1e6) * 100) / 100;
          }
          nextSelected = Number(next[selectedStock] ?? nextSelected);
          return next;
        });
        setHistory((prev) => {
          const now = /* @__PURE__ */ new Date();
          const lastPrice = prev.length ? prev[prev.length - 1].price : basePrices[selectedStock];
          const safeNext = Number.isFinite(nextSelected) && nextSelected > 0 ? nextSelected : lastPrice * (1 + jitterPct());
          const point = {
            t: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            price: Math.round(clamp(safeNext, 1, 1e6) * 100) / 100
          };
          const next = [...prev, point];
          return next.length > 30 ? next.slice(next.length - 30) : next;
        });
        schedule();
      }, nextMs);
    };
    schedule();
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, availableStocks, basePrices, selectedStock]);
  function applyPortfolioAndStartLive(data, modeNotice) {
    setPortfolio(data);
    setStatus("connected");
    setConnectNotice(modeNotice ?? null);
    setLoading(false);
    setPricesByStock(() => {
      const next = {};
      for (const stock of availableStocks) {
        const found = data?.portfolio?.find((x) => String(x.stock).toUpperCase() === stock);
        const avg = found ? Number(found.price) : basePrices[stock];
        next[stock] = Number.isFinite(avg) && avg > 0 ? avg : basePrices[stock];
      }
      return next;
    });
    const base = data?.portfolio?.find((x) => String(x.stock).toUpperCase() === selectedStock)?.price ?? basePrices[selectedStock];
    setHistory(seedHistory(Number(base), 12));
  }
  async function connectBrokerDemo(options) {
    if (status === "connecting") return;
    setConnectError(null);
    setConnectNotice(null);
    setAnalysisError(null);
    setAnalysis(null);
    setPortfolio(null);
    setStatus("connecting");
    setLoading(true);
    try {
      const delayMs = options?.isAuto ? 250 : 1100;
      if (delayMs > 0) await new Promise((r) => window.setTimeout(r, delayMs));
      const res = await fetch(`${apiBaseUrl}/portfolio`, {
        headers: { ...authHeaders() }
      });
      if (res.status === 401) {
        setConnectError("Session expired. Please login again");
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      const parsed = data;
      const brokerResponse = {
        user: user?.email ?? "Demo User",
        portfolio: Array.isArray(parsed.portfolio) ? parsed.portfolio : [],
        total_value: 0
      };
      applyPortfolioAndStartLive(brokerResponse);
      void refreshBrokerBalance();
      addDemoAuditLog({ category: "broker", message: "Connected demo broker and loaded portfolio" });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to connect broker.";
      if (/Failed to fetch|NetworkError/i.test(rawMessage)) {
        const local = {
          ...LOCAL_DEMO_PORTFOLIO,
          total_value: LOCAL_DEMO_PORTFOLIO.portfolio.reduce((sum, x) => sum + x.quantity * x.price, 0)
        };
        applyPortfolioAndStartLive(local, `Backend not reachable on ${apiBaseUrl}. Showing local demo portfolio.`);
        setBrokerBalance(0);
        addDemoAuditLog({ category: "broker", message: "Backend unreachable; loaded local demo portfolio" });
        return;
      }
      setConnectError(rawMessage);
      setStatus("disconnected");
      setLoading(false);
    }
  }
  async function runPortfolioAnalysis() {
    if (!canAccessFeature("analyze_portfolio", plan)) {
      setUpgradeOpen(true);
      return;
    }
    if (!portfolio || analysisLoading) return;
    setAnalysisError(null);
    setAnalysis(null);
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/analyze-portfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ portfolio: portfolio.portfolio })
      });
      if (res.status === 401) {
        setAnalysisError("Session expired. Please login again");
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      setAnalysis(data);
      addDemoAuditLog({ category: "advisor", message: "Ran demo portfolio AI analysis" });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to analyze portfolio.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage) ? `API not reachable. Start the backend on ${apiBaseUrl}.` : rawMessage;
      setAnalysisError(message);
    } finally {
      setAnalysisLoading(false);
    }
  }
  useEffect(() => {
    if (didAutoLoadRef.current) return;
    didAutoLoadRef.current = true;
    const resetToken = localStorage.getItem(RESET_TOKEN_KEY);
    if (resetToken) {
      localStorage.removeItem(RESET_TOKEN_KEY);
      applyResetView();
      console.log("BrokerDemoPanel: demo reset applied");
      return;
    }
    void connectBrokerDemo({ isAuto: true });
    console.log("BrokerDemoPanel mounted");
  }, []);
  return <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Broker Dashboard</CardTitle>
            <CardDescription style={{ fontSize: "0.85rem" }}>
              <span className="text-muted-foreground">Demo Mode – No real broker connection</span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-muted-foreground" style={{ fontWeight: 800 }}>
              Balance: {formatINR(brokerBalance)}
            </Badge>

            <Button variant="secondary" onClick={() => setAddFundsOpen(true)}>
              Add Funds
            </Button>

            <Button onClick={() => void connectBrokerDemo()} disabled={status === "connecting"}>
              {status === "connecting" ? <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting to broker...
                </span> : "Connect Broker (Demo)"}
            </Button>

            <Button
    variant="secondary"
    onClick={runPortfolioAnalysis}
    disabled={status !== "connected" || !portfolio || analysisLoading}
  >
              {analysisLoading ? <Spinner label="Analyzing portfolio..." /> : "Run AI Analysis"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <UpgradeRequiredDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          onUpgrade={() => {
            setUpgradeOpen(false);
            navigate("/app/membership");
          }}
        />

        <DemoPaymentGatewayDialog
    open={addFundsOpen}
    onOpenChange={setAddFundsOpen}
    apiBaseUrl={apiBaseUrl}
    userEmail={user?.email ?? "demo.user@example.com"}
    onBalanceUpdated={(newBal) => {
      setBrokerBalance(newBal);
      addDemoAuditLog({ category: "broker", message: `Added funds via demo payment gateway (new balance ${newBal})` });
    }}
  />

        {loading && !portfolio ? <Alert className="animate-in fade-in-0 duration-200">
            <AlertTitle>Loading dashboard…</AlertTitle>
            <AlertDescription>Fetching demo portfolio and starting live market simulation.</AlertDescription>
          </Alert> : null}

        {connectError ? <Alert variant="destructive" className="animate-in fade-in-0 duration-200">
            <AlertTitle>Broker connection failed</AlertTitle>
            <AlertDescription>{connectError}</AlertDescription>
          </Alert> : null}

        {connectNotice ? <Alert className="animate-in fade-in-0 duration-200">
            <AlertTitle>Demo data mode</AlertTitle>
            <AlertDescription>{connectNotice}</AlertDescription>
          </Alert> : null}

        {status === "connected" ? <Alert className="animate-in fade-in-0 duration-200">
            <AlertTitle>Broker connected successfully ✅</AlertTitle>
            <AlertDescription>
              Portfolio loaded for <span style={{ fontWeight: 700 }}>{portfolio?.user ?? "Demo User"}</span>.
            </AlertDescription>
          </Alert> : null}

        {portfolio ? <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total Portfolio Value (₹)" value={formatINR(totalPortfolioValue)} hint="Live simulation" />
              <MetricCard
    label="Total Profit/Loss"
    value={formatINR(profitLoss)}
    hint="Color-coded"
    valueClassName={profitLoss >= 0 ? "text-2xl text-green-600" : "text-2xl text-red-600"}
  />
              <MetricCard
    label="Today's Change (%)"
    value={todaysChangePct == null ? "\u2014" : `${todaysChangePct >= 0 ? "+" : ""}${todaysChangePct.toFixed(2)}%`}
    hint="Based on selected stock"
    valueClassName={todaysChangePct != null && todaysChangePct >= 0 ? "text-2xl text-green-600" : "text-2xl text-red-600"}
  />
              <MetricCard
    label="AI Confidence (%)"
    value={analysis?.confidence_score != null ? `${analysis.confidence_score.toFixed(0)}%` : "\u2014"}
    hint="After AI analysis"
  />
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="rounded-2xl lg:col-span-7">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Live Stock Chart</CardTitle>
                      <CardDescription style={{ fontSize: "0.85rem" }}>
                        Live Market Simulation (Demo Mode)
                      </CardDescription>
                    </div>
                    <div className="w-full sm:w-56">
                      <Select value={selectedStock} onValueChange={(v) => setSelectedStock(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stock" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStocks.map((s) => <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" style={{ fontWeight: 800 }}>
                      Current price: {formatINR(currentSelectedPrice)}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      Updates every 2–5 seconds
                    </Badge>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ left: 6, right: 16, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                        <YAxis
    tick={{ fontSize: 10, fill: "#9CA3AF" }}
    tickLine={false}
    axisLine={false}
    domain={["dataMin - 10", "dataMax + 10"]}
  />
                        <Tooltip
    formatter={(v) => formatINR(Number(v))}
    contentStyle={{ borderRadius: 12, borderColor: "#eee" }}
  />
                        <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl lg:col-span-5">
                <CardHeader>
                  <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Portfolio</CardTitle>
                  <CardDescription style={{ fontSize: "0.85rem" }}>Holdings with live P/L (demo).</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stock</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Avg Price</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Profit/Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portfolioRows.map((row) => {
    const stock = String(row.stock).toUpperCase();
    const avg = Number(row.price) || 0;
    const cur = pricesByStock[stock] ?? avg;
    const pl = Math.round((cur - avg) * (Number(row.quantity) || 0));
    return <TableRow key={stock}>
                            <TableCell style={{ fontWeight: 800 }}>{stock}</TableCell>
                            <TableCell>{row.sector}</TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>{formatINR(avg)}</TableCell>
                            <TableCell style={{ fontWeight: 700 }}>{formatINR(cur)}</TableCell>
                            <TableCell
      className={pl >= 0 ? "text-green-600" : "text-red-600"}
      style={{ fontWeight: 900 }}
    >
                              {formatINR(pl)}
                            </TableCell>
                          </TableRow>;
  })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {analysisError ? <Alert variant="destructive" className="animate-in fade-in-0 duration-200">
                <AlertTitle>AI analysis failed</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert> : null}

            {analysis ? <div className="grid gap-4 lg:grid-cols-12 animate-in fade-in-0 duration-300">
                <Card className="rounded-2xl lg:col-span-4">
                  <CardHeader className="pb-3">
                    <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Estimated Gain (₹)</CardTitle>
                    <CardDescription style={{ fontSize: "0.85rem" }}>Simulated upside from rebalancing.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl text-green-600" style={{ fontWeight: 900 }}>
                      {formatINR(analysis.estimated_gain)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl lg:col-span-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-red-600" style={{ fontWeight: 900, fontSize: "1rem" }}>
                      Risk Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(analysis.risks.length ? analysis.risks : ["No major risks detected (demo)."]).slice(0, 6).map((x, idx) => <div key={`${idx}-${x}`} className="text-sm text-red-600" style={{ fontWeight: 800 }}>
                          • {x}
                        </div>)}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl lg:col-span-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-blue-600" style={{ fontWeight: 900, fontSize: "1rem" }}>
                      Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.suggestions.slice(0, 6).map((x, idx) => <div key={`${idx}-${x}`} className="text-sm text-blue-600" style={{ fontWeight: 800 }}>
                        • {x}
                      </div>)}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl lg:col-span-12">
                  <CardHeader className="pb-3">
                    <CardTitle style={{ fontWeight: 900, fontSize: "1rem" }}>Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2">
                    {analysis.opportunities.slice(0, 6).map((x, idx) => <div key={`${idx}-${x}`} className="text-sm" style={{ fontWeight: 800 }}>
                        • {x}
                      </div>)}
                  </CardContent>
                </Card>
              </div> : null}
          </div> : null}
      </CardContent>
    </Card>;
}
export {
  BrokerDemoPanel
};
