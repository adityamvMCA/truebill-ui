import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

import BoxModal from "../../components/common/Modal/BoxModal";
import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";

import bankApi from "../../services/modules/bankApi";
import { extractBank, formatBankAmount, getBankError } from "./bankHelpers";

export default function BankDetailsModal({
  isOpen,
  bankCode,
  onClose,
  onEdit,
}) {
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !bankCode) return;

    let active = true;

    setBank(null);
    setError("");
    setLoading(true);

    bankApi
      .getByCode(bankCode)
      .then((response) => {
        if (active) setBank(extractBank(response));
      })
      .catch((requestError) => {
        if (active) setError(getBankError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, bankCode]);

  const fields = bank
    ? [
        ["Bank Code", bank.bankCode],
        ["Account Display Name", bank.accountName],
        ["Bank Name", bank.bankName],
        ["Account Holder", bank.accountHolderName],
        ["Account Number", bank.accountNumber],
        ["Account Type", bank.accountType],
        ["Branch", bank.branchName],
        ["IFSC", bank.ifscCode],
        ["Currency", bank.currency],
        ["Status", bank.status],
        ["Ledger Code", bank.ledgerCode],
        [
          "Current Balance",
          `${formatBankAmount(bank.currentBalance)} ${
            bank.currentBalanceType || ""
          }`.trim(),
        ],
      ]
    : [];

  return (
    <BoxModal
      show={isOpen}
      onClose={onClose}
      title="Bank Account Details"
      subtitle={bankCode || "Bank account information"}
      width="1100px"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>

          <div className="box-modal-footer-actions">
            <Button
              type="button"
              onClick={() => onEdit?.(bank)}
              disabled={loading || !bank}
            >
              Edit Bank
            </Button>
          </div>
        </>
      }
    >
      {loading && <p role="status">Loading bank details...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && bank && (
        <div className="box-modal-section">
          <div className="box-modal-section-header">
            <div className="box-modal-section-icon">
              <Building2 size={17} />
            </div>

            <div className="box-modal-section-header-content">
              <h3>{bank.accountName}</h3>
              <p>Bank account and linked ledger information</p>
            </div>
          </div>

          <div className="box-modal-form-grid">
            {fields.map(([label, value], index) => (
              <Input
                key={label}
                name={`bank-detail-${index}`}
                label={label}
                value={value ?? "N/A"}
                readOnly
              />
            ))}

            <div className="box-modal-form-full">
              <Textarea
                label="Notes"
                name="bank-detail-notes"
                value={bank.notes || "N/A"}
                rows={3}
                readOnly
              />
            </div>
          </div>
        </div>
      )}
    </BoxModal>
  );
}
