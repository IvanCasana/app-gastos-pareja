import { useMemo, useState } from "react";
import categories from "../data/categories";

function getDefaultPaidBy(members, currentUserId) {
  if (currentUserId && members.some((member) => member.uid === currentUserId)) {
    return currentUserId;
  }

  return members[0]?.uid || "";
}

function buildInitialFormState(initialValues, members, currentUserId) {
  const defaultPaidBy = getDefaultPaidBy(members, currentUserId);

  if (initialValues) {
    return {
      amount:
        initialValues.amount === undefined ? "" : String(initialValues.amount),
      description: initialValues.description || "",
      category: initialValues.category || "Supermercado",
      type: initialValues.type || "SHARED",
      paidByUserId: initialValues.paidByUserId || defaultPaidBy,
    };
  }

  return {
    amount: "",
    description: "",
    category: "Supermercado",
    type: "SHARED",
    paidByUserId: defaultPaidBy,
  };
}

function TransactionForm({
  members,
  currentUserId,
  onSaveTransaction,
  initialValues,
  isSaving,
  onCancelEdit,
}) {
  const [formState, setFormState] = useState(() =>
    buildInitialFormState(initialValues, members, currentUserId)
  );
  const { amount, description, category, type, paidByUserId } = formState;

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

    setFormState(buildInitialFormState(null, members, currentUserId));
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
          onChange={(event) =>
            setFormState((currentState) => ({
              ...currentState,
              amount: event.target.value,
            }))
          }
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
          onChange={(event) =>
            setFormState((currentState) => ({
              ...currentState,
              description: event.target.value,
            }))
          }
        />

        <select
          value={category}
          onChange={(event) =>
            setFormState((currentState) => ({
              ...currentState,
              category: event.target.value,
            }))
          }
        >
          {categories.map((categoryOption) => (
            <option key={categoryOption} value={categoryOption}>
              {categoryOption}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(event) =>
            setFormState((currentState) => ({
              ...currentState,
              type: event.target.value,
            }))
          }
        >
          <option value="SHARED">Compartido</option>
          <option value="SETTLEMENT">Dar dinero</option>
        </select>

        <select
          value={paidByUserId}
          onChange={(event) =>
            setFormState((currentState) => ({
              ...currentState,
              paidByUserId: event.target.value,
            }))
          }
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
