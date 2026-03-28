import { useMemo, useState } from "react";
import categories from "../data/categories";

const AMOUNT_INPUT_PATTERN = /^\d{0,9}([.,]\d{0,2})?$/;
const DESCRIPTION_MAX_LENGTH = 140;

function getDefaultPaidBy(members, currentUserId) {
  if (currentUserId && members.some((member) => member.uid === currentUserId)) {
    return currentUserId;
  }

  return members[0]?.uid || "";
}

function buildInitialFormState(initialValues, members, currentUserId) {
  const defaultPaidBy = getDefaultPaidBy(members, currentUserId);

  if (initialValues) {
    const nextType = initialValues.type || "SHARED";

    return {
      amount:
        initialValues.amount === undefined ? "" : String(initialValues.amount),
      description: initialValues.description || "",
      category: nextType === "SETTLEMENT" ? "" : initialValues.category || "",
      type: nextType,
      paidByUserId: initialValues.paidByUserId || defaultPaidBy,
    };
  }

  return {
    amount: "",
    description: "",
    category: "",
    type: "SHARED",
    paidByUserId: defaultPaidBy,
  };
}

function normalizeAmountInput(rawValue) {
  return rawValue.replace(",", ".");
}

function TransactionForm({
  members,
  currentUserId,
  onSaveTransaction,
  initialValues,
  isSaving,
  onCancelEdit,
}) {
  // El formulario se reinicia por remount desde HomePage al cambiar de grupo
  // o entrar/salir del modo edicion; por eso no necesita un useEffect de sincronizacion.
  const [formState, setFormState] = useState(() =>
    buildInitialFormState(initialValues, members, currentUserId)
  );
  const [showAmountHint, setShowAmountHint] = useState(false);
  const [amountHintPulse, setAmountHintPulse] = useState(false);
  const [showCategoryHint, setShowCategoryHint] = useState(false);
  const [categoryHintPulse, setCategoryHintPulse] = useState(false);
  const { amount, description, category, type, paidByUserId } = formState;

  const normalizedAmount = normalizeAmountInput(amount);
  const numericAmount = Number(normalizedAmount);

  const amountError = useMemo(() => {
    if (amount === "") return "Ingresa un monto";
    if (!AMOUNT_INPUT_PATTERN.test(amount)) {
      return "Usa hasta 9 digitos enteros y 2 decimales";
    }
    if (Number.isNaN(numericAmount)) return "El monto debe ser un numero";
    if (numericAmount <= 0) return "El monto debe ser mayor a 0";
    return "";
  }, [amount, numericAmount]);

  const categoryError = useMemo(() => {
    if (type !== "SHARED") return "";
    if (!category) return "Selecciona una categoria";
    return "";
  }, [category, type]);

  const isFormValid = Boolean(paidByUserId);

  function triggerAmountHint() {
    setShowAmountHint(true);
    setAmountHintPulse(false);

    window.requestAnimationFrame(() => {
      setAmountHintPulse(true);
    });

    window.setTimeout(() => {
      setAmountHintPulse(false);
    }, 280);
  }

  function triggerCategoryHint() {
    setShowCategoryHint(true);
    setCategoryHintPulse(false);

    window.requestAnimationFrame(() => {
      setCategoryHintPulse(true);
    });

    window.setTimeout(() => {
      setCategoryHintPulse(false);
    }, 280);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isFormValid) return;
    if (categoryError) {
      if (amountError) {
        triggerAmountHint();
        return;
      }

      triggerCategoryHint();
      return;
    }

    if (amountError) {
      triggerAmountHint();
      return;
    }

    const transactionPayload = {
      amount: Math.round(numericAmount * 100) / 100,
      description: description.trim(),
      category: type === "SETTLEMENT" ? "" : category,
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
    <section className="composer-sheet-content">
      <div className="composer-sheet-header">
        <div>
          <p className="composer-sheet-eyebrow">
            {initialValues ? "Movimiento existente" : "Nuevo movimiento"}
          </p>
          <h2>{initialValues ? "Editar movimiento" : "Agregar movimiento"}</h2>
          <p className="composer-sheet-copy">
            {initialValues
              ? "Ajusta el movimiento y guarda los cambios cuando quede listo."
              : "Carga un gasto o un dar dinero sin salir del grupo actual."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <label className="form-field">
          <span className="form-field-label">Monto</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => {
              const nextValue = normalizeAmountInput(event.target.value);

              if (nextValue !== "" && !AMOUNT_INPUT_PATTERN.test(nextValue)) {
                return;
              }

              setFormState((currentState) => ({
                ...currentState,
                amount: nextValue,
              }));
              setShowAmountHint(false);
              setAmountHintPulse(false);
            }}
            autoFocus
          />
        </label>

        {showAmountHint && amountError ? (
          <p
            className={`inline-field-hint ${
              amountHintPulse ? "inline-field-hint-pulse" : ""
            }`}
          >
            {amountError}
          </p>
        ) : null}

        <label className="form-field">
          <span className="form-field-label">Descripcion</span>
          <input
            placeholder="Ej: super, nafta, transferencia"
            value={description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                description: event.target.value.slice(0, DESCRIPTION_MAX_LENGTH),
              }))
            }
          />
        </label>

        <label className="form-field">
          <span className="form-field-label">Tipo</span>
          <select
            value={type}
            onChange={(event) => {
              setFormState((currentState) => ({
                ...currentState,
                type: event.target.value,
                category:
                  event.target.value === "SETTLEMENT"
                    ? ""
                    : currentState.category,
              }));
              setShowCategoryHint(false);
              setCategoryHintPulse(false);
            }}
          >
            <option value="SHARED">Compartido</option>
            <option value="SETTLEMENT">Dar dinero</option>
          </select>
        </label>

        {type === "SHARED" ? (
          <>
            <label className="form-field">
              <span className="form-field-label">Categoria</span>
              <select
                value={category}
                onChange={(event) => {
                  setFormState((currentState) => ({
                    ...currentState,
                    category: event.target.value,
                  }));
                  setShowCategoryHint(false);
                  setCategoryHintPulse(false);
                }}
              >
                <option value="">Selecciona una categoria</option>
                {categories.map((categoryOption) => (
                  <option key={categoryOption} value={categoryOption}>
                    {categoryOption}
                  </option>
                ))}
              </select>
            </label>

            {showCategoryHint && categoryError ? (
              <p
                className={`inline-field-hint ${
                  categoryHintPulse ? "inline-field-hint-pulse" : ""
                }`}
              >
                {categoryError}
              </p>
            ) : null}
          </>
        ) : null}

        <label className="form-field">
          <span className="form-field-label">
            {type === "SETTLEMENT" ? "Quien da el dinero" : "Quien pago"}
          </span>
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
        </label>

        <div className="composer-sheet-actions">
          <button
            type="submit"
            className="button"
            disabled={!isFormValid || isSaving}
            style={{
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
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
        </div>
      </form>
    </section>
  );
}

export default TransactionForm;
