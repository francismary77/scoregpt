export type UserRole="user"|"admin";export type MembershipTier="free"|"premium";export type MembershipStatus="active"|"expired"|"cancelled"|"trial"|"none";export type ContentAccessLevel="public"|"registered"|"premium";
export interface User{id:string;email:string;displayName:string;createdAt:string;role:UserRole}
export interface UserProfile{userId:string;displayName:string;country:string;avatarPlaceholder?:string;phone?:string;marketingConsent?:boolean}
export interface Membership{userId:string;tier:MembershipTier;status:MembershipStatus;startedAt?:string;expiresAt?:string}
export interface PredictionEntitlement{tier:MembershipTier;unlimited:boolean;allowance:number|null;period:"lifetime-welcome"}
export interface PredictionUsage{userId:string;viewedFixtureIds:string[];used:number;updatedAt:string}
export interface PredictionUnlockResult{reportId:string;alreadyUnlocked:boolean;remaining:number}
export interface UserSession{id:string;userId:string;createdAt:string;mode:"mock"|"supabase"}
export type AuthState={status:"checking"}|{status:"guest"}|{status:"confirmation-required";email:string}|{status:"authenticated";user:User;session:UserSession};
export interface PredictionAccessDecision{allowed:boolean;tier:"guest"|MembershipTier;remaining:number|null;reason:"public"|"authentication-required"|"free-allowance"|"allowance-exhausted"|"premium-access"|"premium-required";requiresAuthentication:boolean;requiresUpgrade:boolean}
export interface MembershipDisplay{tier:MembershipTier;status:MembershipStatus;label:string;hasPremiumAccess:boolean}
