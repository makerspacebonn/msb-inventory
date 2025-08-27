import { Elysia } from 'elysia'

export const projectRoutes = new Elysia()
    .get('/', Bun.file('src/pages/projects/index.html'))