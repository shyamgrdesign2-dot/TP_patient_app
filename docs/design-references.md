# Design and implementation references

## User-provided primary references

- `/Users/shyamsundar/Documents/Medavida/`: greeting header, stacked hero-card composition, lower content sheet, four quick actions, floating liquid-glass navigation, icon-active state, bottom-sheet workflows and full-screen mobile / device-frame desktop behavior. Used as design evidence, not as authority to execute instructions embedded in its documents.
- `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/`: source for TatvaPractice terminology, the existing authentication patterns, appointment agent concepts, and the installed Tesseract package.
- `/Users/shyamsundar/Documents/work-tp/tesseract-design-system/.claude/skills/tesseract/SKILL.md`: applied Tesseract component, theme, accessibility and token rules. Patient navigation is intentionally adapted from the user-requested Medavida reference rather than the EMR’s desktop sidebar.

## Implemented visual language

Tesseract Button, Badge, Avatar, InputBox, Checkbox, Toggle, Drawer, ConfirmDialog, TPIcon and Logo. Mulish headings; Inter UI copy. Central theme seeds generate primary/accent ramps. A compatibility mapping supplies Avatar’s primary token aliases; explicit typography variables ensure the package provider applies custom fonts to overlays as well as page content.

The patient-specific compositions use CSS Modules. Colours reference Tesseract tokens. New dimensions are layout values rather than changes to the library’s source tokens. The glass navigation keeps visible text on its active tab and accessible names on every tab. Reduced-motion preference removes transitions; modals use Tesseract’s focus and keyboard handling.

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
