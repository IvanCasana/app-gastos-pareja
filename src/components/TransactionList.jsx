function TransactionList({
  transactions,
  memberNames,
  currentUserId,
  onEditTransaction,
  onDeleteTransaction,
  deletingId,
}) {
  function getTypeLabel(type) {
    if (type === "SHARED") return "Compartido";
    if (type === "SETTLEMENT") return "Dar dinero";
    return type;
  }

  if (transactions.length === 0) {
    return (
      <section style={{ marginTop: "24px" }}>
        <h2>Movimientos</h2>
        <p>Todavia no hay movimientos cargados.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Movimientos</h2>

      {transactions.map((transaction) => {
        const paidByName =
          memberNames[transaction.paidByUserId] ||
          transaction.paidBy ||
          "Integrante";
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
          <div key={transaction.id} className="transaction">
            <div className="transaction-top">
              <span>$ {Number(transaction.amount).toFixed(2)}</span>
              <span>{transaction.category}</span>
            </div>

            <div className="transaction-bottom">
              {paidByName} - {getTypeLabel(transaction.type)}
            </div>

            <div className="transaction-bottom">
              Cargado por: {createdByName}
            </div>

            {transaction.description ? (
              <div className="transaction-bottom">{transaction.description}</div>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "8px",
              }}
            >
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
                  className="button"
                  style={{
                    width: "auto",
                    padding: "8px 12px",
                    backgroundColor:
                      deletingId === transaction.id ? "#9ca3af" : "#b42318",
                  }}
                  disabled={deletingId === transaction.id}
                  onClick={() => onDeleteTransaction(transaction)}
                >
                  {deletingId === transaction.id ? "Borrando..." : "Borrar"}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default TransactionList;
