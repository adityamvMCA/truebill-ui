import { useEffect, useState } from "react";
import { FileText, PackageCheck, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../../components/common/Form/Button";
import Input from "../../../components/common/Form/Input";
import Textarea from "../../../components/common/Form/Textarea";
import BoxModal from "../../../components/common/Modal/BoxModal";
import api from "../../../services/api";

const initialFormData = {
  invoiceNumber: "",
  returnDate: new Date().toISOString().slice(0, 10),
  updateStock: true,
  notes: "",
  items: [{ invoiceItemIndex: "0", quantity: "" }],
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item),
      )
      .join(", ");
  }

  return error?.message || "Unable to save sales return. Please try again.";
};

const getReturnNumber = (item) =>
  item?.returnNumber || item?.salesReturnNumber || item?.documentNumber || "";

const getSavedReturn = (response) =>
  response?.data?.salesReturn ||
  response?.data?.data ||
  response?.data?.return ||
  response?.data;

function SalesReturnModal({
  isOpen,
  onClose,
  onSave,
  editData = null,
  mode = "create",
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const busy = saving || posting;
  const canPost = Boolean(editData) && editData.status === "CREATED" && !!getReturnNumber(editData);

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setFormData({
        invoiceNumber: editData.invoiceNumber || editData.sourceInvoiceNumber || "",
        returnDate: editData.returnDate
          ? new Date(editData.returnDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        updateStock: editData.updateStock !== false,
        notes: editData.notes || "",
        items:
          Array.isArray(editData.items) && editData.items.length
            ? editData.items.map((item) => ({
                invoiceItemIndex: String(item.invoiceItemIndex ?? 0),
                quantity: String(item.quantity ?? ""),
              }))
            : [{ invoiceItemIndex: "0", quantity: "" }],
      });

      return;
    }

    setFormData({
      ...initialFormData,
      returnDate: new Date().toISOString().slice(0, 10),
      items: [{ invoiceItemIndex: "0", quantity: "" }],
    });
  }, [editData, isOpen]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleItemChange = (index, event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [name]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setFormData((previous) => ({
      ...previous,
      items: [...previous.items, { invoiceItemIndex: "0", quantity: "" }],
    }));
  };

  const removeItem = (index) => {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const validateForm = () => {
    if (!formData.invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return false;
    }

    if (!formData.returnDate) {
      toast.error("Return date is required");
      return false;
    }

    if (!formData.items.length) {
      toast.error("Add at least one return item");
      return false;
    }

    for (let index = 0; index < formData.items.length; index += 1) {
      const item = formData.items[index];
      const invoiceItemIndex = Number(item.invoiceItemIndex);
      const quantity = Number(item.quantity);

      if (
        item.invoiceItemIndex === "" ||
        !Number.isInteger(invoiceItemIndex) ||
        invoiceItemIndex < 0
      ) {
        toast.error(`Enter a valid invoice item index on row ${index + 1}`);
        return false;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error(`Enter a valid return quantity on row ${index + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (busy || isView || !validateForm()) return;

    const returnNumber = getReturnNumber(editData);

    if (isEdit && !returnNumber) {
      toast.error("Return number is missing; unable to update");
      return;
    }

    const payload = {
      invoiceNumber: formData.invoiceNumber.trim(),
      returnDate: formData.returnDate,
      updateStock: formData.updateStock,
      items: formData.items.map((item) => ({
        invoiceItemIndex: Number(item.invoiceItemIndex),
        quantity: Number(item.quantity),
      })),
      notes: formData.notes.trim() || null,
    };

    try {
      setSaving(true);

      const response = isEdit
        ? await api.salesReturn.update(returnNumber, payload)
        : await api.salesReturn.create(payload);

      const savedReturn = getSavedReturn(response);

      if (!savedReturn || typeof savedReturn !== "object") {
        throw new Error("Sales return was not returned by the server");
      }

      toast.success(
        isEdit
          ? "Sales return updated successfully"
          : "Sales return created successfully",
      );

      onSave?.(savedReturn, isEdit);
      onClose?.();
    } catch (error) {
      console.error("Unable to save sales return:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    if (busy || !canPost) return;

    const returnNumber = getReturnNumber(editData);

    const confirmed = window.confirm(
      `Post sales return ${returnNumber}? This creates the accounting journal and cannot be edited or deleted afterwards.`,
    );

    if (!confirmed) return;

    try {
      setPosting(true);

      const response = await api.salesReturn.post(returnNumber);
      const postedReturn = getSavedReturn(response);

      if (!postedReturn || typeof postedReturn !== "object") {
        throw new Error("Posted sales return was not returned by the server");
      }

      toast.success("Sales return posted successfully");

      onSave?.(postedReturn, true);
      onClose?.();
    } catch (error) {
      console.error("Unable to post sales return:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={busy}
      >
        {isView ? "Close" : "Cancel"}
      </Button>

      <div className="box-modal-footer-actions">
        {canPost && (
          <Button
            type="button"
            variant={isView ? "primary" : "secondary"}
            onClick={handlePost}
            loading={posting}
            disabled={busy}
          >
            {posting ? "Posting..." : "Post Return"}
          </Button>
        )}

        {!isView && (
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={busy}
          >
            {saving ? "Saving..." : isEdit ? "Update Return" : "Create Return"}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={onClose}
      title={
        isView
          ? "Sales Return Details"
          : isEdit
            ? "Edit Sales Return"
            : "Create Sales Return"
      }
      subtitle={
        isView
          ? "Review sales return and item information"
          : isEdit
            ? "Update the sales return details"
            : "Create a return against an existing sales invoice"
      }
      width="1000px"
      footer={footer}
    >
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <ReceiptText size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Return Information</h3>
            <p>Invoice reference and return date</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          {editData && (
            <Input
              label="Return Number"
              name="returnNumber"
              value={getReturnNumber(editData)}
              disabled
            />
          )}

          <Input
            label="Sales Invoice Number"
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={handleChange}
            placeholder="Enter existing invoice number"
            required
            disabled={busy || isEdit || isView}
          />

          <Input
            label="Return Date"
            name="returnDate"
            type="date"
            value={formData.returnDate}
            onChange={handleChange}
            required
            disabled={busy || isView}
          />

          {editData && (
            <Input
              label="Status"
              name="status"
              value={editData.status || "CREATED"}
              disabled
            />
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 14,
              cursor: isView || busy ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              name="updateStock"
              checked={formData.updateStock}
              onChange={handleChange}
              disabled={busy || isView}
            />
            Update stock for returned items
          </label>
        </div>
      </div>

      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <PackageCheck size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Return Items</h3>
            <p>Specify the original invoice item and return quantity</p>
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            margin: "0 0 14px",
          }}
        >
          Item index starts at 0: 0 is the first invoice item, 1 is the second,
          and so on.
        </p>

        {formData.items.map((item, index) => (
          <div
            key={index}
            className="box-modal-form-grid"
            style={{
              marginBottom: 14,
              alignItems: "end",
            }}
          >
            <Input
              label="Invoice Item Index"
              name="invoiceItemIndex"
              type="number"
              min="0"
              step="1"
              value={item.invoiceItemIndex}
              onChange={(event) => handleItemChange(index, event)}
              required
              disabled={busy || isView}
            />

            <Input
              label="Return Quantity"
              name="quantity"
              type="number"
              min="0.000001"
              step="any"
              value={item.quantity}
              onChange={(event) => handleItemChange(index, event)}
              placeholder="Enter quantity"
              required
              disabled={busy || isView}
            />

            {!isView && (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => removeItem(index)}
                  disabled={busy || formData.items.length === 1}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        ))}

        {!isView && (
          <Button
            type="button"
            variant="secondary"
            onClick={addItem}
            disabled={busy}
          >
            Add Return Item
          </Button>
        )}
      </div>

      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <FileText size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Additional Information</h3>
            <p>Return notes and special instructions</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <div className="box-modal-form-full">
            <Textarea
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter return notes..."
              rows={4}
              maxLength={500}
              disabled={busy || isView}
            />
          </div>
        </div>
      </div>
    </BoxModal>
  );
}

export default SalesReturnModal;