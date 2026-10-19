import authApi from "./modules/auth.api";
import tenantApi from "./modules/tenant.api";
import customerApi from "./modules/customer.api";
import ledgerApi from "./modules/ledger.api";
import menuApi from "./modules/menu.api";
import productApi from "./modules/productApi";
import stockMovementApi from "./modules/stockMovementApi";
import supplierApi from "./modules/supplierApi";
import purchaseBillApi from "./modules/purchaseBills";
import supplierPaymentApi from "./modules/supplierPaymentApi";
import customerReceiptApi from "./modules/customerReceiptApi";
import bankApi from "./modules/bankApi";
import salesInvoiceApi from "./modules/salesInvoiceApi";
import salesOrderApi from "./modules/salesOrderApi";
import deliveryNoteApi from "./modules/deliveryNoteApi";
import salesQuotationApi from "./modules/salesQuotationApi";
import salesReturnApi from "./modules/salesReturnApi";
import taxConfigurationApi from "./modules/taxConfigurationApi";
import gstSummaryApi from "./modules/gstSummaryApi";
import gstrReportsApi from "./modules/gstrReportsApi";
import bankReconciliationApi from "./modules/bankReconciliationApi";

export const api = {
  auth: authApi,
  tenants: tenantApi,
  customers: customerApi,
  ledgers: ledgerApi,
  menu: menuApi,
  product: productApi,
  stockMovement: stockMovementApi,
  suppliers: supplierApi,
  purchaseBills: purchaseBillApi,
  supplierPayments: supplierPaymentApi,
  customerReceipts: customerReceiptApi,
  banks: bankApi,
  sales: salesInvoiceApi,
  salesOrder: salesOrderApi,
  deliveryNote: deliveryNoteApi,
  salesQuotations: salesQuotationApi,
  salesReturn: salesReturnApi,
  taxConfiguration: taxConfigurationApi,
  gstSummary: gstSummaryApi,
  gstrReports: gstrReportsApi,
  bankReconciliation: bankReconciliationApi,
};

export default api;
