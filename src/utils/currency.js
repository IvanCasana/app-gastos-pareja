export function formatCurrencyAmount(amount) {
  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return "0,00";
  }

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function splitCurrencyAmount(amount) {
  const [integerPart = "0", decimalPart = "00"] = formatCurrencyAmount(amount).split(",");

  return {
    integerPart,
    decimalPart,
  };
}
