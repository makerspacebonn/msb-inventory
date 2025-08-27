import { Elysia } from 'elysia'

export const inventorySearchRoutes = new Elysia()
    .get('/search', 'Inventory Search')
    .get('/items/add', () => Bun.file('src/pages/itemAdd.html'))
    .get('/', 'res')