import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    env: {
      APP_URL: "http://localhost:3000",
      SUPABASE_URL: "https://test-project.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SECRETS_ENCRYPTION_KEY: "Y2ktcGxhY2Vob2xkZXItMzItYnl0ZS1rZXktZm9yLXRlc3Rz",
    },
  },
});
