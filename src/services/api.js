import authApi from "./modules/auth.api";
import tenantApi from "./modules/tenant.api";
import customerApi from "./modules/customer.api";
import ledgerApi from "./modules/ledger.api";

export const api = {
  auth: authApi,
  tenants: tenantApi,
  customers: customerApi,
  ledgers: ledgerApi,
};

export default api;