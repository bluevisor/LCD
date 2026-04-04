import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  LCDText,
  LCDPanel,
  LCDDivider,
  LCDIcon,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont();

const W = 160;
const H = 160;
const TITLE_H = 12;
const BOTTOM_H = 14;
const CONTENT_Y = TITLE_H + 1;
const CONTENT_H = H - TITLE_H - 1 - BOTTOM_H - 1;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];
const THEMES = ["green", "amber", "gray", "blue", "palm"];
const PIXEL_SIZES = [2, 3, 4, 5, 6, 7, 8];

type Screen = "home" | "datebook" | "address" | "todo" | "memo" | "calc" | "prefs";

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

// --- Title Bar ---

function TitleBar({ title }: { title: string }) {
  return (
    <>
      <LCDPanel x={0} y={0} width={W} height={TITLE_H} border={false}>
        <LCDText x={3} y={2}>{title}</LCDText>
      </LCDPanel>
      <LCDDivider x={0} y={TITLE_H} length={W} />
    </>
  );
}

// --- Bottom Bar (Silkscreen) ---

function BottomBar({ onHome }: { onHome: () => void }) {
  const barY = H - BOTTOM_H;
  const iconNames = ["home", "menu", "calculator", "magnifier"];
  const spacing = W / 4;

  return (
    <>
      <LCDDivider x={0} y={barY} length={W} />
      {iconNames.map((name, i) => {
        const iconX = Math.floor(spacing * i + spacing / 2 - 4);
        const iconY = barY + 3;
        return (
          <BottomBarIcon
            key={name}
            x={iconX}
            y={iconY}
            name={name}
            order={900 + i}
            onActivate={name === "home" ? onHome : undefined}
          />
        );
      })}
    </>
  );
}

function BottomBarIcon({ x, y, name, order, onActivate }: {
  x: number; y: number; name: string; order: number; onActivate?: () => void;
}) {
  const { offsetX, offsetY } = useLCD();
  useFocus({
    rect: { x: x + offsetX, y: y + offsetY, width: 8, height: 8 },
    order,
    onActivate,
  });
  return <LCDIcon x={x} y={y} name={name} />;
}

// --- Home (App Launcher) ---

interface AppIcon {
  name: string;
  icon: string;
  screen: Screen;
}

const APP_ICONS: AppIcon[] = [
  { name: "Date Book", icon: "calendar", screen: "datebook" },
  { name: "Address", icon: "person", screen: "address" },
  { name: "To Do", icon: "todo", screen: "todo" },
  { name: "Memo", icon: "memo", screen: "memo" },
  { name: "Calc", icon: "calculator", screen: "calc" },
  { name: "Prefs", icon: "prefs", screen: "prefs" },
];

const GRID_COLS = 3;
const ICON_SCALE = 1;
const ICON_PX = 8 * ICON_SCALE;
const CELL_W = Math.floor(W / GRID_COLS);
const CELL_H = 24;
const GRID_START_X = Math.floor((W - GRID_COLS * CELL_W) / 2);
const GRID_START_Y = CONTENT_Y + 8;

function HomeScreen({ onNavigate, onExit }: {
  onNavigate: (s: Screen) => void;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const { offsetX, offsetY } = useLCD();

  useCancel(onExit);

  const rows = Math.ceil(APP_ICONS.length / GRID_COLS);

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
      if (next >= APP_ICONS.length) return s;
      return next;
    });
    return true;
  }, []);

  const onLeft = useCallback(() => {
    setSelected((s) => (s > 0 ? s - 1 : s));
    return true;
  }, []);

  const onRight = useCallback(() => {
    setSelected((s) => (s < APP_ICONS.length - 1 ? s + 1 : s));
    return true;
  }, []);

  const onActivate = useCallback(() => {
    onNavigate(APP_ICONS[selected].screen);
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

  return (
    <>
      <TitleBar title="Applications" />

      {APP_ICONS.map((item, i) => {
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
          <HomeIconCell
            key={item.icon}
            iconX={iconX}
            iconY={iconY}
            iconName={item.icon}
            label={item.name}
            labelX={labelX}
            labelY={iconY + ICON_PX + 2}
            selected={isSel}
          />
        );
      })}

      <BottomBar onHome={() => {}} />
    </>
  );
}

function HomeIconCell({ iconX, iconY, iconName, label, labelX, labelY, selected }: {
  iconX: number; iconY: number; iconName: string;
  label: string; labelX: number; labelY: number;
  selected: boolean;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const fb = engine.fb;
    const ax = iconX + offsetX;
    const ay = iconY + offsetY;
    const bx = ax - 2;
    const by = ay - 2;
    const bw = ICON_PX + 4;
    const bh = ICON_PX + 4;
    if (selected) {
      for (let i = 0; i < bw; i++) { fb.set(bx + i, by, 1); fb.set(bx + i, by + bh - 1, 1); }
      for (let i = 1; i < bh - 1; i++) { fb.set(bx, by + i, 1); fb.set(bx + bw - 1, by + i, 1); }
    } else {
      for (let i = 0; i < bw; i++) { fb.set(bx + i, by, 0); fb.set(bx + i, by + bh - 1, 0); }
      for (let i = 1; i < bh - 1; i++) { fb.set(bx, by + i, 0); fb.set(bx + bw - 1, by + i, 0); }
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

// --- Date Book Screen ---

const TIME_SLOTS = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00", "5:00"];

const DATEBOOK_EVENTS: Record<string, string> = {
  "9:00": "Team standup",
  "12:00": "Lunch w/ Ada",
  "2:00": "Design review",
  "4:00": "Code freeze",
};

function DateBookScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const LINE_H = 12;
  const visibleCount = Math.floor(CONTENT_H / LINE_H);
  const maxScroll = Math.max(0, TIME_SLOTS.length - visibleCount);

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
      const next = Math.min(TIME_SLOTS.length - 1, s + 1);
      setScrollY((sc) => {
        const minScroll = next - visibleCount + 1;
        return Math.min(maxScroll, Math.max(sc, minScroll));
      });
      return next;
    });
    return true;
  }, [visibleCount, maxScroll]);

  useFocus({
    rect: { x: offsetX, y: CONTENT_Y + offsetY, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    // Date header
    const dateStr = "Fri 04/04/26";
    const dateW = font.measureText(dateStr);
    font.drawText(fb, dateStr, ox + Math.floor((W - dateW) / 2), CONTENT_Y + oy + 2, { intensity: 1 });

    const listY = CONTENT_Y + 14;
    const visible = TIME_SLOTS.slice(scrollY, scrollY + visibleCount - 1);

    visible.forEach((slot, i) => {
      const itemIdx = scrollY + i;
      const rowY = listY + oy + i * LINE_H;

      if (itemIdx === selected) {
        fb.fillRect(ox + 1, rowY, W - 2, LINE_H - 1, 0.12);
      }

      font.drawText(fb, slot, ox + 3, rowY + 2, { intensity: 0.7 });

      // Vertical divider after time
      const divX = ox + 30;
      for (let dy = 0; dy < LINE_H - 1; dy++) fb.set(divX, rowY + dy, 0.3);

      const event = DATEBOOK_EVENTS[slot];
      if (event) {
        font.drawText(fb, event, ox + 34, rowY + 2, { intensity: 1 });
      }

      // Horizontal rule
      for (let x = ox + 1; x < ox + W - 1; x++) fb.set(x, rowY + LINE_H - 1, 0.15);
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, scrollY, visibleCount]);

  return (
    <>
      <TitleBar title="Date Book" />
      <BottomBar onHome={onHome} />
    </>
  );
}

// --- Address Screen ---

interface Contact {
  name: string;
  phone: string;
  email: string;
}

const CONTACTS: Contact[] = [
  { name: "Ada Lovelace", phone: "555-0101", email: "ada@engine.co" },
  { name: "Alan Turing", phone: "555-0102", email: "alan@enigma.uk" },
  { name: "Bob Kahn", phone: "555-0201", email: "bob@tcp.net" },
  { name: "Claude Shannon", phone: "555-0301", email: "claude@info.io" },
  { name: "Grace Hopper", phone: "555-0701", email: "grace@cobol.mil" },
  { name: "Nikola Tesla", phone: "555-1401", email: "nikola@tesla.rs" },
];

function AddressScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { engine, offsetX, offsetY } = useLCD();

  const onCancel = useCallback(() => {
    if (expanded) {
      setExpanded(false);
    } else {
      onHome();
    }
  }, [expanded, onHome]);

  useCancel(onCancel);

  const LINE_H = 12;

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
      let cy = CONTENT_Y + oy + 6;

      font.drawText(fb, contact.name, ox + 4, cy, { intensity: 1 });
      const nameW = font.measureText(contact.name);
      for (let x = ox + 4; x < ox + 4 + nameW; x++) fb.set(x, cy + 7, 1);
      cy += 16;

      font.drawText(fb, `Tel: ${contact.phone}`, ox + 4, cy, { intensity: 0.8 });
      cy += 12;
      font.drawText(fb, `Mail: ${contact.email}`, ox + 4, cy, { intensity: 0.8 });

      const hint = "Esc to go back";
      const hintW = font.measureText(hint);
      font.drawText(fb, hint, ox + Math.floor((W - hintW) / 2), CONTENT_Y + oy + CONTENT_H - 12, { intensity: 0.4 });
    } else {
      CONTACTS.forEach((contact, i) => {
        const rowY = CONTENT_Y + oy + i * LINE_H;

        if (i === selected) {
          fb.fillRect(ox + 1, rowY, W - 2, LINE_H - 1, 0.12);
        }

        font.drawText(fb, contact.name, ox + 4, rowY + 2, { intensity: 1 });

        for (let x = ox + 1; x < ox + W - 1; x++) fb.set(x, rowY + LINE_H - 1, 0.15);
      });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, expanded]);

  return (
    <>
      <TitleBar title="Address" />
      <BottomBar onHome={onHome} />
    </>
  );
}

// --- To Do Screen ---

interface TodoItem {
  text: string;
  priority: number;
  checked: boolean;
}

const TODO_DATA: TodoItem[] = [
  { text: "File expense report", priority: 1, checked: false },
  { text: "Review PR #42", priority: 1, checked: true },
  { text: "Update docs", priority: 2, checked: false },
  { text: "Fix login bug", priority: 2, checked: false },
  { text: "Order new cables", priority: 3, checked: true },
  { text: "Clean desk", priority: 4, checked: false },
  { text: "Backup database", priority: 3, checked: false },
  { text: "Schedule 1:1s", priority: 5, checked: true },
];

function TodoScreen({ onHome }: { onHome: () => void }) {
  const [items, setItems] = useState<TodoItem[]>(TODO_DATA.map(i => ({ ...i })));
  const [selected, setSelected] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onHome);

  const LINE_H = 12;
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
      const next = [...prev];
      next[selected] = { ...next[selected], checked: !next[selected].checked };
      return next;
    });
    return true;
  }, [selected]);

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

    const visible = items.slice(scrollY, scrollY + visibleCount);
    visible.forEach((item, i) => {
      const itemIdx = scrollY + i;
      const rowY = CONTENT_Y + oy + i * LINE_H;

      if (itemIdx === selected) {
        fb.fillRect(ox + 1, rowY, W - 2, LINE_H - 1, 0.12);
      }

      // Priority number
      font.drawText(fb, String(item.priority), ox + 3, rowY + 2, { intensity: 0.6 });

      // Checkbox
      const cbX = ox + 12;
      const cbY = rowY + 2;
      for (let bx = 0; bx < 7; bx++) {
        fb.set(cbX + bx, cbY, 1);
        fb.set(cbX + bx, cbY + 6, 1);
      }
      for (let by = 0; by < 7; by++) {
        fb.set(cbX, cbY + by, 1);
        fb.set(cbX + 6, cbY + by, 1);
      }
      if (item.checked) {
        fb.set(cbX + 2, cbY + 3, 1);
        fb.set(cbX + 3, cbY + 4, 1);
        fb.set(cbX + 4, cbY + 3, 1);
        fb.set(cbX + 5, cbY + 2, 1);
      }

      // Text
      font.drawText(fb, item.text, ox + 22, rowY + 2, { intensity: 1 });

      // Rule
      for (let x = ox + 1; x < ox + W - 1; x++) fb.set(x, rowY + LINE_H - 1, 0.15);
    });

    // Scrollbar
    if (items.length > visibleCount) {
      const barH = Math.max(4, Math.round(CONTENT_H * (visibleCount / items.length)));
      const barY = CONTENT_Y + oy + Math.round((CONTENT_H - barH) * (scrollY / maxScroll));
      for (let i = 0; i < barH; i++) {
        fb.set(ox + W - 2, barY + i, 0.6);
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, items, selected, scrollY, visibleCount, maxScroll]);

  return (
    <>
      <TitleBar title="To Do" />
      <BottomBar onHome={onHome} />
    </>
  );
}

// --- Memo Screen ---

const MEMO_DATA: string[] = [
  "Meeting notes from Monday:\nDiscussed Q2 roadmap.\nAction items assigned.",
  "Grocery list:\nMilk, eggs, bread,\nbutter, coffee beans",
  "Book recommendations:\n- Neuromancer\n- Snow Crash\n- Diamond Age",
  "WiFi: CoffeeShop5G\nPass: beans2024",
  "Ideas for hackathon:\nLCD pixel UI library\nRetro PDA simulator",
];

function MemoScreen({ onHome }: { onHome: () => void }) {
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false);
  const [memoScroll, setMemoScroll] = useState(0);
  const { engine, offsetX, offsetY } = useLCD();

  const onCancel = useCallback(() => {
    if (viewing) {
      setViewing(false);
      setMemoScroll(0);
    } else {
      onHome();
    }
  }, [viewing, onHome]);

  useCancel(onCancel);

  const LINE_H = 12;

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
      setMemoScroll(s => s + 1);
      return true;
    }
    setSelected(s => Math.min(MEMO_DATA.length - 1, s + 1));
    return true;
  }, [viewing]);

  const onActivate = useCallback(() => {
    if (!viewing) {
      setViewing(true);
      setMemoScroll(0);
    }
    return true;
  }, [viewing]);

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

    if (viewing) {
      const memo = MEMO_DATA[selected];
      const lines = memo.split("\n");
      const visibleLines = lines.slice(memoScroll);
      const maxLines = Math.floor(CONTENT_H / LINE_H);

      visibleLines.slice(0, maxLines).forEach((line, i) => {
        font.drawText(fb, line, ox + 4, CONTENT_Y + oy + 2 + i * LINE_H, { intensity: 1 });
      });
    } else {
      MEMO_DATA.forEach((memo, i) => {
        const rowY = CONTENT_Y + oy + i * LINE_H;
        const firstLine = memo.split("\n")[0];

        if (i === selected) {
          fb.fillRect(ox + 1, rowY, W - 2, LINE_H - 1, 0.12);
        }

        const displayText = firstLine.length > 22 ? firstLine.slice(0, 22) + ".." : firstLine;
        font.drawText(fb, displayText, ox + 4, rowY + 2, { intensity: 1 });

        for (let x = ox + 1; x < ox + W - 1; x++) fb.set(x, rowY + LINE_H - 1, 0.15);
      });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, viewing, memoScroll]);

  return (
    <>
      <TitleBar title="Memo Pad" />
      <BottomBar onHome={onHome} />
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
const CALC_DIVIDER_Y = CONTENT_Y + CALC_DISPLAY_H;
const CALC_GRID_Y = CALC_DIVIDER_Y + 1;
const CALC_BTN_H = Math.floor((CONTENT_H - CALC_DISPLAY_H - 1) / CALC_ROWS);

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
      setDisplay("0");
      setOperand(null);
      setOperator(null);
      setResetNext(false);
    } else {
      onHome();
    }
  }, [display, operand, operator, onHome]);

  useCancel(onCancel);

  const pressButton = useCallback((label: string) => {
    if (label === "") return;

    if (label === "C") {
      setDisplay("0"); setOperand(null); setOperator(null); setResetNext(false);
      return;
    }
    if (label === "±") {
      setDisplay(d => String(-parseFloat(d)));
      return;
    }
    if (label === "%") {
      setDisplay(d => String(parseFloat(d) / 100));
      return;
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
    // digit
    setDisplay(d => {
      if (resetNext) { setResetNext(false); return label; }
      if (d === "0") return label;
      return d + label;
    });
  }, [display, operand, operator, resetNext]);

  const getButtonAt = useCallback((row: number, col: number): string => {
    if (row === 4 && col === 1) return "";
    return CALC_BUTTONS[row][col];
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
    onUp, onDown, onLeft, onRight, onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, CONTENT_Y + oy, W, CONTENT_H, 0);

    // Display
    const displayText = display.length > 10 ? display.slice(0, 10) : display;
    const textW = font.measureText(displayText, 2);
    const textX = ox + W - textW - 4;
    const textY = CONTENT_Y + oy + Math.floor((CALC_DISPLAY_H - 14) / 2);
    font.drawText(fb, displayText, textX, textY, { scale: 2, intensity: 1 });

    if (operator) {
      const opDisplay: Record<string, string> = { "/": "÷", "*": "×", "-": "-", "+": "+" };
      font.drawText(fb, opDisplay[operator] || operator, ox + 4, textY, { intensity: 0.6 });
    }

    // Divider
    for (let x = ox; x < ox + W; x++) fb.set(x, CALC_DIVIDER_Y + oy, 0.5);

    // Buttons
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
          fb.set(bx + i, by, 0.3);
          fb.set(bx + i, by + CALC_BTN_H - 1, 0.3);
        }
        for (let i = 0; i < CALC_BTN_H; i++) {
          fb.set(bx, by + i, 0.3);
          fb.set(bx + btnW - 1, by + i, 0.3);
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
      <TitleBar title="Calculator" />
      <BottomBar onHome={onHome} />
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
  const ROW_SPACING = 16;
  const FIRST_ROW_Y = CONTENT_Y + 8;

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
    onUp, onDown, onLeft, onRight,
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

      font.drawText(fb, label, ox + 4, rowY, { intensity: 1 });
      font.drawText(fb, value, ox + W - valueW - 4, rowY, { intensity: selected ? 1 : 0.7 });
    }

    const noticeText = "Changes apply live";
    const noticeW = font.measureText(noticeText);
    const noticeY = FIRST_ROW_Y + ROW_COUNT * ROW_SPACING + 8 + oy;
    const divY = noticeY - 4;
    for (let x = ox; x < ox + W; x++) fb.set(x, divY, 0.3);
    font.drawText(fb, noticeText, ox + Math.floor((W - noticeW) / 2), noticeY, { intensity: 0.5 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selectedRow, theme, camera, pixelSize, perspective]);

  return (
    <>
      <TitleBar title="Preferences" />
      <BottomBar onHome={onHome} />
    </>
  );
}

// --- Main Palm Mode ---

export function PalmMode({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [pixelSize, setPixelSize] = useState(4);
  const [camera, setCamera] = useState("straight");
  const [perspective, setPerspective] = useState(false);
  const [theme, setTheme] = useState<string>("palm");

  const goHome = useCallback(() => setScreen("home"), []);

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

        {screen === "home" && <HomeScreen onNavigate={setScreen} onExit={onExit} />}
        {screen === "datebook" && <DateBookScreen onHome={goHome} />}
        {screen === "address" && <AddressScreen onHome={goHome} />}
        {screen === "todo" && <TodoScreen onHome={goHome} />}
        {screen === "memo" && <MemoScreen onHome={goHome} />}
        {screen === "calc" && <CalcScreen onHome={goHome} />}
        {screen === "prefs" && <PrefsScreen onHome={goHome} theme={theme} onThemeChange={setTheme} camera={camera} onCameraChange={setCamera} pixelSize={pixelSize} onPixelSizeChange={setPixelSize} perspective={perspective} onPerspectiveChange={setPerspective} />}
      </LCDScreen>
    </div>
  );
}
