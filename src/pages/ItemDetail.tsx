import { ItemSelect } from "../drizzle/schema";

export const ItemDetail = ({ item }: { item: ItemSelect }) => {
    const imagePath = `/img/items/${item.imagePath}`;
    return (
        <>
            <h1>{item.id}</h1>
            <p safe>{item.name}</p>
            <div>
                <div><img class="item-picture" src={imagePath} alt={item.name} /></div>
                <div safe>{item.description}</div>
                <div>ID: {item.id}</div>
            </div>
        </>
    );
};
