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
};

export default api;
