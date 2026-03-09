import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  env: {
    // Provide a build-time fallback so ClerkProvider initialises during
    // static pre-rendering without crashing when the real key is absent.
    // The placeholder is replaced by the real key at runtime via the env var.
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
  },
};

export default nextConfig;
