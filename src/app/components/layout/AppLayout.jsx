import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router";
import { useMembership } from "../../context/MembershipContext";
import { useAuth } from "../../context/AuthContext";
function AppLayout() {
  const navigate = useNavigate();
  const { plan } = useMembership();
  const { user } = useAuth();
  const planLabel = plan === "gold" ? "Gold Member" : plan === "silver" ? "Silver Member" : plan === "normal" ? "Normal" : "Free";
  const displayName = (typeof user?.name === "string" && user.name.trim()) || (typeof user?.email === "string" && user.email.trim()) || "User";
  return <div className="flex min-h-screen bg-muted/40">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-0 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-end gap-3 mb-4">
            <span className="text-sm text-muted-foreground" style={{ fontWeight: 700 }}>{displayName}</span>
            <Badge variant={plan === "free" ? "secondary" : "default"}>{planLabel}</Badge>
            <Button variant="outline" onClick={() => navigate("/app/membership")}>Buy Membership</Button>
          </div>
          <Alert className="mb-6">
            <AlertTitle>Demo Mode</AlertTitle>
            <AlertDescription>Demo Mode – No real financial transactions</AlertDescription>
          </Alert>
          <Outlet />
        </div>
      </main>
    </div>;
}
export {
  AppLayout
};
