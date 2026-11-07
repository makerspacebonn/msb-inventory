import z from "zod/v4"
import { MAX_ITEM_PICTURES } from "./itemPictures"

// Shared by the item form (client validation) and saveItem (server validation)

const linkSchema = z.object({
  url: z.string(),
  name: z.string(),
  type: z.string(),
})

export const itemSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Muss mindestens einen Buchstaben haben!"),
  description: z.string().optional(),
  // All pictures in order, the main one first; left out, they stay as they are
  pictures: z
    .array(
      z.union([
        z.object({ path: z.string() }),
        z.object({ upload: z.string() }),
      ]),
    )
    .max(MAX_ITEM_PICTURES, `Höchstens ${MAX_ITEM_PICTURES} Bilder`)
    .optional(),
  // Where a new item goes, saved with it, so it's one change in the changelog
  locationId: z.number().int().positive().optional(),
  parentLocationMarker: z
    .object({
      id: z.number(),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
    .nullable()
    .optional(),
  tags: z.array(z.string()).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  links: z.array(linkSchema).optional(),
  morestuff: z.string().optional(),
})

export type ItemFormData = z.infer<typeof itemSchema>
