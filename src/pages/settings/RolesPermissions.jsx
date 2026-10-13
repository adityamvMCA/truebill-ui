import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";
import {
  getCurrentTenantContext,
} from "../../utils/tenantContext";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "inventory", label: "Inventory" },
  { value: "viewer", label: "Viewer" },
];

function RolesPermissions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { tenantId } = getCurrentTenantContext();

      if (!tenantId) {
        throw new Error(
          "Your account is not linked to a company",
        );
      }

      const response = await api.tenants.getUsers(tenantId);
      const result = response?.data;

      if (!result?.success || !Array.isArray(result.users)) {
        throw new Error(
          result?.message || "Unable to load role assignments",
        );
      }

      setUsers(result.users);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load role assignments";

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const roles = useMemo(() => {
    return ROLE_OPTIONS.map((option) => {
      const members = users.filter(
        (user) => user.role === option.value,
      );

      const permissions = [
        ...new Set(
          members.flatMap((user) =>
            Array.isArray(user.permissions)
              ? user.permissions.filter(
                  (permission) =>
                    typeof permission === "string",
                )
              : [],
          ),
        ),
      ].sort();

      return {
        ...option,
        members,
        permissions,
        activeUsers: members.filter(
          (user) => user.isActive !== false,
        ).length,
      };
    });
  }, [users]);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return roles.filter((role) => {
      const matchesRole =
        roleFilter === "all" || role.value === roleFilter;

      const matchesSearch =
        !query ||
        role.label.toLowerCase().includes(query) ||
        role.permissions.some((permission) =>
          permission.toLowerCase().includes(query),
        );

      return matchesRole && matchesSearch;
    });
  }, [roles, roleFilter, search]);

  return (
    <div className="company-settings-page">
      <div className="company-settings-header">
        <div className="page-title-row">
          <div className="page-title-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h1>Roles & Permissions</h1>
            <p>Review company user roles and assigned permissions</p>
          </div>
        </div>

        <div className="company-settings-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={loadRoles}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "spin-icon" : ""}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="company-settings-content">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <UsersRound size={18} />
            </div>
            <div>
              <h2>Filter Roles</h2>
              <p>Search role names or permission identifiers</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <Input
              label="Search"
              name="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="For example: product.view"
            />

            <Select
              label="Role"
              name="roleFilter"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
              options={[
                { value: "all", label: "All Roles" },
                ...ROLE_OPTIONS,
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div className="company-settings-loading">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading role assignments...</span>
          </div>
        ) : errorMessage ? (
          <div className="settings-card">
            <p role="alert">{errorMessage}</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="settings-card">
            <p>No matching roles found.</p>
          </div>
        ) : (
          filteredRoles.map((role) => (
            <div className="settings-card" key={role.value}>
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2>{role.label}</h2>
                  <p>
                    {role.members.length} assigned users ·{" "}
                    {role.activeUsers} active ·{" "}
                    {role.permissions.length} distinct permissions
                  </p>
                </div>
              </div>

              {role.permissions.length > 0 ? (
                <div className="subscription-details">
                  {role.permissions.map((permission) => (
                    <div key={permission}>
                      <span>Assigned permission</span>
                      <strong>{permission}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p>
                  {role.members.length === 0
                    ? "No users are assigned to this role."
                    : "No stored permissions were returned for this role."}
                </p>
              )}
            </div>
          ))
        )}

        <div className="settings-card">
          <p>
            This page is read-only. Change a user's role from the
            Users page. Global role definitions remain managed
            by the backend permissions utility.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RolesPermissions;