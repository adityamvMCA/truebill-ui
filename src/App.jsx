
// import { useEffect } from "react";
// import AppRouter from "./app/router/AppRouter";
// import { useAppVersionCheck } from "./hooks/useAppVersionCheck";
// import AppUpdateModal from "./components/common/AppUpdateModal";
// import BiometricLock from "./components/common/BiometricLock";
// import { registerFcmToken } from "./services/fcmService";
// import "./components/common/biometric.css";

// function App() {
//   const updateInfo = useAppVersionCheck();

//   useEffect(() => {
//     const authToken = localStorage.getItem("token");

//     if (authToken) {
//       registerFcmToken().catch((error) => {
//         console.error("FCM registration failed:", error);
//       });
//     }
//   }, []);

//   return (
//     <>
//       <BiometricLock>
//         <AppRouter />
//       </BiometricLock>

//       <AppUpdateModal updateInfo={updateInfo} />
//     </>
//   );
// }

// export default App;

import { useEffect } from "react";
import AppRouter from "./app/router/AppRouter";
import { useAppVersionCheck } from "./hooks/useAppVersionCheck";
import AppUpdateModal from "./components/common/AppUpdateModal";
import BiometricLock from "./components/common/BiometricLock";
import { registerFcmToken } from "./services/fcmService";
import "./components/common/biometric.css";

function App() {
  const updateInfo = useAppVersionCheck();

  useEffect(() => {
    const authToken = localStorage.getItem("token");

    if (authToken) {
      registerFcmToken().catch((error) => {
        console.error("FCM registration failed:", error);
      });
    }
  }, []);

  return (
    <>
      <BiometricLock>
        <AppRouter />
      </BiometricLock>

      <AppUpdateModal updateInfo={updateInfo} />
    </>
  );
}

export default App;