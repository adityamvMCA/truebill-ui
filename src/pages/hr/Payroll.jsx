import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Pencil,
  PlayCircle,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";

import hrApi from "../../services/modules/hrApi";
import "./Payroll.css";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const fmt = (num) =>
  "₹" + (Number(num) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const numberToWords = (num) => {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = ("000000000" + Math.round(Number(num) || 0)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore " : "";
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh " : "";
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand " : "";
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred " : "";
  str += Number(n[5]) !== 0 ? (str !== "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) : "";
  return str.trim() ? "Rupees " + str.trim() + " Only" : "Zero Rupees";
};

export default function Payroll() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [slips, setSlips] = useState([]);
  const [summary, setSummary] = useState({
    totalNet: 0,
    totalGross: 0,
    totalDeductions: 0,
    paidCount: 0,
    unpaidCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Modals state
  const [viewSlip, setViewSlip] = useState(null);
  const [payModalSlip, setPayModalSlip] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: "BANK_TRANSFER",
    paymentReference: "",
  });
  const [paying, setPaying] = useState(false);

  // Tenant / Company details for printable salary slip
  const tenant = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenant") || "{}");
    } catch {
      return {};
    }
  }, []);

  const fetchSlips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hrApi.getSalarySlips({
        month: selectedMonth,
        year: selectedYear,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: searchTerm,
      });
      setSlips(res?.data?.slips || []);
      if (res?.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, statusFilter, searchTerm]);

  useEffect(() => {
    fetchSlips();
  }, [fetchSlips]);

  // Run monthly payroll
  const handleGeneratePayroll = async () => {
    const monthName = MONTHS.find((m) => m.value === Number(selectedMonth))?.label;
    if (
      !window.confirm(
        `Generate or update payroll for ALL active employees for ${monthName} ${selectedYear}?`
      )
    )
      return;

    setGenerating(true);
    try {
      const res = await hrApi.generatePayroll({
        month: selectedMonth,
        year: selectedYear,
        workingDays: 30,
      });
      toast.success(res?.data?.message || "Payroll generated successfully");
      fetchSlips();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  };

  // Mark as Paid
  const handleOpenPay = (slip) => {
    setPayModalSlip(slip);
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: "BANK_TRANSFER",
      paymentReference: "",
    });
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payModalSlip) return;
    setPaying(true);
    try {
      await hrApi.markSalaryPaid(payModalSlip._id, paymentForm);
      toast.success(`Salary marked as PAID for ${payModalSlip.employeeName}`);
      setPayModalSlip(null);
      fetchSlips();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark salary as paid");
    } finally {
      setPaying(false);
    }
  };

  // Delete slip
  const handleDeleteSlip = async (slip) => {
    if (!window.confirm(`Delete salary slip ${slip.slipNumber} for ${slip.employeeName}?`)) return;
    try {
      await hrApi.deleteSalarySlip(slip._id);
      toast.success("Salary slip deleted");
      fetchSlips();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete salary slip");
    }
  };

  // Print Salary Slip
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pay-page-container">
      {/* Top Header */}
      <div className="pay-page-header">
        <div>
          <h1 className="pay-page-title">
            <Banknote className="pay-title-icon" size={26} />
            Payroll & Salary Slips
          </h1>
          <p className="pay-page-sub">
            Generate monthly salary slips, record payouts, and print professional employee payslips
          </p>
        </div>

        <button
          type="button"
          className="pay-btn-generate"
          onClick={handleGeneratePayroll}
          disabled={generating}
        >
          {generating ? <RotateCcw className="pay-spin" size={17} /> : <PlayCircle size={17} />}
          <span>{generating ? "Generating..." : "Run Monthly Payroll"}</span>
        </button>
      </div>

      {/* Month & Year Filter Bar */}
      <div className="pay-control-bar">
        <div className="pay-period-selectors">
          <div className="pay-select-wrapper">
            <Calendar size={16} className="pay-select-icon" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="pay-select"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pay-select-wrapper">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="pay-select"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="pay-status-chips">
            {["ALL", "PAID", "UNPAID"].map((st) => (
              <button
                key={st}
                type="button"
                className={`pay-status-chip ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="pay-search-wrapper">
          <Search size={16} className="pay-search-icon" />
          <input
            type="text"
            className="pay-search-input"
            placeholder="Search employee, slip #, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="pay-kpi-grid">
        <div className="pay-kpi-card total">
          <span className="pay-kpi-label">Total Net Payroll</span>
          <strong className="pay-kpi-val">{fmt(summary.totalNet)}</strong>
          <span className="pay-kpi-sub">{slips.length} total salary slips generated</span>
        </div>

        <div className="pay-kpi-card gross">
          <span className="pay-kpi-label">Gross Earnings</span>
          <strong className="pay-kpi-val">{fmt(summary.totalGross)}</strong>
          <span className="pay-kpi-sub">Before deductions & taxes</span>
        </div>

        <div className="pay-kpi-card deductions">
          <span className="pay-kpi-label">Total Deductions</span>
          <strong className="pay-kpi-val text-danger">-{fmt(summary.totalDeductions)}</strong>
          <span className="pay-kpi-sub">EPF, ESI, PT, and TDS</span>
        </div>

        <div className="pay-kpi-card status">
          <span className="pay-kpi-label">Payment Status</span>
          <div className="pay-kpi-split">
            <span className="badge-paid">Paid: {summary.paidCount}</span>
            <span className="badge-unpaid">Unpaid: {summary.unpaidCount}</span>
          </div>
          <span className="pay-kpi-sub">Current selected month</span>
        </div>
      </div>

      {/* Salary Slips Table Card */}
      <div className="pay-table-card">
        {loading ? (
          <div className="pay-loading-state">
            <RotateCcw className="pay-spin" size={28} />
            <p>Loading salary slips...</p>
          </div>
        ) : slips.length === 0 ? (
          <div className="pay-empty-state">
            <FileSpreadsheet size={48} className="pay-empty-icon" />
            <h3>No Salary Slips for This Period</h3>
            <p>
              Click <strong>"Run Monthly Payroll"</strong> to auto-calculate salary slips for all active employees based on their salary structures.
            </p>
            <button
              type="button"
              className="pay-btn-generate"
              onClick={handleGeneratePayroll}
              disabled={generating}
            >
              <PlayCircle size={16} /> Run Monthly Payroll
            </button>
          </div>
        ) : (
          <div className="pay-table-wrapper">
            <table className="pay-table">
              <thead>
                <tr>
                  <th>Slip No</th>
                  <th>Employee</th>
                  <th>Designation / Dept</th>
                  <th>Period</th>
                  <th style={{ textAlign: "right" }}>Gross</th>
                  <th style={{ textAlign: "right" }}>Deductions</th>
                  <th style={{ textAlign: "right" }}>Net Salary</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((slip) => (
                  <tr key={slip._id}>
                    <td>
                      <span className="pay-slip-badge">{slip.slipNumber}</span>
                    </td>
                    <td>
                      <div className="pay-emp-name-cell">
                        <strong>{slip.employeeName}</strong>
                        <small>{slip.employeeCode}</small>
                      </div>
                    </td>
                    <td>
                      <div className="pay-dept-cell">
                        <span>{slip.designation || "Staff"}</span>
                        <small>{slip.department || "General"}</small>
                      </div>
                    </td>
                    <td>
                      <span className="pay-period-badge">{slip.period}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span>{fmt(slip.earnings?.totalEarnings)}</span>
                    </td>
                    <td style={{ textAlign: "right", color: "#dc2626" }}>
                      <span>-{fmt(slip.deductions?.totalDeductions)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong className="pay-net-val">{fmt(slip.netSalary)}</strong>
                    </td>
                    <td>
                      <span className={`pay-status-badge ${slip.status.toLowerCase()}`}>
                        {slip.status === "PAID" ? (
                          <>
                            <CheckCircle2 size={12} /> Paid
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> Unpaid
                          </>
                        )}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="pay-actions-cell">
                        {slip.status === "UNPAID" && (
                          <button
                            type="button"
                            className="pay-btn-action pay"
                            onClick={() => handleOpenPay(slip)}
                            title="Mark Salary as Paid"
                          >
                            <CreditCard size={13} /> Pay
                          </button>
                        )}

                        <button
                          type="button"
                          className="pay-btn-action view"
                          onClick={() => setViewSlip(slip)}
                          title="View & Print Salary Slip"
                        >
                          <FileText size={13} /> View Slip
                        </button>

                        <button
                          type="button"
                          className="pay-icon-btn danger"
                          onClick={() => handleDeleteSlip(slip)}
                          title="Delete Slip"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL 1: VIEW & PRINT SALARY SLIP (Standard Indian Slip Format)
          ============================================================ */}
      {viewSlip && (
        <div
          className="pay-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewSlip(null);
          }}
        >
          <div className="pay-slip-modal-card">
            <div className="pay-slip-modal-header no-print">
              <div className="pay-slip-modal-title">
                <FileText size={18} />
                <span>Salary Slip Preview ({viewSlip.slipNumber})</span>
              </div>
              <div className="pay-slip-modal-actions">
                <button type="button" className="pay-btn-print" onClick={handlePrint}>
                  <Printer size={16} /> Print Salary Slip
                </button>
                <button
                  type="button"
                  className="pay-modal-close"
                  onClick={() => setViewSlip(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE SALARY SLIP CONTENT */}
            <div className="salary-slip-document" id="printable-salary-slip">
              {/* Slip Header */}
              <div className="slip-org-header">
                {tenant?.logo && <img src={tenant.logo} alt="Logo" className="slip-org-logo" />}
                <div className="slip-org-info">
                  <h2 className="slip-org-name">{tenant?.companyName || tenant?.name || "TRUEBILL ENTERPRISES"}</h2>
                  <p className="slip-org-address">
                    {tenant?.address || "Main Commercial Street, City, State - India"}
                  </p>
                  <p className="slip-org-meta">
                    {tenant?.phone && `Phone: ${tenant.phone} | `}
                    {tenant?.email && `Email: ${tenant.email} | `}
                    {tenant?.gstin && `GSTIN: ${tenant.gstin}`}
                  </p>
                </div>
              </div>

              <div className="slip-doc-banner">
                <h3>PAYSLIP FOR THE MONTH OF {viewSlip.period?.toUpperCase()}</h3>
                <span className="slip-no-tag">Slip No: {viewSlip.slipNumber}</span>
              </div>

              {/* Employee & Bank Details Grid */}
              <div className="slip-details-grid">
                <div className="slip-detail-col">
                  <div className="slip-detail-row">
                    <span>Employee Name:</span>
                    <strong>{viewSlip.employeeName}</strong>
                  </div>
                  <div className="slip-detail-row">
                    <span>Employee Code:</span>
                    <strong>{viewSlip.employeeCode || "N/A"}</strong>
                  </div>
                  <div className="slip-detail-row">
                    <span>Designation:</span>
                    <span>{viewSlip.designation || "Staff"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span>Department:</span>
                    <span>{viewSlip.department || "General"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span>Date of Joining:</span>
                    <span>
                      {viewSlip.employeeId?.dateOfJoining
                        ? new Date(viewSlip.employeeId.dateOfJoining).toLocaleDateString("en-IN")
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="slip-detail-col">
                  <div className="slip-detail-row">
                    <span>Bank Name:</span>
                    <span>{viewSlip.bankDetailsSnapshot?.bankName || "N/A"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span>Bank A/C No:</span>
                    <span>{viewSlip.bankDetailsSnapshot?.accountNumber || "N/A"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span>IFSC Code:</span>
                    <span>{viewSlip.bankDetailsSnapshot?.ifscCode || "N/A"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span>PAN Number:</span>
                    <span>{viewSlip.bankDetailsSnapshot?.panNo || "N/A"}</span>
                  </div>
                  <div className="slip-detail-row">
                    <span>UAN / PF No:</span>
                    <span>{viewSlip.bankDetailsSnapshot?.uanNo || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Box */}
              <div className="slip-attendance-row">
                <div>Total Working Days: <strong>{viewSlip.workingDays || 30}</strong></div>
                <div>Present Days: <strong>{viewSlip.presentDays || 30}</strong></div>
                <div>Paid Leaves: <strong>{viewSlip.paidLeaves || 0}</strong></div>
                <div>Loss of Pay: <strong>{viewSlip.unpaidLeaves || 0}</strong></div>
              </div>

              {/* Earnings & Deductions Breakdown Table */}
              <div className="slip-breakdown-table-container">
                <table className="slip-breakdown-table">
                  <thead>
                    <tr>
                      <th colSpan="2" className="head-earnings">EARNINGS</th>
                      <th colSpan="2" className="head-deductions">DEDUCTIONS</th>
                    </tr>
                    <tr className="sub-head">
                      <th>Component</th>
                      <th className="r">Amount (₹)</th>
                      <th>Component</th>
                      <th className="r">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Basic Salary</td>
                      <td className="r">{fmt(viewSlip.earnings?.basic)}</td>
                      <td>Provident Fund (EPF)</td>
                      <td className="r">{fmt(viewSlip.deductions?.epf)}</td>
                    </tr>
                    <tr>
                      <td>House Rent Allowance (HRA)</td>
                      <td className="r">{fmt(viewSlip.earnings?.hra)}</td>
                      <td>ESI Deduction</td>
                      <td className="r">{fmt(viewSlip.deductions?.esi)}</td>
                    </tr>
                    <tr>
                      <td>Conveyance Allowance</td>
                      <td className="r">{fmt(viewSlip.earnings?.conveyance)}</td>
                      <td>Professional Tax (PT)</td>
                      <td className="r">{fmt(viewSlip.deductions?.professionalTax)}</td>
                    </tr>
                    <tr>
                      <td>Special Allowance</td>
                      <td className="r">{fmt(viewSlip.earnings?.specialAllowance)}</td>
                      <td>TDS / Income Tax</td>
                      <td className="r">{fmt(viewSlip.deductions?.tds)}</td>
                    </tr>
                    <tr>
                      <td>Medical Allowance</td>
                      <td className="r">{fmt(viewSlip.earnings?.medical)}</td>
                      <td>Advance / Other Deductions</td>
                      <td className="r">
                        {fmt(
                          (viewSlip.deductions?.advanceSalary || 0) +
                            (viewSlip.deductions?.otherDeductions || 0)
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Bonus / Overtime</td>
                      <td className="r">
                        {fmt(
                          (viewSlip.earnings?.bonus || 0) +
                            (viewSlip.earnings?.overtime || 0)
                        )}
                      </td>
                      <td>-</td>
                      <td className="r">-</td>
                    </tr>
                    {/* Totals row */}
                    <tr className="slip-total-row">
                      <th>Total Gross Earnings</th>
                      <th className="r">{fmt(viewSlip.earnings?.totalEarnings)}</th>
                      <th>Total Deductions</th>
                      <th className="r text-danger">-{fmt(viewSlip.deductions?.totalDeductions)}</th>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Payable Highlight Card */}
              <div className="slip-net-highlight">
                <div className="slip-net-left">
                  <span className="net-label">NET TAKE-HOME SALARY</span>
                  <strong className="net-figures">{fmt(viewSlip.netSalary)}</strong>
                  <span className="net-words">({numberToWords(viewSlip.netSalary)})</span>
                </div>
                <div className="slip-net-right">
                  <div className="slip-status-pill">
                    Status: <strong>{viewSlip.status}</strong>
                  </div>
                  {viewSlip.paymentDate && (
                    <small>
                      Paid on: {new Date(viewSlip.paymentDate).toLocaleDateString("en-IN")} via{" "}
                      {viewSlip.paymentMode} {viewSlip.paymentReference ? `(${viewSlip.paymentReference})` : ""}
                    </small>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="slip-signature-section">
                <div className="slip-sig-box">
                  <div className="sig-line" />
                  <span>Employee Signature</span>
                </div>
                <div className="slip-sig-box">
                  <div className="sig-line" />
                  <span>Authorised Signatory</span>
                </div>
              </div>

              <div className="slip-footer-note">
                <p>This is a system-generated document. For queries, contact the HR & Accounts department.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: MARK AS PAID MODAL
          ============================================================ */}
      {payModalSlip && (
        <div
          className="pay-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayModalSlip(null);
          }}
        >
          <div className="pay-confirm-modal-card">
            <div className="pay-confirm-header">
              <h3>Record Salary Payment</h3>
              <button
                type="button"
                className="pay-modal-close"
                onClick={() => setPayModalSlip(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="pay-confirm-body">
              <div className="pay-confirm-info">
                <div>
                  <span>Employee:</span>
                  <strong>{payModalSlip.employeeName} ({payModalSlip.employeeCode})</strong>
                </div>
                <div>
                  <span>Pay Period:</span>
                  <strong>{payModalSlip.period}</strong>
                </div>
                <div>
                  <span>Net Payable:</span>
                  <strong className="text-success">{fmt(payModalSlip.netSalary)}</strong>
                </div>
              </div>

              <div className="pay-form-group">
                <label>Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                  }
                />
              </div>

              <div className="pay-form-group">
                <label>Payment Mode *</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentMode: e.target.value })
                  }
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="pay-form-group">
                <label>Reference / UTR / Cheque Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR1234567890 or Cheque #45210"
                  value={paymentForm.paymentReference}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentReference: e.target.value })
                  }
                />
              </div>

              <div className="pay-confirm-footer">
                <button
                  type="button"
                  className="pay-btn-cancel"
                  onClick={() => setPayModalSlip(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="pay-btn-primary" disabled={paying}>
                  {paying ? "Saving..." : "Confirm & Mark Paid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
