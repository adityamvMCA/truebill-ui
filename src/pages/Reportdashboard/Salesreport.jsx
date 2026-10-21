import { ShoppingCart } from "lucide-react";
import ReportDashboard from "./Reportdashboard";

const CONFIG = {
  title: "Sales Report",
  subtitle: "Sales invoices and returns",
  sourceType: "SALES_INVOICE",
  returnType: "SALES_RETURN",
  color: "#2563eb",
  partyLabel: "Customer",
  docLabel: "Invoice",
  icon: ShoppingCart,
};

export default function SalesReport() {
  return <ReportDashboard config={CONFIG} />;
}
