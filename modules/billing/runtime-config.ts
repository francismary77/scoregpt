import "../../lib/server-only.ts";

export function paymentsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PAYMENTS_ENABLED === "true";
}

export function requirePaymentsEnabled(env: NodeJS.ProcessEnv = process.env): void {
  if (!paymentsEnabled(env)) throw new Error("payments_disabled");
}
