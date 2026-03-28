import { formatCurrencyAmount } from "./currency";

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
      // En un gasto compartido, quien pago queda a favor por la mitad.
      if (paidByUserId === referenceUserId) {
        balance += amount / 2;
      } else {
        balance -= amount / 2;
      }
    }

    if (transaction.type === "SETTLEMENT") {
      // Dar dinero mueve el saldo completo entre una persona y la otra.
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
    return `Saldo a tu favor: $${formatCurrencyAmount(balance)}`;
  }

  if (balance < 0) {
    return `Saldo a favor de ${otherUserName}: $${formatCurrencyAmount(
      Math.abs(balance)
    )}`;
  }

  return `Saldo equilibrado con ${otherUserName}`;
}
