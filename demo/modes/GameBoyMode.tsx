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

type Screen = "boot" | "menu" | "snake" | "pong" | "breakout" | "tetris" | "tetris-title" | "settings";

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
        return y + 8;
      });
    }, 67);
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
    { label: "Tetris", screen: "tetris-title" },
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
    const tw = font.measureText(title, 2);
    font.drawText(fb, title, ox + Math.floor((W - tw) / 2), oy + 8, { intensity: 1, scale: 2 });

    items.forEach((item, i) => {
      const marker = i === selected ? "> " : "  ";
      font.drawText(fb, marker + item.label, ox + 30, oy + 32 + i * 14, { intensity: i === selected ? 1 : 0.5, scale: 1 });
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

/* ── Tetris Title Screen ─────────────────────────────────── */

function TetrisTitleScreen({ onStart, onBack }: {
  onStart: () => void;
  onBack: () => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  useCancel(onBack);

  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: H },
    order: 10,
    onActivate: onStart,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    fb.fillRect(ox, oy, W, H, 0);

    // "TETRIS" bold title — draw twice offset for bold
    const title = "TETRIS";
    const tw = font.measureText(title, 3);
    const tx = ox + Math.floor((W - tw) / 2);
    const ty = oy + 8;
    font.drawText(fb, title, tx, ty, { intensity: 1, scale: 3 });
    font.drawText(fb, title, tx + 1, ty, { intensity: 1, scale: 3 });

    // "TM" superscript
    font.drawText(fb, "TM", tx + tw + 2, ty, { intensity: 0.6 });

    // Divider line below title
    for (let x = ox; x < ox + W; x++) fb.set(x, oy + 32, 0.5);

    // Scene: Russian onion dome + buildings silhouette (y=33 to y=95)
    const groundY = oy + 95;

    // Central onion dome
    const domeX = ox + 70;
    // Dome bulb (onion shape)
    for (let r = 0; r < 12; r++) {
      const w = r < 3 ? r + 1 : r < 6 ? 6 - Math.abs(r - 4) : r < 9 ? 8 - Math.abs(r - 7) : 10 - r;
      for (let dx = -w; dx <= w; dx++) {
        fb.set(domeX + dx, oy + 45 + r, 1);
      }
    }
    // Dome spire
    for (let i = 0; i < 8; i++) fb.set(domeX, oy + 37 + i, 1);
    fb.set(domeX, oy + 36, 0.7);
    // Cross on top
    fb.set(domeX - 1, oy + 37, 1);
    fb.set(domeX + 1, oy + 37, 1);
    // Dome base/tower
    fb.fillRect(domeX - 4, oy + 57, 9, 38, 1);
    // Tower windows
    for (let wy = oy + 60; wy < groundY - 4; wy += 6) {
      fb.fillRect(domeX - 2, wy, 2, 3, 0);
      fb.fillRect(domeX + 1, wy, 2, 3, 0);
    }

    // Left buildings
    const blds = [
      { x: 2,  w: 14, h: 30 },
      { x: 18, w: 10, h: 20 },
      { x: 30, w: 12, h: 35 },
      { x: 44, w: 8,  h: 15 },
      { x: 54, w: 10, h: 25 },
    ];
    for (const b of blds) {
      fb.fillRect(ox + b.x, groundY - b.h, b.w, b.h, 1);
      for (let wy = groundY - b.h + 3; wy < groundY - 3; wy += 5) {
        for (let wx = ox + b.x + 2; wx < ox + b.x + b.w - 2; wx += 4) {
          fb.fillRect(wx, wy, 2, 2, 0);
        }
      }
    }

    // Right buildings
    const rblds = [
      { x: 90,  w: 10, h: 20 },
      { x: 102, w: 14, h: 28 },
      { x: 118, w: 8,  h: 18 },
      { x: 128, w: 12, h: 32 },
      { x: 142, w: 14, h: 22 },
    ];
    for (const b of rblds) {
      fb.fillRect(ox + b.x, groundY - b.h, b.w, b.h, 1);
      for (let wy = groundY - b.h + 3; wy < groundY - 3; wy += 5) {
        for (let wx = ox + b.x + 2; wx < ox + b.x + b.w - 2; wx += 4) {
          fb.fillRect(wx, wy, 2, 2, 0);
        }
      }
    }

    // Ground
    fb.fillRect(ox, groundY, W, 2, 1);

    // Divider above menu
    for (let x = ox; x < ox + W; x++) fb.set(x, oy + 100, 0.5);

    // Menu: "Start" centered with > prefix
    const label = "Start";
    const lw = font.measureText(label);
    const lx = ox + Math.floor((W - lw) / 2);
    font.drawText(fb, ">", lx - 8, oy + 108, { intensity: 1 });
    font.drawText(fb, label, lx, oy + 108, { intensity: 1 });

    // Copyright
    const copy = "c1989  Game Boy";
    const cw = font.measureText(copy);
    font.drawText(fb, copy, ox + Math.floor((W - cw) / 2), oy + H - 10, { intensity: 0.5 });

    engine.markDirty();
  }, [engine, offsetX, offsetY]);

  return null;
}

/* ── Tetris ──────────────────────────────────────────────── */

// All 4 rotation states per piece — no position shifting needed
const TETRO_ROTATIONS: number[][][][] = [
  // I
  [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]], [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]], [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]],
  // O
  [[[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]], [[1,1],[1,1]]],
  // T
  [[[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]], [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]]],
  // L
  [[[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]], [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]]],
  // J
  [[[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]], [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]]],
  // S
  [[[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]], [[0,0,0],[0,1,1],[1,1,0]], [[1,0,0],[1,1,0],[0,1,0]]],
  // Z
  [[[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]], [[0,0,0],[1,1,0],[0,1,1]], [[0,1,0],[1,1,0],[1,0,0]]],
];

function TetrisGame({ onBack }: { onBack: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();
  const [frame, setFrame] = useState(0);
  const keysRef = useRef(new Set<string>());

  const CELL = 4;
  const BOARD_W = 10;
  const BOARD_H = 20;
  const TOP_BAR = 12;
  const BOARD_PX_W = BOARD_W * CELL;
  const BOARD_X = Math.floor((W - BOARD_PX_W) / 2);

  const randPiece = () => Math.floor(Math.random() * TETRO_ROTATIONS.length);

  const gameRef = useRef({
    board: Array.from({ length: BOARD_H }, () => new Array(BOARD_W).fill(0)) as number[][],
    pieceIdx: 0,
    rotation: 0,
    pieceX: 3,
    pieceY: 0,
    nextIdx: randPiece(),
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    dropCounter: 0,
  });

  const getPiece = (idx: number, rot: number) => TETRO_ROTATIONS[idx][rot];

  const newPiece = useCallback(() => {
    const g = gameRef.current;
    g.pieceIdx = g.nextIdx;
    g.rotation = 0;
    g.nextIdx = randPiece();
    const shape = getPiece(g.pieceIdx, 0);
    g.pieceX = Math.floor((BOARD_W - shape[0].length) / 2);
    g.pieceY = 0;
    if (collides(g.board, shape, g.pieceX, g.pieceY)) {
      g.gameOver = true;
    }
  }, []);

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.board = Array.from({ length: BOARD_H }, () => new Array(BOARD_W).fill(0));
    g.score = 0;
    g.lines = 0;
    g.level = 1;
    g.gameOver = false;
    g.dropCounter = 0;
    g.nextIdx = randPiece();
    newPiece();
  }, [newPiece]);

  useCancel(onBack);

  // Track held keys for fast repeat
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); };
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    engine.addKeyListener(down);
    window.addEventListener("keyup", up);
    return () => { engine.removeKeyListener(down); window.removeEventListener("keyup", up); };
  }, [engine]);

  // Key input — rotation and hard drop only (no repeat)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.gameOver) {
        if (e.key === "Enter") resetGame();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "z" || e.key === "x") {
        const nextRot = (g.rotation + 1) % 4;
        const rotated = getPiece(g.pieceIdx, nextRot);
        if (!collides(g.board, rotated, g.pieceX, g.pieceY)) {
          g.rotation = nextRot;
        } else if (!collides(g.board, rotated, g.pieceX - 1, g.pieceY)) {
          g.rotation = nextRot; g.pieceX--;
        } else if (!collides(g.board, rotated, g.pieceX + 1, g.pieceY)) {
          g.rotation = nextRot; g.pieceX++;
        }
        setFrame(f => f + 1);
      } else if (e.key === " ") {
        const shape = getPiece(g.pieceIdx, g.rotation);
        while (!collides(g.board, shape, g.pieceX, g.pieceY + 1)) {
          g.pieceY++;
        }
        lockPiece(g, shape);
        newPiece();
      }
      setFrame(f => f + 1);
    };
    engine.addKeyListener(handler);
    return () => engine.removeKeyListener(handler);
  }, [engine, resetGame, newPiece]);

  // Game loop
  const tickRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      const g = gameRef.current;
      if (g.gameOver) return;

      // Fast key repeat every 3 ticks (~150ms)
      tickRef.current++;
      if (tickRef.current % 3 === 0) {
        const keys = keysRef.current;
        const shape = getPiece(g.pieceIdx, g.rotation);
        if (keys.has("ArrowLeft") && !collides(g.board, shape, g.pieceX - 1, g.pieceY)) g.pieceX--;
        if (keys.has("ArrowRight") && !collides(g.board, shape, g.pieceX + 1, g.pieceY)) g.pieceX++;
        if (keys.has("ArrowDown") && !collides(g.board, shape, g.pieceX, g.pieceY + 1)) g.pieceY++;
      }

      const shape = getPiece(g.pieceIdx, g.rotation);
      g.dropCounter++;
      const speed = Math.max(2, 10 - g.level);
      if (g.dropCounter >= speed) {
        g.dropCounter = 0;
        if (!collides(g.board, shape, g.pieceX, g.pieceY + 1)) {
          g.pieceY++;
        } else {
          lockPiece(g, shape);
          newPiece();
        }
      }
      setFrame(f => f + 1);
    }, 50);
    return () => clearInterval(id);
  }, [newPiece]);

  // Render — authentic Game Boy Tetris layout
  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;
    const g = gameRef.current;
    const C = 7; // cell size in pixels (original GB Tetris used ~8px cells in 160x144)

    fb.fillRect(ox, oy, W, H, 0);

    // Board dimensions
    const bw = BOARD_W * C;
    const bh = BOARD_H * C; // 140px — nearly full height
    const bx = ox + 2; // board flush left with 2px margin
    const by = oy + 2;

    // Board border — double-line on left, right, bottom (authentic)
    for (let y = 0; y < bh; y++) {
      fb.set(bx - 1, by + y, 1);
      fb.set(bx - 2, by + y, 1);
      fb.set(bx + bw, by + y, 1);
      fb.set(bx + bw + 1, by + y, 1);
    }
    for (let x = -2; x <= bw + 1; x++) {
      fb.set(bx + x, by + bh, 1);
      fb.set(bx + x, by + bh + 1, 1);
    }

    // Draw brick helper
    const drawBrick = (px: number, py: number, intensity: number) => {
      // Filled cell with inner highlight for 3D brick look
      fb.fillRect(px, py, C - 1, C - 1, intensity);
      // Top-left highlight
      for (let i = 0; i < C - 1; i++) {
        fb.set(px + i, py, Math.min(1, intensity + 0.15));
        fb.set(px, py + i, Math.min(1, intensity + 0.15));
      }
      // Bottom-right shadow
      for (let i = 0; i < C - 2; i++) {
        fb.set(px + i + 1, py + C - 2, Math.max(0, intensity - 0.2));
        fb.set(px + C - 2, py + i + 1, Math.max(0, intensity - 0.2));
      }
    };

    // Board cells
    for (let r = 0; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        if (g.board[r][c]) {
          drawBrick(bx + c * C, by + r * C, 1);
        }
      }
    }

    // Current piece
    const curPiece = getPiece(g.pieceIdx, g.rotation);
    if (!g.gameOver) {
      for (let r = 0; r < curPiece.length; r++) {
        for (let c = 0; c < curPiece[r].length; c++) {
          if (curPiece[r][c]) {
            drawBrick(bx + (g.pieceX + c) * C, by + (g.pieceY + r) * C, 1);
          }
        }
      }
    }

    // Right panel — starts after board border
    const rx = bx + bw + 6; // right panel x
    const rw = W - rx - ox - 2; // remaining width

    // SCORE box
    const drawBox = (bxp: number, byp: number, w: number, h: number, label: string, value: string) => {
      // Thick border (2px)
      for (let x = 0; x < w; x++) {
        fb.set(bxp + x, byp, 1); fb.set(bxp + x, byp + 1, 1);
        fb.set(bxp + x, byp + h - 1, 1); fb.set(bxp + x, byp + h - 2, 1);
      }
      for (let y = 0; y < h; y++) {
        fb.set(bxp, byp + y, 1); fb.set(bxp + 1, byp + y, 1);
        fb.set(bxp + w - 1, byp + y, 1); fb.set(bxp + w - 2, byp + y, 1);
      }
      // Label centered on top border
      const lw = font.measureText(label);
      const lx = bxp + Math.floor((w - lw) / 2);
      fb.fillRect(lx - 1, byp, lw + 2, 2, 0);
      font.drawText(fb, label, lx, byp - 2, { intensity: 1 });
      // Value centered inside
      const vw = font.measureText(value);
      const vx = bxp + Math.floor((w - vw) / 2);
      font.drawText(fb, value, vx, byp + Math.floor((h - 7) / 2) + 1, { intensity: 1 });
    };

    drawBox(rx, by + 2, rw, 24, "SCORE", String(g.score));
    drawBox(rx, by + 32, rw, 24, "LEVEL", String(g.level));
    drawBox(rx, by + 62, rw, 24, "LINES", String(g.lines));

    // Next piece preview box
    const nby = by + 94;
    const nbh = bh - 92;
    // Thick border
    for (let x = 0; x < rw; x++) {
      fb.set(rx + x, nby, 1); fb.set(rx + x, nby + 1, 1);
      fb.set(rx + x, nby + nbh - 1, 1); fb.set(rx + x, nby + nbh - 2, 1);
    }
    for (let y = 0; y < nbh; y++) {
      fb.set(rx, nby + y, 1); fb.set(rx + 1, nby + y, 1);
      fb.set(rx + rw - 1, nby + y, 1); fb.set(rx + rw - 2, nby + y, 1);
    }
    // Next piece centered in box
    const np = getPiece(g.nextIdx, 0);
    const npW = np[0].length * C;
    const npH = np.length * C;
    const npx = rx + Math.floor((rw - npW) / 2);
    const npy = nby + Math.floor((nbh - npH) / 2);
    for (let r = 0; r < np.length; r++) {
      for (let c = 0; c < np[r].length; c++) {
        if (np[r][c]) {
          drawBrick(npx + c * C, npy + r * C, 0.8);
        }
      }
    }

    // Game over overlay
    if (g.gameOver) {
      fb.fillRect(bx, by + 50, bw, 36, 0);
      // Border around overlay
      for (let x = 0; x < bw; x++) { fb.set(bx + x, by + 50, 1); fb.set(bx + x, by + 85, 1); }
      for (let y = 50; y <= 85; y++) { fb.set(bx, by + y, 1); fb.set(bx + bw - 1, by + y, 1); }
      const goText = "GAME OVER";
      const gow = font.measureText(goText);
      font.drawText(fb, goText, bx + Math.floor((bw - gow) / 2), by + 56, { intensity: 1 });
      const retryText = "ENTER:Retry";
      const retw = font.measureText(retryText);
      font.drawText(fb, retryText, bx + Math.floor((bw - retw) / 2), by + 72, { intensity: 0.6 });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, frame]);

  return null;
}

function collides(board: number[][], piece: number[][], px: number, py: number): boolean {
  for (let r = 0; r < piece.length; r++) {
    for (let c = 0; c < piece[r].length; c++) {
      if (!piece[r][c]) continue;
      const bx = px + c;
      const by = py + r;
      if (bx < 0 || bx >= 10 || by >= 20) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function lockPiece(g: { board: number[][]; pieceX: number; pieceY: number; score: number; lines: number; level: number }, piece: number[][]) {
  for (let r = 0; r < piece.length; r++) {
    for (let c = 0; c < piece[r].length; c++) {
      if (piece[r][c]) {
        const by = g.pieceY + r;
        const bx = g.pieceX + c;
        if (by >= 0 && by < 20 && bx >= 0 && bx < 10) {
          g.board[by][bx] = 1;
        }
      }
    }
  }
  // Clear lines
  let cleared = 0;
  for (let r = 19; r >= 0; r--) {
    if (g.board[r].every(c => c === 1)) {
      g.board.splice(r, 1);
      g.board.unshift(new Array(10).fill(0));
      cleared++;
      r++; // recheck this row
    }
  }
  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800];
    g.score += (points[cleared] || 800) * g.level;
    g.lines += cleared;
    g.level = Math.floor(g.lines / 10) + 1;
  }
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

export function GameBoyMode({ onExit, camera, setCamera, perspective, setPerspective, pixelSize, setPixelSize }: {
  onExit: () => void;
  camera: string;
  setCamera: (fn: (s: string) => string) => void;
  perspective: boolean;
  setPerspective: (fn: (s: boolean) => boolean) => void;
  pixelSize: number;
  setPixelSize: (fn: (s: number) => number) => void;
}) {
  const [screen, setScreen] = useState<Screen>("boot");
  const [theme, setTheme] = useState<ThemePresetName>("gameboy");

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
        {screen === "tetris-title" && (
          <TetrisTitleScreen
            onStart={() => setScreen("tetris")}
            onBack={goMenu}
          />
        )}
        {screen === "tetris" && <TetrisGame onBack={() => setScreen("tetris-title")} />}
        {screen === "snake" && <SnakeGame onBack={goMenu} />}
        {screen === "pong" && <PongGame onBack={goMenu} />}
        {screen === "breakout" && <BreakoutGame onBack={goMenu} />}
        {screen === "settings" && (
          <SettingsScreen
            onBack={goMenu}
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
