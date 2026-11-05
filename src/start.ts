import { createSerializationAdapter } from "@tanstack/react-router"
import { createStart } from "@tanstack/react-start"
import { AppError, type AppErrorData } from "./lib/errors"
import { authMiddleware } from "./middleware/authMiddleware"

// By default, a thrown error reaches the client as a plain Error with only
// its message. This keeps AppError's class and code, so the client can
// react to the kind of failure
const appErrorAdapter = createSerializationAdapter({
  key: "app-error",
  test: (value): value is AppError => value instanceof AppError,
  toSerializable: (error): AppErrorData => error.toJSON(),
  fromSerializable: (data: AppErrorData) => AppError.fromJSON(data),
})

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [authMiddleware],
    serializationAdapters: [appErrorAdapter],
  }
})
