import { useEffect, useMemo, useRef, useState } from "react";

import { Download, FileText, MapPin, Send, Truck } from "lucide-react";

import toast from "react-hot-toast";

import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import Textarea from "../../../components/common/Form/Textarea";
import Button from "../../../components/common/Form/Button";

import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";

import { formatPaise, getErrors } from "./salesInvoiceUtils";

import {
  CANCEL_REASON_OPTIONS,
  EXTEND_REASON_OPTIONS,
  STATE_LABEL,
  STATE_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
  VEHICLE_REASON_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  dateOnlyInput,
  deriveState,
  formatDateTime,
  fromLocalInput,
  goodsOf,
  goodsValuePaise,
  suggestValidUntil,
  toLocalInput,
} from "./ewayBillUtils";

import "./ewayBill.css";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const EWB_NUMBER_REGEX = /^[0-9]{12}$/;
const VEHICLE_REGEX =
  /^(?:[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2}|TM[0-9]{6}[A-Z]?)$/;

const CLOCK_SKEW_MS = 5 * 60 * 1000;

const ACTIONS = {
  record: "Record generated e-way bill",
  vehicle: "Update vehicle",
  extend: "Extend validity",
  cancel: "Cancel e-way bill",
};

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

export function EwayBillBadge({ invoice }) {
  const state = deriveState(invoice);

  if (state === "NOT_APPLICABLE" || state === "NOT_REQUIRED") return null;

  return (
    <span className={`ewb-badge ewb-${state.toLowerCase()}`}>
      {invoice.ewayBill?.ewbNumber && state !== "PENDING"
        ? `EWB ${invoice.ewayBill.ewbNumber}`
        : `EWB ${STATE_LABEL[state]}`}
    </span>
  );
}

export default function EwayBillPanel({ invoice, disabled, onUpdated }) {
  const ewb = invoice.ewayBill || {};
  const state = deriveState(invoice);

  const [details, setDetails] = useState(() => detailsFromInvoice(ewb));
  const [action, setAction] = useState("");
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState([]);

  const lock = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  // Re-sync when the invoice is refreshed after any action.
  useEffect(() => {
    setDetails(detailsFromInvoice(invoice.ewayBill));
  }, [invoice.ewayBill, invoice.__v]);

  const goodsCount = goodsOf(invoice).length;

  const canEditDetails =
    ["CREATED", "POSTED"].includes(invoice.status) &&
    ewb.status !== "GENERATED";

  const posted = invoice.status === "POSTED";
  const generated = ewb.status === "GENERATED";
  const locked = Boolean(disabled) || Boolean(busy);
  const fieldsLocked = locked || !canEditDetails;
  const isRoad = details.transportMode === "ROAD";

  const history = useMemo(
    () => [...(ewb.history || [])].reverse().slice(0, 10),
    [ewb.history],
  );

  if (!goodsCount || invoice.status === "CANCELLED") return null;

  const setDetail = (event) => {
    const { name, value } = event.target;

    setDetails((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const setField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const fail = (messages) => {
    const list = Array.isArray(messages) ? messages : [messages];

    setErrors(list);
    toast.error(list[0]);
  };

  const openAction = (name) => {
    const defaults = {
      record: {
        ewbNumber: "",
        ewbDate: toLocalInput(new Date().toISOString()),
        validUntil: "",
      },
      vehicle: {
        vehicleNumber: "",
        reason: "BREAKDOWN",
        remarks: "",
        fromPlace: ewb.fromPlace || "",
        fromStateCode: ewb.fromStateCode || "",
      },
      extend: {
        newValidUntil: "",
        reason: "OTHERS",
        remarks: "",
        remainingDistanceKm: "",
        currentPlace: "",
        currentStateCode: "",
      },
      cancel: { reason: "DUPLICATE", remarks: "" },
    };

    setForm(defaults[name]);
    setAction(name);
    setErrors([]);
  };

  const readInvoice = (response) => {
    const updated = response?.data?.invoice;

    if (response?.data?.success !== true || !updated?._id) {
      throw new Error(
        response?.data?.message || "The server returned an invalid response.",
      );
    }

    return updated;
  };

  /* Runs a task with the busy lock and error handling. */
  const runBusy = async (name, task) => {
    if (lock.current || locked) return;

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

  const persistDetails = async (current) =>
    readInvoice(
      await salesInvoiceApi.saveEwayBill(current.invoiceNumber, {
        ...buildDetailsBody(details),
        version: current.__v,
      }),
    );

  const withVersion = (body, current = invoice) => ({
    ...body,
    version: current.__v,
  });

  /* ------------------ SAVE DETAILS ------------------ */

  const saveDetails = () => {
    const problems = validateDetails(details);

    if (problems.length) return fail(problems);

    return runBusy("details", async () => {
      const updated = await persistDetails(invoice);

      if (!alive.current) return;

      onUpdated(updated);
      toast.success("E-way bill details saved");
    });
  };

  /* ------------------ DOWNLOAD PORTAL JSON ------------------ */

  const downloadJson = () => {
    const problems = validateDetails(details);

    if (problems.length) return fail(problems);

    return runBusy("export", async () => {
      // The server builds the JSON from saved data, so save first.
      const updated = await persistDetails(invoice);

      if (!alive.current) return;

      onUpdated(updated);

      const response = await salesInvoiceApi.exportEwayBill(
        invoice.invoiceNumber,
      );

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
      link.download = fileName || `EWB_${invoice.invoiceNumber}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      toast.success("JSON ready. Upload it on the e-way bill portal.");
    });
  };

  /* ------------------ ACTION CARD SUBMIT ------------------ */

  const submitRecord = () => {
    const problems = validateDetails(details);

    if (!EWB_NUMBER_REGEX.test(form.ewbNumber || "")) {
      problems.unshift("E-way bill number must be 12 digits.");
    }

    const ewbDateIso = fromLocalInput(form.ewbDate);

    if (!ewbDateIso) {
      problems.unshift("Enter a valid e-way bill date and time.");
    } else if (new Date(ewbDateIso).getTime() > Date.now() + CLOCK_SKEW_MS) {
      problems.unshift("E-way bill date cannot be in the future.");
    }

    let validIso = "";

    if (form.validUntil) {
      validIso = fromLocalInput(form.validUntil);

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

      const body = { ewbNumber: form.ewbNumber, ewbDate: ewbDateIso };

      if (validIso) body.validUntil = validIso;

      const updated = readInvoice(
        await salesInvoiceApi.recordEwayBill(
          invoice.invoiceNumber,
          withVersion(body, saved),
        ),
      );

      if (!alive.current) return;

      onUpdated(updated);
      setAction("");
      toast.success("E-way bill recorded");
    });
  };

  const submitVehicle = () => {
    if (!form.vehicleNumber.trim()) {
      return fail("Enter the new vehicle number.");
    }

    if (!VEHICLE_REGEX.test(form.vehicleNumber.trim().toUpperCase())) {
      return fail("Vehicle number format is invalid (example MH12AB1234).");
    }

    if (!form.fromPlace.trim() || !form.fromStateCode) {
      return fail("Enter the current place and state.");
    }

    if (form.reason === "OTHERS" && !form.remarks.trim()) {
      return fail("Remarks are required when the reason is Others.");
    }

    return runBusy("vehicle", async () => {
      const updated = readInvoice(
        await salesInvoiceApi.updateEwayBillVehicle(
          invoice.invoiceNumber,
          withVersion({
            vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
            reason: form.reason,
            remarks: form.remarks.trim(),
            fromPlace: form.fromPlace.trim(),
            fromStateCode: form.fromStateCode,
          }),
        ),
      );

      if (!alive.current) return;

      onUpdated(updated);
      setAction("");
      toast.success("Vehicle updated");
    });
  };

  const submitExtend = () => {
    const newValidIso = fromLocalInput(form.newValidUntil);

    if (!newValidIso) {
      return fail("Enter the new valid-until date and time.");
    }

    if (ewb.validUntil && new Date(newValidIso) <= new Date(ewb.validUntil)) {
      return fail("New validity must be later than the current validity.");
    }

    if (
      !Number(form.remainingDistanceKm) ||
      !form.currentPlace.trim() ||
      !form.currentStateCode
    ) {
      return fail("Remaining distance, current place and state are required.");
    }

    if (form.reason === "OTHERS" && !form.remarks.trim()) {
      return fail("Remarks are required when the reason is Others.");
    }

    return runBusy("extend", async () => {
      const updated = readInvoice(
        await salesInvoiceApi.extendEwayBill(
          invoice.invoiceNumber,
          withVersion({
            newValidUntil: newValidIso,
            reason: form.reason,
            remarks: form.remarks.trim(),
            remainingDistanceKm: Number(form.remainingDistanceKm),
            currentPlace: form.currentPlace.trim(),
            currentStateCode: form.currentStateCode,
          }),
        ),
      );

      if (!alive.current) return;

      onUpdated(updated);
      setAction("");
      toast.success("Validity extended");
    });
  };

  const submitCancel = () => {
    if (form.reason === "OTHERS" && !form.remarks.trim()) {
      return fail("Remarks are required when the reason is Others.");
    }

    return runBusy("cancel", async () => {
      const updated = readInvoice(
        await salesInvoiceApi.cancelEwayBill(
          invoice.invoiceNumber,
          withVersion({
            reason: form.reason,
            remarks: form.remarks.trim(),
          }),
        ),
      );

      if (!alive.current) return;

      onUpdated(updated);
      setAction("");
      toast.success("E-way bill cancelled");
    });
  };

  const submitAction = () => {
    if (action === "record") return submitRecord();
    if (action === "vehicle") return submitVehicle();
    if (action === "extend") return submitExtend();
    if (action === "cancel") return submitCancel();
  };

  const suggested =
    action === "record" && !form.validUntil && form.ewbDate
      ? suggestValidUntil(
          new Date(form.ewbDate),
          details.distanceKm,
          details.vehicleType,
        )
      : null;

  return (
    <section className="doc-panel ewb-panel" aria-label="E-way bill">
      <div className="ewb-header">
        <h2 className="doc-panel-title">
          <Truck size={16} /> E-Way Bill
        </h2>

        <span className={`ewb-badge ewb-${state.toLowerCase()}`}>
          {STATE_LABEL[state]}
        </span>
      </div>

      {errors.length > 0 && (
        <div className="doc-alert doc-alert-error" role="alert">
          <strong>Please review the following</strong>

          <ul>
            {errors.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* INVOICE INFORMATION */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <FileText size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Invoice Information</h3>
            <p>
              {state === "PENDING"
                ? "Goods value is above ₹50,000, so an e-way bill is required before the goods move"
                : state === "NOT_REQUIRED"
                  ? "Goods value is at or below ₹50,000. You can still generate one voluntarily"
                  : "Invoice and e-way bill summary"}
            </p>
          </div>
        </div>

        <div className="ewb-summary">
          <div>
            <span>Invoice number</span>
            <strong>{invoice.invoiceNumber}</strong>
          </div>
          <div>
            <span>Customer</span>
            <strong>{invoice.customerName || "Not available"}</strong>
          </div>
          <div>
            <span>Invoice status</span>
            <strong>{invoice.status}</strong>
          </div>
          <div>
            <span>Goods value</span>
            <strong>{formatPaise(goodsValuePaise(invoice))}</strong>
          </div>
        </div>

        {generated && (
          <div className="ewb-summary">
            <div>
              <span>E-way bill no.</span>
              <strong>{ewb.ewbNumber}</strong>
            </div>
            <div>
              <span>Generated</span>
              <strong>{formatDateTime(ewb.ewbDate)}</strong>
            </div>
            <div>
              <span>Valid until</span>
              <strong>{formatDateTime(ewb.validUntil)}</strong>
            </div>
            <div>
              <span>Vehicle</span>
              <strong>{ewb.vehicleNumber || ewb.transporterId || "—"}</strong>
            </div>
          </div>
        )}

        {ewb.status === "CANCELLED" && (
          <p className="doc-note">
            E-way bill {ewb.ewbNumber} was cancelled on{" "}
            {formatDateTime(ewb.cancelledAt)}. Enter details and record a new
            one to continue.
          </p>
        )}
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

        <fieldset className="ewb-fieldset" disabled={fieldsLocked}>
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
              disabled={fieldsLocked}
            />

            <Select
              label="Transport Mode"
              name="transportMode"
              value={details.transportMode}
              onChange={setDetail}
              options={TRANSPORT_MODE_OPTIONS}
              disabled={fieldsLocked}
            />

            <Select
              label="Vehicle Type"
              name="vehicleType"
              value={details.vehicleType}
              onChange={setDetail}
              options={VEHICLE_TYPE_OPTIONS}
              disabled={fieldsLocked}
            />

            <Input
              label="Vehicle Number"
              name="vehicleNumber"
              value={details.vehicleNumber}
              onChange={setDetail}
              placeholder="MH12AB1234"
              maxLength={30}
              required={isRoad}
              disabled={fieldsLocked}
            />

            <Input
              label="Transporter GSTIN"
              name="transporterId"
              value={details.transporterId}
              onChange={setDetail}
              placeholder="29XXXXXXXXXXXXXX"
              maxLength={15}
              disabled={fieldsLocked}
            />

            <Input
              label="Transporter Name"
              name="transporterName"
              value={details.transporterName}
              onChange={setDetail}
              placeholder="Enter transporter name"
              maxLength={200}
              disabled={fieldsLocked}
            />

            <Input
              label={isRoad ? "Transport Doc No. (LR)" : "Transport Doc No."}
              name="transportDocNumber"
              value={details.transportDocNumber}
              onChange={setDetail}
              placeholder="Enter document number"
              maxLength={100}
              required={!isRoad}
              disabled={fieldsLocked}
            />

            <Input
              label="Transport Doc Date"
              name="transportDocDate"
              type="date"
              value={details.transportDocDate}
              onChange={setDetail}
              required={!isRoad}
              disabled={fieldsLocked}
            />
          </div>
        </fieldset>

        {isRoad && (
          <p className="doc-note">
            For road transport enter a vehicle number or a transporter GSTIN.
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

        <fieldset className="ewb-fieldset" disabled={fieldsLocked}>
          <div className="box-modal-form-grid">
            <Input
              label="Place"
              name="fromPlace"
              value={details.fromPlace}
              onChange={setDetail}
              placeholder="Enter dispatch place"
              maxLength={50}
              required
              disabled={fieldsLocked}
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
              disabled={fieldsLocked}
            />

            <Select
              label="State"
              name="fromStateCode"
              value={details.fromStateCode}
              onChange={setDetail}
              placeholder="Select state"
              options={STATE_OPTIONS}
              disabled={fieldsLocked}
            />
          </div>
        </fieldset>
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

        <fieldset className="ewb-fieldset" disabled={fieldsLocked}>
          <div className="box-modal-form-grid">
            <Input
              label="Place"
              name="toPlace"
              value={details.toPlace}
              onChange={setDetail}
              placeholder="Enter delivery place"
              maxLength={50}
              required
              disabled={fieldsLocked}
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
              disabled={fieldsLocked}
            />

            <Select
              label="State"
              name="toStateCode"
              value={details.toStateCode}
              onChange={setDetail}
              placeholder="Select state"
              options={STATE_OPTIONS}
              disabled={fieldsLocked}
            />
          </div>
        </fieldset>
      </div>

      {/* ACTION BUTTONS */}
      <div className="ewb-actions">
        {canEditDetails && (
          <Button
            type="button"
            variant="secondary"
            disabled={locked}
            loading={busy === "details"}
            onClick={saveDetails}
          >
            Save Details
          </Button>
        )}

        {posted && !generated && (
          <>
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              disabled={locked}
              loading={busy === "export"}
              onClick={downloadJson}
            >
              Download Portal JSON
            </Button>

            <Button
              type="button"
              variant="primary"
              icon={Send}
              disabled={locked}
              onClick={() => openAction("record")}
            >
              Record Generated E-Way Bill
            </Button>
          </>
        )}

        {generated && (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={locked}
              onClick={() => openAction("vehicle")}
            >
              Update Vehicle
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={locked}
              onClick={() => openAction("extend")}
            >
              Extend Validity
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={locked}
              onClick={() => openAction("cancel")}
            >
              Cancel E-Way Bill
            </Button>
          </>
        )}
      </div>

      {!posted && (
        <p className="doc-note">
          Post the invoice to generate or record an e-way bill. You can save
          transport details now.
        </p>
      )}

      {posted && !generated && (
        <p className="doc-note">
          Download the JSON, upload it under Generate Bulk on the e-way bill
          portal, then record the 12-digit number it returns here.
        </p>
      )}

      {/* ACTION CARD */}
      {action && (
        <div className="ewb-action-card">
          <h3 className="ewb-subtitle">{ACTIONS[action]}</h3>

          <fieldset className="ewb-fieldset" disabled={locked}>
            <div className="box-modal-form-grid">
              {action === "record" && (
                <>
                  <Input
                    label="E-Way Bill Number"
                    name="ewbNumber"
                    value={form.ewbNumber}
                    onChange={setField}
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
                    value={form.ewbDate}
                    onChange={setField}
                    required
                    disabled={locked}
                  />

                  <Input
                    label="Valid Until"
                    name="validUntil"
                    type="datetime-local"
                    value={form.validUntil}
                    onChange={setField}
                    disabled={locked}
                  />
                </>
              )}

              {action === "vehicle" && (
                <>
                  <Input
                    label="New Vehicle Number"
                    name="vehicleNumber"
                    value={form.vehicleNumber}
                    onChange={setField}
                    placeholder="MH12AB1234"
                    maxLength={30}
                    required
                    disabled={locked}
                  />

                  <Select
                    label="Reason"
                    name="reason"
                    value={form.reason}
                    onChange={setField}
                    options={VEHICLE_REASON_OPTIONS}
                    disabled={locked}
                  />

                  <Input
                    label="Current Place"
                    name="fromPlace"
                    value={form.fromPlace}
                    onChange={setField}
                    maxLength={50}
                    required
                    disabled={locked}
                  />

                  <Select
                    label="Current State"
                    name="fromStateCode"
                    value={form.fromStateCode}
                    onChange={setField}
                    placeholder="Select state"
                    options={STATE_OPTIONS}
                    disabled={locked}
                  />
                </>
              )}

              {action === "extend" && (
                <>
                  <Input
                    label="New Valid Until"
                    name="newValidUntil"
                    type="datetime-local"
                    value={form.newValidUntil}
                    onChange={setField}
                    required
                    disabled={locked}
                  />

                  <Select
                    label="Reason"
                    name="reason"
                    value={form.reason}
                    onChange={setField}
                    options={EXTEND_REASON_OPTIONS}
                    disabled={locked}
                  />

                  <Input
                    label="Remaining Distance (km)"
                    name="remainingDistanceKm"
                    type="number"
                    min="1"
                    max="4000"
                    value={form.remainingDistanceKm}
                    onChange={setField}
                    required
                    disabled={locked}
                  />

                  <Input
                    label="Current Place"
                    name="currentPlace"
                    value={form.currentPlace}
                    onChange={setField}
                    maxLength={50}
                    required
                    disabled={locked}
                  />

                  <Select
                    label="Current State"
                    name="currentStateCode"
                    value={form.currentStateCode}
                    onChange={setField}
                    placeholder="Select state"
                    options={STATE_OPTIONS}
                    disabled={locked}
                  />
                </>
              )}

              {action === "cancel" && (
                <Select
                  label="Reason"
                  name="reason"
                  value={form.reason}
                  onChange={setField}
                  options={CANCEL_REASON_OPTIONS}
                  disabled={locked}
                />
              )}
            </div>

            {action !== "record" && (
              <div className="box-modal-form-full">
                <Textarea
                  label="Remarks"
                  name="remarks"
                  value={form.remarks}
                  onChange={setField}
                  maxLength={500}
                  rows={2}
                  placeholder={
                    form.reason === "OTHERS"
                      ? "Remarks (required)"
                      : "Remarks (optional)"
                  }
                  disabled={locked}
                />
              </div>
            )}
          </fieldset>

          {suggested && (
            <p className="doc-note">
              Leave Valid Until empty to use the calculated{" "}
              {formatDateTime(suggested)}, or copy the exact time from the
              portal.
            </p>
          )}

          {action === "record" && !details.distanceKm && !form.validUntil && (
            <p className="doc-note">
              Enter the distance above, or the valid-until time from the
              portal.
            </p>
          )}

          {action === "cancel" && (
            <p className="doc-note">
              Cancel on the portal first (allowed within 24 hours of generation
              and before the goods are verified), then confirm it here so your
              records match.
            </p>
          )}

          <div className="ewb-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(busy)}
              onClick={() => setAction("")}
            >
              Close
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={locked}
              loading={busy === action}
              onClick={submitAction}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {history.length > 0 && (
        <details className="ewb-history">
          <summary>Activity</summary>

          <ul>
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                <strong>{entry.type.replaceAll("_", " ")}</strong>
                <span>{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}