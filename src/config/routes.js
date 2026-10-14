const routes = {
  public: {
    home: "/",
    login: "/login",
    register: "/register",
    results: "/results",
    unauthorized: "/unauthorized",
    notFound: "/404",
  },

  menu: {
    create: "/menu-creation",
  },

  billing: {
    renew: "/billing/renew",
    upgrade: "/upgrade",
  },

  dashboard: {
    index: "/dashboard",
  },

  traders: {
    index: "/traders",
  },

  sales: {
    index: "/sales",

    quotations: "/sales/quotations",
    createQuotation: "/sales/quotations/create",
    editQuotation: "/sales/quotations/edit/:id",

    orders: "/sales/orders",
    orders1: "/sales/orders1",
    createOrder: "/sales/orders/create",
    editOrder: "/sales/orders/edit/:id",
    viewOrder: "/sales/orders/view/:id",

    delivery: "/sales/delivery",
    createDelivery: "/sales/delivery/create",
    editDelivery: "/sales/delivery/edit/:id",

    invoices: "/sales/invoices",
    createInvoice: "/sales/invoices/create",
    editInvoice: "/sales/invoices/edit/:id",

    returns: "/sales/returns",
  },

  purchase: {
    index: "/purchase",

    requisitions: "/purchase/requisitions",
    createRequisition: "/purchase/requisitions/create",

    rfq: "/purchase/rfq",
    createRfq: "/purchase/rfq/create",

    quotations: "/purchase/quotations",
    quotationComparison: "/purchase/quotation-comparison",

    orders: "/purchase/orders",
    createOrder: "/purchase/orders/create",
    editOrder: "/purchase/orders/edit/:id",

    grn: "/purchase/grn",
    createGrn: "/purchase/grn/create",

    invoices: "/purchase/invoices",
    returns: "/purchase/returns",
  },

  inventory: {
    index: "/inventory",

    products: "/inventory/products",
    categories: "/inventory/categories",
    units: "/inventory/units",

    stock: "/inventory/stock",
    warehouses: "/inventory/warehouses",

    stockMovements: "/stock-movements",
    createStockMovement: "/stock-movements/new",

    transfer: "/inventory/stock-transfer",
    adjustment: "/inventory/stock-adjustment",
    valuation: "/inventory/stock-valuation",
  },

  customers: {
    index: "/customers",
    list: "/customers/list",
    create: "/customers/create",
    edit: "/customers/edit/:id",
    view: "/customers/view/:id",
    groups: "/customers/groups",
    outstanding: "/customers/outstanding",
  },

  suppliers: {
    index: "/suppliers",
    list: "/suppliers/list",
    create: "/suppliers/create",
    edit: "/suppliers/edit/:id",
    view: "/suppliers/view/:id",
    groups: "/suppliers/groups",
    outstanding: "/suppliers/outstanding",
  },

  accounting: {
    index: "/accounting",

    chartOfAccounts: "/accounting/chart-of-accounts",
    journal: "/accounting/journal",
    ledger: "/accounting/ledger",

    receivables: "/accounting/receivables",
    payables: "/accounting/payables",

    bankReconciliation: "/accounting/bank-reconciliation",
  },

  entrySheet: {
    index: "/entry-sheet",
    all: "/entry-sheet/all",
    create: "/entry-sheet/create",
    approval: "/entry-sheet/approval",
  },

  payments: {
    index: "/payments",

    bankAccounts: "/payments/bank-accounts",
    receipts: "/payments/receipts",
    payments: "/payments/payments",
    transfer: "/payments/bank-transfer",
  },

  expenses: {
    index: "/expenses",
    list: "/expenses/list",
    create: "/expenses/create",
    categories: "/expenses/categories",
    approval: "/expenses/approval",
  },

  reports: {
    index: "/reports",

    sales: "/reports/sales",
    purchase: "/reports/purchase",
    inventory: "/reports/inventory",
    accounting: "/reports/accounting",
  },

  tax: {
    index: "/gst-tax",

    summary: "/gst-tax/summary",
    gstReports: "/gst-tax/reports",
    configuration: "/gst-tax/configuration",
  },

  production: {
    index: "/production",

    orders: "/production/orders",
    bom: "/production/bom",
    workOrders: "/production/work-orders",
    reports: "/production/reports",
  },

  hr: {
    index: "/hr",

    employees: "/hr/employees",
    attendance: "/hr/attendance",
    leave: "/hr/leave",
    payroll: "/hr/payroll",
  },

  assets: {
    index: "/assets",

    list: "/assets/list",
    categories: "/assets/categories",
    depreciation: "/assets/depreciation",
    reports: "/assets/reports",
  },

  settings: {
    index: "/settings",

    company: "/settings/company",
    users: "/settings/users",
    roles: "/settings/roles",
    appearance: "/settings/appearance",
    notifications: "/settings/notifications",
  },

  gmail: {
    index: "/gmail",
    compose: "/gmail/compose",
    mail: "/gmail/mail/:id",
  },
};

export const buildRoute = (route, params = {}) => {
  let path = route;

  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });

  return path;
};

export const isPlatformUser = (user) =>
  ["developer", "support"].includes(user?.platformRole);

export const getDefaultRoute = (user) => {
  if (isPlatformUser(user)) {
    return routes.traders.index;
  }

  return routes.dashboard.index;
};

export default routes;
