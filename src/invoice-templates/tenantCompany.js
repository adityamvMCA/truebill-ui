import { addrText } from "./utils";

const read = (store, key) => {
  try {
    return JSON.parse(store.getItem(key) || "null");
  } catch {
    return null;
  }
};
const clean = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );

/* Company block for print templates, taken from the logged-in tenant.
   Order: selected tenant (platform users) -> login tenant -> user.tenant */
export function getTenantCompany() {
  const t =
    read(sessionStorage, "selectedTenant") ||
    read(localStorage, "tenant") ||
    read(localStorage, "user")?.tenant ||
    {};
  const b = t.bank || t.bankDetails || {};

  return {
    ...clean({
      name: t.businessName || t.name,
      logo: t.logo || t.logoUrl,
      tagline: t.tagline,
      address: addrText(t.address),
      phone: t.phone || t.mobile,
      email: t.email,
      gstin: t.gstin || t.gstNo || t.gstNumber,
      pan: t.pan,
      state: t.state,
      upi: t.upi || t.upiId,
      terms: t.termsAndConditions,
    }),
    bank: clean({
      name: b.name || b.bankName,
      accountNo: b.accountNo || b.accountNumber,
      ifsc: b.ifsc,
      branch: b.branch,
    }),
  };
}
