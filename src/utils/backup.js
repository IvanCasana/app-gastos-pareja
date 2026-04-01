function sanitizeFileSegment(value, fallback) {
  const normalizedValue = (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedValue || fallback;
}

function serializeTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  if (typeof timestamp === "string") {
    return timestamp;
  }

  return null;
}

function escapeCsvValue(value) {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);

  if (
    normalizedValue.includes(",") ||
    normalizedValue.includes('"') ||
    normalizedValue.includes("\n")
  ) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

export function buildGroupBackup({ group, members, transactions }) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: {
      name: "Miticuenta",
    },
    group: {
      id: group.id,
      name: group.name,
      createdBy: group.createdBy,
      inviteCode: group.inviteCode,
      maxMembers: group.maxMembers,
      status: group.status,
      createdAt: serializeTimestamp(group.createdAt),
      updatedAt: serializeTimestamp(group.updatedAt),
      members: members.map((member) => ({
        uid: member.uid,
        username: member.username,
        photoURL: member.photoURL || "",
        avatarPreset: member.avatarPreset || "",
      })),
    },
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      description: transaction.description || "",
      category: transaction.category || "",
      type: transaction.type,
      paidByUserId: transaction.paidByUserId,
      createdByUserId: transaction.createdByUserId,
      groupId: transaction.groupId,
      date: transaction.date || "",
      createdAt: serializeTimestamp(transaction.createdAt),
      updatedAt: serializeTimestamp(transaction.updatedAt),
    })),
  };
}

export function buildBackupFilename(groupName, extension) {
  const filename = [
    "miticuenta",
    sanitizeFileSegment(groupName, "grupo"),
    sanitizeFileSegment(new Date().toISOString().slice(0, 10), "backup"),
  ].join("-");

  return `${filename}.${extension}`;
}

export function buildTransactionsCsv({ group, members, transactions }) {
  const memberNamesById = members.reduce((accumulator, member) => {
    accumulator[member.uid] = member.username;
    return accumulator;
  }, {});

  const header = [
    "group_id",
    "group_name",
    "transaction_id",
    "date",
    "type",
    "category",
    "amount",
    "description",
    "paid_by_user_id",
    "paid_by_username",
    "created_by_user_id",
    "created_by_username",
    "created_at",
    "updated_at",
  ];

  const rows = transactions.map((transaction) => [
    group.id,
    group.name,
    transaction.id,
    transaction.date || "",
    transaction.type || "",
    transaction.category || "",
    Number(transaction.amount || 0).toFixed(2),
    transaction.description || "",
    transaction.paidByUserId || "",
    memberNamesById[transaction.paidByUserId] || "",
    transaction.createdByUserId || "",
    memberNamesById[transaction.createdByUserId] || "",
    serializeTimestamp(transaction.createdAt) || "",
    serializeTimestamp(transaction.updatedAt) || "",
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

export function downloadGroupBackup({ group, members, transactions }) {
  const backupPayload = buildGroupBackup({
    group,
    members,
    transactions,
  });

  downloadTextFile(
    buildBackupFilename(group.name, "json"),
    JSON.stringify(backupPayload, null, 2),
    "application/json;charset=utf-8"
  );
}

export function downloadTransactionsCsv({ group, members, transactions }) {
  const csvContent = buildTransactionsCsv({
    group,
    members,
    transactions,
  });

  downloadTextFile(
    buildBackupFilename(group.name, "csv"),
    csvContent,
    "text/csv;charset=utf-8"
  );
}
