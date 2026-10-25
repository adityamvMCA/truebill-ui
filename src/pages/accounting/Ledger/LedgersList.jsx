import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import DataList from "../../../components/common/DataList/DataList";
import StatusField from "../../../components/common/StatusField/StatusField";

import ledgerApi from "../../../services/modules/ledgerApi";
import LedgerRegistration from "./LedgerRegistration";

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length) {
    return responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  return (
    responseData?.message ||
    responseData?.error ||
    error?.message ||
    "Unable to load ledgers."
  );
};

const formatRupees = (value) => {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const extractLedgerList = (response) => {
  const body = response?.data;
  const data = body?.data ?? body?.ledgers ?? body;

  if (body?.success === false || !Array.isArray(data)) {
    throw new Error(body?.message || "Invalid ledger list response.");
  }

  return data;
};

const filters = [
  {
    key: "type",
    label: "Ledger Type",
    type: "select",
    options: [
      "ACCOUNT",
      "CUSTOMER",
      "SUPPLIER",
      "BANK",
      "CASH",
      "TAX",
      "SYSTEM",
    ],
  },
  {
    key: "nature",
    label: "Nature",
    type: "select",
    options: ["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"],
  },
  {
    key: "isActive",
    label: "Status",
    type: "select",
    options: ["ACTIVE", "INACTIVE"],
  },
];

const quickFilters = [
  { key: "type", value: "", label: "All" },
  { key: "type", value: "TAX", label: "Tax Ledgers" },
  { key: "nature", value: "LIABILITY", label: "Liabilities" },
  { key: "nature", value: "ASSET", label: "Assets" },
  { key: "isActive", value: "ACTIVE", label: "Active" },
  { key: "isActive", value: "INACTIVE", label: "Inactive" },
];

function LedgersList() {
  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  const requestVersion = useRef(0);

  const loadLedgers = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);

    try {
      const collected = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await ledgerApi.getAll({
          page,
          limit: 100,
        });

        const result = response?.data;

        if (result?.success === false) {
          throw new Error(result?.message || "Unable to load ledgers.");
        }

        const data = extractLedgerList(response);
        collected.push(...data);

        // Support the pagination shape used by the existing API.
        const pages = Number(result?.pagination?.totalPages);

        if (Number.isInteger(pages) && pages >= 1) {
          totalPages = pages;
        } else {
          totalPages = 1;
        }

        page += 1;
      } while (page <= totalPages && page <= 100);

      if (version !== requestVersion.current) return;

      const uniqueLedgers = new Map(
        collected.map((ledger) => [ledger._id, ledger]),
      );

      setLedgers([...uniqueLedgers.values()]);
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
    void loadLedgers();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadLedgers]);

  const handleCreate = useCallback(() => {
    setShowLedgerModal(true);
  }, []);

  const handleCloseRegistration = useCallback(() => {
    setShowLedgerModal(false);
  }, []);

  const handleLedgerSaved = useCallback(() => {
    setShowLedgerModal(false);
    void loadLedgers();
  }, [loadLedgers]);

  const columns = useMemo(
    () => [
      {
        key: "code",
        label: "Ledger Code",
        sortable: true,
        render: (value) => <strong>{value || "N/A"}</strong>,
      },
      {
        key: "name",
        label: "Ledger Name",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>
            <span>{row.description || row.type || "ACCOUNT"}</span>
          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
      },
      {
        key: "nature",
        label: "Nature",
        sortable: true,
      },
      {
        key: "ledgerGroupId",
        label: "Ledger Group",
        sortable: true,
        render: (value) =>
          typeof value === "object" ? value?.name || "N/A" : "N/A",
      },
      {
        key: "currentBalance",
        label: "Current Balance",
        type: "number",
        sortable: true,
        render: (value, row) => {
          const balanceType = row.currentBalanceType === "CREDIT" ? "Cr" : "Dr";

          return `${formatRupees(value)} ${balanceType}`;
        },
      },
      {
        key: "isActive",
        label: "Status",
        sortable: true,
        render: (value) => (
          <StatusField value={value === false ? "INACTIVE" : "ACTIVE"} />
        ),
      },
      {
        key: "normalBalance",
        label: "Normal Balance",
        visible: false,
      },
      {
        key: "openingBalance",
        label: "Opening Balance",
        visible: false,
        render: (value, row) => {
          const balanceType = row.openingBalanceType === "CREDIT" ? "Cr" : "Dr";

          return `${formatRupees(value)} ${balanceType}`;
        },
      },
      {
        key: "description",
        label: "Description",
        visible: false,
      },
    ],
    [],
  );

  return (
    <>
      <DataList
        title="Accounting Ledgers"
        subtitle="Manage account, bank, party, GST and TDS ledgers"
        columns={columns}
        data={ledgers}
        loading={loading}
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
        storageKey="trustiq-accounting-ledgers"
        searchPlaceholder="Search ledger code, name, type, nature..."
        onRefresh={loadLedgers}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={handleCreate}
          >
            <Plus size={16} />
            <span>New Ledger</span>
          </button>
        }
      />

      <LedgerRegistration
        isOpen={showLedgerModal}
        onClose={handleCloseRegistration}
        onSave={handleLedgerSaved}
      />
    </>
  );
}

export default LedgersList;
