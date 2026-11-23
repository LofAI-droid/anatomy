// Live behaviour. Inlined after the kit and model.mjs (exports stripped) by build.mjs.
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector(`[data-part="${name}"]`);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const loadInput = document.querySelector("[data-load]");
const treatBtn = document.querySelector("[data-treat]");
const tourBtn = document.querySelector("[data-tour]");
const chips = [...document.querySelectorAll("[data-cause]")];

const groups = {
  zl: [part("zl"), ...PLANES.map((_, p) => part(`al${p}`))],
  zr: [part("zr"), part("wedge"), ...PLANES.map((_, p) => part(`ar${p}`))],
  m1: [part("m1"), ...PLANES.map((_, p) => part(`my1${p}`))],
  m2: [part("m2"), ...PLANES.map((_, p) => part(`my2${p}`))],
};
const bridges = [1, 2].map((i) => PLANES.map((_, p) => part(`xb${i}${p}`)));
const hoseEl = part("hose");
const cellsEl = part("cells");
const footLowEl = part("footLow");
const footUpEl = part("footUp");
const needle = part("needle");
const wasteEl = part("waste");

const st = freshState();
let active = [];
let mods = modsOf(active);
let userLoad = 0;
let load = 0;
let stretch = 0;
let treatUntil = -1;
let touring = !still.matches;
let clock = 0;
let tourClock = 0;
let frame = 0;
let last = 0;
let visible = false;
let lastQ = -1;
const CELLS = 36;
const phases = Array.from({ length: CELLS }, (_, i) => (i + 0.37 * ((i * 7) % 5)) / CELLS);

const fmt = (v, d) => v.toFixed(d).replace(".", ",");
const NAMES = { ontspannen: "ontspannen", aangespannen: "aangespannen", overbelast: "overbelast", triggerpoint: "vast: triggerpoint", rekken: "rekken" };

function hoseSvg(q) {
  const h = hoseOf(q, P, iso, pathOf, HOSE);
  hoseEl.innerHTML = `<path class="iso-fill" d="${h.fill}"/><path class="iso-top" d="${h.top}"/><path class="iso-shade" data-shade="3" d="${h.shade3}"/><path class="iso-shade" data-shade="2" d="${h.shade2}"/><path class="iso-shade" data-shade="0" d="${h.shade0}"/><path class="iso-line iso-edge" data-tone="hi" d="${h.edge}"/>`;
  return h;
}
let hose = hoseSvg(0);

function bridgePath(xL, xR, y) {
  const m = (xL + xR) / 2;
  let d = "";
  for (const [n, x] of headsAt(m).entries()) {
    if (n % 4 > 1) continue;
    const dir = x > m ? 1 : -1;
    const tip = x + dir * 2.6;
    const zx = dir > 0 ? xR : xL;
    const inActin = dir > 0 ? tip >= zx - ACT && tip <= zx - DISC_T : tip <= zx + ACT && tip >= zx + DISC_T;
    if (!inActin) continue;
    d += segment([x, y, MYO_Z + 1.6], [tip, y, ACT_Z[1] - 0.8], P) + segment([x, y, MYO_Z - 1.6], [tip, y, ACT_Z[0] + 0.8], P);
  }
  return d;
}

function draw(dt) {
  const L = lengthOf(st.s) * U;
  const dz = L - LS0;
  const set = (list, by) => list.forEach((el) => el && el.setAttribute("transform", translateAlong(P, [by, 0, 0])));
  set(groups.zl, -dz);
  set(groups.zr, dz);
  set(groups.m1, -dz / 2);
  set(groups.m2, dz / 2);

  const bound = Math.min(1, st.s * 2.2) * (0.25 + 0.75 * (1 - releaseOf(st.atp, mods.crit)));
  bridges.forEach((list, i) => {
    const xL = i === 0 ? -L : 0;
    const xR = i === 0 ? 0 : L;
    list.forEach((el, p) => {
      el.setAttribute("d", bound > 0.02 ? bridgePath(xL, xR, PLANES[p]) : "");
      el.style.opacity = (0.85 * bound).toFixed(2);
    });
  });

  const q = squeezeOf(st.s);
  if (Math.abs(q - lastQ) > 0.002) {
    hose = hoseSvg(q);
    const zf = FOOT_TOP0 - DEPTH * q;
    footLowEl.innerHTML = footLow(zf);
    footUpEl.innerHTML = footUp(zf);
    lastQ = q;
  }

  // red cells drift at a speed proportional to flow; inside the pinch they thin out with the lumen
  const span = HOSE.to - HOSE.from;
  const speed = (still.matches ? 0 : 34 * st.flow) / span;
  let cells = "";
  for (let i = 0; i < CELLS; i++) {
    phases[i] = (phases[i] + speed * dt) % 1;
    const x = HOSE.from + 4 + phases[i] * (span - 8);
    const [sx, sy, a] = hose.crest(x);
    const alpha = Math.max(0, Math.min(1, (a - 0.25) / 0.5));
    const edge = Math.min(1, (x - HOSE.from) / 10, (HOSE.to - x) / 10);
    const o = alpha * edge;
    if (o > 0.03) cells += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.15" fill-opacity="${o.toFixed(2)}"/>`;
  }
  cellsEl.innerHTML = cells;

  needle.setAttribute("d", needleAt(st.atp));
  wasteEl.innerHTML = wasteSvg(st.waste);

  const phase = phaseOf(st, load, stretch, mods);
  const text = `${NAMES[phase]} · ${fmt(lengthOf(st.s), 2)} µm · bloed ${Math.round(st.flow * 100)}% · ATP ${Math.round(st.atp * 100)}%`;
  if (readout.textContent !== text) readout.textContent = text;
  stage.dataset.phase = phase;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  let want = userLoad;
  let wantStretch = clock < treatUntil ? 1 : 0;
  if (touring) {
    tourClock += dt;
    const t = tourAt(tourClock);
    want = t.load;
    wantStretch = t.stretch;
    loadInput.value = String(Math.round(want * 100));
  }
  load += (want - load) * (1 - Math.exp(-dt / 0.12));
  stretch += (wantStretch - stretch) * (1 - Math.exp(-dt / 0.25));
  treatBtn.classList.toggle("on", wantStretch > 0.5);
  // sub-step the model for stability
  for (let i = 0; i < 4; i++) step(st, load, stretch, dt / 4, mods);
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

const stopTour = () => {
  touring = false;
  tourBtn.setAttribute("aria-pressed", "false");
};
loadInput.addEventListener("input", () => {
  stopTour();
  userLoad = Number(loadInput.value) / 100;
});
treatBtn.addEventListener("click", () => {
  stopTour();
  treatUntil = clock + 3.5;
});
tourBtn.addEventListener("click", () => {
  touring = !touring;
  tourBtn.setAttribute("aria-pressed", String(touring));
  if (touring) {
    tourClock = 0;
    Object.assign(st, freshState());
  }
});
chips.forEach((chip) =>
  chip.addEventListener("click", () => {
    const id = chip.dataset.cause;
    active = active.includes(id) ? active.filter((a) => a !== id) : [...active, id];
    chip.setAttribute("aria-pressed", String(active.includes(id)));
    mods = modsOf(active);
  }),
);
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(1, userLoad + 0.1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, userLoad - 0.1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 1;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    stopTour();
    treatUntil = clock + 3.5;
    return;
  }
  if (to === null) return;
  event.preventDefault();
  stopTour();
  userLoad = to;
  loadInput.value = String(Math.round(to * 100));
});
if (still.matches) tourBtn.setAttribute("aria-pressed", "false");
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
draw(0);
