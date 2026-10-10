import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import {
  ArrowLeft,
  Plus,
  Save,
  Menu,
  Layers,
  ShieldCheck,
  Route,
  Hash,
  Eye,
  EyeOff,
  Check,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import "./MenuCreate.css";

const VALID_ROLES = [
  "admin",
  "accountant",
  "sales",
  "purchase",
  "inventory",
  "viewer",
];

const emptyChild = () => ({
  id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: "",
  icon: "Circle",
  path: "",
  feature: "",
  order: "",
  roles: [],
  isActive: true,
});

const DEFAULT_FORM = {
  appCode: "truebill",
  group: "",
  groupOrder: 0,
  label: "",
  icon: "LayoutDashboard",
  path: "",
  order: 0,
  feature: "",
  roles: ["admin"],
  children: [],
  isActive: true,
};

const getIcon = (name) => LucideIcons[name] || LucideIcons.Circle;

const unwrapResponse = (response) => response?.data ?? response;

const extractMenus = (response) => {
  const data = unwrapResponse(response);

  if (Array.isArray(data?.menus)) return data.menus;

  if (Array.isArray(data?.menuGroups)) {
    return data.menuGroups.flatMap((group) => group.items || []);
  }

  if (Array.isArray(data?.data?.menus)) return data.data.menus;

  if (Array.isArray(data?.data?.menuGroups)) {
    return data.data.menuGroups.flatMap((group) => group.items || []);
  }

  return [];
};

const normalizeText = (value) => String(value || "").trim();

const MenuCreate = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState("main");
  const [formData, setFormData] = useState({
    ...DEFAULT_FORM,
    roles: [...DEFAULT_FORM.roles],
    children: [],
  });

  const [existingMenus, setExistingMenus] = useState([]);
  const [selectedParentMenu, setSelectedParentMenu] = useState("");
  const [submenu, setSubmenu] = useState(emptyChild());

  const [submitting, setSubmitting] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);

  const selectedParent = useMemo(
    () =>
      existingMenus.find((menu) => menu._id === selectedParentMenu) || null,
    [existingMenus, selectedParentMenu]
  );

  const loadMenus = useCallback(async () => {
    setLoadingMenus(true);

    try {
      const response = await api.menu.getAll("truebill");
      const menus = extractMenus(response);

      const activeMenus = menus
        .filter(
          (menu) =>
            menu &&
            menu._id &&
            menu.isActive !== false &&
            String(menu.appCode || "").toLowerCase() === "truebill"
        )
        .sort(
          (a, b) =>
            Number(a.groupOrder ?? 0) - Number(b.groupOrder ?? 0) ||
            Number(a.order ?? 0) - Number(b.order ?? 0) ||
            String(a.label || "").localeCompare(String(b.label || ""))
        );

      setExistingMenus(activeMenus);

      setSelectedParentMenu((currentSelectedId) => {
        const stillExists = activeMenus.some(
          (menu) => menu._id === currentSelectedId
        );

        return stillExists ? currentSelectedId : "";
      });
    } catch (error) {
      setExistingMenus([]);
      setSelectedParentMenu("");

      toast.error(
        error?.response?.data?.message || "Unable to load existing menus"
      );
    } finally {
      setLoadingMenus(false);
    }
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const changeMode = (nextMode) => {
    setMode(nextMode);

    if (nextMode === "main") {
      setSelectedParentMenu("");
      resetSubmenuForm();
    } else {
      resetSubmenuForm();
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleRole = (role) => {
    setFormData((previous) => ({
      ...previous,
      roles: previous.roles.includes(role)
        ? previous.roles.filter((item) => item !== role)
        : [...previous.roles, role],
    }));
  };

  const updateSubmenu = (field, value) => {
    setSubmenu((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const toggleSubmenuRole = (role) => {
    setSubmenu((previous) => ({
      ...previous,
      roles: previous.roles.includes(role)
        ? previous.roles.filter((item) => item !== role)
        : [...previous.roles, role],
    }));
  };

  const resetMainForm = () => {
    setFormData({
      ...DEFAULT_FORM,
      roles: [...DEFAULT_FORM.roles],
      children: [],
    });
  };

  const resetSubmenuForm = () => {
    setSubmenu(emptyChild());
  };

  const validateMainMenu = () => {
    if (!normalizeText(formData.appCode)) {
      toast.error("Application code is required");
      return false;
    }

    if (!normalizeText(formData.group)) {
      toast.error("Menu group is required");
      return false;
    }

    if (!normalizeText(formData.label)) {
      toast.error("Menu name is required");
      return false;
    }

    if (!normalizeText(formData.icon)) {
      toast.error("Please enter an icon name");
      return false;
    }

    if (!formData.roles.length) {
      toast.error("Select at least one role");
      return false;
    }

    if (
      normalizeText(formData.path) &&
      !normalizeText(formData.path).startsWith("/")
    ) {
      toast.error("Menu path must start with /");
      return false;
    }

    const invalidChild = formData.children.some((child) => {
      const label = normalizeText(child.label);
      const path = normalizeText(child.path);

      return !label || (path && !path.startsWith("/"));
    });

    if (invalidChild) {
      toast.error("Check submenu names and route paths");
      return false;
    }

    return true;
  };

  const validateSubmenu = () => {
    if (loadingMenus) {
      toast.info("Please wait while menus are loading");
      return false;
    }

    if (!existingMenus.length) {
      toast.error("No main menus found. Create a main menu first.");
      return false;
    }

    if (!selectedParentMenu) {
      toast.error("Please select a main menu before saving the submenu");
      return false;
    }

    if (!selectedParent) {
      toast.error("Selected main menu was not found. Reload and try again.");
      return false;
    }

    if (!selectedParent.documentNumber) {
      toast.error(
        "The selected main menu has no document number. It cannot accept submenus."
      );
      return false;
    }

    if (!normalizeText(submenu.label)) {
      toast.error("Submenu name is required");
      return false;
    }

    if (
      normalizeText(submenu.path) &&
      !normalizeText(submenu.path).startsWith("/")
    ) {
      toast.error("Submenu path must start with /");
      return false;
    }

    const exists = (selectedParent.children || []).some(
      (child) =>
        normalizeText(child.label).toLowerCase() ===
        normalizeText(submenu.label).toLowerCase()
    );

    if (exists) {
      toast.error("This submenu already exists under the selected main menu");
      return false;
    }

    return true;
  };

  const handleMainSubmit = async (event) => {
    event.preventDefault();

    if (!validateMainMenu()) return;

    const payload = {
      appCode: normalizeText(formData.appCode),
      group: normalizeText(formData.group),
      groupOrder: Number(formData.groupOrder) || 0,
      label: normalizeText(formData.label),
      icon: normalizeText(formData.icon) || null,
      path: normalizeText(formData.path) || null,
      order: Number(formData.order) || 0,
      roles: formData.roles,
      feature: normalizeText(formData.feature) || null,
      isActive: Boolean(formData.isActive),
      children: formData.children.map((child, index) => ({
        id: child.id,
        label: normalizeText(child.label),
        icon: normalizeText(child.icon) || null,
        path: normalizeText(child.path) || null,
        feature: normalizeText(child.feature) || null,
        order:
          child.order === "" || child.order === null
            ? index
            : Number(child.order),
        roles: child.roles.length ? child.roles : formData.roles,
        isActive: Boolean(child.isActive),
      })),
    };

    try {
      setSubmitting(true);

      const response = await api.menu.create(payload);

      toast.success(
        response?.data?.message || "Main menu created successfully"
      );

      resetMainForm();
      await loadMenus();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to create main menu"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmenuSubmit = async (event) => {
    event.preventDefault();

    if (!validateSubmenu()) return;

    const children = selectedParent.children || [];

    const highestOrder = children.reduce((highest, child) => {
      const order = Number(child.order);
      return Number.isFinite(order) ? Math.max(highest, order) : highest;
    }, -1);

    const suppliedOrder =
      submenu.order === "" || submenu.order === null
        ? highestOrder + 1
        : Number(submenu.order);

    const newChild = {
      id: submenu.id,
      label: normalizeText(submenu.label),
      icon: normalizeText(submenu.icon) || null,
      path: normalizeText(submenu.path) || null,
      feature: normalizeText(submenu.feature) || null,
      order: Number.isFinite(suppliedOrder) ? suppliedOrder : highestOrder + 1,
      roles: submenu.roles.length
        ? submenu.roles
        : selectedParent.roles?.length
          ? selectedParent.roles
          : ["admin"],
      isActive: Boolean(submenu.isActive),
    };

    try {
      setSubmitting(true);

      // POST /menus/:documentNumber/children
      await api.menu.addChild(selectedParent.documentNumber, newChild);

      toast.success("Submenu added successfully");

      resetSubmenuForm();
      await loadMenus();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to add submenu"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const PreviewIcon = getIcon(
    mode === "main" ? formData.icon : submenu.icon
  );

  const saveDisabled =
    submitting ||
    loadingMenus ||
    !selectedParentMenu ||
    !selectedParent?.documentNumber ||
    !normalizeText(submenu.label);

  return (
    <div className="mc-page">
      <div className="mc-heading">
        <div className="mc-heading-copy">
          <button
            type="button"
            className="mc-back-button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="mc-eyebrow">SETTINGS / NAVIGATION</div>
            <h1>Menu Management</h1>
            <p>Create main menus and add submenus to existing menus.</p>
          </div>
        </div>

        <div className="mc-heading-icon">
          <Menu size={24} />
        </div>
      </div>

      <section className="mc-card">
        <div className="mc-card-heading">
          <span className="mc-section-icon">
            <GitBranch size={18} />
          </span>

          <div>
            <h2>What do you want to create?</h2>
            <p>Create a parent menu first, or add a submenu to one.</p>
          </div>
        </div>

        <div className="mc-mode-actions">
          <button
            type="button"
            className={`mc-button ${
              mode === "main" ? "mc-button-primary" : "mc-button-secondary"
            }`}
            onClick={() => changeMode("main")}
            disabled={submitting}
          >
            <Layers size={17} />
            Create Main Menu
          </button>

          <button
            type="button"
            className={`mc-button ${
              mode === "submenu" ? "mc-button-primary" : "mc-button-secondary"
            }`}
            onClick={() => changeMode("submenu")}
            disabled={submitting}
          >
            <GitBranch size={17} />
            Create Submenu
          </button>
        </div>
      </section>

      <form
        onSubmit={
          mode === "main" ? handleMainSubmit : handleSubmenuSubmit
        }
      >
        <div className="mc-layout">
          <div className="mc-main">
            {mode === "main" ? (
              <>
                <section className="mc-card">
                  <div className="mc-card-heading">
                    <span className="mc-section-icon">
                      <Layers size={18} />
                    </span>

                    <div>
                      <h2>Menu details</h2>
                      <p>Configure how this item appears in the sidebar.</p>
                    </div>
                  </div>

                  <div className="mc-grid">
                    <div className="mc-field">
                      <label htmlFor="mc-appCode">Application code *</label>
                      <input
                        id="mc-appCode"
                        name="appCode"
                        value={formData.appCode}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-group">Menu group *</label>
                      <input
                        id="mc-group"
                        name="group"
                        value={formData.group}
                        onChange={handleChange}
                        placeholder="e.g. Sales, Inventory, Settings"
                        required
                      />
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-groupOrder">Group order</label>
                      <input
                        id="mc-groupOrder"
                        name="groupOrder"
                        type="number"
                        min="0"
                        value={formData.groupOrder}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-order">Menu order</label>
                      <input
                        id="mc-order"
                        name="order"
                        type="number"
                        min="0"
                        value={formData.order}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-label">Menu name *</label>
                      <input
                        id="mc-label"
                        name="label"
                        value={formData.label}
                        onChange={handleChange}
                        placeholder="e.g. Customers"
                        required
                      />
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-icon">Lucide icon name *</label>
                      <div className="mc-icon-input">
                        <span className="mc-icon-preview">
                          <PreviewIcon size={19} />
                        </span>

                        <input
                          id="mc-icon"
                          name="icon"
                          value={formData.icon}
                          onChange={handleChange}
                          placeholder="e.g. Users"
                          required
                        />
                      </div>
                    </div>

                    <div className="mc-field mc-field-full">
                      <label htmlFor="mc-path">Route path</label>
                      <div className="mc-icon-input">
                        <span className="mc-icon-preview">
                          <Route size={18} />
                        </span>

                        <input
                          id="mc-path"
                          name="path"
                          value={formData.path}
                          onChange={handleChange}
                          placeholder="/customers"
                        />
                      </div>
                    </div>

                    <div className="mc-field mc-field-full">
                      <label htmlFor="mc-feature">
                        Subscription feature code
                      </label>

                      <div className="mc-icon-input">
                        <span className="mc-icon-preview">
                          <Hash size={18} />
                        </span>

                        <input
                          id="mc-feature"
                          name="feature"
                          value={formData.feature}
                          onChange={handleChange}
                          placeholder="e.g. customers"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="mc-status-row">
                    <span className="mc-status-icon">
                      {formData.isActive ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </span>

                    <span className="mc-status-copy">
                      <strong>Menu is active</strong>
                      <small>
                        Inactive menus should not appear in the sidebar.
                      </small>
                    </span>

                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                    />
                  </label>
                </section>

                <section className="mc-card">
                  <div className="mc-card-heading">
                    <span className="mc-section-icon">
                      <ShieldCheck size={18} />
                    </span>

                    <div>
                      <h2>Role access</h2>
                      <p>Select which roles can see this menu.</p>
                    </div>
                  </div>

                  <div className="mc-role-list">
                    {VALID_ROLES.map((role) => {
                      const selected = formData.roles.includes(role);

                      return (
                        <button
                          type="button"
                          key={role}
                          className={`mc-role-chip ${
                            selected ? "selected" : ""
                          }`}
                          onClick={() => toggleRole(role)}
                          aria-pressed={selected}
                        >
                          {selected && <Check size={14} />}
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="mc-actions">
                  <button
                    type="button"
                    className="mc-button mc-button-secondary"
                    onClick={resetMainForm}
                    disabled={submitting}
                  >
                    Reset
                  </button>

                  <button
                    type="submit"
                    className="mc-button mc-button-primary"
                    disabled={submitting}
                  >
                    <Save size={17} />
                    {submitting ? "Saving menu..." : "Save menu"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <section className="mc-card">
                  <div className="mc-card-heading">
                    <span className="mc-section-icon">
                      <GitBranch size={18} />
                    </span>

                    <div>
                      <h2>Add submenu to an existing main menu</h2>
                      <p>
                        Select the parent menu, then save the submenu under it.
                      </p>
                    </div>
                  </div>

                  <div className="mc-field mc-field-full">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <label htmlFor="mc-parent">Select main menu *</label>

                      <button
                        type="button"
                        className="mc-button mc-button-secondary"
                        onClick={loadMenus}
                        disabled={loadingMenus || submitting}
                        style={{ minHeight: 34, padding: "6px 10px" }}
                      >
                        <RefreshCw
                          size={15}
                          className={loadingMenus ? "mc-spin" : ""}
                        />
                        Refresh
                      </button>
                    </div>

                    <select
                      id="mc-parent"
                      value={selectedParentMenu}
                      onChange={(event) =>
                        setSelectedParentMenu(event.target.value)
                      }
                      required
                      disabled={loadingMenus || submitting}
                    >
                      <option value="">
                        {loadingMenus
                          ? "Loading main menus..."
                          : "Select a main menu"}
                      </option>

                      {existingMenus.map((menu) => (
                        <option key={menu._id} value={menu._id}>
                          {menu.group} — {menu.label}
                        </option>
                      ))}
                    </select>

                    {!loadingMenus && existingMenus.length === 0 && (
                      <small style={{ color: "#dc2626" }}>
                        No active main menus found. Create a main menu first.
                      </small>
                    )}

                    {selectedParent && !selectedParent.documentNumber && (
                      <small style={{ color: "#dc2626" }}>
                        This menu has no document number and cannot accept
                        submenus. Update or recreate the parent menu.
                      </small>
                    )}

                    {selectedParent?.documentNumber && (
                      <small style={{ color: "#64748b" }}>
                        Selected: {selectedParent.group} —{" "}
                        {selectedParent.label}
                      </small>
                    )}
                  </div>

                  <div className="mc-grid">
                    <div className="mc-field">
                      <label htmlFor="mc-child-label">Submenu name *</label>
                      <input
                        id="mc-child-label"
                        value={submenu.label}
                        onChange={(event) =>
                          updateSubmenu("label", event.target.value)
                        }
                        placeholder="e.g. All Customers"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-child-icon">Lucide icon name</label>

                      <div className="mc-icon-input">
                        <span className="mc-icon-preview">
                          {React.createElement(getIcon(submenu.icon), {
                            size: 18,
                          })}
                        </span>

                        <input
                          id="mc-child-icon"
                          value={submenu.icon}
                          onChange={(event) =>
                            updateSubmenu("icon", event.target.value)
                          }
                          placeholder="Circle"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-child-path">Route path</label>
                      <input
                        id="mc-child-path"
                        value={submenu.path}
                        onChange={(event) =>
                          updateSubmenu("path", event.target.value)
                        }
                        placeholder="/customers/list"
                        disabled={submitting}
                      />
                    </div>

                    <div className="mc-field">
                      <label htmlFor="mc-child-order">
                        Display order
                      </label>

                      <input
                        id="mc-child-order"
                        type="number"
                        min="0"
                        value={submenu.order}
                        onChange={(event) =>
                          updateSubmenu("order", event.target.value)
                        }
                        placeholder="Automatic"
                        disabled={submitting}
                      />
                    </div>

                    <div className="mc-field mc-field-full">
                      <label htmlFor="mc-child-feature">
                        Subscription feature code
                      </label>

                      <div className="mc-icon-input">
                        <span className="mc-icon-preview">
                          <Hash size={18} />
                        </span>

                        <input
                          id="mc-child-feature"
                          value={submenu.feature}
                          onChange={(event) =>
                            updateSubmenu("feature", event.target.value)
                          }
                          placeholder="e.g. customers"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>

                  <label className="mc-status-row">
                    <span className="mc-status-icon">
                      {submenu.isActive ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </span>

                    <span className="mc-status-copy">
                      <strong>Submenu is active</strong>
                      <small>
                        Inactive submenus are hidden from navigation.
                      </small>
                    </span>

                    <input
                      type="checkbox"
                      checked={submenu.isActive}
                      onChange={(event) =>
                        updateSubmenu("isActive", event.target.checked)
                      }
                      disabled={submitting}
                    />
                  </label>
                </section>

                <section className="mc-card">
                  <div className="mc-card-heading">
                    <span className="mc-section-icon">
                      <ShieldCheck size={18} />
                    </span>

                    <div>
                      <h2>Submenu role access</h2>
                      <p>
                        Leave roles empty to inherit the selected parent roles.
                      </p>
                    </div>
                  </div>

                  <div className="mc-role-list">
                    {VALID_ROLES.map((role) => {
                      const selected = submenu.roles.includes(role);

                      return (
                        <button
                          type="button"
                          key={role}
                          className={`mc-role-chip ${
                            selected ? "selected" : ""
                          }`}
                          onClick={() => toggleSubmenuRole(role)}
                          aria-pressed={selected}
                          disabled={submitting}
                        >
                          {selected && <Check size={14} />}
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="mc-actions">
                  <button
                    type="button"
                    className="mc-button mc-button-secondary"
                    onClick={resetSubmenuForm}
                    disabled={submitting}
                  >
                    Reset
                  </button>

                  <button
                    type="submit"
                    className="mc-button mc-button-primary"
                    disabled={saveDisabled}
                    title={
                      !selectedParentMenu
                        ? "Select a main menu first"
                        : !submenu.label.trim()
                          ? "Enter submenu name"
                          : ""
                    }
                  >
                    <Plus size={17} />
                    {submitting ? "Saving submenu..." : "Save submenu"}
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className="mc-preview-card">
            <div className="mc-preview-top">
              <span className="mc-preview-label">LIVE PREVIEW</span>

              <span
                className={`mc-preview-status ${
                  (mode === "main"
                    ? formData.isActive
                    : submenu.isActive)
                    ? "active"
                    : "inactive"
                }`}
              >
                {(mode === "main"
                  ? formData.isActive
                  : submenu.isActive)
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            <h3>
              {mode === "main" ? "Main menu preview" : "Submenu preview"}
            </h3>

            <p>
              {mode === "main"
                ? "Approximate appearance in the TrueBill navigation."
                : "The submenu will appear under the selected parent."}
            </p>

            <div className="mc-sidebar-preview">
              <div className="mc-preview-brand">
                <span className="mc-preview-brand-icon">T</span>
                <span>
                  <strong>TrueBill</strong>
                  <small>BUSINESS MANAGEMENT</small>
                </span>
              </div>

              <div className="mc-preview-group">
                {String(
                  mode === "main"
                    ? formData.group || "MENU GROUP"
                    : selectedParent?.group || "MENU GROUP"
                ).toUpperCase()}
              </div>

              <div className="mc-preview-parent">
                <span className="mc-preview-menu-icon">
                  {React.createElement(
                    mode === "main"
                      ? PreviewIcon
                      : getIcon(selectedParent?.icon),
                    { size: 18 }
                  )}
                </span>

                <span>
                  {mode === "main"
                    ? formData.label || "Menu name"
                    : selectedParent?.label || "Select main menu"}
                </span>
              </div>

              {mode === "submenu" && (
                <div className="mc-preview-child">
                  <span className="mc-preview-dot" />
                  {React.createElement(getIcon(submenu.icon), {
                    size: 15,
                  })}
                  <span>{submenu.label || "Submenu name"}</span>
                </div>
              )}
            </div>

            <div className="mc-preview-note">
              <ShieldCheck size={17} />
              <span>
                Menu visibility is not API authorization. Enforce permissions
                and subscription entitlements on the backend too.
              </span>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default MenuCreate;