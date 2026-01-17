/**
 * E2E Test API - Create Session
 *
 * This endpoint creates a user and session directly in the database,
 * bypassing the normal authentication flow. This is used by e2e tests
 * to quickly authenticate without going through the login UI.
 *
 * SECURITY: This endpoint only works when NODE_ENV=test
 */
import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/src/db"
import { SessionTable, UserTable } from "@/src/drizzle/schema"

export const Route = createFileRoute("/api/e2e/create-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only allow in test environment
        if (process.env.NODE_ENV !== "test") {
          return new Response("Not available in production", { status: 403 })
        }

        try {
          const body = await request.json()
          const { userId, sessionId, sessionToken, email, name, expiresAt } =
            body

          if (!userId || !sessionId || !sessionToken || !email || !expiresAt) {
            return new Response("Missing required fields", { status: 400 })
          }

          // Create user
          await db.insert(UserTable).values({
            id: userId,
            name: name || "E2E Test User",
            email,
            emailVerified: true,
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          // Create session
          await db.insert(SessionTable).values({
            id: sessionId,
            userId,
            token: sessionToken,
            expiresAt: new Date(expiresAt),
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          return new Response(
            JSON.stringify({ success: true, userId, email }),
            {
              status: 201,
              headers: { "Content-Type": "application/json" },
            },
          )
        } catch (error) {
          console.error("E2E create-session error:", error)
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          )
        }
      },
    },
  },
})
