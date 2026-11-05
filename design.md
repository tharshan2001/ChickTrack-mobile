# ChickTrack Mobile Design Guide

Source of truth: `/Users/antonabitharshan/Downloads/ChickTrack Mobile Mockups.html` and cleaned pages in `/var/folders/56/y685hhcx4x30ssppmkfc5krh0000gn/T/opencode/clean/`.

## Palette
- ink `#231F20`, accent `#A2080C`, accentPressed `#7E0609`
- secondary `#636366`, tint `#F5D3B8`, field `#F5F5F7`, separator `#E5E5EA`
- success `#2F6F4E`, warning `#7A4B0E`, warningBg `#F2E5CC`, warningDot `#C97F1E`
- danger `#8E2A20`, dangerBg `#F3E2DE`, dangerBorder `#E3BFB7`

## Tokens
- `space`: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32
- `radius`: field/card 10, pill 6
- `fonts`: title SpaceGrotesk_700Bold, body IBMPlexSans_400Regular, bodyMedium 500, mono IBMPlexMono_500Medium

## Layout
- Tab header padding `60px 16px 8px`; stack header `52px 8px 4px`; title block `0 16px 8px` (forms 4px).
- Cards: radius 10, shadow `0 2px 12px rgba(0,0,0,0.08)`, padding 16, gap 16.
- List rows: min-height 64 (72 for purchase/dispatch rows), padding `0 16`.
- Body gap: 12/16/24/32 depending screen; body padding 16.
- Footer pinned above safe area, padding `8 16 32`, gap 10; forms use `footerShadow`.

## Components
- `Screen`: titleVariant, subtitle (ReactNode), headerExtra, bodyPadding*, bodyGap, titleGap, footerGap, footerShadow, inlineActions, subtitleAbove.
- `Field`: compact (44), large (52), mono, hideLabel.
- `DecimalField`: compact/large/mid/huge, always mono.
- `SelectField`: compact, hideLabel.
- `Segmented`: hideLabel, compact (36).
- `Chips`: height 40, radius field, selected tint bg + inset accent ring.
- `Badge`: mono 10px, tracking 0.08em, uppercase, padding 4x8, radius 6; inactive tone neutral.
- `Button`: primary/secondary/danger; primary 50 high, danger 48 transparent red text.
- `Notice`: `icon={false}` for plain caption text with `paddingHorizontal: space.xs`.
- `Text` variants: display, largeTitle, title, headline, body, bodyMedium, caption, mono, monoSmall, num, numTile, numLarge, numBig, numMoney, numDisplay, badge.

## Formatting
- `formatRupees(v, 0)` for Home tiles (e.g. `Rs 24,600`).
- `formatRupeesCompact` yields `Rs 379.6k` / `Rs 2.4M`.
- `formatShortDate`, `formatIsoDate`, `formatDayHeading`, `formatKgShort`, `formatKgWhole`.

## Conventions
- Use Expo Router; routes in `src/app/`; keep non-route code outside.
- Prefer `npx expo install` for native deps.
- Run `npx tsc --noEmit` and `npx expo lint` before done.
- No comments in code unless requested.
- Do not edit `ios/` or `android/` (CNG).
- Keep payment Date field for backdating even though mockup omits it.
- Reports export uses expo-file-system + expo-sharing.
