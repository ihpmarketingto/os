import { describe, expect, it } from "vitest";
import { INTERNAL_ROLE_SLUGS, CLIENT_ROLE_SLUGS, ROLE_SLUGS, isClientRole, isInternalRole } from "./roles";

describe("role classification", () => {
  it("classifies every system role as either internal or client, never both", () => {
    for (const slug of ROLE_SLUGS) {
      expect(isInternalRole(slug)).toBe(!isClientRole(slug));
    }
  });

  it("agency_owner, account_manager, specialist and contractor are internal", () => {
    for (const slug of INTERNAL_ROLE_SLUGS) {
      expect(isInternalRole(slug)).toBe(true);
      expect(isClientRole(slug)).toBe(false);
    }
  });

  it("client_admin and client_collaborator are client roles", () => {
    for (const slug of CLIENT_ROLE_SLUGS) {
      expect(isClientRole(slug)).toBe(true);
      expect(isInternalRole(slug)).toBe(false);
    }
  });

  it("covers every role slug between the internal and client lists", () => {
    expect(new Set([...INTERNAL_ROLE_SLUGS, ...CLIENT_ROLE_SLUGS])).toEqual(new Set(ROLE_SLUGS));
  });
});
