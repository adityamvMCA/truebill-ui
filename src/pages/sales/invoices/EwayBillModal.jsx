import { useEffect, useRef, useState } from "react";
import { Download, FileText, MapPin, Send, Truck } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../../components/common/Form/Button";
import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import BoxModal from "../../../components/common/Modal/BoxModal";
import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";

import { formatPaise, getErrors } from "./salesInvoiceUtils";
import {
  STATE_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  dateOnlyInput,
  formatDateTime,
  fromLocalInput,
  goodsOf,
  goodsValuePaise,
  isRequired,
  suggestValidUntil,
  toLocalInput,
} from "./ewayBillUtils";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const EWB_NUMBER_REGEX = /^[0-9]{12}$/;
const VEHICLE_REGEX =
  /^(?:[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2}|TM[0-9]{6}[A-Z]?)$/;

const CLOCK_SKEW_MS = 5 * 60 * 1000;

const detailsFromInvoice = (ewb = {}) => ({
  distanceKm: ewb.distanceKm ?? "",
  transportMode: ewb.transportMode || "ROAD",
  vehicleType: ewb.vehicleType || "REGULAR",
  vehicleNumber: ewb.vehicleNumber || "",
  transporterId: ewb.transporterId || "",
  transporterName: ewb.transporterName || "",
  transportDocNumber: ewb.transportDocNumber || "",
  transportDocDate: dateOnlyInput(ewb.transportDocDate),
  fromPlace: ewb.fromPlace || "",
  fromPincode: ewb.fromPincode || "",
  fromStateCode: ewb.fromStateCode || "",
  toPlace: ewb.toPlace || "",
  toPincode: ewb.toPincode || "",
  toStateCode: ewb.toStateCode || "",
});

const initialRecord = () => ({
  ewbNumber: "",
  ewbDate: toLocalInput(new Date().toISOString()),
  validUntil: "",
});

const validateDetails = (details) => {
  const problems = [];
  const distance = Number(details.distanceKm);

  if (
    details.distanceKm === "" ||
    !Number.isInteger(distance) ||
    distance < 1 ||
    distance > 4000
  ) {
    problems.push("Distance must be a whole number between 1 and 4000 km.");
  }

  if (!details.fromPlace.trim()) problems.push("Dispatch place is required.");
  if (!PINCODE_REGEX.test(details.fromPincode.trim())) {
    problems.push("Dispatch pincode must be 6 digits.");
  }
  if (!details.fromStateCode) problems.push("Dispatch state is required.");

  if (!details.toPlace.trim()) problems.push("Delivery place is required.");
  if (!PINCODE_REGEX.test(details.toPincode.trim())) {
    problems.push("Delivery pincode must be 6 digits.");
  }
  if (!details.toStateCode) problems.push("Delivery state is required.");

  const vehicle = details.vehicleNumber.trim().toUpperCase();
  const transporter = details.transporterId.trim().toUpperCase();

  if (vehicle && !VEHICLE_REGEX.test(vehicle)) {
    problems.push("Vehicle number format is invalid (example MH12AB1234).");
  }

  if (transporter && !GSTIN_REGEX.test(transporter)) {
    problems.push("Transporter GSTIN is invalid.");
  }

  if (details.transportMode === "ROAD") {
    if (!vehicle && !transporter) {
      problems.push(
        "Enter a vehicle number or a transporter GSTIN for road transport.",
      );
    }
  } else if (!details.transportDocNumber.trim() || !details.transportDocDate) {
    problems.push(
      "Transport document number and date are required for rail, air or ship.",
    );
  }

  return problems;
};

const buildDetailsBody = (details) => {
  const body = {
    transportMode: details.transportMode,
    vehicleType: details.vehicleType,
    vehicleNumber: details.vehicleNumber.trim().toUpperCase(),
    transporterId: details.transporterId.trim().toUpperCase(),
    transporterName: details.transporterName.trim(),
    transportDocNumber: details.transportDocNumber.trim(),
    transportDocDate: details.transportDocDate,
    fromPlace: details.fromPlace.trim(),
    fromPincode: details.fromPincode.trim(),
    fromStateCode: details.fromStateCode,
    toPlace: details.toPlace.trim(),
    toPincode: details.toPincode.trim(),
    toStateCode: details.toStateCode,
  };

  if (details.distanceKm !== "") {
    body.distanceKm = Number(details.distanceKm);
  }

  // The server rejects empty required strings, so leave blanks out.
  for (const key of [
    "fromPlace",
    "fromPincode",
    "fromStateCode",
    "toPlace",
    "toPincode",
    "toStateCode",
  ]) {
    if (!body[key]) delete body[key];
  }

  return body;
};

export default function EwayBillModal({ invoiceNumber, onClose, onUpdated }) {
  const [invoice, setInvoice] = useState(null);
  const [details, setDetails] = useState(() => detailsFromInvoice());
  const [record, setRecord] = useState(initialRecord);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState([]);

  const requestRef = useRef(0);
  const lock = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const requestId = ++requestRef.current;

    const loadInvoice = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await salesInvoiceApi.getByNumber(invoiceNumber);
        const data = response?.data;
        const loaded = data?.invoice || data?.data || data;

        if (
          data?.success === false ||
          !loaded?._id ||
          loaded.invoiceNumber !== invoiceNumber
        ) {
          throw new Error(
            data?.message || "Unable to load the complete sales invoice.",
          );
        }

        if (loaded.status !== "POSTED") {
          throw new Error("Post this invoice before generating an e-way bill.");
        }

        if (loaded.ewayBill?.status === "GENERATED") {
          throw new Error(
            "An e-way bill has already been recorded for this invoice.",
          );
        }

        if (!Array.isArray(loaded.items) || goodsOf(loaded).length === 0) {
          throw new Error(
            "This invoice has no goods items. E-way bill generation is not applicable.",
          );
        }

        if (!isRequired(loaded)) {
          throw new Error(
            `The goods value is ${formatPaise(
              goodsValuePaise(loaded),
            )}. A mandatory e-way bill is not required because the goods value does not exceed ₹50,000.`,
          );
        }

        if (active && requestId === requestRef.current) {
          setInvoice(loaded);
          setDetails(detailsFromInvoice(loaded.ewayBill));
        }
      } catch (err) {
        if (active && requestId === requestRef.current) {
          const message =
            getErrors(err)[0] || err?.message || "Unable to load the invoice.";

          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (active && requestId === requestRef.current) {
          setLoading(false);
        }
      }
    };

    loadInvoice();

    return () => {
      active = false;
      requestRef.current += 1;
    };
  }, [invoiceNumber]);

  const locked = Boolean(busy);
  const ready = !loading && !loadError && Boolean(invoice);
  const isRoad = details.transportMode === "ROAD";

  const setDetail = (event) => {
    const { name, value } = event.target;

    setDetails((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const setRecordField = (event) => {
    const { name, value } = event.target;

    setRecord((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const fail = (messages) => {
    const list = Array.isArray(messages) ? messages : [messages];

    setErrors(list);
    toast.error(list[0]);
  };

  const persistDetails = async (current) => {
    const response = await salesInvoiceApi.saveEwayBill(invoiceNumber, {
      ...buildDetailsBody(details),
      version: current.__v,
    });

    const updated = response?.data?.invoice;

    if (response?.data?.success !== true || !updated?._id) {
      throw new Error(
        response?.data?.message || "The server returned an invalid response.",
      );
    }

    return updated;
  };

  const runBusy = async (name, task) => {
    if (lock.current || locked || !invoice) return;

    lock.current = true;
    setBusy(name);
    setErrors([]);

    try {
      await task();
    } catch (error) {
      if (alive.current) fail(getErrors(error));
    } finally {
      lock.current = false;

      if (alive.current) setBusy("");
    }
  };

  const applyUpdated = (updated) => {
    setInvoice(updated);
    onUpdated?.(updated);
  };

  /* ------------------ SAVE DETAILS ------------------ */

  const handleSave = () => {
    const problems = validateDetails(details);

    if (problems.length) return fail(problems);

    return runBusy("save", async () => {
      const updated = await persistDetails(invoice);

      if (!alive.current) return;

      applyUpdated(updated);
      toast.success("E-way bill details saved");
    });
  };

  /* ------------------ DOWNLOAD PORTAL JSON ------------------ */

  const handleDownload = () => {
    const problems = validateDetails(details);

    if (problems.length) return fail(problems);

    return runBusy("export", async () => {
      // The server builds the JSON from saved data, so save first.
      const updated = await persistDetails(invoice);

      if (!alive.current) return;

      applyUpdated(updated);

      const response = await salesInvoiceApi.exportEwayBill(invoiceNumber);
      const { payload, fileName } = response?.data || {};

      if (!payload) {
        throw new Error("The server did not return an e-way bill file.");
      }

      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      );

      const link = document.createElement("a");

      link.href = url;
      link.download = fileName || `EWB_${invoiceNumber}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      toast.success("JSON ready. Upload it on the e-way bill portal.");
    });
  };

  /* ------------------ RECORD GENERATED E-WAY BILL ------------------ */

  const handleRecord = () => {
    const problems = validateDetails(details);

    if (!EWB_NUMBER_REGEX.test(record.ewbNumber || "")) {
      problems.unshift("E-way bill number must be 12 digits.");
    }

    const ewbDateIso = fromLocalInput(record.ewbDate);

    if (!ewbDateIso) {
      problems.unshift("Enter a valid e-way bill date and time.");
    } else if (new Date(ewbDateIso).getTime() > Date.now() + CLOCK_SKEW_MS) {
      problems.unshift("E-way bill date cannot be in the future.");
    }

    let validIso = "";

    if (record.validUntil) {
      validIso = fromLocalInput(record.validUntil);

      if (!validIso) {
        problems.unshift("Enter a valid 'valid until' date and time.");
      } else if (ewbDateIso && new Date(validIso) <= new Date(ewbDateIso)) {
        problems.unshift("Valid until must be after the e-way bill date.");
      }
    }

    if (problems.length) return fail(problems);

    return runBusy("record", async () => {
      // Distance is needed server side to calculate validity, so save first.
      const saved = await persistDetails(invoice);

      if (!alive.current) return;

      setInvoice(saved);

      const body = {
        ewbNumber: record.ewbNumber,
        ewbDate: ewbDateIso,
        version: saved.__v,
      };

      if (validIso) body.validUntil = validIso;

      const response = await salesInvoiceApi.recordEwayBill(invoiceNumber, body);
      const updated = response?.data?.invoice;

      if (response?.data?.success !== true || !updated?._id) {
        throw new Error(
          response?.data?.message || "The server returned an invalid response.",
        );
      }

      if (!alive.current) return;

      onUpdated?.(updated);
      toast.success("E-way bill recorded");
      onClose?.();
    });
  };

  const suggested =
    !record.validUntil && record.ewbDate && details.distanceKm
      ? suggestValidUntil(
          new Date(record.ewbDate),
          details.distanceKm,
          details.vehicleType,
        )
      : null;

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={locked}
      >
        Cancel
      </Button>

      {ready && (
        <div className="box-modal-footer-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSave}
            loading={busy === "save"}
            disabled={locked}
          >
            Save Details
          </Button>

          <Button
            type="button"
            variant="secondary"
            icon={Download}
            onClick={handleDownload}
            loading={busy === "export"}
            disabled={locked}
          >
            Download Portal JSON
          </Button>

          <Button
            type="button"
            variant="primary"
            icon={Send}
            onClick={handleRecord}
            loading={busy === "record"}
            disabled={locked}
          >
            Record E-Way Bill
          </Button>
        </div>
      )}
    </>
  );

  return (
    <BoxModal
      show
      onClose={() => {
        if (!locked) onClose?.();
      }}
      title="Generate E-Way Bill"
      subtitle={`Invoice ${invoiceNumber} · Transport and e-way bill details`}
      width="1100px"
      footer={footer}
    >
      {loading && (
        <div className="doc-note" role="status">
          Loading invoice and transport details...
        </div>
      )}

      {!loading && loadError && (
        <div className="doc-alert doc-alert-error" role="alert">
          {loadError}
        </div>
      )}

      {ready && errors.length > 0 && (
        <div className="doc-alert doc-alert-error" role="alert">
          <strong>Please review the following</strong>

          <ul>
            {errors.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {ready && (
        <>
          {/* INVOICE INFORMATION */}
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <FileText size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Invoice Information</h3>
                <p>Review invoice and goods value before proceeding</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="Invoice Number"
                name="invoiceNumber"
                value={invoice.invoiceNumber}
                readOnly
              />

              <Input
                label="Customer"
                name="customerName"
                value={invoice.customerName || "Not available"}
                readOnly
              />

              <Input
                label="Invoice Status"
                name="status"
                value={invoice.status}
                readOnly
              />

              <Input
                label="Goods Value"
                name="goodsValue"
                value={formatPaise(goodsValuePaise(invoice))}
                readOnly
              />
            </div>
          </div>

          {/* TRANSPORT DETAILS */}
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <Truck size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Transport Details</h3>
                <p>Mode, vehicle, transporter and transport document</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="Distance (km)"
                name="distanceKm"
                type="number"
                min="1"
                max="4000"
                step="1"
                value={details.distanceKm}
                onChange={setDetail}
                placeholder="Enter distance in km"
                required
                disabled={locked}
              />

              <Select
                label="Transport Mode"
                name="transportMode"
                value={details.transportMode}
                onChange={setDetail}
                options={TRANSPORT_MODE_OPTIONS}
                disabled={locked}
              />

              <Select
                label="Vehicle Type"
                name="vehicleType"
                value={details.vehicleType}
                onChange={setDetail}
                options={VEHICLE_TYPE_OPTIONS}
                disabled={locked}
              />

              <Input
                label="Vehicle Number"
                name="vehicleNumber"
                value={details.vehicleNumber}
                onChange={setDetail}
                placeholder="MH12AB1234"
                maxLength={30}
                required={isRoad}
                disabled={locked}
              />

              <Input
                label="Transporter GSTIN"
                name="transporterId"
                value={details.transporterId}
                onChange={setDetail}
                placeholder="29XXXXXXXXXXXXXX"
                maxLength={15}
                disabled={locked}
              />

              <Input
                label="Transporter Name"
                name="transporterName"
                value={details.transporterName}
                onChange={setDetail}
                placeholder="Enter transporter name"
                maxLength={200}
                disabled={locked}
              />

              <Input
                label={
                  isRoad ? "Transport Doc No. (LR)" : "Transport Doc No."
                }
                name="transportDocNumber"
                value={details.transportDocNumber}
                onChange={setDetail}
                placeholder="Enter document number"
                maxLength={100}
                required={!isRoad}
                disabled={locked}
              />

              <Input
                label="Transport Doc Date"
                name="transportDocDate"
                type="date"
                value={details.transportDocDate}
                onChange={setDetail}
                required={!isRoad}
                disabled={locked}
              />
            </div>

            {isRoad && (
              <p className="doc-note">
                For road transport enter a vehicle number or a transporter
                GSTIN.
              </p>
            )}
          </div>

          {/* DISPATCH FROM */}
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <MapPin size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Dispatch From</h3>
                <p>Where the goods are sent from</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="Place"
                name="fromPlace"
                value={details.fromPlace}
                onChange={setDetail}
                placeholder="Enter dispatch place"
                maxLength={50}
                required
                disabled={locked}
              />

              <Input
                label="Pincode"
                name="fromPincode"
                value={details.fromPincode}
                onChange={setDetail}
                placeholder="587101"
                maxLength={6}
                inputMode="numeric"
                required
                disabled={locked}
              />

              <Select
                label="State"
                name="fromStateCode"
                value={details.fromStateCode}
                onChange={setDetail}
                placeholder="Select state"
                options={STATE_OPTIONS}
                disabled={locked}
              />
            </div>
          </div>

          {/* DELIVER TO */}
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <MapPin size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Deliver To</h3>
                <p>Where the goods are delivered</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="Place"
                name="toPlace"
                value={details.toPlace}
                onChange={setDetail}
                placeholder="Enter delivery place"
                maxLength={50}
                required
                disabled={locked}
              />

              <Input
                label="Pincode"
                name="toPincode"
                value={details.toPincode}
                onChange={setDetail}
                placeholder="587101"
                maxLength={6}
                inputMode="numeric"
                required
                disabled={locked}
              />

              <Select
                label="State"
                name="toStateCode"
                value={details.toStateCode}
                onChange={setDetail}
                placeholder="Select state"
                options={STATE_OPTIONS}
                disabled={locked}
              />
            </div>
          </div>

          {/* RECORD GENERATED E-WAY BILL */}
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <Send size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Record Generated E-Way Bill</h3>
                <p>
                  Download the JSON, upload it under Generate Bulk on the
                  e-way bill portal, then enter the 12-digit number it returns
                </p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="E-Way Bill Number"
                name="ewbNumber"
                value={record.ewbNumber}
                onChange={setRecordField}
                placeholder="12-digit number"
                maxLength={12}
                inputMode="numeric"
                required
                disabled={locked}
              />

              <Input
                label="Generated On"
                name="ewbDate"
                type="datetime-local"
                value={record.ewbDate}
                onChange={setRecordField}
                required
                disabled={locked}
              />

              <Input
                label="Valid Until"
                name="validUntil"
                type="datetime-local"
                value={record.validUntil}
                onChange={setRecordField}
                disabled={locked}
              />
            </div>

            {suggested && (
              <p className="doc-note">
                Leave Valid Until empty to use the calculated{" "}
                {formatDateTime(suggested)}, or copy the exact time from the
                portal.
              </p>
            )}

            {!details.distanceKm && !record.validUntil && (
              <p className="doc-note">
                Enter the distance, or the valid-until time from the portal.
              </p>
            )}
          </div>
        </>
      )}
    </BoxModal>
  );
}