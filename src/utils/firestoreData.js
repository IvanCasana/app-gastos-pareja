export const USERNAME_MAX_LENGTH = 24;
export const DESCRIPTION_MAX_LENGTH = 140;

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

export function toLocalDateInputValue(date = new Date()) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function isIsoDateOnly(value) {
  return ISO_DATE_ONLY_PATTERN.test(value);
}

export function normalizeTransactionPayload(transactionData) {
  const type = transactionData.type === "SETTLEMENT" ? "SETTLEMENT" : "SHARED";
  const numericAmount = Number(transactionData.amount);

  return {
    amount: Math.round(numericAmount * 100) / 100,
    description: (transactionData.description || "")
      .trim()
      .slice(0, DESCRIPTION_MAX_LENGTH),
    category:
      type === "SETTLEMENT" ? "" : (transactionData.category || "").trim(),
    type,
    paidByUserId: transactionData.paidByUserId || "",
    date: isIsoDateOnly(transactionData.date)
      ? transactionData.date
      : toLocalDateInputValue(),
  };
}
