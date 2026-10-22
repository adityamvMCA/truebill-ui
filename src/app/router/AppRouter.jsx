import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import routes from "../../config/routes";

import ProtectedRoute from "./ProtectedRoute";
import PlatformRoute from "./PlatformRoute";
import FeatureRoute from "./FeatureRoute";
import DeveloperRoute from "./DeveloperRoute";
import RootRedirect from "./RootRedirect";

import MainLayout from "../../layouts/MainLayout";
import GlobalSkeleton from "../../components/common/GlobalSkeleton";
import PurchaseOrders from "../../pages/PurchaseOrders";
import Traders from "../../pages/Traders/Traders";
import MenuCreate from "../../pages/settings/MenuCreate";
import CustomerCreate from "../../pages/customers/CustomerCreate";
import ProductsList from "../../pages/Products/ProductsList";
import StockAdjustmentCreate from "../../pages/stock-movements/StockAdjustmentCreate";
import StockMovementsList from "../../pages/stock-movements/StockMovementsList";
import CompanySettings from "../../pages/settings/CompanySettings";
import Users from "../../pages/settings/Users";
import RolesPermissions from "../../pages/settings/RolesPermissions";
import Appearance from "../../pages/settings/Appearance";
import Notifications from "../../pages/settings/Notifications";
import SuppliersList from "../../pages/suppliers/SuppliersList";
import TallyGateway from "../../components/TallyGateway/TallyGateway";
import CustomersList from "../../pages/customers/CustomersList";
import PurchaseBillsList from "../../pages/purchase/PurchaseBillsList";
import SalesInvoiceCreation from "../../pages/SalesInvoiceCreation";
import PurchaseBillCreate1 from "../../pages/purchase/PurchaseBillCreate1";
import CustomerReceiptCreate from "../../pages/sales/CustomerReceiptCreate";
import CustomerReceiptsList from "../../pages/sales/CustomerReceiptsList";
import CustomerReceiptDetail from "../../pages/sales/CustomerReceiptDetail";
import SupplierPaymentsList from "../../pages/purchase/SupplierPaymentsList";
import SupplierPaymentCreate from "../../pages/purchase/SupplierPaymentCreate";
import SupplierPaymentDetail from "../../pages/purchase/SupplierPaymentDetail";
import PurchaseBillDetail from "../../pages/purchase/PurchaseBillDetail";
import BanksList from "../../pages/banks/BanksList";
import OutstandingPage from "../../components/reports/OutstandingReport/OutstandingPage";
import BankLedger from "../../pages/accounting/BankLedger";
import SalesInvoiceCreate from "../../pages/sales/invoices/SalesInvoiceCreate";
import SalesInvoicesList from "../../pages/sales/invoices/SalesInvoicesList";
import SalesOrderCreation from "../../pages/sales-orders/SalesOrderCreation";
import SalesOrdersList from "../../pages/sales-orders/SalesOrdersList";
import DeliveryNoteCreation from "../../pages/delivery-notes/DeliveryNoteCreation";
import DeliveryNotesList from "../../pages/delivery-notes/DeliveryNotesList";
import SalesQuotationsList from "../../pages/sales/Quotations/SalesQuotationsList";
import SalesQuotationCreate from "../../pages/sales/Quotations/SalesQuotationCreate";
import SalesQuotationDetail from "../../pages/sales/Quotations/SalesQuotationDetail";
import SalesQuotationComparison from "../../pages/sales/Quotations/SalesQuotationComparison";
import SalesReturnsList from "../../pages/sales/sales-returns/SalesReturnsList";
import TaxConfiguration from "../../pages/TaxConfiguration/TaxConfiguration";
import GstSummary from "../../pages/accounting/GstSummary/GstSummary";
import GstrReports from "../../pages/accounting/gstreports/GstrReports";
import BankReconciliation from "../../pages/accounting/BankReconciliation/BankReconciliation";
import TrialBalance from "../../pages/accounting/TrialBalance/TrialBalance";
import BalanceSheet from "../../pages/accounting/balancesheet/BalanceSheet";
// import Daybook from "../../pages/accounting/Daybook/Daybook";
import Daybook from "../../pages/accounting/DayBook/Daybook";
import CustomerLedger from "../../pages/accounting/Ledger/CustomerLedger/CustomerLedger";
import SupplierLedger from "../../pages/accounting/Ledger/SupplierLedger/SupplierLedger";
import CustomerOutstanding from "../../pages/accounting/outstanding/CustomerOutstanding";
import SupplierOutstanding from "../../pages/accounting/outstanding/SupplierOutstanding";
import JournalVouchers from "../../pages/accounting/JournalVouchers/JournalVouchers";
import PurchaseReturnsList from "../../pages/PurchaseReturns/PurchaseReturnsList";
import GoodsReceiptsList from "../../pages/GoodsReceiptes/GoodsReceiptsList";
import PurchaseOrdersList from "../../pages/purchase-orders/PurchaseOrdersList";
import PurchaseOrderPage from "../../pages/purchase-orders/PurchaseOrderPage";
import PurchaseRequisitionsList from "../../pages/purchase-requisitions/PurchaseRequisitionsList";
import PurchaseRequisitionPage from "../../pages/purchase-requisitions/PurchaseRequisitionPage";
import PurchaseRfqsList from "../../pages/purchase-rfqs/PurchaseRfqsList";
import PurchaseRfqPage from "../../pages/purchase-rfqs/PurchaseRfqPage";
import SupplierQuotationPage from "../../pages/supplier-quotations/SupplierQuotationPage";
import SupplierQuotationsList from "../../pages/supplier-quotations/SupplierQuotationsList";
import QuotationComparisonPage from "../../pages/quotation-comparison/QuotationComparisonPage";
import SalesReport from "../../pages/Reportdashboard/Salesreport";
import PurchaseReport from "../../pages/Reportdashboard/Purchasereport";
import CategoriesList from "../../pages/categories/CategoriesList";
import UnitsList from "../../pages/units/UnitsList";
import BrandsList from "../../pages/Brand/BrandsList";
import HsnSacCodesList from "../../pages/Hsncode/HsnSacCodesList";
import TaxRatesList from "../../pages/Tax/TaxRatesList";
import WarehousesList from "../../pages/Warehouse/WarehousesList";
import StockMovementCreate from "../../pages/stock-movements/StockMovementCreate";
// import InventoryReport from "../../pages/Reportdashboard/InventoryReport";

const Login = lazy(() => import("../../pages/Login"));
const Dashboard = lazy(() => import("../../pages/Dashboard"));
const SalesOrders = lazy(() => import("../../pages/SalesOrders"));
const UpgradePage = lazy(() => import("../../pages/billing/UpgradePage"));
const RenewPage = lazy(() => import("../../pages/billing/RenewPage"));
const NotFound = lazy(() => import("../../pages/NotFound/NotFound"));

const gated = (feature, element) => (
  <FeatureRoute feature={feature}>{element}</FeatureRoute>
);

const AppRouter = () => (
  <Suspense fallback={<GlobalSkeleton />}>
    <Routes>
      {/* =========================
          PUBLIC ROUTES
      ========================= */}

      <Route path={routes.public.login} element={<Login />} />

      <Route path={routes.public.notFound} element={<NotFound />} />

      {/* =========================
          PROTECTED ROUTES
      ========================= */}

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* =====================
              BILLING
          ====================== */}

          <Route path={routes.billing.renew} element={<RenewPage />} />

          <Route path={routes.billing.upgrade} element={<UpgradePage />} />

          {/* =====================
              DASHBOARD
          ====================== */}

          <Route
            path={routes.dashboard.index}
            element={gated("dashboard", <Dashboard />)}
          />

          {/* =====================
              SALES
          ====================== */}

          <Route
            path={routes.sales.createOrder}
            element={gated("sales", <SalesOrderCreation />)}
          />

          <Route
            path={routes.sales.orders}
            element={gated("sales", <SalesOrdersList />)}
          />

          <Route
            path={routes.sales.orders1}
            element={gated("sales", <SalesOrders />)}
          />

          {/* <Route
            path={routes.sales.quotations}
            element={gated("sales.quotations", <SalesOrders1 />)}
          /> */}

          <Route
            path={routes.sales.createDelivery}
            element={gated("sales", <DeliveryNoteCreation />)}
          />
          <Route
            path={routes.sales.delivery}
            element={gated("sales", <DeliveryNotesList />)}
          />
          <Route
            path={routes.sales.quotations}
            element={gated("sales", <SalesQuotationsList />)}
          />
          <Route
            path={routes.sales.createQuotation}
            element={gated("sales", <SalesQuotationCreate />)}
          />
          <Route
            path={routes.sales.editQuotation}
            element={gated("sales", <SalesQuotationDetail />)}
          />

          <Route
            path={routes.sales.viewQuotation}
            element={<SalesQuotationDetail />}
          />
          <Route
            path={routes.sales.compareQuotations}
            element={<SalesQuotationComparison />}
          />
          {/* <Route
            path={routes.sales.invoices}
            element={gated("sales.invoices", <SalesOrders1 />)}
          /> */}

          {/* =====================
              PURCHASE
          ====================== */}

          <Route
            path={routes.purchase.index}
            element={gated("purchase", <PurchaseOrders />)}
          />
          <Route
            path={routes.purchase.returns}
            element={gated("purchaseReturn.view", <PurchaseReturnsList />)}
          />
          <Route
            path={routes.purchase.grn}
            element={gated("purchaseReturn.view", <GoodsReceiptsList />)}
          />

          <Route
            path={routes.purchase.orders}
            element={gated("purchase.orders", <PurchaseOrdersList />)}
          />

          <Route
            path={routes.purchase.createOrder}
            element={gated("purchase.orders", <PurchaseOrderPage />)}
          />
          <Route
            path={routes.purchase.editOrder}
            element={gated(
              "purchase.orders",
              <PurchaseOrderPage mode="edit" />,
            )}
          />
          <Route
            path={routes.purchase.viewOrder}
            element={gated(
              "purchase.orders",
              <PurchaseOrderPage mode="view" />,
            )}
          />

          <Route
            path={routes.purchase.requisitions}
            element={gated(
              "purchase.requisitions",
              <PurchaseRequisitionsList />,
            )}
          />
          <Route
            path={routes.purchase.createRequisition}
            element={gated(
              "purchase.requisitions",
              <PurchaseRequisitionPage mode="create" />,
            )}
          />
          <Route
            path={routes.purchase.editRequisition}
            element={gated(
              "purchase.requisitions",
              <PurchaseRequisitionPage mode="edit" />,
            )}
          />
          <Route
            path={routes.purchase.viewRequisition}
            element={gated(
              "purchase.requisitions",
              <PurchaseRequisitionPage mode="view" />,
            )}
          />
          <Route
            path={routes.purchase.rfq}
            element={gated("purchase.rfq", <PurchaseRfqsList />)}
          />
          <Route
            path={routes.purchase.createRfq}
            element={gated("purchase.rfq", <PurchaseRfqPage mode="create" />)}
          />
          <Route
            path={routes.purchase.editRfq}
            element={gated("purchase.rfq", <PurchaseRfqPage mode="edit" />)}
          />
          <Route
            path={routes.purchase.viewRfq}
            element={gated("purchase.rfq", <PurchaseRfqPage mode="view" />)}
          />

          <Route
            path={routes.purchase.supplierQuotations}
            element={gated("purchase.quotations", <SupplierQuotationsList />)}
          />
          <Route
            path={routes.purchase.quotationComparison}
            element={gated("purchase.quotations", <QuotationComparisonPage />)}
          />
          <Route
            path={routes.purchase.createSupplierQuotation}
            element={gated(
              "purchase.quotations",
              <SupplierQuotationPage mode="create" />,
            )}
          />

          <Route
            path={routes.purchase.editSupplierQuotation}
            element={gated(
              "purchase.quotations",
              <SupplierQuotationPage mode="edit" />,
            )}
          />

          <Route
            path={routes.purchase.viewSupplierQuotation}
            element={gated(
              "purchase.quotations",
              <SupplierQuotationPage mode="view" />,
            )}
          />

          <Route
            path={routes.purchase.invoices}
            element={gated("purchase.quotations", <PurchaseBillsList />)}
          />

          <Route
            path={routes.purchase.createInvoice}
            element={<PurchaseBillCreate1 />}
          />
          <Route
            path={routes.purchase.viewInvoice}
            element={gated("purchase.invoices", <PurchaseBillDetail />)}
          />
          {/* =====================
              CUSTOMERS
          ====================== */}

          <Route
            path={routes.customers.create}
            element={gated("sales.customers", <CustomerCreate />)}
          />
          <Route
            path={routes.customers.outstanding}
            element={gated("customerOutstanding.view", <CustomerOutstanding />)}
          />

          <Route
            path={routes.customers.index}
            element={gated("sales.customers", <CustomersList />)}
          />
          <Route
            path={routes.customers.list}
            element={gated("sales.customers", <CustomersList />)}
          />

          <Route
            path={routes.customerReceipts.list}
            element={gated("sales.customerReceipts", <CustomerReceiptsList />)}
          />

          <Route
            path={routes.customerReceipts.create}
            element={gated("sales.customerReceipts", <CustomerReceiptCreate />)}
          />

          <Route
            path={routes.customerReceipts.view}
            element={gated("sales.customerReceipts", <CustomerReceiptDetail />)}
          />
          <Route
            path={routes.sales.invoices}
            element={gated("sales.invoices", <SalesInvoicesList />)}
          />

          <Route
            path={routes.sales.createInvoice}
            element={gated("sales.invoices", <SalesInvoiceCreate />)}
          />
          <Route
            path={routes.sales.returns}
            element={gated("salesReturn.view", <SalesReturnsList />)}
          />

          <Route
            path={routes.sales.viewInvoice}
            element={gated(
              "sales.invoices",
              <SalesInvoiceCreate mode="view" />,
            )}
          />

          <Route
            path={routes.sales.editInvoice}
            element={gated(
              "sales.invoices",
              <SalesInvoiceCreate mode="edit" />,
            )}
          />
          <Route
            path={routes.tax.configuration}
            element={gated("gst.taxConfiguration", <TaxConfiguration />)}
          />
          <Route
            path={routes.tax.summary}
            element={gated("gst.summary", <GstSummary />)}
          />
          <Route
            path={routes.tax.gstReports}
            element={gated("gst.gstrReports", <GstrReports />)}
          />
          {/* =====================
              INVENTORY
          ====================== */}

          <Route
            path={routes.inventory.index}
            element={gated("inventory", <ProductsList />)}
          />

          <Route
            path={routes.inventory.products}
            element={gated("inventory.products", <ProductsList />)}
          />
          <Route
            path={routes.inventory.categories}
            element={gated("inventory.products", <CategoriesList  />)}
          />
          <Route
            path={routes.inventory.units}
            element={gated("inventory.products", <UnitsList  />)}
          />
          <Route
            path={routes.inventory.brand}
            element={gated("inventory.products", <BrandsList  />)}
          />
          <Route
            path={routes.inventory.hsn}
            element={gated("inventory.products", <HsnSacCodesList  />)}
          />
          <Route
            path={routes.inventory.tax}
            element={gated("inventory.products", <TaxRatesList  />)}
          />
          <Route
            path={routes.inventory.warehouses}
            element={gated("inventory.products", <WarehousesList  />)}
          />

          <Route
            path={routes.suppliers.list}
            element={gated("inventory.products", <SuppliersList />)}
          />

          <Route
            path={routes.supplierPayments.list}
            element={gated(
              "purchase.supplierPayments",
              <SupplierPaymentsList />,
            )}
          />
          <Route
            path={routes.supplierPayments.create}
            element={gated(
              "purchase.supplierPayments",
              <SupplierPaymentCreate />,
            )}
          />
          <Route
            path={routes.supplierPayments.view}
            element={gated(
              "purchase.supplierPayments",
              <SupplierPaymentDetail />,
            )}
          />
          <Route
            path={routes.inventory.stockMovements}
            element={gated("inventory.stock", <StockMovementsList />)}
          />
          <Route
            path={routes.inventory.adjustment}
            element={gated("inventory.stock", <StockAdjustmentCreate />)}
          />

          <Route
            path={routes.settings.company}
            element={gated("settings.company", <CompanySettings />)}
          />
          <Route
            path={routes.settings.users}
            element={gated("settings.users", <Users />)}
          />
          <Route
            path="/settings/roles"
            element={gated("settings.roles", <RolesPermissions />)}
          />

          <Route
            path="/settings/appearance"
            element={gated("settings.appearance", <Appearance />)}
          />
          <Route
            path="/tally"
            element={gated("settings.appearance", <TallyGateway />)}
          />
          <Route
            path="/pnb"
            element={gated("settings.appearance", <SalesInvoiceCreation />)}
          />
          <Route
            path="/settings/notifications"
            element={gated("settings.notifications", <Notifications />)}
          />
          <Route
            path={routes.banks.list}
            element={gated("bank.accounts", <BanksList />)}
          />
          <Route
            path={routes.reports.outstanding}
            element={gated("reports.accounting", <OutstandingPage />)}
          />
          <Route
            path={routes.suppliers.outstanding}
            element={gated("supplierOutstanding.view", <SupplierOutstanding />)}
          />
          <Route
            path={routes.reports.bank}
            element={gated("reports.accounting", <BankLedger />)}
          />
          <Route
            path={routes.accounting.bankReconciliation}
            element={gated(
              "bankReconciliation.reconcile",
              <BankReconciliation />,
            )}
          />
          <Route
            path={routes.accounting.daybook}
            element={gated("ledger.view", <Daybook />)}
          />
          <Route
            path={routes.reports.sales}
            element={gated("ledger.view", <SalesReport />)}
          />
          <Route
            path={routes.reports.purchase}
            element={gated("ledger.view", <PurchaseReport />)}
          />
          {/* <Route
            path={routes.reports.inventory}
            element={gated("ledger.view", <InventoryReport />)}
          /> */}
          <Route
            path={routes.accounting.journal}
            element={gated("ledger.view", <JournalVouchers />)}
          />
          <Route
            path={routes.accounting.trialBalance}
            element={gated("ledger.view", <TrialBalance />)}
          />
          <Route
            path={routes.accounting.balancesheet}
            element={gated("ledger.view", <BalanceSheet />)}
          />
          <Route
            path={routes.accounting.customerledger}
            element={gated("ledger.view", <CustomerLedger />)}
          />
          <Route
            path={routes.accounting.supplierledger}
            element={gated("ledger.view", <SupplierLedger />)}
          />
          {/* =====================
              PLATFORM ROUTES
              Developer + Support
          ====================== */}

          <Route element={<PlatformRoute />}>
            <Route path={routes.traders.index} element={<Traders />} />

            <Route
              path={routes.menu.create}
              element={
                <DeveloperRoute>
                  <MenuCreate />
                </DeveloperRoute>
              }
            />
          </Route>

          {/* =====================
              ROOT REDIRECT
          ====================== */}

          <Route path="/" element={<RootRedirect />} />
        </Route>
      </Route>

      {/* =========================
          404 CATCH ALL
      ========================= */}

      <Route
        path="*"
        element={<Navigate to={routes.public.notFound} replace />}
      />
    </Routes>
  </Suspense>
);

export default AppRouter;
