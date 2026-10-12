import { Navigate, Outlet, useLocation } from "react-router-dom";
import routes from "../../config/routes";

const PLATFORM_ROLES = ["developer", "support"];

const PlatformRoute = () => {
  const location = useLocation();

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <Navigate
        to={routes.public.login}
        replace
        state={{ from: location }}
      />
    );
  }

  if (!PLATFORM_ROLES.includes(user.platformRole)) {
    return (
      <Navigate
        to={routes.public.unauthorized}
        replace
      />
    );
  }

  return <Outlet />;
};

export default PlatformRoute;