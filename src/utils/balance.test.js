import test from "node:test";
import assert from "node:assert/strict";
import { calculateBalance, getBalanceMessage } from "./balance.js";

const MEMBERS = [{ uid: "a" }, { uid: "b" }];

test("returns zero without a valid two-person group context", () => {
  assert.equal(calculateBalance([], [], "a"), 0);
  assert.equal(calculateBalance([], [{ uid: "a" }], "a"), 0);
  assert.equal(calculateBalance([], MEMBERS, ""), 0);
});

test("splits shared expenses evenly between both members", () => {
  const transactions = [
    {
      type: "SHARED",
      amount: 10,
      paidByUserId: "a",
    },
  ];

  assert.equal(calculateBalance(transactions, MEMBERS, "a"), 5);
  assert.equal(calculateBalance(transactions, MEMBERS, "b"), -5);
});

test("keeps both views symmetric for odd-cent shared expenses", () => {
  const transactions = [
    {
      type: "SHARED",
      amount: 5.01,
      paidByUserId: "a",
    },
  ];

  assert.equal(calculateBalance(transactions, MEMBERS, "a"), 2.51);
  assert.equal(calculateBalance(transactions, MEMBERS, "b"), -2.51);
});

test("applies settlements as full balance transfers", () => {
  const transactions = [
    {
      type: "SHARED",
      amount: 100,
      paidByUserId: "a",
    },
    {
      type: "SETTLEMENT",
      amount: 30,
      paidByUserId: "b",
    },
  ];

  assert.equal(calculateBalance(transactions, MEMBERS, "a"), 20);
  assert.equal(calculateBalance(transactions, MEMBERS, "b"), -20);
});

test("treats an isolated half-cent residue as zero", () => {
  const transactions = [
    {
      type: "SHARED",
      amount: 0.01,
      paidByUserId: "a",
    },
  ];

  assert.equal(calculateBalance(transactions, MEMBERS, "a"), 0);
  assert.equal(calculateBalance(transactions, MEMBERS, "b"), 0);
});

test("builds the expected balance messages", () => {
  assert.equal(
    getBalanceMessage(12.5, "Dai"),
    "Saldo a tu favor: $12,50"
  );
  assert.equal(
    getBalanceMessage(-12.5, "Dai"),
    "Saldo a favor de Dai: $12,50"
  );
  assert.equal(
    getBalanceMessage(0, "Dai"),
    "Saldo equilibrado con Dai"
  );
  assert.equal(
    getBalanceMessage(0, ""),
    "Invita a otra persona al grupo para calcular el balance."
  );
});
