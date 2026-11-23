// Fig: a trigger point as a bench model of two sarcomeres that pinch their own capillary.
// node build.mjs            -> triggerpoint.html (light)
// node build.mjs --dark     -> triggerpoint-dark.html
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const OUT = theme === "dark" ? "triggerpoint-dark.html" : "triggerpoint.html";

const WIDTH = 640;
const HEIGHT = 372;

// ---------- world ----------
const U = M.U;
const LS0 = M.LS_REST * U; // 90: rest position of the outer Z-discs
const ACT = M.ACTIN * U; // 36
const MYO = M.MYOSIN * U; // 57.6
const AXIS_Z = 44; // filament axis height
const DISC_R = 22;
const DISC_T = 1.5; // half thickness
const CAR_TOP = 9;
const PLANES = [-8, 0, 8]; // y of the three filament planes
const ACT_Z = [32, 56];
const MYO_Z = 44;

const PLATE = { x: -182, y: -44, w: 364, d: 128, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;

// capillary + pinch
const HY = 34; // hose axis y
const FLOOR = 1; // hose rests on the cradle at z = 1
const X0 = 30; // pinch foot x
const HOSE = { x0: X0, y: HY, floor: FLOOR, from: -150, to: 150, r: M.HOSE_R };
const FOOT_TOP0 = FLOOR + 2 * M.HOSE_R; // 11: hose top when round
const DEPTH = 2 * M.HOSE_R * 0.85; // 8.5: foot travel at full squeeze
const COLLAR = [24, 27];
const FOLLOW = 27; // follower bottom sits 25 above foot bottom... see footSvg
const WEDGE_Y = [31, 37];
const BAR_Z = [38, 42];
// contact x relative to the right Z-disc, where squeezing starts and ends
const REL_T0 = X0 - M.lengthOf(M.SQUEEZE_FROM) * U;
const REL_T1 = X0 - M.lengthOf(1) * U;

const ATP = [-96, 64]; // ATP gauge
const ATP_R = 15;
const ATP_TOP = 20;
const GLASS = [124, 62];
const GLASS_R = 8;
const GLASS_Z = [4, 40];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-90, 0, AXIS_Z + DISC_R], [90, 0, AXIS_Z + DISC_R], [0, 0, AXIS_Z + DISC_R], [GLASS[0], GLASS[1], GLASS_Z[1] + 3]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 56 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const fx = (x) => G.frameOf([x, 0, AXIS_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);

// ---------- base ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -PLATE_H / 2, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // sarcomere-length ruler behind the rails: 0.1 µm ticks, a major every 0.5 µm, zero under the middle Z-disc
  const strip = { x: -112, y: -32, w: 224, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t0 = k.topTicks(-108, 108, U / 10, 5, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(t0.minor, { tone: "lo" }), L(t0.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // capillary cradle
  const cradle = { x: -150, y: HY - 7, w: 300, d: 14, r: 2 };
  out.push(S(k.slabOf(cradle, 0, FLOOR, P, 3, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.lineOnTop([cradle.x, HY], [cradle.x + cradle.w, HY], FLOOR, P), { tone: "faint" }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of [-16, 12]) {
    out.push(S(k.slabOf({ x: -118, y, w: 236, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-112, -60, 60, 112].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  for (const x of [-124, 118]) {
    out.push(S(k.slabOf({ x, y: -20, w: 6, d: 40, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 3, -15, 8]), at([x + 3, 15, 8])], { size: 0.45 }));
  }
  return out.join("");
}

// ---------- the sarcomere bench ----------
function carriage(x, { fixed = false, handle = true, index = false } = {}) {
  const out = [];
  const plan = fixed ? { x: x - 8, y: -20, w: 16, d: 40, r: 2 } : { x: x - 7, y: -20, w: 14, d: 40, r: 2.5 };
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 2), 3, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(plan, 3, CAR_TOP - 3, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.2), CAR_TOP, P, 3), { tone: "faint" }));
  const bolts = fixed ? [[x - 5, -14], [x + 5, -14], [x - 5, 14], [x + 5, 14]] : [[x - 4, -17], [x + 4, -17], [x - 4, 17], [x + 4, 17]];
  out.push(D(bolts.map(([bx, by]) => at([bx, by, CAR_TOP])), { size: 0.45 }));
  if (index) {
    out.push(S(k.slabOf({ x: x - 1.2, y: -28.5, w: 2.4, d: 8.6, r: 0.6 }, 3, 1, P, 2), { tone: "mid", crease: "none" }));
    out.push(L(k.lineOnTop([x, -28.2], [x, -21], 4, P), { tone: "lit" }));
  }
  if (handle) {
    out.push(S(k.slabOf({ x: x - 1.5, y: 20, w: 3, d: 2.4, r: 0.6 }, 4.5, 3, P, 2), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, 24.4, 2.4, 3.5, 5, P, 20), { tone: "mid" }));
    out.push(L(k.knurl(x, 24.4, 2.4, 3.5, 8.5, 18, P), { tone: "lo" }));
  }
  return out.join("");
}

function zDisc(x) {
  const out = [];
  out.push(S(k.cylinder(x, 0, 2.6, CAR_TOP, AXIS_Z - DISC_R - CAR_TOP + 0.6, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, 0, 4, CAR_TOP, 1.4, P, 20), { tone: "mid" }));
  const F = fx(x);
  const disc = G.disc(-DISC_T, DISC_T, DISC_R, F, P);
  out.push(S(disc, { tone: "hi", crease: "lo", inner: L(G.arcOf(F, 0, DISC_R, P), { tone: "faint" }) }));
  out.push(L(G.circleOf(F, DISC_T, DISC_R - 2.4, P, 72), { tone: "faint" }));
  out.push(D(G.dotsOf(F, DISC_T, DISC_R - 4.4, 12, P, { all: true, phase: Math.PI / 12 }), { size: 0.45 }));
  out.push(S(G.disc(DISC_T, DISC_T + 1.2, 3.4, F, P), { tone: "mid" }));
  return out.join("");
}

const rod = (x0, x1, y, z, half, tone, extra = {}) =>
  S(k.slabOf({ x: Math.min(x0, x1), y: y - half, w: Math.abs(x1 - x0), d: half * 2, r: half * 0.45 }, z - half, half * 2, P, 2), { tone, crease: "none", ...extra });

function actins(zx, dir, y) {
  // thin filaments from the Z-disc at zx, pointing along dir (+1 / -1), in plane y
  const out = [];
  const from = zx + dir * DISC_T;
  const to = zx + dir * ACT;
  for (const z of ACT_Z) {
    out.push(rod(from, to, y, z, 0.8, "hi"));
    const beads = [];
    for (let s = 2; s < ACT - 2; s += 2.4) beads.push(at([zx + dir * s, y, z + 0.8]));
    out.push(D(beads, { size: 0.35, tone: "lo" }));
  }
  return out.join("");
}

const headsAt = (m) => {
  const list = [];
  for (let r = 4; r <= MYO / 2 - 1.5; r += 3) list.push(m + r, m - r);
  return list;
};

function myosin(m, y) {
  const out = [rod(m - MYO / 2, m + MYO / 2, y, MYO_Z, 1.6, "hi")];
  const stubs = headsAt(m).map((x) => {
    const dir = x > m ? 1 : -1;
    return k.segment([x, y, MYO_Z + 1.6], [x + dir * 1.6, y, MYO_Z + 3.4], P) + k.segment([x, y, MYO_Z - 1.6], [x + dir * 1.6, y, MYO_Z - 3.4], P);
  });
  out.push(L(stubs.join(""), { tone: "mid" }));
  out.push(L(k.segment([m, y + 1.6, MYO_Z + 1.6], [m, y - 1.6, MYO_Z + 1.6], P), { tone: "faint" }));
  return out.join("");
}

function mHolder(m) {
  const out = [];
  out.push(S(k.slabOf({ x: m - 5, y: -20, w: 10, d: 40, r: 2 }, 3, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([m - 2.5, -17, 7]), at([m + 2.5, 17, 7])], { size: 0.4 }));
  out.push(S(k.cylinder(m, -13, 1.3, 7, MYO_Z - 1.6 - 3 - 7, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: m - 1.2, y: -14.5, w: 2.4, d: 25, r: 0.8 }, MYO_Z - 1.6 - 3, 3, P, 2), { tone: "mid" }));
  return out.join("");
}

// Ids of live groups (translated per frame)
const G_ = (part, body, extra = "") => `<g data-part="${part}"${extra}>${body}</g>`;

function sarcomere(i) {
  // i = 1: between Z(-90) and Z(0); i = 2: between Z(0) and Z(+90)
  const left = i === 1 ? -LS0 : 0;
  const right = i === 1 ? 0 : LS0;
  const m = (left + right) / 2;
  const out = [G_(`m${i}`, mHolder(m))];
  for (const [p, y] of PLANES.entries()) {
    out.push(G_(i === 1 ? `al${p}` : `a0r${p}`, actins(left, 1, y)));
    out.push(G_(i === 1 ? `a0l${p}` : `ar${p}`, actins(right, -1, y)));
    out.push(G_(`my${i}${p}`, myosin(m, y)));
    out.push(`<path data-part="xb${i}${p}" class="iso-line tp-bridge" data-tone="lit" d=""/>`);
  }
  return out.join("");
}

function rightArm() {
  const x = LS0;
  const out = [];
  out.push(S(k.cylinder(x + 5.5, 17, 2, CAR_TOP, BAR_Z[0] - CAR_TOP, P, 18), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x + 5.5, 17, 3, CAR_TOP, 1.6, P, 18), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + 3, y: 13, w: 5.5, d: WEDGE_Y[1] - 13, r: 1 }, BAR_Z[0], BAR_Z[1] - BAR_Z[0], P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([x + 5.75, 17, BAR_Z[1]]), at([x + 5.75, 34, BAR_Z[1]])], { size: 0.45 }));
  return out.join("");
}

function wedge() {
  const x = LS0;
  const F = G.frameOf([0, WEDGE_Y[0], 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const w = WEDGE_Y[1] - WEDGE_Y[0];
  const bar = G.prismOf(F, [[x - 66, BAR_Z[0]], [x + 3, BAR_Z[0]], [x + 3, BAR_Z[1]], [x - 66, BAR_Z[1]]], 0, w, P);
  const zLow = FOOT_TOP0 - DEPTH + 25 + 2; // follower top at full squeeze
  const cam = G.prismOf(F, [[x + REL_T0, BAR_Z[0]], [x + 3, BAR_Z[0]], [x + 3, zLow], [x + REL_T1, zLow]], 0, w, P);
  const out = [];
  out.push(S(cam, { tone: "hi", crease: "lo", lit: false }));
  out.push(S(bar, { tone: "mid" }));
  out.push(D([x - 60, x - 30, x - 4].map((bx) => at([bx, (WEDGE_Y[0] + WEDGE_Y[1]) / 2, BAR_Z[1]])), { size: 0.45 }));
  return out.join("");
}

// ---------- capillary ----------
function blocks(side) {
  const x = side < 0 ? -162 : 150;
  const plan = { x, y: HY - 9, w: 12, d: 18, r: 2 };
  const out = [S(k.slabOf(plan, 0, 16, P, 4, 0.6), { tone: "mid" })];
  out.push(D([at([x + 3, HY - 6, 16]), at([x + 9, HY + 6, 16])], { size: 0.45 }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), 16, P, 3), { tone: "faint" }));
  if (side > 0) {
    // barb collar where the hose enters the outlet block
    const F = G.frameOf([x, HY, FLOOR + M.HOSE_R], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 2.2, M.HOSE_R + 1.2, F, P), { tone: "mid" }));
  }
  return out.join("");
}

function inletCollar() {
  const F = G.frameOf([-150, HY, FLOOR + M.HOSE_R], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  return S(G.disc(0, 2.2, M.HOSE_R + 1.2, F, P), { tone: "mid" });
}

function hoseSvg(q) {
  const h = M.hoseOf(q, P, k.iso, k.pathOf, HOSE);
  return `<path class="iso-fill" d="${h.fill}"/><path class="iso-top" d="${h.top}"/><path class="iso-shade" data-shade="3" d="${h.shade3}"/><path class="iso-shade" data-shade="2" d="${h.shade2}"/><path class="iso-shade" data-shade="0" d="${h.shade0}"/><path class="iso-line iso-edge" data-tone="hi" d="${h.edge}"/>`;
}

function guide() {
  const out = [];
  out.push(S(k.cylinder(X0, 23, 3.4, 0, 1.4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(X0, 23, 2.4, 1.4, COLLAR[1] - 1.4, P, 20), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(X0, 23, 2.4, 12, P, 12), { tone: "faint" }));
  out.push(S(k.slabOf({ x: X0 - 2, y: 23, w: 4, d: HY - 23, r: 0.8 }, COLLAR[0], COLLAR[1] - COLLAR[0], P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function collar() {
  return S(k.cylinder(X0, HY, 3, COLLAR[0], COLLAR[1] - COLLAR[0], P, 24, 0.3), { tone: "mid" }) + L(k.ring(X0, HY, 1.6, COLLAR[1], P, 16), { tone: "lo" });
}

// foot (lower part) and follower (upper part) are rebuilt per frame; the same code runs in the page
const footLow = (zf) =>
  k.solidSvg(k.cylinder(X0, HY, 1.2, zf + 3, COLLAR[0] - zf - 3, P, 14), { tone: "mid", crease: "none" }) +
  k.solidSvg(k.slabOf({ x: X0 - 4.5, y: HY - 4, w: 9, d: 8, r: 1.4 }, zf, 3, P, 3, 0.4), { tone: "hi", crease: "lo", lit: true });
const footUp = (zf) =>
  k.solidSvg(k.cylinder(X0, HY, 1.2, COLLAR[1], zf + 25 - COLLAR[1], P, 14), { tone: "mid", crease: "none" }) +
  k.solidSvg(k.cylinder(X0, HY, 2.6, zf + 25, 2, P, 20, 0.3), { tone: "mid" });

// ---------- gauges ----------
function atpGauge() {
  const [x, y] = ATP;
  const out = [];
  out.push(S(k.slabOf({ x: x - 12, y: y - 12, w: 24, d: 24, r: 3 }, 0, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners({ x: x - 12, y: y - 12, w: 24, d: 24 }, 3).map(([cx, cy]) => at([cx, cy, 6])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 3, 6, ATP_TOP - 8 - 6, P, 18), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, ATP_R, ATP_TOP - 8, 8, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, ATP_R, ATP_TOP - 3, ATP_TOP, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, ATP_R, ATP_TOP - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, ATP_R - 2, ATP_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, ATP_R - 2.6, 20, 5, ATP_TOP, [1.2, 2.6], P, -SPAN / 2, SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // the release threshold
  const c = -SPAN / 2 + SPAN * M.A_CRIT;
  out.push(L(k.lineOnTop([x + Math.sin(c) * (ATP_R - 7), y - Math.cos(c) * (ATP_R - 7)], [x + Math.sin(c) * (ATP_R - 2.6), y - Math.cos(c) * (ATP_R - 2.6)], ATP_TOP, P), { tone: "red" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 6.5], ATP_TOP, P, "x"), "ATP", { size: 2.6, tone: "lo", anchor: "middle" }));
  out.push(L(k.ring(x, y, 1.4, ATP_TOP, P, 16), { tone: "mid" }));
  return out.join("");
}
const SPAN = (Math.PI * 3) / 2;
const needleAt = (v) => {
  const a = -SPAN / 2 + SPAN * v;
  const [x, y] = ATP;
  return k.lineOnTop([x - Math.sin(a) * 2.6, y + Math.cos(a) * 2.6], [x + Math.sin(a) * (ATP_R - 4), y - Math.cos(a) * (ATP_R - 4)], ATP_TOP + 0.2, P);
};

function glassBack() {
  const [x, y] = GLASS;
  const out = [];
  out.push(S(k.cylinder(x, y, GLASS_R + 3, 0, GLASS_Z[0], P, 40, 0.6), { tone: "mid" }));
  out.push(D([0, 1, 2, 3].map((i) => at([x + Math.cos(i * 1.57 + 0.78) * (GLASS_R + 1.6), y + Math.sin(i * 1.57 + 0.78) * (GLASS_R + 1.6), GLASS_Z[0]])), { size: 0.4 }));
  out.push(`<path class="tp-glass" d="${k.cylinder(x, y, GLASS_R, GLASS_Z[0], GLASS_Z[1] - GLASS_Z[0], P, 48).fill}"/>`);
  return out.join("");
}
const wasteSvg = (w) => {
  const [x, y] = GLASS;
  const h = Math.max(0.4, (GLASS_Z[1] - GLASS_Z[0] - 4) * w);
  return k.solidSvg(k.cylinder(x, y, GLASS_R - 0.8, GLASS_Z[0], h, P, 48), { tone: "lo", crease: "none", className: "tp-waste" });
};
function glassFront() {
  const [x, y] = GLASS;
  const out = [];
  const c = k.cylinder(x, y, GLASS_R, GLASS_Z[0], GLASS_Z[1] - GLASS_Z[0], P, 48);
  out.push(`<path class="iso-line iso-edge" data-tone="mid" d="${c.outline}"/>`);
  out.push(L(k.ring(x, y, GLASS_R, GLASS_Z[1], P, 48), { tone: "lo" }));
  const ticks = [];
  const face = Math.atan2(...k.towardViewer(P).slice().reverse());
  for (let i = 1; i <= 8; i++) {
    const z = GLASS_Z[0] + i * 4;
    const span = i % 4 === 0 ? 0.42 : 0.22;
    const pts = [];
    for (let j = 0; j <= 6; j++) {
      const t = face - 0.55 + (j / 6) * span;
      pts.push(at([x + GLASS_R * Math.cos(t), y + GLASS_R * Math.sin(t), z]));
    }
    ticks.push(k.pathOf(pts));
  }
  out.push(L(ticks.join(""), { tone: "mid", free: true }));
  out.push(S(k.cylinder(x, y, GLASS_R + 1.6, GLASS_Z[1], 2.4, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.ring(x, y, GLASS_R - 1, GLASS_Z[1] + 2.4, P, 40), { tone: "lo" }));
  return out.join("");
}

function labelPlate() {
  const plan = { x: -164, y: 60, w: 34, d: 14, r: 1.4 };
  const out = [S(k.slabOf(plan, 0, 0.8, P, 3, 0.3), { tone: "mid" })];
  out.push(D(k.corners(plan, 2).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  for (const [i, w] of [24, 18, 12].entries()) out.push(L(k.lineOnTop([plan.x + 5, plan.y + 4 + i * 3], [plan.x + 5 + w, plan.y + 4 + i * 3], 0.8, P), { tone: i ? "lo" : "mid", free: true }));
  return out.join("");
}

// ---------- assemble, back to front ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Een werkbankmodel van twee sarcomeren in een spiervezel. Drie Z-schijven op een rail houden de dunne actinedraden; daartussen liggen de dikke myosinedraden. Als de vezel samentrekt, schuiven de schijven naar elkaar toe. Een wig aan de rechter schijf drukt dan een voetje op een haarvaatje vooraan, zodat er minder bloed doorstroomt. Een meter toont de ATP-voorraad en een glas de opgehoopte afvalstoffen.",
  body: [
    base(),
    rails(),
    G_("zl", carriage(-LS0) + zDisc(-LS0)),
    sarcomere(1),
    carriage(0, { fixed: true }) + zDisc(0),
    sarcomere(2),
    G_("zr", carriage(LS0, { handle: false, index: true }) + zDisc(LS0) + rightArm()),
    blocks(-1),
    G_("hose", hoseSvg(0)),
    inletCollar(),
    `<g data-part="cells" class="tp-cells"></g>`,
    guide(),
    G_("footLow", footLow(FOOT_TOP0)),
    collar(),
    G_("footUp", footUp(FOOT_TOP0)),
    G_("wedge", wedge()),
    blocks(1),
    labelPlate(),
    atpGauge(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needleAt(1)}" style="stroke-width:1.1"/>`,
    glassBack(),
    G_("waste", wasteSvg(0)),
    glassFront(),
  ],
});

// ---------- page ----------
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const live = `
${strip("model.mjs")}
const P = ${JSON.stringify(P)};
const LS0 = ${LS0}, ACT = ${ACT}, MYO = ${MYO}, DISC_T = ${DISC_T}, MYO_Z = ${MYO_Z};
const PLANES = ${JSON.stringify(PLANES)}, ACT_Z = ${JSON.stringify(ACT_Z)};
const HOSE = ${JSON.stringify(HOSE)};
const X0 = ${X0}, HY = ${HY}, COLLAR = ${JSON.stringify(COLLAR)}, FOOT_TOP0 = ${FOOT_TOP0}, DEPTH = ${DEPTH};
const ATP = ${JSON.stringify(ATP)}, ATP_R = ${ATP_R}, ATP_TOP = ${ATP_TOP}, SPAN = ${SPAN};
const GLASS = ${JSON.stringify(GLASS)}, GLASS_R = ${GLASS_R}, GLASS_Z = ${JSON.stringify(GLASS_Z)};
const k = { solidSvg, cylinder, slabOf, lineOnTop, iso, pathOf, segment };
const footLow = ${footLow.toString()};
const footUp = ${footUp.toString()};
const needleAt = ${needleAt.toString()};
const wasteSvg = ${wasteSvg.toString()};
const headsAt = ${headsAt.toString()};
${LIVE()}
`;

function LIVE() {
  return readFileSync(join(HERE, "live.js"), "utf8");
}

const causes = M.CAUSES.map((c) => `<button type="button" class="tp-chip" data-cause="${c.id}" aria-pressed="false">${c.label}</button>`).join("");
const controls = `<div class="tp-controls">
  <div class="tp-row"><label class="tp-load">Belasting <input type="range" min="0" max="100" value="0" data-load aria-label="Belasting van de spier"></label>
  <button type="button" class="tp-treat" data-treat>Rekken en drukken</button>
  <button type="button" class="tp-tour" data-tour aria-pressed="true">Rondleiding</button></div>
  <div class="tp-causes" role="group" aria-label="Oorzaken die het proces versterken">${causes}</div>
</div>`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Triggerpoint",
  hint: "Schuif de belasting · zet oorzaken aan",
  readout: "ontspannen · 2,50 µm · bloed 100% · ATP 100%",
  keys: [
    { mark: "lit", label: "Kruisbruggen die vastzitten, en het voetje dat het haarvaatje dichtdrukt" },
    { mark: "raised", label: "Z-schijven met actine (dun) en myosine (dik): twee sarcomeren" },
    { mark: "red", label: "Rode bloedcellen met zuurstof; de rode streep op de meter is de ATP-grens" },
  ],
  caption:
    "Een spiervezel bestaat uit duizenden sarcomeren achter elkaar. Bij een samentrekking trekken de myosinekopjes de actinedraden naar het midden, zodat de Z-schijven naar elkaar toe schuiven (op de liniaal: van 2,5 naar 1,8 µm). Om weer los te laten heeft elk kopje een molecuul ATP nodig. Bij overbelasting wordt de knoop zo strak dat hij het haarvaatje ernaast dichtdrukt. De doorstroming daalt met de vierde macht van de opening, dus al bij een kleine vernauwing komt er veel minder zuurstof binnen en blijven afvalstoffen liggen. Zonder zuurstof maakt de vezel te weinig ATP aan. Zakt de voorraad onder de rode streep, dan blijven de kopjes vastzitten, ook als de belasting stopt: de vicieuze cirkel. Rekken en drukken trekt de draden mechanisch uit elkaar, waardoor het bloed weer stroomt en de ATP-voorraad zich herstelt. De oorzaken onder de figuur veranderen het model: kou vermindert de doorbloeding, stress en een verkorte houding verhogen de basisspanning, compensatie en een mineralentekort versterken de prikkel, en excentrische of herhaalde belasting kost meer ATP. Het model is een vereenvoudiging om het principe te tonen; de getallen zijn geen klinische waarden.",
  body: `<div class="iso-stage" tabindex="0" role="img" aria-label="Werkbankmodel van een triggerpoint. Pijltjestoetsen veranderen de belasting, Enter rekt de vezel.">${svg}</div>${controls}`,
});

const CSS = `<style>
.tp-cells circle{fill:var(--anatomy-red);stroke:none}
.tp-bridge{stroke-width:.45}
.tp-glass{fill:var(--anatomy-paper);opacity:.55}
.tp-waste .iso-fill,.tp-waste .iso-top,.tp-waste .iso-shade{fill:var(--tp-waste)}
.iso{--tp-waste:#c9b98f}
.iso[data-theme="dark"]{--tp-waste:#6a5f42}
.tp-controls{display:grid;gap:10px;padding:12px 16px 14px;border-top:1px solid var(--anatomy-faint)}
.tp-row{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}
.tp-load{display:flex;gap:8px;align-items:center;color:var(--anatomy-strong);font-size:13px;flex:1 1 220px}
.tp-load input{flex:1;accent-color:var(--anatomy-hi)}
.tp-controls button{font:inherit;font-size:12.5px;line-height:1.2;padding:6px 10px;border-radius:999px;border:1px solid var(--anatomy-mid);background:transparent;color:var(--anatomy-strong);cursor:pointer}
.tp-controls button[aria-pressed="true"],.tp-treat.on{background:var(--anatomy-hi);color:var(--anatomy-card);border-color:var(--anatomy-hi)}
.tp-causes{display:flex;flex-wrap:wrap;gap:6px}
.tp-causes button{font-size:12px;padding:5px 9px}
.iso-plate-corner[data-corner="readout"]{font-variant-numeric:tabular-nums}
@media (max-width:520px){.iso-plate-corner[data-corner="hint"]{display:none}.iso-plate-corner[data-corner="readout"]{font-size:10px;letter-spacing:0}}
</style>`;

const page = k
  .pageHtml({ title: "Triggerpoint", theme, body: CSS + body, script: kitScript() + live, width: 720 })
  .replace('<html lang="en">', '<html lang="nl">');
writeFileSync(join(HERE, OUT), page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
