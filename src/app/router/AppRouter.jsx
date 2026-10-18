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
            path={routes.purchase.orders}
            element={gated("purchase.orders", <PurchaseOrders />)}
          />

          <Route
            path={routes.purchase.requisitions}
            element={gated("purchase.requisitions", <PurchaseOrders />)}
          />

          <Route
            path={routes.purchase.rfq}
            element={gated("purchase.rfq", <PurchaseOrders />)}
          />

          <Route
            path={routes.purchase.quotations}
            element={gated("purchase.quotations", <PurchaseOrders />)}
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
            element={gated(
              "gst.taxConfiguration",
              <TaxConfiguration/>,
            )}
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
            path={routes.inventory.createStockMovement}
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
            path={routes.reports.bank}
            element={gated("reports.accounting", <BankLedger />)}
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
