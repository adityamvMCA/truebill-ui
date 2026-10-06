const routes = {
  public: {
    home: "/",
    login: "/login",
    register: "/register",
    results: "/results",
    unauthorized: "/unauthorized",
    notFound: "/404",
  },

  dashboard: {
    index: "/dashboard",
  },

  // =========================
  // SALES
  // =========================
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

  // =========================
  // PURCHASE
  // =========================
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

  // =========================
  // INVENTORY
  // =========================
  inventory: {
    index: "/inventory",

    products: "/inventory/products",
    categories: "/inventory/categories",
    units: "/inventory/units",

    stock: "/inventory/stock",
    warehouses: "/inventory/warehouses",

    transfer: "/inventory/stock-transfer",
    adjustment: "/inventory/stock-adjustment",
    valuation: "/inventory/stock-valuation",
  },

  // =========================
  // CUSTOMERS
  // =========================
  customers: {
    index: "/customers",
    list: "/customers/list",
    create: "/customers/create",
    edit: "/customers/edit/:id",
    view: "/customers/view/:id",
    groups: "/customers/groups",
    outstanding: "/customers/outstanding",
  },

  // =========================
  // SUPPLIERS
  // =========================
  suppliers: {
    index: "/suppliers",
    list: "/suppliers/list",
    create: "/suppliers/create",
    edit: "/suppliers/edit/:id",
    view: "/suppliers/view/:id",
    groups: "/suppliers/groups",
    outstanding: "/suppliers/outstanding",
  },

  // =========================
  // ACCOUNTING
  // =========================
  accounting: {
    index: "/accounting",

    chartOfAccounts: "/accounting/chart-of-accounts",
    journal: "/accounting/journal",
    ledger: "/accounting/ledger",

    receivables: "/accounting/receivables",
    payables: "/accounting/payables",

    bankReconciliation: "/accounting/bank-reconciliation",
  },

  // =========================
  // INVOICE & BILLING
  // =========================
  billing: {
    index: "/billing",

    salesInvoices: "/billing/sales-invoices",
    purchaseInvoices: "/billing/purchase-invoices",

    creditNotes: "/billing/credit-notes",
    debitNotes: "/billing/debit-notes",
  },

  // =========================
  // ENTRY SHEET
  // =========================
  entrySheet: {
    index: "/entry-sheet",
    all: "/entry-sheet/all",
    create: "/entry-sheet/create",
    approval: "/entry-sheet/approval",
  },

  // =========================
  // BANK & PAYMENTS
  // =========================
  payments: {
    index: "/payments",

    bankAccounts: "/payments/bank-accounts",
    receipts: "/payments/receipts",
    payments: "/payments/payments",
    transfer: "/payments/bank-transfer",
  },

  // =========================
  // EXPENSES
  // =========================
  expenses: {
    index: "/expenses",
    list: "/expenses/list",
    create: "/expenses/create",
    categories: "/expenses/categories",
    approval: "/expenses/approval",
  },

  // =========================
  // REPORTS
  // =========================
  reports: {
    index: "/reports",

    sales: "/reports/sales",
    purchase: "/reports/purchase",
    inventory: "/reports/inventory",
    accounting: "/reports/accounting",
  },

  // =========================
  // GST & TAX
  // =========================
  tax: {
    index: "/gst-tax",

    summary: "/gst-tax/summary",
    gstReports: "/gst-tax/reports",
    configuration: "/gst-tax/configuration",
  },

  // =========================
  // PRODUCTION
  // =========================
  production: {
    index: "/production",

    orders: "/production/orders",
    bom: "/production/bom",
    workOrders: "/production/work-orders",
    reports: "/production/reports",
  },

  // =========================
  // HR & PAYROLL
  // =========================
  hr: {
    index: "/hr",

    employees: "/hr/employees",
    attendance: "/hr/attendance",
    leave: "/hr/leave",
    payroll: "/hr/payroll",
  },

  // =========================
  // ASSETS
  // =========================
  assets: {
    index: "/assets",

    list: "/assets/list",
    categories: "/assets/categories",
    depreciation: "/assets/depreciation",
    reports: "/assets/reports",
  },

  // =========================
  // SETTINGS
  // =========================
  settings: {
    index: "/settings",

    company: "/settings/company",
    users: "/settings/users",
    roles: "/settings/roles",
    appearance: "/settings/appearance",
    notifications: "/settings/notifications",
  },

  // =========================
  // GMAIL
  // =========================
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

export default routes;