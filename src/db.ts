import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "./drizzle/schema";
console.log("connecting to :", process.env.DATABASE_URL)
export const db = drizzle(process.env.DATABASE_URL as string, {schema, logger: true});

