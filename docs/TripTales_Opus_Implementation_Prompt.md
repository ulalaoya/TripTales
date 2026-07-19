# TripTales — Implementation Prompt v2 (for Opus in Claude Code / Claude Design)

You are **Opus**, the implementer. **Fable 5** owns planning and QA. Deliverables accompanying this prompt: a working single-file reference app (`TripTales.html`) that passes all 41 QA checks, and `TripTales_Plan_and_QA.md`. Your job: bring the React repo (per `TripTales_Claude_Code_Prompt_2.md` architecture: React 18 + Vite + TS + Tailwind + Zustand) to full parity with the reference. When in doubt — open `TripTales.html` and copy its behavior pixel for pixel.

## Non-negotiables

1. **Palette:** ONLY the vintage "Journey" system below. The uploaded `TripTales_-_Design_Spec.docx` describes the REJECTED coral/teal/Nunito palette — take its *functional* content only, never its colors/fonts. Forbidden anywhere: `#FF6B6B #06D6A0 #FFB703 #118AB2`, Nunito, Fredoka, Tabler CDN, plain colored-circle avatars.
2. Logo is never plain text (brass plaque on dark / ink-emboss on paper — recipes below).
3. Hebrew-first: `<html dir="rtl" lang="he">`, live he↔en switch flips `dir`; `<bdi>` around dates/phones/Latin; "next" arrows point LEFT in RTL.
4. All icons inline SVG. Avatars are perforated postage stamps containing a set glyph.
5. Compact density; tap targets ≥44px; must be fully usable on a phone.

## Design tokens

```css
:root{
  --ink-charcoal:#2A1F14; --ink-fountain:#1B3A5C; --ink-red:#8C2410; --ink-pencil:#4A3D2E;
  --paper-cream:#F0E4C8; --paper-aged:#E6D5A8; --paper-kraft:#C9A87C;
  --paper-rule:rgba(60,90,130,.18); --paper-margin:#C03127;
  --leather:#5C3A18; --leather-dk:#3D2510; --brass:#C99416; --brass-dk:#8B6510;
  --washi-mint:rgba(168,201,160,.8); --washi-rose:rgba(217,160,160,.8);
  --washi-blue:rgba(168,191,217,.8); --washi-yellow:rgba(232,213,133,.85);
  --f-script:'Chicago Christmas',cursive;  /* logo */
  --f-display:'Milkyway',serif;            /* Latin display — use the uploaded Milkyway_DEMO.ttf */
  --f-hand:'Gan CLM','Heebo',cursive;      /* Hebrew handwriting (journal entries) */
  --f-body:'Heebo',sans-serif;             /* UI body, Google Fonts 300–800 */
  --f-mono:'Courier New',monospace;        /* stamps, dates, codes */
}
```
Custom fonts: take the exact `@font-face` data-URIs from `TripTales.html` (Milkyway there is byte-identical to `Milkyway_DEMO.ttf`).

Material recipes (leather bg, paper speckle, lined journal, brass plaque + ink-emboss logo, trip card `rgba(240,228,200,.12)` + border `rgba(201,148,102,.35)` r12, brass CTA with stitch border, washi, ticket stub with notches, polaroid, postmark, luggage tag, bottom nav `#3D2510` with brass active) — unchanged from v1; copy from the reference CSS.

## Auth — phone number (R1)

- Welcome screen = leather cover + brass plaque + phone field (`type=tel`, `dir=ltr`, centered) + כניסה.
- Validate Israeli numbers after stripping spaces/dashes: `/^0(5\d|[2-4]|[8-9]|7\d)\d{7}$/`. Inline Hebrew error, `aria-live="polite"`.
- Known phone → sign in as that member. Unknown → new-traveller sheet with the normalized phone locked in.
- Family stamp avatars shown on the cover are decorative only — identity comes from the phone.
- Production TODO (leave wired-but-stubbed): Firebase Auth Phone OTP; the prototype trusts the typed number.

## Roles & permissions (R2–R4) — enforce in EVERY component and route

| Capability | מבוגר (parent) | ילד (child) |
|---|---|---|
| Create/edit/delete/reorder trips | ✔ | ✖ (no FAB, no edit toggle, routes guarded) |
| Journal entries (create/delete) | ✔ | ✖ |
| Upload photos | ✔ → `approved` | ✔ → `pending` + toast "נשלחה לאישור ההורים" |
| Approve/reject pending photos | ✔ (ribbon + אישור/דחייה under the polaroid; reject deletes) | ✖ (sees only own pending, sepia-dimmed) |
| Emoji reactions ❤️😂😮⭐🍦👍 on entries & approved photos | ✔ | ✔ (this is the child's main interaction) |
| Favourite ♥ | ✔ | ✔ (approved only) |
| Share invite | ✔ | ✔ |
| Profile | name+avatar+role | name+avatar only (role locked, hint shown) |

New-traveller sheet: picking a figure auto-defaults the role (אבא/אמא/סבא/סבתא→מבוגר; בן/בת/אח/חיה→ילד), editable via segmented toggle; email field is adults-only and hides live.

Data: photo `{id, src|svg, caption, fav, by, status:'approved'|'pending', reacts}`; entry `{id, text, mood, loc, author, ts, reacts}`; reacts `{emoji:[memberIds]}` toggle per user. Album & Favourites filter `status==='approved'`; day stubs show a red pending count to parents.

## Avatar system (R8) — from `Icons.png`, redrawn to stamp language

4 sets × 8 figures = 32 glyphs, each a mono-stroke SVG (24×24, stroke-width 1.8, `currentColor` cream) inside the perforated stamp on the member's ink color (`#8C2410 #1B3A5C #8B6510 #5C3A18 #7A1F1C #1E4A78`):

- **Set 1 קלאסי:** crown, stiletto+heart, cap+star, bow, camera, flower, star, paw
- **Set 2 טבע:** mountains+sun, branch, tent, butterfly, campfire, daisy, paper plane, leaf
- **Set 3 מינימליסטי:** person, heart, bolt, sparkle, glasses, chat, music note, smiley
- **Set 4 טיולים:** suitcase, sun hat, surfboard, ice cream, signpost, sunglasses, hot-air balloon, lifebuoy

Picker (shared by onboarding + profile): set pills → 4-col glyph grid with figure labels → stamp-color row. Copy the exact SVG paths from the reference's `AVSETS`. Do NOT rasterize `Icons.png` or use its bright colors.

## Transport (R5)

Trip field `transport:'flight'|'drive'` — segmented toggle ✈ טיסה / 🚗 נסיעה in the trip form. First & last day stubs (aged-paper background, red side band): flight → plane icon + המראה/נחיתה; drive → car icon + יוצאים לדרך/חוזרים הביתה. Icons mirror in RTL.

## Google Maps (R6)

No API key: `https://maps.google.com/?q=${encodeURIComponent(location)}`, `target="_blank" rel="noopener"` — opens the native Maps app on phones. Two placements: destination chip (map-pin icon) in the trip header; optional `loc` per entry rendered as a chip. Verify both render valid encoded hrefs.

## Sharing (R7)

Dashboard-row share button → Web Share API, clipboard fallback + toast. Invite text (both languages) must include: trip name + dates, "sign in with your phone number", and the role explanation (adults edit; kids upload photos for approval and react with emojis). Production TODO: deep link `?join=<tripId>`.

## Mobile (R9)

430px column, `theme-color #3D2510`, standalone metas, add-to-home-screen friendly, `prefers-reduced-motion` respected, visible focus rings.

## Definition of done

Run every check in `TripTales_Plan_and_QA.md` §3 (the reference passes 41/41). Additionally screenshot: welcome (he+en), dashboard as parent AND as child, day view with a pending photo as parent AND as the uploading child, drive-trip overview. Zero forbidden hex codes in the diff. Compare side-by-side against `TripTales.html` before reporting done.
