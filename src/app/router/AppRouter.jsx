// import React, { lazy, Suspense } from "react";
// import {
//   Routes,
//   Route,
//   Navigate,
// } from "react-router-dom";

// import routes from "../../config/routes";
// import ProtectedRoute from "./ProtectedRoute";
// import MainLayout from "../../layouts/MainLayout";
// import GlobalSkeleton from "../../components/common/GlobalSkeleton";
// import SalesOrders1 from "../../pages/SalesOrders1";
// import PurchaseOrders from "../../pages/PurchaseOrders";
// import SalesInvoiceCreation from "../../pages/SalesInvoiceCreation";
// import Traders from "../../pages/Traders/Traders";
// import MenuCreate from "../../pages/settings/MenuCreate";


// // =====================================
// // PUBLIC
// // =====================================

// const Login = lazy(
//   () => import("../../pages/Login")
// );

// // =====================================
// // DASHBOARD
// // =====================================

// const Dashboard = lazy(
//   () => import("../../pages/Dashboard")
// );

// // =====================================
// // SALES ORDERS
// // =====================================

// const SalesOrders = lazy(
//   () => import("../../pages/SalesOrders")
// );

// // =====================================
// // ROUTER
// // =====================================

// const AppRouter = () => {
//   return (
//     <Suspense fallback={<GlobalSkeleton />}>

//       <Routes>

//         {/* =================================
//             PUBLIC ROUTES
//         ================================= */}

//         <Route
//           path={routes.public.login}
//           element={<Login />}
//         />

//         {/* =================================
//             PROTECTED ROUTES
//         ================================= */}

//         <Route element={<ProtectedRoute />}>

//           <Route element={<MainLayout />}>

//             {/* Dashboard */}

//             <Route
//               path={routes.dashboard.index}
//               element={<Dashboard />}
//             />

//             {/* Sales Orders */}

//             <Route
//               path={routes.sales.orders}
//               element={<SalesOrders1 />}
//             />
//             <Route
//               path={routes.purchase.index}
//               element={<PurchaseOrders />}
//             />
//             <Route
//               path={routes.customers.index}
//               element={<SalesInvoiceCreation />}
//             />
//             <Route
//               path={routes.sales.orders1}
//               element={<SalesOrders />}
//             />
//             <Route
//               path={routes.traders.trders}
//               element={<Traders />}
//             />
//             <Route
//               path={routes.menu.create}
//               element={<MenuCreate />}
//             />

//             {/* Root */}

//             <Route
//               path="/"
//               element={
//                 <Navigate
//                   to={routes.dashboard.index}
//                   replace
//                 />
//               }
//             />

//           </Route>

//         </Route>

//         {/* =================================
//             404
//         ================================= */}

//         <Route
//           path="*"
//           element={
//             <Navigate
//               to={routes.dashboard.index}
//               replace
//             />
//           }
//         />

//       </Routes>

//     </Suspense>
//   );
// };

// export default AppRouter;


import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import routes from "../../config/routes";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../../layouts/MainLayout";
import GlobalSkeleton from "../../components/common/GlobalSkeleton";

import SalesOrders1 from "../../pages/SalesOrders1";
import PurchaseOrders from "../../pages/PurchaseOrders";
import SalesInvoiceCreation from "../../pages/SalesInvoiceCreation";
import Traders from "../../pages/Traders/Traders";
import MenuCreate from "../../pages/settings/MenuCreate";

import FeatureRoute from "./FeatureRoute";
import DeveloperRoute from "./DeveloperRoute";

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
      {/* PUBLIC */}
      <Route path={routes.public.login} element={<Login />} />
      <Route path={routes.public.notFound} element={<NotFound />} />

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Billing: reachable even when subscription expired */}
          <Route path={routes.billing.renew} element={<RenewPage />} />
          <Route path={routes.billing.upgrade} element={<UpgradePage />} />

          {/* Dashboard */}
          <Route
            path={routes.dashboard.index}
            element={gated("dashboard", <Dashboard />)}
          />

          {/* Sales */}
          <Route
            path={routes.sales.orders}
            element={gated("sales", <SalesOrders1 />)}
          />
          <Route
            path={routes.sales.orders1}
            element={gated("sales", <SalesOrders />)}
          />

          {/* Purchase */}
          <Route
            path={routes.purchase.index}
            element={gated("purchase", <PurchaseOrders />)}
          />
          <Route
            path={routes.traders.trders}
            element={gated("purchase", <Traders />)}
          />

          {/* Customers */}
          <Route
            path={routes.customers.index}
            element={gated("customers", <SalesInvoiceCreation />)}
          />

          {/* Developer-only settings */}
          <Route
            path={routes.menu.create}
            element={
              <DeveloperRoute>
                <MenuCreate />
              </DeveloperRoute>
            }
          />

          {/* Root */}
          <Route
            path="/"
            element={<Navigate to={routes.dashboard.index} replace />}
          />
        </Route>
      </Route>

      {/* 404 catch-all */}
      <Route
        path="*"
        element={<Navigate to={routes.public.notFound} replace />}
      />
    </Routes>
  </Suspense>
);

export default AppRouter;