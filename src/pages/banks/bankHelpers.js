export const formatBankAmount = (value) => {
  if (value === null || value === undefined) return "N/A";

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "N/A";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

export const getBankError = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  return (
    data?.message ||
    data?.error ||
    error?.message ||
    "Unable to complete the bank request."
  );
};

export const extractBank = (response) => {
  const bank = response?.data?.bank;

  if (!bank?._id || !bank?.bankCode) {
    throw new Error("Bank account was not returned by the server.");
  }

  return bank;
};
