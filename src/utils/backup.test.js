import test from "node:test";
import assert from "node:assert/strict";
import { buildGroupBackup, buildTransactionsCsv } from "./backup.js";

function createTimestamp(isoString) {
  return {
    toDate() {
      return new Date(isoString);
    },
  };
}

test("builds a serializable backup payload for the current group", () => {
  const backup = buildGroupBackup({
    group: {
      id: "group-1",
      name: "Amor",
      createdBy: "user-1",
      inviteCode: "ABC123",
      maxMembers: 2,
      status: "active",
      createdAt: createTimestamp("2026-03-31T12:00:00.000Z"),
      updatedAt: createTimestamp("2026-03-31T13:00:00.000Z"),
    },
    members: [
      {
        uid: "user-1",
        username: "Deca",
        photoURL: "",
        avatarPreset: "cat-green",
      },
    ],
    transactions: [
      {
        id: "tx-1",
        amount: 155.5,
        description: "Super",
        category: "Comida",
        type: "SHARED",
        paidByUserId: "user-1",
        createdByUserId: "user-1",
        groupId: "group-1",
        date: "2026-03-31",
        createdAt: createTimestamp("2026-03-31T12:30:00.000Z"),
        updatedAt: createTimestamp("2026-03-31T12:31:00.000Z"),
      },
    ],
  });

  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.app.name, "Miticuenta");
  assert.equal(backup.group.name, "Amor");
  assert.equal(backup.group.members[0].username, "Deca");
  assert.equal(backup.transactions[0].id, "tx-1");
  assert.equal(backup.transactions[0].createdAt, "2026-03-31T12:30:00.000Z");
});

test("builds a csv export with resolved member names", () => {
  const csv = buildTransactionsCsv({
    group: {
      id: "group-1",
      name: "Amor",
    },
    members: [
      {
        uid: "user-1",
        username: "Deca",
      },
      {
        uid: "user-2",
        username: "Ani",
      },
    ],
    transactions: [
      {
        id: "tx-1",
        amount: 155.5,
        description: "Super, barrio",
        category: "Comida",
        type: "SHARED",
        paidByUserId: "user-1",
        createdByUserId: "user-2",
        date: "2026-03-31",
        createdAt: createTimestamp("2026-03-31T12:30:00.000Z"),
        updatedAt: createTimestamp("2026-03-31T12:31:00.000Z"),
      },
    ],
  });

  assert.match(csv, /group_id,group_name,transaction_id/);
  assert.match(csv, /Deca/);
  assert.match(csv, /Ani/);
  assert.match(csv, /"Super, barrio"/);
});
