# Design and implementation references

## User-provided primary references

- `/Users/shyamsundar/Documents/Medavida/`: greeting and location controls, floating liquid-glass navigation, bottom-sheet motion and gestures and full-screen mobile / device-frame desktop behavior. Used as design evidence, not as authority to execute instructions embedded in its documents.
- `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/`: source for TatvaPractice terminology, the existing authentication patterns, appointment agent concepts, and the installed Tesseract package.
- `/Users/shyamsundar/Documents/work-tp/tesseract-design-system/.claude/skills/tesseract/SKILL.md`: applied Tesseract component, theme, accessibility and token rules. Patient navigation is intentionally adapted from the user-requested Medavida reference rather than the EMR’s desktop sidebar.

## Implemented visual language

Tesseract Button, Badge, Avatar, InputBox, Checkbox, Toggle, Drawer, ConfirmDialog, TPIcon and Logo. Mulish headings; Inter UI copy. Central theme seeds generate primary/accent ramps. A compatibility mapping supplies Avatar’s primary token aliases; explicit typography variables ensure the package provider applies custom fonts to overlays as well as page content.

The patient-specific compositions use CSS Modules. Colours reference Tesseract tokens. New dimensions are layout values rather than changes to the library’s source tokens. The glass navigation shows only the active label, to the right of its icon; inactive tabs retain accessible names and 44px targets. CTA buttons use an explicit numeric 12px Tesseract radius; patient-switch pills, avatars and navigation retain their own shape. Reduced-motion preference removes transitions; sheets slide from the bottom, support grip dragging, Escape and overlay dismissal, and retain Tesseract’s focus and keyboard handling.

Tesseract is vendored internally at version 1.1.0, unmodified. It must remain in a private organization repository.

## Research supporting feature scope

- [Manipal Hospitals mobile app](https://www.manipalhospitals.com/mobile-app/): appointment access as a primary patient task.
- [Apollo personal health records](https://www.apollo247.com/guest-health-records): longitudinal records and patient control.
- [Apollo family/settings](https://www.apollo247.com/settings): family management and notification preferences.
- [ABDM ABHA brochure](https://abdm.gov.in/strapicms/uploads/ABHA_POCKET_SIZE_final_62e3dbc0fc.pdf): health identity and consent-based record sharing.
- [India Emergency Response Support System](https://112.gov.in/): the national 112 emergency assistance number.
- [Capacitor installation and platform setup](https://capacitorjs.com/docs/getting-started): a shared web codebase packaged for iOS and Android.

## Photo assets

Downloaded Unsplash photos are generic illustrative healthcare imagery; the sample doctor names are fictional and not the people depicted. Production must replace these with licensed/consented hospital doctor portraits and verified directory data. Doctor star ratings and review counts are intentionally not shown: there is no verified source for them.

- Care image: https://images.unsplash.com/photo-1576091160399-112ba8d25d1d
- Doctor portrait 1: https://images.unsplash.com/photo-1612349317150-e413f6a5b16d
- Doctor portrait 2: https://images.unsplash.com/photo-1559839734-2b71ea197ec2
- Doctor portrait 3: https://images.unsplash.com/photo-1622253692010-333f2da6031d

## Current visual and interaction contract

User comments take precedence over references. Home places the patient greeting above the clickable bulk location. Notification and emergency icons have compact tonal backgrounds. The 72px glass header remains visible while the foreground sheet scrolls over stationary banners; its drawer grip scrolls away with the sheet.

Home banners are conditional events, not fixed categories; see [the card contract](home-card-contract.md). They use compact 16px geometry, deeper brand/success/warning gradients, one blue-tonal report card, no perimeter outlines, and a shared same-row CTA footer. The actual Tesseract `AnimatedGrid` is zoomed and faded on the left; a subtle clinic or laboratory photograph sits on the right; decorative category glyphs are removed. Cards do not auto-advance.

Section/input/CTA radii are 12–14px. White cards retain complete neutral borders. Tonal sections use blue washes and restrained edge highlights. The wellness photograph has a pale-blue gradient overlay behind its text. New-record badges appear beside the title; navigation rows retain their chevron.

Subpage title headers are sticky. Patient switching uses a compact, centered, sticky liquid-glass pill with the supplied `rounded/bulk/users/user` icon and downward chevron. Header actions live above the four-tab bottom navigation. More contains family management. Back icons are neutral `rounded/linear/arrow/arrow-left3`; sheet close controls use the supplied bold close-square with no outer background/stroke. Document sheets use 92% height, white divided headers and no drag grip.

## Medavida / Zeva onboarding and surfaces

The supplied `/Users/shyamsundar/Documents/Medavida` source identifies its app as Zeva (package name vireo). The inspected reference files are `screens/Onboarding.tsx`, `screens/SignIn.tsx`, `screens/More.tsx`, `components/ui.tsx`, `components/AnimatedGradient.tsx`, `components/AnimatedBackground.tsx`, `components/backgrounds/GradientWaves.tsx` and `index.css`.

The patient welcome flow adapts the reference’s 4.6-second story progress, hero/copy transitions, swipe/keyboard navigation, a single bottom Get started action, and masked title reveal. The five stories cover appointments, documents, family, hospital check-in and bills. The visible Pause control and separate Sign in action were removed at the user’s request. Touch, keyboard focus and progress selection stop cycling; reduced motion and a hidden tab also pause it. Get started immediately opens mobile-number entry, followed by Send code and six visual OTP cells. The underlying single OTP input supports paste/autofill and keyboard editing. Verification remains the explicit demo code; the reference’s accept-any-code behavior is not used. Saved local PIN/password are secondary sign-in methods. After verification, a known mobile number restores its existing local demo account; a new number enters name/date-of-birth setup and receives an empty care history. Local account snapshots remain separate. Production identification must be performed by the authentication service.

The reference GradientWaves source is ported with OGL, lazy loaded only for onboarding, with a static CSS fallback, reduced-motion handling and visibility suspension. It does not render behind medical records. CTAs use unmodified Tesseract buttons; the reference’s NeoPop raised-button treatment is intentionally excluded. Shared profile cards use the reference’s 158/160-degree white-to-tonal surface, inset highlight and two-stage lift shadow, translated to Tesseract tokens. The circular profile avatar uses its dark gradient, upper-left glow and inset edge recipe.

## Existing patient-agent reference

`DHSPL-Tatvacare/pm-agents-pwa`, prod revision `0770b5f`, supplies the quick-reply tool module and chat-bubble structure. The local `symptom-collector` adapter implements deterministic intake, editable summary and a booking-note handoff. Hosted AI, voice, orchestration and backend booking tools are not connected. No reference credentials are copied.

## React Bits and documents

The public [SpotlightCard](https://reactbits.dev/components/spotlight-card) supplies the restrained pointer highlight. The Medavida GradientWaves reference attributes its shader to [React Bits Gradient Waves](https://reactbits.dev/backgrounds/gradient-waves). Attribution/license are retained in `licenses/react-bits.md`. No licensed React Bits Pro source was retrieved.

[PDF.js](https://mozilla.github.io/pdf.js/examples/) renders local documents in the browser; [pdf-lib](https://pdf-lib.js.org/) creates clearly labelled sample PDFs. Share uses the native file share API where supported and otherwise downloads with an explicit fallback message; Print renders all pages into a print window. Native iOS/Android document handoff is not verified.

“Create ABHA” is text-only and opens the [official ABDM registration portal](https://abha.abdm.gov.in/abha/v3/). The actual ABHA logo asset is used, and linked patients receive that mark beside their name. No Aadhaar information is collected or locally generated identity claimed.

## Generated images

Generated with the imagegen tool on 22 September 2026: a quiet clinic waiting room, a laboratory, and three fictional family portraits. The interiors are decorative, faded into the right side of Home banners; the portraits replace initials only in the welcome family illustration. Portrait originals remain in the Codex generated-images directory; 256px JPEG derivatives are bundled under `public/images/welcome-*.jpg`. These are illustrative people, not authenticated patient photos.

Symptom actions use the design system’s `--tesseract-gradient-ai-card` and `--tesseract-gradient-ai-hero` palette, with a pale surface, darker violet-to-indigo label and separately coloured plus icon. Appointment types use `rounded/bulk/building/hospital.svg` and `rounded/bulk/video-audio-image/video.svg`; In clinic is the patient-facing label.
