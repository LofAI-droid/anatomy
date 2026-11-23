# Triggerpoint

An interactive figure, built with the Anatomy skill (`.claude/skills/anatomy`). It shows how a trigger point (a contraction knot) keeps itself going.

- `model.mjs`: the pure model: sarcomere length, how far the capillary is pinched, flow (Poiseuille through an ellipse), ATP, waste products, and the causes as parameters.
- `build.mjs`: the geometry and the page. `node build.mjs` writes `triggerpoint.html` (light); `node build.mjs --dark` writes `triggerpoint-dark.html`.
- `live.js`: motion, the tour, the load slider, "Rekken en drukken" (stretch and press) and the cause toggles.

The model is a qualitative simplification for teaching. Its numbers are not clinical values.
