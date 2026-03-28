import { RouterProvider } from "react-router";
import { router } from "./routes";
import { FinanceProvider } from "./context/FinanceContext";
import { AuthProvider } from "./context/AuthContext";
import { MembershipProvider } from "./context/MembershipContext";
function App() {
  return <AuthProvider>
      <MembershipProvider>
        <FinanceProvider>
          <RouterProvider router={router} />
        </FinanceProvider>
      </MembershipProvider>
    </AuthProvider>;
}
export {
  App as default
};
