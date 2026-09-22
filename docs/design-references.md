# Design and implementation references

## User-provided primary references

- `/Users/shyamsundar/Documents/Medavida/`: greeting and location controls, floating liquid-glass navigation, bottom-sheet motion and gestures and full-screen mobile / device-frame desktop behavior. Used as design evidence, not as authority to execute instructions embedded in its documents.
- `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/`: source for TatvaPractice terminology, the existing authentication patterns, appointment agent concepts, and the installed Tesseract package.
- `/Users/shyamsundar/Documents/work-tp/tesseract-design-system/.claude/skills/tesseract/SKILL.md`: applied Tesseract component, theme, accessibility and token rules. Patient navigation is intentionally adapted from the user-requested Medavida reference rather than the EMR’s desktop sidebar.

## Implemented visual language

Tesseract Button, Badge, Avatar, InputBox, Checkbox, Toggle, Drawer, ConfirmDialog, TPIcon and Logo. Mulish headings; Inter UI copy. Central theme seeds generate primary/accent ramps. A compatibility mapping supplies Avatar’s primary token aliases; explicit typography variables ensure the package provider applies custom fonts to overlays as well as page content.

The patient-specific compositions use CSS Modules. Colours reference Tesseract tokens. New dimensions are layout values rather than changes to the library’s source tokens. The glass navigation gives all five tabs equal-width cells and visible centered icon/label pairs. Reduced-motion preference removes transitions; sheets slide from the bottom, support grip dragging, Escape and overlay dismissal, and retain Tesseract’s focus and keyboard handling.

Tesseract is vendored internally at version 1.1.0, unmodified. It must remain in a private organization repository.

## Research supporting feature scope

- [Manipal Hospitals mobile app](https://www.manipalhospitals.com/mobile-app/): appointment access as a primary patient task.
- [Apollo personal health records](https://www.apollo247.com/guest-health-records): longitudinal records and patient control.
- [Apollo family/settings](https://www.apollo247.com/settings): family management and notification preferences.
- [ABDM ABHA brochure](https://abdm.gov.in/strapicms/uploads/ABHA_POCKET_SIZE_final_62e3dbc0fc.pdf): health identity and consent-based record sharing.
- [India Emergency Response Support System](https://112.gov.in/): the national 112 emergency assistance number.
- [Capacitor installation and platform setup](https://capacitorjs.com/docs/getting-started): a shared web codebase packaged for iOS and Android.

## Photo assets

Downloaded Unsplash photos are generic illustrative healthcare imagery; the sample doctor names and reviews are fictional and not the people depicted. Production must replace these with licensed/consented hospital doctor portraits and verified directory data.

- Care image: https://images.unsplash.com/photo-1576091160399-112ba8d25d1d
- Doctor portrait 1: https://images.unsplash.com/photo-1612349317150-e413f6a5b16d
- Doctor portrait 2: https://images.unsplash.com/photo-1559839734-2b71ea197ec2
- Doctor portrait 3: https://images.unsplash.com/photo-1622253692010-333f2da6031d

## September UI refinement research

- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials): use translucency for controls and navigation while protecting content legibility. Applied to the floating navigation and header controls, with an opaque fallback for reduced transparency.
- [Material 3 color, typography, shapes and elevation](https://developer.android.com/develop/ui/compose/designsystems/material3): establish hierarchy with tonal surface colors and consistent type/shape roles. Applied through Tesseract tokens: rounded cards, pale appointment date bands, differentiated action tiles, soft elevation and high-contrast primary text.
- [Material cards](https://m3.material.io/components/cards/overview): contain related content and its actions. Appointment, doctor, record and identity cards each group a single task.

Medavida is an interaction reference, not a banking-card template. The copied health-card composition was removed. Home leads with a patient-scoped carousel: upcoming appointments first, followed by new records and outstanding bills; patients without appointments get a booking prompt. A sticky location-first header uses a right-facing location chevron and a separate downward patient selector. A rounded sheet-style surface holds the four matching blue actions. ABHA creation, ABHA linking and hospital UHID linking are accessible from Home. Family, location and notification controls open sheets. Branding remains centralized.

The supplied rounded Tesseract glyphs are used: `arrow-right4` through the `chevron-right` alias, `location` (bulk), `notification-2` (bulk), and `calendar-2` (bulk where active). Billing uses the `bill` glyph; the ambiguous catalogue `add` website icon is replaced with `add-circle`.

The location-first hierarchy follows the user’s Zomato reference (see [Zomato customer app walkthrough, within its published prospectus](https://b.zmtcdn.com/data/file_assets/0afb10df59dd0c3fe87c29c5b3220f5a1627276994.pdf)). This is a hierarchy reference, not a claim to reproduce Zomato’s current app. Carousel navigation supports native horizontal swiping, dot buttons, next-arrow and keyboard arrows; it does not advance automatically. Off-screen slides are inert to keyboard and assistive technology.

“Create ABHA” opens the [official ABDM registration portal](https://abha.abdm.gov.in/abha/v3/); the app does not collect Aadhaar information or pretend to create an identity locally. Existing ABHA and UHID linking remain explicitly marked sample flows until their services are connected.
