import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  CheckCircle2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  UserRound,
  Users as UsersIcon,
} from "lucide-react";

import BoxModal from "../../components/common/Modal/BoxModal";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";

import {
  getCurrentTenantContext,
} from "../../utils/tenantContext";

const ROLE_OPTIONS = [
  {
    value: "admin",
    label: "Admin",
  },
  {
    value: "manager",
    label: "Manager",
  },
  {
    value: "accountant",
    label: "Accountant",
  },
  {
    value: "sales",
    label: "Sales",
  },
  {
    value: "purchase",
    label: "Purchase",
  },
  {
    value: "inventory",
    label: "Inventory",
  },
  {
    value: "viewer",
    label: "Viewer",
  },
];

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Status",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
];

const initialForm = {
  name: "",
  email: "",
  phone: "",
  role: "viewer",
  designation: "",
  password: "",
  notes: "",
};

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Users() {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] =
    useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] =
    useState(null);

  const [formData, setFormData] =
    useState(initialForm);

  const loadUsers = useCallback(async () => {
    const { tenantId } =
      getCurrentTenantContext();

    if (!tenantId) {
      setUsers([]);
      setLoading(false);

      toast.error(
        "Your account is not linked to a company",
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await api.tenants.getUsers(tenantId);

      const result = response?.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Unable to load users",
        );
      }

      setUsers(
        Array.isArray(result.users)
          ? result.users
          : [],
      );
    } catch (error) {
      console.error(
        "Load users error:",
        error,
      );

      setUsers([]);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load users",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name
          ?.toLowerCase()
          .includes(search) ||
        user.email
          ?.toLowerCase()
          .includes(search) ||
        user.phone?.includes(search) ||
        user.designation
          ?.toLowerCase()
          .includes(search);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      const isActive =
        user.isActive !== false;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          isActive) ||
        (statusFilter === "inactive" &&
          !isActive);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    searchTerm,
    roleFilter,
    statusFilter,
  ]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ ...initialForm });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);

    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "viewer",
      designation:
        user.designation || "",
      password: "",
      notes: user.notes || "",
    });

    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingUser(null);
    setFormData({ ...initialForm });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter user name");
      return false;
    }

    if (!formData.email.trim()) {
      toast.error("Please enter user email");
      return false;
    }

    if (
      !EMAIL_REGEX.test(
        formData.email.trim(),
      )
    ) {
      toast.error(
        "Please enter a valid email address",
      );

      return false;
    }

    if (
      !editingUser &&
      formData.password.length < 6
    ) {
      toast.error(
        "Password must be at least 6 characters",
      );

      return false;
    }

    if (
      editingUser &&
      formData.password &&
      formData.password.length < 6
    ) {
      toast.error(
        "Password must be at least 6 characters",
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { tenantId } =
      getCurrentTenantContext();

    if (!tenantId) {
      toast.error(
        "Your account is not linked to a company",
      );

      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email
          .trim()
          .toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        designation:
          formData.designation.trim(),
        notes: formData.notes.trim(),
      };

      if (formData.password) {
        payload.password =
          formData.password;
      }

      let response;

      if (editingUser) {
        response =
          await api.tenants.updateUser(
            tenantId,
            editingUser._id,
            payload,
          );
      } else {
        response =
          await api.tenants.createUser(
            tenantId,
            payload,
          );
      }

      const result = response?.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Failed to save user",
        );
      }

      toast.success(
        editingUser
          ? "User updated successfully"
          : "User created successfully",
      );

      // Do not call handleCloseModal() while
      // saving=true; it intentionally blocks close.
      setShowModal(false);
      setEditingUser(null);
      setFormData({ ...initialForm });

      await loadUsers();
    } catch (error) {
      console.error(
        "Save user error:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save user",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (
    user,
  ) => {
    const { tenantId } =
      getCurrentTenantContext();

    if (!tenantId) {
      toast.error(
        "Your account is not linked to a company",
      );

      return;
    }

    const nextStatus =
      user.isActive === false;

    setUpdatingStatusId(user._id);

    try {
      const response =
        await api.tenants.updateUserStatus(
          tenantId,
          user._id,
          {
            isActive: nextStatus,
          },
        );

      const result = response?.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Failed to update user status",
        );
      }

      toast.success(
        nextStatus
          ? "User activated successfully"
          : "User deactivated successfully",
      );

      await loadUsers();
    } catch (error) {
      console.error(
        "Update user status error:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update user status",
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="company-settings-page">
      <div className="company-settings-header">
        <div className="page-title-row">
          <div className="page-title-icon">
            <UsersIcon size={22} />
          </div>

          <div>
            <h1>Users</h1>

            <p>
              Manage users, roles, and
              access for your company
            </p>
          </div>
        </div>

        <div className="company-settings-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={loadUsers}
            disabled={loading || saving}
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "spin-icon"
                  : ""
              }
            />

            Refresh
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleOpenCreate}
            disabled={loading || saving}
          >
            <Plus size={16} />

            Add User
          </Button>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <Search size={18} />
          </div>

          <div>
            <h2>Search & Filter</h2>

            <p>
              Find users by name, email,
              phone, role, or status
            </p>
          </div>
        </div>

        <div className="settings-form-grid">
          <Input
            label="Search"
            name="searchTerm"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
            placeholder="Search by name, email, or phone"
          />

          <Select
            label="Role"
            name="roleFilter"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value,
              )
            }
            options={[
              {
                value: "all",
                label: "All Roles",
              },
              ...ROLE_OPTIONS,
            ]}
          />

          <Select
            label="Status"
            name="statusFilter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <UserRound size={18} />
          </div>

          <div>
            <h2>User List</h2>

            <p>
              {filteredUsers.length}{" "}
              user
              {filteredUsers.length === 1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="company-settings-loading">
            <RefreshCw
              size={24}
              className="spin-icon"
            />

            <span>Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="company-settings-loading">
            <UserRound size={24} />

            <span>No users found</span>
          </div>
        ) : (
          <div className="subscription-details">
            {filteredUsers.map((user) => {
              const isActive =
                user.isActive !== false;

              const isUpdating =
                updatingStatusId === user._id;

              return (
                <div key={user._id}>
                  <span>
                    {user.email}
                  </span>

                  <strong>
                    {user.name}
                  </strong>

                  <div className="settings-info">
                    <CheckCircle2
                      size={14}
                    />

                    <span>
                      {user.role} ·{" "}
                      {isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  {user.designation && (
                    <div className="settings-info">
                      <span>
                        {user.designation}
                      </span>
                    </div>
                  )}

                  <div className="settings-card-footer">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        handleOpenEdit(user)
                      }
                      disabled={isUpdating}
                    >
                      <Pencil size={14} />

                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant={
                        isActive
                          ? "secondary"
                          : "primary"
                      }
                      onClick={() =>
                        handleToggleStatus(user)
                      }
                      disabled={isUpdating}
                    >
                      <Power size={14} />

                      {isUpdating
                        ? "Updating..."
                        : isActive
                          ? "Deactivate"
                          : "Activate"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BoxModal
        show={showModal}
        onClose={handleCloseModal}
        title={
          editingUser
            ? "Edit User"
            : "Create User"
        }
        subtitle={
          editingUser
            ? "Update user details and access"
            : "Add a user to your company"
        }
        icon={<UserRound size={20} />}
        width="860px"
        footer={
          <div className="box-modal-footer-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="user-form"
              variant="primary"
              disabled={saving}
            >
              {saving
                ? editingUser
                  ? "Updating..."
                  : "Creating..."
                : editingUser
                  ? "Update User"
                  : "Create User"}
            </Button>
          </div>
        }
      >
        <form
          id="user-form"
          onSubmit={handleSubmit}
        >
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <UserRound size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>User Information</h3>

                <p>
                  Enter the user’s basic
                  details and role
                </p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                autoComplete="off"
                required
              />

              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                maxLength={10}
              />

              <Select
                label="Role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                options={ROLE_OPTIONS}
              />

              <Input
                label="Designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Enter designation"
              />

              <Input
                label={
                  editingUser
                    ? "New Password (optional)"
                    : "Password"
                }
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                minLength={6}
                required={!editingUser}
              />

              <div className="box-modal-form-full">
                <Textarea
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter optional notes"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </form>
      </BoxModal>
    </div>
  );
}

export default Users;