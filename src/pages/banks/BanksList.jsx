import { Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";

import bankApi from "../../services/modules/bankApi";

import BankRegistration from "./BankRegistration";
import BankDetailsModal from "./BankDetailsModal";

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (
    Array.isArray(responseData?.errors) &&
    responseData.errors.length > 0
  ) {
    return responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  return (
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const formatRupees = (value) => {
  if (value === undefined || value === null) {
    return "N/A";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const getReturnedBank = (response) => {
  const bank = response?.data?.bank;

  if (
    response?.data?.success === false ||
    !bank?._id ||
    !bank?.bankCode
  ) {
    throw new Error(
      response?.data?.message ||
        "Bank account was not returned by the server.",
    );
  }

  return bank;
};

const shouldStopRequests = (error) => {
  const status = error?.response?.status;

  const networkFailure = Boolean(
    error?.request && !error?.response,
  );

  return (
    networkFailure ||
    [401, 402, 403, 429].includes(status) ||
    status >= 500
  );
};

const filters = [
  {
    key: "accountType",
    label: "Account Type",
    type: "select",
    options: ["CURRENT", "SAVINGS"],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["ACTIVE", "INACTIVE"],
  },
];

const quickFilters = [
  {
    key: "status",
    value: "",
    label: "All",
  },
  {
    key: "status",
    value: "ACTIVE",
    label: "Active",
  },
  {
    key: "status",
    value: "INACTIVE",
    label: "Inactive",
  },
  {
    key: "accountType",
    value: "CURRENT",
    label: "Current",
  },
  {
    key: "accountType",
    value: "SAVINGS",
    label: "Savings",
  },
];

function BanksList() {
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const [busy, setBusy] = useState(false);

  const [showBankModal, setShowBankModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewBankCode, setViewBankCode] = useState(null);

  const operationLock = useRef(false);
  const requestVersion = useRef(0);

  const loadBanks = useCallback(async () => {
    const version = ++requestVersion.current;

    setLoading(true);

    try {
      const collected = [];

      let page = 1;
      let totalPages = 1;

      // DataList handles local filtering/pagination.
      // Fetch all server pages so records beyond 100 are included.
      do {
        const response = await bankApi.getAll({
          page,
          limit: 100,
        });

        const result = response?.data;

        if (
          result?.success === false ||
          !Array.isArray(result?.data)
        ) {
          throw new Error(
            result?.message || "Invalid bank list response.",
          );
        }

        collected.push(...result.data);

        totalPages = Number(
          result?.pagination?.totalPages,
        );

        if (
          !Number.isInteger(totalPages) ||
          totalPages < 0
        ) {
          throw new Error(
            "Invalid bank pagination response.",
          );
        }

        page += 1;
      } while (page <= totalPages);

      if (version !== requestVersion.current) {
        return;
      }

      const uniqueBanks = new Map(
        collected.map((bank) => [bank._id, bank]),
      );

      setBanks([...uniqueBanks.values()]);
    } catch (error) {
      if (version === requestVersion.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBanks();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadBanks]);

  const handleView = useCallback((row) => {
    if (operationLock.current) {
      return;
    }

    setViewBankCode(row.bankCode);
  }, []);

  const handleEdit = useCallback((row) => {
    if (operationLock.current) {
      return;
    }

    setViewBankCode(null);
    setEditData(row);
    setShowBankModal(true);
  }, []);

  const handleCreate = () => {
    if (operationLock.current) {
      return;
    }

    setEditData(null);
    setShowBankModal(true);
  };

  const handleCloseRegistration = () => {
    setShowBankModal(false);
    setEditData(null);
  };

  const handleBankSaved = () => {
    // Reload masked list data instead of inserting a detail response
    // that may contain the full account number.
    void loadBanks();
  };

  const handleRefresh = async () => {
    if (operationLock.current) {
      return;
    }

    await loadBanks();
  };

  const handleBulkStatusUpdate = async (rows, status) => {
    if (!rows?.length) {
      return;
    }

    if (operationLock.current) {
      toast.error(
        "Wait for the current bank operation to finish.",
      );
      return;
    }

    const selectedRows = [
      ...new Map(
        rows.map((row) => [row.bankCode, row]),
      ).values(),
    ];

    operationLock.current = true;
    setBusy(true);

    const loadingToast = toast.loading(
      status === "ACTIVE"
        ? "Activating bank accounts..."
        : "Deactivating bank accounts...",
    );

    let updatedCount = 0;
    let unchangedCount = 0;
    let attemptedCount = 0;

    const failures = [];

    try {
      for (const row of selectedRows) {
        attemptedCount += 1;

        try {
          // Bank PUT requires full editable details.
          const currentBank = getReturnedBank(
            await bankApi.getByCode(row.bankCode),
          );

          if (currentBank.status === status) {
            unchangedCount += 1;
            continue;
          }

          const payload = {
            accountName: currentBank.accountName,
            bankName: currentBank.bankName,
            accountHolderName:
              currentBank.accountHolderName,
            accountType: currentBank.accountType,
            branchName: currentBank.branchName,
            ifscCode: currentBank.ifscCode,
            status,
            notes: currentBank.notes || null,
          };

          getReturnedBank(
            await bankApi.update(
              row.bankCode,
              payload,
            ),
          );

          updatedCount += 1;
        } catch (error) {
          failures.push({
            bankCode: row.bankCode,
            message: getErrorMessage(error),
          });

          if (shouldStopRequests(error)) {
            break;
          }
        }
      }

      if (updatedCount > 0) {
        toast.success(
          `${updatedCount} bank account${
            updatedCount > 1 ? "s" : ""
          } ${
            status === "ACTIVE"
              ? "activated"
              : "deactivated"
          } successfully`,
        );
      }

      if (unchangedCount > 0) {
        toast.success(
          `${unchangedCount} account${
            unchangedCount > 1 ? "s were" : " was"
          } already ${status.toLowerCase()}`,
        );
      }

      if (failures.length > 0) {
        const firstError = failures[0];

        const notAttempted =
          selectedRows.length - attemptedCount;

        toast.error(
          `${failures.length} failed or unconfirmed. ` +
            `${firstError.bankCode}: ${firstError.message}` +
            (notAttempted > 0
              ? `. ${notAttempted} accounts were not attempted.`
              : ""),
          {
            duration: 10000,
          },
        );
      }
    } finally {
      toast.dismiss(loadingToast);

      await loadBanks();

      operationLock.current = false;
      setBusy(false);
    }
  };

  const handleBulkActivate = async (rows) => {
    await handleBulkStatusUpdate(rows, "ACTIVE");
  };

  const handleBulkDeactivate = async (rows) => {
    await handleBulkStatusUpdate(rows, "INACTIVE");
  };

  const handleBankCsvUpload = async (file) => {
    if (operationLock.current) {
      toast.error(
        "Wait for the current bank operation to finish.",
      );
      return;
    }

    if (!file) {
      toast.error("Select a CSV file.");
      return;
    }

    operationLock.current = true;
    setBusy(true);

    const loadingToast = toast.loading(
      "Importing bank accounts...",
    );

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await bankApi.import(formData);

      const result = response?.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Failed to import bank accounts",
        );
      }

      const createdCount =
        Number(result?.createdCount) || 0;

      const failedCount =
        Number(result?.failedCount) || 0;

      if (createdCount > 0) {
        toast.success(
          `${createdCount} bank account${
            createdCount > 1 ? "s" : ""
          } imported successfully`,
        );
      }

      if (failedCount > 0) {
        const firstError = result?.errors?.[0];

        toast.error(
          `${failedCount} row${
            failedCount > 1 ? "s" : ""
          } failed${
            firstError
              ? `: Row ${firstError.row} — ${firstError.message}`
              : ""
          }`,
          {
            duration: 10000,
          },
        );
      }

      if (
        createdCount === 0 &&
        failedCount === 0
      ) {
        toast.error("No bank accounts were imported");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      toast.dismiss(loadingToast);

      // Refresh even after failure in case the server saved
      // some records before the request failed.
      await loadBanks();

      operationLock.current = false;
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "bankCode",
        label: "Code",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            disabled={busy}
            aria-label={`View bank ${value}`}
            onClick={(event) => {
              event.stopPropagation();
              handleView(row);
            }}
          >
            {value || "N/A"}
          </button>
        ),
      },

      {
        key: "accountName",
        label: "Account",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>
            <span>{row.bankName || "N/A"}</span>
          </div>
        ),
      },

      {
        key: "accountNumber",
        label: "Account Number",
      },

      {
        key: "accountType",
        label: "Account Type",
        sortable: true,
      },

      {
        key: "ifscCode",
        label: "IFSC",
        sortable: true,
      },

      {
        key: "branchName",
        label: "Branch",
        sortable: true,
      },

      {
        key: "currentBalance",
        label: "Balance",
        type: "number",
        sortable: true,

        render: (value, row) => {
          if (
            value === undefined ||
            value === null
          ) {
            return (
              <span className="dl-muted-value">
                N/A
              </span>
            );
          }

          const balanceType =
            row.currentBalanceType === "CREDIT"
              ? "Cr"
              : "Dr";

          return `${formatRupees(value)} ${balanceType}`;
        },
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <StatusField value={value} />
        ),
      },

      {
        key: "accountHolderName",
        label: "Account Holder",
        sortable: true,
        visible: false,
      },

      {
        key: "ledgerCode",
        label: "Ledger Code",
        sortable: true,
        visible: false,
      },

      {
        key: "currency",
        label: "Currency",
        visible: false,
      },

      {
        key: "notes",
        label: "Notes",
        visible: false,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },
    ],
    [busy, handleView],
  );

  const bankImportConfig = {
    templateFileName: "banks-import-template.csv",

    columns: [
      {
        key: "accountName",
        example: "Demo Bank - Current Account",
      },
      {
        key: "bankName",
        example: "Demo Bank",
      },
      {
        key: "accountHolderName",
        example: "Demo Trading Company",
      },
      {
        key: "accountNumber",
        example: "000123456789",
      },
      {
        key: "accountType",
        example: "CURRENT",
      },
      {
        key: "branchName",
        example: "Test Branch",
      },
      {
        key: "ifscCode",
        example: "TEST0000001",
      },
      {
        key: "openingBalance",
        example: "50000.00",
      },
      {
        key: "status",
        example: "ACTIVE",
      },
      {
        key: "notes",
        example: "Development test account",
      },
    ],

    onUpload: handleBankCsvUpload,

    onError: (message) => {
      toast.error(message);
    },
  };

  return (
    <>
      {busy && (
        <p role="status" aria-live="polite">
          Processing bank accounts. Please keep
          this page open.
        </p>
      )}

      <DataList
        title="Bank Accounts"
        subtitle="Manage bank accounts and linked accounting ledgers"
        columns={columns}
        data={banks}
        loading={loading || busy}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-banks"
        searchPlaceholder="Search code, account, bank, branch, IFSC..."
        actions={{
          view: handleView,
          edit: handleEdit,
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: handleBulkActivate,
          },
          {
            key: "deactivate",
            label: "Deactivate",
            action: handleBulkDeactivate,
          },
        ]}
        onRefresh={handleRefresh}
        importConfig={bankImportConfig}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={handleCreate}
            disabled={busy}
          >
            <Plus size={16} />
            <span>New Bank</span>
          </button>
        }
      />

      <BankRegistration
        isOpen={showBankModal}
        editData={editData}
        onClose={handleCloseRegistration}
        onSave={handleBankSaved}
      />

      <BankDetailsModal
        isOpen={Boolean(viewBankCode)}
        bankCode={viewBankCode}
        onClose={() => {
          setViewBankCode(null);
        }}
        onEdit={handleEdit}
      />
    </>
  );
}

export default BanksList;