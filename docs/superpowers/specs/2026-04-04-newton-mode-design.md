# Newton Mode Design

## Overview

Add a mode system to the LCD demo app. Rename the existing demo to "Nokia mode" and add a new "Newton mode" that mimics the Apple Newton MessagePad UI. Users pick a mode from a launcher screen.

## Mode System

### Architecture

Single `App.tsx` with a top-level mode state:
- `"picker"` -- mode selection screen (HTML, not LCD-rendered, since modes use different resolutions)
- `"nokia"` -- existing demo, extracted to `demo/modes/NokiaMode.tsx`
- `"newton"` -- new Newton demo in `demo/modes/NewtonMode.tsx`

Each mode component receives `onExit: () => void` to return to the picker.

### Shared Global Hotkeys (both modes)

- `-`/`+` -- adjust pixelSize (2-8)
- `,`/`.` -- cycle camera presets
- `\` -- toggle CSS perspective

These live in each mode component (not the picker).

### Nokia Mode

Extract current `App.tsx` into `demo/modes/NokiaMode.tsx` with no functional changes. Same 160x120 resolution, same theme/screens.

## Newton Mode

### Display

- Resolution: 240x320 (portrait)
- pixelSize: 3
- Theme: new `"newton"` preset (light greenish-gray LCD)
- Camera: `"straight"` default

### Newton Theme Preset

Add to `src/themes/presets.ts`:

```ts
export const newton: LCDTheme = {
  background: "#9BA88A",
  dotOff: "#8F9C80",
  dotOn: "#1A1E14",
  shadow: "#0D0F0A",
};
```

### UI Chrome (shared across all Newton screens)

- **Title bar** (top): app name centered, left/right routing arrows for navigating between apps
- **Status bar**: thin divider below title
- **Bottom button bar** (persistent, 4 icons): Assist (star), Undo (arrow), Find (magnifier), Overview (grid). Overview navigates to Extras home. Others are decorative or trigger simple actions.

### Screens

#### Extras (home screen)

- Grid of app icons: 4 columns, 2-3 rows
- Apps: Notepad, Names, Dates, Calculator, Preferences
- Labels underneath each icon
- Arrow keys cycle through grid, Enter opens app
- Escape from Extras triggers `onExit` (back to mode picker)

#### Notepad

- Lined paper effect (horizontal ruled lines every ~12px)
- Pre-populated notes and checklist items
- Checklist items with toggleable checkboxes
- Scrollable content area
- Title bar shows "Notepad" with "New" button

#### Names

- Left: alphabetical tab strip (A-Z, vertical)
- Right: contact list for selected letter
- Each contact: name + phone on two lines
- Selecting a contact shows expanded card (name, phone, address, email)
- Pre-populated with ~8 sample contacts across a few letters

#### Dates

- Month calendar grid: 7 columns, Sun-Sat headers
- Header: month name + year with left/right arrows to change month
- Below grid: day detail area with events for selected date
- A few pre-populated events
