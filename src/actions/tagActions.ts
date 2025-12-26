import { createServerFn } from "@tanstack/react-start"
import { TagsRepository } from "@/src/repositories/TagsRepository"

export const fetchAutocompleteTags = createServerFn()
  .inputValidator((search?: string) => search)
  .handler(async ({ data: search }) => {
    return new TagsRepository().findUniqueTags(search)
  })