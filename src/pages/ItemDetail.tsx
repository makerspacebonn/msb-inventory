import { ItemSelect, LocationSelect } from "../drizzle/schema";
import { Location } from "./components/Location";

export const ItemDetail = ({ item }: { item: ItemSelect }) => {
    const imagePath = `/img/items/${item.imagePath}`;
    const location1: LocationSelect = { id: 1, name: "Falks Tasche", description: "This is an example location.", imagePath: "1.jpg", parentId: 2 , additionalInfo: "Additional information about Falks Tasche."};
    const location2: LocationSelect = { id: 2, name: "Tisch am Monitor", description: "This is an example location.", imagePath: "2.jpg", parentId: 3, additionalInfo: "Additional information about Tisch am Monitor." };
    const location3: LocationSelect = { id: 3, name: "Hauptraum", description: "This is an example location.", imagePath: "3.jpg", parentId: 4, additionalInfo: "Additional information about Hauptraum." };
    const location4: LocationSelect = { id: 4, name: "MakerSpace", description: "This is an example location.", imagePath: "4.jpg", parentId: 4, additionalInfo: "Additional information about MakerSpace." };
    const locationPath = [location1, location2, location3, location4];
    return (
        <>
            <h1 safe>{item.name}</h1>
            <div>
                <div  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img class="item-picture" src={imagePath} alt={item.name} /></div>
                <div safe>{item.description}</div>
                <div>ID: {item.id}</div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent:'space-around'}}>
                <Location location={location1} />
                <Location location={location2} />
                <Location location={location3} />
                <Location location={location4} />
                </div>
            </div>
        </>
    );
};
