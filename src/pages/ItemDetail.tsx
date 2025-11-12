import { ItemSelect } from "../drizzle/schema";

export const ItemDetail = ({ item }: { item: ItemSelect }) => {
    return (
        <>
            <h1>{item.id}</h1>
            <p safe>{item.name}</p>
            <div>
                <div><img class="item-picture" src="https://upload.wikimedia.org/wikipedia/commons/2/21/Pink_Fairy_Armadillo_%28Chlamyphorus_truncatus%29.jpg" alt="Pink Fairy Armadillo" /></div>
                <div safe>{item.description}</div>
                <div>ID: {item.id}</div>
            </div>
        </>
    );
};
