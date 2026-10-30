// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run: node reconcile.js

const fs = require("fs");

const latestAttempts = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n");

for (const line of lines) {
  if (!line.trim()) {
    continue;
  }

  let event;

  try {
    event = JSON.parse(line);
  } catch {
    // Ignore lines that cannot be parsed as JSON.
    continue;
  }

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    continue;
  }

  if (
    event.txn_id === undefined ||
    event.txn_id === null ||
    String(event.txn_id).trim() === ""
  ) {
    // Ignore events without a transaction ID.
    continue;
  }

  const timestamp = Date.parse(event.ts);

  const txnId = String(event.txn_id);
  const existing = latestAttempts.get(txnId);

  // Retain only the latest attempt for each transaction.
  // If timestamps are equal, the later line takes precedence.
  if (
    existing === undefined ||
    timestamp >= existing.timestamp
  ) {
    latestAttempts.set(txnId, {
      timestamp,
      status: event.status,
      amount: Number(String(event.amount).replace(/,/g, "")),
    });
  }
}

let total = 0;
let count = 0;

// Only the latest successful attempt for each transaction counts.
for (const event of latestAttempts.values()) {
  if (event.status === "success") {
    total += event.amount;
    count += 1;
  }
}

const expected = parseInt(
  fs.readFileSync("expected.txt", "utf8").trim(),
  10
);

if (count !== expected) {
  console.log(
    `Check failed: counted ${count} successful payments, expected ${expected}.`
  );
  console.log(
    "Something in the data isn't being handled the way the README describes."
  );
  process.exitCode = 1;
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}