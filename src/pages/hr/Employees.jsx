import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  UsersRound,
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  CreditCard,
  Banknote,
  CheckCircle2,
  X,
  Briefcase,
  Phone,
  Mail,
  UserCheck,
  RotateCcw,
  BookOpen,
} from "lucide-react";

import hrApi from "../../services/modules/hrApi";
import BoxModal from "../../components/common/Modal/BoxModal";
import "./Employees.css";

const fmt = (num) =>
  "₹" + (Number(num) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INITIAL_FORM = {
  name: "",
  employeeCode: "",
  email: "",
  phone: "",
  designation: "Staff",
  department: "General",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  status: "Active",
  panNo: "",
  aadhaarNo: "",
  uanNo: "",
  esiNo: "",
  bankDetails: {
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
  },
  salaryStructure: {
    basicSalary: 0,
    hra: 0,
    conveyance: 0,
    specialAllowance: 0,
    medicalAllowance: 0,
    epfDeduction: 0,
    esiDeduction: 0,
    professionalTax: 0,
    tdsDeduction: 0,
  },
  notes: "",
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState("basic"); // 'basic' | 'salary' | 'bank'
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hrApi.getEmployees({
        search: searchTerm,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setEmployees(res?.data?.employees || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Gross and Net calculation preview
  const salaryPreview = useMemo(() => {
    const s = form.salaryStructure || {};
    const gross =
      (Number(s.basicSalary) || 0) +
      (Number(s.hra) || 0) +
      (Number(s.conveyance) || 0) +
      (Number(s.specialAllowance) || 0) +
      (Number(s.medicalAllowance) || 0);

    const deductions =
      (Number(s.epfDeduction) || 0) +
      (Number(s.esiDeduction) || 0) +
      (Number(s.professionalTax) || 0) +
      (Number(s.tdsDeduction) || 0);

    const net = Math.max(0, gross - deductions);
    return { gross, deductions, net };
  }, [form.salaryStructure]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setActiveTab("basic");
    setModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingId(emp._id);
    setForm({
      name: emp.name || "",
      employeeCode: emp.employeeCode || "",
      email: emp.email || "",
      phone: emp.phone || "",
      designation: emp.designation || "Staff",
      department: emp.department || "General",
      dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().slice(0, 10) : "",
      status: emp.status || "Active",
      panNo: emp.panNo || "",
      aadhaarNo: emp.aadhaarNo || "",
      uanNo: emp.uanNo || "",
      esiNo: emp.esiNo || "",
      bankDetails: {
        bankName: emp.bankDetails?.bankName || "",
        accountNumber: emp.bankDetails?.accountNumber || "",
        ifscCode: emp.bankDetails?.ifscCode || "",
        branch: emp.bankDetails?.branch || "",
      },
      salaryStructure: {
        basicSalary: emp.salaryStructure?.basicSalary || 0,
        hra: emp.salaryStructure?.hra || 0,
        conveyance: emp.salaryStructure?.conveyance || 0,
        specialAllowance: emp.salaryStructure?.specialAllowance || 0,
        medicalAllowance: emp.salaryStructure?.medicalAllowance || 0,
        epfDeduction: emp.salaryStructure?.epfDeduction || 0,
        esiDeduction: emp.salaryStructure?.esiDeduction || 0,
        professionalTax: emp.salaryStructure?.professionalTax || 0,
        tdsDeduction: emp.salaryStructure?.tdsDeduction || 0,
      },
      notes: emp.notes || "",
    });
    setActiveTab("basic");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return toast.error("Employee Name is required");
    }

    setSaving(true);
    try {
      if (editingId) {
        await hrApi.updateEmployee(editingId, form);
        toast.success("Employee and linked Ledger updated successfully");
      } else {
        await hrApi.createEmployee(form);
        toast.success("Employee created with automatic Ledger link");
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save employee");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Are you sure you want to delete employee "${emp.name}"?`)) return;
    try {
      await hrApi.deleteEmployee(emp._id);
      toast.success("Employee deleted successfully");
      fetchEmployees();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete employee");
    }
  };

  return (
    <div className="emp-page-container">
      {/* Header bar */}
      <div className="emp-page-header">
        <div>
          <h1 className="emp-page-title">
            <UsersRound className="emp-title-icon" size={26} />
            Employees & Staff
          </h1>
          <p className="emp-page-sub">
            Manage your team, salary structure, and automated employee ledger accounts
          </p>
        </div>

        <button type="button" className="emp-btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      {/* Top search and filter bar */}
      <div className="emp-filter-bar">
        <div className="emp-search-input-wrapper">
          <Search size={18} className="emp-search-icon" />
          <input
            type="text"
            className="emp-search-input"
            placeholder="Search by name, employee code, phone, designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="emp-status-chips">
          {["ALL", "Active", "Inactive", "On Leave"].map((st) => (
            <button
              key={st}
              type="button"
              className={`emp-status-chip ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Employee List Table */}
      <div className="emp-table-card">
        {loading ? (
          <div className="emp-loading-state">
            <RotateCcw className="emp-spin" size={28} />
            <p>Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="emp-empty-state">
            <UsersRound size={48} className="emp-empty-icon" />
            <h3>No Employees Found</h3>
            <p>Get started by adding your first employee to enable payroll and salary slips.</p>
            <button type="button" className="emp-btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Add Employee
            </button>
          </div>
        ) : (
          <>
            <div className="emp-table-wrapper">
              <table className="emp-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Employee Name</th>
                  <th>Designation / Dept</th>
                  <th>Contact</th>
                  <th>Net Monthly Salary</th>
                  <th>Linked Ledger</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <span className="emp-code-badge">{emp.employeeCode}</span>
                    </td>
                    <td>
                      <div className="emp-name-cell">
                        <strong>{emp.name}</strong>
                        {emp.panNo && <span className="emp-pan">PAN: {emp.panNo}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="emp-meta-cell">
                        <span className="emp-designation">{emp.designation || "Staff"}</span>
                        <span className="emp-department">{emp.department || "General"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="emp-contact-cell">
                        {emp.phone && (
                          <span>
                            <Phone size={12} /> {emp.phone}
                          </span>
                        )}
                        {emp.email && (
                          <span>
                            <Mail size={12} /> {emp.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong className="emp-salary-val">
                        {fmt(emp.salaryStructure?.netSalary || 0)}
                      </strong>
                    </td>
                    <td>
                      <span className="emp-ledger-tag" title="Automatic Accounting Ledger (Liability)">
                        <BookOpen size={12} />
                        {emp.ledgerId?.code || `EMP-${emp.employeeCode}`}
                      </span>
                    </td>
                    <td>
                      <span className={`emp-badge ${String(emp.status).toLowerCase().replace(/\s+/g, "-")}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="emp-action-buttons">
                        <button
                          type="button"
                          className="emp-icon-action"
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit Employee"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="emp-icon-action danger"
                          onClick={() => handleDelete(emp)}
                          title="Delete Employee"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Responsive Mobile Cards for Small Screens */}
          <div className="emp-mobile-cards">
            {employees.map((emp) => (
              <div key={emp._id} className="emp-mobile-card">
                <div className="emp-card-top">
                  <div className="emp-card-identity">
                    <span className="emp-code-badge">{emp.employeeCode}</span>
                    <strong className="emp-card-name">{emp.name}</strong>
                  </div>
                  <span className={`emp-badge ${String(emp.status).toLowerCase().replace(/\s+/g, "-")}`}>
                    {emp.status}
                  </span>
                </div>

                <div className="emp-card-details">
                  <div className="emp-card-row">
                    <span className="emp-card-lbl">Role:</span>
                    <span className="emp-card-val">
                      {emp.designation || "Staff"} &bull; {emp.department || "General"}
                    </span>
                  </div>

                  {(emp.phone || emp.email) && (
                    <div className="emp-card-row">
                      <span className="emp-card-lbl">Contact:</span>
                      <span className="emp-card-val emp-contact-text">
                        {emp.phone && <span><Phone size={12} /> {emp.phone}</span>}
                        {emp.email && <span><Mail size={12} /> {emp.email}</span>}
                      </span>
                    </div>
                  )}

                  <div className="emp-card-row">
                    <span className="emp-card-lbl">Net Salary:</span>
                    <strong className="emp-salary-val">
                      {fmt(emp.salaryStructure?.netSalary || 0)}
                    </strong>
                  </div>

                  <div className="emp-card-row">
                    <span className="emp-card-lbl">Ledger:</span>
                    <span className="emp-ledger-tag">
                      <BookOpen size={12} /> {emp.ledgerId?.code || `EMP-${emp.employeeCode}`}
                    </span>
                  </div>
                </div>

                <div className="emp-card-actions">
                  <button
                    type="button"
                    className="emp-card-btn edit"
                    onClick={() => handleOpenEdit(emp)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="emp-card-btn delete"
                    onClick={() => handleDelete(emp)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>

      {/* Add / Edit Employee BoxModal */}
      <BoxModal
        show={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Employee" : "Add New Employee"}
        subtitle="Configure employee profile, salary breakdown, and statutory details"
        icon={Briefcase}
        width="min(860px, calc(100vw - 24px))"
        footer={
          <div className="emp-modal-footer">
            <button
              type="button"
              className="emp-btn-cancel"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="emp-btn-primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving..." : editingId ? "Update Employee" : "Save Employee"}
            </button>
          </div>
        }
      >
        <div className="emp-modal-inner">
          {/* Modal Navigation Tabs */}
          <div className="emp-modal-tabs">
            <button
              type="button"
              className={`emp-tab-btn ${activeTab === "basic" ? "active" : ""}`}
              onClick={() => setActiveTab("basic")}
            >
              <UserCheck size={15} />
              Basic Information
            </button>
            <button
              type="button"
              className={`emp-tab-btn ${activeTab === "salary" ? "active" : ""}`}
              onClick={() => setActiveTab("salary")}
            >
              <Banknote size={15} />
              Salary Structure
            </button>
            <button
              type="button"
              className={`emp-tab-btn ${activeTab === "bank" ? "active" : ""}`}
              onClick={() => setActiveTab("bank")}
            >
              <CreditCard size={15} />
              Bank & Statutory
            </button>
          </div>

          <form onSubmit={handleSave} className="emp-modal-body">
              {/* TAB 1: BASIC INFORMATION */}
              {activeTab === "basic" && (
                <div className="emp-form-grid">
                  <div className="emp-form-group">
                    <label>Employee Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-001 (auto if empty)"
                      value={form.employeeCode}
                      onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Executive, Cashier, Accountant"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Sales, Operations, Finance"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="employee@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Date of Joining</label>
                    <input
                      type="date"
                      value={form.dateOfJoining}
                      onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>

                  <div className="emp-form-group full">
                    <label>Internal Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Additional notes, address, or emergency contact info..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: SALARY STRUCTURE */}
              {activeTab === "salary" && (
                <div className="emp-salary-layout">
                  <div className="emp-salary-split">
                    {/* Earnings column */}
                    <div className="emp-salary-col earnings">
                      <h4 className="emp-col-title">Monthly Earnings (₹)</h4>
                      <div className="emp-form-group">
                        <label>Basic Salary</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.basicSalary}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                basicSalary: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="emp-form-group">
                        <label>HRA (House Rent Allowance)</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.hra}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                hra: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="emp-form-group">
                        <label>Conveyance Allowance</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.conveyance}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                conveyance: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="emp-form-group">
                        <label>Special Allowance</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.specialAllowance}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                specialAllowance: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="emp-form-group">
                        <label>Medical Allowance</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.medicalAllowance}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                medicalAllowance: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Deductions column */}
                    <div className="emp-salary-col deductions">
                      <h4 className="emp-col-title">Monthly Deductions (₹)</h4>
                      <div className="emp-form-group">
                        <label>Provident Fund (EPF)</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.epfDeduction}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                epfDeduction: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="emp-form-group">
                        <label>ESI Deduction</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.esiDeduction}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                esiDeduction: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="emp-form-group">
                        <label>Professional Tax (PT)</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.professionalTax}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                professionalTax: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="emp-form-group">
                        <label>TDS / Income Tax</label>
                        <input
                          type="number"
                          min="0"
                          value={form.salaryStructure.tdsDeduction}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              salaryStructure: {
                                ...form.salaryStructure,
                                tdsDeduction: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="emp-salary-summary-box">
                    <div>
                      <span>Gross Salary:</span>
                      <strong>{fmt(salaryPreview.gross)}</strong>
                    </div>
                    <div>
                      <span>Total Deductions:</span>
                      <strong className="text-danger">-{fmt(salaryPreview.deductions)}</strong>
                    </div>
                    <div className="emp-net-total">
                      <span>Net In-Hand Salary:</span>
                      <strong className="text-success">{fmt(salaryPreview.net)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BANK & STATUTORY */}
              {activeTab === "bank" && (
                <div className="emp-form-grid">
                  <div className="emp-form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      value={form.bankDetails.bankName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bankDetails: { ...form.bankDetails, bankName: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Account Number</label>
                    <input
                      type="text"
                      placeholder="Bank account number"
                      value={form.bankDetails.accountNumber}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bankDetails: { ...form.bankDetails, accountNumber: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={form.bankDetails.ifscCode}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bankDetails: {
                            ...form.bankDetails,
                            ifscCode: e.target.value.toUpperCase(),
                          },
                        })
                      }
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Branch Name</label>
                    <input
                      type="text"
                      placeholder="e.g. MG Road Branch"
                      value={form.bankDetails.branch}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          bankDetails: { ...form.bankDetails, branch: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>PAN Number</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={form.panNo}
                      onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>Aadhaar Number</label>
                    <input
                      type="text"
                      placeholder="12-digit Aadhaar"
                      value={form.aadhaarNo}
                      onChange={(e) => setForm({ ...form, aadhaarNo: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>UAN Number (PF)</label>
                    <input
                      type="text"
                      placeholder="Universal Account Number"
                      value={form.uanNo}
                      onChange={(e) => setForm({ ...form, uanNo: e.target.value })}
                    />
                  </div>

                  <div className="emp-form-group">
                    <label>ESI Number</label>
                    <input
                      type="text"
                      placeholder="ESI IP Number"
                      value={form.esiNo}
                      onChange={(e) => setForm({ ...form, esiNo: e.target.value })}
                    />
                  </div>
                </div>
              )}

            </form>
          </div>
      </BoxModal>
    </div>
  );
}
