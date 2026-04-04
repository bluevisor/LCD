import { useState, useEffect, useCallback, useRef } from "react";
import {
  LCDScreen,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont();

const W = 160;
const H = 144;
const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

type Screen = "boot" | "menu" | "snake" | "pong" | "breakout" | "settings";

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

/* ── Boot Screen ─────────────────────────────────────────── */

function BootScreen({ onDone }: { onDone: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [textY, setTextY] = useState(-20);
  const targetY = Math.floor(H / 2) - 7;

  useEffect(() => {
    const id = setInterval(() => {
      setTextY(y => {
        if (y >= targetY) return targetY;
        return y + 12;
      });
    }, 150);
    return () => clearInterval(id);
  }, [targetY]);

  useEffect(() => {
    if (textY >= targetY) {
      const timer = setTimeout(onDone, 1200);
      return () => clearTimeout(timer);
    }
  }, [textY, targetY, onDone]);

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    const text = "GAME BOY";
    const scale = 2;
    const tw = font.measureText(text, scale);
    const tx = ox + Math.floor((W - tw) / 2);
    const ty = oy + textY;

    // Draw twice offset by 1px for bold effect
    font.drawText(fb, text, tx, ty, { intensity: 1, scale });
    font.drawText(fb, text, tx + 1, ty, { intensity: 1, scale });

    // Registered trademark symbol (small dot pattern after text)
    const tmX = tx + tw + 3;
    const tmY = ty;
    fb.set(tmX, tmY, 0.6);
    fb.set(tmX + 1, tmY, 0.6);
    fb.set(tmX, tmY + 1, 0.6);

    engine.markDirty();
  }, [engine, offsetX, offsetY, textY]);

  return null;
}

/* ── Game Select Menu ────────────────────────────────────── */

function MenuScreen({ onSelect, onExit }: { onSelect: (s: Screen) => void; onExit: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [selected, setSelected] = useState(0);
  const items: { label: string; screen: Screen | "exit" }[] = [
    { label: "Snake", screen: "snake" },
    { label: "Pong", screen: "pong" },
    { label: "Breakout", screen: "breakout" },
    { label: "Settings", screen: "settings" },
  ];

  useCancel(onExit);

  const onUp = useCallback(() => {
    setSelected(s => Math.max(0, s - 1));
    return true;
  }, []);
  const onDown = useCallback(() => {
    setSelected(s => Math.min(items.length - 1, s + 1));
    return true;
  }, [items.length]);
  const onActivate = useCallback(() => {
    const item = items[selected];
    if (item.screen === "exit") {
      onExit();
    } else {
      onSelect(item.screen);
    }
  }, [selected, items, onSelect, onExit]);

  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: H },
    order: 10,
    onUp,
    onDown,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    const title = "SELECT GAME";
    const tw = font.measureText(title) * 2;
    font.drawText(fb, title, ox + Math.floor((W - tw) / 2), oy + 10, { intensity: 1, scale: 2 });

    items.forEach((item, i) => {
      const marker = i === selected ? "> " : "  ";
      font.drawText(fb, marker + item.label, ox + 30, oy + 45 + i * 20, { intensity: i === selected ? 1 : 0.5, scale: 2 });
    });

    font.drawText(fb, "ESC:Back  ENTER:Select", ox + 10, oy + H - 12, { intensity: 0.4 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected]);

  return null;
}

/* ── Snake ───────────────────────────────────────────────── */

function SnakeGame({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [frame, setFrame] = useState(0);
  const CELL = 4;
  const COLS = 40;
  const ROWS = 33;
  const TOP_BAR = 12;

  const gameRef = useRef({
    snake: [{ x: 10, y: 10 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    score: 0,
    gameOver: false,
  });

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.snake = [{ x: 10, y: 10 }];
    g.dir = { x: 1, y: 0 };
    g.nextDir = { x: 1, y: 0 };
    g.food = { x: 15, y: 10 };
    g.score = 0;
    g.gameOver = false;
  }, []);

  const onBackCb = useCallback(() => onBack(), [onBack]);
  useCancel(onBackCb);

  // Key input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.gameOver) {
        if (e.key === "Enter") {
          resetGame();
        }
        return;
      }
      const { dir } = g;
      if (e.key === "ArrowUp" && dir.y !== 1) g.nextDir = { x: 0, y: -1 };
      else if (e.key === "ArrowDown" && dir.y !== -1) g.nextDir = { x: 0, y: 1 };
      else if (e.key === "ArrowLeft" && dir.x !== 1) g.nextDir = { x: -1, y: 0 };
      else if (e.key === "ArrowRight" && dir.x !== -1) g.nextDir = { x: 1, y: 0 };
    };
    engine.addKeyListener(handler);
    return () => engine.removeKeyListener(handler);
  }, [engine, resetGame]);

  // Game loop
  useEffect(() => {
    const id = setInterval(() => {
      const g = gameRef.current;
      if (g.gameOver) { setFrame(f => f + 1); return; }

      g.dir = { ...g.nextDir };
      const head = g.snake[0];
      const nx = head.x + g.dir.x;
      const ny = head.y + g.dir.y;

      // Wall collision
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        g.gameOver = true;
        setFrame(f => f + 1);
        return;
      }

      // Self collision
      if (g.snake.some(s => s.x === nx && s.y === ny)) {
        g.gameOver = true;
        setFrame(f => f + 1);
        return;
      }

      g.snake.unshift({ x: nx, y: ny });

      // Food collision
      if (nx === g.food.x && ny === g.food.y) {
        g.score++;
        // New food not on snake
        let fx: number, fy: number;
        do {
          fx = Math.floor(Math.random() * COLS);
          fy = Math.floor(Math.random() * ROWS);
        } while (g.snake.some(s => s.x === fx && s.y === fy));
        g.food = { x: fx, y: fy };
      } else {
        g.snake.pop();
      }

      setFrame(f => f + 1);
    }, 120);
    return () => clearInterval(id);
  }, []);

  // Render
  useEffect(() => {
    const fb = engine.fb;
    const g = gameRef.current;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    // Score
    font.drawText(fb, `SCORE: ${g.score}`, ox + 2, oy + 2, { intensity: 1 });

    if (g.gameOver) {
      const goText = "GAME OVER";
      const tw = font.measureText(goText) * 2;
      font.drawText(fb, goText, ox + Math.floor((W - tw) / 2), oy + 50, { intensity: 1, scale: 2 });
      const scoreText = `SCORE: ${g.score}`;
      const sw = font.measureText(scoreText) * 2;
      font.drawText(fb, scoreText, ox + Math.floor((W - sw) / 2), oy + 75, { intensity: 1, scale: 2 });
      font.drawText(fb, "ENTER:RETRY", ox + Math.floor((W - font.measureText("ENTER:RETRY")) / 2), oy + H - 15, { intensity: 0.6 });
    } else {
      // Food
      fb.fillRect(ox + g.food.x * CELL, oy + TOP_BAR + g.food.y * CELL, CELL, CELL, 0.6);

      // Snake
      for (const seg of g.snake) {
        fb.fillRect(ox + seg.x * CELL, oy + TOP_BAR + seg.y * CELL, CELL, CELL, 1);
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, frame]);

  return null;
}

/* ── Pong ────────────────────────────────────────────────── */

function PongGame({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [frame, setFrame] = useState(0);

  const PADDLE_W = 3;
  const PADDLE_H = 20;
  const BALL_SIZE = 3;
  const PLAY_TOP = 12;
  const WIN_SCORE = 5;

  const gameRef = useRef({
    playerY: 60,
    cpuY: 60,
    ballX: 80,
    ballY: 72,
    ballDX: 2,
    ballDY: 1,
    playerScore: 0,
    cpuScore: 0,
    gameOver: false,
    winner: "" as string,
  });

  const resetBall = useCallback((g: typeof gameRef.current) => {
    g.ballX = 80;
    g.ballY = 72;
    g.ballDX = (Math.random() > 0.5 ? 1 : -1) * 2;
    g.ballDY = (Math.random() - 0.5) * 2;
  }, []);

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.playerY = 60;
    g.cpuY = 60;
    g.playerScore = 0;
    g.cpuScore = 0;
    g.gameOver = false;
    g.winner = "";
    resetBall(g);
  }, [resetBall]);

  const onBackCb = useCallback(() => onBack(), [onBack]);
  useCancel(onBackCb);

  // Key input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.gameOver && e.key === "Enter") {
        resetGame();
        return;
      }
      if (e.key === "ArrowUp") g.playerY = Math.max(PLAY_TOP, g.playerY - 6);
      else if (e.key === "ArrowDown") g.playerY = Math.min(H - PADDLE_H, g.playerY + 6);
    };
    engine.addKeyListener(handler);
    return () => engine.removeKeyListener(handler);
  }, [engine, resetGame]);

  // Game loop
  useEffect(() => {
    const id = setInterval(() => {
      const g = gameRef.current;
      if (g.gameOver) { setFrame(f => f + 1); return; }

      // CPU AI
      const cpuCenter = g.cpuY + PADDLE_H / 2;
      const diff = g.ballY - cpuCenter;
      if (Math.abs(diff) > 2) {
        g.cpuY += diff > 0 ? 1.5 : -1.5;
      }
      g.cpuY = Math.max(PLAY_TOP, Math.min(H - PADDLE_H, g.cpuY));

      // Ball movement
      g.ballX += g.ballDX;
      g.ballY += g.ballDY;

      // Top/bottom bounce
      if (g.ballY <= PLAY_TOP) { g.ballY = PLAY_TOP; g.ballDY = Math.abs(g.ballDY); }
      if (g.ballY + BALL_SIZE >= H) { g.ballY = H - BALL_SIZE; g.ballDY = -Math.abs(g.ballDY); }

      // Player paddle bounce (left)
      if (g.ballX <= 4 + PADDLE_W && g.ballX >= 4 &&
          g.ballY + BALL_SIZE >= g.playerY && g.ballY <= g.playerY + PADDLE_H) {
        g.ballX = 4 + PADDLE_W;
        g.ballDX = Math.abs(g.ballDX);
        const hitPos = (g.ballY - g.playerY) / PADDLE_H - 0.5;
        g.ballDY = hitPos * 4;
      }

      // CPU paddle bounce (right)
      if (g.ballX + BALL_SIZE >= 153 && g.ballX <= 153 + PADDLE_W &&
          g.ballY + BALL_SIZE >= g.cpuY && g.ballY <= g.cpuY + PADDLE_H) {
        g.ballX = 153 - BALL_SIZE;
        g.ballDX = -Math.abs(g.ballDX);
        const hitPos = (g.ballY - g.cpuY) / PADDLE_H - 0.5;
        g.ballDY = hitPos * 4;
      }

      // Scoring
      if (g.ballX < 0) {
        g.cpuScore++;
        if (g.cpuScore >= WIN_SCORE) { g.gameOver = true; g.winner = "CPU WINS"; }
        else resetBall(g);
      }
      if (g.ballX > W) {
        g.playerScore++;
        if (g.playerScore >= WIN_SCORE) { g.gameOver = true; g.winner = "YOU WIN"; }
        else resetBall(g);
      }

      setFrame(f => f + 1);
    }, 33);
    return () => clearInterval(id);
  }, [resetBall]);

  // Render
  useEffect(() => {
    const fb = engine.fb;
    const g = gameRef.current;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    // Score
    font.drawText(fb, `P1:${g.playerScore}  CPU:${g.cpuScore}`, ox + 2, oy + 2, { intensity: 1 });

    if (g.gameOver) {
      const tw = font.measureText(g.winner) * 2;
      font.drawText(fb, g.winner, ox + Math.floor((W - tw) / 2), oy + 55, { intensity: 1, scale: 2 });
      font.drawText(fb, "ENTER:RETRY", ox + Math.floor((W - font.measureText("ENTER:RETRY")) / 2), oy + H - 15, { intensity: 0.6 });
    } else {
      // Center line
      for (let y = PLAY_TOP; y < H; y += 4) {
        fb.set(ox + 80, oy + y, 0.3);
      }

      // Player paddle
      fb.fillRect(ox + 4, oy + Math.round(g.playerY), PADDLE_W, PADDLE_H, 1);
      // CPU paddle
      fb.fillRect(ox + 153, oy + Math.round(g.cpuY), PADDLE_W, PADDLE_H, 1);
      // Ball
      fb.fillRect(ox + Math.round(g.ballX), oy + Math.round(g.ballY), BALL_SIZE, BALL_SIZE, 1);
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, frame]);

  return null;
}

/* ── Breakout ────────────────────────────────────────────── */

function BreakoutGame({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [frame, setFrame] = useState(0);

  const PADDLE_W = 24;
  const PADDLE_H = 3;
  const PADDLE_Y = 138;
  const BALL_SIZE = 3;
  const BRICK_W = 10;
  const BRICK_H = 5;
  const BRICK_GAP = 1;
  const BRICKS_PER_ROW = 14;

  function makeBricks() {
    const bricks: { x: number; y: number; w: number; h: number; alive: boolean; intensity: number; row: number }[] = [];
    const intensities = [1.0, 0.7, 0.5];
    const startY = [20, 28, 36];
    for (let row = 0; row < 3; row++) {
      const totalW = BRICKS_PER_ROW * (BRICK_W + BRICK_GAP) - BRICK_GAP;
      const startX = Math.floor((W - totalW) / 2);
      for (let col = 0; col < BRICKS_PER_ROW; col++) {
        bricks.push({
          x: startX + col * (BRICK_W + BRICK_GAP),
          y: startY[row],
          w: BRICK_W,
          h: BRICK_H,
          alive: true,
          intensity: intensities[row],
          row,
        });
      }
    }
    return bricks;
  }

  const gameRef = useRef({
    paddleX: 70,
    ballX: 80,
    ballY: 130,
    ballDX: 1.5,
    ballDY: -1.5,
    bricks: makeBricks(),
    score: 0,
    lives: 3,
    running: false,
    gameOver: false,
    won: false,
  });

  const resetBall = useCallback((g: typeof gameRef.current) => {
    g.ballX = g.paddleX + PADDLE_W / 2;
    g.ballY = PADDLE_Y - BALL_SIZE - 1;
    g.ballDX = 1.5;
    g.ballDY = -1.5;
    g.running = false;
  }, []);

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.paddleX = 70;
    g.bricks = makeBricks();
    g.score = 0;
    g.lives = 3;
    g.gameOver = false;
    g.won = false;
    resetBall(g);
  }, [resetBall]);

  const onBackCb = useCallback(() => onBack(), [onBack]);
  useCancel(onBackCb);

  // Key input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.gameOver && e.key === "Enter") {
        resetGame();
        return;
      }
      if (e.key === "Enter" && !g.running && !g.gameOver) {
        g.running = true;
        return;
      }
      if (e.key === "ArrowLeft") g.paddleX = Math.max(0, g.paddleX - 6);
      else if (e.key === "ArrowRight") g.paddleX = Math.min(W - PADDLE_W, g.paddleX + 6);

      // Keep ball on paddle when not running
      if (!g.running && !g.gameOver) {
        g.ballX = g.paddleX + PADDLE_W / 2 - BALL_SIZE / 2;
      }
    };
    engine.addKeyListener(handler);
    return () => engine.removeKeyListener(handler);
  }, [engine, resetGame]);

  // Game loop
  useEffect(() => {
    const id = setInterval(() => {
      const g = gameRef.current;
      if (g.gameOver || !g.running) { setFrame(f => f + 1); return; }

      g.ballX += g.ballDX;
      g.ballY += g.ballDY;

      // Wall bounces
      if (g.ballX <= 0) { g.ballX = 0; g.ballDX = Math.abs(g.ballDX); }
      if (g.ballX + BALL_SIZE >= W) { g.ballX = W - BALL_SIZE; g.ballDX = -Math.abs(g.ballDX); }
      if (g.ballY <= 12) { g.ballY = 12; g.ballDY = Math.abs(g.ballDY); }

      // Paddle bounce
      if (g.ballY + BALL_SIZE >= PADDLE_Y && g.ballY + BALL_SIZE <= PADDLE_Y + PADDLE_H + 2 &&
          g.ballX + BALL_SIZE >= g.paddleX && g.ballX <= g.paddleX + PADDLE_W) {
        g.ballY = PADDLE_Y - BALL_SIZE;
        g.ballDY = -Math.abs(g.ballDY);
        // Angle based on hit position
        const hitPos = (g.ballX + BALL_SIZE / 2 - g.paddleX) / PADDLE_W - 0.5;
        g.ballDX = hitPos * 4;
      }

      // Below paddle
      if (g.ballY > PADDLE_Y + PADDLE_H + 5) {
        g.lives--;
        if (g.lives <= 0) {
          g.gameOver = true;
        } else {
          resetBall(g);
        }
        setFrame(f => f + 1);
        return;
      }

      // Brick collisions
      for (const brick of g.bricks) {
        if (!brick.alive) continue;
        if (g.ballX + BALL_SIZE > brick.x && g.ballX < brick.x + brick.w &&
            g.ballY + BALL_SIZE > brick.y && g.ballY < brick.y + brick.h) {
          brick.alive = false;
          g.score += 10 * (3 - brick.row);
          // Determine bounce direction
          const overlapLeft = g.ballX + BALL_SIZE - brick.x;
          const overlapRight = brick.x + brick.w - g.ballX;
          const overlapTop = g.ballY + BALL_SIZE - brick.y;
          const overlapBottom = brick.y + brick.h - g.ballY;
          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);
          if (minOverlapX < minOverlapY) {
            g.ballDX = -g.ballDX;
          } else {
            g.ballDY = -g.ballDY;
          }
          break;
        }
      }

      // Check win
      if (g.bricks.every(b => !b.alive)) {
        g.gameOver = true;
        g.won = true;
      }

      setFrame(f => f + 1);
    }, 20);
    return () => clearInterval(id);
  }, [resetBall]);

  // Render
  useEffect(() => {
    const fb = engine.fb;
    const g = gameRef.current;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    // Score and lives
    font.drawText(fb, `SCORE:${g.score}`, ox + 2, oy + 2, { intensity: 1 });
    const hearts = "\x03".repeat(g.lives); // fallback: just use text
    font.drawText(fb, `L:${g.lives}`, ox + W - 30, oy + 2, { intensity: 1 });

    if (g.gameOver) {
      const msg = g.won ? "YOU WIN!" : "GAME OVER";
      const tw = font.measureText(msg) * 2;
      font.drawText(fb, msg, ox + Math.floor((W - tw) / 2), oy + 55, { intensity: 1, scale: 2 });
      const scoreText = `SCORE: ${g.score}`;
      const sw = font.measureText(scoreText) * 2;
      font.drawText(fb, scoreText, ox + Math.floor((W - sw) / 2), oy + 80, { intensity: 1, scale: 2 });
      font.drawText(fb, "ENTER:RETRY", ox + Math.floor((W - font.measureText("ENTER:RETRY")) / 2), oy + H - 15, { intensity: 0.6 });
    } else {
      // Bricks
      for (const brick of g.bricks) {
        if (!brick.alive) continue;
        fb.fillRect(ox + brick.x, oy + brick.y, brick.w, brick.h, brick.intensity);
      }

      // Paddle
      fb.fillRect(ox + Math.round(g.paddleX), oy + PADDLE_Y, PADDLE_W, PADDLE_H, 1);

      // Ball
      fb.fillRect(ox + Math.round(g.ballX), oy + Math.round(g.ballY), BALL_SIZE, BALL_SIZE, 1);

      if (!g.running) {
        font.drawText(fb, "ENTER TO LAUNCH", ox + Math.floor((W - font.measureText("ENTER TO LAUNCH")) / 2), oy + 110, { intensity: 0.6 });
      }
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, frame]);

  return null;
}

/* ── Settings ────────────────────────────────────────────── */

function OptionRow({ y, label, value, options, onChange, focusOrder }: {
  y: number;
  label: string; value: string;
  options: string[];
  onChange: (val: string) => void;
  focusOrder: number;
}) {
  const { engine, offsetX, offsetY } = useLCD();
  const absX = offsetX;
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
    rect: { x: absX, y: absY, width: W, height: 14 },
    order: focusOrder,
    onLeft,
    onRight,
  });

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(absX, absY, W, 14, 0);
    font.drawText(fb, label, absX + 4, absY + 3, { intensity: 1 });
    const valText = `< ${value} >`;
    const valW = font.measureText(valText);
    font.drawText(fb, valText, absX + W - valW - 4, absY + 3, {
      intensity: focused ? 1 : 0.5,
    });
    engine.markDirty();
  }, [engine, absX, absY, label, value, focused]);

  return null;
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
  const { engine, offsetX, offsetY } = useLCD();
  const themes: ThemePresetName[] = ["gameboy", "green", "amber", "gray", "blue"];
  const sizes = ["2", "3", "4", "5", "6", "7", "8"];

  useCancel(onBack);

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, 16, 0);
    const title = "SETTINGS";
    const tw = font.measureText(title);
    font.drawText(fb, title, ox + Math.floor((W - tw) / 2), oy + 4, { intensity: 1 });
    for (let x = ox + 4; x < ox + W - 4; x++) fb.set(x, oy + 13, 0.4);
    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return (
    <>
      <OptionRow y={18} label="Theme" value={theme} options={themes} onChange={(v) => onThemeChange(v as ThemePresetName)} focusOrder={10} />
      <OptionRow y={34} label="Camera" value={camera} options={CAMERAS} onChange={onCameraChange} focusOrder={20} />
      <OptionRow y={50} label="Pixels" value={String(pixelSize)} options={sizes} onChange={(v) => onPixelSizeChange(Number(v))} focusOrder={30} />
      <OptionRow y={66} label="Persp" value={perspective ? "ON" : "OFF"} options={["OFF", "ON"]} onChange={(v) => onPerspectiveChange(v === "ON")} focusOrder={40} />
    </>
  );
}

/* ── Main Export ──────────────────────────────────────────── */

export function GameBoyMode({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("boot");
  const [theme, setTheme] = useState<ThemePresetName>("gameboy");
  const [camera, setCamera] = useState("straight");
  const [pixelSize, setPixelSize] = useState(4);
  const [perspective, setPerspective] = useState(false);

  const goMenu = useCallback(() => setScreen("menu"), []);

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
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={theme} camera={camera} perspective={perspective}>
        <ClearRect x={0} y={0} width={W} height={H} deps={[screen]} />

        {screen === "boot" && <BootScreen onDone={goMenu} />}
        {screen === "menu" && <MenuScreen onSelect={setScreen} onExit={onExit} />}
        {screen === "snake" && <SnakeGame onBack={goMenu} />}
        {screen === "pong" && <PongGame onBack={goMenu} />}
        {screen === "breakout" && <BreakoutGame onBack={goMenu} />}
        {screen === "settings" && (
          <SettingsScreen
            onBack={goMenu}
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
      </LCDScreen>
    </div>
  );
}
