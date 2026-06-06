import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const projectRoot = path.resolve(rootDir, "..");

dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.join(projectRoot, ".env") });
