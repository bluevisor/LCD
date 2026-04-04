import { useState, useEffect, useCallback } from "react";
import {
  LCDScreen,
  LCDText,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont("3x5");

const W = 320;
const H = 100;
const MENUBAR_H = 10;
const STATUSBAR_H = 8;
const CONTENT_Y = MENUBAR_H;
const CONTENT_H = H - MENUBAR_H - STATUSBAR_H;

const LEFT_PANE_W = 100;
const DIVIDER_X = LEFT_PANE_W;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

type Screen = "desktop" | "contacts" | "messaging" | "calendar" | "office" | "extras";

/* ── helpers ─────────────────────────────────────────────── */

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

/* ── Menu Bar ────────────────────────────────────────────── */

function MenuBar({ appName, menuItems }: { appName: string; menuItems: string }) {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, MENUBAR_H, 0);
    // Top border fill (slightly lighter for bar effect)
    for (let x = ox; x < ox + W; x++) {
      fb.set(x, oy + MENUBAR_H - 1, 0.5);
    }
    // App name on left (bold-ish via intensity)
    font.drawText(fb, appName, ox + 3, oy + 2, { intensity: 1 });
    const appW = font.measureText(appName);
    // Separator after app name
    for (let y = oy + 1; y < oy + MENUBAR_H - 1; y++) {
      fb.set(ox + appW + 6, y, 0.4);
    }
    // Menu items after separator
    font.drawText(fb, menuItems, ox + appW + 10, oy + 2, { intensity: 0.8 });
    engine.markDirty();
  }, [engine, offsetX, offsetY, appName, menuItems]);
  return null;
}

/* ── Status Bar ──────────────────────────────────────────── */

function StatusBar() {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + H - STATUSBAR_H;
    fb.fillRect(ox, oy, W, STATUSBAR_H, 0);
    // Top border line
    for (let x = ox; x < ox + W; x++) {
      fb.set(x, oy, 0.5);
    }

    // Signal bars (left)
    const barW = 2;
    const gap = 1;
    for (let i = 0; i < 5; i++) {
      const barH = 1 + i;
      const bx = ox + 2 + i * (barW + gap);
      const by = oy + STATUSBAR_H - 2 - barH;
      const intensity = i < 4 ? 1 : 0.25;
      for (let dy = 0; dy < barH; dy++) {
        for (let dx = 0; dx < barW; dx++) {
          fb.set(bx + dx, by + dy, intensity);
        }
      }
    }

    // Center text "Nokia 9210"
    const centerText = "Nokia 9210";
    const ctw = font.measureText(centerText);
    font.drawText(fb, centerText, ox + Math.floor((W - ctw) / 2), oy + 2, { intensity: 0.8 });

    // Battery + time (right)
    const timeText = "10:40";
    const battText = "[###  ]";
    const timeW = font.measureText(timeText);
    const battW = font.measureText(battText);
    font.drawText(fb, timeText, ox + W - timeW - 2, oy + 2, { intensity: 1 });
    font.drawText(fb, battText, ox + W - timeW - battW - 5, oy + 2, { intensity: 0.7 });

    engine.markDirty();
  }, [engine, offsetX, offsetY]);
  return null;
}

/* ── Vertical divider ────────────────────────────────────── */

function Divider() {
  const { engine, offsetX, offsetY } = useLCD();
  useEffect(() => {
    const fb = engine.fb;
    const x = offsetX + DIVIDER_X;
    for (let y = offsetY + CONTENT_Y; y < offsetY + CONTENT_Y + CONTENT_H; y++) {
      fb.set(x, y, 0.4);
    }
    engine.markDirty();
  }, [engine, offsetX, offsetY]);
  return null;
}

/* ── Desktop ─────────────────────────────────────────────── */

const DESKTOP_APPS = [
  { name: "Phone",    icon: "TEL" },
  { name: "Contacts", icon: "CON" },
  { name: "Msgs",     icon: "MSG" },
  { name: "Calendar", icon: "CAL" },
  { name: "Office",   icon: "DOC" },
  { name: "Extras",   icon: "EXT" },
];

const DESKTOP_SCREENS: Screen[] = [
  "desktop", "contacts", "messaging", "calendar", "office", "extras",
];

function DesktopScreen({ onOpen, onExit }: {
  onOpen: (s: Screen) => void; onExit: () => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const [selected, setSelected] = useState(0);

  useCancel(onExit);

  const onLeft = useCallback(() => {
    if (selected > 0) { setSelected(s => s - 1); return true; }
    return false;
  }, [selected]);

  const onRight = useCallback(() => {
    if (selected < DESKTOP_APPS.length - 1) { setSelected(s => s + 1); return true; }
    return false;
  }, [selected]);

  const onActivate = useCallback(() => {
    if (selected > 0) onOpen(DESKTOP_SCREENS[selected]);
  }, [selected, onOpen]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onLeft,
    onRight,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    const appCount = DESKTOP_APPS.length;
    const cellW = Math.floor(W / appCount);
    const iconW = 16;
    const iconH = 10;

    DESKTOP_APPS.forEach((app, i) => {
      const cx = ox + i * cellW + Math.floor((cellW - iconW) / 2);
      const cy = oy + 8;
      const isSelected = i === selected;

      // Draw icon box
      const boxIntensity = isSelected ? 1 : 0.5;
      for (let bx = cx; bx < cx + iconW; bx++) {
        fb.set(bx, cy, boxIntensity);
        fb.set(bx, cy + iconH - 1, boxIntensity);
      }
      for (let by = cy; by < cy + iconH; by++) {
        fb.set(cx, by, boxIntensity);
        fb.set(cx + iconW - 1, by, boxIntensity);
      }
      if (isSelected) {
        // Fill selected icon
        for (let by = cy + 1; by < cy + iconH - 1; by++) {
          for (let bx = cx + 1; bx < cx + iconW - 1; bx++) {
            fb.set(bx, by, 0.3);
          }
        }
      }

      // Icon label inside box
      const iconLabel = app.icon;
      const ilw = font.measureText(iconLabel);
      font.drawText(fb, iconLabel, cx + Math.floor((iconW - ilw) / 2), cy + 3, {
        intensity: isSelected ? 1 : 0.7,
      });

      // App name below icon
      const labelW = font.measureText(app.name);
      font.drawText(fb, app.name, ox + i * cellW + Math.floor((cellW - labelW) / 2), cy + iconH + 2, {
        intensity: isSelected ? 1 : 0.6,
      });
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected]);

  return (
    <>
      <MenuBar appName="Desktop" menuItems="File  Edit  View  Tools" />
      <StatusBar />
    </>
  );
}

/* ── Contacts ────────────────────────────────────────────── */

const CONTACTS_DATA = [
  { name: "Ada Lovelace",    phone: "+44 20 7946 0958", email: "ada@computing.io" },
  { name: "Alan Turing",     phone: "+44 20 7946 0001", email: "alan@npl.ac.uk" },
  { name: "Bob Kahn",        phone: "+1 202 555 0178",  email: "bob@darpa.net" },
  { name: "Claude Shannon",  phone: "+1 617 253 1000",  email: "claude@mit.edu" },
  { name: "Grace Hopper",    phone: "+1 202 555 0119",  email: "grace@navy.mil" },
  { name: "Linus Torvalds",  phone: "+358 9 1234 567",  email: "linus@kernel.org" },
  { name: "Tim Berners-Lee", phone: "+44 20 7946 0800", email: "tim@w3.org" },
  { name: "Vint Cerf",       phone: "+1 703 555 0142",  email: "vint@google.com" },
];

function ContactsScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [selected, setSelected] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useCancel(onBack);

  const maxVisible = Math.floor(CONTENT_H / 7);

  const onUp = useCallback(() => {
    if (selected > 0) {
      const next = selected - 1;
      setSelected(next);
      if (next < scrollTop) setScrollTop(next);
      return true;
    }
    return false;
  }, [selected, scrollTop]);

  const onDown = useCallback(() => {
    if (selected < CONTACTS_DATA.length - 1) {
      const next = selected + 1;
      setSelected(next);
      if (next >= scrollTop + maxVisible) setScrollTop(next - maxVisible + 1);
      return true;
    }
    return false;
  }, [selected, scrollTop, maxVisible]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: LEFT_PANE_W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    // Left pane: contact list
    const visible = CONTACTS_DATA.slice(scrollTop, scrollTop + maxVisible);
    visible.forEach((c, i) => {
      const idx = scrollTop + i;
      const y = oy + 1 + i * 7;
      if (idx === selected) {
        fb.fillRect(ox, y - 1, LEFT_PANE_W, 7, 0.2);
        font.drawText(fb, c.name, ox + 2, y, { intensity: 1 });
      } else {
        font.drawText(fb, c.name, ox + 2, y, { intensity: 0.6 });
      }
    });

    // Scroll indicator
    if (scrollTop > 0) {
      fb.set(ox + LEFT_PANE_W - 4, oy + 2, 0.8);
      fb.set(ox + LEFT_PANE_W - 5, oy + 3, 0.8);
      fb.set(ox + LEFT_PANE_W - 3, oy + 3, 0.8);
    }
    if (scrollTop + maxVisible < CONTACTS_DATA.length) {
      const by = oy + CONTENT_H - 4;
      fb.set(ox + LEFT_PANE_W - 4, by + 1, 0.8);
      fb.set(ox + LEFT_PANE_W - 5, by, 0.8);
      fb.set(ox + LEFT_PANE_W - 3, by, 0.8);
    }

    // Right pane: contact details
    const contact = CONTACTS_DATA[selected];
    const rx = ox + LEFT_PANE_W + 4;
    const ry = oy + 2;
    font.drawText(fb, contact.name, rx, ry, { intensity: 1 });
    for (let x = rx; x < rx + (W - LEFT_PANE_W - 8); x++) {
      fb.set(x, ry + 6, 0.4);
    }
    font.drawText(fb, "Tel:", rx, ry + 9, { intensity: 0.7 });
    font.drawText(fb, contact.phone, rx + 14, ry + 9, { intensity: 1 });
    font.drawText(fb, "Email:", rx, ry + 17, { intensity: 0.7 });
    font.drawText(fb, contact.email, rx + 22, ry + 17, { intensity: 1 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected, scrollTop, maxVisible]);

  return (
    <>
      <MenuBar appName="Contacts" menuItems="File  Edit  View  Tools" />
      <StatusBar />
      <Divider />
    </>
  );
}

/* ── Messaging ───────────────────────────────────────────── */

const MESSAGES_DATA = [
  {
    from: "Ada Lovelace",
    subject: "Re: Algorithm",
    body: "I've finished the\nnotes on Babbage's\nEngine. The loops\nare most elegant.\nShall we meet Fri?",
  },
  {
    from: "Alan Turing",
    subject: "Turing Test",
    body: "The machine passed\nall conversational\ntests this morning.\nResults are quite\nremarkable indeed.",
  },
  {
    from: "Grace Hopper",
    subject: "Bug found",
    body: "Found a literal bug\nin the Mark II today.\nTaped it to the log.\nDebugging is now\nan official term.",
  },
  {
    from: "Tim B-Lee",
    subject: "New proposal",
    body: "Proposal for a\nworld wide web of\nlinked documents.\nMgmt says: nice,\nbut not our thing.",
  },
];

function MessagingScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [selected, setSelected] = useState(0);

  useCancel(onBack);

  const onUp = useCallback(() => {
    if (selected > 0) { setSelected(s => s - 1); return true; }
    return false;
  }, [selected]);

  const onDown = useCallback(() => {
    if (selected < MESSAGES_DATA.length - 1) { setSelected(s => s + 1); return true; }
    return false;
  }, [selected]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: LEFT_PANE_W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    // Left pane: message list
    MESSAGES_DATA.forEach((msg, i) => {
      const y = oy + 1 + i * 14;
      if (i === selected) {
        fb.fillRect(ox, y - 1, LEFT_PANE_W, 14, 0.2);
        font.drawText(fb, msg.from, ox + 2, y, { intensity: 1 });
        font.drawText(fb, msg.subject, ox + 2, y + 6, { intensity: 0.8 });
      } else {
        font.drawText(fb, msg.from, ox + 2, y, { intensity: 0.7 });
        font.drawText(fb, msg.subject, ox + 2, y + 6, { intensity: 0.5 });
      }
      // divider
      for (let x = ox; x < ox + LEFT_PANE_W - 2; x++) {
        fb.set(x, y + 13, 0.15);
      }
    });

    // Right pane: message body
    const msg = MESSAGES_DATA[selected];
    const rx = ox + LEFT_PANE_W + 4;
    const ry = oy + 2;
    font.drawText(fb, msg.from, rx, ry, { intensity: 1 });
    font.drawText(fb, msg.subject, rx, ry + 7, { intensity: 0.8 });
    for (let x = rx; x < rx + (W - LEFT_PANE_W - 8); x++) {
      fb.set(x, ry + 13, 0.4);
    }
    const lines = msg.body.split("\n");
    lines.forEach((line, li) => {
      font.drawText(fb, line, rx, ry + 16 + li * 7, { intensity: 0.9 });
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected]);

  return (
    <>
      <MenuBar appName="Messaging" menuItems="File  Edit  View" />
      <StatusBar />
      <Divider />
    </>
  );
}

/* ── Calendar ────────────────────────────────────────────── */

const CALENDAR_EVENTS: Record<number, string[]> = {
  3:  ["09:00 Team meeting"],
  7:  ["14:00 Dental appt"],
  12: ["10:00 Code review", "15:30 Demo prep"],
  15: ["All day: Sprint end"],
  20: ["11:00 Lunch w/Ada"],
  25: ["09:00 Stand-up", "16:00 Retrospective"],
  28: ["Free day"],
};

function CalendarScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [selectedDay, setSelectedDay] = useState(15);

  useCancel(onBack);

  // April 2026: starts on Wednesday (day 3), 30 days
  const firstDayOfWeek = 3; // 0=Sun, so Wed=3
  const daysInMonth = 30;

  const onLeft = useCallback(() => {
    if (selectedDay > 1) { setSelectedDay(d => d - 1); return true; }
    return false;
  }, [selectedDay]);

  const onRight = useCallback(() => {
    if (selectedDay < daysInMonth) { setSelectedDay(d => d + 1); return true; }
    return false;
  }, [selectedDay]);

  const onUp = useCallback(() => {
    if (selectedDay > 7) { setSelectedDay(d => d - 7); return true; }
    return false;
  }, [selectedDay]);

  const onDown = useCallback(() => {
    if (selectedDay + 7 <= daysInMonth) { setSelectedDay(d => d + 7); return true; }
    return false;
  }, [selectedDay]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: LEFT_PANE_W, height: CONTENT_H },
    order: 10,
    onLeft,
    onRight,
    onUp,
    onDown,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    // Left pane: mini calendar
    const calX = ox + 1;
    const calY = oy + 1;
    const dayW = 13;
    const dayH = 7;
    const days = ["S","M","T","W","T","F","S"];

    // Month header
    font.drawText(fb, "Apr 2026", calX + 3, calY, { intensity: 1 });

    // Day headers
    days.forEach((d, i) => {
      font.drawText(fb, d, calX + i * dayW + 4, calY + 7, { intensity: 0.6 });
    });

    // Days grid
    for (let d = 1; d <= daysInMonth; d++) {
      const slot = d - 1 + firstDayOfWeek;
      const row = Math.floor(slot / 7);
      const col = slot % 7;
      const dx = calX + col * dayW + 2;
      const dy = calY + 14 + row * dayH;
      const hasEvent = !!CALENDAR_EVENTS[d];
      const isSel = d === selectedDay;

      if (isSel) {
        fb.fillRect(dx - 1, dy - 1, 11, 7, 0.3);
      }
      const label = d < 10 ? ` ${d}` : `${d}`;
      font.drawText(fb, label, dx, dy, { intensity: isSel ? 1 : (hasEvent ? 0.9 : 0.5) });
      if (hasEvent && !isSel) {
        fb.set(dx + 7, dy + 4, 1); // dot
      }
    }

    // Right pane: events for selected day
    const rx = ox + LEFT_PANE_W + 4;
    const ry = oy + 2;
    const dayLabel = `Apr ${selectedDay}, 2026`;
    font.drawText(fb, dayLabel, rx, ry, { intensity: 1 });
    for (let x = rx; x < rx + (W - LEFT_PANE_W - 8); x++) {
      fb.set(x, ry + 6, 0.4);
    }
    const events = CALENDAR_EVENTS[selectedDay] || ["No events"];
    events.forEach((ev, i) => {
      font.drawText(fb, ev, rx, ry + 10 + i * 8, { intensity: 0.9 });
    });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selectedDay]);

  return (
    <>
      <MenuBar appName="Calendar" menuItems="File  Edit  View" />
      <StatusBar />
      <Divider />
    </>
  );
}

/* ── Office ──────────────────────────────────────────────── */

const OFFICE_LINES = [
  "Project Report - Q1 2026",
  "========================",
  "",
  "Executive Summary",
  "----------------",
  "This quarter we shipped",
  "the new communicator SDK",
  "ahead of schedule. All",
  "major milestones were",
  "achieved on time.",
  "",
  "Key Achievements:",
  "- LCD pixel renderer v2",
  "- Font rendering engine",
  "- Multi-device support",
  "- 3D perspective modes",
  "",
  "Next Quarter Goals:",
  "- Bluetooth stack",
  "- GPRS data support",
  "- Java applet runtime",
];

function OfficeScreen({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [scrollTop, setScrollTop] = useState(0);

  useCancel(onBack);

  const maxLines = Math.floor(CONTENT_H / 7);

  const onUp = useCallback(() => {
    if (scrollTop > 0) { setScrollTop(s => s - 1); return true; }
    return false;
  }, [scrollTop]);

  const onDown = useCallback(() => {
    if (scrollTop + maxLines < OFFICE_LINES.length) { setScrollTop(s => s + 1); return true; }
    return false;
  }, [scrollTop, maxLines]);

  useFocus({
    rect: { x: offsetX, y: offsetY + CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, W, CONTENT_H, 0);

    // Page margin lines
    for (let y = oy; y < oy + CONTENT_H; y++) {
      fb.set(ox + 8, y, 0.15);
    }

    const visible = OFFICE_LINES.slice(scrollTop, scrollTop + maxLines);
    visible.forEach((line, i) => {
      const isTitle = i === 0 && scrollTop === 0;
      font.drawText(fb, line, ox + 12, oy + 1 + i * 7, {
        intensity: isTitle ? 1 : 0.8,
      });
    });

    // Scrollbar on right
    const sbX = ox + W - 4;
    for (let y = oy; y < oy + CONTENT_H; y++) {
      fb.set(sbX, y, 0.2);
    }
    const thumbH = Math.max(4, Math.floor(CONTENT_H * maxLines / OFFICE_LINES.length));
    const thumbY = oy + Math.floor(CONTENT_H * scrollTop / OFFICE_LINES.length);
    for (let y = thumbY; y < Math.min(thumbY + thumbH, oy + CONTENT_H); y++) {
      fb.set(sbX, y, 0.8);
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, scrollTop, maxLines]);

  return (
    <>
      <MenuBar appName="Office" menuItems="File  Edit  Format" />
      <StatusBar />
    </>
  );
}

/* ── Extras (Settings/Prefs) ─────────────────────────────── */

function OptionRow9210({ y, label, value, options, onChange, focusOrder }: {
  y: number;
  label: string; value: string;
  options: string[];
  onChange: (val: string) => void;
  focusOrder: number;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const absX = offsetX + LEFT_PANE_W + 4;
  const absY = y + offsetY;
  const rowW = W - LEFT_PANE_W - 8;
  const idx = options.indexOf(value);

  const onLeft = useCallback(() => {
    const prev = (idx - 1 + options.length) % options.length;
    onChange(options[prev]);
  }, [idx, options, onChange]);

  const onRight = useCallback(() => {
    const next = (idx + 1) % options.length;
    onChange(options[next]);
  }, [idx, options, onChange]);

  const { focused } = useFocus({
    rect: { x: absX, y: absY, width: rowW, height: 8 },
    order: focusOrder,
    onLeft,
    onRight,
  });

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(absX, absY, rowW, 8, focused ? 0.1 : 0);
    font.drawText(fb, label, absX + 2, absY + 1, { intensity: 1 });
    const valText = `< ${value} >`;
    const valW = font.measureText(valText);
    font.drawText(fb, valText, absX + rowW - valW - 2, absY + 1, {
      intensity: focused ? 1 : 0.6,
    });
    engine.markDirty();
  }, [engine, absX, absY, rowW, label, value, focused]);

  return null;
}

function ExtrasScreen({
  onBack, theme, onThemeChange, camera, onCameraChange,
  pixelSize, onPixelSizeChange, perspective, onPerspectiveChange,
}: {
  onBack: () => void;
  theme: ThemePresetName;
  onThemeChange: (t: ThemePresetName) => void;
  camera: string;
  onCameraChange: (c: string) => void;
  pixelSize: number;
  onPixelSizeChange: (s: number) => void;
  perspective: boolean;
  onPerspectiveChange: (v: boolean) => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const themes: ThemePresetName[] = ["green", "amber", "gray", "blue"];
  const sizes = ["2", "3", "4", "5", "6"];

  useCancel(onBack);

  // Left pane: "Extras" label list
  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    fb.fillRect(ox, oy, LEFT_PANE_W, CONTENT_H, 0);

    const items = ["Preferences", "About", "Help"];
    items.forEach((item, i) => {
      const sel = i === 0;
      if (sel) fb.fillRect(ox, oy + 1 + i * 10 - 1, LEFT_PANE_W, 9, 0.2);
      font.drawText(fb, item, ox + 4, oy + 1 + i * 10, { intensity: sel ? 1 : 0.6 });
    });
    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  // Right pane header
  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY + CONTENT_Y;
    const rx = ox + LEFT_PANE_W + 4;
    fb.fillRect(ox + LEFT_PANE_W + 1, oy, W - LEFT_PANE_W - 1, 10, 0);
    font.drawText(fb, "Preferences", rx, oy + 2, { intensity: 1 });
    for (let x = rx; x < ox + W - 4; x++) {
      fb.set(x, oy + 8, 0.4);
    }
    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return (
    <>
      <MenuBar appName="Extras" menuItems="File  Edit  Tools" />
      <StatusBar />
      <Divider />
      <OptionRow9210
        y={CONTENT_Y + 11}
        label="Theme"
        value={theme}
        options={themes}
        onChange={(v) => onThemeChange(v as ThemePresetName)}
        focusOrder={10}
      />
      <OptionRow9210
        y={CONTENT_Y + 20}
        label="Camera"
        value={camera}
        options={CAMERAS}
        onChange={onCameraChange}
        focusOrder={20}
      />
      <OptionRow9210
        y={CONTENT_Y + 29}
        label="Pixels"
        value={String(pixelSize)}
        options={sizes}
        onChange={(v) => onPixelSizeChange(Number(v))}
        focusOrder={30}
      />
      <OptionRow9210
        y={CONTENT_Y + 38}
        label="Perspective"
        value={perspective ? "ON" : "OFF"}
        options={["OFF", "ON"]}
        onChange={(v) => onPerspectiveChange(v === "ON")}
        focusOrder={40}
      />
    </>
  );
}

/* ── Main Export ──────────────────────────────────────────── */

export function Nokia9210Mode({ onExit, pixelSize, setPixelSize, camera, setCamera, perspective, setPerspective }: {
  onExit: () => void;
  pixelSize: number;
  setPixelSize: (fn: (s: number) => number) => void;
  camera: string;
  setCamera: (fn: (s: string) => string) => void;
  perspective: boolean;
  setPerspective: (fn: (s: boolean) => boolean) => void;
}) {
  const [screen, setScreen] = useState<Screen>("desktop");
  const [theme, setTheme] = useState<ThemePresetName>("blue");

  const goDesktop = useCallback(() => setScreen("desktop"), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize(s => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize(s => Math.min(6, s + 1));
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
      background: "#0a0a14",
      overflow: "hidden",
    }}>
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={theme} camera={camera} perspective={perspective}>
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen]} />

        {screen === "desktop" && (
          <DesktopScreen onOpen={setScreen} onExit={onExit} />
        )}
        {screen === "contacts" && (
          <ContactsScreen onBack={goDesktop} />
        )}
        {screen === "messaging" && (
          <MessagingScreen onBack={goDesktop} />
        )}
        {screen === "calendar" && (
          <CalendarScreen onBack={goDesktop} />
        )}
        {screen === "office" && (
          <OfficeScreen onBack={goDesktop} />
        )}
        {screen === "extras" && (
          <ExtrasScreen
            onBack={goDesktop}
            theme={theme}
            onThemeChange={setTheme}
            camera={camera}
            onCameraChange={(c) => setCamera(() => c)}
            pixelSize={pixelSize}
            onPixelSizeChange={(s) => setPixelSize(() => s)}
            perspective={perspective}
            onPerspectiveChange={(v) => setPerspective(() => v)}
          />
        )}
      </LCDScreen>
    </div>
  );
}
