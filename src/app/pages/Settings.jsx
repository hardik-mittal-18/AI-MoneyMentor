import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { clearDemoAuditLogs } from "../lib/demoAudit";
import { API_BASE_URL } from "../lib/apiBaseUrl";
const RESET_TOKEN_KEY = "demo_reset_token";
function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  async function resetDemo() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reset-demo`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data && (data.detail || data.message || data.error) || `API request failed (${res.status})`;
        throw new Error(String(message));
      }
      clearDemoAuditLogs();
      localStorage.setItem(RESET_TOKEN_KEY, String(Date.now()));
      setSuccessOpen(true);
      navigate("/app/broker", { replace: true });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }
  return <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Settings</CardTitle>
          <CardDescription style={{ fontSize: "0.85rem" }}>
            Demo Mode – basic settings placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add preferences here (notifications, theme, security). No real broker credentials are used.
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle style={{ fontWeight: 800, fontSize: "1rem" }}>Demo Controls</CardTitle>
          <CardDescription style={{ fontSize: "0.85rem" }}>
            Reset all demo values to ₹0 for a fresh presentation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={resetDemo} disabled={loading} variant="destructive">
            {loading ? "Resetting\u2026" : "Reset Demo Data"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset completed</AlertDialogTitle>
            <AlertDialogDescription>All demo data has been reset successfully.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}
export {
  Settings
};
