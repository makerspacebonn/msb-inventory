import { ItemList } from "@components/ItemList"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import {createFileRoute, getRouteApi, Link} from "@tanstack/react-router"
import { createServerFn, json } from "@tanstack/react-start"
import {Button} from "@components/ui/button";

const itemLoader = createServerFn().handler(async () => {
  return await new ItemRepository().findLatest()
})

export const Route = createFileRoute("/items/")({
  component: RouteComponent,
  loader: () => itemLoader(),
})

function RouteComponent() {
  const items = Route.useLoaderData()
  return (
    <>
      <h1>Items</h1>
        <Button variant="outline"><Link to="/items/add">Add Item</Link></Button>
      <ItemList items={items} />
    </>
  )
}
