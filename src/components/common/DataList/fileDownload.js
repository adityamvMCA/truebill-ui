import { Capacitor } from "@capacitor/core";

import {
  Directory,
  Encoding,
  Filesystem,
} from "@capacitor/filesystem";

import { Share } from "@capacitor/share";

const safeFileName = (name) =>
  String(name || "file.csv").replace(
    /[\\/:*?"<>|]+/g,
    "-"
  );

/*
  Saves a CSV file.

  - Web / desktop browser: normal blob download (same as before).
  - Android / iOS (Capacitor): <a download> does nothing inside the
    WebView, so the file is written to the app cache folder and the
    native share sheet opens. From there the user can save it to
    Files / Drive, or open it in Excel / Sheets.
*/
export async function saveCsvFile(fileName, csvText) {
  const name = safeFileName(fileName);

  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: csvText,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    try {
      await Share.share({
        title: name,
        dialogTitle: "Save or share file",
        url: uri,
      });
    } catch (error) {
      const message = String(
        error?.message || error || ""
      );

      // User closed the share sheet - not an error.
      if (!/cancel/i.test(message)) {
        throw error;
      }
    }

    return;
  }

  const blob = new Blob([csvText], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = name;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}