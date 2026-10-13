export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Unable to read stored user:", error);

    return {};
  }
};

export const getCurrentTenantId = () => {
  const user = getStoredUser();

  if (user.platformRole === "tenant") {
    return user.tenantId || user.tenant?.id || user.tenant?._id || null;
  }

  if (user.platformRole === "developer" || user.platformRole === "support") {
    return sessionStorage.getItem("selectedTenantId") || null;
  }

  return null;
};

export const getCurrentTenantContext = () => {
  const user = getStoredUser();
  const tenantId = getCurrentTenantId();

  return {
    tenantId,
    user,
    isTenantUser: user.platformRole === "tenant",
    isTenantAdmin: user.platformRole === "tenant" && user.role === "admin",
    isPlatformUser: ["developer", "support"].includes(user.platformRole),
  };
};
