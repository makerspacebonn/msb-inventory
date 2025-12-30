import { MyCropper } from "@components/form/MyCropper"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { type Tag, TagInput } from "emblor"
import fs from "fs"
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
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
import { describeImageFn } from "@/src/actions/aiActions"
import { fetchAutocompleteTags } from "@/src/actions/tagActions"
import type { Item } from "@/src/app/types"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { ItemRepository } from "@/src/repositories/ItemRepository"

type AiData = {
  bezeichnung: string
  hersteller: string | null
  modell: string | null
  seriennummer: string | null
  kategorie: string
  zustand: "neu" | "gut" | "gebraucht" | "defekt"
  beschreibung_kurz: string
  schlagworte: string[]
  bedienungsanleitungen: string[]
  zusatzinfos: string
}

const { fieldContext, formContext } = createFormHookContexts()

export const Route = createFileRoute("/items/add")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  head: () => ({
    meta: [{ title: "Item hinzufügen | MSB Inventar" }],
  }),
})

const linkSchema = z.object({
  url: z.string(),
  name: z.string(),
  type: z.string(),
})

const itemSchema = z.object({
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
  .middleware([authGuardMiddleware])
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
  const [aiData, setAiData] = useState<AiData | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [currentImage, setCurrentImage] = useState<string>("")
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set(),
  )

  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const morestuffRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  // Fetch autocomplete suggestions on mount
  useEffect(() => {
    fetchAutocompleteTags({ data: undefined }).then((existingTags) => {
      setAutocompleteTags(
        existingTags.map((text, index) => ({
          id: `suggestion-${index}`,
          text,
        })),
      )
    })
  }, [])

  const handleAiAnalysis = async () => {
    if (!currentImage) return
    setAiLoading(true)
    setDismissedSuggestions(new Set())
    try {
      const result = await describeImageFn({ data: currentImage })
      if (Array.isArray(result)) {
        setAiData(result[0])
      } else {
        setAiData(result)
      }
      toast.success("KI-Analyse abgeschlossen")
    } catch (error) {
      console.error(error)
      toast.error("Fehler bei der KI-Analyse")
    } finally {
      setAiLoading(false)
    }
  }

  const dismissSuggestion = (key: string) => {
    setDismissedSuggestions((prev) => new Set([...prev, key]))
  }

  const form = useAppForm({
    defaultValues: {
      name: "",
      description: undefined,
      image: "",
      imagePath: undefined,
      tags: [],
      manufacturer: undefined,
      model: undefined,
      category: undefined,
      links: [],
      morestuff: undefined,
    } as z.infer<typeof itemSchema>,
    validators: {
      // Pass a schema or function to validate
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
                  setCurrentImage(image)
                  setAiData(null)
                }}
              />
              {!field.state.meta.isValid && (
                <FieldError errors={field.state.meta.errors} />
              )}
            </>
          )}
        </form.Field>

        {currentImage && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAiAnalysis}
            disabled={aiLoading}
            className="bg-emerald-950"
          >
            {aiLoading ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                Analysiere...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4 mr-2" />
                KI-Analyse starten
              </>
            )}
          </Button>
        )}

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
                {aiData?.bezeichnung && !dismissedSuggestions.has("name") && (
                  <InlineSuggestion
                    value={aiData.bezeichnung}
                    onUse={() => {
                      field.handleChange(aiData.bezeichnung)
                      dismissSuggestion("name")
                    }}
                    onDismiss={() => dismissSuggestion("name")}
                  />
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
                  ref={descriptionRef}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                    resizeTextarea(e.target)
                  }}
                  className="resize-none overflow-hidden"
                />
                {!field.state.meta.isValid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
                {aiData?.beschreibung_kurz &&
                  !dismissedSuggestions.has("description") && (
                    <InlineSuggestion
                      value={aiData.beschreibung_kurz}
                      onUse={() => {
                        field.handleChange(aiData.beschreibung_kurz)
                        dismissSuggestion("description")
                        setTimeout(() => resizeTextarea(descriptionRef.current), 0)
                      }}
                      onDismiss={() => dismissSuggestion("description")}
                    />
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
              {aiData?.schlagworte &&
                aiData.schlagworte.length > 0 &&
                !dismissedSuggestions.has("tags") && (
                  <InlineTagsSuggestion
                    tags={aiData.schlagworte}
                    onUse={() => {
                      const tagObjects = aiData.schlagworte.map(
                        (text, index) => ({
                          id: `ai-${index}`,
                          text,
                        }),
                      )
                      setTags(tagObjects)
                      field.setValue(aiData.schlagworte)
                      dismissSuggestion("tags")
                    }}
                    onDismiss={() => dismissSuggestion("tags")}
                  />
                )}
            </FieldContent>
          )}
        </form.Field>

        <form.Field name="manufacturer">
          {(field) => (
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Hersteller</FieldLabel>
              <Input
                name={field.name}
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {aiData?.hersteller &&
                !dismissedSuggestions.has("manufacturer") && (
                  <InlineSuggestion
                    value={aiData.hersteller}
                    onUse={() => {
                      field.handleChange(aiData.hersteller ?? "")
                      dismissSuggestion("manufacturer")
                    }}
                    onDismiss={() => dismissSuggestion("manufacturer")}
                  />
                )}
            </FieldContent>
          )}
        </form.Field>

        <form.Field name="model">
          {(field) => (
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Modell</FieldLabel>
              <Input
                name={field.name}
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {aiData?.modell && !dismissedSuggestions.has("model") && (
                <InlineSuggestion
                  value={aiData.modell}
                  onUse={() => {
                    field.handleChange(aiData.modell ?? "")
                    dismissSuggestion("model")
                  }}
                  onDismiss={() => dismissSuggestion("model")}
                />
              )}
            </FieldContent>
          )}
        </form.Field>

        <form.Field name="category">
          {(field) => (
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Kategorie</FieldLabel>
              <Input
                name={field.name}
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {aiData?.kategorie && !dismissedSuggestions.has("category") && (
                <InlineSuggestion
                  value={aiData.kategorie}
                  onUse={() => {
                    field.handleChange(aiData.kategorie)
                    dismissSuggestion("category")
                  }}
                  onDismiss={() => dismissSuggestion("category")}
                />
              )}
            </FieldContent>
          )}
        </form.Field>

        <form.Field name="links">
          {(field) => (
            <FieldContent>
              <FieldLabel>Links</FieldLabel>
              <div className="space-y-2">
                {(field.state.value ?? []).map((link, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Name"
                        value={link.name}
                        onChange={(e) => {
                          const newLinks = [...(field.state.value ?? [])]
                          newLinks[index] = { ...link, name: e.target.value }
                          field.handleChange(newLinks)
                        }}
                      />
                      <Input
                        placeholder="URL"
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...(field.state.value ?? [])]
                          newLinks[index] = { ...link, url: e.target.value }
                          field.handleChange(newLinks)
                        }}
                      />
                      <Input
                        placeholder="Typ"
                        value={link.type}
                        onChange={(e) => {
                          const newLinks = [...(field.state.value ?? [])]
                          newLinks[index] = { ...link, type: e.target.value }
                          field.handleChange(newLinks)
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newLinks = (field.state.value ?? []).filter(
                          (_, i) => i !== index,
                        )
                        field.handleChange(newLinks)
                      }}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    field.handleChange([
                      ...(field.state.value ?? []),
                      { name: "", url: "", type: "" },
                    ])
                  }}
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Link hinzufügen
                </Button>
              </div>
              {aiData?.bedienungsanleitungen &&
                aiData.bedienungsanleitungen.length > 0 &&
                !dismissedSuggestions.has("links") && (
                  <div className="mt-1.5 pl-3 border-l-2 border-emerald-500/40">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <SparklesIcon className="w-3 h-3 text-emerald-500" />
                      <span>KI-Vorschlag</span>
                    </div>
                    <div className="space-y-1 mb-2">
                      {aiData.bedienungsanleitungen.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline block"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1"
                        onClick={() => {
                          const newLinks = aiData.bedienungsanleitungen.map(
                            (url) => ({
                              name: "Bedienungsanleitung",
                              url,
                              type: "manual",
                            }),
                          )
                          field.handleChange([
                            ...(field.state.value ?? []),
                            ...newLinks,
                          ])
                          dismissSuggestion("links")
                        }}
                      >
                        <CheckIcon className="w-3 h-3" />
                        Übernehmen
                      </button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={() => dismissSuggestion("links")}
                      >
                        <XIcon className="w-3 h-3" />
                        Verwerfen
                      </button>
                    </div>
                  </div>
                )}
            </FieldContent>
          )}
        </form.Field>

        <form.Field name="morestuff">
          {(field) => (
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Weitere Infos</FieldLabel>
              <Textarea
                ref={morestuffRef}
                name={field.name}
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                  resizeTextarea(e.target)
                }}
                className="resize-none overflow-hidden"
              />
              {aiData?.zusatzinfos &&
                !dismissedSuggestions.has("morestuff") && (
                  <InlineSuggestion
                    value={aiData.zusatzinfos}
                    onUse={() => {
                      field.handleChange(aiData.zusatzinfos)
                      dismissSuggestion("morestuff")
                      setTimeout(() => resizeTextarea(morestuffRef.current), 0)
                    }}
                    onDismiss={() => dismissSuggestion("morestuff")}
                  />
                )}
            </FieldContent>
          )}
        </form.Field>

        {aiData && <AiResultsSection aiData={aiData} />}

        <Button>Erstellen</Button>
      </FieldGroup>
    </form>
  )
}

function InlineSuggestion({
  value,
  onUse,
  onDismiss,
}: {
  value: string
  onUse: () => void
  onDismiss: () => void
}) {
  return (
    <div className="mt-1.5 pl-3 border-l-2 border-emerald-500/40">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <SparklesIcon className="w-3 h-3 text-emerald-500" />
        <span>KI-Vorschlag</span>
      </div>
      <p className="text-sm text-foreground/80 mb-2">{value}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="text-xs text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1"
          onClick={onUse}
        >
          <CheckIcon className="w-3 h-3" />
          Übernehmen
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={onDismiss}
        >
          <XIcon className="w-3 h-3" />
          Verwerfen
        </button>
      </div>
    </div>
  )
}

function InlineTagsSuggestion({
  tags,
  onUse,
  onDismiss,
}: {
  tags: string[]
  onUse: () => void
  onDismiss: () => void
}) {
  return (
    <div className="mt-1.5 pl-3 border-l-2 border-emerald-500/40">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <SparklesIcon className="w-3 h-3 text-emerald-500" />
        <span>KI-Vorschlag</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="text-xs text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1"
          onClick={onUse}
        >
          <CheckIcon className="w-3 h-3" />
          Übernehmen
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={onDismiss}
        >
          <XIcon className="w-3 h-3" />
          Verwerfen
        </button>
      </div>
    </div>
  )
}

function AiResultsSection({ aiData }: { aiData: AiData }) {
  const hasAdditionalInfo =
    aiData.hersteller ||
    aiData.modell ||
    aiData.seriennummer ||
    aiData.kategorie ||
    aiData.zustand ||
    aiData.zusatzinfos ||
    (aiData.bedienungsanleitungen && aiData.bedienungsanleitungen.length > 0)

  if (!hasAdditionalInfo) return null

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
      <h3 className="font-semibold flex items-center gap-2">
        <SparklesIcon className="w-4 h-4" />
        Weitere KI-Informationen
      </h3>

      {aiData.hersteller && (
        <AiInfoRow label="Hersteller" value={aiData.hersteller} />
      )}
      {aiData.modell && <AiInfoRow label="Modell" value={aiData.modell} />}
      {aiData.seriennummer && (
        <AiInfoRow label="Seriennummer" value={aiData.seriennummer} />
      )}
      {aiData.kategorie && (
        <AiInfoRow label="Kategorie" value={aiData.kategorie} />
      )}
      {aiData.zustand && <AiInfoRow label="Zustand" value={aiData.zustand} />}
      {aiData.zusatzinfos && (
        <AiInfoRow label="Zusatzinfos" value={aiData.zusatzinfos} />
      )}
      {aiData.bedienungsanleitungen &&
        aiData.bedienungsanleitungen.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">
              Bedienungsanleitungen
            </span>
            <div className="space-y-1">
              {aiData.bedienungsanleitungen.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline block"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}

function AiInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  )
}
