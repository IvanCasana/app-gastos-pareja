import { useEffect, useMemo, useRef, useState } from "react";
import categories from "../data/categories";
import { formatCurrencyAmount } from "../utils/currency";

const MAX_VISIBLE_CATEGORY_ITEMS = 5;
const MIN_CATEGORY_PERCENTAGE = 6;
const GROUPED_CATEGORY_LABEL = "Categorias menores";

function getDateFromTimestamp(timestamp) {
  const date = timestamp?.toDate?.();
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameMonth(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getPresetLabel(preset, monthDate) {
  if (preset === "month") return formatMonthLabel(monthDate);
  if (preset === "last30") return "Ultimos 30 dias";
  return "Todo el historial";
}

function getRangeForPreset(preset, monthDate) {
  const today = new Date();

  if (preset === "all") {
    return { start: null, end: null };
  }

  if (preset === "last30") {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return {
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  };
}

function isInRange(date, range) {
  if (!date) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function buildShareBreakdown(transactions, members, groupSize) {
  const totals = members.reduce((accumulator, member) => {
    accumulator[member.uid] = 0;
    return accumulator;
  }, {});

  transactions.forEach((transaction) => {
    const amount = Number(transaction.amount);
    if (!amount || Number.isNaN(amount)) return;

    if (transaction.type === "SHARED") {
      const share = amount / Math.max(groupSize || members.length || 1, 1);
      members.forEach((member) => {
        totals[member.uid] = (totals[member.uid] || 0) + share;
      });
    }
  });

  const grandTotal = Object.values(totals).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return members.map((member) => {
    const value = Math.round((totals[member.uid] || 0) * 100) / 100;
    const percentage = grandTotal > 0 ? (value / grandTotal) * 100 : 0;

    return {
      uid: member.uid,
      username: member.username,
      value,
      percentage,
    };
  });
}

function toTitleCase(value) {
  return value.replace(/\S+/g, (word) => {
    const [firstCharacter = "", ...restCharacters] = word;
    return `${firstCharacter.toUpperCase()}${restCharacters.join("").toLowerCase()}`;
  });
}

function normalizeCategoryLabel(label) {
  const trimmedLabel = label?.trim().replace(/\s+/g, " ");

  if (!trimmedLabel) {
    return "";
  }

  const canonicalCategory = categories.find(
    (categoryOption) =>
      categoryOption.toLocaleLowerCase("es-AR") ===
      trimmedLabel.toLocaleLowerCase("es-AR")
  );

  if (canonicalCategory) {
    return canonicalCategory;
  }

  return toTitleCase(trimmedLabel);
}

function buildCategoryBreakdown(transactions) {
  const totals = {};

  transactions.forEach((transaction) => {
    if (transaction.type !== "SHARED") return;
    const amount = Number(transaction.amount);
    const category = normalizeCategoryLabel(transaction.category);

    if (!amount || Number.isNaN(amount) || !category) return;
    totals[category] = (totals[category] || 0) + amount;
  });

  const total = Object.values(totals).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const rankedItems = Object.entries(totals)
    .map(([label, value]) => ({
      label,
      value: Math.round(value * 100) / 100,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value);

  if (rankedItems.length <= MAX_VISIBLE_CATEGORY_ITEMS) {
    return rankedItems;
  }

  const visibleItems = [];
  const groupedItems = [];

  rankedItems.forEach((item, index) => {
    const shouldGroup =
      index >= MAX_VISIBLE_CATEGORY_ITEMS ||
      (index >= 3 && item.percentage < MIN_CATEGORY_PERCENTAGE);

    if (shouldGroup) {
      groupedItems.push(item);
      return;
    }

    visibleItems.push(item);
  });

  if (!groupedItems.length) {
    return visibleItems;
  }

  const groupedValue =
    Math.round(
      groupedItems.reduce((sum, item) => sum + Number(item.value || 0), 0) * 100
    ) / 100;
  const groupedPercentage = groupedItems.reduce(
    (sum, item) => sum + Number(item.percentage || 0),
    0
  );

  return [
    ...visibleItems,
    {
      label: GROUPED_CATEGORY_LABEL,
      value: groupedValue,
      percentage: groupedPercentage,
      groupedCount: groupedItems.length,
      groupedItems,
    },
  ];
}

function buildSettlementBreakdown(transactions, members) {
  const totals = members.reduce((accumulator, member) => {
    accumulator[member.uid] = 0;
    return accumulator;
  }, {});

  let total = 0;

  transactions.forEach((transaction) => {
    if (transaction.type !== "SETTLEMENT") return;
    const amount = Number(transaction.amount);
    const paidByUserId = transaction.paidByUserId || "";

    if (!amount || Number.isNaN(amount) || !paidByUserId) return;

    totals[paidByUserId] = (totals[paidByUserId] || 0) + amount;
    total += amount;
  });

  return {
    total: Math.round(total * 100) / 100,
    items: members
      .map((member) => ({
        uid: member.uid,
        username: member.username,
        value: Math.round((totals[member.uid] || 0) * 100) / 100,
        percentage: total > 0 ? ((totals[member.uid] || 0) / total) * 100 : 0,
      }))
      .filter((item) => item.value > 0),
  };
}

function renderMoney(amount) {
  return `$${formatCurrencyAmount(amount)}`;
}

function getStatisticsValueClass(amount) {
  const label = renderMoney(amount);

  if (label.length >= 18) {
    return "statistics-card-value statistics-card-value-ultra-tight";
  }

  if (label.length >= 15) {
    return "statistics-card-value statistics-card-value-tight";
  }

  if (label.length >= 12) {
    return "statistics-card-value statistics-card-value-compact";
  }

  return "statistics-card-value";
}

function StatisticsSheet({
  isOpen,
  onClose,
  transactions,
  members,
  currentGroupName,
  currentGroupCreatedAt,
}) {
  const [periodPreset, setPeriodPreset] = useState("month");
  const currentMonth = useMemo(() => startOfMonth(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => currentMonth);
  const [categoriesMinorExpanded, setCategoriesMinorExpanded] = useState(false);
  const sheetRef = useRef(null);
  const firstAvailableMonth = useMemo(() => {
    const createdAtDate = getDateFromTimestamp(currentGroupCreatedAt);
    return createdAtDate ? startOfMonth(createdAtDate) : currentMonth;
  }, [currentGroupCreatedAt, currentMonth]);
  const visibleMonthCursor = useMemo(() => {
    if (monthCursor < firstAvailableMonth) {
      return firstAvailableMonth;
    }

    if (monthCursor > currentMonth) {
      return currentMonth;
    }

    return monthCursor;
  }, [currentMonth, firstAvailableMonth, monthCursor]);

  const periodRange = useMemo(
    () => getRangeForPreset(periodPreset, visibleMonthCursor),
    [periodPreset, visibleMonthCursor]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isInRange(getDateFromTimestamp(transaction.createdAt), periodRange)
      ),
    [periodRange, transactions]
  );

  const sharedTransactions = useMemo(
    () => filteredTransactions.filter((transaction) => transaction.type === "SHARED"),
    [filteredTransactions]
  );

  const settlementTransactions = useMemo(
    () =>
      filteredTransactions.filter((transaction) => transaction.type === "SETTLEMENT"),
    [filteredTransactions]
  );

  const sharedTotal = useMemo(
    () =>
      Math.round(
        sharedTransactions.reduce((sum, transaction) => {
          const amount = Number(transaction.amount);
          return sum + (Number.isNaN(amount) ? 0 : amount);
        }, 0) * 100
      ) / 100,
    [sharedTransactions]
  );

  const shareBreakdown = useMemo(
    () => buildShareBreakdown(sharedTransactions, members, members.length),
    [members, sharedTransactions]
  );

  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(sharedTransactions),
    [sharedTransactions]
  );
  const settlementBreakdown = useMemo(
    () => buildSettlementBreakdown(settlementTransactions, members),
    [members, settlementTransactions]
  );

  const periodLabel = getPresetLabel(periodPreset, visibleMonthCursor);
  const isCurrentMonthSelected = isSameMonth(visibleMonthCursor, currentMonth);
  const isFirstAvailableMonthSelected = isSameMonth(
    visibleMonthCursor,
    firstAvailableMonth
  );

  useEffect(() => {
    if (!isOpen || !sheetRef.current) {
      return;
    }

    sheetRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [isOpen]);

  return (
    <>
      <div
        className={`composer-sheet-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside
        ref={sheetRef}
        className={`composer-sheet statistics-sheet ${isOpen ? "is-open" : ""}`}
      >
        <button type="button" className="composer-sheet-close" onClick={onClose}>
          Cerrar
        </button>

        <div className="composer-sheet-content">
          <header className="composer-sheet-header statistics-sheet-header">
            <p className="composer-sheet-eyebrow">Estadisticas</p>
            <h2>Panorama del grupo</h2>
            <p className="composer-sheet-copy">
              {currentGroupName
                ? `Mira como viene ${currentGroupName} en ${periodLabel}.`
                : `Mira como vienen los movimientos en ${periodLabel}.`}
            </p>
          </header>

          <section className="statistics-period-card statistics-panel statistics-panel-period">
            <div className="statistics-period-head">
              <span className="statistics-period-label">Periodo</span>
              <div className="statistics-period-presets">
                <button
                  type="button"
                  className={`statistics-pill ${
                    periodPreset === "month" ? "is-active" : ""
                  }`}
                  onClick={() => setPeriodPreset("month")}
                >
                  Mes
                </button>
                <button
                  type="button"
                  className={`statistics-pill ${
                    periodPreset === "last30" ? "is-active" : ""
                  }`}
                  onClick={() => setPeriodPreset("last30")}
                >
                  30 dias
                </button>
                <button
                  type="button"
                  className={`statistics-pill ${
                    periodPreset === "all" ? "is-active" : ""
                  }`}
                  onClick={() => setPeriodPreset("all")}
                >
                  Todo
                </button>
              </div>
            </div>

            {periodPreset === "month" ? (
              <div className="statistics-month-switcher">
                <button
                  type="button"
                  className="statistics-switch-button"
                  onClick={() =>
                    setMonthCursor((currentValue) => {
                      const safeCurrentValue =
                        currentValue < firstAvailableMonth
                          ? firstAvailableMonth
                          : currentValue;

                      if (isSameMonth(safeCurrentValue, firstAvailableMonth)) {
                        return currentValue;
                      }

                      const previousMonth = shiftMonth(safeCurrentValue, -1);
                      return previousMonth < firstAvailableMonth
                        ? firstAvailableMonth
                        : previousMonth;
                    })
                  }
                  disabled={isFirstAvailableMonthSelected}
                >
                  {"<"}
                </button>
                <strong>{formatMonthLabel(visibleMonthCursor)}</strong>
                <button
                  type="button"
                  className="statistics-switch-button"
                  onClick={() =>
                    setMonthCursor((currentValue) => {
                      const safeCurrentValue =
                        currentValue > currentMonth ? currentMonth : currentValue;

                      if (isSameMonth(safeCurrentValue, currentMonth)) {
                        return currentValue;
                      }

                      const nextMonth = shiftMonth(safeCurrentValue, 1);
                      return nextMonth > currentMonth ? currentMonth : nextMonth;
                    })
                  }
                  disabled={isCurrentMonthSelected}
                >
                  {">"}
                </button>
              </div>
            ) : (
              <p className="statistics-period-caption">{periodLabel}</p>
            )}
          </section>

          <section className="statistics-grid">
            <article className="statistics-card statistics-card-highlight">
              <span className="statistics-card-label">Total gastado</span>
              <strong className={getStatisticsValueClass(sharedTotal)}>
                {renderMoney(sharedTotal)}
              </strong>
              <small className="statistics-card-caption">
                {sharedTransactions.length}{" "}
                {sharedTransactions.length === 1
                  ? "movimiento compartido"
                  : "movimientos compartidos"}
              </small>
            </article>

            <article className="statistics-card">
              <span className="statistics-card-label">Dar dinero</span>
              <strong className={getStatisticsValueClass(settlementBreakdown.total)}>
                {renderMoney(settlementBreakdown.total)}
              </strong>
              <small className="statistics-card-caption">
                {settlementTransactions.length}{" "}
                {settlementTransactions.length === 1
                  ? "transferencia"
                  : "transferencias"}
              </small>
            </article>
          </section>

          <section className="statistics-section statistics-panel statistics-panel-spend">
            <div className="statistics-section-head">
              <h3>Gasto por persona</h3>
              <p>Distribucion del gasto del periodo.</p>
            </div>

            <div className="statistics-list">
              {shareBreakdown.map((item) => (
                <div key={item.uid} className="statistics-row">
                  <div className="statistics-row-top">
                    <strong>{item.username}</strong>
                    <span>{renderMoney(item.value)}</span>
                  </div>
                  <div className="statistics-bar-track">
                    <div
                      className="statistics-bar-fill"
                      style={{
                        width: `${Math.max(
                          item.percentage,
                          item.value > 0 ? 6 : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <small className="statistics-row-caption">
                    {item.percentage.toFixed(1).replace(".", ",")}%
                  </small>
                </div>
              ))}
            </div>
          </section>

          <section className="statistics-section statistics-panel statistics-panel-categories">
            <div className="statistics-section-head">
              <h3>Categorias</h3>
              <p>Top del periodo, con las categorias chicas agrupadas al final.</p>
            </div>

            {categoryBreakdown.length > 0 ? (
              <>
                <div className="statistics-section-subtitle">
                  Top 5 categorias del periodo
                </div>

                <div className="statistics-list">
                  {categoryBreakdown.map((item) => (
                    <div key={item.label} className="statistics-row">
                      <div className="statistics-row-top">
                        <strong>{item.label}</strong>
                        <span>{renderMoney(item.value)}</span>
                      </div>
                      <div className="statistics-bar-track">
                        <div
                          className="statistics-bar-fill statistics-bar-fill-soft"
                          style={{ width: `${Math.max(item.percentage, 8)}%` }}
                        />
                      </div>
                      {item.groupedCount ? (
                        <div className="statistics-row-meta">
                          <small className="statistics-row-caption">
                            {item.percentage.toFixed(1).replace(".", ",")}% -{" "}
                            {item.groupedCount} categorias agrupadas
                          </small>
                          <button
                            type="button"
                            className="statistics-inline-toggle"
                            onClick={() =>
                              setCategoriesMinorExpanded((currentValue) => !currentValue)
                            }
                          >
                            {categoriesMinorExpanded ? "Ocultar detalle" : "Ver detalle"}
                          </button>
                        </div>
                      ) : (
                        <small className="statistics-row-caption">
                          {item.percentage.toFixed(1).replace(".", ",")}%
                        </small>
                      )}

                      {item.groupedCount && categoriesMinorExpanded ? (
                        <div className="statistics-subrows">
                          {item.groupedItems.map((groupedItem) => (
                            <div
                              key={groupedItem.label}
                              className="statistics-subrow"
                            >
                              <span>{groupedItem.label}</span>
                              <strong>{renderMoney(groupedItem.value)}</strong>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p className="empty-state-title">
                  Todavia no hay categorias para este periodo.
                </p>
                <p className="empty-state-copy">
                  Cuando carguen gastos compartidos, vas a poder ver el reparto
                  por categoria.
                </p>
              </div>
            )}
          </section>

          <section className="statistics-section statistics-panel statistics-panel-settlement">
            <div className="statistics-section-head">
              <h3>Resumen de dar dinero</h3>
              <p>Transferencias internas vistas aparte del gasto real.</p>
            </div>

            {settlementBreakdown.items.length > 0 ? (
              <div className="statistics-list">
                {settlementBreakdown.items.map((item) => (
                  <div key={item.uid} className="statistics-row">
                    <div className="statistics-row-top">
                      <strong>{item.username}</strong>
                      <span>{renderMoney(item.value)}</span>
                    </div>
                    <div className="statistics-bar-track">
                      <div
                        className="statistics-bar-fill statistics-bar-fill-warm"
                        style={{
                          width: `${Math.max(
                            item.percentage,
                            item.value > 0 ? 8 : 0
                          )}%`,
                        }}
                      />
                    </div>
                    <small className="statistics-row-caption">
                      {item.percentage.toFixed(1).replace(".", ",")}%
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-title">
                  Sin transferencias en este periodo.
                </p>
                <p className="empty-state-copy">
                  Aca vas a ver cuanto se dieron entre ustedes sin mezclarlo con
                  categorias.
                </p>
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

export default StatisticsSheet;
