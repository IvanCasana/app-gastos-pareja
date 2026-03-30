import { formatCurrencyAmount } from "./currency.js";

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

  // El balance puede quedar en medios centavos por dividir gastos impares.
  // Si el residuo total es solo medio centavo, lo mostramos como cero.
  // En el resto de los casos redondeamos al centavo mas cercano para evitar
  // falsos 49,99 cuando en realidad corresponde 50,00.
  if (Math.abs(balanceInHalfCents) <= 1) {
    return 0;
  }

  const balanceInCents =
    Math.sign(balanceInHalfCents) *
    Math.round(Math.abs(balanceInHalfCents) / 2);

  return balanceInCents / 100;
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
