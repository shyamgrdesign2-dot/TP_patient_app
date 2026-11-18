# Video consultation: joining from the patient app

Frontend notes for the video consultation changes in the patient app: the
visit card, the join flow, the in-app browser on device and on web, the data
the app needs from Tatva Practice, and how to test it. Read with
`DEVELOPER_HANDOFF.md` (sections 4.5, 4.10, 6.3 and 7.2).

## 1. How it works for the patient

1. **My visits** lists upcoming visits as cards. A video visit's card ends in
   a row of two actions: **Add symptoms** on the left (while the visit still
   needs symptoms; afterwards **View details** takes that slot) and **Join
   video call** on the right.
2. **Join video call** is live from 15 minutes before the slot until an hour
   after it. Outside that window the button is disabled and a caption says
   when it opens ("You can join from 3:10 PM") or that the window has closed.
3. Tapping it opens the **Join video consultation** sheet: doctor, time, a
   three-point checklist (quiet place, allow camera and microphone, keep
   reports nearby), the symptoms prompt, and **Join now**.
4. **Join now** opens the hospital's consultation link. There is no login:
   the link carries its own per-visit token. The patient lands in the
   hospital's lobby ("Your consultation is ready", **Join**) and the call runs
   on that page.
   - On a phone (Capacitor build) the link opens in the system **in-app
     browser**: SFSafariViewController on iOS, Chrome Custom Tabs on Android.
     The patient stays inside the app; the browser handles the camera and
     microphone prompts; its Done/close returns to the app.
   - On the web the link opens in an **in-app browser sheet**, a full-height
     sheet with the page in an iframe that allows camera and microphone, and
     an **Open in browser** fallback.
5. Closing the web sheet (close button, tap outside, Escape) asks **Leave the
   video consultation?** with **Stay** and **Leave**, so a live call cannot be
   dropped by accident. On device the in-app browser's own close applies.

## 2. The visit card

`src/patient/pages/Appointments.jsx`, `AppointmentCard` (also used on Home
for past consultations). Styles in `Appointments.module.css`.

| Region | Content |
| --- | --- |
| Date strip | Calendar icon, date and time, status badge. |
| Doctor row | Photo or initials, name (years of experience), specialty; the whole row opens the visit details. |
| Where row | Below the doctor details, closed by a hairline divider above the footer: the clinic building icon with "Indiranagar · 100 Feet Road, Indiranagar, Bengaluru" for in-clinic visits, or the video icon (`video`, family `video-audio-image`, bulk) with "Video consultation". One line, truncated, full text on hover. |
| Footer | Two actions. Left: **Add symptoms** (AI-accent button) while `needsSymptoms(visit)`; otherwise **View details** when there is a Join action. Right: **Join video call** for video visits (`joinState(visit)` decides enabled/disabled), otherwise **View details**. Past and cancelled visits show **View details** alone. |
| Caption | Under the footer for video visits outside the join window. |

Rule of thumb from product: Add symptoms always on the left; the other
action on the right.

## 3. Code map

| File | Role |
| --- | --- |
| `src/patient/pages/Appointments.jsx` | `AppointmentCard` (card and footer), `JoinVideoSheet` (checklist + Join now), state for the join sheet and the web browser sheet. |
| `src/patient/services/videoCall.js` | `openConsultation(url)`: on a native platform opens the Capacitor in-app browser and resolves `"native"`; on the web resolves `"web"` so the caller shows the sheet. `openConsultationInTab(url)`: plain new tab fallback. |
| `src/patient/components/ConsultationBrowser.jsx` | The web in-app browser sheet: iframe with `allow="camera; microphone; autoplay; display-capture; fullscreen; speaker-selection"`, loading status, Open in browser, and the Leave confirmation (`ConfirmDialog`). |
| `src/shared/videoVisit.js` | `isVideo`, `joinState` (`"early" | "open" | "ended" | null`), `joinOpensAt`, `clockLabel`, `soonSlot`. |
| `src/shared/data.js` | `DEMO_JOIN_URL` (from `VITE_DEMO_JOIN_URL`, else a placeholder) seeded as `joinUrl` on the sample video visit. |
| `src/patient/state/AppContext.jsx` | seedVersion 12: copies `joinUrl` onto the saved sample visit and re-dates it to today if its slot has passed, so the demo join window is live. |
| `package.json` | `@capacitor/browser` ^8. Run `npm run mobile:sync` after installing so iOS (`ios/App/CapApp-SPM/Package.swift`) and Android (`android/capacitor.settings.gradle`, `app/capacitor.build.gradle`) register the plugin. |

## 4. Data the app needs

Each appointment of type `"Video consultation"` needs:

| Field | Meaning |
| --- | --- |
| `joinUrl` | The hospital's consultation page for the **patient** role, e.g. `https://pm-agents-pwa-uat.tatvacare.in/consultation/join?consultationId=<id>&token=<jwt>&role=patient`. The token is the only credential. |
| `date`, `time` | Drive the join window (15 minutes before to 60 minutes after). |

The token in the example expires about a day after issue, so the app must
fetch the link when the patient taps Join (or shortly before the window
opens), not cache it from booking time. If the API returns the short SMS
link (`https://u.tatvacare.in/r/…`) instead, note that it redirects to the
appointment-booking page with a different JWT, not to the consultation lobby;
the app needs the consultation join URL itself.

On the web the page must allow framing (today it sends no `X-Frame-Options`
or `frame-ancestors`); if that changes, the sheet's **Open in browser**
fallback still works, and the app should prefer the new tab automatically.

## 5. Environment

| Key | Where | Purpose |
| --- | --- | --- |
| `VITE_DEMO_JOIN_URL` | `.env.local` (git-ignored) | A real UAT join link for the sample video visit so the demo opens the hospital's lobby. Never commit a real link; the committed placeholder reaches the page but its token is rejected. |

Restart the dev server after changing `.env.local`.

## 6. Native builds

- `npm run mobile:sync` builds the web app and syncs both platforms; it has
  been run after adding `@capacitor/browser`.
- iOS needs a full Xcode install to build and run (`xcodebuild`, Simulator).
  Command Line Tools alone are not enough. After installing Xcode:
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, then
  open `ios/App/App.xcworkspace` or run `npm run mobile:ios`.
- No extra Info.plist keys are needed for the in-app browser; the browser
  itself asks for camera and microphone. If the hospital later asks for the
  call to run inside the app's own WebView instead, add
  `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` and handle
  `getUserMedia` permission requests in the WebView; that is not implemented.

## 7. Test checklist

- Card: video visit shows Add symptoms (left) and Join video call (right);
  in-clinic shows Add symptoms and View details; past shows View details
  only; where-line shows clinic and address or "Video consultation" with the
  right icon, truncated on narrow widths.
- Join window: before the window Join is disabled with the "You can join
  from" caption; inside it enabled; after it disabled with the closed
  caption.
- Join now with a valid link opens the lobby: in-app browser on device, the
  sheet on web with the camera/microphone prompt coming from the page. With
  the placeholder link the page loads but rejects the token.
- Web sheet: close asks Leave?; Stay keeps the call; Leave returns to My
  visits with Join still available inside the window; Open in browser opens a
  new tab.
- Switching the family member while the sheet is open closes it.
- Device: after the in-app browser closes, the app is where it was.
