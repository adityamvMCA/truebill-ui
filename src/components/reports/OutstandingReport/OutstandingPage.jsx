import { useCallback } from "react";
import { useNavigate } from "react-router-dom";



import routes from "../../../config/routes";
import OutstandingReport from "./OutstandingReport";

export default function OutstandingPage() {
  const navigate = useNavigate();

  const handleOpenDocument = useCallback(
    (row) => {
      if (row.kind === "supplier") {
        navigate(
          routes.purchase.viewInvoice.replace(
            ":billNumber",
            encodeURIComponent(row.documentNumber),
          ),
        );
      }
    },
    [navigate],
  );

  return (
    <OutstandingReport
      initialKind="supplier"
      onOpenDocument={(row) => {
        if (row.kind === "supplier") {
          handleOpenDocument(row);
        }
      }}
    />
  );
}