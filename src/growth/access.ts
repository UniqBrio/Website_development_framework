/**
 * ROLE-BASED ACCESS for the growth & protection module.
 *
 * The website itself has no accounts (stack_doctrine.md: auth is default-deny).
 * This is the authorisation contract for whoever manages the growth
 * configuration — the owner's workflow session, or a host's admin surface. A host
 * that builds an admin route authenticates the person; THIS module decides what
 * that person may change, so the rule has one home however many surfaces apply it.
 *
 * Security settings are deliberately narrower than content: an editor may act on
 * a blog recommendation but may never weaken form protection.
 */
import { GROWTH_ROLES, type GrowthRole, type RecommendationArea } from "./vocabulary.js";

export const GROWTH_PERMISSIONS = [
  "growth.view",
  "recommendations.act",
  "guest_tools.configure",
  "spam_protection.configure",
  "security_log.view",
] as const;
export type GrowthPermission = (typeof GROWTH_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Readonly<Record<GrowthRole, readonly GrowthPermission[]>> = {
  owner: GROWTH_PERMISSIONS,
  admin: GROWTH_PERMISSIONS,
  editor: ["growth.view", "recommendations.act"],
  viewer: ["growth.view"],
};

export interface GrowthActor {
  /** A stable identifier for the audit trail (an email or user id). */
  id: string;
  role: GrowthRole;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
}

export function isGrowthRole(value: unknown): value is GrowthRole {
  return typeof value === "string" && (GROWTH_ROLES as readonly string[]).includes(value);
}

export function authorize(actor: GrowthActor | null | undefined, permission: GrowthPermission): AuthorizationResult {
  if (!actor || !isGrowthRole(actor.role) || actor.id.trim().length === 0) {
    return { allowed: false, reason: "no authenticated actor with a known role" };
  }
  const allowed = ROLE_PERMISSIONS[actor.role].includes(permission);
  return {
    allowed,
    reason: allowed ? `${actor.role} holds ${permission}` : `${actor.role} does not hold ${permission}`,
  };
}

/** Acting on a recommendation needs the permission of the area it changes. */
export function permissionForArea(area: RecommendationArea): GrowthPermission {
  if (area === "spam_protection") return "spam_protection.configure";
  if (area === "guest_engagement") return "guest_tools.configure";
  return "recommendations.act";
}
