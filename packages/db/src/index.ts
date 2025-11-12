

// packages/db/src/index.ts

// packages/db/src/index.ts
// packages/db/src/index.ts
import { PrismaClient } from "@prisma/client";
//import { config } from "dotenv";
//import { resolve, dirname } from "path";
//import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
//const __filename = fileURLToPath(import.meta.url);
//const __dirname = dirname(__filename);

// Load .env file from the db package root
//config({ path: resolve(__dirname, "../.env") });

export const prismaClient = new PrismaClient();