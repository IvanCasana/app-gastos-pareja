function TransactionList({
  transactions,
  memberNames,
  memberPhotos,
  currentUserId,
  onEditTransaction,
  onDeleteTransaction,
  deletingId,
  hasMore,
  onLoadMore,
}) {
  function getAvatarLetter(name) {
    return (name || "U").trim().charAt(0).toUpperCase();
  }

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
        const createdByName =
          memberNames[transaction.createdByUserId] || "Integrante";
        const canEdit =
          Boolean(currentUserId) &&
          Boolean(transaction.createdByUserId) &&
          transaction.createdByUserId === currentUserId;
        const canDelete =
          Boolean(currentUserId) &&
          Boolean(transaction.createdByUserId) &&
          transaction.createdByUserId === currentUserId;

        return (
          <article key={transaction.id} className="transaction">
            <div className="transaction-top">
              <div className="transaction-main">
                <div className="transaction-person">
                  {paidByPhoto ? (
                    <img
                      src={paidByPhoto}
                      alt={`Avatar de ${paidByName}`}
                      className="transaction-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="transaction-avatar transaction-avatar-fallback">
                      {getAvatarLetter(paidByName)}
                    </div>
                  )}
                  <p className="transaction-amount">
                    $ {Number(transaction.amount).toFixed(2)}
                  </p>
                </div>
                <p className="transaction-bottom transaction-primary-meta">
                  {getTypeLabel(transaction.type)}
                </p>
                <div className="transaction-meta-row">
                  <p className="transaction-bottom">Cargado por: {createdByName}</p>
                  <span className="transaction-tag">{transaction.category}</span>
                </div>
                {transaction.description ? (
                  <div className="transaction-bottom">{transaction.description}</div>
                ) : null}
              </div>
              <div className="transaction-side">
                <div className="transaction-actions">
                  {canEdit ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "8px 12px" }}
                      onClick={() => onEditTransaction(transaction)}
                    >
                      Editar
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className="button button-danger"
                      style={{ width: "auto", padding: "8px 12px" }}
                      disabled={deletingId === transaction.id}
                      onClick={() => onDeleteTransaction(transaction)}
                    >
                      {deletingId === transaction.id ? "Borrando..." : "Borrar"}
                    </button>
                  ) : null}
                </div>
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
