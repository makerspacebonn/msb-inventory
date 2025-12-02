import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export const Route = createFileRoute("/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">
        Zeug beim MakerSpace Bonn e.v.
      </h1>
      <p>Willkommen bei unserem MakerSpace Zeug und Aufgaben System.</p>
      <p>Hier können Sie Ihre Projekte verwalten und Ihre Aufgaben planen.</p>
      <ButtonGroup>
        <Button variant="outline">
          <Link to="/test">Test</Link>
        </Button>
        <Button variant="outline">
          <Link to="/test">Test</Link>
        </Button>
        <Button variant="outline" >
          <Link to="/items">Items</Link>
        </Button>
          </ButtonGroup>
    </>
  )
}
