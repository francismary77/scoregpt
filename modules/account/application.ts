"use client";
import { authConfig } from "@/config/application";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPersistenceRepositories } from "@/modules/persistence/application";
import { MockAuthProvider, SupabaseAuthProvider, UnavailableAuthProvider } from "./providers";
import { AuthService, MembershipService, PredictionEntitlementService } from "./services";

const client = authConfig.mode === "supabase" ? getSupabaseBrowserClient() : null;
const authProvider = authConfig.mode === "mock"
  ? new MockAuthProvider()
  : client
    ? new SupabaseAuthProvider(client)
    : new UnavailableAuthProvider();
const repositories = createPersistenceRepositories(client ?? undefined);
export const authService = new AuthService(authProvider);
export const membershipService = new MembershipService(repositories.membership);
export const predictionEntitlementService = new PredictionEntitlementService(new MembershipService(repositories.membership), repositories.predictionUsage);
export const accountRepositories = repositories;
