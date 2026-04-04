import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LCDScreen,
  LCDText,
  LCDPanel,
  LCDDivider,
  LCDButton,
  LCDToggle,
  LCDSlider,
  LCDProgress,
  LCDIcon,
  LCDMenu,
  BitmapFont,
  useLCD,
  useFocus,
  useFocusIndicator,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont();

const W = 160;
const H = 120;
const TITLE_H = 11;
const HINT_H = 10;
const CONTENT_Y = TITLE_H + 1;
const CONTENT_H = H - TITLE_H - 1 - HINT_H - 1;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];
const SCREEN_ORDER = ["dashboard", "files", "network", "system", "settings", "about"] as const;
type ScreenType = (typeof SCREEN_ORDER)[number] | "menu";

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

function useCancel(onBack: () => void) {
  const { engine } = useLCD();
  useEffect(() => {
    engine.focus.onCancel(onBack);
    return () => engine.focus.offCancel(onBack);
  }, [engine, onBack]);
}

function OptionRow({ x, y, width, label, value, options, onChange, focusOrder }: {
  x: number; y: number; width: number;
  label: string; value: string;
  options: string[];
  onChange: (val: string) => void;
  focusOrder: number;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const absX = x + offsetX;
  const absY = y + offsetY;
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
    rect: { x: absX, y: absY, width, height: 9 },
    order: focusOrder,
    onLeft,
    onRight,
  });

  useFocusIndicator(focused, absX, absY, width, 9);

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(absX, absY, width, 9, 0);
    font.drawText(fb, label, absX + 2, absY + 1, { intensity: 1 });
    const valText = `< ${value} >`;
    const valW = font.measureText(valText);
    font.drawText(fb, valText, absX + width - valW - 2, absY + 1, {
      intensity: focused ? 1 : 0.7,
    });
    engine.markDirty();
  }, [engine, absX, absY, width, label, value, focused]);

  return null;
}

function TitleBar({ title, showBack }: { title: string; showBack: boolean }) {
  return (
    <>
      <LCDPanel x={0} y={0} width={W} height={TITLE_H} border={false}>
        {showBack && <LCDIcon x={1} y={1} name="arrow_left" />}
        <LCDText x={showBack ? 11 : 2} y={2}>{title}</LCDText>
      </LCDPanel>
      <LCDDivider x={0} y={TITLE_H} length={W} />
    </>
  );
}

function HintBar({ left, right }: { left: string; right: string }) {
  const hintY = H - HINT_H;
  return (
    <>
      <LCDDivider x={0} y={hintY} length={W} />
      <LCDText x={2} y={hintY + 2}>{left}</LCDText>
      {right && <LCDText x={W - 2 - right.length * 6} y={hintY + 2}>{right}</LCDText>}
    </>
  );
}

function MainMenuScreen({ onNavigate, onExit }: { onNavigate: (s: ScreenType) => void; onExit: () => void }) {
  const items = ["Dashboard", "Files", "Network", "System", "Settings", "About"];
  const [selected, setSelected] = useState(0);

  useCancel(onExit);

  const handleConfirm = useCallback((i: number) => {
    onNavigate(SCREEN_ORDER[i]);
  }, [onNavigate]);

  return (
    <>
      <TitleBar title="LCD Desktop v1.0" showBack={false} />
      <LCDMenu
        x={2}
        y={CONTENT_Y + 2}
        items={items}
        selectedIndex={selected}
        onSelect={setSelected}
        onConfirm={handleConfirm}
        width={W - 4}
        focusOrder={10}
      />
      <HintBar left="Select" right="Enter" />
    </>
  );
}

function DashboardScreen({ onBack }: {
  onBack: () => void;
}) {
  const [power, setPower] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [cpu, setCpu] = useState(0.65);

  useCancel(onBack);

  return (
    <>
      <TitleBar title="Dashboard" showBack />

      <LCDText x={4} y={CONTENT_Y + 2}>Power:</LCDText>
      <LCDToggle x={60} y={CONTENT_Y + 2} value={power} onChange={setPower} focusOrder={10} />
      <LCDText x={76} y={CONTENT_Y + 2}>{power ? "ON " : "OFF"}</LCDText>

      <LCDText x={4} y={CONTENT_Y + 12}>Volume:</LCDText>
      <LCDSlider x={60} y={CONTENT_Y + 12} width={80} value={volume} onChange={setVolume} focusOrder={20} />

      <LCDText x={4} y={CONTENT_Y + 22}>CPU:</LCDText>
      <LCDProgress x={60} y={CONTENT_Y + 22} width={80} value={cpu} />
      <LCDText x={144} y={CONTENT_Y + 22}>{`${Math.round(cpu * 100)}%`}</LCDText>

      <LCDDivider x={2} y={CONTENT_Y + 30} length={W - 4} />

      <LCDButton x={4} y={CONTENT_Y + 34} label="Refresh CPU" onClick={() => setCpu(Math.random())} focusOrder={30} />
      <LCDButton x={4} y={CONTENT_Y + 46} label="Reset All" onClick={() => { setPower(false); setVolume(0.5); setCpu(0.65); }} focusOrder={40} />

      <LCDDivider x={2} y={CONTENT_Y + 58} length={W - 4} />
      <LCDText x={4} y={CONTENT_Y + 62}>MEM:</LCDText>
      <LCDProgress x={60} y={CONTENT_Y + 62} width={80} value={0.67} />
      <LCDText x={4} y={CONTENT_Y + 72}>DISK:</LCDText>
      <LCDProgress x={60} y={CONTENT_Y + 72} width={80} value={0.81} />

      <HintBar left="Esc Back" right="Edit" />
    </>
  );
}

interface FsEntry {
  name: string;
  kind: "file" | "directory";
  handle: FileSystemHandle;
}

function FilesScreen({ onBack }: {
  onBack: () => void;
}) {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [selected, setSelected] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const [parentHandles, setParentHandles] = useState<FileSystemDirectoryHandle[]>([]);

  useCancel(useCallback(() => {
    if (parentHandles.length > 0) {
      // Go up one directory
      const parents = [...parentHandles];
      const parent = parents.pop()!;
      setParentHandles(parents);
      setPath((p) => p.slice(0, -1));
      loadDir(parent);
    } else {
      onBack();
    }
  }, [parentHandles, onBack]));

  const loadDir = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setDirHandle(handle);
    const items: FsEntry[] = [];
    for await (const entry of handle.values()) {
      items.push({ name: entry.name, kind: entry.kind, handle: entry });
    }
    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    setEntries(items);
    setSelected(0);
  }, []);

  const pickDir = useCallback(async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setPath([handle.name]);
      setParentHandles([]);
      loadDir(handle);
    } catch {
      // User cancelled
    }
  }, [loadDir]);

  const [viewContent, setViewContent] = useState<string | null>(null);
  const [viewName, setViewName] = useState("");

  const handleConfirm = useCallback(async (i: number) => {
    const entry = entries[i];
    if (!entry) return;
    if (entry.kind === "directory") {
      setParentHandles((p) => [...p, dirHandle!]);
      setPath((p) => [...p, entry.name]);
      loadDir(entry.handle as FileSystemDirectoryHandle);
    } else if (entry.name.match(/\.(txt|md|json|js|ts|css|html|csv|log|yml|yaml|toml|cfg|ini|xml|env)$/i)) {
      const file = await (entry.handle as FileSystemFileHandle).getFile();
      const text = await file.text();
      setViewContent(text);
      setViewName(entry.name);
    }
  }, [entries, dirHandle, loadDir]);

  if (viewContent !== null) {
    return (
      <FileViewScreen
        name={viewName}
        content={viewContent}
        onBack={() => setViewContent(null)}
      />
    );
  }

  if (!dirHandle) {
    return (
      <>
        <TitleBar title="Files" showBack />
        <LCDText x={4} y={CONTENT_Y + 10}>No folder open.</LCDText>
        <LCDText x={4} y={CONTENT_Y + 24}>Press Enter to</LCDText>
        <LCDText x={4} y={CONTENT_Y + 34}>pick a folder.</LCDText>
        <LCDButton x={4} y={CONTENT_Y + 50} label="Open Folder..." onClick={pickDir} focusOrder={10} />
        <HintBar left="Esc Back" right="Open" />
      </>
    );
  }

  const displayItems = entries.map((e) =>
    e.kind === "directory" ? `${e.name}/` : e.name
  );

  return (
    <>
      <TitleBar title={path.join("/")} showBack />
      <ClearRect x={0} y={CONTENT_Y} width={W} height={CONTENT_H} deps={[dirHandle]} />
      {entries.length === 0 ? (
        <LCDText x={4} y={CONTENT_Y + 10}>Empty folder</LCDText>
      ) : (
        <LCDMenu
          x={2}
          y={CONTENT_Y + 2}
          items={displayItems}
          selectedIndex={selected}
          onSelect={setSelected}
          onConfirm={handleConfirm}
          width={W - 4}
          focusOrder={10}
        />
      )}
      <HintBar left="Esc Back" right="Open" />
    </>
  );
}

function FileViewScreen({ name, content, onBack }: {
  name: string; content: string; onBack: () => void;
}) {
  const [scrollY, setScrollY] = useState(0);
  useCancel(onBack);

  const maxChars = Math.floor((W - 8) / 6);
  const lines = useMemo(() => {
    const result: string[] = [];
    for (const raw of content.split("\n")) {
      if (raw.length === 0) {
        result.push("");
      } else {
        for (let i = 0; i < raw.length; i += maxChars) {
          result.push(raw.slice(i, i + maxChars));
        }
      }
    }
    return result;
  }, [content, maxChars]);

  const visibleLines = Math.floor(CONTENT_H / 10);
  const maxScroll = Math.max(0, lines.length - visibleLines);

  const onUp = useCallback(() => {
    if (scrollY > 0) { setScrollY((s) => s - 1); return true; }
    return false;
  }, [scrollY]);

  const onDown = useCallback(() => {
    if (scrollY < maxScroll) { setScrollY((s) => s + 1); return true; }
    return false;
  }, [scrollY, maxScroll]);

  const { focused } = useFocus({
    rect: { x: 0, y: CONTENT_Y, width: W, height: CONTENT_H },
    order: 10,
    onUp,
    onDown,
  });

  const { engine } = useLCD();
  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(0, CONTENT_Y, W, CONTENT_H, 0);
    const visible = lines.slice(scrollY, scrollY + visibleLines);
    visible.forEach((line, i) => {
      if (line.length > 0) {
        font.drawText(fb, line, 4, CONTENT_Y + 2 + i * 10, { intensity: 1 });
      }
    });
    // Scroll indicator
    if (lines.length > visibleLines) {
      const barH = Math.max(4, Math.round(CONTENT_H * (visibleLines / lines.length)));
      const barY = CONTENT_Y + Math.round((CONTENT_H - barH) * (scrollY / maxScroll));
      for (let i = 0; i < barH; i++) {
        fb.set(W - 2, barY + i, 0.6);
      }
    }
    engine.markDirty();
  }, [engine, scrollY, lines, visibleLines, maxScroll]);

  return (
    <>
      <TitleBar title={name} showBack />
      <HintBar left="Esc Back" right="Scroll" />
    </>
  );
}

function NetworkScreen({ onBack }: {
  onBack: () => void;
}) {
  useCancel(onBack);

  return (
    <>
      <TitleBar title="Network" showBack />
      <LCDText x={4} y={CONTENT_Y + 4}>LAN: 192.168.1.42</LCDText>
      <LCDText x={4} y={CONTENT_Y + 14}>WAN: 203.0.113.7</LCDText>
      <LCDText x={4} y={CONTENT_Y + 24}>DNS: 8.8.8.8</LCDText>
      <LCDText x={4} y={CONTENT_Y + 34}>GW:  192.168.1.1</LCDText>
      <LCDDivider x={2} y={CONTENT_Y + 44} length={W - 4} />
      <LCDText x={4} y={CONTENT_Y + 48}>TX: 1.2 MB/s</LCDText>
      <LCDText x={4} y={CONTENT_Y + 58}>RX: 3.4 MB/s</LCDText>
      <LCDText x={4} y={CONTENT_Y + 68}>Ping: 12ms</LCDText>
      <HintBar left="Esc Back" right="" />
    </>
  );
}

function SystemScreen({ onBack }: {
  onBack: () => void;
}) {
  useCancel(onBack);

  return (
    <>
      <TitleBar title="System" showBack />
      <LCDText x={4} y={CONTENT_Y + 4}>OS:     LCD v1.0</LCDText>
      <LCDText x={4} y={CONTENT_Y + 14}>Uptime: 42d 3h 17m</LCDText>
      <LCDText x={4} y={CONTENT_Y + 24}>Procs:  47</LCDText>
      <LCDText x={4} y={CONTENT_Y + 34}>Temp:   52 C</LCDText>
      <LCDText x={4} y={CONTENT_Y + 44}>Fan:    2400 RPM</LCDText>
      <LCDDivider x={2} y={CONTENT_Y + 54} length={W - 4} />
      <LCDIcon x={4} y={CONTENT_Y + 58} name="check" />
      <LCDText x={14} y={CONTENT_Y + 58}>All systems OK</LCDText>
      <HintBar left="Esc Back" right="" />
    </>
  );
}

function SettingsScreen({ onBack, theme, onThemeChange, camera, onCameraChange, pixelSize, onPixelSizeChange, perspective, onPerspectiveChange }: {
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
  const themes: ThemePresetName[] = ["green", "amber", "gray", "blue"];
  const cameras = CAMERAS;
  const sizes = ["2", "3", "4", "5", "6", "7", "8"];

  useCancel(onBack);

  return (
    <>
      <TitleBar title="Settings" showBack />

      <OptionRow
        x={2} y={CONTENT_Y + 4} width={W - 4}
        label="Theme" value={theme} options={themes}
        onChange={(v) => onThemeChange(v as ThemePresetName)}
        focusOrder={10}
      />
      <OptionRow
        x={2} y={CONTENT_Y + 16} width={W - 4}
        label="Camera" value={camera} options={cameras}
        onChange={onCameraChange}
        focusOrder={20}
      />
      <OptionRow
        x={2} y={CONTENT_Y + 28} width={W - 4}
        label="Pixels" value={String(pixelSize)} options={sizes}
        onChange={(v) => onPixelSizeChange(Number(v))}
        focusOrder={30}
      />
      <OptionRow
        x={2} y={CONTENT_Y + 40} width={W - 4}
        label="Persp." value={perspective ? "ON" : "OFF"} options={["OFF", "ON"]}
        onChange={(v) => onPerspectiveChange(v === "ON")}
        focusOrder={40}
      />

      <LCDDivider x={2} y={CONTENT_Y + 54} length={W - 4} />
      <LCDText x={4} y={CONTENT_Y + 58}>Changes apply live</LCDText>

      <HintBar left="Esc Back" right="Edit" />
    </>
  );
}

function AboutScreen({ onBack }: {
  onBack: () => void;
}) {
  useCancel(onBack);
  return (
    <>
      <TitleBar title="About" showBack />
      <LCDIcon x={4} y={CONTENT_Y + 4} name="gear" scale={2} />
      <LCDText x={24} y={CONTENT_Y + 6}>LCD UI Library</LCDText>
      <LCDText x={24} y={CONTENT_Y + 16}>Version 1.0</LCDText>

      <LCDDivider x={2} y={CONTENT_Y + 30} length={W - 4} />

      <LCDText x={4} y={CONTENT_Y + 34}>A retro LCD pixel</LCDText>
      <LCDText x={4} y={CONTENT_Y + 44}>grid UI library.</LCDText>
      <LCDText x={4} y={CONTENT_Y + 54}>Built with React</LCDText>
      <LCDText x={4} y={CONTENT_Y + 64}>and Canvas 2D.</LCDText>
      <HintBar left="Esc Back" right="" />
    </>
  );
}

export function NokiaMode({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<ScreenType>("menu");
  const [theme, setTheme] = useState<ThemePresetName>("green");
  const [camera, setCamera] = useState("straight");
  const [pixelSize, setPixelSize] = useState(5);
  const [perspective, setPerspective] = useState(false);

  const goBack = useCallback(() => setScreen("menu"), []);

  const cameras = CAMERAS;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize((s) => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize((s) => Math.min(8, s + 1));
      } else if (e.key === "," || e.key === "<") {
        setCamera((c) => {
          const idx = cameras.indexOf(c);
          return cameras[(idx - 1 + cameras.length) % cameras.length];
        });
      } else if (e.key === "\\") {
        setPerspective((p) => !p);
      } else if (e.key === "." || e.key === ">") {
        setCamera((c) => {
          const idx = cameras.indexOf(c);
          return cameras[(idx + 1) % cameras.length];
        });
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

        {screen === "menu" && <MainMenuScreen onNavigate={setScreen} onExit={onExit} />}
        {screen === "dashboard" && <DashboardScreen onBack={goBack} />}
        {screen === "files" && <FilesScreen onBack={goBack} />}
        {screen === "network" && <NetworkScreen onBack={goBack} />}
        {screen === "system" && <SystemScreen onBack={goBack} />}
        {screen === "settings" && (
          <SettingsScreen
            onBack={goBack}
            theme={theme}
            onThemeChange={setTheme}
            camera={camera}
            onCameraChange={setCamera}
            pixelSize={pixelSize}
            onPixelSizeChange={setPixelSize}
            perspective={perspective}
            onPerspectiveChange={setPerspective}
          />
        )}
        {screen === "about" && <AboutScreen onBack={goBack} />}
      </LCDScreen>
    </div>
  );
}
