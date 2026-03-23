import { useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";

function formatFriendlyDateTime(timestamp) {
  const date = timestamp?.toDate?.();

  if (!date || Number.isNaN(date.getTime())) {
    return {
      dateLabel: "",
      timeLabel: "",
    };
  }

  const dateLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);

  const timeLabel = `${new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)} hs`;

  return {
    dateLabel,
    timeLabel,
  };
}

function formatAmountDisplay(amount) {
  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return {
      integerPart: "0",
      decimalPart: "00",
      compactIntegerStart: "0",
      fullLabel: "$ 0.00",
      shouldCompact: false,
    };
  }

  const formattedAmount = numericAmount.toFixed(2);
  const [integerPart, decimalPart = "00"] = formattedAmount.split(".");
  // Los montos muy largos se compactan para que no rompan la primera fila.
  const shouldCompact = formattedAmount.length > 13;

  return {
    integerPart,
    decimalPart,
    compactIntegerStart: shouldCompact ? integerPart.slice(0, 8) : integerPart,
    fullLabel: `$ ${formattedAmount}`,
    shouldCompact,
  };
}

function TransactionList({
  transactions,
  memberNames,
  memberPhotos,
  memberAvatarPresets,
  currentUserId,
  onEditTransaction,
  onDeleteTransaction,
  deletingId,
  hasMore,
  onLoadMore,
}) {
  const [openMenuId, setOpenMenuId] = useState("");
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState({});
  const [expandedAmountIds, setExpandedAmountIds] = useState({});

  useEffect(() => {
    function handleWindowClick() {
      setOpenMenuId("");
    }

    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  function getTypeLabel(type) {
    if (type === "SHARED") return "Compartido";
    if (type === "SETTLEMENT") return "Dar dinero";
    return type;
  }

  if (transactions.length === 0) {
    return (
      <section className="timeline">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Actividad del grupo</p>
            <h2>Movimientos</h2>
          </div>
        </div>
        <div className="empty-state">
          <p className="empty-state-title">Todavia no hay movimientos cargados.</p>
          <p className="empty-state-copy">
            Usa el boton inferior para registrar el primer movimiento del grupo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="timeline">
      <div className="section-header">
        <div>
          <p className="section-eyebrow">Actividad del grupo</p>
          <h2>Movimientos</h2>
        </div>
      </div>

      {transactions.map((transaction) => {
        const paidByName =
          memberNames[transaction.paidByUserId] ||
          transaction.paidBy ||
          "Integrante";
        const paidByPhoto = memberPhotos?.[transaction.paidByUserId] || "";
        const paidByAvatarPreset =
          memberAvatarPresets?.[transaction.paidByUserId] || "";
        const createdByName =
          memberNames[transaction.createdByUserId] || "Integrante";
        const { dateLabel, timeLabel } = formatFriendlyDateTime(
          transaction.createdAt
        );
        const canEdit =
          Boolean(currentUserId) &&
          Boolean(transaction.createdByUserId) &&
          transaction.createdByUserId === currentUserId;
        const canDelete = canEdit;
        const hasActions = canEdit || canDelete;
        const isMenuOpen = openMenuId === transaction.id;
        const description = transaction.description?.trim() || "";
        const categoryLabel = transaction.category?.trim() || "";
        const hasLongDescription = description.length > 180;
        const isDescriptionExpanded = Boolean(expandedDescriptionIds[transaction.id]);
        const isAmountExpanded = Boolean(expandedAmountIds[transaction.id]);
        // Los montos largos se compactan sin perder el valor completo al tocarlo.
        const amountDisplay = formatAmountDisplay(transaction.amount);

        return (
          <article
            key={transaction.id}
            className={`transaction ${
              hasLongDescription && isDescriptionExpanded
                ? "transaction-expanded"
                : ""
            }`}
            onClick={() => {
              if (!hasLongDescription) {
                return;
              }

              setExpandedDescriptionIds((currentValue) => ({
                ...currentValue,
                [transaction.id]: !currentValue[transaction.id],
              }));
            }}
          >
            {hasActions ? (
              <div className="transaction-side">
                <div className="transaction-actions-menu">
                  <button
                    type="button"
                    className="transaction-actions-trigger"
                    aria-label="Abrir acciones del movimiento"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId((currentValue) =>
                        currentValue === transaction.id ? "" : transaction.id
                      );
                    }}
                  >
                    <span className="transaction-actions-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </button>

                  {isMenuOpen ? (
                    <div
                      className="transaction-actions-popover"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {canEdit ? (
                        <button
                          type="button"
                          className="transaction-action-item"
                          onClick={() => {
                            setOpenMenuId("");
                            onEditTransaction(transaction);
                          }}
                        >
                          Editar
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="transaction-action-item transaction-action-item-danger"
                          disabled={deletingId === transaction.id}
                          onClick={() => {
                            setOpenMenuId("");
                            onDeleteTransaction(transaction);
                          }}
                        >
                          {deletingId === transaction.id ? "Borrando..." : "Borrar"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="transaction-top">
              <div className="transaction-main">
                <div className="transaction-head-row">
                  <div className="transaction-person">
                    <UserAvatar
                      photoURL={paidByAvatarPreset ? "" : paidByPhoto}
                      avatarPreset={paidByAvatarPreset}
                      alt={`Avatar de ${paidByName}`}
                      className="transaction-avatar"
                      fallbackClassName="transaction-avatar-fallback"
                    />
                    <button
                      type="button"
                      className={`transaction-amount ${
                        amountDisplay.shouldCompact && !isAmountExpanded
                          ? "transaction-amount-compact"
                          : ""
                      }`}
                      title={`Monto completo: ${amountDisplay.fullLabel}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!amountDisplay.shouldCompact) {
                          return;
                        }

                        setExpandedAmountIds((currentValue) => ({
                          ...currentValue,
                          [transaction.id]: !currentValue[transaction.id],
                        }));
                      }}
                    >
                      {amountDisplay.shouldCompact && !isAmountExpanded ? (
                        <>
                          <span className="transaction-currency">$</span>
                          <span className="transaction-amount-integer">
                            {amountDisplay.compactIntegerStart}
                          </span>
                          <span className="transaction-amount-ellipsis">...</span>
                        </>
                      ) : (
                        <>
                          <span className="transaction-currency">$</span>
                          <span className="transaction-amount-integer">
                            {amountDisplay.integerPart}
                          </span>
                          <span className="transaction-amount-decimal">
                            .{amountDisplay.decimalPart}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="transaction-meta-row">
                  <p className="transaction-bottom transaction-primary-meta">
                    {getTypeLabel(transaction.type)}
                  </p>
                  <p className="transaction-bottom">Cargado por: {createdByName}</p>
                  {dateLabel ? (
                    <p className="transaction-bottom">
                      {dateLabel} - {timeLabel}
                    </p>
                  ) : null}
                  {categoryLabel ? (
                    <span className="transaction-tag">{categoryLabel}</span>
                  ) : null}
                </div>

                {description ? (
                  <div className="transaction-description-block">
                    <p
                      className={`transaction-description ${
                        hasLongDescription && !isDescriptionExpanded
                          ? "transaction-description-collapsed"
                          : ""
                      }`}
                    >
                      {description}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}

      {hasMore ? (
        <button
          type="button"
          className="button button-secondary timeline-load-more"
          onClick={onLoadMore}
        >
          Ver mas movimientos
        </button>
      ) : null}
    </section>
  );
}

export default TransactionList;
