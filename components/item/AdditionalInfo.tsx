import { ExternalLinkIcon } from "lucide-react"
import type { Item } from "@/src/app/types"

export function AdditionalInfo({ item }: { item: Item }) {
  const hasAdditionalInfos = (item: Item) => {
    return (
      item.manufacturer ||
      item.model ||
      item.category ||
      item.morestuff ||
      (item.links && item.links.length > 0)
    )
  }

  return (
    hasAdditionalInfos(item) && (
      <div className="mb-4 space-y-2 border rounded-lg p-4 bg-muted/30">
        {item.manufacturer && (
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground font-medium">
              Hersteller:
            </span>
            <span>{item.manufacturer}</span>
          </div>
        )}
        {item.model && (
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Modell:</span>
            <span>{item.model}</span>
          </div>
        )}
        {item.category && (
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground font-medium">
              Kategorie:
            </span>
            <span>{item.category}</span>
          </div>
        )}
        {item.links && item.links.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground font-medium">
              Links:
            </span>
            <div className="flex flex-wrap gap-2">
              <ul>
                {item.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                    >
                      <ExternalLinkIcon className="w-3 h-3" />
                      {link.name || link.type || link.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {item.morestuff && (
          <div className="text-sm">
            <span className="text-muted-foreground font-medium block mb-1">
              Weitere Infos:
            </span>
            <p className="whitespace-pre-wrap">{item.morestuff}</p>
          </div>
        )}
      </div>
    )
  )
}
