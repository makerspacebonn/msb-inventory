import { Item } from "../app/types";

export const ItemEdit = ({ item }: { item: Partial<Item> }) => {
    const imagePath = `/img/items/${item.imagePath}`;
    return (
        <>
            <div class="container">
                <h1>Neues Teil hinzufügen</h1>

                <form action="/items" method="POST" enctype="multipart/form-data" class="item-form">
                    <div class="form-group">
                        <label for="name">Name:</label>
                        <input type="text" id="name" name="name" required value={item.name} />
                    </div>

                    <div class="form-group">
                        <label for="description">Beschreibung:</label>
                        <textarea id="description" name="description" required>{item.description}</textarea>
                    </div>



                    <div class="coordinates-container">
                        <p>Klicken Sie auf das Bild, um die Position des Teils zu markieren:</p>
                        <div class="image-preview-container">
                            <div id="image-preview" class="image-preview"><img src={imagePath}/></div>
                        </div>
                        <div class="form-group">
                            <label for="photo">Foto:</label>
                            <input type="file" id="photo" name="photo" accept="image/*"/>
                        </div>

                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Speichern</button>
                        <a href="/items" class="btn btn-secondary">Abbrechen</a>
                    </div>
                </form>


            </div>
        </>
    );
};
