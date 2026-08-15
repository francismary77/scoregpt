import "@/lib/server-only";
import { timingSafeEqual } from "node:crypto";
export function authorizeFootballCron(request:Request,secret:string|null){if(!secret)return false;const supplied=request.headers.get("authorization");if(!supplied?.startsWith("Bearer "))return false;const candidate=Buffer.from(supplied.slice(7)),expected=Buffer.from(secret);return candidate.length===expected.length&&timingSafeEqual(candidate,expected)}
