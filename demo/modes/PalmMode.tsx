import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";
import { PALM_APP_ICONS, PALM_ICON_SIZE, type PalmIconArt } from "./palm-icons";

const font = new BitmapFont();
const smallFont = new BitmapFont("3x5");

const W = 160;
const H = 160;
const STATUS_H = 12;
const SCROLLBAR_W = 7;
const CONTENT_Y = STATUS_H;
const CONTENT_H = H - STATUS_H; // 148

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];
const THEMES = ["green", "amber", "gray", "blue", "palm"];
const PIXEL_SIZES = [2, 3, 4, 5, 6, 7, 8];

type Screen =
  | "home"
  | "datebook"
  | "address"
  | "todo"
  | "memo"
  | "notepad"
  | "calc"
  | "clock"
  | "graffiti"
  | "hotsync"
  | "mail"
  | "security"
  | "prefs";

// --- Helpers ---

function useCancel(onBack: () => void) {
  const { engine } = useLCD();
  useEffect(() => {
    engine.focus.onCancel(onBack);
    return () => engine.focus.offCancel(onBack);
  }, [engine, onBack]);
}

function formatPalmTime(): string {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
}

// Draw a Palm OS icon (22x22 ASCII bitmap) at (x,y) with given intensity.
function drawPalmIcon(
  fb: ReturnType<typeof useLCD>["engine"]["fb"],
  art: PalmIconArt,
  x: number,
  y: number,
  intensity: number = 1,
) {
  for (let r = 0; r < art.length; r++) {
    const row = art[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === "#") fb.set(x + c, y + r, intensity);
    }
  }
}

// --- Top Status Bar (inverted): time + battery + category dropdown ---

function TopStatusBar({ category = "All" }: { category?: string }) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Inverted (filled) background
    fb.fillRect(ox, oy, W, STATUS_H, 1);

    // Time text — left side, knockout
    const timeStr = formatPalmTime();
    font.drawText(fb, timeStr, ox + 2, oy + 2, { intensity: 0 });

    // Battery rectangle — to the right of the time, just an empty outline.
    const timeW = font.measureText(timeStr);
    const batX = ox + 2 + timeW + 4;
    const batY = oy + 3;
    const batW = 28;
    const batH = 6;
    // Top + bottom edges
    for (let bx = 0; bx < batW; bx++) {
      fb.set(batX + bx, batY, 0);
      fb.set(batX + bx, batY + batH - 1, 0);
    }
    // Left + right edges
    for (let by = 0; by < batH; by++) {
      fb.set(batX, batY + by, 0);
      fb.set(batX + batW - 1, batY + by, 0);
    }
    // Battery nub (small rectangle hanging off right side)
    fb.set(batX + batW, batY + 2, 0);
    fb.set(batX + batW, batY + 3, 0);

    // Category dropdown on right: "▼ All"
    const catW = font.measureText(category);
    const catX = ox + W - catW - 2;
    font.drawText(fb, category, catX, oy + 2, { intensity: 0 });

    // Dropdown triangle "▼" — 5 wide, 3 tall
    const triX = catX - 7;
    const triY = oy + 4;
    for (let i = 0; i < 5; i++) fb.set(triX + i, triY, 0);
    for (let i = 1; i < 4; i++) fb.set(triX + i, triY + 1, 0);
    fb.set(triX + 2, triY + 2, 0);

    engine.markDirty();
  }, [engine, offsetX, offsetY, category]);

  return null;
}

// Draw a Palm-OS-style vertical scrollbar at the right edge.
// Caller is responsible for ensuring the area isn't cleared after drawing.
function drawScrollbar(
  fb: ReturnType<typeof useLCD>["engine"]["fb"],
  baseX: number,
  baseY: number,
  trackTop: number,
  trackHeight: number,
  scrollPos: number,
  scrollMax: number,
  thumbSize: number,
) {
  const sx = baseX + W - SCROLLBAR_W + 1;

  const upY = baseY + trackTop + 1;
  const upArrow = ["..#..", ".###.", "#####"];
  for (let r = 0; r < upArrow.length; r++) {
    for (let c = 0; c < 5; c++) {
      if (upArrow[r][c] === "#") fb.set(sx + c, upY + r, 1);
    }
  }

  const downY = baseY + trackTop + trackHeight - 4;
  const downArrow = ["#####", ".###.", "..#.."];
  for (let r = 0; r < downArrow.length; r++) {
    for (let c = 0; c < 5; c++) {
      if (downArrow[r][c] === "#") fb.set(sx + c, downY + r, 1);
    }
  }

  const trackY0 = upY + upArrow.length + 1;
  const trackY1 = downY - 1;
  const trackMid = sx + 2;
  for (let y = trackY0; y < trackY1; y += 2) {
    fb.set(trackMid, y, 0.5);
  }

  const inner = trackY1 - trackY0;
  if (inner > thumbSize) {
    const ratio = scrollMax > 0 ? scrollPos / scrollMax : 0;
    const thumbY = trackY0 + Math.round(ratio * (inner - thumbSize));
    for (let r = 0; r < thumbSize; r++) {
      fb.set(sx, thumbY + r, 1);
      fb.set(sx + 4, thumbY + r, 1);
    }
    for (let c = 0; c < 5; c++) {
      fb.set(sx + c, thumbY, 1);
      fb.set(sx + c, thumbY + thumbSize - 1, 1);
    }
  }
}

// --- App Screen Header (title + divider, below the top status bar) ---

function AppHeader({ title }: { title: string }) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Title under status bar
    font.drawText(fb, title, ox + 3, oy + STATUS_H + 2, { intensity: 1 });
    // Bold effect
    font.drawText(fb, title, ox + 4, oy + STATUS_H + 2, { intensity: 1 });

    // Thin divider below title
    const divY = oy + STATUS_H + 11;
    for (let x = 0; x < W; x++) fb.set(ox + x, divY, 1);

    engine.markDirty();
  }, [engine, offsetX, offsetY, title]);

  return null;
}

// --- Home Screen (App Launcher) ---

interface AppItem {
  name: string;
  icon: string; // key into PALM_APP_ICONS
  screen: Screen;
}

const APPS: AppItem[] = [
  { name: "Address", icon: "address", screen: "address" },
  { name: "Calc", icon: "calc", screen: "calc" },
  { name: "Clock", icon: "clock", screen: "clock" },
  { name: "Date Book", icon: "datebook", screen: "datebook" },
  { name: "Graffiti", icon: "graffiti", screen: "graffiti" },
  { name: "HotSync", icon: "hotsync", screen: "hotsync" },
  { name: "Mail", icon: "mail", screen: "mail" },
  { name: "Memo Pad", icon: "memopad", screen: "memo" },
  { name: "Note Pad", icon: "notepad", screen: "notepad" },
  { name: "Prefs", icon: "prefs", screen: "prefs" },
  { name: "Security", icon: "security", screen: "security" },
  { name: "To Do List", icon: "todo", screen: "todo" },
];

const GRID_COLS = 3;
const GRID_ROWS_VISIBLE = 4;
const HOME_CONTENT_W = W - SCROLLBAR_W; // 153
const CELL_W = Math.floor(HOME_CONTENT_W / GRID_COLS); // 51
const CELL_H = Math.floor(CONTENT_H / GRID_ROWS_VISIBLE); // 37

function HomeScreen({
  onNavigate,
  onExit,
}: {
  onNavigate: (s: Screen) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [scrollRow, setScrollRow] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onExit);

  const totalRows = Math.ceil(APPS.length / GRID_COLS);
  const maxScrollRow = Math.max(0, totalRows - GRID_ROWS_VISIBLE);

  const ensureVisible = (idx: number) => {
    const row = Math.floor(idx / GRID_COLS);
    setScrollRow(s => {
      if (row < s) return row;
      if (row >= s + GRID_ROWS_VISIBLE) return row - GRID_ROWS_VISIBLE + 1;
      return s;
    });
  };

  const onUp = useCallback(() => {
    setSelected(s => {
      if (Math.floor(s / GRID_COLS) <= 0) return s;
      const next = s - GRID_COLS;
      ensureVisible(next);
      return next;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected(s => {
      const next = s + GRID_COLS;
      if (next >= APPS.length) return s;
      ensureVisible(next);
      return next;
    });
    return true;
  }, []);

  const onLeft = useCallback(() => {
    setSelected(s => {
      if (s <= 0) return s;
      const next = s - 1;
      ensureVisible(next);
      return next;
    });
    return true;
  }, []);

  const onRight = useCallback(() => {
    setSelected(s => {
      if (s >= APPS.length - 1) return s;
      const next = s + 1;
      ensureVisible(next);
      return next;
    });
    return true;
  }, []);

  const onActivate = useCallback(() => {
    onNavigate(APPS[selected].screen);
  }, [selected, onNavigate]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown, onLeft, onRight, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Clear content area (everything below status bar)
    fb.fillRect(ox, oy + CONTENT_Y, W, CONTENT_H, 0);

    const startIdx = scrollRow * GRID_COLS;
    const endIdx = Math.min(APPS.length, startIdx + GRID_ROWS_VISIBLE * GRID_COLS);

    for (let i = startIdx; i < endIdx; i++) {
      const app = APPS[i];
      const localIdx = i - startIdx;
      const col = localIdx % GRID_COLS;
      const row = Math.floor(localIdx / GRID_COLS);

      const cellX = ox + col * CELL_W;
      const cellY = oy + CONTENT_Y + row * CELL_H;
      const isSel = i === selected;

      // Icon position — centered horizontally in cell, near top
      const iconX = cellX + Math.floor((CELL_W - PALM_ICON_SIZE) / 2);
      const iconY = cellY + 1;

      // Use the 3x5 font for labels so multi-word names fit within the 51px cell.
      const labelW = smallFont.measureText(app.name);
      const labelX = cellX + Math.floor((CELL_W - labelW) / 2);
      const labelY = iconY + PALM_ICON_SIZE + 3;

      // Selection: invert a tight box covering icon + label
      if (isSel) {
        const selX = cellX + 2;
        const selY = cellY;
        const selW = CELL_W - 4;
        const selH = PALM_ICON_SIZE + 3 + 5 + 2; // icon + gap + label + 2px padding
        fb.fillRect(selX, selY, selW, selH, 1);
      }

      // Draw icon: when selected, knockout (intensity 0); else solid (1)
      const art = PALM_APP_ICONS[app.icon];
      if (art) {
        drawPalmIcon(fb, art, iconX, iconY, isSel ? 0 : 1);
      }

      // Label (3x5 font keeps multi-word labels within the cell)
      smallFont.drawText(fb, app.name, labelX, labelY, {
        intensity: isSel ? 0 : 1,
      });
    }

    // Scrollbar — drawn last so it isn't wiped by the content clear.
    const thumbSize = Math.max(
      8,
      Math.floor((CONTENT_H - 16) * (GRID_ROWS_VISIBLE / totalRows)),
    );
    drawScrollbar(
      fb,
      ox,
      oy,
      CONTENT_Y,
      CONTENT_H,
      scrollRow,
      maxScrollRow,
      thumbSize,
    );

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, scrollRow, totalRows, maxScrollRow]);

  return <TopStatusBar />;
}

// App content lives below the status bar AND below the app's own header strip.
const APP_HEADER_H = 13; // header (title + divider)
const APP_CONTENT_Y = STATUS_H + APP_HEADER_H;
const APP_CONTENT_H = H - APP_CONTENT_Y;

// --- Date Book Screen (day view) ---

const TIME_SLOTS = [
  "8:00", "9:00", "9:30", "10:00", "10:30",
  "11:00", "12:00", "1:00", "2:00", "3:00",
  "4:00", "5:00", "6:00",
];
const APPOINTMENTS: Record<number, string> = {
  0: "Conference Call",
  3: "VP Operations",
  5: "Candidate interview",
  6: "Racquetball",
  7: "Lunch w/Larry",
  10: "Staff Meeting",
  12: "School Play",
};

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function DateBookScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const HEADER_H = 14;
  const TOOLBAR_H = 12;
  const ROW_H = 11;
  const listAreaH = CONTENT_H - HEADER_H - TOOLBAR_H;
  const visibleCount = Math.floor(listAreaH / ROW_H);
  const maxScroll = Math.max(0, TIME_SLOTS.length - visibleCount);

  const onUp = useCallback(() => {
    setSelected(s => {
      const next = Math.max(0, s - 1);
      setScrollY(sc => Math.min(sc, next));
      return next;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected(s => {
      const next = Math.min(TIME_SLOTS.length - 1, s + 1);
      setScrollY(sc => {
        const minSc = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minSc));
      });
      return next;
    });
    return true;
  }, [visibleCount, maxScroll]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp, onDown,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, oy + CONTENT_Y, W, CONTENT_H, 0);

    // Header bar within app content area
    const baseY = oy + CONTENT_Y;
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${String(now.getFullYear()).slice(2)}`;
    font.drawText(fb, dateStr, ox + 2, baseY + 3, { intensity: 1 });

    const dowStart = ox + 75;
    const dowW = 10;
    const currentDow = now.getDay();
    font.drawText(fb, "<", ox + 68, baseY + 3, { intensity: 1 });
    for (let d = 0; d < 7; d++) {
      const dx = dowStart + d * dowW;
      if (d === currentDow) {
        fb.fillRect(dx - 1, baseY + 1, dowW, 10, 1);
        font.drawText(fb, DOW_LABELS[d], dx + 1, baseY + 3, { intensity: 0 });
      } else {
        for (let i = 0; i < dowW; i++) {
          fb.set(dx - 1 + i, baseY + 1, 0.6);
          fb.set(dx - 1 + i, baseY + 10, 0.6);
        }
        for (let i = 0; i < 10; i++) {
          fb.set(dx - 1, baseY + 1 + i, 0.6);
          fb.set(dx - 1 + dowW - 1, baseY + 1 + i, 0.6);
        }
        font.drawText(fb, DOW_LABELS[d], dx + 1, baseY + 3, { intensity: 1 });
      }
    }
    font.drawText(fb, ">", ox + dowStart + 7 * dowW + 1, baseY + 3, { intensity: 1 });

    for (let x = ox; x < ox + W; x++) fb.set(x, baseY + HEADER_H - 1, 1);

    const listY = baseY + HEADER_H;
    const visible = TIME_SLOTS.slice(scrollY, scrollY + visibleCount);
    visible.forEach((slot, i) => {
      const idx = scrollY + i;
      const rowY = listY + i * ROW_H;

      if (idx === selected) {
        fb.fillRect(ox, rowY, W, ROW_H - 1, 1);
      }

      const intensity = idx === selected ? 0 : 1;

      font.drawText(fb, slot, ox + 2, rowY + 2, { intensity });

      if (idx !== selected) {
        for (let dy = 0; dy < ROW_H - 1; dy++) fb.set(ox + 30, rowY + dy, 0.5);
      }

      const appt = APPOINTMENTS[idx];
      if (appt) {
        font.drawText(fb, appt, ox + 33, rowY + 2, { intensity });
      }

      for (let x = ox; x < ox + W; x += 2) {
        fb.set(x, rowY + ROW_H - 1, idx === selected ? 0 : 0.3);
      }
    });

    const tbY = oy + H - TOOLBAR_H;
    for (let x = ox; x < ox + W; x++) fb.set(x, tbY, 0.5);

    const buttons = ["New", "Details", "Go to"];
    let btnX = ox + 20;
    buttons.forEach(label => {
      const bw = font.measureText(label) + 6;
      for (let x = 0; x < bw; x++) {
        fb.set(btnX + x, tbY + 2, 1);
        fb.set(btnX + x, tbY + 10, 1);
      }
      for (let y = 2; y <= 10; y++) {
        fb.set(btnX, tbY + y, 1);
        fb.set(btnX + bw - 1, tbY + y, 1);
      }
      font.drawText(fb, label, btnX + 3, tbY + 3, { intensity: 1 });
      btnX += bw + 4;
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, scrollY, visibleCount, maxScroll]);

  return <TopStatusBar />;
}

// --- Address Book Screen ---

interface PalmContact {
  lastName: string;
  firstName: string;
  work: string;
  home: string;
  address: string;
  city: string;
}

const ADDRESS_DATA: PalmContact[] = [
  { lastName: "Hopper", firstName: "Grace", work: "555-0701", home: "555-0702", address: "3 Navy Blvd", city: "Arlington, VA" },
  { lastName: "Kahn", firstName: "Bob", work: "555-0201", home: "555-0202", address: "9 Internet Ave", city: "Reston, VA" },
  { lastName: "Lovelace", firstName: "Ada", work: "555-0101", home: "555-0102", address: "12 Math Lane", city: "London, UK" },
  { lastName: "Ritchie", firstName: "Dennis", work: "555-0401", home: "555-0402", address: "4 Unix Way", city: "Murray Hill, NJ" },
  { lastName: "Shannon", firstName: "Claude", work: "555-0301", home: "555-0302", address: "1 Bit Street", city: "Gaylord, MI" },
  { lastName: "Tesla", firstName: "Nikola", work: "555-1401", home: "555-1402", address: "8 AC Current Pl", city: "New York, NY" },
  { lastName: "Turing", firstName: "Alan", work: "555-0102", home: "555-0103", address: "7 Bletchley Rd", city: "London, UK" },
  { lastName: "von Neumann", firstName: "John", work: "555-1001", home: "555-1002", address: "5 Logic Dr", city: "Princeton, NJ" },
];

const CONTACT_ROW_H = 12;

function AddressScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [detail, setDetail] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const visibleCount = Math.floor(APP_CONTENT_H / CONTACT_ROW_H);
  const maxScroll = Math.max(0, ADDRESS_DATA.length - visibleCount);

  const onCancel = useCallback(() => {
    if (detail) setDetail(false);
    else onHome();
  }, [detail, onHome]);

  useCancel(onCancel);

  const onUp = useCallback(() => {
    if (detail) return false;
    setSelected(s => {
      const next = Math.max(0, s - 1);
      setScrollY(sc => Math.min(sc, next));
      return next;
    });
    return true;
  }, [detail]);

  const onDown = useCallback(() => {
    if (detail) return false;
    setSelected(s => {
      const next = Math.min(ADDRESS_DATA.length - 1, s + 1);
      setScrollY(sc => {
        const minSc = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minSc));
      });
      return next;
    });
    return true;
  }, [detail, visibleCount, maxScroll]);

  const onActivate = useCallback(() => {
    setDetail(d => !d);
    return true;
  }, []);

  useFocus({
    rect: { x: offsetX, y: APP_CONTENT_Y + offsetY, width: W, height: APP_CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, APP_CONTENT_Y + oy, W, APP_CONTENT_H, 0);

    if (detail) {
      const c = ADDRESS_DATA[selected];
      let cy = APP_CONTENT_Y + oy + 4;
      const cx = ox + 4;

      const fullName = `${c.firstName} ${c.lastName}`;
      font.drawText(fb, fullName, cx, cy, { intensity: 1 });
      font.drawText(fb, fullName, cx + 1, cy, { intensity: 1 });
      const nameW = font.measureText(fullName) + 1;
      for (let x = cx; x < cx + nameW; x++) fb.set(x, cy + 8, 1);
      cy += 16;

      font.drawText(fb, "Work:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.work, cx + 36, cy, { intensity: 1 });
      cy += 12;

      font.drawText(fb, "Home:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.home, cx + 36, cy, { intensity: 1 });
      cy += 12;

      font.drawText(fb, "Addr:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.address, cx + 36, cy, { intensity: 1 });
      cy += 12;

      font.drawText(fb, "City:", cx, cy, { intensity: 1 });
      font.drawText(fb, c.city, cx + 36, cy, { intensity: 1 });
    } else {
      const visible = ADDRESS_DATA.slice(scrollY, scrollY + visibleCount);
      visible.forEach((c, i) => {
        const idx = scrollY + i;
        const rowY = APP_CONTENT_Y + oy + i * CONTACT_ROW_H;

        if (idx === selected) {
          fb.fillRect(ox, rowY, W, CONTACT_ROW_H, 1);
        }

        const intensity = idx === selected ? 0 : 1;
        const displayName = `${c.lastName}, ${c.firstName}`;
        font.drawText(fb, displayName, ox + 4, rowY + 2, { intensity });

        if (idx !== selected) {
          for (let x = ox; x < ox + W; x++) fb.set(x, rowY + CONTACT_ROW_H - 1, 0.3);
        }
      });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, detail, scrollY, visibleCount, maxScroll]);

  return (
    <>
      <TopStatusBar />
      <AppHeader title="Address" />
    </>
  );
}

// --- To Do List Screen ---

interface TodoItem {
  text: string;
  priority: number;
  checked: boolean;
}

const TODO_INIT: TodoItem[] = [
  { text: "Fix antenna", priority: 1, checked: false },
  { text: "Buy stylus", priority: 2, checked: false },
  { text: "Sync contacts", priority: 2, checked: false },
  { text: "Update firmware", priority: 3, checked: false },
  { text: "Clean screen", priority: 3, checked: false },
  { text: "Read manual", priority: 4, checked: false },
  { text: "Organize apps", priority: 4, checked: false },
  { text: "Back up data", priority: 5, checked: false },
];

const TODO_ROW_H = 12;

function TodoScreen({ onHome }: { onHome: () => void }) {
  const [items, setItems] = useState<TodoItem[]>(TODO_INIT.map(i => ({ ...i })));
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const visibleCount = Math.floor(APP_CONTENT_H / TODO_ROW_H);
  const maxScroll = Math.max(0, items.length - visibleCount);

  const onUp = useCallback(() => {
    setSelected(s => {
      const next = Math.max(0, s - 1);
      setScrollY(sc => Math.min(sc, next));
      return next;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected(s => {
      const next = Math.min(items.length - 1, s + 1);
      setScrollY(sc => {
        const minSc = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minSc));
      });
      return next;
    });
    return true;
  }, [items.length, visibleCount, maxScroll]);

  const onActivate = useCallback(() => {
    setItems(prev => {
      const next = [...prev];
      next[selected] = { ...next[selected], checked: !next[selected].checked };
      return next;
    });
    return true;
  }, [selected]);

  useFocus({
    rect: { x: offsetX, y: APP_CONTENT_Y + offsetY, width: W, height: APP_CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, APP_CONTENT_Y + oy, W, APP_CONTENT_H, 0);

    const visible = items.slice(scrollY, scrollY + visibleCount);
    visible.forEach((item, i) => {
      const idx = scrollY + i;
      const rowY = APP_CONTENT_Y + oy + i * TODO_ROW_H;

      if (idx === selected) {
        fb.fillRect(ox, rowY, W, TODO_ROW_H, 1);
      }

      const intensity = idx === selected ? 0 : 1;
      const inv = idx === selected;

      font.drawText(fb, String(item.priority), ox + 3, rowY + 2, { intensity });

      const cbX = ox + 12;
      const cbY = rowY + 2;
      for (let bx = 0; bx < 7; bx++) {
        fb.set(cbX + bx, cbY, inv ? 0 : 1);
        fb.set(cbX + bx, cbY + 6, inv ? 0 : 1);
      }
      for (let by = 0; by < 7; by++) {
        fb.set(cbX, cbY + by, inv ? 0 : 1);
        fb.set(cbX + 6, cbY + by, inv ? 0 : 1);
      }
      if (item.checked) {
        fb.fillRect(cbX + 2, cbY + 2, 3, 3, inv ? 0 : 1);
      }

      font.drawText(fb, item.text, ox + 22, rowY + 2, { intensity });

      if (!inv) {
        for (let x = ox; x < ox + W; x++) fb.set(x, rowY + TODO_ROW_H - 1, 0.3);
      }
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, items, selected, scrollY, visibleCount, maxScroll]);

  return (
    <>
      <TopStatusBar />
      <AppHeader title="To Do" />
    </>
  );
}

// --- Memo Pad Screen ---

interface MemoItem {
  title: string;
  body: string;
}

const MEMOS: MemoItem[] = [
  { title: "Meeting notes", body: "Discussed Q2 roadmap.\nAction items:\n- Update specs\n- Schedule review\n- Send summary" },
  { title: "Shopping list", body: "Milk\nEggs\nBread\nButter\nCoffee\nFruit" },
  { title: "Project ideas", body: "1. LCD emulator\n2. Retro PDA app\n3. Pixel font editor\n4. Palm theme pack" },
  { title: "Books to read", body: "- Code (Petzold)\n- SICP\n- Design Patterns\n- Mythical Man-Month" },
  { title: "Passwords (encrypted)", body: "[ENCRYPTED]\n\nUse HotSync to\ndecrypt on desktop." },
];

const MEMO_ROW_H = 12;

function MemoPadScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false);
  const [memoScroll, setMemoScroll] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const onCancel = useCallback(() => {
    if (viewing) { setViewing(false); setMemoScroll(0); }
    else onHome();
  }, [viewing, onHome]);

  useCancel(onCancel);

  const onUp = useCallback(() => {
    if (viewing) {
      setMemoScroll(s => Math.max(0, s - 1));
      return true;
    }
    setSelected(s => Math.max(0, s - 1));
    return true;
  }, [viewing]);

  const onDown = useCallback(() => {
    if (viewing) {
      const lines = MEMOS[selected].body.split("\n");
      setMemoScroll(s => Math.min(lines.length - 1, s + 1));
      return true;
    }
    setSelected(s => Math.min(MEMOS.length - 1, s + 1));
    return true;
  }, [viewing, selected]);

  const onActivate = useCallback(() => {
    if (viewing) { setViewing(false); setMemoScroll(0); }
    else setViewing(true);
    return true;
  }, [viewing]);

  useFocus({
    rect: { x: offsetX, y: APP_CONTENT_Y + offsetY, width: W, height: APP_CONTENT_H },
    order: 10,
    onUp, onDown, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, APP_CONTENT_Y + oy, W, APP_CONTENT_H, 0);

    if (viewing) {
      const memo = MEMOS[selected];
      let cy = APP_CONTENT_Y + oy + 2;

      font.drawText(fb, memo.title, ox + 4, cy, { intensity: 1 });
      font.drawText(fb, memo.title, ox + 5, cy, { intensity: 1 });
      const titleW = font.measureText(memo.title) + 1;
      for (let x = ox + 4; x < ox + 4 + titleW; x++) fb.set(x, cy + 8, 1);
      cy += 14;

      for (let x = ox; x < ox + W; x++) fb.set(x, cy, 0.4);
      cy += 4;

      const lines = memo.body.split("\n");
      const visibleLines = lines.slice(memoScroll);
      for (const line of visibleLines) {
        if (cy > APP_CONTENT_Y + oy + APP_CONTENT_H - 8) break;
        font.drawText(fb, line, ox + 4, cy, { intensity: 1 });
        cy += 10;
      }
    } else {
      MEMOS.forEach((memo, i) => {
        const rowY = APP_CONTENT_Y + oy + i * MEMO_ROW_H;

        if (i === selected) {
          fb.fillRect(ox, rowY, W, MEMO_ROW_H, 1);
        }

        const intensity = i === selected ? 0 : 1;
        font.drawText(fb, `${i + 1}. ${memo.title}`, ox + 4, rowY + 2, { intensity });

        if (i !== selected) {
          for (let x = ox; x < ox + W; x++) fb.set(x, rowY + MEMO_ROW_H - 1, 0.3);
        }
      });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, viewing, memoScroll]);

  return (
    <>
      <TopStatusBar />
      <AppHeader title="Memo Pad" />
    </>
  );
}

// --- Calculator Screen ---

const CALC_BUTTONS: string[][] = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", "", ".", "="],
];

const CALC_COLS = 4;
const CALC_ROWS = 5;
const CALC_BTN_W = Math.floor(W / CALC_COLS);
const CALC_DISPLAY_H = 22;
const CALC_DIVIDER_Y = APP_CONTENT_Y + CALC_DISPLAY_H;
const CALC_GRID_Y = CALC_DIVIDER_Y + 1;
const CALC_BTN_H = Math.floor((APP_CONTENT_H - CALC_DISPLAY_H - 1) / CALC_ROWS);

function CalcScreen({ onHome }: { onHome: () => void }) {
  const [display, setDisplay] = useState("0");
  const [operand, setOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [selRow, setSelRow] = useState(0);
  const [selCol, setSelCol] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const onCancel = useCallback(() => {
    if (display !== "0" || operand !== null || operator !== null) {
      setDisplay("0"); setOperand(null); setOperator(null); setResetNext(false);
    } else {
      onHome();
    }
  }, [display, operand, operator, onHome]);

  useCancel(onCancel);

  const pressButton = useCallback((label: string) => {
    if (label === "") return;
    if (label === "C") {
      setDisplay("0"); setOperand(null); setOperator(null); setResetNext(false); return;
    }
    if (label === "±") {
      setDisplay(d => String(-parseFloat(d))); return;
    }
    if (label === "%") {
      setDisplay(d => String(parseFloat(d) / 100)); return;
    }
    if (label === "÷" || label === "×" || label === "-" || label === "+") {
      const opMap: Record<string, string> = { "÷": "/", "×": "*", "-": "-", "+": "+" };
      setOperand(parseFloat(display));
      setOperator(opMap[label]);
      setResetNext(true);
      return;
    }
    if (label === "=") {
      if (operator !== null && operand !== null) {
        const cur = parseFloat(display);
        let result: number;
        if (operator === "/") result = operand / cur;
        else if (operator === "*") result = operand * cur;
        else if (operator === "-") result = operand - cur;
        else result = operand + cur;
        setDisplay(String(parseFloat(result.toPrecision(10))));
        setOperand(null); setOperator(null); setResetNext(true);
      }
      return;
    }
    if (label === ".") {
      setDisplay(d => {
        const base = resetNext ? "0" : d;
        if (base.includes(".")) return base;
        setResetNext(false);
        return base + ".";
      });
      return;
    }
    setDisplay(d => {
      if (resetNext) { setResetNext(false); return label; }
      if (d === "0") return label;
      return d + label;
    });
  }, [display, operand, operator, resetNext]);

  const onUp = useCallback(() => { setSelRow(r => Math.max(0, r - 1)); return true; }, []);
  const onDown = useCallback(() => { setSelRow(r => Math.min(CALC_ROWS - 1, r + 1)); return true; }, []);
  const onLeft = useCallback(() => {
    setSelCol(c => {
      let next = Math.max(0, c - 1);
      if (selRow === 4 && next === 1) next = 0;
      return next;
    });
    return true;
  }, [selRow]);
  const onRight = useCallback(() => {
    setSelCol(c => {
      let next = Math.min(CALC_COLS - 1, c + 1);
      if (selRow === 4 && next === 1) next = 2;
      return next;
    });
    return true;
  }, [selRow]);
  const onActivate = useCallback(() => {
    const label = CALC_BUTTONS[selRow][selCol];
    if (selRow === 4 && selCol === 1) return true;
    pressButton(label);
    return true;
  }, [selRow, selCol, pressButton]);

  useFocus({
    rect: { x: offsetX, y: APP_CONTENT_Y + offsetY, width: W, height: APP_CONTENT_H },
    order: 10,
    onUp, onDown, onLeft, onRight, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, APP_CONTENT_Y + oy, W, APP_CONTENT_H, 0);

    const displayText = display.length > 10 ? display.slice(0, 10) : display;
    const textW = font.measureText(displayText, 2);
    const textX = ox + W - textW - 4;
    const textY = APP_CONTENT_Y + oy + Math.floor((CALC_DISPLAY_H - 14) / 2);
    font.drawText(fb, displayText, textX, textY, { scale: 2, intensity: 1 });

    if (operator) {
      const opDisplay: Record<string, string> = { "/": "÷", "*": "×", "-": "-", "+": "+" };
      font.drawText(fb, opDisplay[operator] || operator, ox + 4, textY, { intensity: 0.6 });
    }

    for (let x = ox; x < ox + W; x++) fb.set(x, CALC_DIVIDER_Y + oy, 1);

    for (let row = 0; row < CALC_ROWS; row++) {
      for (let col = 0; col < CALC_COLS; col++) {
        const label = CALC_BUTTONS[row][col];
        if (row === 4 && col === 1) continue;

        const btnW = (row === 4 && col === 0) ? CALC_BTN_W * 2 : CALC_BTN_W;
        const bx = ox + col * CALC_BTN_W;
        const by = oy + CALC_GRID_Y + row * CALC_BTN_H;

        const isSel = row === selRow && (
          col === selCol || (row === 4 && col === 0 && selCol <= 1)
        );

        for (let i = 0; i < btnW; i++) {
          fb.set(bx + i, by, 0.4);
          fb.set(bx + i, by + CALC_BTN_H - 1, 0.4);
        }
        for (let i = 0; i < CALC_BTN_H; i++) {
          fb.set(bx, by + i, 0.4);
          fb.set(bx + btnW - 1, by + i, 0.4);
        }

        if (isSel) {
          fb.fillRect(bx + 1, by + 1, btnW - 2, CALC_BTN_H - 2, 1);
        }

        if (label) {
          const lw = font.measureText(label);
          const lx = bx + Math.floor((btnW - lw) / 2);
          const ly = by + Math.floor((CALC_BTN_H - 7) / 2);
          font.drawText(fb, label, lx, ly, { intensity: isSel ? 0 : 1 });
        }
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, display, operator, selRow, selCol]);

  return (
    <>
      <TopStatusBar />
      <AppHeader title="Calculator" />
    </>
  );
}

// --- Stub screens for new apps (Clock, Graffiti, HotSync, Mail, Note Pad, Security) ---

function StubScreen({ title, lines, onHome }: { title: string; lines: string[]; onHome: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  useCancel(onHome);

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, APP_CONTENT_Y + oy, W, APP_CONTENT_H, 0);
    let cy = APP_CONTENT_Y + oy + 8;
    for (const line of lines) {
      const lw = font.measureText(line);
      font.drawText(fb, line, ox + Math.floor((W - lw) / 2), cy, { intensity: 1 });
      cy += 12;
    }
    engine.markDirty();
  }, [engine, offsetX, offsetY, lines]);

  return (
    <>
      <TopStatusBar />
      <AppHeader title={title} />
    </>
  );
}

// --- Prefs Screen ---

function PrefsScreen({ onHome, theme, onThemeChange, camera, onCameraChange, pixelSize, onPixelSizeChange, perspective, onPerspectiveChange }: {
  onHome: () => void;
  theme: string;
  onThemeChange: (t: string) => void;
  camera: string;
  onCameraChange: (c: string) => void;
  pixelSize: number;
  onPixelSizeChange: (s: number) => void;
  perspective: boolean;
  onPerspectiveChange: (v: boolean) => void;
}) {
  const [selectedRow, setSelectedRow] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const ROW_COUNT = 4;
  const ROW_SPACING = 14;
  const FIRST_ROW_Y = APP_CONTENT_Y + 6;

  const getLabel = (row: number) => ["Theme", "Camera", "Pixels", "Persp."][row];
  const getValue = (row: number): string => {
    if (row === 0) return theme;
    if (row === 1) return camera;
    if (row === 2) return String(pixelSize);
    return perspective ? "ON" : "OFF";
  };

  const cycleLeft = useCallback((row: number) => {
    if (row === 0) {
      const idx = THEMES.indexOf(theme);
      onThemeChange(THEMES[(idx - 1 + THEMES.length) % THEMES.length]);
    } else if (row === 1) {
      const idx = CAMERAS.indexOf(camera);
      onCameraChange(CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length]);
    } else if (row === 2) {
      const idx = PIXEL_SIZES.indexOf(pixelSize);
      onPixelSizeChange(PIXEL_SIZES[Math.max(0, idx - 1)]);
    } else {
      onPerspectiveChange(!perspective);
    }
  }, [theme, camera, pixelSize, perspective, onThemeChange, onCameraChange, onPixelSizeChange, onPerspectiveChange]);

  const cycleRight = useCallback((row: number) => {
    if (row === 0) {
      const idx = THEMES.indexOf(theme);
      onThemeChange(THEMES[(idx + 1) % THEMES.length]);
    } else if (row === 1) {
      const idx = CAMERAS.indexOf(camera);
      onCameraChange(CAMERAS[(idx + 1) % CAMERAS.length]);
    } else if (row === 2) {
      const idx = PIXEL_SIZES.indexOf(pixelSize);
      onPixelSizeChange(PIXEL_SIZES[Math.min(PIXEL_SIZES.length - 1, idx + 1)]);
    } else {
      onPerspectiveChange(!perspective);
    }
  }, [theme, camera, pixelSize, perspective, onThemeChange, onCameraChange, onPixelSizeChange, onPerspectiveChange]);

  const onUp = useCallback(() => { setSelectedRow(r => Math.max(0, r - 1)); return true; }, []);
  const onDown = useCallback(() => { setSelectedRow(r => Math.min(ROW_COUNT - 1, r + 1)); return true; }, []);
  const onLeft = useCallback(() => { cycleLeft(selectedRow); return true; }, [selectedRow, cycleLeft]);
  const onRight = useCallback(() => { cycleRight(selectedRow); return true; }, [selectedRow, cycleRight]);

  useFocus({
    rect: { x: offsetX, y: APP_CONTENT_Y + offsetY, width: W, height: APP_CONTENT_H },
    order: 10,
    onUp, onDown, onLeft, onRight,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, APP_CONTENT_Y + oy, W, APP_CONTENT_H, 0);

    for (let row = 0; row < ROW_COUNT; row++) {
      const rowY = FIRST_ROW_Y + row * ROW_SPACING + oy;
      const label = getLabel(row);
      const value = `< ${getValue(row)} >`;
      const valueW = font.measureText(value);
      const isSel = row === selectedRow;

      if (isSel) {
        fb.fillRect(ox, rowY - 2, W, ROW_SPACING, 1);
      }

      font.drawText(fb, label, ox + 6, rowY, { intensity: isSel ? 0 : 1 });
      font.drawText(fb, value, ox + W - valueW - 6, rowY, { intensity: isSel ? 0 : 0.6 });

      if (!isSel && row < ROW_COUNT - 1) {
        const divY = rowY + ROW_SPACING - 3;
        for (let x = ox; x < ox + W; x++) fb.set(x, divY, 0.2);
      }
    }

    const noticeY = FIRST_ROW_Y + ROW_COUNT * ROW_SPACING + 6 + oy;
    for (let x = ox; x < ox + W; x++) fb.set(x, noticeY - 3, 0.3);
    const hint = "Changes apply live";
    const hintW = font.measureText(hint);
    font.drawText(fb, hint, ox + Math.floor((W - hintW) / 2), noticeY, { intensity: 0.5 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selectedRow, theme, camera, pixelSize, perspective]);

  return (
    <>
      <TopStatusBar />
      <AppHeader title="Preferences" />
    </>
  );
}

// --- Main Palm Mode ---

export function PalmMode({ onExit, camera, setCamera, perspective, setPerspective, pixelSize, setPixelSize }: {
  onExit: () => void;
  camera: string;
  setCamera: (fn: (s: string) => string) => void;
  perspective: boolean;
  setPerspective: (fn: (s: boolean) => boolean) => void;
  pixelSize: number;
  setPixelSize: (fn: (s: number) => number) => void;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [theme, setTheme] = useState<string>("palm");

  const goHome = useCallback(() => setScreen("home"), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize(s => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize(s => Math.min(8, s + 1));
      } else if (e.key === "," || e.key === "<") {
        setCamera(c => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length];
        });
      } else if (e.key === "." || e.key === ">") {
        setCamera(c => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx + 1) % CAMERAS.length];
        });
      } else if (e.key === "\\") {
        setPerspective(p => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#111",
      overflow: "hidden",
    }}>
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={theme as ThemePresetName} camera={camera} perspective={perspective}>
        <ScreenClear screen={screen} />

        {screen === "home" && <HomeScreen onNavigate={setScreen} onExit={onExit} />}
        {screen === "datebook" && <DateBookScreen onHome={goHome} />}
        {screen === "address" && <AddressScreen onHome={goHome} />}
        {screen === "todo" && <TodoScreen onHome={goHome} />}
        {screen === "memo" && <MemoPadScreen onHome={goHome} />}
        {screen === "calc" && <CalcScreen onHome={goHome} />}
        {screen === "clock" && <StubScreen title="Clock" lines={[formatPalmTime()]} onHome={goHome} />}
        {screen === "graffiti" && <StubScreen title="Graffiti" lines={["Stylus input", "demo area"]} onHome={goHome} />}
        {screen === "hotsync" && <StubScreen title="HotSync" lines={["Connect to PC", "to sync data"]} onHome={goHome} />}
        {screen === "mail" && <StubScreen title="Mail" lines={["No new messages"]} onHome={goHome} />}
        {screen === "notepad" && <StubScreen title="Note Pad" lines={["Tap to draw", "a new note"]} onHome={goHome} />}
        {screen === "security" && <StubScreen title="Security" lines={["Device locked", "Enter password"]} onHome={goHome} />}
        {screen === "prefs" && <PrefsScreen onHome={goHome} theme={theme} onThemeChange={setTheme} camera={camera} onCameraChange={(c) => setCamera(() => c)} pixelSize={pixelSize} onPixelSizeChange={(s) => setPixelSize(() => s)} perspective={perspective} onPerspectiveChange={(v) => setPerspective(() => v)} />}
      </LCDScreen>
    </div>
  );
}

// Helper: clear entire framebuffer when screen changes
function ScreenClear({ screen }: { screen: string }) {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    engine.fb.fillRect(offsetX, offsetY, W, H, 0);
    engine.markDirty();
  }, [engine, offsetX, offsetY, screen]);
  return null;
}
