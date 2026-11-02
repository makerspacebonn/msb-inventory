import z from "zod/v4"

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
  image: z.string().optional(),
  imagePath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  links: z.array(linkSchema).optional(),
  morestuff: z.string().optional(),
})

export type ItemFormData = z.infer<typeof itemSchema>
