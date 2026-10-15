import { useNavigate } from "react-router-dom";
import BankCreateForm from "./BankCreateForm";

export default function BankCreatePage({ createBank, bankListPath }) {
  const navigate = useNavigate();

  const handleSave = async (payload) => {
    if (typeof createBank !== "function") {
      throw new Error("Bank creation API is not connected.");
    }

    await createBank(payload);
  };

  return (
    <BankCreateForm
      onSave={handleSave}
      onCancel={() => navigate(bankListPath)}
    />
  );
}
