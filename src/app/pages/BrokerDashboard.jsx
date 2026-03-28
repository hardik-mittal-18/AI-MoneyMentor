import { BrokerDemoPanel } from "../components/broker/BrokerDemoPanel";
import { useEffect } from "react";
import { API_BASE_URL } from "../lib/apiBaseUrl";
function BrokerDashboard() {
  useEffect(() => {
    console.log("Broker dashboard loaded");
  }, []);
  return <div className="space-y-6">
      <BrokerDemoPanel apiBaseUrl={API_BASE_URL} />
    </div>;
}
export {
  BrokerDashboard
};
