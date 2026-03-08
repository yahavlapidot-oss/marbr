import { defineConfig } from "prisma/config";

// Load .env only in development (dotenv is a dev dependency)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback keeps `prisma generate` (build phase) happy when DATABASE_URL
    // isn't injected yet. `prisma migrate deploy` (runtime) always has the real URL.
    url: process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/placeholder",
  },
});
