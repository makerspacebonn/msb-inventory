import { MyCropper } from "@components/form/MyCropper"
import { Button } from "@components/ui/button"
import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { type Tag, TagInput } from "emblor"
import fs from "fs"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { v7 as uuidv7 } from "uuid"
import z from "zod/v4"
import {
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fetchAutocompleteTags } from "@/src/actions/tagActions"
import type { Item } from "@/src/app/types"
import { ItemRepository } from "@/src/repositories/ItemRepository"

const { fieldContext, formContext } = createFormHookContexts()

export const Route = createFileRoute("/items/add")({
  component: RouteComponent,
})

const itemSchema = z.object({
  name: z.string().min(1, "Muss mindestens einen Buchstaben haben!"),
  description: z.string().optional(),
  image: z.string().optional(),
  imagePath: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

function decodeBase64Image(dataString: string) {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  const response: {
    fileType: string | undefined
    fileBuffer: Buffer | undefined
  } = {
    fileType: undefined,
    fileBuffer: undefined,
  }

  if (matches?.length !== 3) {
    throw new Error("Invalid input string")
  }

  response.fileType = matches[1]
  response.fileBuffer = Buffer.from(matches[2], "base64")

  return response
}

const addItem = createServerFn({ method: "POST" })
  .inputValidator(itemSchema)
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; item?: Item; error?: string }> => {
      console.log("trying to save")
      if (data?.image) {
        try {
          const savePath = process.env.SAVE_PATH + "items/"
          const { fileType, fileBuffer } = decodeBase64Image(data.image)
          const fileName = uuidv7()
          const fileExtension = fileType?.split("/")[1]
          const filePath = `${savePath}${fileName}.${fileExtension}`
          const fileStream = fs.createWriteStream(filePath)
          fileStream.write(fileBuffer)
          fileStream.end()
          data.imagePath = `${fileName}.${fileExtension}`
        } catch (e) {
          console.error(e)
        }
      }
      const newItem = await new ItemRepository().upsert(data)
      console.log("new Item", newItem)
      return {
        success: true,
        item: newItem ? newItem[0] : undefined,
      }
    },
  )

function RouteComponent() {
  return (
    <div className="container mx-auto px-4 my-6">
      <ItemForm />
    </div>
  )
}

const { useAppForm } = createFormHook({
  fieldComponents: {},
  formComponents: {},
  fieldContext,
  formContext,
})

function ItemForm() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<Tag[]>([])
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null)
  const [autocompleteTags, setAutocompleteTags] = useState<Tag[]>([])

  // Fetch autocomplete suggestions on mount
  useEffect(() => {
    fetchAutocompleteTags({ data: undefined }).then((existingTags) => {
      setAutocompleteTags(
        existingTags.map((text, index) => ({ id: `suggestion-${index}`, text })),
      )
    })
  }, [])

  const form = useAppForm({
    defaultValues: {
      name: "",
      description: undefined,
      image: "",
      imagePath: undefined,
      tags: [],
    } as z.infer<typeof itemSchema>,
    validators: {
      // Pass a schema or function to validate
      onChange: itemSchema,
      onSubmit: itemSchema,
    },
    onSubmit: async ({ value }) => {
      // Do something with form data
      const parsedInput = itemSchema.parse(value)

      const result = await addItem({ data: parsedInput })
      if (result?.success) {
        if (result.item) {
          await navigate({
            to: "/i/$itemId",
            params: {
              itemId: result.item?.id.toString(),
            },
          })
        } else {
          console.log("new Item", result.item)
          form.reset()
          toast.success("Item erstellt")
        }
      } else if (result?.error) {
        toast.error(`Fehler beim erstellen des Items ${result.error}`)
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <>
              <FieldContent>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {!field.state.meta.isValid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </FieldContent>
            </>
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <>
              <FieldContent>
                <FieldLabel htmlFor={field.name}>Beschreibung</FieldLabel>
                <Textarea
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {!field.state.meta.isValid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </FieldContent>
            </>
          )}
        </form.Field>

        <form.Field name="tags">
          {(field) => (
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Tags</FieldLabel>
              <TagInput
                placeholder="Tag eingeben..."
                tags={tags}
                setTags={(newTags) => {
                  const resolvedTags =
                    typeof newTags === "function" ? newTags(tags) : newTags
                  setTags(resolvedTags)
                  field.setValue(resolvedTags.map((t: Tag) => t.text))
                }}
                activeTagIndex={activeTagIndex}
                setActiveTagIndex={setActiveTagIndex}
                enableAutocomplete
                autocompleteOptions={autocompleteTags}
                allowDuplicates={false}
                restrictTagsToAutocompleteOptions={false}
                styleClasses={{
                  input: "w-full",
                  inlineTagsContainer:
                    "rounded-md border border-input bg-background px-3 py-2",
                  tag: {
                    body: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  },
                }}
              />
              {!field.state.meta.isValid && (
                <FieldError errors={field.state.meta.errors} />
              )}
            </FieldContent>
          )}
        </form.Field>

        <form.Field name="image">
          {(field) => (
            <>
              <Input
                name={field.name}
                type="hidden"
                value={field.state.value}
              />
              <MyCropper
                onChange={(image) => {
                  console.log("image change", image)
                  field.setValue(image)
                }}
              />
              {!field.state.meta.isValid && (
                <FieldError errors={field.state.meta.errors} />
              )}
            </>
          )}
        </form.Field>

        <Button>Erstellen</Button>
      </FieldGroup>
    </form>
  )
}
