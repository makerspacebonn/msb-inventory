
import {defineConfig} from "drizzle-kit";
import * as process from "node:process";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/drizzle/schema.ts",

    out: "./src/drizzle/migrations",
    dbCredentials: {
        url: process.env.DATABASE_URL as string
    },
    migrations: {
        table: 'migrations',
        schema: 'makerspace_inventory'
    },
    verbose: true,
    strict: true
})