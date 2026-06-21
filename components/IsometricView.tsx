'use client';

import { useEffect, useRef, useState } from 'react';
import { Tree } from '@/lib/db';

// ── Canvas & grid ────────────────────────────────────────────────────────────
const CW = 640, CH = 380;
const COLS = 14, ROWS = 10;
const HW = 24, HH = 12;
const OX = 272, OY = 58;

// Shed: east side of farm
const SHED_COL = 11, SHED_ROW = 4;

// ── Farm polygon (normalized 0..1, identical to FarmMap.tsx) ────────────────
const FARM_POLY = [
  { x: 0.10, y: 0.42 }, // 西端（尖り）
  { x: 0.22, y: 0.18 }, // 北西
  { x: 0.42, y: 0.10 }, // 北中央
  { x: 0.60, y: 0.12 }, // 北東寄り
  { x: 0.75, y: 0.22 }, // 北東
  { x: 0.88, y: 0.35 }, // 東端上
  { x: 0.90, y: 0.50 }, // 東端（尖り）
  { x: 0.82, y: 0.65 }, // 東南
  { x: 0.65, y: 0.75 }, // 南東
  { x: 0.45, y: 0.78 }, // 南中央
  { x: 0.28, y: 0.72 }, // 南西
  { x: 0.14, y: 0.58 }, // 西南
];

function polyContains(fx: number, fy: number): boolean {
  let inside = false;
  const n = FARM_POLY.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const { x: xi, y: yi } = FARM_POLY[i];
    const { x: xj, y: yj } = FARM_POLY[j];
    if ((yi > fy) !== (yj > fy) && fx < ((xj - xi) * (fy - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function isFarmTile(col: number, row: number): boolean {
  return polyContains(col / (COLS - 1), row / (ROWS - 1));
}

// ── Weed system ──────────────────────────────────────────────────────────────
const WEED_KEY   = 'hn_weed_last';
const WEED_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days → 100%

// ── Farmers ──────────────────────────────────────────────────────────────────
const SPEECHES = [
  'よし！', '収穫だ！', '水やり完了', 'いい天気♪',
  'ナッツ育ってる', '剪定しよう', '豊作かな？',
  '肥料まかなきゃ', 'おつかれ！', '土が乾いてる',
];

interface Farmer {
  x: number; y: number; tx: number; ty: number;
  speed: number; shirt: string; hat: string;
  speech: string | null; stimer: number; wtimer: number;
}

function mkFarmer(x: number, y: number, shirt: string, hat: string): Farmer {
  return { x, y, tx: x, ty: y, speed: 0.014 + Math.random() * 0.012,
    shirt, hat, speech: null, stimer: 0, wtimer: ~~(Math.random() * 80) };
}

function randFarmPos(): [number, number] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const col = 1 + ~~(Math.random() * (COLS - 2));
    const row = 1 + ~~(Math.random() * (ROWS - 2));
    if (isFarmTile(col, row)) return [col, row];
  }
  return [6, 4]; // fallback center
}

// ── Coordinate helpers ───────────────────────────────────────────────────────
function isoXY(col: number, row: number): [number, number] {
  return [OX + (col - row) * HW, OY + (col + row) * HH];
}
function isoCenter(col: number, row: number): [number, number] {
  const [x, y] = isoXY(col, row);
  return [x, y + HH];
}

// ── Component ────────────────────────────────────────────────────────────────
interface Props { trees: Tree[] }

export default function IsometricView({ trees }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const treesRef   = useRef(trees);
  const farmersRef = useRef<Farmer[]>([
    mkFarmer(3, 5, '#3B82F6', '#92400E'),
    mkFarmer(8, 4, '#16A34A', '#B45309'),
    mkFarmer(5, 6, '#DC2626', '#365314'),
  ]);

  const [weedLevel, setWeedLevel] = useState(0);
  const [daysSince, setDaysSince] = useState(0);

  useEffect(() => { treesRef.current = trees; }, [trees]);

  // Weed ticker
  useEffect(() => {
    function tick() {
      let ts = Number(localStorage.getItem(WEED_KEY) ?? 0);
      if (!ts) { ts = Date.now(); localStorage.setItem(WEED_KEY, String(ts)); }
      const elapsed = Date.now() - ts;
      setWeedLevel(Math.min(100, Math.round((elapsed / WEED_MS) * 100)));
      setDaysSince(elapsed / 86400000);
    }
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  const handleWeed = () => {
    localStorage.setItem(WEED_KEY, String(Date.now()));
    setWeedLevel(0); setDaysSince(0);
  };

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // ── Tile ──────────────────────────────────────────────────────────────────
    function drawTile(col: number, row: number, color: string) {
      const [x, y] = isoXY(col, row);
      ctx.beginPath();
      ctx.moveTo(x,      y);
      ctx.lineTo(x + HW, y + HH);
      ctx.lineTo(x,      y + HH * 2);
      ctx.lineTo(x - HW, y + HH);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // ── Tree (3-layer triangles) ──────────────────────────────────────────────
    function drawTree(col: number, row: number) {
      const [cx, cy] = isoCenter(col, row);
      // Trunk
      ctx.fillStyle = '#78350F';
      ctx.fillRect(cx - 2.5, cy - 5, 5, 7);
      // Foliage layers: [half-width, y-offset from cy]
      const layers: [number, number][] = [[17, 0], [12, -9], [7, -17]];
      const colors = ['#14532D', '#166534', '#22C55E'];
      for (let i = 0; i < 3; i++) {
        const [w, dy] = layers[i];
        ctx.beginPath();
        ctx.moveTo(cx,     cy + dy - w * 0.75);
        ctx.lineTo(cx + w, cy + dy);
        ctx.lineTo(cx - w, cy + dy);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // ── Shed (half scale, east corner) ───────────────────────────────────────
    function drawShed(col: number, row: number) {
      const [x, y] = isoXY(col, row);
      const sx = 0.36, wh = 11, rh = 6;
      const hw2 = HW * sx, hh2 = HH * sx;

      // Roof
      ctx.beginPath();
      ctx.moveTo(x,       y - rh);
      ctx.lineTo(x + hw2, y - rh + hh2);
      ctx.lineTo(x,       y - rh + hh2 * 2);
      ctx.lineTo(x - hw2, y - rh + hh2);
      ctx.closePath();
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#B91C1C'; ctx.lineWidth = 1; ctx.stroke();

      // Left wall
      ctx.beginPath();
      ctx.moveTo(x - hw2, y - rh + hh2);
      ctx.lineTo(x,       y - rh + hh2 * 2);
      ctx.lineTo(x,       y - rh + hh2 * 2 + wh);
      ctx.lineTo(x - hw2, y - rh + hh2 + wh);
      ctx.closePath();
      ctx.fillStyle = '#B45309';
      ctx.fill();
      ctx.strokeStyle = '#92400E'; ctx.lineWidth = 0.5; ctx.stroke();

      // Right wall
      ctx.beginPath();
      ctx.moveTo(x + hw2, y - rh + hh2);
      ctx.lineTo(x,       y - rh + hh2 * 2);
      ctx.lineTo(x,       y - rh + hh2 * 2 + wh);
      ctx.lineTo(x + hw2, y - rh + hh2 + wh);
      ctx.closePath();
      ctx.fillStyle = '#92400E';
      ctx.fill();
      ctx.strokeStyle = '#78350F'; ctx.lineWidth = 0.5; ctx.stroke();

      // Door
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(x - 3, y - rh + hh2 * 2 + 4, 6, 7);
    }

    // ── Farmer ────────────────────────────────────────────────────────────────
    function drawFarmer(f: Farmer) {
      const fx = OX + (f.x - f.y) * HW;
      const fy = OY + (f.x + f.y + 1) * HH;

      ctx.beginPath();
      ctx.ellipse(fx, fy, 7, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      ctx.fillStyle = '#44403C';
      ctx.fillRect(fx - 4, fy - 12, 3, 9);
      ctx.fillRect(fx + 1, fy - 12, 3, 9);

      ctx.beginPath();
      ctx.ellipse(fx, fy - 18, 5.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = f.shirt; ctx.fill();

      ctx.beginPath();
      ctx.arc(fx, fy - 27, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FCD34D'; ctx.fill();
      ctx.strokeStyle = '#D97706'; ctx.lineWidth = 0.5; ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(fx, fy - 32, 8.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = f.hat; ctx.fill();
      ctx.fillRect(fx - 4.5, fy - 41, 9, 10);

      if (f.speech && f.stimer > 0) drawBubble(fx, fy - 43, f.speech, Math.min(1, f.stimer / 18));
    }

    function drawBubble(fx: number, fy: number, text: string, alpha: number) {
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 10px "Hiragino Sans", "Meiryo", sans-serif';
      const tw = ctx.measureText(text).width;
      const bw = tw + 14, bh = 18;
      const bx = fx - bw / 2, by = fy - bh;
      ctx.fillStyle = '#FEFCE8'; ctx.strokeStyle = '#A3A3A3'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 4, by + bh); ctx.lineTo(fx, fy + 2); ctx.lineTo(fx + 4, by + bh);
      ctx.closePath(); ctx.fillStyle = '#FEFCE8'; ctx.fill();
      ctx.strokeStyle = '#A3A3A3'; ctx.stroke();
      ctx.fillStyle = '#374151'; ctx.fillText(text, bx + 7, by + bh - 5);
      ctx.globalAlpha = 1;
    }

    // ── Farmer update ─────────────────────────────────────────────────────────
    function updateFarmers() {
      for (const f of farmersRef.current) {
        if (f.wtimer > 0) { f.wtimer--; continue; }
        const dx = f.tx - f.x, dy = f.ty - f.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.06) {
          f.x = f.tx; f.y = f.ty;
          f.wtimer = 40 + ~~(Math.random() * 100);
          if (Math.random() < 0.5) {
            f.speech = SPEECHES[~~(Math.random() * SPEECHES.length)];
            f.stimer = 110;
          }
          [f.tx, f.ty] = randFarmPos();
        } else {
          f.x += (dx / d) * f.speed;
          f.y += (dy / d) * f.speed;
        }
        if (f.stimer > 0) { f.stimer--; if (!f.stimer) f.speech = null; }
      }
    }

    // ── Mountain (岩木山) ─────────────────────────────────────────────────────
    function drawMountain() {
      const PX = 290, PY = 4;        // peak
      const BASE_Y = 158;            // horizon line

      // Atmosphere haze behind mountain
      const atmo = ctx.createRadialGradient(PX, BASE_Y, 0, PX, BASE_Y, 380);
      atmo.addColorStop(0, 'rgba(200,228,248,0.55)');
      atmo.addColorStop(1, 'rgba(200,228,248,0)');
      ctx.fillStyle = atmo;
      ctx.fillRect(0, 0, CW, BASE_Y + 10);

      // Mountain body with gradient (using clip)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-80, BASE_Y);
      ctx.lineTo(PX, PY);
      ctx.lineTo(660, BASE_Y);
      ctx.closePath();
      ctx.clip();
      const mGrad = ctx.createLinearGradient(PX - 200, PY, PX + 200, BASE_Y);
      mGrad.addColorStop(0,   '#8BBBD4');
      mGrad.addColorStop(0.4, '#6A97B0');
      mGrad.addColorStop(1,   '#4D7A94');
      ctx.fillStyle = mGrad;
      ctx.fillRect(-80, PY, 740, BASE_Y - PY);
      // Right-side shadow
      const shadow = ctx.createLinearGradient(PX, PY, PX + 280, BASE_Y);
      shadow.addColorStop(0, 'rgba(0,0,0,0)');
      shadow.addColorStop(1, 'rgba(0,30,60,0.30)');
      ctx.fillStyle = shadow;
      ctx.fillRect(PX, PY, 370, BASE_Y - PY);
      ctx.restore();

      // Snow cap (large, slightly irregular lower edge)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(PX, PY);
      ctx.lineTo(PX + 104, 78);
      ctx.quadraticCurveTo(PX + 80, 90, PX + 50, 80);
      ctx.quadraticCurveTo(PX + 20, 74, PX,      85);
      ctx.quadraticCurveTo(PX - 20, 74, PX - 50, 80);
      ctx.quadraticCurveTo(PX - 80, 90, PX - 104, 78);
      ctx.closePath();
      ctx.clip();
      const sGrad = ctx.createLinearGradient(PX, PY, PX, 90);
      sGrad.addColorStop(0,   '#FFFFFF');
      sGrad.addColorStop(0.6, '#EAF5FC');
      sGrad.addColorStop(1,   '#C8E4F4');
      ctx.fillStyle = sGrad;
      ctx.fillRect(PX - 110, PY, 220, 90);
      // Snow shadow on right slope
      const sShadow = ctx.createLinearGradient(PX, PY, PX + 100, 78);
      sShadow.addColorStop(0, 'rgba(0,0,0,0)');
      sShadow.addColorStop(1, 'rgba(100,150,180,0.25)');
      ctx.fillStyle = sShadow;
      ctx.fillRect(PX, PY, 110, 90);
      ctx.restore();

      // Horizon ground strip
      const gGrad = ctx.createLinearGradient(0, BASE_Y - 4, 0, BASE_Y + 14);
      gGrad.addColorStop(0, '#4E8228');
      gGrad.addColorStop(1, '#7AB840');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, BASE_Y - 4, CW, 18);
    }

    // ── Main render ───────────────────────────────────────────────────────────
    function render() {
      ctx.clearRect(0, 0, CW, CH);

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0,   '#3A8FCC');
      sky.addColorStop(0.6, '#8DC8E8');
      sky.addColorStop(1,   '#CBE9F8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CW, CH);

      drawMountain();

      // Build tree position set from treesRef
      const treePos = new Set<string>();
      for (const t of treesRef.current) {
        const c = Math.max(0, Math.min(COLS - 1, Math.round(t.fx * (COLS - 1))));
        const r = Math.max(0, Math.min(ROWS - 1, Math.round(t.fy * (ROWS - 1))));
        if (!isFarmTile(c, r)) continue;
        if (c === SHED_COL && r === SHED_ROW) continue;
        treePos.add(`${c},${r}`);
      }

      // Painter's algorithm: draw diagonal bands back→front
      for (let depth = 0; depth < COLS + ROWS - 1; depth++) {
        for (let col = 0; col < COLS; col++) {
          const row = depth - col;
          if (row < 0 || row >= ROWS) continue;

          const farm = isFarmTile(col, row);

          const tileColor = !farm
            ? '#7EB84A'                          // grass (flat)
            : col === SHED_COL && row === SHED_ROW
              ? '#C4A882'                        // path near shed
              : '#8B6340';                       // farm soil (single flat brown)

          drawTile(col, row, tileColor);

          if (col === SHED_COL && row === SHED_ROW) drawShed(col, row);
          if (treePos.has(`${col},${row}`))       drawTree(col, row);
        }
      }

      // Farmers: sort by depth, draw back→front
      const sorted = [...farmersRef.current].sort((a, b) => (a.x + a.y) - (b.x + b.y));
      for (const f of sorted) drawFarmer(f);
    }

    function loop() {
      updateFarmers();
      render();
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Weed bar color
  const weedColor = weedLevel < 30 ? '#22C55E' : weedLevel < 70 ? '#EAB308' : '#EF4444';

  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 text-white px-4 py-2.5 flex items-center gap-2">
        <span>🏡</span>
        <span className="font-bold text-sm">農園ライブビュー</span>
        <span className="text-green-300 text-xs ml-1">— アイソメトリックプレビュー</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />

      {/* ── Weed system UI ── */}
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
        <div className="flex items-center gap-4">
          {/* Bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-600">🌿 雑草レベル</span>
              <span className="text-xs text-gray-400">
                最終除草:{' '}
                {daysSince < 0.04
                  ? 'たった今'
                  : daysSince < 1
                  ? `${(daysSince * 24).toFixed(0)}時間前`
                  : `${daysSince.toFixed(1)}日前`}
                　（7日で100%）
              </span>
            </div>
            <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${weedLevel}%`, backgroundColor: weedColor }}
              />
            </div>
            <div className="flex justify-between text-xs mt-0.5">
              <span className="text-gray-300">0%</span>
              <span className="font-bold" style={{ color: weedColor }}>{weedLevel}%</span>
              <span className="text-gray-300">100%</span>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleWeed}
            className="flex-shrink-0 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-sm"
          >
            🌾 除草する
          </button>
        </div>

        {/* Warning */}
        {weedLevel >= 70 && (
          <p className="text-xs text-red-500 mt-2 font-medium">
            ⚠ 雑草が多くなっています。早めに除草してください。
          </p>
        )}
      </div>
    </div>
  );
}
