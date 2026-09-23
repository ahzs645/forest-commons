import type { Position } from "../simulation/types";

/**
 * Screen-space placement for the map's fixed-pixel symbols: mill icons,
 * equipment icons, their status tags and stand labels. Symbols are drawn at a
 * constant pixel size, so at district zoom they collide; this decides which
 * equipment is fanned out or collapsed into one counted icon, where each stand
 * label goes, and which labels and tags are left out.
 */
export type Projector = { project(p: [number, number]): { x: number; y: number } };
type Box = [number, number, number, number];
export interface FleetMember { id: string; kind: "crew" | "truck"; node: string; position: Position }
export type SymbolKind = "mill" | "crew" | "truck";
/** One drawn icon. `members` lists everything it stands for; `kind` picks the icon (the first member's). */
export interface PlacedSymbol { kind: SymbolKind; members: { id: string; kind: SymbolKind }[]; position: Position; offset: [number, number] }
export interface PlacedTag { id: string; kind: "crew" | "truck"; position: Position; offset: [number, number] }
export interface PlacedLabel { id: string; position: Position; offset: [number, number]; anchor: "start" | "middle" | "end" }
export interface SymbolLayout { symbols: PlacedSymbol[]; tags: PlacedTag[]; labels: PlacedLabel[] }

const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const around = (x: number, y: number, w: number, h: number): Box => [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
const order: Record<SymbolKind, number> = { mill: 0, crew: 1, truck: 2 };

export function layoutSymbols({ map, frame, scale, mills, fleet, stands, priority, keep, showTags = true }: {
  map: Projector;
  frame: { w: number; h: number };
  scale: number;
  mills: { id: string; position: Position }[];
  fleet: FleetMember[];
  stands: { id: string; position: Position }[];
  /** Stands labelled first, such as the planned sites. */
  priority: Set<string>;
  /** The selected stand, labelled before all others. */
  keep?: string;
  showTags?: boolean;
}): SymbolLayout {
  const at = (p: Position) => map.project(p as [number, number]);
  const icon = 32 * scale, spacing = 40 * scale, rise = 36 * scale, millSize = 36 * scale;
  const obstacles: Box[] = [];
  const placed: { symbol: PlacedSymbol; box: Box }[] = [];
  // An icon that would land on one already drawn joins that icon's count
  // instead of covering it, like a clustered marker; its tap lists every member.
  // A cluster shows its most significant member: a mill, then a crew, then a truck.
  const absorb = (target: PlacedSymbol, source: PlacedSymbol) => {
    target.members = [...target.members, ...source.members].sort((a, b) => order[a.kind] - order[b.kind] || a.id.localeCompare(b.id));
    // Taking on a mill moves the cluster to the mill, which is drawn at its node.
    if (source.kind === "mill" && target.kind !== "mill") { target.position = source.position; target.offset = source.offset; }
    target.kind = target.members[0].kind;
  };
  const place = (symbol: PlacedSymbol, box: Box) => {
    const hit = placed.find(o => overlaps(o.box, box));
    if (hit) {
      absorb(hit.symbol, symbol);
      return false;
    }
    placed.push({ symbol, box }); obstacles.push(box);
    return true;
  };
  for (const m of mills) {
    const p = at(m.position);
    place({ kind: "mill", members: [{ id: m.id, kind: "mill" }], position: m.position, offset: [0, 0] }, around(p.x, p.y, millSize, millSize));
  }

  // Equipment parked at the same node, one row per kind: crews above the node, trucks below.
  const groups = new Map<string, FleetMember[]>();
  for (const f of fleet) groups.set(`${f.node}|${f.kind}`, [...(groups.get(`${f.node}|${f.kind}`) ?? []), f]);
  const rows = [...groups.values()].map(members => {
    const p = at(members[0].position), dy = members[0].kind === "crew" ? -rise : rise;
    return { members, p, dy, box: around(p.x, p.y + dy, members.length * spacing - (spacing - icon), icon) };
  });
  // A row is fanned out only when its full width stays clear of other nodes'
  // symbols; otherwise it collapses into one counted icon.
  const own = (row: typeof rows[number], b: Box) => overlaps(b, around(row.p.x, row.p.y, 4, 4));
  const collapsed = new Set(rows.filter(row => row.members.length > 1 && [...rows.filter(o => o !== row && o.members[0].node !== row.members[0].node).map(o => o.box),
    ...obstacles.filter(b => !own(row, b))].some(b => overlaps(b, row.box))));
  let tagCandidates: { tag: PlacedTag; box: Box }[] = [];
  for (const row of rows) {
    const kind = row.members[0].kind;
    if (collapsed.has(row)) {
      place({ kind, members: row.members.map(m => ({ id: m.id, kind })).sort((a, b) => a.id.localeCompare(b.id)), position: row.members[0].position, offset: [0, row.dy] }, around(row.p.x, row.p.y + row.dy, icon, icon));
      continue;
    }
    [...row.members].sort((a, b) => a.id.localeCompare(b.id)).forEach((m, i, all) => {
      const dx = (i - (all.length - 1) / 2) * spacing;
      if (!place({ kind, members: [{ id: m.id, kind }], position: m.position, offset: [dx, row.dy] }, around(row.p.x + dx, row.p.y + row.dy, icon, icon))) return;
      // The tag sits between a crew icon and its node, or under a truck icon.
      const ty = kind === "crew" ? row.dy + icon / 2 + 6 : row.dy + icon / 2 + 8;
      tagCandidates.push({ tag: { id: m.id, kind, position: m.position, offset: [dx, ty] }, box: around(row.p.x + dx, row.p.y + ty, m.id.length * 7 + 18, 15) });
    });
  }
  // A cluster's count badge sits on its upper-right corner; an icon under a
  // badge joins that cluster too, repeated until no badge covers an icon.
  const badge = (o: { symbol: PlacedSymbol; box: Box }): Box => {
    const cx = o.box[2] - (o.box[2] - o.box[0]) / 2 + 14 * scale, cy = o.box[1] + (o.box[3] - o.box[1]) / 2 - 14 * scale;
    return around(cx, cy, 26, 16);
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const cluster of placed.filter(o => o.symbol.members.length > 1)) {
      const covered = placed.find(o => o !== cluster && overlaps(badge(cluster), o.box));
      if (!covered) continue;
      absorb(cluster.symbol, covered.symbol);
      placed.splice(placed.indexOf(covered), 1);
      obstacles.splice(obstacles.indexOf(covered.box), 1);
      changed = true;
      break;
    }
  }
  const symbols = placed.map(o => o.symbol);
  const tags: PlacedTag[] = [];
  // A merged icon shows a count, not one resource's tag.
  tagCandidates = tagCandidates.filter(c => symbols.some(f => f.members.length === 1 && f.members[0].id === c.tag.id && f.kind === c.tag.kind));
  // Count badges ride on the icon's upper-right corner (see OperationsMap).
  for (const o of placed) if (o.symbol.members.length > 1) obstacles.push(badge(o));
  // Tags are secondary: keep one only where it covers no icon and no earlier tag.
  if (showTags) for (const candidate of tagCandidates)
    if (!obstacles.some(b => overlaps(b, candidate.box))) { tags.push(candidate.tag); obstacles.push(candidate.box); }

  // Stand dots are obstacles for labels too, except the label's own stand.
  const dots = stands.map(s => { const p = at(s.position); return { id: s.id, p, box: around(p.x, p.y, 12, 12) }; });
  const labels: PlacedLabel[] = [];
  const rank = (id: string) => id === keep ? 2 : priority.has(id) ? 1 : 0;
  const ordered = [...dots].sort((a, b) => rank(b.id) - rank(a.id));
  for (const { id, p } of ordered) {
    if (p.x < -40 || p.y < -40 || p.x > frame.w + 40 || p.y > frame.h + 40) continue;
    const w = id.length * 7.6 + 8, h = 18;
    const options: { offset: [number, number]; anchor: PlacedLabel["anchor"]; box: Box }[] = [
      { offset: [0, -16], anchor: "middle", box: around(p.x, p.y - 16, w, h) },
      { offset: [0, 16], anchor: "middle", box: around(p.x, p.y + 16, w, h) },
      { offset: [10, 0], anchor: "start", box: [p.x + 8, p.y - h / 2, p.x + 8 + w, p.y + h / 2] },
      { offset: [-10, 0], anchor: "end", box: [p.x - 8 - w, p.y - h / 2, p.x - 8, p.y + h / 2] },
    ];
    const blockers = [...obstacles, ...dots.filter(d => d.id !== id).map(d => d.box)];
    const inFrame = (b: Box) => b[0] >= 0 && b[1] >= 0 && b[2] <= frame.w && b[3] <= frame.h;
    // No label is forced: the sheet header already names the selection, and a
    // forced label would cover the icons it collides with.
    const choice = options.find(o => inFrame(o.box) && !blockers.some(b => overlaps(b, o.box)));
    if (!choice) continue;
    labels.push({ id, position: stands.find(s => s.id === id)!.position, offset: choice.offset, anchor: choice.anchor });
    obstacles.push(choice.box);
  }
  return { symbols, tags, labels };
}
