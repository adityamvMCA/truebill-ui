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
        containerStyle={{
          zIndex: 2147483647, // above BoxModal (99999) and BiometricLock (99999)
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
        toastOptions={{
          duration: 3000,

          style: {
            fontSize: "13px",
            borderRadius: "8px",
            maxWidth: "90vw",
          },

          success: {
            duration: 3000,
          },

          error: {
            duration: 4000,
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);