import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file to access VITE_ variables at config time
  const env = loadEnv(mode, process.cwd(), '');
  
  // STRIPE GUARDRAIL: Warn if publishable key is missing, but don't block build
  // Runtime validation in src/config/env.ts handles actual enforcement
  const stripeKey = env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (stripeKey && stripeKey !== "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE") {
    // Validate key format if provided
    if (!stripeKey.startsWith("pk_test_") && !stripeKey.startsWith("pk_live_")) {
      console.warn("\n⚠️ STRIPE CONFIGURATION WARNING ⚠️");
      console.warn("VITE_STRIPE_PUBLISHABLE_KEY does not appear to be a valid Stripe key.");
      console.warn("Key should start with 'pk_test_' (test mode) or 'pk_live_' (production mode).\n");
    } else {
      console.log("✅ Stripe publishable key validated at build time");
    }
  } else {
    console.warn("\n⚠️ STRIPE KEY NOTE: VITE_STRIPE_PUBLISHABLE_KEY not found in .env - will use runtime injection\n");
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
