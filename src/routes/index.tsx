import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "MakerSpace Bonn e.V." }],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="text-center content-center">
      <h1 className="text-4xl font-extrabold mb-4">
        Zeug beim MakerSpace Bonn e.v.
      </h1>
      <div className="mb-4">
        <p>Willkommen bei unserem MakerSpace Zeug und Aufgaben System.</p>
        <p>Hier können Sie Ihre Projekte verwalten und Ihre Aufgaben planen.</p>
      </div>
      <ButtonGroup className="mx-auto">
        <Button variant="outline">
          <Link to="/items">Items</Link>
        </Button>
      </ButtonGroup>
    </div>
  )
}
