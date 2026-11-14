import type { RequirementAnalysisResult } from '../../types/requirementIntelligence.ts';

const STYLES: Record<string, { bg: string; border: string; text: string }> = {
  requirement: { bg: '#FFFFFF', border: '#49686C', text: '#283638' },
  screen: { bg: '#F4F9F1', border: '#CFE2C8', text: '#3E6B33' },
  component: { bg: '#F6F4EC', border: '#E5E2D8', text: '#856C16' },
  role: { bg: '#F0F5F5', border: '#B9D1D4', text: '#30494B' },
  interaction: { bg: '#FFF7ED', border: '#FED7AA', text: '#9C4A28' },
};

const COLUMNS: Record<string, number> = {
  requirement: 0,
  screen: 460,
  component: 880,
  role: 1290,
  interaction: 1690,
};

const NODE_WIDTH = 330;
const GAP = 118;
const MARGIN_X = 80;
const HEADER = 150;
const FOOTER = 90;
const SCALE = 2;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !current) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 4) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export interface GraphExportOptions {
  projectName: string;
  counts: { requirements: number; ambiguities: number; conflicts: number; dependencies: number };
}

export async function exportRequirementGraph(
  analysis: RequirementAnalysisResult,
  options: GraphExportOptions,
): Promise<Blob> {
  const counters: Record<string, number> = {};
  const positions = new Map<string, { x: number; y: number; h: number }>();

  const measureCanvas = document.createElement('canvas').getContext('2d');
  if (!measureCanvas) throw new Error('Canvas is not available in this browser.');

  // First pass: compute node heights and positions.
  measureCanvas.font = '600 13px "Segoe UI", sans-serif';
  let maxBottom = 0;
  for (const node of analysis.graph.nodes) {
    const index = counters[node.kind] || 0;
    counters[node.kind] = index + 1;
    const lines = wrap(measureCanvas, node.label, NODE_WIDTH - 28, 5);
    const h = Math.max(64, 26 + lines.length * 18);
    const y = HEADER + index * GAP;
    positions.set(node.id, {
      x: MARGIN_X + (COLUMNS[node.kind] ?? 0),
      y,
      h,
    });
    maxBottom = Math.max(maxBottom, y + h);
  }

  const width = MARGIN_X * 2 + NODE_WIDTH + Math.max(...Object.values(COLUMNS));
  const height = maxBottom + FOOTER;
  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, 0, width, height);

  // Header.
  ctx.fillStyle = '#283638';
  ctx.font = '700 30px "Segoe UI", sans-serif';
  ctx.fillText('Requirement graph', MARGIN_X, 58);
  ctx.fillStyle = '#49686C';
  ctx.font = '600 15px "Segoe UI", sans-serif';
  ctx.fillText(options.projectName, MARGIN_X, 84);
  ctx.fillStyle = '#737A72';
  ctx.font = '400 13px "Segoe UI", sans-serif';
  const summary =
    `${options.counts.requirements} requirements · ${options.counts.ambiguities} ambiguities · ` +
    `${options.counts.conflicts} conflicts · ${options.counts.dependencies} dependencies`;
  ctx.fillText(summary, MARGIN_X, 108);

  // Edges.
  for (const edge of analysis.graph.edges) {
    const from = positions.get(edge.source);
    const to = positions.get(edge.target);
    if (!from || !to) continue;
    const conflict = edge.kind === 'conflicts_with';
    const dependency = edge.kind === 'depends_on';
    const x1 = from.x + NODE_WIDTH;
    const y1 = from.y + from.h / 2;
    let x2 = to.x;
    const y2 = to.y + to.h / 2;
    const midX = (x1 + x2) / 2;

    ctx.strokeStyle = conflict ? '#B94D42' : dependency ? '#49686C' : '#B9B5A9';
    ctx.lineWidth = conflict || dependency ? 1.8 : 1;
    if (conflict) ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);
    const loop = x2 <= x1 + 40;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (!loop) {
      ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
    } else {
      // Same column (e.g. requirement depends on another requirement): loop
      // around the right edge of the column instead of crossing the nodes.
      const loopX = x1 + 70;
      x2 = to.x + NODE_WIDTH;
      ctx.bezierCurveTo(loopX, y1, loopX, y2, x2, y2);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head.
    const angle = loop ? Math.PI : Math.atan2(y2 - y1, Math.max(1, x2 - x1));
    const size = 7;
    ctx.fillStyle = conflict ? '#B94D42' : dependency ? '#49686C' : '#9A9688';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45));
    ctx.lineTo(x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();

    if (edge.label) {
      ctx.font = '600 10px "Segoe UI", sans-serif';
      const label = edge.label;
      const tw = ctx.measureText(label).width;
      const lx = midX - tw / 2 - 5;
      const ly = (y1 + y2) / 2 - 8;
      ctx.fillStyle = '#FAFAF8';
      rounded(ctx, lx, ly, tw + 10, 16, 5);
      ctx.fill();
      ctx.fillStyle = conflict ? '#B94D42' : '#49686C';
      ctx.fillText(label, lx + 5, ly + 11.5);
    }
  }

  // Nodes.
  for (const node of analysis.graph.nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    const style = STYLES[node.kind] || STYLES.requirement;
    ctx.fillStyle = style.bg;
    ctx.strokeStyle = style.border;
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(40, 54, 56, 0.08)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    rounded(ctx, pos.x, pos.y, NODE_WIDTH, pos.h, 10);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    ctx.fillStyle = style.text;
    ctx.font = node.kind === 'requirement' ? '700 12px "Segoe UI", sans-serif' : '600 13px "Segoe UI", sans-serif';
    const lines = wrap(ctx, node.label, NODE_WIDTH - 28, 5);
    lines.forEach((line, i) => {
      ctx.fillText(line, pos.x + 14, pos.y + 24 + i * 18);
    });
  }

  // Footer legend.
  const legend: Array<[string, string, string]> = [
    ['requirement', 'Requirement', '#49686C'],
    ['screen', 'Screen', '#688E5E'],
    ['component', 'Component', '#D1B653'],
    ['role', 'Role', '#5A8090'],
    ['interaction', 'Interaction', '#C96839'],
  ];
  let lx = MARGIN_X;
  const ly = height - 34;
  ctx.font = '600 12px "Segoe UI", sans-serif';
  for (const [, label, color] of legend) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx + 4, ly - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#737A72';
    ctx.fillText(label, lx + 14, ly);
    lx += ctx.measureText(label).width + 42;
  }
  ctx.fillStyle = '#B9B5A9';
  ctx.font = '400 11px "Segoe UI", sans-serif';
  ctx.fillText('Generated by Vector', width - 150, ly);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not create the PNG.'));
    }, 'image/png');
  });
}
