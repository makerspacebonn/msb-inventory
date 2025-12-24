import { db } from "@/src/db"
import type { Location } from "../app/types"

export class LocationRepository {
  async findRootLocations(): Promise<Location[]> {
    const locations = await db.query.LocationTable.findMany({
      where: (locations, { isNull }) => isNull(locations.parentId),
    })
    return locations
  }

  async findByParentId(parentId: number): Promise<Location[]> {
    const locations = await db.query.LocationTable.findMany({
      where: (locations, { eq }) => eq(locations.parentId, parentId),
    })
    return locations
  }

  async findById(id: number): Promise<Location[] | undefined> {
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
      parentId: undefined,
    }
    return [location1, location2, location3, location4]
  }

  async findChainForId(locationId: number) {
    const locations: Location[] = []
    const locationsResult = await db.query.LocationTable.findMany({
      where: (locations, { eq }) => eq(locations.id, locationId),
    })
    if (locationsResult.length > 0) {
      locations.push(locationsResult[0])
      if (locationsResult[0].parentId) {
        locations.push(
          ...(await this.findChainForId(locationsResult[0].parentId)),
        )
      }
    }
    return locations
  }
}
