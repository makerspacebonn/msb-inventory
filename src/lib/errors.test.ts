import { describe, expect, it } from "vitest"
import { AppError, errorMessage, isAppError } from "./errors"

describe("AppError", () => {
  it("carries a code, a message for the user and an HTTP status", () => {
    const error = new AppError("FORBIDDEN", "Nur für Admins")

    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toBe("Nur für Admins")
    expect(error.statusCode).toBe(403)
  })

  it("has a status for every kind of failure", () => {
    expect(new AppError("UNAUTHORIZED", "").statusCode).toBe(401)
    expect(new AppError("NOT_FOUND", "").statusCode).toBe(404)
    expect(new AppError("INVALID_INPUT", "").statusCode).toBe(400)
    expect(new AppError("AI_RATE_LIMITED", "").statusCode).toBe(429)
  })

  it("turns into plain data and back", () => {
    const error = new AppError("NOT_FOUND", "Backup nicht gefunden")
    const copy = AppError.fromJSON(JSON.parse(JSON.stringify(error.toJSON())))

    expect(copy).toBeInstanceOf(AppError)
    expect(copy).toMatchObject({
      code: "NOT_FOUND",
      message: "Backup nicht gefunden",
      statusCode: 404,
    })
  })
})

describe("isAppError", () => {
  it("tells app errors apart, optionally by code", () => {
    const error = new AppError("UNAUTHORIZED", "Bitte anmelden")

    expect(isAppError(error)).toBe(true)
    expect(isAppError(error, "UNAUTHORIZED")).toBe(true)
    expect(isAppError(error, "FORBIDDEN")).toBe(false)
    expect(isAppError(new Error("x"))).toBe(false)
    expect(isAppError("x")).toBe(false)
  })
})

describe("errorMessage", () => {
  it("shows the message of an app error", () => {
    expect(
      errorMessage(new AppError("NOT_CONFIGURED", "MQTT fehlt"), "Fehler"),
    ).toBe("MQTT fehlt")
  })

  it("hides the message of any other error, as it may be technical", () => {
    expect(
      errorMessage(new Error('relation "items" does not exist'), "Fehler"),
    ).toBe("Fehler")
    expect(errorMessage("kaputt", "Fehler")).toBe("Fehler")
    expect(errorMessage(undefined, "Fehler")).toBe("Fehler")
  })
})
