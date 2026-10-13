// import { lazy, Suspense } from "react";
// import { Routes, Route, Navigate } from "react-router-dom";
// import routes from "../../config/routes";
// import ProtectedRoute from "./ProtectedRoute";
// import MainLayout from "../../layouts/MainLayout";
// import GlobalSkeleton from "../../components/common/GlobalSkeleton";
// import SalesOrders1 from "../../pages/SalesOrders1";
// import PurchaseOrders from "../../pages/PurchaseOrders";
// import Traders from "../../pages/Traders/Traders";
// import MenuCreate from "../../pages/settings/MenuCreate";
// import FeatureRoute from "./FeatureRoute";
// import DeveloperRoute from "./DeveloperRoute";
// import CustomerCreate from "../../pages/customers/CustomerCreate";
// import ProductsList from "../../pages/Products/ProductsList";
// import StockAdjustmentCreate from "../../pages/stock-movements/StockAdjustmentCreate";
// import StockMovementsList from "../../pages/stock-movements/StockMovementsList";

// const Login = lazy(() => import("../../pages/Login"));
// const Dashboard = lazy(() => import("../../pages/Dashboard"));
// const SalesOrders = lazy(() => import("../../pages/SalesOrders"));
// const UpgradePage = lazy(() => import("../../pages/billing/UpgradePage"));
// const RenewPage = lazy(() => import("../../pages/billing/RenewPage"));
// const NotFound = lazy(() => import("../../pages/NotFound/NotFound"));

// const gated = (feature, element) => (
//   <FeatureRoute feature={feature}>{element}</FeatureRoute>
// );

// const AppRouter = () => (
//   <Suspense fallback={<GlobalSkeleton />}>
//     <Routes>
//       {/* PUBLIC */}
//       <Route path={routes.public.login} element={<Login />} />
//       <Route path={routes.public.notFound} element={<NotFound />} />

//       {/* PROTECTED */}
//       <Route element={<ProtectedRoute />}>
//         <Route element={<MainLayout />}>
//           {/* Billing: reachable even when subscription expired */}
//           <Route path={routes.billing.renew} element={<RenewPage />} />
//           <Route path={routes.billing.upgrade} element={<UpgradePage />} />

//           {/* Dashboard */}
//           <Route
//             path={routes.dashboard.index}
//             element={gated("dashboard", <Dashboard />)}
//           />

//           {/* Sales */}
//           <Route
//             path={routes.sales.orders}
//             element={gated("sales", <SalesOrders1 />)}
//           />
//           <Route
//             path={routes.sales.orders1}
//             element={gated("sales", <SalesOrders />)}
//           />

//           {/* Purchase */}
//           <Route
//             path={routes.purchase.index}
//             element={gated("purchase", <PurchaseOrders />)}
//           />
//           <Route
//             path={routes.traders.trders}
//             element={gated("purchase", <Traders />)}
//           />

//           {/* Customers */}
//           <Route
//             path={routes.customers.index}
//             element={gated("customers", <CustomerCreate />)}
//           />
//           <Route
//             path={routes.inventory.products}
//             element={gated("inventory", <ProductsList />)}
//           />
//           <Route
//             path={routes.inventory.smn}
//             element={gated("inventory", <StockAdjustmentCreate />)}
//           />
//           <Route
//             path={routes.inventory.sm}
//             element={gated("inventory", <StockMovementsList />)}
//           />

//           {/* Developer-only settings */}
//           <Route
//             path={routes.menu.create}
//             element={
//               <DeveloperRoute>
//                 <MenuCreate />
//               </DeveloperRoute>
//             }
//           />

//           {/* Root */}
//           <Route
//             path="/"
//             element={<Navigate to={routes.dashboard.index} replace />}
//           />
//         </Route>
//       </Route>

//       {/* 404 catch-all */}
//       <Route
//         path="*"
//         element={<Navigate to={routes.public.notFound} replace />}
//       />
//     </Routes>
//   </Suspense>
// );

// export default AppRouter;

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

import SalesOrders1 from "../../pages/SalesOrders1";
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
            path={routes.sales.index}
            element={gated("sales", <SalesOrders1 />)}
          />

          <Route
            path={routes.sales.orders}
            element={gated("sales", <SalesOrders1 />)}
          />

          <Route
            path={routes.sales.orders1}
            element={gated("sales", <SalesOrders />)}
          />

          <Route
            path={routes.sales.quotations}
            element={gated("sales.quotations", <SalesOrders1 />)}
          />

          <Route
            path={routes.sales.invoices}
            element={gated("sales.invoices", <SalesOrders1 />)}
          />

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

          {/* =====================
              CUSTOMERS
          ====================== */}

          <Route
            path={routes.customers.index}
            element={gated("sales.customers", <CustomerCreate />)}
          />

          <Route
            path={routes.customers.create}
            element={gated("sales.customers", <CustomerCreate />)}
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
            path="/settings/notifications"
            element={gated("settings.notifications", <Notifications />)}
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
