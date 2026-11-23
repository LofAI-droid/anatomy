// Pure model of a trigger point (contraction knot), shared by the build and the page.
// No imports: the page inlines this file with `export` stripped.

export const U = 36; // world units per micrometre
export const LS_REST = 2.5; // resting sarcomere length, µm
export const LS_KNOT = 1.8; // sarcomere length inside a contraction knot, µm
export const ACTIN = 1.0; // thin filament length from the Z-disc, µm
export const MYOSIN = 1.6; // thick filament length, µm
export const A_CRIT = 0.35; // below this ATP fraction myosin heads cannot let go
export const HOSE_R = 5; // capillary model radius
export const SQUEEZE_FROM = 0.55; // contraction at which the knot starts to press the capillary

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const lengthOf = (s) => LS_REST - (LS_REST - LS_KNOT) * s;
export const squeezeOf = (s) => clamp01((s - SQUEEZE_FROM) / (1 - SQUEEZE_FROM));
export const releaseOf = (atp, crit = A_CRIT) => smooth(crit - 0.1, crit + 0.1, atp);

// Causes (from the explanation) as changes to the model's parameters.
export const CAUSES = [
  { id: "herhaald", label: "Herhaalde belasting zonder herstel", cost: 1.4, refill: 0.75 },
  { id: "excentrisch", label: "Excentrische belasting (trap af, bergaf)", cost: 1.5, gain: 1.15 },
  { id: "verkort", label: "Lang in verkorte stand (zitten)", tone: 0.25 },
  { id: "compensatie", label: "Compensatie in de keten", gain: 1.3 },
  { id: "kou", label: "Kou en tocht", flow: 0.55 },
  { id: "stress", label: "Stress: hogere basisspanning", tone: 0.3 },
  { id: "mineralen", label: "Vocht- of mineralentekort", gain: 1.2, crit: 0.1 },
];
export function modsOf(active) {
  const m = { tone: 0, gain: 1, flow: 1, cost: 1, refill: 1, crit: A_CRIT };
  for (const c of CAUSES) {
    if (!active.includes(c.id)) continue;
    m.tone += c.tone || 0;
    m.gain *= c.gain || 1;
    m.flow *= c.flow || 1;
    m.cost *= c.cost || 1;
    m.refill *= c.refill || 1;
    m.crit += c.crit || 0;
  }
  return m;
}

// A flattened tube keeps its perimeter: vertical semi-axis a, horizontal b = 2 - a (in radii).
// Poiseuille flow through an ellipse is proportional to a³b³ / (a² + b²); 1 for a round tube.
export function lumenOf(q) {
  const a = 1 - 0.85 * q;
  const b = 2 - a;
  return { a, b, flow: (2 * a ** 3 * b ** 3) / (a * a + b * b) };
}

export const freshState = () => ({ s: 0, atp: 1, waste: 0, flow: 1 });

// One step of the vicious circle. load and stretch are 0..1.
export function step(st, load, stretch, dt, m = modsOf([])) {
  const drive = clamp01(m.tone + m.gain * load);
  if (drive > st.s) st.s += (drive - st.s) * (1 - Math.exp(-dt / 0.35));
  else st.s += (drive - st.s) * (1 - Math.exp(-dt / 0.5)) * releaseOf(st.atp, m.crit);
  if (stretch > 0) st.s -= stretch * st.s * (1 - Math.exp(-dt / 0.6));
  st.s = clamp01(st.s);
  st.flow = lumenOf(squeezeOf(st.s)).flow * m.flow;
  st.atp += (0.5 * m.refill * st.flow * (1 - st.atp) - 0.35 * m.cost * st.s * st.atp) * dt;
  st.waste += (0.25 * st.s * (1 - st.waste) - 0.6 * st.flow * st.waste) * dt;
  st.atp = clamp01(st.atp);
  st.waste = clamp01(st.waste);
  return st;
}

export function phaseOf(st, load, stretch, m = modsOf([])) {
  if (stretch > 0.05 && st.s > 0.1) return "rekken";
  if (load > 0.85) return "overbelast";
  if (st.s > 0.6 && releaseOf(st.atp, m.crit) < 0.3 && m.tone + m.gain * load < st.s - 0.15) return "triggerpoint";
  if (st.s > 0.15) return "aangespannen";
  return "ontspannen";
}

// The idle tour: work, overload, stuck, treat, recover. 24 s.
export const TOUR = 24;
export function tourAt(t) {
  const u = ((t % TOUR) + TOUR) % TOUR;
  if (u < 5) return { load: 0.55 * (0.5 - 0.5 * Math.cos((2 * Math.PI * u) / 1.6)), stretch: 0 };
  if (u < 9) return { load: 1, stretch: 0 };
  if (u < 15) return { load: 0, stretch: 0 };
  if (u < 18.5) return { load: 0, stretch: 1 };
  return { load: 0, stretch: 0 };
}

// Capillary drawn as a tube along x that a foot at x0 flattens. Returns screen paths.
export function hoseOf(q, P, iso, pathOf, { x0, y, floor, from, to, r }) {
  const xs = [];
  for (let x = from; x < x0 - 18; x += 4) xs.push(x);
  for (let x = x0 - 18; x < x0 + 18; x += 0.75) xs.push(x);
  for (let x = x0 + 18; x < to; x += 4) xs.push(x);
  xs.push(to);
  const ax = iso([1, 0, 0], P);
  const o = iso([0, 0, 0], P);
  const dx = ax[0] - o[0];
  const dy = ax[1] - o[1];
  const len = Math.hypot(dx, dy);
  const n = [-dy / len, dx / len];
  if (n[1] < 0) {
    n[0] = -n[0];
    n[1] = -n[1];
  }
  const local = (x) => {
    const d = Math.abs(x - x0);
    const t = d <= 5 ? 1 : d >= 15 ? 0 : 1 - (d - 5) / 10;
    const k = t * t * (3 - 2 * t);
    return lumenOf(q * k);
  };
  const rows = xs.map((x) => {
    const { a, b } = local(x);
    const zc = floor + a * r;
    let lo = Infinity;
    let hi = -Infinity;
    let top;
    let bottom;
    for (let i = 0; i < 36; i++) {
      const t = (i / 36) * Math.PI * 2;
      const p = iso([x, y + b * r * Math.cos(t), zc + a * r * Math.sin(t)], P);
      const m = p[0] * n[0] + p[1] * n[1];
      if (m < lo) {
        lo = m;
        top = p;
      }
      if (m > hi) {
        hi = m;
        bottom = p;
      }
    }
    return { x, a, top, bottom };
  });
  const at = (row, f) => [row.top[0] + (row.bottom[0] - row.top[0]) * f, row.top[1] + (row.bottom[1] - row.top[1]) * f];
  const band = (f0, f1) => pathOf([...rows.map((row) => at(row, f0)), ...rows.slice().reverse().map((row) => at(row, f1))], true);
  return {
    fill: band(0, 1),
    top: band(0, 0.34),
    shade3: band(0.34, 0.58),
    shade2: band(0.58, 0.8),
    shade0: band(0.8, 1),
    edge: pathOf(rows.map((row) => row.top)) + pathOf(rows.map((row) => row.bottom)),
    crest: (x) => {
      let i = 0;
      while (i < rows.length - 2 && rows[i + 1].x < x) i++;
      const A = rows[i];
      const B = rows[i + 1];
      const t = Math.min(1, Math.max(0, (x - A.x) / (B.x - A.x || 1)));
      const pa = at(A, 0.3);
      const pb = at(B, 0.3);
      return [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, A.a + (B.a - A.a) * t];
    },
  };
}
