import authApi from "./modules/auth.api";
import tenantApi from "./modules/tenant.api";
import customerApi from "./modules/customer.api";
import ledgerApi from "./modules/ledger.api";
import menuApi from "./modules/menu.api";

export const api = {
  auth: authApi,
  tenants: tenantApi,
  customers: customerApi,
  ledgers: ledgerApi,
  menu: menuApi,
};

export default api;