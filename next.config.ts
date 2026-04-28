import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
// node_modules lives at travel-planner/ (3 levels above the worktree),
// so Turbopack's root must cover that directory to resolve Next.js itself.
const monorepoRoot = path.resolve(appRoot, "../../..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
