// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";
// import { Toaster } from "react-hot-toast";

// import App from "./App";

// import "./styles/common.css";
// import "./styles/layout.css";
// import "bootstrap/dist/css/bootstrap.min.css";
// import "./components/common/Form/form.css";
// import "./components/common/StatusField/statusField.css";
// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <App />

//       <Toaster
//         position="top-right"
//         toastOptions={{
//           duration: 3000,

//           style: {
//             fontSize: "13px",
//             borderRadius: "8px",
//           },

//           success: {
//             duration: 3000,
//           },

//           error: {
//             duration: 4000,
//           },
//         }}
//       />
//     </BrowserRouter>
//   </React.StrictMode>,
// );

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";

import "./styles/common.css";
import "./styles/layout.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./components/common/Form/form.css";
import "./components/common/StatusField/statusField.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />

      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerStyle={{
          zIndex: 2147483647,
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
          left: 12,
          right: 12,
          bottom: 12,
        }}
        toastOptions={{
          duration: 3000,

          style: {
            width: "fit-content",
            maxWidth: "min(420px, calc(100vw - 24px))",
            padding: "12px 16px",
            fontSize: "13px",
            lineHeight: 1.5,
            borderRadius: "10px",
            overflowWrap: "anywhere",
            background: "var(--card-bg, #ffffff)",
            color: "var(--text-primary, #17212f)",
            border: "1px solid var(--border-color, #e5e7eb)",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.18)",
          },

          success: {
            duration: 3000,
          },

          error: {
            duration: 5000,
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);