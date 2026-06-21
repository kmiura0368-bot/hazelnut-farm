'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Tree } from '@/lib/db';

interface FarmMapProps {
  trees: Tree[];
  selectedId: number | null;
  onMapClick: (fx: number, fy: number) => void;
  onTreeClick: (tree: Tree) => void;
}

const SPECIES_COLORS: Record<string, string> = {
  european: '#2d6a4f',
  american: '#40916c',
  hybrid: '#52b788',
};

const SPECIES_LABELS: Record<string, string> = {
  european: 'ヨーロッパヘーゼル',
  american: 'アメリカヘーゼル',
  hybrid: 'ハイブリッド',
};

const TREE_RADIUS = 10;
const SELECTED_RADIUS = 13;
const PADDING = 40;

// Farm polygon in normalized coordinates (0.0–1.0)
const FARM_POLYGON = [
  { x: 0.10, y: 0.42 },  // 西端（尖り）
  { x: 0.22, y: 0.18 },  // 北西
  { x: 0.42, y: 0.10 },  // 北中央
  { x: 0.60, y: 0.12 },  // 北東寄り
  { x: 0.75, y: 0.22 },  // 北東
  { x: 0.88, y: 0.35 },  // 東端上
  { x: 0.90, y: 0.50 },  // 東端（尖り）
  { x: 0.82, y: 0.65 },  // 東南
  { x: 0.65, y: 0.75 },  // 南東
  { x: 0.45, y: 0.78 },  // 南中央
  { x: 0.28, y: 0.72 },  // 南西
  { x: 0.14, y: 0.58 },  // 西南
];

/** Ray-casting point-in-polygon test */
function isInsidePolygon(fx: number, fy: number): boolean {
  let inside = false;
  const n = FARM_POLYGON.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = FARM_POLYGON[i].x, yi = FARM_POLYGON[i].y;
    const xj = FARM_POLYGON[j].x, yj = FARM_POLYGON[j].y;
    const intersect = yi > fy !== yj > fy && fx < ((xj - xi) * (fy - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function FarmMap({ trees, selectedId, onMapClick, onTreeClick }: FarmMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getFieldRect = useCallback((canvas: HTMLCanvasElement) => {
    const w = canvas.width - PADDING * 2;
    const h = canvas.height - PADDING * 2;
    return { x: PADDING, y: PADDING, w, h };
  }, []);

  const canvasToField = useCallback((canvas: HTMLCanvasElement, cx: number, cy: number) => {
    const { x, y, w, h } = getFieldRect(canvas);
    const fx = (cx - x) / w;
    const fy = (cy - y) / h;
    return { fx, fy };
  }, [getFieldRect]);

  const fieldToCanvas = useCallback((canvas: HTMLCanvasElement, fx: number, fy: number) => {
    const { x, y, w, h } = getFieldRect(canvas);
    return {
      cx: x + fx * w,
      cy: y + fy * h,
    };
  }, [getFieldRect]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#f0f9eb';
    ctx.fillRect(0, 0, width, height);

    // Draw field polygon
    const { x, y, w, h } = getFieldRect(canvas);

    // Build canvas-space polygon points
    const polyPts = FARM_POLYGON.map(p => ({
      cx: x + p.x * w,
      cy: y + p.y * h,
    }));

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Fill
    ctx.beginPath();
    ctx.moveTo(polyPts[0].cx, polyPts[0].cy);
    for (let i = 1; i < polyPts.length; i++) ctx.lineTo(polyPts[i].cx, polyPts[i].cy);
    ctx.closePath();
    ctx.fillStyle = '#b7e4c7';
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Border
    ctx.beginPath();
    ctx.moveTo(polyPts[0].cx, polyPts[0].cy);
    for (let i = 1; i < polyPts.length; i++) ctx.lineTo(polyPts[i].cx, polyPts[i].cy);
    ctx.closePath();
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Field label (above polygon centroid)
    const centroidX = polyPts.reduce((s, p) => s + p.cx, 0) / polyPts.length;
    const minCy = Math.min(...polyPts.map(p => p.cy));
    ctx.fillStyle = '#1b4332';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ヘーゼルナッツ農園 (5,017㎡)', centroidX, minCy - 10);

    // Draw trees
    for (const tree of trees) {
      const { cx, cy } = fieldToCanvas(canvas, tree.fx, tree.fy);
      const isSelected = tree.id === selectedId;
      const radius = isSelected ? SELECTED_RADIUS : TREE_RADIUS;
      const color = SPECIES_COLORS[tree.species] ?? '#2d6a4f';

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#f4a261';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Tree circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#f4a261' : color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#e07b39' : '#1b4332';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tree ID label
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${isSelected ? 10 : 9}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(tree.id), cx, cy);
    }

    ctx.textBaseline = 'alphabetic';
  }, [trees, selectedId, getFieldRect, fieldToCanvas]);

  // Resize observer to fit canvas to container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    });
    ro.observe(container);

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();

    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getTreeAtPoint = useCallback((canvas: HTMLCanvasElement, cx: number, cy: number): Tree | null => {
    for (const tree of trees) {
      const { cx: tx, cy: ty } = fieldToCanvas(canvas, tree.fx, tree.fy);
      const dist = Math.sqrt((cx - tx) ** 2 + (cy - ty) ** 2);
      if (dist <= TREE_RADIUS + 4) return tree;
    }
    return null;
  }, [trees, fieldToCanvas]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const tree = getTreeAtPoint(canvas, cx, cy);
    if (tree) {
      onTreeClick(tree);
      return;
    }

    // Check if click is inside polygon
    const { fx, fy } = canvasToField(canvas, cx, cy);
    if (isInsidePolygon(fx, fy)) {
      onMapClick(Math.max(0, Math.min(1, fx)), Math.max(0, Math.min(1, fy)));
    }
  }, [getTreeAtPoint, getFieldRect, canvasToField, onMapClick, onTreeClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const tree = getTreeAtPoint(canvas, cx, cy);
    if (tree) {
      canvas.style.cursor = 'pointer';
      const currentYear = new Date().getFullYear();
      const age = currentYear - tree.plant_year + tree.age_at_plant;
      const label = SPECIES_LABELS[tree.species] ?? tree.species;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';

      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
      const titleDiv = document.createElement('div');
      titleDiv.className = 'font-bold text-green-800';
      titleDiv.textContent = `#${tree.id} ${label}`;
      tooltip.appendChild(titleDiv);
      if (tree.species_name) {
        const speciesDiv = document.createElement('div');
        speciesDiv.className = 'text-xs text-gray-600';
        speciesDiv.textContent = `品種名: ${tree.species_name}`;
        tooltip.appendChild(speciesDiv);
      }
      const plantDiv = document.createElement('div');
      plantDiv.className = 'text-xs';
      plantDiv.textContent = `植付年: ${tree.plant_year}年`;
      tooltip.appendChild(plantDiv);
      const ageDiv = document.createElement('div');
      ageDiv.className = 'text-xs';
      ageDiv.textContent = `現在樹齢: 約${age}年`;
      tooltip.appendChild(ageDiv);
      if (tree.note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'text-xs text-gray-500 mt-1';
        noteDiv.textContent = tree.note;
        tooltip.appendChild(noteDiv);
      }
    } else {
      // Check if in polygon
      const { fx, fy } = canvasToField(canvas, cx, cy);
      canvas.style.cursor = isInsidePolygon(fx, fy) ? 'crosshair' : 'default';
      tooltip.style.display = 'none';
    }
  }, [getTreeAtPoint, getFieldRect]);

  const handleMouseLeave = useCallback(() => {
    const tooltip = tooltipRef.current;
    if (tooltip) tooltip.style.display = 'none';
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-green-50">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block w-full h-full"
      />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-white border border-green-300 rounded shadow-lg p-2 text-sm z-10 max-w-xs"
        style={{ display: 'none' }}
      />
    </div>
  );
}
