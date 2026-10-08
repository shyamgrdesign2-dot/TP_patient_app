import { useMemo } from "react";
import {
  TesseractThemeProvider,
  createTheme,
} from "@dhspl-tatvacare/tesseract-ui";
// The hospital brand (see brand.js) as the Tesseract theme for either app.
export default function BrandTheme({ brand, children }) {
  const theme = useMemo(
    () =>
      createTheme({
        brand: brand.primary,
        accent: brand.accent,
        fontBody: brand.fontBody,
        fontHeading: brand.fontHeading,
        radius: 12,
      }),
    [brand],
  );
  return (
    <TesseractThemeProvider
      theme={theme}
      vars={{
        "--tesseract-font-body": brand.fontBody,
        "--tesseract-font-heading": brand.fontHeading,
        "--font-sans": brand.fontBody,
        "--font-heading": brand.fontHeading,
      }}
      colorScheme="light"
      rootTheme
    >
      {children}
    </TesseractThemeProvider>
  );
}
