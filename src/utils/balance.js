export function calculateBalance(transactions, members, referenceUserId) {
  if (!referenceUserId || !Array.isArray(members) || members.length !== 2) {
    return 0;
  }

  let balance = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const paidByUserId = transaction.paidByUserId || transaction.paidBy;

    if (!amount || Number.isNaN(amount) || !paidByUserId) continue;

    if (transaction.type === "SHARED") {
      if (paidByUserId === referenceUserId) {
        balance += amount / 2;
      } else {
        balance -= amount / 2;
      }
    }

    if (transaction.type === "SETTLEMENT") {
      if (paidByUserId === referenceUserId) {
        balance += amount;
      } else {
        balance -= amount;
      }
    }
  }

  return Math.round(balance * 100) / 100;
}

export function getBalanceMessage(balance, otherUserName) {
  if (!otherUserName) {
    return "Invita a otra persona al grupo para calcular el balance.";
  }

  if (balance > 0) {
    return `${otherUserName} te debe $${balance.toFixed(2)}`;
  }

  if (balance < 0) {
    return `Le debes a ${otherUserName} $${Math.abs(balance).toFixed(2)}`;
  }

  return `Estas saldado con ${otherUserName}`;
}
