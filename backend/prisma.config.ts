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
    url: process.env["DATABASE_URL"],
  },
});
