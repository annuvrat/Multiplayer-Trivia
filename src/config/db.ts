import postgres from "postgres"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Postgres connection")
}

/**
 * Raw SQL client using Postgres over DATABASE_URL.
 * Use this for direct queries instead of Prisma.
 */
export const db = postgres(databaseUrl, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 15,
})

export async function checkDbConnection() {
  await db`select 1`
}
