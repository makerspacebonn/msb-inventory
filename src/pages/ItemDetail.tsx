import type { Location } from "../app/types"
import { type ItemSelect, LocationSelect } from "../drizzle/schema"
import { LocationComponent } from "./components/LocationComponent"

export const ItemDetail = ({ item }: { item: ItemSelect }) => {
  const imagePath = `/img/items/${item.imagePath}`
  const location1: Location = {
    id: 1,
    name: "Falks Tasche",
    description: "This is an example location.",
    imagePath: "1.jpg",
    parentId: 2,
    additionalInfo: [{ x: 25, y: 59, id: 1 }],
  }
  const location2: Location = {
    id: 2,
    name: "Tisch am Monitor",
    description: "This is an example location.",
    imagePath: "2.jpg",
    parentId: 3,
  }
  const location3: Location = {
    id: 3,
    name: "Hauptraum",
    description: "This is an example location.",
    imagePath: "3.jpg",
    parentId: 4,
  }
  const location4: Location = {
    id: 4,
    name: "MakerSpace",
    description: "This is an example location.",
    imagePath: "4.jpg",
    parentId: 4,
  }
  const locations = [location1, location2, location3, location4]
  return (
    <>
      <h1 safe>{item.name}</h1>
      <div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img class="item-picture" src={imagePath} alt={item.name} />
        </div>
        <div safe>{item.description}</div>
        <div style="font-weight: bold">ID: {item.id}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            width: "100%",
            justifyContent: "space-around",
          }}
        >
          {locations.map((location) => (
            <LocationComponent key={location.id} location={location} />
          ))}
        </div>
      </div>
    </>
  )
}
