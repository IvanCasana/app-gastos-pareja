import { formatCurrencyAmount } from "./currency";

function toAmountInCents(amount) {
  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return 0;
  }

  return Math.round(numericAmount * 100);
}

export function calculateBalance(transactions, members, referenceUserId) {
  if (!referenceUserId || !Array.isArray(members) || members.length !== 2) {
    return 0;
  }

  let balanceInHalfCents = 0;

  for (const transaction of transactions) {
    const amountInCents = toAmountInCents(transaction.amount);
    const paidByUserId = transaction.paidByUserId || transaction.paidBy;

    if (!amountInCents || !paidByUserId) continue;

    if (transaction.type === "SHARED") {
      // Usamos medios centavos para evitar errores de coma flotante.
      if (paidByUserId === referenceUserId) {
        balanceInHalfCents += amountInCents;
      } else {
        balanceInHalfCents -= amountInCents;
      }
    }

    if (transaction.type === "SETTLEMENT") {
      // Dar dinero mueve el saldo completo entre una persona y la otra.
      if (paidByUserId === referenceUserId) {
        balanceInHalfCents += amountInCents * 2;
      } else {
        balanceInHalfCents -= amountInCents * 2;
      }
    }
  }

  return Math.round(balanceInHalfCents) / 200;
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
