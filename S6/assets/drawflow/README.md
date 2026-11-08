# Drawflow, locally bundled

Upstream: https://github.com/jerosoler/Drawflow
Source: https://raw.githubusercontent.com/jerosoler/Drawflow/master/src/drawflow.js
Upstream package.json version: 0.0.60. Retrieved 2026-11-06.
License: MIT; see LICENSE. No CDN or network request is required by the deck.

The upstream ES module class is exposed as a classic browser script (export default removed; window.Drawflow assigned). Its logic is otherwise retained. The CSS selectors are scoped to #conceptual-model-builder, and default demo fills/colors are aligned to the deck palette. Workshop-specific code lives in ../conceptual-model-builder.js. That adapter normalizes outer-slide coordinates and uses Drawflow connections for normal hypotheses. Only moderation-to-arrow connections use the explicitly permitted dashed SVG midpoint overlay. Canvas pan/zoom is disabled; the presentation itself retains fixed-stage scaling.

Vendored JS SHA-256: 830c2bb86a8a0960d02641203263c6fc7260e75f7a759bf4c7953eaf66cd33a8
