import { writeFile } from "node:fs/promises";
import { defaultBrand, validBrand } from "../src/config/brand.js";
// Build-time identity must be chosen before native projects are generated.
if (!validBrand(defaultBrand))
  throw new Error("Invalid tenant brand configuration.");
if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(defaultBrand.appId))
  throw new Error("Use a valid reverse-domain app ID.");
await writeFile(
  new URL("../capacitor.config.json", import.meta.url),
  JSON.stringify(
    { appId: defaultBrand.appId, appName: defaultBrand.name, webDir: "dist" },
    null,
    2,
  ) + "\n",
);
console.log(`Native configuration written for ${defaultBrand.name}.`);
