import { createServerFn } from "@tanstack/react-start"
import { CategoryRepository } from "@/src/repositories/CategoryRepository"

export const fetchCategories = createServerFn().handler(async () => {
  return new CategoryRepository().findAllNames()
})
