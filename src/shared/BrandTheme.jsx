import { useMemo } from "react";
import {
  TesseractThemeProvider,
  createTheme,
} from "@dhspl-tatvacare/tesseract-ui";
import { whiteTextContrast } from "./brand";
import { ctaPresentation } from "./brandCta";
import { accessibleBrandRamp } from "./brandContrast";
// The hospital brand (see brand.js) as the Tesseract theme for either app.
export default function BrandTheme({ brand, children }) {
  const cta = useMemo(
    () => ctaPresentation(brand.ctaGradient, brand.primary),
    [brand.ctaGradient, brand.primary],
  );
  const theme = useMemo(
    () =>
      createTheme({
        brand: accessibleBrandRamp(brand.primary),
        accent: accessibleBrandRamp(brand.accent, "#a461d8"),
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
        "--brand-cta-background": cta.background,
        "--brand-cta-foreground": cta.textColor,
        "--brand-cta-label-background": cta.labelBackground,
        "--brand-on-primary": cta.textColor,
        "--brand-on-banner": "#fff",
        "--brand-banner-background":
          "linear-gradient(115deg, color-mix(in srgb, var(--tesseract-blue-500) 66%, #211330), color-mix(in srgb, var(--tesseract-blue-500) 28%, #18132b) 55%, color-mix(in srgb, var(--tesseract-blue-500) 10%, #10101e))",
        ...(whiteTextContrast(brand.textHeading) >= 4.5
          ? { "--tesseract-fg-heading": brand.textHeading }
          : {}),
        ...(whiteTextContrast(brand.textBody) >= 4.5
          ? { "--tesseract-fg-primary": brand.textBody }
          : {}),
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
