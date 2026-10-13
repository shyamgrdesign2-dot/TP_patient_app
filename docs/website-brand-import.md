# Website branding import

`BrandWebsiteImport` reads public website evidence and presents suggested fields for review. Detected, selected colours preview immediately in the configuration draft; unchecking a colour restores its value from before this analysis. Apply adds the other checked fields to the draft. Save commits the configuration. Missing/unchecked fields remain unchanged; missing logo cards offer the existing upload flow.

## Runtime and optional model configuration

- `POST /api/brand-import`, JSON `{ "url": "https://hospital.example" }`.
- Vite development and preview register `scripts/brand-import-plugin.js`.
- Vercel uses `api/brand-import.js`; its API rewrite precedes the SPA rewrite and the function duration is 45 seconds.
- Static-only hosting requires this Node endpoint behind same-origin routing. The UI reports an unavailable endpoint rather than pretending to analyze.
- Public HTML/CSS detection works without a model or API key. It does not execute website JavaScript.

For optional model-assisted evidence selection, configure **all three server environment variables**: `BRAND_IMPORT_AI_ENABLED=true`, `OPENAI_API_KEY`, and `BRAND_IMPORT_MODEL` (a model that supports Responses structured outputs). Never prefix credentials with `VITE_` or place them in client configuration. Having a key alone does not enable paid requests. Each import makes at most one model request, with an 18-second deadline, 1,800 output-token cap, at most 160 evidence choices and an 80,000-byte evidence-input cap. Model requests use `store: false`.

The model selects IDs from validated evidence options; it cannot supply invented colours, CSS, images or URLs. Field permissions and IDs are checked again locally. Image options are described as validated assets; their data URLs are not sent. Timeout, refusal, invalid response or unavailable configuration falls back to deterministic suggestions with an honest status label. This uses the [Responses structured-output interface](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

**Before enabling model requests on a public production deployment**, protect this endpoint with real authenticated administrator access and enforce distributed per-admin quotas/rate limits. The prototype console sign-in and per-instance limiter are not production identity or cost controls. Model requests have only been tested with mocked responses; no live model call or paid inference is claimed.

## Evidence and constraints

The review UI is limited to hospital name, app icon, horizontal logo, primary colour (solid or gradient), secondary colour, heading colour and heading/body fonts. A detected gradient occupies the single Primary colour card; applying it also derives a solid anchor from its first colour. Parser evidence can additionally include shadows, body text colour and radii, but these are not displayed or applied by this streamlined import. CTA gradients require button/CTA selector evidence and a restricted opaque linear-gradient format; decorative gradients and pill radii are excluded. Unsupported fonts remain manual configuration. Uncertain/missing fields retain visible disabled cards.

Horizontal logos are ranked using header/footer/navigation placement, home links, logo naming and aspect ratio. Both external and inline SVG candidates retain vector format, rendered only as `img` data URLs. Active content, external resources, event handlers and entity declarations are rejected. Harmless SVG export comments are normalized; white-only SVG alternatives are skipped. Each client image is rendered onto a white canvas and checked for visible pixels before it is selectable; broken or blank images become disabled Missing cards with enabled upload recovery. PNG, JPEG, WebP and ICO signatures are checked. App icons consider web manifests, apple-touch icons, favicon metadata and `/favicon.ico` fallback; larger declared icon sizes are preferred.

Public IPv4 DNS answers are validated and pinned for every request. Redirects are revalidated; credentials, custom ports and private/reserved addresses are refused. IPv6-only targets are currently unsupported. No website cookies or authorization are forwarded. Fetches share a 25-second extraction deadline and have 7-second socket timeouts, at most 3 redirects, a 1 MiB HTML cap, up to four 1 MiB stylesheets, 64 KiB manifest and 512 KiB image limits. At most four horizontal logos and three icon candidates are attempted. Browser-origin checks, an eight-requests-per-minute per-instance limiter and no-store responses are enabled.

CSS evidence is heuristic rather than computed browser style. Blocked readers, JavaScript-only branding, CSS variables, responsive overrides and uncommon asset formats can produce partial or incorrect suggestions. Review remains necessary. No 90% or 100% accuracy claim has been measured.

## Next-stage rendered/vision fallback

For websites whose public HTML/CSS is insufficient, implement an isolated browser worker behind an egress proxy that validates public DNS, redirects and every subresource. Start with no cookies or saved credentials, forbid downloads and internal networks, and apply byte/time/concurrency limits. Collect a screenshot and computed styles only for visible header/footer logos, primary CTA buttons, headings and body text. Feed those bounded evidence candidates to an optional vision model for structured selection, then apply the same asset/CSS validation and review interface. This browser/vision fallback is an architecture proposal, not an implemented feature.

Evaluate against a manually labelled set of 20–30 varied sites before setting an accuracy target: separate app-icon and horizontal-logo correctness, measure per-field precision and recall, and distinguish a missing result from a wrong one. Report blocked sites separately and include JavaScript-heavy, inline-SVG, CSS-variable, light/dark and multi-brand examples. Accuracy claims should be based on this benchmark, not anecdotal successes.

## Validation

`node --test tests/brand-import.test.js tests/brand-import-ai.test.js` covers SSRF restrictions, method/origin checks, evidence extraction, SVG safety, logo placement/ratio, gradients, foundational styles and mocked model boundaries/fallbacks. Browser tests cover review-before-apply and loopback rejection. Public extraction was checked on Manipal Hospitals, TatvaCare, TatvaPractice and Cloudnine; some sites such as Apollo block automated requests. Actual Vercel deployment still requires an endpoint smoke test.
