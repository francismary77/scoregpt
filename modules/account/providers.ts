import type { Session, SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getAuthRedirectUrl } from "@/config/site";
import type { AuthState, User, UserRole, UserSession } from "./domain";

export interface SignInInput { email: string; password: string }
export interface SignUpInput { displayName: string; email: string; password: string; acceptedTerms: boolean }
export type AuthSubscription = { unsubscribe(): void };
export interface AuthProvider {
  getCurrentUser(): Promise<User | null>;
  getSession(): Promise<UserSession | null>;
  signIn(input: SignInInput): Promise<AuthState>;
  signUp(input: SignUpInput): Promise<AuthState>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<{ accepted: boolean; demo: boolean }>;
  updatePassword(password: string): Promise<void>;
  subscribe?(listener: () => void): AuthSubscription;
}

export const authChangedEvent = "scoregpt:auth-changed";
const mockUsers: User[] = [
  { id: "demo-free", email: "free@example.test", displayName: "Free Member", createdAt: "2026-08-01T09:00:00Z", role: "user" },
  { id: "demo-premium", email: "premium@example.test", displayName: "Premium Member", createdAt: "2026-08-01T09:00:00Z", role: "user" },
  { id: "demo-admin", email: "admin@example.test", displayName: "Admin User", createdAt: "2026-08-01T09:00:00Z", role: "admin" },
];

export class MockAuthProvider implements AuthProvider {
  private readonly key = "scoregpt.mock-user-id";
  private user() { if (typeof window === "undefined") return null; const id = sessionStorage.getItem(this.key); return mockUsers.find((item) => item.id === id) ?? null; }
  async getCurrentUser() { return this.user(); }
  async getSession(): Promise<UserSession | null> { const user = this.user(); return user ? { id: `mock-${user.id}`, userId: user.id, createdAt: new Date().toISOString(), mode: "mock" } : null; }
  async signIn(): Promise<AuthState> { throw new Error("Live credential sign-in is unavailable in mock mode."); }
  async signUp(input: SignUpInput): Promise<AuthState> { this.persist("demo-free"); const user = { ...mockUsers[0], email: input.email, displayName: input.displayName }; return { status: "authenticated", user, session: (await this.getSession())! }; }
  async signOut() { if (typeof window !== "undefined") { sessionStorage.removeItem(this.key); window.dispatchEvent(new Event(authChangedEvent)); } }
  async requestPasswordReset() { return { accepted: true, demo: true }; }
  async updatePassword() { throw new Error("Password changes are unavailable in mock mode."); }
  async signInDemoUser(id: string): Promise<AuthState> { const user = mockUsers.find((item) => item.id === id); if (!user) throw new Error("Invalid demo account."); this.persist(id); return { status: "authenticated", user, session: (await this.getSession())! }; }
  private persist(id: string) { if (typeof window !== "undefined") { sessionStorage.setItem(this.key, id); window.dispatchEvent(new Event(authChangedEvent)); } }
}

export class UnavailableAuthProvider implements AuthProvider {
  private unavailable(): never { throw new Error("Authentication is temporarily unavailable."); }
  async getCurrentUser() { return null; }
  async getSession() { return null; }
  async signIn(): Promise<never> { return this.unavailable(); }
  async signUp(): Promise<never> { return this.unavailable(); }
  async signOut(): Promise<never> { return this.unavailable(); }
  async requestPasswordReset(): Promise<never> { return this.unavailable(); }
  async updatePassword(): Promise<never> { return this.unavailable(); }
}

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) return null;
    return this.mapUser(data.user);
  }

  async getSession(): Promise<UserSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session) return null;
    return this.mapSession(data.session);
  }

  async signIn(input: SignInInput): Promise<AuthState> {
    const { data, error } = await this.client.auth.signInWithPassword({ email: input.email.trim(), password: input.password });
    if (error) throw error;
    return { status: "authenticated", user: await this.mapUser(data.user), session: this.mapSession(data.session) };
  }

  async signUp(input: SignUpInput): Promise<AuthState> {
    const emailRedirectTo = typeof window === "undefined" ? undefined : getAuthRedirectUrl("/auth/callback?next=/dashboard");
    const { data, error } = await this.client.auth.signUp({
      email: input.email.trim(), password: input.password,
      options: { data: { display_name: input.displayName.trim() }, emailRedirectTo },
    });
    if (error) throw error;
    if (!data.user) throw new Error("Account creation did not complete.");
    if (!data.session) return { status: "confirmation-required", email: input.email.trim() };
    return { status: "authenticated", user: await this.mapUser(data.user), session: this.mapSession(data.session) };
  }

  async signOut() { const { error } = await this.client.auth.signOut(); if (error) throw error; }
  async requestPasswordReset(email: string) {
    const redirectTo = typeof window === "undefined" ? undefined : getAuthRedirectUrl("/auth/callback?next=/reset-password");
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
    return { accepted: true, demo: false };
  }
  async updatePassword(password: string) { const { error } = await this.client.auth.updateUser({ password }); if (error) throw error; }
  subscribe(listener: () => void): AuthSubscription {
    const { data } = this.client.auth.onAuthStateChange(() => listener());
    return data.subscription;
  }

  private mapSession(session: Session): UserSession { return { id: `supabase-${session.user.id}`, userId: session.user.id, createdAt: new Date(session.user.created_at).toISOString(), mode: "supabase" }; }
  private async mapUser(user: SupabaseUser): Promise<User> {
    const { data } = await this.client.from("profiles").select("display_name,role").eq("user_id", user.id).maybeSingle();
    return {
      id: user.id,
      email: user.email ?? "",
      displayName: data?.display_name ?? String(user.user_metadata.display_name ?? user.email?.split("@")[0] ?? "Member"),
      createdAt: user.created_at,
      role: (data?.role ?? "user") as UserRole,
    };
  }
}
