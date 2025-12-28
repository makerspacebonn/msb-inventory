import { createStart } from "@tanstack/react-start"
import { authMiddleware } from "./middleware/authMiddleware"

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [authMiddleware],
  }
})
