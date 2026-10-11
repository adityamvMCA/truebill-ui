import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import api from "../../services/api";

import ProductModal from "./ProductModal";
import ProductDetailsModal from "./ProductDetailsModal";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

function ProductsList() {
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);

  const [showProductModal, setShowProductModal] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [productModalMode, setProductModalMode] = useState("view");
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: "danger",
    title: "",
    message: "",
    confirmText: "Delete",
    onConfirm: null,
  });

  const [confirmLoading, setConfirmLoading] = useState(false);
  const getErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }

    if (typeof responseData?.error === "string") {
      return responseData.error;
    }

    if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
      return responseData.errors
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.message || item?.msg || String(item),
        )
        .join(", ");
    }

    return error?.message || "Something went wrong. Please try again.";
  };

  const getProductList = (response) => {
    if (Array.isArray(response?.data?.data)) {
      return response.data.data;
    }

    if (Array.isArray(response?.data?.products)) {
      return response.data.products;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.product.getAll({
        page: 1,
        limit: 100,
      });

      const productList = getProductList(response);

      setProducts(productList);
    } catch (error) {
      console.error("Unable to load products:", error);

      toast.error(getErrorMessage(error));

      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const columns = useMemo(
    () => [
      {
        key: "productCode",
        label: "Code",
        sortable: true,
      },

      {
        key: "name",
        label: "Product",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>

            <span>{row.category || "Uncategorized"}</span>
          </div>
        ),
      },

      {
        key: "type",
        label: "Type",
        sortable: true,

        render: (value) => <StatusField value={value} />,
      },

      {
        key: "unit",
        label: "Unit",
        sortable: true,
      },

      {
        key: "salePrice",
        label: "Sale Price",
        type: "currency",
        sortable: true,
      },

      {
        key: "purchasePrice",
        label: "Cost",
        type: "currency",
        sortable: true,
      },

      {
        key: "currentStock",
        label: "Stock",
        type: "number",
        sortable: true,

        render: (value, row) => {
          if (row.type === "SERVICE") {
            return <span className="dl-muted-value">N/A</span>;
          }

          return Number(value || 0);
        },
      },

      {
        key: "reorderLevel",
        label: "Reorder",
        type: "number",
        sortable: true,

        render: (value, row) => {
          if (row.type === "SERVICE") {
            return <span className="dl-muted-value">N/A</span>;
          }

          return Number(value || 0);
        },
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => <StatusField value={value} />,
      },

      {
        key: "brand",
        label: "Brand",
        sortable: true,
        visible: false,
      },

      {
        key: "hsnSacCode",
        label: "HSN / SAC",
        sortable: true,
        visible: false,
      },

      {
        key: "gstRate",
        label: "GST %",
        type: "number",
        sortable: true,
        visible: false,
      },
    ],
    [],
  );

  const filters = [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["GOODS", "SERVICE"],
    },

    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["ACTIVE", "INACTIVE"],
    },

    {
      key: "trackInventory",
      label: "Stock Tracked",
      type: "select",
      options: [
        {
          label: "Yes",
          value: true,
        },

        {
          label: "No",
          value: false,
        },
      ],
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
      key: "type",
      value: "GOODS",
      label: "Goods",
    },

    {
      key: "type",
      value: "SERVICE",
      label: "Services",
    },
  ];

  const handleView = (row) => {
    setSelectedProduct(row);

    setProductModalMode("view");
  };

  const handleEdit = (row) => {
    setSelectedProduct(row);

    setProductModalMode("edit");
  };

  const closeConfirmModal = () => {
    if (confirmLoading) {
      return;
    }

    setConfirmState({
      open: false,
      type: "danger",
      title: "",
      message: "",
      confirmText: "Delete",
      onConfirm: null,
    });
  };

  const openConfirmModal = ({
    type = "danger",
    title = "Are you sure?",
    message = "",
    confirmText = "Confirm",
    onConfirm,
  }) => {
    setConfirmState({
      open: true,
      type,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const handleConfirmAction = async () => {
    if (confirmLoading || typeof confirmState.onConfirm !== "function") {
      return;
    }

    try {
      setConfirmLoading(true);

      await confirmState.onConfirm();

      setConfirmState({
        open: false,
        type: "danger",
        title: "",
        message: "",
        confirmText: "Delete",
        onConfirm: null,
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = (row) => {
    openConfirmModal({
      type: "danger",
      title: "Delete product?",
      message: `Are you sure you want to delete "${row.name}" (${row.productCode})? This action cannot be undone.`,
      confirmText: "Delete Product",

      onConfirm: async () => {
        try {
          await api.product.delete(row.productCode);

          setProducts((previous) =>
            previous.filter((product) => product._id !== row._id),
          );

          setSelectedProduct((current) =>
            current?._id === row._id ? null : current,
          );

          toast.success(`${row.name} deleted successfully`);
        } catch (error) {
          console.error("Unable to delete product:", error);

          toast.error(getErrorMessage(error));

          throw error;
        }
      },
    });
  };

  const handleBulkStatusUpdate = async (rows, status) => {
    if (!rows.length) {
      return;
    }

    try {
      await Promise.all(
        rows.map((row) =>
          api.product.update(row.productCode, {
            status,
          }),
        ),
      );

      const selectedIds = rows.map((row) => row._id);

      setProducts((previous) =>
        previous.map((product) =>
          selectedIds.includes(product._id)
            ? {
                ...product,
                status,
              }
            : product,
        ),
      );

      setSelectedProduct((current) => {
        if (!current || !selectedIds.includes(current._id)) {
          return current;
        }

        return {
          ...current,
          status,
        };
      });

      toast.success(
        `${rows.length} product${rows.length > 1 ? "s" : ""} ${
          status === "ACTIVE" ? "activated" : "deactivated"
        } successfully`,
      );
    } catch (error) {
      console.error("Unable to update products:", error);

      toast.error(getErrorMessage(error));

      await loadProducts();
    }
  };

  const handleBulkDelete = (rows) => {
    if (!rows.length) {
      return;
    }

    openConfirmModal({
      type: "danger",
      title: "Delete selected products?",
      message: `You are about to permanently delete ${rows.length} selected product${
        rows.length > 1 ? "s" : ""
      }. This action cannot be undone.`,
      confirmText: `Delete ${rows.length} Product${rows.length > 1 ? "s" : ""}`,

      onConfirm: async () => {
        try {
          await Promise.all(
            rows.map((row) => api.product.delete(row.productCode)),
          );

          const selectedIds = rows.map((row) => row._id);

          setProducts((previous) =>
            previous.filter((product) => !selectedIds.includes(product._id)),
          );

          setSelectedProduct((current) =>
            selectedIds.includes(current?._id) ? null : current,
          );

          toast.success(
            `${rows.length} product${
              rows.length > 1 ? "s" : ""
            } deleted successfully`,
          );
        } catch (error) {
          console.error("Unable to delete products:", error);

          toast.error(getErrorMessage(error));

          await loadProducts();

          throw error;
        }
      },
    });
  };
  const handleBulkActivate = async (rows) => {
    await handleBulkStatusUpdate(rows, "ACTIVE");
  };

  const handleBulkDeactivate = async (rows) => {
    await handleBulkStatusUpdate(rows, "INACTIVE");
  };

  const handleRefresh = async () => {
    await loadProducts();
  };

  const handleProductCreated = (createdProduct) => {
    setProducts((previous) => {
      const alreadyExists = previous.some(
        (product) => product._id === createdProduct._id,
      );

      if (alreadyExists) {
        return previous;
      }

      return [createdProduct, ...previous];
    });
  };

  const handleProductUpdated = (updatedProduct) => {
    setProducts((previous) =>
      previous.map((product) =>
        product._id === updatedProduct._id ? updatedProduct : product,
      ),
    );

    setSelectedProduct(updatedProduct);
  };

  const handleProductCsvUpload = async (file) => {
    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await api.product.import(formData);

      const result = response?.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to import products");
      }

      const createdCount = Number(result?.createdCount) || 0;

      const failedCount = Number(result?.failedCount) || 0;

      if (createdCount > 0) {
        toast.success(
          `${createdCount} product${
            createdCount > 1 ? "s" : ""
          } imported successfully`,
        );
      }

      if (failedCount > 0) {
        const firstError = result?.errors?.[0];

        toast.error(
          `${failedCount} row${failedCount > 1 ? "s" : ""} failed${
            firstError ? `: Row ${firstError.row} — ${firstError.message}` : ""
          }`,
        );
      }

      if (createdCount === 0 && failedCount === 0) {
        toast.error("No products were imported");
      }

      await loadProducts();
    } catch (error) {
      console.error("Unable to import products:", error);

      toast.error(getErrorMessage(error));
    }
  };

  const productImportConfig = {
    templateFileName: "products-import-template.csv",

    columns: [
      {
        key: "name",
        example: "Premium Cement Bag",
      },

      {
        key: "type",
        example: "GOODS",
      },

      {
        key: "category",
        example: "Construction Materials",
      },

      {
        key: "brand",
        example: "UltraBuild",
      },

      {
        key: "unit",
        example: "BAG",
      },

      {
        key: "hsnSacCode",
        example: "252329",
      },

      {
        key: "gstRate",
        example: "28",
      },

      {
        key: "salePrice",
        example: "380",
      },

      {
        key: "purchasePrice",
        example: "320",
      },

      {
        key: "trackInventory",
        example: "true",
      },

      {
        key: "openingStock",
        example: "100",
      },

      {
        key: "openingStockRate",
        example: "320",
      },

      {
        key: "reorderLevel",
        example: "20",
      },

      {
        key: "status",
        example: "ACTIVE",
      },
    ],

    onUpload: handleProductCsvUpload,

    onError: (message) => {
      toast.error(message);
    },
  };

  return (
    <>
      <DataList
        title="Products"
        subtitle="Manage goods and services"
        columns={columns}
        data={products}
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
        storageKey="trustiq-products"
        searchPlaceholder="Search code, product, category, brand, HSN/SAC..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: handleDelete,
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

          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: handleBulkDelete,
          },
        ]}
        onRefresh={handleRefresh}
        importConfig={productImportConfig}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() => setShowProductModal(true)}
          >
            <Plus size={16} />

            <span>New Product</span>
          </button>
        }
      />

      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleProductCreated}
      />

      <ProductDetailsModal
        isOpen={Boolean(selectedProduct)}
        product={selectedProduct}
        mode={productModalMode}
        onClose={() => {
          setSelectedProduct(null);
        }}
        onUpdated={handleProductUpdated}
      />
      <ConfirmModal
        open={confirmState.open}
        type={confirmState.type}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={closeConfirmModal}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}

export default ProductsList;
