import { Badge } from "@components/ui/badge"

export function Tags(props: { tags: string[] }) {
  return (
    <>
      {props.tags && props.tags.length > 0 && (
        <>
          <h3 className="my-5 font-bold text-green-900">Schlagworte</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {props.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-gray-600">
                {tag}
              </Badge>
            ))}
          </div>
        </>
      )}
    </>
  )
}
