import { Navigate } from "react-router-dom";
import routes, { getDefaultRoute } from "../../config/routes";

const RootRedirect = () => {
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  return (
    <Navigate
      to={getDefaultRoute(user)}
      replace
    />
  );
};

export default RootRedirect;