import { describe, expect, it, vi } from "vitest";
import { assertActionAllowed, selectProvider } from "./router";
import { AiActionNotAllowedError, AiRoutingError } from "./types";

const baseRequest = {
  organisationId: "org-1",
  clientId: "client-1",
  userId: "user-1",
} as const;

describe("selectProvider", () => {
  it("throws when the client has AI disabled", async () => {
    await expect(
      selectProvider({
        ...baseRequest,
        taskType: "copy_generation",
        mode: "draft",
        availableProviders: ["openai"],
        clientAiSettings: {
          aiEnabled: false,
          allowedProviders: ["openai"],
          financialDataAccessible: false,
          contactDataAccessible: false,
          contractsAccessible: false,
          documentsAccessible: false,
        },
      }),
    ).rejects.toThrow(AiRoutingError);
  });

  it("picks the first affinity provider that is available and allowed", async () => {
    // code_generation prefers anthropic first
    const decision = await selectProvider({
      ...baseRequest,
      taskType: "code_generation",
      mode: "draft",
      availableProviders: ["openai", "anthropic"],
    });
    expect(decision.provider).toBe("anthropic");
  });

  it("falls back to the next provider when the preferred one is unavailable", async () => {
    const decision = await selectProvider({
      ...baseRequest,
      taskType: "code_generation", // anthropic, openai, gemini
      mode: "draft",
      availableProviders: ["openai"],
    });
    expect(decision.provider).toBe("openai");
  });

  it("respects an explicit preferredProvider override", async () => {
    const decision = await selectProvider({
      ...baseRequest,
      taskType: "code_generation",
      mode: "draft",
      preferredProvider: "gemini",
      availableProviders: ["gemini", "anthropic"],
    });
    expect(decision.provider).toBe("gemini");
  });

  it("skips a candidate that fails the spend limit check and falls back", async () => {
    const withinSpendLimit = vi
      .fn()
      .mockImplementationOnce(() => false) // anthropic over budget
      .mockImplementationOnce(() => true); // openai ok

    const decision = await selectProvider({
      ...baseRequest,
      taskType: "code_generation",
      mode: "draft",
      availableProviders: ["anthropic", "openai"],
      withinSpendLimit,
    });

    expect(decision.provider).toBe("openai");
    expect(decision.fallbacksConsidered).toEqual(["anthropic"]);
  });

  it("throws AiRoutingError when no provider survives filtering", async () => {
    await expect(
      selectProvider({
        ...baseRequest,
        taskType: "code_generation",
        mode: "draft",
        availableProviders: [],
      }),
    ).rejects.toThrow(AiRoutingError);
  });
});

describe("assertActionAllowed", () => {
  it("is a no-op for actions that are not on the irreversible list", () => {
    expect(() => assertActionAllowed("some_reversible_action" as never, "draft")).not.toThrow();
  });

  it("throws when an irreversible action is attempted outside action_proposal mode", () => {
    expect(() => assertActionAllowed("send_client_email", "draft")).toThrow(AiActionNotAllowedError);
    expect(() => assertActionAllowed("publish_landing_page", "read")).toThrow(AiActionNotAllowedError);
  });

  it("allows an irreversible action to be proposed in action_proposal mode", () => {
    expect(() => assertActionAllowed("launch_campaign", "action_proposal")).not.toThrow();
  });
});
