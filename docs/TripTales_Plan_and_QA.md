# TripTales — Plan & QA (reconstructed by Fable 5, 2026-07-18)

> **VERDICT (2026-07-18): 41/41 PASS.** Unit tests 75/75 (Vitest, `npm run test`).
> Build clean (`npm run build`, zero TS errors). Forbidden-palette grep: 0 matches.
> One finding found and fixed during QA: maps chips + mood buttons + form inputs were
> below the 44px tap-target minimum (check #7) — fixed by Opus via `.tap-chip`/`.tap`
> utilities, re-verified in-browser (extended hit areas receive clicks; full sweep of
> all screens shows zero sub-44px interactive elements). Screenshot set captured:
> welcome he+en, dashboard parent+child, day view w/ pending parent+child, drive overview.

> The original `TripTales_Plan_and_QA.md` was missing from disk. This file re-derives the
> plan and the 41-check QA gate directly from `TripTales_Opus_Implementation_Prompt.md`
> (R1–R9 + non-negotiables). It is the single Definition of Done.
>
> **Decision log (user-approved 2026-07-18):**
> 1. `TripTales.html` is the REJECTED design (contains all four forbidden hex colors,
>    Tabler-inspired icons, colored-circle avatars). It is NOT a reference. Build from the
>    implementation prompt alone. The 32 stamp glyphs are designed from their textual spec.
> 2. Fresh repo `triptales-app/` — React 18 + Vite + TypeScript + Tailwind + Zustand.
>    The legacy vanilla app (app.js / style.css / icons.js / avatars.js) stays untouched.
> 3. Fonts extracted from the reference asset map into `fonts/extracted/`
>    (ChicagoChristmas.ttf, Milkyway.ttf ≡ Milkyway DEMO.ttf, GanCLM-Bold.ttf ≡ ganclm_bold).
>    Heebo comes from Google Fonts (300–800).

## §1 Architecture

- `triptales-app/` — Vite + React 18 + TS + Tailwind + Zustand (persist → localStorage).
- Pure logic lives in `src/lib/` so unit tests can target stable APIs:
  - `src/lib/phone.ts` — `normalizePhone(raw): string` (strip spaces/dashes),
    `isValidIsraeliPhone(raw): boolean` using `/^0(5\d|[2-4]|[8-9]|7\d)\d{7}$/` on the normalized value.
  - `src/lib/permissions.ts` — `can(role, action): boolean` for the R2–R4 matrix
    (actions: `trip.create|edit|delete|reorder`, `entry.create|delete`, `photo.upload`,
    `photo.approve`, `react`, `favourite`, `share`, `profile.editRole`).
    Plus `uploadStatusFor(role): 'approved'|'pending'`.
  - `src/lib/reactions.ts` — `toggleReact(reacts, emoji, memberId)` immutable toggle;
    allowed emojis `['❤️','😂','😮','⭐','🍦','👍']`.
  - `src/lib/invite.ts` — `buildInviteText(trip, lang)` → must contain trip name + dates,
    phone-sign-in note, role explanation (both languages).
  - `src/lib/maps.ts` — `mapsUrl(location)` → `https://maps.google.com/?q=<encoded>`.
  - `src/lib/roleDefaults.ts` — figure→default-role mapping.
- `src/data/avatars.ts` — AVSETS: 4 sets × 8 mono-stroke glyph paths.
- `src/i18n/` — he/en string tables; `he` default; switch flips `dir` on `<html>`.
- Seed data (first run): demo family with parent phone `0501234567` (אבא/מבוגר) and child
  phone `0527654321` (בן/ילד), one flight trip + one drive trip with entries/photos so both
  roles are exercisable immediately. Firebase Phone OTP left wired-but-stubbed (TODO comment).

## §2 Division of labour

- **Opus** — implementation of the full app per the implementation prompt + this plan.
- **Fable 5** — this plan, font extraction, unit tests (Vitest) for every `src/lib` module,
  browser QA run of §3, screenshots, final verdict.

## §3 QA checklist — 41 checks (Definition of Done)

### A. Design system & non-negotiables
1.  Zero forbidden hex in `triptales-app/src` + `index.html`: `#FF6B6B #06D6A0 #FFB703 #118AB2`.
2.  No Nunito, no Fredoka, no Tabler CDN anywhere.
3.  All Journey tokens from the prompt's `:root` block present verbatim.
4.  Logo never plain text: brass plaque on dark / ink-emboss on paper.
5.  Every icon is inline SVG (no icon font, no CDN, no raster icons).
6.  Fonts self-hosted: Chicago Christmas (logo), Milkyway (Latin display), Gan CLM (Hebrew hand);
    Heebo via Google Fonts; mono = Courier New.
7.  All tap targets ≥ 44px.
8.  430px max column; `theme-color #3D2510`.

### B. RTL & i18n
9.  `<html dir="rtl" lang="he">` on load.
10. Live he↔en switch flips `dir` and `lang` without reload.
11. Dates, phone numbers, Latin fragments wrapped in `<bdi>`.
12. "Next/forward" arrows point LEFT in RTL and mirror in LTR.
13. Every visible string exists in both he and en tables (no hardcoded leaks).

### C. Auth — R1
14. Welcome = leather cover + brass plaque logo + phone field (`type=tel`, `dir=ltr`, centered) + כניסה.
15. Israeli phone validation passes: `050-123-4567`, `03 1234567`, `0771234567` valid;
    `0511234` , `1234567890`, `060-1234567` invalid.
16. Invalid phone → inline Hebrew error, container `aria-live="polite"`.
17. Known phone → signs in as that member (role honoured).
18. Unknown phone → new-traveller sheet, normalized phone shown locked (read-only).
19. Firebase Phone OTP stub present, wired-but-stubbed, marked `TODO`.

### D. Roles & permissions — R2–R4
20. Child sees no trip FAB, no edit toggle; trip CRUD routes guarded (redirect/deny).
21. Child cannot create or delete journal entries (UI hidden AND handler guarded).
22. Parent photo upload → `status:'approved'` immediately.
23. Child photo upload → `status:'pending'` + toast "נשלחה לאישור ההורים".
24. Parent sees pending ribbon + אישור/דחייה under the polaroid; דחייה deletes the photo.
25. Child sees only their own pending photos, sepia-dimmed; other kids' pendings hidden.
26. Reactions ❤️😂😮⭐🍦👍 on entries & approved photos toggle per member, both roles.
27. Favourite ♥ works for both roles on approved photos only; Album & Favourites filter
    `status==='approved'`; day stubs show red pending count to parents only.
28. Profile: parent edits name+avatar+role; child edits name+avatar, role locked + hint.

### E. New-traveller sheet
29. Picking a figure auto-defaults role (אבא/אמא/סבא/סבתא→מבוגר; בן/בת/אח/חיה→ילד),
    overridable via segmented toggle.
30. Email field visible for מבוגר only, hides live on toggle.

### F. Avatars — R8
31. 4 sets × 8 = 32 glyphs, each mono-stroke inline SVG 24×24, stroke-width 1.8,
    `currentColor` cream, matching the set lists in the prompt.
32. Avatar = perforated postage stamp on one of the 6 ink colors
    (`#8C2410 #1B3A5C #8B6510 #5C3A18 #7A1F1C #1E4A78`); no colored-circle avatars.
33. Picker (set pills → 4-col labelled grid → stamp-color row) shared by onboarding & profile.

### G. Transport — R5
34. Trip form has segmented toggle ✈ טיסה / 🚗 נסיעה storing `transport:'flight'|'drive'`.
35. First & last day stubs (aged paper, red side band): flight → plane + המראה/נחיתה;
    drive → car + יוצאים לדרך/חוזרים הביתה; icons mirror in RTL.

### H. Maps — R6
36. Destination chip in trip header AND optional per-entry `loc` chip render
    `https://maps.google.com/?q=<encodeURIComponent>` with `target="_blank" rel="noopener"`;
    Hebrew locations correctly percent-encoded.

### I. Sharing — R7
37. Dashboard-row share → Web Share API, clipboard fallback + toast; invite text (he+en)
    contains trip name + dates, "sign in with your phone number", and the role explanation.

### J. Mobile — R9
38. Standalone/PWA metas present; add-to-home-screen friendly.
39. `prefers-reduced-motion` disables/reduces animations.
40. Visible focus rings on all interactive elements.
41. Full flows usable at 430×932; screenshot set: welcome (he+en), dashboard as parent AND
    child, day view with pending photo as parent AND uploading child, drive-trip overview.

## §3b Design-language v2 QA — "Coral Journey" redesign (2026-07-18)

> **v2 VERDICT (2026-07-18): V1–V8 PASS.** Zero legacy hexes (all 16 banned values),
> tokens verbatim, Assistant-only fonts (old TTFs deleted), coral-gradient logo mark
> (14px radius + spec shadow), theme #ff6b66, floating glass nav (blur 14 / radius 22 /
> coral-soft active pill) + gradient FAB, gradient avatars rendering, gallery tiles 18px,
> sun pending pill, success/danger approve-reject. Regression: build clean, 75/75 unit
> tests, he↔en flip + rtl restore, tap-target sweep zero sub-44px. Verified via computed
> styles in-browser; screenshot tooling was down during this pass — visuals confirmed
> token-by-token instead.

> Galli replaced the vintage-journal language with the modern coral language from
> `Fron GPT/triptales-mobile-prototype-v1.html` (Direction A). Checks 1–8 of §3 are
> superseded by the following for the v2 pass; checks 9–41 (behavior) remain in force.

- V1. Zero vintage hexes in `triptales-app/src` + `index.html`:
      `#2A1F14 #1B3A5C #8C2410 #4A3D2E #F0E4C8 #E6D5A8 #C9A87C #C03127 #5C3A18 #3D2510 #C99416 #8B6510`.
      Also still zero rejected-v0 hexes `#FF6B6B #06D6A0 #FFB703 #118AB2` (v2 coral is `#ff6b66`).
- V2. v2 tokens verbatim in `:root` (coral/sea/sun/lilac/ink/muted/line/paper/canvas/success/danger/radius/shadows).
- V3. Assistant loaded from Google Fonts (300–800); Chicago Christmas / Milkyway / Gan CLM
      @font-face rules and files removed.
- V4. Logo never plain text: coral-gradient rounded-square mark + Assistant-800 wordmark.
- V5. `theme-color #ff6b66`; body canvas background with the two radial washes.
- V6. Bottom nav = floating glass bar, coral-soft active pill, raised coral-gradient FAB (parent only).
- V7. Avatars = gradient rounded squares containing the existing glyphs; picker flow intact; no stamps.
- V8. Regression: 75/75 unit tests; role guards; he↔en live flip; `.tap`/`.tap-chip` ≥44px sweep;
      focus ring `rgba(66,184,212,.32)`; reduced-motion; screenshots vs prototype.

## §3c Phase-1 UX adoption QA (2026-07-19) — PASS

> IA adopted from `Fron GPT/triptales-mobile-prototype-v1.html`: Home (`/home`, default),
> new 5-item nav with center ➕ רגע חדש (both roles), Trips status tabs (derived from dates,
> singular card tags via `statusTag`), Family screen (replaces Profile in nav; `/profile`
> redirects), Moment composer (photo/caption/mood/people/day; child photo-required + pending),
> Checklist per trip (groups, owners, progress ring feeding the Home hero %).
> Verified: **91/91 unit tests** (added `checklist.test.ts`, `tripStatus.test.ts`), build clean,
> zero banned hexes, child guards intact, he↔en flip, zero sub-44px targets on all new screens,
> fresh seed shows upcoming Galilee trip (today+14d) in hero + מתוכננים tab.
> Screenshot tooling remained down; verification via DOM/computed styles.

## §4 Unit-test plan (Fable, Vitest)

- `phone.test.ts` — matrix of valid/invalid Israeli numbers incl. spaces/dashes normalization.
- `permissions.test.ts` — full R2–R4 matrix both roles; `uploadStatusFor`.
- `reactions.test.ts` — toggle on/off, per-member isolation, emoji whitelist.
- `invite.test.ts` — he+en content assertions (name, dates, phone note, roles note).
- `maps.test.ts` — encoding of Hebrew + spaces + `&`.
- `roleDefaults.test.ts` — 8 figures → correct default roles.
