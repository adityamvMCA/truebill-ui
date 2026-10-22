import { Wallet } from "lucide-react";
import ReportDashboard from "./ReportDashboard";

const CONFIG = {
  title: "Purchase Report",
  subtitle: "Purchase bills and returns",
  sourceType: "PURCHASE_BILL",
  returnType: "PURCHASE_RETURN",
  color: "#f59e0b",
  partyLabel: "Supplier",
  docLabel: "Bill",
  icon: Wallet,
};

export default function PurchaseReport() {
  return <ReportDashboard config={CONFIG} />;
}
