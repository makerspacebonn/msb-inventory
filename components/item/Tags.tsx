import { badgeVariants } from "@components/ui/badge"
import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { tagSearchTerm } from "@/src/lib/searchQuery"

export function Tags(props: { tags: string[] }) {
  return (
    <>
      {props.tags && props.tags.length > 0 && (
        <>
          <h3 className="my-5 font-bold text-green-900">Schlagworte</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {props.tags.map((tag) => (
              <Link
                key={tag}
                to="/items"
                search={{ q: tagSearchTerm(tag) }}
                title="Alle Items mit diesem Schlagwort anzeigen"
                className={cn(
                  badgeVariants({ variant: "outline" }),
                  "text-gray-600 hover:border-brand hover:bg-brand hover:text-white",
                )}
              >
                {tag}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
