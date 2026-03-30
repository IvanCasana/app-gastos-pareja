import { useMemo, useState } from "react";
import categories from "../data/categories";
import UserAvatar from "./UserAvatar";

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
  const [formState, setFormState] = useState(() =>
    buildInitialFormState(initialValues, members, currentUserId)
  );
  const [currentStep, setCurrentStep] = useState("amount");
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
  const selectedMember = members.find((member) => member.uid === paidByUserId);
  const amountPreview = amount.trim() ? amount.replace(".", ",") : "0,00";
  const typeLabel = type === "SETTLEMENT" ? "Dar dinero" : "Gasto compartido";
  const payerLabel =
    type === "SETTLEMENT" ? "Quien da el dinero" : "Quien pago";

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

  function handleContinue() {
    if (amountError) {
      triggerAmountHint();
      return;
    }

    setCurrentStep("context");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isFormValid) return;

    if (categoryError) {
      triggerCategoryHint();
      return;
    }

    if (amountError) {
      triggerAmountHint();
      setCurrentStep("amount");
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
    setCurrentStep("amount");
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
              ? "Ajustalo rapido y guarda."
              : "Primero el monto. Despues el contexto."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form transaction-entry-form transaction-entry-form-compact">
        <div className="transaction-entry-stepper">
          <button
            type="button"
            className={`transaction-entry-step ${currentStep === "amount" ? "is-active" : ""}`}
            onClick={() => setCurrentStep("amount")}
          >
            <span>1</span>
            <strong>Monto</strong>
          </button>
          <button
            type="button"
            className={`transaction-entry-step ${currentStep === "context" ? "is-active" : ""}`}
            onClick={() => setCurrentStep("context")}
          >
            <span>2</span>
            <strong>Contexto</strong>
          </button>
        </div>

        {currentStep === "amount" ? (
          <section className="transaction-entry-panel transaction-entry-panel-amount">
            <div className="transaction-entry-panel-head">
              <p className="form-field-label">Monto</p>
            </div>

            <label className="transaction-entry-amount-field" aria-label="Monto">
              <span className="transaction-entry-currency">$</span>
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
          </section>
        ) : (
          <>
            <section className="transaction-entry-panel transaction-entry-panel-summary">
              <div className="transaction-entry-preview-row transaction-entry-preview-row-single">
                <div className="transaction-entry-preview-card transaction-entry-preview-card-amount">
                  <span>Monto</span>
                  <strong>${amountPreview}</strong>
                </div>
              </div>
            </section>

            <section className="transaction-entry-panel transaction-entry-panel-type">
              <div className="transaction-entry-panel-head">
                <p className="form-field-label">Tipo</p>
              </div>

              <div className="transaction-entry-segmented transaction-entry-segmented-compact" role="radiogroup" aria-label="Tipo de movimiento">
                <button
                  type="button"
                  className={`transaction-entry-segment ${type === "SHARED" ? "is-active" : ""}`}
                  onClick={() => {
                    setFormState((currentState) => ({
                      ...currentState,
                      type: "SHARED",
                    }));
                    setShowCategoryHint(false);
                    setCategoryHintPulse(false);
                  }}
                >
                  <strong>Compartido</strong>
                  <span>Para ambos</span>
                </button>
                <button
                  type="button"
                  className={`transaction-entry-segment ${type === "SETTLEMENT" ? "is-active" : ""}`}
                  onClick={() => {
                    setFormState((currentState) => ({
                      ...currentState,
                      type: "SETTLEMENT",
                      category: "",
                    }));
                    setShowCategoryHint(false);
                    setCategoryHintPulse(false);
                  }}
                >
                  <strong>Dar dinero</strong>
                  <span>Ajuste</span>
                </button>
              </div>
            </section>

            <section className="transaction-entry-panel transaction-entry-panel-members">
              <div className="transaction-entry-panel-head">
                <p className="form-field-label">{payerLabel}</p>
              </div>

              <div className="transaction-entry-member-grid transaction-entry-member-grid-compact" role="radiogroup" aria-label={payerLabel}>
                {members.map((member) => (
                  <button
                    key={member.uid}
                    type="button"
                    className={`transaction-entry-member ${paidByUserId === member.uid ? "is-active" : ""}`}
                    onClick={() =>
                      setFormState((currentState) => ({
                        ...currentState,
                        paidByUserId: member.uid,
                      }))
                    }
                  >
                    <UserAvatar
                      photoURL={member.avatarPreset ? "" : member.photoURL}
                      avatarPreset={member.avatarPreset}
                      alt={member.username}
                      className="transaction-entry-member-avatar"
                      fallbackClassName="transaction-entry-member-avatar-fallback"
                    />
                    <span className="transaction-entry-member-copy">
                      <strong>{member.username}</strong>
                      <span>{currentUserId === member.uid ? "Vos" : "Integrante"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="transaction-entry-panel transaction-entry-panel-details">
              <div className="transaction-entry-compact-grid">
                {type === "SHARED" ? (
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
                ) : (
                  <div className="transaction-entry-info-card">
                    <strong>Sin categoria</strong>
                    <span>No cuenta como gasto.</span>
                  </div>
                )}

                <label className="form-field">
                  <span className="form-field-label">Descripcion</span>
                  <input
                    placeholder="Ej: super, nafta"
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
              </div>

              {showCategoryHint && categoryError ? (
                <p
                  className={`inline-field-hint ${
                    categoryHintPulse ? "inline-field-hint-pulse" : ""
                  }`}
                >
                  {categoryError}
                </p>
              ) : null}
            </section>
          </>
        )}

        <div className="composer-sheet-actions transaction-entry-actions">
          <div className="transaction-entry-submit-summary">
            <span>{typeLabel}</span>
            <strong>
              {currentStep === "amount"
                ? `$${amountPreview}`
                : selectedMember
                  ? `${selectedMember.username} · $${amountPreview}`
                  : `$${amountPreview}`}
            </strong>
          </div>

          {currentStep === "amount" ? (
            <button
              type="button"
              className="button"
              disabled={isSaving}
              onClick={handleContinue}
            >
              Continuar
            </button>
          ) : (
            <>
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

              <button
                type="button"
                className="button button-secondary"
                onClick={() => setCurrentStep("amount")}
                disabled={isSaving}
              >
                Volver
              </button>
            </>
          )}

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
