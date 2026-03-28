import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../components/ui/alert-dialog";
import { useMembership } from "../context/MembershipContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiBaseUrl";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    features: ["Basic AI advisor", "Limited SIP (₹100/day max)"]
  },
  {
    key: "normal",
    name: "Normal",
    price: 1000,
    features: ["Full SIP", "Portfolio tracking", "Basic AI"]
  },
  {
    key: "silver",
    name: "Silver",
    price: 5000,
    features: ["Advanced AI insights", "Risk analysis", "Analytics"]
  },
  {
    key: "gold",
    name: "Gold",
    price: 10000,
    features: ["Full automation", "Real-time AI recommendations", "Premium features"]
  }
];

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function Membership() {
  const { plan: currentPlan, isLoading, buy } = useMembership();
  const { authHeaders, logout } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [balance, setBalance] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPlanKey, setPendingPlanKey] = useState(null);

  const currentName = useMemo(() => {
    const p = String(currentPlan || "free").toLowerCase();
    if (p === "free") return "Free";
    if (p === "normal") return "Normal";
    if (p === "silver") return "Silver";
    return "Gold";
  }, [currentPlan]);

  const pendingPlan = useMemo(() => {
    if (!pendingPlanKey) return null;
    return PLANS.find((x) => x.key === pendingPlanKey) || null;
  }, [pendingPlanKey]);

  const handleUnauthorized = async () => {
    try {
      await logout();
    } finally {
      window.alert("Session expired. Please login again");
      window.location.assign("/login");
    }
  };

  const refreshBalance = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/balance`, {
        method: "GET",
        headers: { "Content-Type": "application/json", ...authHeaders() }
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      setBalance(Number(data?.balance ?? data?.broker_balance ?? 0) || 0);
    } catch {
      // Balance is optional UI context; ignore errors.
    }
  };

  // Load available funds (best-effort) for confirmation UI.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    refreshBalance();
  }, []);

  const handleUpgrade = async (nextPlan) => {
    setError("");
    setSuccess("");
    setPendingPlanKey(nextPlan);
    setConfirmOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!pendingPlanKey) return;
    setError("");
    setSuccess("");
    const res = await buy(pendingPlanKey);
    if (!res.ok) {
      setError(res.message || "Upgrade failed");
      return;
    }
    await refreshBalance();
    const paid = pendingPlan?.price ? `₹${Number(pendingPlan.price).toLocaleString("en-IN")}` : "₹0";
    setSuccess(`Membership updated. ${paid} deducted from funds.`);
  };

  return <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Membership</h1>
          <p className="text-gray-500 mt-1" style={{ fontSize: "0.9rem" }}>
            Current Plan: <span style={{ fontWeight: 700 }}>{currentName}</span>
          </p>
        </div>
        <Badge variant={currentPlan === "free" ? "secondary" : "default"}>{currentName}</Badge>
      </div>

      {error ? <div className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
          {error}
        </div> : null}

      {success ? <div className="mb-5 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
          {success}
        </div> : null}

      <div className="mb-4 text-gray-500" style={{ fontSize: "0.9rem" }}>
        Available Funds: <span style={{ fontWeight: 800 }}>
          {balance == null ? "—" : formatINR(balance)}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => {
        const isActive = String(currentPlan || "free").toLowerCase() === p.key;
        return <Card key={p.key} className={isActive ? "border-primary" : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>{p.name}</CardTitle>
                  {isActive ? <Badge>Active</Badge> : <Badge variant="outline">Plan</Badge>}
                </div>
                <div className="text-gray-900" style={{ fontWeight: 900, fontSize: "1.4rem" }}>
                  {formatINR(p.price)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-gray-600" style={{ fontSize: "0.85rem" }}>
                  {p.features.map((f) => <li key={f}>• {f}</li>)}
                </ul>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  className="w-full"
                  variant={isActive ? "secondary" : "default"}
                  disabled={isLoading || isActive}
                  onClick={() => handleUpgrade(p.key)}
                >
                  {isActive ? "Current Plan" : "Upgrade"}
                </Button>
              </CardFooter>
            </Card>;
      })}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm upgrade</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan ? <span>
                  Upgrade to <span style={{ fontWeight: 800 }}>{pendingPlan.name}</span>.
                  This will deduct <span style={{ fontWeight: 800 }}>{formatINR(pendingPlan.price)}</span> from your available funds.
                </span> : "This will deduct funds from your balance."}
              {balance != null && pendingPlan && pendingPlan.price > 0 && Number(balance) < Number(pendingPlan.price) ? <div className="mt-2 text-red-600" style={{ fontWeight: 700 }}>
                  Insufficient funds. Please add funds to continue.
                </div> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isLoading ||
                !pendingPlanKey ||
                (balance != null && pendingPlan && pendingPlan.price > 0 && Number(balance) < Number(pendingPlan.price))
              }
              onClick={async (e) => {
                e.preventDefault();
                await handleConfirmUpgrade();
                setConfirmOpen(false);
              }}
            >
              Confirm & Pay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}

export { Membership };
