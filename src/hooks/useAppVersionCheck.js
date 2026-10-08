import { useEffect, useState } from "react";
import { checkAppVersion } from "../services/appVersionService";
import { compareVersions } from "../utils/versionUtils";

export const useAppVersionCheck = () => {
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    const checkVersion = async () => {
      const data = await checkAppVersion();

      if (!data) {
        return;
      }

      const installed = data.installedVersion;
      const latest = data.latestVersion;
      const minimum = data.minimumVersion;

      const hasUpdate =
        compareVersions(latest, installed) > 0;

      const isMandatory =
        data.updateRequired ||
        compareVersions(installed, minimum) < 0;

      if (hasUpdate || isMandatory) {
        setUpdateInfo({
          ...data,
          isMandatory,
        });
      }
    };

    checkVersion();
  }, []);

  return updateInfo;
};