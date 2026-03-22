import { useEffect, useMemo, useState } from "react";
import categories from "../data/categories";

function getDefaultPaidBy(members, currentUserId) {
  if (currentUserId && members.some((member) => member.uid === currentUserId)) {
    return currentUserId;
  }

  return members[0]?.uid || "";
}

function TransactionForm({
  members,
  currentUserId,
  onSaveTransaction,
  initialValues,
  isSaving,
  onCancelEdit,
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Supermercado");
  const [type, setType] = useState("SHARED");
  const [paidByUserId, setPaidByUserId] = useState(
    getDefaultPaidBy(members, currentUserId)
  );

  useEffect(() => {
    if (initialValues) {
      setAmount(
        initialValues.amount === undefined ? "" : String(initialValues.amount)
      );
      setDescription(initialValues.description || "");
      setCategory(initialValues.category || "Supermercado");
      setType(initialValues.type || "SHARED");
      setPaidByUserId(
        initialValues.paidByUserId ||
          getDefaultPaidBy(members, currentUserId)
      );
      return;
    }

    setAmount("");
    setDescription("");
    setCategory("Supermercado");
    setType("SHARED");
    setPaidByUserId(getDefaultPaidBy(members, currentUserId));
  }, [initialValues, members, currentUserId]);

  const numericAmount = Number(amount);

  const amountError = useMemo(() => {
    if (amount === "") return "";
    if (Number.isNaN(numericAmount)) return "El monto debe ser un numero";
    if (numericAmount <= 0) return "El monto debe ser mayor a 0";
    return "";
  }, [amount, numericAmount]);

  const isFormValid =
    amount !== "" && amountError === "" && Boolean(paidByUserId);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isFormValid) return;

    const transactionPayload = {
      amount: Math.round(numericAmount * 100) / 100,
      description: description.trim(),
      category,
      type,
      paidByUserId,
      date: new Date().toISOString().split("T")[0],
    };

    const saved = await onSaveTransaction(transactionPayload);

    if (!saved) {
      return;
    }

    setAmount("");
    setDescription("");
    setCategory("Supermercado");
    setType("SHARED");
    setPaidByUserId(getDefaultPaidBy(members, currentUserId));
  }

  return (
    <section style={{ marginTop: "24px" }}>
      <h2>{initialValues ? "Editar movimiento" : "Agregar movimiento"}</h2>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />

        {amountError && (
          <p
            style={{
              color: "#b42318",
              fontSize: "13px",
              marginTop: "-4px",
              marginBottom: "10px",
            }}
          >
            {amountError}
          </p>
        )}

        <input
          placeholder="Descripcion"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((categoryOption) => (
            <option key={categoryOption} value={categoryOption}>
              {categoryOption}
            </option>
          ))}
        </select>

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="SHARED">Compartido</option>
          <option value="SETTLEMENT">Dar dinero</option>
        </select>

        <select
          value={paidByUserId}
          onChange={(e) => setPaidByUserId(e.target.value)}
        >
          {members.map((member) => (
            <option key={member.uid} value={member.uid}>
              {member.username}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="button"
          disabled={!isFormValid || isSaving}
          style={{
            opacity: isFormValid && !isSaving ? 1 : 0.6,
            cursor: isFormValid && !isSaving ? "pointer" : "not-allowed",
            marginBottom: initialValues ? "8px" : 0,
          }}
        >
          {isSaving
            ? "Guardando..."
            : initialValues
              ? "Guardar cambios"
              : "Guardar"}
        </button>

        {initialValues ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancelEdit}
            disabled={isSaving}
          >
            Cancelar edicion
          </button>
        ) : null}
      </form>
    </section>
  );
}

export default TransactionForm;
