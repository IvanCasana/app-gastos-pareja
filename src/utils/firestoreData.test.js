import test from "node:test";
import assert from "node:assert/strict";
import {
  DESCRIPTION_MAX_LENGTH,
  isIsoDateOnly,
  normalizeTransactionPayload,
  toLocalDateInputValue,
} from "./firestoreData.js";

test("formats local dates without UTC drift", () => {
  const sampleDate = new Date(2026, 2, 31, 23, 45, 10);

  assert.equal(toLocalDateInputValue(sampleDate), "2026-03-31");
});

test("recognizes YYYY-MM-DD dates only", () => {
  assert.equal(isIsoDateOnly("2026-03-31"), true);
  assert.equal(isIsoDateOnly("31-03-2026"), false);
  assert.equal(isIsoDateOnly("2026-3-1"), false);
});

test("normalizes transaction payloads for shared expenses", () => {
  const payload = normalizeTransactionPayload({
    amount: "199.999",
    description: "  supermercado  ",
    category: " Comida ",
    type: "SHARED",
    paidByUserId: "user-1",
    date: "2026-03-31",
  });

  assert.deepEqual(payload, {
    amount: 200,
    description: "supermercado",
    category: "Comida",
    type: "SHARED",
    paidByUserId: "user-1",
    date: "2026-03-31",
  });
});

test("clears category and trims description for settlements", () => {
  const payload = normalizeTransactionPayload({
    amount: 10,
    description: ` ${"a".repeat(DESCRIPTION_MAX_LENGTH + 5)} `,
    category: "Otros",
    type: "SETTLEMENT",
    paidByUserId: "user-2",
    date: "invalid-date",
  });

  assert.equal(payload.category, "");
  assert.equal(payload.type, "SETTLEMENT");
  assert.equal(payload.description.length, DESCRIPTION_MAX_LENGTH);
  assert.equal(isIsoDateOnly(payload.date), true);
});
