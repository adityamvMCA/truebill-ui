import { createPortal } from "react-dom";
import { Toaster } from "react-hot-toast";

function AppToaster() {
  if (typeof document === "undefined") return null;
  return createPortal(
    <Toaster
      position="top-center"
      containerStyle={{
        zIndex: 2147483647,
        top: "max(12px, env(safe-area-inset-top))",
        left: 12,
        right: 12,
      }}
      toastOptions={{
        duration: 5000,
        style: {
          maxWidth: "min(420px, calc(100vw - 24px))",
          fontSize: "13px",
          lineHeight: 1.5,
          overflowWrap: "anywhere",
        },
        success: { duration: 5000 },
        error: { duration: 8000 },
      }}
    />,
    document.body,
  );
}

export default AppToaster;
