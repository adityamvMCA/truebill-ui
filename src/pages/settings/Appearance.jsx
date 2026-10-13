import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Palette,
  RotateCcw,
} from "lucide-react";

import Select from "../../components/common/Form/Select";
import Button from "../../components/common/Form/Button";

const THEME_OPTIONS = [
  { value: "blue", label: "Ocean Blue" },
  { value: "green", label: "Emerald" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "pink", label: "Pink" },
  { value: "cyan", label: "Cyan" },
  { value: "slate", label: "Slate" },
];

const isValidTheme = (value) =>
  THEME_OPTIONS.some((option) => option.value === value);

const getInitialTheme = () => {
  const activeTheme =
    document.documentElement.getAttribute("data-theme");

  try {
    const storedTheme = localStorage.getItem("theme");

    if (isValidTheme(storedTheme)) {
      return storedTheme;
    }
  } catch (error) {
    console.error("Unable to read theme:", error);
  }

  return isValidTheme(activeTheme) ? activeTheme : "blue";
};

function Appearance() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const applyTheme = (nextTheme) => {
    if (!isValidTheme(nextTheme)) {
      return;
    }

    setTheme(nextTheme);

    try {
      localStorage.setItem("theme", nextTheme);

      const label = THEME_OPTIONS.find(
        (option) => option.value === nextTheme,
      )?.label;

      toast.success(`${label} theme applied`);
    } catch (error) {
      console.error("Unable to save theme:", error);
      toast.error(
        "Theme applied, but this browser could not save it",
      );
    }
  };

  const selectedLabel = THEME_OPTIONS.find(
    (option) => option.value === theme,
  )?.label;

  return (
    <div className="company-settings-page">
      <div className="company-settings-header">
        <div className="page-title-row">
          <div className="page-title-icon">
            <Palette size={22} />
          </div>

          <div>
            <h1>Appearance</h1>
            <p>Personalize your application color theme</p>
          </div>
        </div>

        <div className="company-settings-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => applyTheme("blue")}
          >
            <RotateCcw size={16} />
            Restore Default
          </Button>
        </div>
      </div>

      <div className="company-settings-content">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Palette size={18} />
            </div>

            <div>
              <h2>Application Theme</h2>
              <p>Changes apply immediately</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <Select
              label="Color Theme"
              name="theme"
              value={theme}
              onChange={(event) =>
                applyTheme(event.target.value)
              }
              options={THEME_OPTIONS}
            />

            <div className="theme-preview">
              <div className="theme-preview-primary" />
              <div className="theme-preview-soft" />

              <div className="theme-preview-text">
                <strong>{selectedLabel}</strong>
                <span>Current application theme</span>
              </div>
            </div>
          </div>

          <div className="settings-card-footer">
            <div className="settings-info">
              <CheckCircle2 size={16} />
              <span>
                Theme preference is saved in this browser.
              </span>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Palette size={18} />
            </div>
            <div>
              <h2>Theme Preview</h2>
              <p>Preview your existing reusable components</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <Button
              type="button"
              variant="primary"
              onClick={() => toast("Primary button preview")}
            >
              Primary Button
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => toast("Secondary button preview")}
            >
              Secondary Button
            </Button>

            <div className="settings-info">
              <CheckCircle2 size={16} />
              <span>Existing global theme colors</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Appearance;