import React, { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import routes from "../../config/routes";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../../layouts/MainLayout";
import GlobalSkeleton from "../../components/common/GlobalSkeleton";
import SalesOrders1 from "../../pages/SalesOrders1";
import PurchaseOrders from "../../pages/PurchaseOrders";
import CustomerRegistration from "../../pages/CustomerRegistration";
import SalesInvoiceCreation from "../../pages/SalesInvoiceCreation";
import Traders from "../../pages/Traders/Traders";


// =====================================
// PUBLIC
// =====================================

const Login = lazy(
  () => import("../../pages/Login")
);

// =====================================
// DASHBOARD
// =====================================

const Dashboard = lazy(
  () => import("../../pages/Dashboard")
);

// =====================================
// SALES ORDERS
// =====================================

const SalesOrders = lazy(
  () => import("../../pages/SalesOrders")
);

// =====================================
// ROUTER
// =====================================

const AppRouter = () => {
  return (
    <Suspense fallback={<GlobalSkeleton />}>

      <Routes>

        {/* =================================
            PUBLIC ROUTES
        ================================= */}

        <Route
          path={routes.public.login}
          element={<Login />}
        />

        {/* =================================
            PROTECTED ROUTES
        ================================= */}

        <Route element={<ProtectedRoute />}>

          <Route element={<MainLayout />}>

            {/* Dashboard */}

            <Route
              path={routes.dashboard.index}
              element={<Dashboard />}
            />

            {/* Sales Orders */}

            <Route
              path={routes.sales.orders}
              element={<SalesOrders1 />}
            />
            <Route
              path={routes.purchase.index}
              element={<PurchaseOrders />}
            />
            <Route
              path={routes.customers.index}
              element={<SalesInvoiceCreation />}
            />
            <Route
              path={routes.sales.orders1}
              element={<SalesOrders />}
            />
            <Route
              path={routes.traders.trders}
              element={<Traders />}
            />

            {/* Root */}

            <Route
              path="/"
              element={
                <Navigate
                  to={routes.dashboard.index}
                  replace
                />
              }
            />

          </Route>

        </Route>

        {/* =================================
            404
        ================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to={routes.dashboard.index}
              replace
            />
          }
        />

      </Routes>

    </Suspense>
  );
};

export default AppRouter;