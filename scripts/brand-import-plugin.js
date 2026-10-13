import { brandImportHandler } from "./brand-import-service.js";
export function brandWebsiteImport() {
  const install = (server) => {
    server.middlewares.use("/api/brand-import", brandImportHandler);
  };
  return {
    name: "brand-website-import",
    configureServer: install,
    configurePreviewServer: install,
  };
}
