import { MyCropper } from "@components/form/MyCropper"
import { Button } from "@components/ui/button"
import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import fs from "fs"
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
          const savePath = process.env.SAVE_PATH + "img/items/"
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
  const form = useAppForm({
    defaultValues: {
      name: "",
      description: undefined,
      image: "",
      imagePath: undefined,
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
        console.log("new Item", result.item)
        form.reset()
        toast.success("Item erstellt")
      } else {
        toast.error("Fehler beim erstellen des Items", result?.error)
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
        <form.Field
          name="name"
          children={(field) => (
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
        />
        <form.Field
          name="description"
          children={(field) => (
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
        />

        <form.Field
          name="image"
          children={(field) => (
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
        />

        <Button>Erstellen</Button>
      </FieldGroup>
    </form>
  )
}
