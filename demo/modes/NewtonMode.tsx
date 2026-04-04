import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  LCDText,
  LCDPanel,
  LCDIcon,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont();

const W = 240;
const H = 320;
const TITLE_H = 16;
const BOTTOM_H = 20;
const CONTENT_Y = TITLE_H + 2; // 2px thick divider
const CONTENT_H = H - TITLE_H - 2 - BOTTOM_H - 2;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

type Screen = "extras" | "notepad" | "names" | "dates" | "calc" | "prefs";

function useCancel(onBack: () => void) {
  const { engine } = useLCD();
  useEffect(() => {
    engine.focus.onCancel(onBack);
    return () => engine.focus.offCancel(onBack);
  }, [engine, onBack]);
}

function ClearRect({ x, y, width, height, deps }: {
  x: number; y: number; width: number; height: number; deps: unknown[];
}) {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    engine.fb.fillRect(x + offsetX, y + offsetY, width, height, 0);
    engine.markDirty();
  }, [engine, x, y, width, height, offsetX, offsetY, ...deps]);
  return null;
}

// --- Thick Divider (2px) ---

function ThickDivider({ y }: { y: number }) {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    const fb = engine.fb;
    const oy = offsetY + y;
    for (let x = offsetX; x < offsetX + W; x++) {
      fb.set(x, oy, 1);
      fb.set(x, oy + 1, 1);
    }
    engine.markDirty();
  }, [engine, offsetX, offsetY, y]);
  return null;
}

// --- Newton Title Bar (16px tall) ---

function TitleBar({ title }: { title: string }) {
  const titleW = font.measureText(title);
  const titleX = Math.floor((W - titleW) / 2);
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Close/routing box on left (small 5x5 bordered square)
    const boxX = ox + 4;
    const boxY = oy + 5;
    for (let i = 0; i < 6; i++) {
      fb.set(boxX + i, boxY, 1);
      fb.set(boxX + i, boxY + 5, 1);
    }
    for (let i = 1; i < 5; i++) {
      fb.set(boxX, boxY + i, 1);
      fb.set(boxX + 5, boxY + i, 1);
    }

    // Action diamond on right
    const dx = ox + W - 10;
    const dy = oy + 8;
    fb.set(dx, dy, 1);
    fb.set(dx - 1, dy - 1, 1);
    fb.set(dx + 1, dy - 1, 1);
    fb.set(dx - 1, dy + 1, 1);
    fb.set(dx + 1, dy + 1, 1);
    fb.set(dx - 2, dy, 1);
    fb.set(dx + 2, dy, 1);
    fb.set(dx, dy - 2, 1);
    fb.set(dx, dy + 2, 1);

    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return (
    <>
      <LCDPanel x={0} y={0} width={W} height={TITLE_H} border={false}>
        <LCDText x={titleX} y={4}>{title}</LCDText>
      </LCDPanel>
      <ThickDivider y={TITLE_H} />
    </>
  );
}

// --- Newton Bottom Bar (20px tall, 4 labeled sections) ---

const BOTTOM_LABELS = ["Assist", "Undo", "Find", "Extras"];
const BOTTOM_SYMBOLS = ["\x07", "\x08", "\x09", "\x0a"]; // placeholders, we draw custom

function BottomBar({ onExtras }: { onExtras: () => void }) {
  const barY = H - BOTTOM_H;
  const divY = barY - 2;
  const sectionW = Math.floor(W / 4);
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    const by = barY + oy;

    // Clear bar area
    fb.fillRect(ox, by, W, BOTTOM_H, 0);

    // Vertical separators between sections
    for (let i = 1; i < 4; i++) {
      const sx = ox + i * sectionW;
      for (let y = by + 2; y < by + BOTTOM_H - 2; y++) {
        fb.set(sx, y, 0.6);
      }
    }

    // Draw symbols and labels for each section
    BOTTOM_LABELS.forEach((label, i) => {
      const cx = ox + i * sectionW + Math.floor(sectionW / 2);

      // Draw small symbol above label
      const sy = by + 2;
      if (i === 0) {
        // Star for Assist
        fb.set(cx, sy, 1);
        fb.set(cx - 1, sy + 1, 1);
        fb.set(cx + 1, sy + 1, 1);
        fb.set(cx - 2, sy, 1);
        fb.set(cx + 2, sy, 1);
        fb.set(cx - 1, sy - 1, 1);
        fb.set(cx + 1, sy - 1, 1);
      } else if (i === 1) {
        // Curved arrow for Undo
        fb.set(cx - 2, sy, 1);
        fb.set(cx - 1, sy - 1, 1);
        fb.set(cx, sy - 1, 1);
        fb.set(cx + 1, sy, 1);
        fb.set(cx, sy + 1, 1);
        fb.set(cx - 1, sy + 1, 1);
        fb.set(cx - 3, sy + 1, 1);
      } else if (i === 2) {
        // Magnifier for Find
        fb.set(cx - 1, sy - 1, 1);
        fb.set(cx, sy - 1, 1);
        fb.set(cx - 2, sy, 1);
        fb.set(cx + 1, sy, 1);
        fb.set(cx - 1, sy + 1, 1);
        fb.set(cx, sy + 1, 1);
        fb.set(cx + 1, sy + 2, 1);
        fb.set(cx + 2, sy + 3, 1);
      } else {
        // Grid for Extras/Overview
        for (let gx = -2; gx <= 2; gx += 2) {
          for (let gy = -1; gy <= 1; gy += 2) {
            fb.set(cx + gx, sy + gy, 1);
          }
        }
      }

      // Label text centered below symbol
      const lw = font.measureText(label);
      const lx = cx - Math.floor(lw / 2);
      font.drawText(fb, label, lx, by + 10, { intensity: 0.9 });
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, barY, sectionW]);

  return (
    <>
      <ThickDivider y={barY - 2} />
      <BottomBarHitTarget sectionIndex={3} sectionW={sectionW} barY={barY} onActivate={onExtras} />
    </>
  );
}

function BottomBarHitTarget({ sectionIndex, sectionW, barY, onActivate }: {
  sectionIndex: number; sectionW: number; barY: number; onActivate: () => void;
}) {
  const { offsetX, offsetY } = useLCD();
  useFocus({
    rect: {
      x: offsetX + sectionIndex * sectionW,
      y: offsetY + barY,
      width: sectionW,
      height: BOTTOM_H,
    },
    order: 900,
    onActivate,
  });
  return null;
}

// --- Extras Screen ---

interface ExtrasIcon {
  name: string;
  icon: string;
  screen: Screen;
}

const EXTRAS_ICONS: ExtrasIcon[] = [
  { name: "Notepad", icon: "notepad", screen: "notepad" },
  { name: "Names", icon: "person", screen: "names" },
  { name: "Dates", icon: "calendar", screen: "dates" },
  { name: "Calc", icon: "calculator", screen: "calc" },
  { name: "Prefs", icon: "prefs", screen: "prefs" },
];

const GRID_COLS = 3;
const ICON_SCALE = 2;
const ICON_PX = 8 * ICON_SCALE; // 16x16
const CELL_W = 70;
const CELL_H = 40;
const GRID_START_X = Math.floor((W - GRID_COLS * CELL_W) / 2);
const GRID_START_Y = CONTENT_Y + 28;

function ExtrasScreen({ onNavigate, onExit }: {
  onNavigate: (s: Screen) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const { offsetX, offsetY } = useLCD();

  useCancel(onExit);

  const rows = Math.ceil(EXTRAS_ICONS.length / GRID_COLS);

  const onUp = useCallback(() => {
    setSelected((s) => {
      const row = Math.floor(s / GRID_COLS);
      if (row <= 0) return s;
      return s - GRID_COLS;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected((s) => {
      const next = s + GRID_COLS;
      if (next >= EXTRAS_ICONS.length) return s;
      return next;
    });
    return true;
  }, []);

  const onLeft = useCallback(() => {
    setSelected((s) => (s > 0 ? s - 1 : s));
    return true;
  }, []);

  const onRight = useCallback(() => {
    setSelected((s) => (s < EXTRAS_ICONS.length - 1 ? s + 1 : s));
    return true;
  }, []);

  const onActivate = useCallback(() => {
    onNavigate(EXTRAS_ICONS[selected].screen);
  }, [selected, onNavigate]);

  useFocus({
    rect: { x: offsetX, y: GRID_START_Y + offsetY, width: W, height: rows * CELL_H },
    order: 10,
    onUp,
    onDown,
    onLeft,
    onRight,
    onActivate,
  });

  const titleText = "Extras";
  const titleW = font.measureText(titleText);
  const titleX = Math.floor((W - titleW) / 2);

  const subtitle = "Newton";
  const subW = font.measureText(subtitle);
  const subX = Math.floor((W - subW) / 2);

  return (
    <>
      <TitleBar title="Extras" />
      <LCDText x={titleX} y={CONTENT_Y + 4}>{titleText}</LCDText>
      <LCDText x={subX} y={CONTENT_Y + 14}>{subtitle}</LCDText>

      {EXTRAS_ICONS.map((item, i) => {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const cx = GRID_START_X + col * CELL_W + Math.floor(CELL_W / 2);
        const cy = GRID_START_Y + row * CELL_H;
        const iconX = cx - Math.floor(ICON_PX / 2);
        const iconY = cy;
        const labelW = font.measureText(item.name);
        const labelX = cx - Math.floor(labelW / 2);
        const isSel = i === selected;

        return (
          <ExtrasIconCell
            key={item.icon}
            iconX={iconX}
            iconY={iconY}
            iconName={item.icon}
            label={item.name}
            labelX={labelX}
            labelY={iconY + ICON_PX + 4}
            selected={isSel}
          />
        );
      })}

      <BottomBar onExtras={() => {}} />
    </>
  );
}

function ExtrasIconCell({ iconX, iconY, iconName, label, labelX, labelY, selected }: {
  iconX: number; iconY: number; iconName: string;
  label: string; labelX: number; labelY: number;
  selected: boolean;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;
    const ax = iconX + offsetX;
    const ay = iconY + offsetY;
    // 2px thick selection border
    const bx = ax - 3;
    const by = ay - 3;
    const bw = ICON_PX + 6;
    const bh = ICON_PX + 6;

    // Clear old border area
    for (let t = 0; t < 2; t++) {
      for (let i = 0; i < bw; i++) {
        fb.set(bx + i, by + t, selected ? 1 : 0);
        fb.set(bx + i, by + bh - 1 - t, selected ? 1 : 0);
      }
      for (let i = 2; i < bh - 2; i++) {
        fb.set(bx + t, by + i, selected ? 1 : 0);
        fb.set(bx + bw - 1 - t, by + i, selected ? 1 : 0);
      }
    }
    engine.markDirty();
  }, [engine, offsetX, offsetY, iconX, iconY, selected]);

  return (
    <>
      <LCDIcon x={iconX} y={iconY} name={iconName} scale={ICON_SCALE} intensity={1} />
      <LCDText x={labelX} y={labelY}>{label}</LCDText>
    </>
  );
}

// --- Notepad Screen ---

interface NotepadItem {
  text: string;
  checked?: boolean;
}

const NOTEPAD_DATA: NotepadItem[] = [
  { text: "Welcome to Newton!" },
  { text: "Tap items to interact" },
  { text: "" },
  { text: "Shopping List:" },
  { text: "Milk", checked: false },
  { text: "Eggs", checked: true },
  { text: "Bread", checked: false },
  { text: "Butter", checked: true },
  { text: "" },
  { text: "Ideas:" },
  { text: "Learn to draw" },
  { text: "Fix the roof" },
  { text: "Call Mom", checked: false },
  { text: "Book flights", checked: true },
];

const LINE_H = 16;

function NotepadScreen({ onExtras }: {
  onExtras: () => void;
}) {
  const [items, setItems] = useState<NotepadItem[]>(NOTEPAD_DATA.map(i => ({ ...i })));
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useCancel(onExtras);

  const visibleCount = Math.floor(CONTENT_H / LINE_H);
  const maxScroll = Math.max(0, items.length - visibleCount);

  const onUp = useCallback(() => {
    setSelected((s) => {
      const next = Math.max(0, s - 1);
      setScrollY((sc) => Math.min(sc, next));
      return next;
    });
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelected((s) => {
      const next = Math.min(items.length - 1, s + 1);
      setScrollY((sc) => {
        const minScroll = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minScroll));
      });
      return next;
    });
    return true;
  }, [items.length, visibleCount, maxScroll]);

  const onActivate = useCallback(() => {
    setItems((prev) => {
      const item = prev[selected];
      if (item.checked === undefined) return prev;
      const next = [...prev];
      next[selected] = { ...item, checked: !item.checked };
      return next;
    });
    return true;
  }, [selected]);

  const { engine, offsetX, offsetY } = useLCD();

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Clear content area
    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    // Thick top border line (2px)
    for (let x = ox + 8; x < ox + W - 8; x++) {
      fb.set(x, CONTENT_Y + oy + 1, 0.6);
      fb.set(x, CONTENT_Y + oy + 2, 0.6);
    }

    // Draw ruled lines with visible intensity
    for (let row = 0; row < visibleCount; row++) {
      const lineY = CONTENT_Y + oy + row * LINE_H + LINE_H - 1;
      for (let x = ox + 8; x < ox + W - 14; x++) {
        fb.set(x, lineY, 0.25);
      }
    }

    // Draw items
    const visible = items.slice(scrollY, scrollY + visibleCount);
    visible.forEach((item, i) => {
      const itemIdx = scrollY + i;
      const itemY = CONTENT_Y + oy + i * LINE_H + 4;

      // Highlight selected row
      if (itemIdx === selected) {
        fb.fillRect(ox + 8, CONTENT_Y + oy + i * LINE_H + 1, W - 22, LINE_H - 2, 0.1);
      }

      if (item.text === "") return;

      if (item.checked !== undefined) {
        // Draw checkbox 8x8 at x=10
        const cbX = ox + 10;
        const cbY = itemY;
        for (let bx = 0; bx < 8; bx++) {
          fb.set(cbX + bx, cbY, 1);
          fb.set(cbX + bx, cbY + 7, 1);
        }
        for (let by = 0; by < 8; by++) {
          fb.set(cbX, cbY + by, 1);
          fb.set(cbX + 7, cbY + by, 1);
        }
        // Checkmark if checked
        if (item.checked) {
          fb.set(cbX + 2, cbY + 4, 1);
          fb.set(cbX + 3, cbY + 5, 1);
          fb.set(cbX + 4, cbY + 4, 1);
          fb.set(cbX + 5, cbY + 3, 1);
          fb.set(cbX + 6, cbY + 2, 1);
        }
        font.drawText(fb, item.text, ox + 22, itemY, { intensity: 1 });
      } else {
        // Bullet point for non-checkbox items
        const bx = ox + 10;
        const by = itemY + 3;
        fb.set(bx, by, 1);
        fb.set(bx + 1, by, 1);
        fb.set(bx, by + 1, 1);
        fb.set(bx + 1, by + 1, 1);
        font.drawText(fb, item.text, ox + 16, itemY, { intensity: 1 });
      }
    });

    // Scroll arrows on right margin instead of scrollbar
    if (items.length > visibleCount) {
      const arrowX = ox + W - 10;

      // Up arrow (triangle)
      const upY = CONTENT_Y + oy + 4;
      fb.set(arrowX + 2, upY, 1);
      fb.set(arrowX + 1, upY + 1, 1);
      fb.set(arrowX + 2, upY + 1, 1);
      fb.set(arrowX + 3, upY + 1, 1);
      fb.set(arrowX, upY + 2, 1);
      fb.set(arrowX + 1, upY + 2, 1);
      fb.set(arrowX + 2, upY + 2, 1);
      fb.set(arrowX + 3, upY + 2, 1);
      fb.set(arrowX + 4, upY + 2, 1);

      // Down arrow (triangle)
      const dnY = CONTENT_Y + oy + CONTENT_H - 8;
      fb.set(arrowX, dnY, 1);
      fb.set(arrowX + 1, dnY, 1);
      fb.set(arrowX + 2, dnY, 1);
      fb.set(arrowX + 3, dnY, 1);
      fb.set(arrowX + 4, dnY, 1);
      fb.set(arrowX + 1, dnY + 1, 1);
      fb.set(arrowX + 2, dnY + 1, 1);
      fb.set(arrowX + 3, dnY + 1, 1);
      fb.set(arrowX + 2, dnY + 2, 1);
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, items, selected, scrollY, visibleCount, maxScroll]);

  return (
    <>
      <TitleBar title="Notepad" />
      <BottomBar onExtras={onExtras} />
    </>
  );
}

// --- Names Screen ---

interface Contact {
  name: string;
  phone: string;
  address: string;
  email: string;
}

const CONTACTS: Contact[] = [
  { name: "Ada Lovelace", phone: "555-0101", address: "12 Math Lane", email: "ada@engine.co" },
  { name: "Alan Turing", phone: "555-0102", address: "7 Bletchley Rd", email: "alan@enigma.uk" },
  { name: "Bob Kahn", phone: "555-0201", address: "9 Internet Ave", email: "bob@tcp.net" },
  { name: "Claude Shannon", phone: "555-0301", address: "1 Bit Street", email: "claude@info.io" },
  { name: "Dennis Ritchie", phone: "555-0401", address: "4 Unix Way", email: "dmr@bell.com" },
  { name: "Grace Hopper", phone: "555-0701", address: "3 Navy Blvd", email: "grace@cobol.mil" },
  { name: "John von Neumann", phone: "555-1001", address: "5 Logic Dr", email: "jvn@ias.edu" },
  { name: "Nikola Tesla", phone: "555-1401", address: "8 AC Current Pl", email: "nikola@tesla.rs" },
];

const TAB_W = 16;
const CONTACT_H = 24;

function NamesScreen({ onExtras }: {
  onExtras: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { engine, offsetX, offsetY } = useLCD();

  const letters = Array.from(new Set(CONTACTS.map(c => c.name[0]))).sort();

  const onCancel = useCallback(() => {
    if (expanded) {
      setExpanded(false);
    } else {
      onExtras();
    }
  }, [expanded, onExtras]);

  useCancel(onCancel);

  const onUp = useCallback(() => {
    if (expanded) return false;
    setSelected(s => Math.max(0, s - 1));
    return true;
  }, [expanded]);

  const onDown = useCallback(() => {
    if (expanded) return false;
    setSelected(s => Math.min(CONTACTS.length - 1, s + 1));
    return true;
  }, [expanded]);

  const onActivate = useCallback(() => {
    setExpanded(e => !e);
    return true;
  }, []);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    if (expanded) {
      const contact = CONTACTS[selected];
      const cx = ox + 12;
      let cy = CONTENT_Y + oy + 12;

      // Contact card with thick 2px border
      const cardX = ox + 8;
      const cardY = CONTENT_Y + oy + 4;
      const cardW = W - 16;
      const cardH = CONTENT_H - 24;
      for (let t = 0; t < 2; t++) {
        for (let i = 0; i < cardW; i++) {
          fb.set(cardX + i, cardY + t, 1);
          fb.set(cardX + i, cardY + cardH - 1 - t, 1);
        }
        for (let i = 2; i < cardH - 2; i++) {
          fb.set(cardX + t, cardY + i, 1);
          fb.set(cardX + cardW - 1 - t, cardY + i, 1);
        }
      }

      // Name with underline
      font.drawText(fb, contact.name, cx, cy, { intensity: 1 });
      const nameW = font.measureText(contact.name);
      for (let x = cx; x < cx + nameW; x++) fb.set(x, cy + 8, 1);
      cy += 20;

      // Ruled separator
      for (let x = cx; x < ox + W - 12; x++) fb.set(x, cy - 4, 0.3);

      font.drawText(fb, `Tel: ${contact.phone}`, cx, cy, { intensity: 0.9 });
      cy += 16;

      // Ruled separator
      for (let x = cx; x < ox + W - 12; x++) fb.set(x, cy - 4, 0.3);

      font.drawText(fb, `Addr: ${contact.address}`, cx, cy, { intensity: 0.9 });
      cy += 16;

      // Ruled separator
      for (let x = cx; x < ox + W - 12; x++) fb.set(x, cy - 4, 0.3);

      font.drawText(fb, `Mail: ${contact.email}`, cx, cy, { intensity: 0.9 });

      // Hint at bottom
      const hint = "Esc to go back";
      const hintW = font.measureText(hint);
      const hintX = ox + Math.floor((W - hintW) / 2);
      font.drawText(fb, hint, hintX, cardY + cardH + 4, { intensity: 0.5 });
    } else {
      // Tab strip on left with thick border
      const selLetter = CONTACTS[selected].name[0];

      // Thick vertical divider for tab strip
      for (let y = CONTENT_Y + oy; y < CONTENT_Y + oy + CONTENT_H; y++) {
        fb.set(ox + TAB_W, y, 1);
        fb.set(ox + TAB_W + 1, y, 1);
      }

      letters.forEach((letter, i) => {
        const tabY = CONTENT_Y + oy + i * 14 + 4;
        const isSel = letter === selLetter;
        if (isSel) {
          fb.fillRect(ox + 1, tabY - 2, TAB_W - 1, 12, 1);
          font.drawText(fb, letter, ox + 4, tabY, { intensity: 0 });
        } else {
          font.drawText(fb, letter, ox + 4, tabY, { intensity: 0.7 });
        }
      });

      // Contact list with thick bordered panels
      const listX = ox + TAB_W + 6;
      CONTACTS.forEach((contact, i) => {
        const itemY = CONTENT_Y + oy + i * CONTACT_H;
        if (i === selected) {
          fb.fillRect(ox + TAB_W + 2, itemY + 1, W - TAB_W - 4, CONTACT_H - 2, 0.12);
        }
        font.drawText(fb, contact.name, listX, itemY + 4, { intensity: 1 });
        font.drawText(fb, contact.phone, listX, itemY + 14, { intensity: 0.6 });

        // Ruled separator line
        const sepY = itemY + CONTACT_H - 1;
        for (let x = ox + TAB_W + 2; x < ox + W - 2; x++) {
          fb.set(x, sepY, 0.3);
        }
      });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, expanded, letters]);

  return (
    <>
      <TitleBar title="Names" />
      <BottomBar onExtras={onExtras} />
    </>
  );
}

// --- Dates Screen ---

const SAMPLE_EVENTS: Record<string, string[]> = {
  "2026-04-04": ["Team standup 9am", "Lunch with Ada"],
  "2026-04-07": ["Dentist 2pm"],
  "2026-04-15": ["Tax day"],
  "2026-04-22": ["Earth Day picnic"],
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DatesScreen({ onExtras }: {
  onExtras: () => void;
}) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3); // April (0-indexed)
  const [selectedDay, setSelectedDay] = useState(4);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onExtras);

  const onLeft = useCallback(() => {
    setSelectedDay(d => Math.max(1, d - 1));
    return true;
  }, []);

  const onRight = useCallback(() => {
    setSelectedDay(d => {
      const dim = new Date(year, month + 1, 0).getDate();
      return Math.min(dim, d + 1);
    });
    return true;
  }, [year, month]);

  const onUp = useCallback(() => {
    setSelectedDay(d => Math.max(1, d - 7));
    return true;
  }, []);

  const onDown = useCallback(() => {
    setSelectedDay(d => {
      const dim = new Date(year, month + 1, 0).getDate();
      return Math.min(dim, d + 7);
    });
    return true;
  }, [year, month]);

  const onActivate = useCallback(() => {
    setMonth(m => {
      if (m >= 11) {
        setYear(y => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDay(1);
    return true;
  }, []);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
    onLeft,
    onRight,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    const CELL_W = Math.floor((W - 16) / 7);
    const CAL_X = 8;
    const CAL_Y = CONTENT_Y + 20;
    const GRID_Y = CAL_Y + 14;
    const CELL_H_CAL = 14;

    // Month header with thick underline
    const headerY = CONTENT_Y + 6;
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;
    const labelW = font.measureText(monthLabel);
    const labelX = ox + Math.floor((W - labelW) / 2);
    font.drawText(fb, "<", ox + 8, headerY, { intensity: 0.7 });
    font.drawText(fb, monthLabel, labelX, headerY, { intensity: 1 });
    font.drawText(fb, ">", ox + W - 8 - font.measureText(">"), headerY, { intensity: 0.7 });

    // Thick divider under month header (2px)
    for (let x = ox + 8; x < ox + W - 8; x++) {
      fb.set(x, headerY + oy - oy + 10, 0.5);
      fb.set(x, headerY + oy - oy + 11, 0.5);
    }

    // Day-of-week headers
    const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    DOW.forEach((d, i) => {
      const dx = ox + CAL_X + i * CELL_W + Math.floor((CELL_W - font.measureText(d)) / 2);
      font.drawText(fb, d, dx, CAL_Y, { intensity: 0.8 });
    });

    // Divider under day headers (2px)
    const divY1 = CAL_Y + 10;
    for (let x = ox + 8; x < ox + W - 8; x++) {
      fb.set(x, divY1, 0.4);
      fb.set(x, divY1 + 1, 0.4);
    }

    // Calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysCount; day++) {
      const slot = firstDay + day - 1;
      const col = slot % 7;
      const row = Math.floor(slot / 7);
      const cellX = ox + CAL_X + col * CELL_W;
      const cellY = oy + GRID_Y + row * CELL_H_CAL;

      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const key = `${year}-${mm}-${dd}`;
      const hasEvents = !!SAMPLE_EVENTS[key];

      const numStr = String(day);
      const numW = font.measureText(numStr);
      const numX = cellX + Math.floor((CELL_W - numW) / 2);
      const numY = cellY + 2;

      if (day === selectedDay) {
        // Inverted selection
        fb.fillRect(cellX + 1, cellY, CELL_W - 2, CELL_H_CAL - 1, 1);
        font.drawText(fb, numStr, numX, numY, { intensity: 0 });
      } else {
        font.drawText(fb, numStr, numX, numY, { intensity: 1 });
        if (hasEvents) {
          const dotX = cellX + Math.floor(CELL_W / 2);
          const dotY = cellY + CELL_H_CAL - 3;
          fb.set(dotX, dotY, 0.8);
          fb.set(dotX + 1, dotY, 0.8);
        }
      }
    }

    // Rows used
    const totalSlots = firstDay + daysCount;
    const rowsUsed = Math.ceil(totalSlots / 7);
    const gridBottom = oy + GRID_Y + rowsUsed * CELL_H_CAL + 4;

    // Thick divider below grid (2px)
    for (let x = ox + 8; x < ox + W - 8; x++) {
      fb.set(x, gridBottom, 0.4);
      fb.set(x, gridBottom + 1, 0.4);
    }

    // Event detail area
    const eventY = gridBottom + 8;
    const mm2 = String(month + 1).padStart(2, "0");
    const dd2 = String(selectedDay).padStart(2, "0");
    const selKey = `${year}-${mm2}-${dd2}`;
    const events = SAMPLE_EVENTS[selKey];

    if (events && events.length > 0) {
      events.forEach((ev, i) => {
        // Bullet + text
        const bx = ox + 10;
        const by = eventY + i * 14 + 3;
        fb.set(bx, by, 1);
        fb.set(bx + 1, by, 1);
        fb.set(bx, by + 1, 1);
        fb.set(bx + 1, by + 1, 1);
        font.drawText(fb, ev, ox + 16, eventY + i * 14, { intensity: 1 });
      });
    } else {
      font.drawText(fb, "No events", ox + 10, eventY, { intensity: 0.4 });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, year, month, selectedDay]);

  return (
    <>
      <TitleBar title="Dates" />
      <BottomBar onExtras={onExtras} />
    </>
  );
}

// --- Calc Screen ---

const CALC_BUTTONS: string[][] = [
  ["C", "\xb1", "%", "\xf7"],
  ["7", "8", "9", "\xd7"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", "", ".", "="],
];

const CALC_COLS = 4;
const CALC_ROWS = 5;
const CALC_BTN_W = Math.floor((W - 16) / CALC_COLS);
const CALC_DISPLAY_H = 32;
const CALC_DIVIDER_Y = CONTENT_Y + CALC_DISPLAY_H;
const CALC_GRID_Y = CALC_DIVIDER_Y + 2;
const CALC_BTN_H = Math.floor((CONTENT_H - CALC_DISPLAY_H - 2) / CALC_ROWS);
const CALC_GRID_X = 8;

function CalcScreen({ onExtras }: { onExtras: () => void }) {
  const [display, setDisplay] = useState("0");
  const [operand, setOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);
  const [selRow, setSelRow] = useState(0);
  const [selCol, setSelCol] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const onCancel = useCallback(() => {
    if (display !== "0" || operand !== null || operator !== null) {
      setDisplay("0");
      setOperand(null);
      setOperator(null);
      setResetNext(false);
    } else {
      onExtras();
    }
  }, [display, operand, operator, onExtras]);

  useCancel(onCancel);

  const pressButton = useCallback((label: string) => {
    if (label === "") return;

    if (label === "C") {
      setDisplay("0");
      setOperand(null);
      setOperator(null);
      setResetNext(false);
      return;
    }

    if (label === "\xb1") {
      setDisplay(d => {
        const n = parseFloat(d);
        return String(-n);
      });
      return;
    }

    if (label === "%") {
      setDisplay(d => {
        const n = parseFloat(d);
        return String(n / 100);
      });
      return;
    }

    if (label === "\xf7" || label === "\xd7" || label === "-" || label === "+") {
      const opMap: Record<string, string> = { "\xf7": "/", "\xd7": "*", "-": "-", "+": "+" };
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
        const str = String(parseFloat(result.toPrecision(10)));
        setDisplay(str);
        setOperand(null);
        setOperator(null);
        setResetNext(true);
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

    // digit
    setDisplay(d => {
      if (resetNext) { setResetNext(false); return label; }
      if (d === "0") return label;
      return d + label;
    });
  }, [display, operand, operator, resetNext]);

  const getButtonAt = useCallback((row: number, col: number): string => {
    const label = CALC_BUTTONS[row][col];
    if (row === 4 && col === 1) return "";
    return label;
  }, []);

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
    pressButton(getButtonAt(selRow, selCol));
    return true;
  }, [selRow, selCol, pressButton, getButtonAt]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
    onLeft,
    onRight,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    // Display area with thick border
    const dispX = ox + 8;
    const dispY = CONTENT_Y + oy + 2;
    const dispW = W - 16;
    const dispH = CALC_DISPLAY_H - 4;
    for (let t = 0; t < 2; t++) {
      for (let i = 0; i < dispW; i++) {
        fb.set(dispX + i, dispY + t, 0.5);
        fb.set(dispX + i, dispY + dispH - 1 - t, 0.5);
      }
      for (let i = 2; i < dispH - 2; i++) {
        fb.set(dispX + t, dispY + i, 0.5);
        fb.set(dispX + dispW - 1 - t, dispY + i, 0.5);
      }
    }

    const displayText = display.length > 12 ? display.slice(0, 12) : display;
    const textW = font.measureText(displayText, 2);
    const textX = ox + W - textW - 14;
    const textY = CONTENT_Y + oy + Math.floor((CALC_DISPLAY_H - 14) / 2);
    font.drawText(fb, displayText, textX, textY, { scale: 2, intensity: 1 });

    // Operator indicator
    if (operator) {
      const opDisplay: Record<string, string> = { "/": "\xf7", "*": "\xd7", "-": "-", "+": "+" };
      const opStr = opDisplay[operator] || operator;
      font.drawText(fb, opStr, ox + 14, textY, { intensity: 0.6 });
    }

    // Thick divider below display (2px)
    for (let x = ox; x < ox + W; x++) {
      fb.set(x, CALC_DIVIDER_Y + oy, 0.6);
      fb.set(x, CALC_DIVIDER_Y + oy + 1, 0.6);
    }

    // Button grid with 2px borders
    for (let row = 0; row < CALC_ROWS; row++) {
      for (let col = 0; col < CALC_COLS; col++) {
        const label = CALC_BUTTONS[row][col];
        if (row === 4 && col === 1) continue;

        const btnW = (row === 4 && col === 0) ? CALC_BTN_W * 2 : CALC_BTN_W;
        const bx = ox + CALC_GRID_X + col * CALC_BTN_W;
        const by = oy + CALC_GRID_Y + row * CALC_BTN_H;

        const isSel = row === selRow && (
          col === selCol || (row === 4 && col === 0 && selCol <= 1)
        );

        // 2px thick border
        for (let t = 0; t < 2; t++) {
          for (let i = 0; i < btnW; i++) {
            fb.set(bx + i, by + t, 0.4);
            fb.set(bx + i, by + CALC_BTN_H - 1 - t, 0.4);
          }
          for (let i = 2; i < CALC_BTN_H - 2; i++) {
            fb.set(bx + t, by + i, 0.4);
            fb.set(bx + btnW - 1 - t, by + i, 0.4);
          }
        }

        if (isSel) {
          fb.fillRect(bx + 2, by + 2, btnW - 4, CALC_BTN_H - 4, 1);
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
      <TitleBar title="Calculator" />
      <BottomBar onExtras={onExtras} />
    </>
  );
}

// --- Prefs Screen ---

const THEMES = ["green", "amber", "gray", "blue", "newton"];
const PIXEL_SIZES = [2, 3, 4, 5, 6, 7, 8];

function PrefsScreen({ onExtras, theme, onThemeChange, camera, onCameraChange, pixelSize, onPixelSizeChange, perspective, onPerspectiveChange }: {
  onExtras: () => void;
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

  useCancel(onExtras);

  const ROW_COUNT = 4;
  const ROW_SPACING = 20;
  const FIRST_ROW_Y = CONTENT_Y + 12;

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
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
    onLeft,
    onRight,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    for (let row = 0; row < ROW_COUNT; row++) {
      const rowY = FIRST_ROW_Y + row * ROW_SPACING + oy;
      const label = getLabel(row);
      const value = `< ${getValue(row)} >`;
      const valueW = font.measureText(value);
      const selected = row === selectedRow;

      font.drawText(fb, label, ox + 12, rowY, { intensity: 1 });
      font.drawText(fb, value, ox + W - valueW - 12, rowY, { intensity: selected ? 1 : 0.7 });

      // Ruled separator below each row
      const sepY = rowY + 12;
      for (let x = ox + 8; x < ox + W - 8; x++) {
        fb.set(x, sepY, 0.2);
      }
    }

    // Thick divider before notice
    const noticeText = "Changes apply live";
    const noticeW = font.measureText(noticeText);
    const noticeY = FIRST_ROW_Y + ROW_COUNT * ROW_SPACING + 12 + oy;
    const divY = noticeY - 6;
    for (let x = ox + 8; x < ox + W - 8; x++) {
      fb.set(x, divY, 0.4);
      fb.set(x, divY + 1, 0.4);
    }
    font.drawText(fb, noticeText, ox + Math.floor((W - noticeW) / 2), noticeY, { intensity: 0.5 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selectedRow, theme, camera, pixelSize, perspective]);

  return (
    <>
      <TitleBar title="Preferences" />
      <BottomBar onExtras={onExtras} />
    </>
  );
}

// --- Main Newton Mode ---

export function NewtonMode({ onExit, pixelSize, setPixelSize, camera, setCamera, perspective, setPerspective }: {
  onExit: () => void;
  pixelSize: number;
  setPixelSize: (fn: (s: number) => number) => void;
  camera: string;
  setCamera: (fn: (s: string) => string) => void;
  perspective: boolean;
  setPerspective: (fn: (s: boolean) => boolean) => void;
}) {
  const [screen, setScreen] = useState<Screen>("extras");
  const [theme, setTheme] = useState<string>("newton");

  const goExtras = useCallback(() => setScreen("extras"), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize((s) => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize((s) => Math.min(8, s + 1));
      } else if (e.key === "," || e.key === "<") {
        setCamera((c) => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length];
        });
      } else if (e.key === "." || e.key === ">") {
        setCamera((c) => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx + 1) % CAMERAS.length];
        });
      } else if (e.key === "\\") {
        setPerspective((p) => !p);
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
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen]} />

        {screen === "extras" && <ExtrasScreen onNavigate={setScreen} onExit={onExit} />}
        {screen === "notepad" && <NotepadScreen onExtras={goExtras} />}
        {screen === "names" && <NamesScreen onExtras={goExtras} />}
        {screen === "dates" && <DatesScreen onExtras={goExtras} />}
        {screen === "calc" && <CalcScreen onExtras={goExtras} />}
        {screen === "prefs" && <PrefsScreen onExtras={goExtras} theme={theme} onThemeChange={setTheme} camera={camera} onCameraChange={(c) => setCamera(() => c)} pixelSize={pixelSize} onPixelSizeChange={(s) => setPixelSize(() => s)} perspective={perspective} onPerspectiveChange={(v) => setPerspective(() => v)} />}
      </LCDScreen>
    </div>
  );
}
