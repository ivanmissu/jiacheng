import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1Database(d1: unknown) {
  return drizzle(d1 as Parameters<typeof drizzle>[0], { schema });
}
