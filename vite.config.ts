import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file to access VITE_ variables at config time
  const env = loadEnv(mode, process.cwd(), '');
  
  // STRIPE GUARDRAIL: Fail build if publishable key is missing
  const stripeKey = env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey || stripeKey === "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE") {
    console.error("\n❌ STRIPE CONFIGURATION ERROR ❌");
    console.error("VITE_STRIPE_PUBLISHABLE_KEY is missing or contains placeholder value.");
    console.error("Build cannot proceed without a valid Stripe publishable key.");
    console.error("Please set VITE_STRIPE_PUBLISHABLE_KEY in your environment variables.\n");
    process.exit(1);
  }

  // Validate key format
  if (!stripeKey.startsWith("pk_test_") && !stripeKey.startsWith("pk_live_")) {
    console.error("\n❌ STRIPE CONFIGURATION ERROR ❌");
    console.error("VITE_STRIPE_PUBLISHABLE_KEY does not appear to be a valid Stripe key.");
    console.error("Key must start with 'pk_test_' (test mode) or 'pk_live_' (production mode).\n");
    process.exit(1);
  }

  console.log("✅ Stripe publishable key validated at build time");

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
