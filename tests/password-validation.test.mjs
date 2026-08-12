import assert from "node:assert/strict";
import test from "node:test";
import { passwordUtf8ByteLength, validatePassword } from "../modules/account/validation.ts";

test("password policy accepts a normal valid password", () => {
  assert.equal(validatePassword("SafePass123!"), undefined);
});

test("password policy rejects fewer than eight characters", () => {
  assert.equal(validatePassword("Short7"), "Use at least 8 characters.");
});

test("password policy accepts exactly 72 ASCII bytes", () => {
  const password = "A".repeat(72);
  assert.equal(passwordUtf8ByteLength(password), 72);
  assert.equal(validatePassword(password), undefined);
});

test("password policy rejects 73 ASCII bytes", () => {
  const password = "A".repeat(73);
  assert.equal(passwordUtf8ByteLength(password), 73);
  assert.equal(validatePassword(password), "Use a password no longer than 72 UTF-8 bytes.");
});

test("password policy measures multibyte input as UTF-8 bytes", () => {
  const accepted = "⚽".repeat(24);
  const rejected = "⚽".repeat(25);
  assert.equal(passwordUtf8ByteLength(accepted), 72);
  assert.equal(passwordUtf8ByteLength(rejected), 75);
  assert.equal(validatePassword(accepted), undefined);
  assert.equal(validatePassword(rejected), "Use a password no longer than 72 UTF-8 bytes.");
});
