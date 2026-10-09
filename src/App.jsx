

// import AppRouter from "./app/router/AppRouter";
// import { useAppVersionCheck } from "./hooks/useAppVersionCheck";
// import AppUpdateModal from "./components/common/AppUpdateModal";

// function App() {
//   const updateInfo = useAppVersionCheck();

//   return (
//     <>
//       <AppRouter />
//       <AppUpdateModal updateInfo={updateInfo} />
//     </>
//   );
// }

// export default App;

import AppRouter from "./app/router/AppRouter";
import { useAppVersionCheck } from "./hooks/useAppVersionCheck";
import AppUpdateModal from "./components/common/AppUpdateModal";
import BiometricLock from "./components/common/BiometricLock";
import "./components/common/biometric.css";

function App() {
  const updateInfo = useAppVersionCheck();

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