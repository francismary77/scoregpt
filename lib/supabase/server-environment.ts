import "../server-only.ts";

export type SupabaseEnvironment = "development" | "production";

export type ValidatedSupabaseEnvironment = {
  environment: SupabaseEnvironment;
  projectRef: string;
  url: string;
};

function runtimeEnvironment(env: NodeJS.ProcessEnv): SupabaseEnvironment {
  if (env.VERCEL_ENV === "production") return "production";
  return "development";
}

function projectRefFromUrl(value: string): string {
  try {
    const url = new URL(value);
    const match = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    if (!match) throw new Error("invalid_supabase_url");
    return match[1];
  } catch {
    throw new Error("invalid_supabase_url");
  }
}

export function validateSupabaseEnvironment(
  env: NodeJS.ProcessEnv,
  url = env.NEXT_PUBLIC_SUPABASE_URL,
): ValidatedSupabaseEnvironment {
  if (!url) throw new Error("supabase_url_required");
  const configuredEnvironment = env.SUPABASE_ENVIRONMENT ?? (env.NODE_TEST_CONTEXT ? runtimeEnvironment(env) : undefined);
  if (configuredEnvironment !== "development" && configuredEnvironment !== "production") {
    throw new Error("supabase_environment_required");
  }
  if (configuredEnvironment !== runtimeEnvironment(env)) throw new Error("supabase_environment_mismatch");

  const expectedRef = env.SUPABASE_PROJECT_REF?.trim() || (env.NODE_TEST_CONTEXT ? projectRefFromUrl(url) : undefined);
  if (!expectedRef || !/^[a-z0-9]{20}$/.test(expectedRef)) throw new Error("supabase_project_ref_required");
  const projectRef = projectRefFromUrl(url);
  if (projectRef !== expectedRef) throw new Error("supabase_project_mismatch");
  return { environment: configuredEnvironment, projectRef, url };
}

export function requireServiceRoleSupabaseConfig(env: NodeJS.ProcessEnv = process.env) {
  const validated = validateSupabaseEnvironment(env);
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("supabase_service_role_required");
  return { ...validated, serviceRoleKey };
}
