// @ts-nocheck
// Canonical implementation lives in AIAdvisorValidated.jsx; this file forwards to it.
export { AIAdvisorValidated } from "./AIAdvisorValidated.jsx";

/*

import { type FormEvent, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { addDemoAuditLog } from "../lib/demoAudit";
import { useAuth } from "../context/AuthContext";

import { API_BASE_URL } from "../lib/apiBaseUrl";

type AdvisorResponse = {
  monthly_savings: number;
  investment_allocation: {
    sip: number;
    emergency: number;
    buffer: number;
  };
  daily_sip_plan: Array<{
    plan: "Conservative" | "Balanced" | "Aggressive";
    amount_per_day: number;
    type: string;
  }>;
  broker_check: string;
  broker_balance: number;
  warning?: string | null;
  advice: string;
  risk_level: "Low" | "Medium" | "High";
  confidence: number;
};

function riskVariant(risk: AdvisorResponse["risk_level"]) {
  if (risk === "High") return { className: "bg-red-50 text-red-600 border-red-200" };
  if (risk === "Medium") return { className: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  return { className: "bg-green-50 text-green-600 border-green-200" };
}

*/

export function AIAdvisorValidated() {
  const { authHeaders } = useAuth();
  const [income, setIncome] = useState("80000");
  const [expenses, setExpenses] = useState("45000");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdvisorResponse | null>(null);

  const parsed = useMemo(() => {
    const incomeValue = Number(income);
    const expensesValue = Number(expenses);
    return { incomeValue, expensesValue };
  }, [income, expenses]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!Number.isFinite(parsed.incomeValue) || parsed.incomeValue <= 0) {
      setError("Income must be a positive number.");
      return;
    }

    if (!Number.isFinite(parsed.expensesValue) || parsed.expensesValue < 0) {
      setError("Expenses must be 0 or more.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai-sip-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          monthly_income: parsed.incomeValue,
          monthly_expenses: parsed.expensesValue,
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        const message = (data && (data.detail || data.message || data.error)) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }

      const normalized: AdvisorResponse = {
        monthly_savings: Number(data?.monthly_savings ?? 0),
        investment_allocation: {
          sip: Number(data?.investment_allocation?.sip ?? 0),
          emergency: Number(data?.investment_allocation?.emergency ?? 0),
          buffer: Number(data?.investment_allocation?.buffer ?? 0),
        },
        daily_sip_plan: Array.isArray(data?.daily_sip_plan) ? data.daily_sip_plan : [],
        broker_check: String(data?.broker_check ?? "").trim(),
        broker_balance: Number(data?.broker_balance ?? 0),
        warning: data?.warning ?? null,
        advice: String(data?.advice ?? "").trim(),
        risk_level: (data?.risk_level ?? "Low") as AdvisorResponse["risk_level"],
        confidence: Number(data?.confidence ?? 0),
      };

      if (!Number.isFinite(normalized.monthly_savings)) throw new Error("Invalid advisor response.");

      setResult(normalized);
      addDemoAuditLog({ category: "advisor", message: "Generated intelligent SIP plan (demo)" });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to get AI advice.";
      const message = /Failed to fetch|NetworkError/i.test(rawMessage)
        ? `API not reachable. Start the backend on ${API_BASE_URL}.`
        : rawMessage;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>AI Financial Advisor</CardTitle>
          <CardDescription style={{ fontSize: "0.85rem" }}>
            Demo Mode – intelligent SIP plans based on your monthly income and expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="income">Income (monthly)</Label>
                <Input id="income" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expenses">Expenses (monthly)</Label>
                <Input id="expenses" type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Advisor failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={loading}>
              {loading ? "Generating…" : "Generate SIP Plans"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <div className="grid gap-4 lg:grid-cols-12 animate-in fade-in-0 duration-300">
          <div className="lg:col-span-8">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>SIP Plan Summary</CardTitle>
                <CardDescription style={{ fontSize: "0.85rem" }}>
                  Smart allocation + daily SIP breakdown + broker balance check.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={riskVariant(result.risk_level).className}>
                    Risk: {result.risk_level}
                  </Badge>
                  <Badge variant="outline">Confidence: {Math.round(result.confidence)}%</Badge>
                  <Badge variant="outline">Broker balance: ₹{Math.round(result.broker_balance).toLocaleString("en-IN")}</Badge>
                </div>

                {result.warning ? (
                  <Alert variant="destructive">
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>{result.warning}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-3">
                      <CardTitle style={{ fontWeight: 800, fontSize: "0.95rem" }}>Monthly Savings</CardTitle>
                      <CardDescription style={{ fontSize: "0.85rem" }}>Income − expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl text-green-600" style={{ fontWeight: 900 }}>
                        ₹{Math.max(0, Math.round(result.monthly_savings)).toLocaleString("en-IN")}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader className="pb-3">
                      <CardTitle style={{ fontWeight: 800, fontSize: "0.95rem" }}>Investment Allocation</CardTitle>
                      <CardDescription style={{ fontSize: "0.85rem" }}>60% SIP · 20% emergency · 20% buffer</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground" style={{ fontWeight: 700 }}>SIP</span>
                        <span className="text-green-600" style={{ fontWeight: 900 }}>
                          ₹{Math.round(result.investment_allocation.sip).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground" style={{ fontWeight: 700 }}>Emergency fund</span>
                        <span className="text-green-600" style={{ fontWeight: 900 }}>
                          ₹{Math.round(result.investment_allocation.emergency).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground" style={{ fontWeight: 700 }}>Liquid buffer</span>
                        <span className="text-green-600" style={{ fontWeight: 900 }}>
                          ₹{Math.round(result.investment_allocation.buffer).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle style={{ fontWeight: 800, fontSize: "0.95rem" }}>Daily SIP Plans</CardTitle>
                    <CardDescription style={{ fontSize: "0.85rem" }}>
                      Daily investment options (demo). {result.broker_check}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount/day</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(result.daily_sip_plan.length ? result.daily_sip_plan : []).map((p) => (
                          <TableRow key={p.plan}>
                            <TableCell style={{ fontWeight: 800 }}>{p.plan}</TableCell>
                            <TableCell className="text-green-600" style={{ fontWeight: 900 }}>
                              ₹{Math.round(Number(p.amount_per_day ?? 0)).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell>{p.type}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <p className="whitespace-pre-line text-foreground" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                  {result.advice}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Next Steps</CardTitle>
                <CardDescription style={{ fontSize: "0.85rem" }}>
                  Run it in the SIP Planner (demo).
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Pick any plan amount/day, create a SIP in SIP Planner, and run the daily simulation to see corpus growth.
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
