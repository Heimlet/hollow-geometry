# agents.md — Куб Метатрона (Sacred Geometry 3D)

Quick-start guide for AI agents working on this project.

## What is this?

Interactive 3D visualization of **Metatron's Cube** containing all 5 Platonic solids, Merkaba, and cuboctahedron. Built with **Three.js** (ES modules via a local importmap). No build tools, no npm.

## How to Run

```bash
# ES modules require a local server (file:// won't work)
# Run from the repository root
python3 -m http.server 8000
# Then open http://localhost:8000
```

## File Map

```
geometry/
├── index.html          # HTML shell — sidebar, canvas, importmap, loads js/main.js
├── css/
│   └── style.css       # All CSS: sidebar, toggles, sliders, presets, info panel
├── js/
│   ├── constants.js    # Pure data: PHI, radii (R_META→A→CR→OR→IR), COLORS, OBJ_IDS, INFO cards
│   ├── scene.js        # Three.js scene, camera, controls, lights, starfield
│   ├── geometry.js     # mkGeom, mkEdges, cuboctData, tetraVerts, SObj class, MCube class
│   ├── state.js        # Immutable scene state, atomic actions, selectors
│   ├── preset-data.js  # Pure preset definitions
│   ├── projection.js   # Camera projection math
│   ├── guide.js        # Reference projection overlay
│   ├── levels.js       # Reconciles geometry from state; rebuilds on recursion changes
│   ├── presets.js      # Camera preset data, flyCamera, activatePreset/deactivatePreset, star highlights
│   ├── ui.js           # Sidebar DOM construction: groups, toggles, sliders, showInfo
│   └── main.js         # Entry point: imports everything, animation loop, raycasting, events
└── agents.md           # This file
```

**State architecture:** see [docs/state-model.md](docs/state-model.md).
`state.js` is the only source of scene configuration. UI dispatches atomic actions;
levels, preset effects and UI subscribe to committed snapshots. Never write visibility
or settings directly to Three.js objects from event handlers, or manually update a
second copy in DOM. Rendering/camera effects must not dispatch nested state actions.

## Key Mathematical Model

All radii derive from a single master parameter `R_META = 3.0` (cuboctahedron circumradius):

| Symbol | Formula | Value | Used for |
|--------|---------|-------|----------|
| `R_META` | — | 3.0 | Cuboctahedron circumradius |
| `A` | `R_META / √2` | ≈ 2.121 | Cube half-side, octahedron circumradius |
| `CR` | `A × √3` | ≈ 3.674 | Cube, dodecahedron, merkaba, tetrahedron circumradius |
| `OR` | `A` | ≈ 2.121 | Octahedron circumradius |
| `IR` | `A × √(φ+2) / φ²` | ≈ 1.542 | Icosahedron circumradius (Euclid XIII.16) |

**Why these values?** Cuboctahedron vertices are midpoints of cube edges. If cube has half-side `a`, its circumradius = `a√3` and cuboctahedron circumradius = `a√2 = R_META`. This ensures all solids share correct geometric intersections.

## Key Classes

### `SObj` (geometry.js) — Sacred Object
Wraps a Three.js Group with Mesh (faces) + LineSegments (edges).
- Properties: `vis`, `eVis`, `fVis`, `op` (opacity) — all with getters/setters
- Materials: `fMat` (MeshPhysicalMaterial), `eMat` (LineBasicMaterial)
- Stored: `_op` — base opacity (used to restore after preset deactivation)

### `MCube` (geometry.js) — Metatron's Cube
13 spheres (nodes) + K₁₃ complete graph (78 lines).
- Properties: `vis`, `nVis` (nodes), `lVis` (lines), `op`
- Materials: `nMat`, `lMat`

### Levels (levels.js)
Each recursion level creates ALL objects at `scale = recScale^levelIndex`.
- `levels[]` array — each element: `{ scale, idx, group, objs: {id→SObj}, mc: MCube }`
- `getState().objects` — immutable per-type settings, shared by all levels
- `actions.objects(ids, patch)` — atomic manual edit; exits active preset
- `actions.recursion(patch)` — updates recursion; renderer automatically rebuilds

## Common Tasks

### Add a new geometric object

1. **constants.js**: Add color to `COLORS`, add ID to `OBJ_IDS`, add info card to `INFO`; add default opacity in **state.js**
2. **levels.js** → `createLevel()`: Add `make(...)` call with correct geometry and radius
3. **ui.js** → `initUI()`: Add the object to the appropriate group or create a new group

### Add a new camera preset

1. **preset-data.js** → `PRESETS[]`: Add entry with `{ id, name, icon, dir:[x,y,z], obj:['ids'], R, desc }`
   - `dir` = camera direction (symmetry axis of the solid)
   - `obj` = which objects to highlight
   - `R` = circumradius (used for auto-distance: `dist = R × 2.6`)
   - `star: true` to add pentagram star highlight

### Modify CSS

All styles are in `css/style.css`. Key class naming:
- `.grp` / `.grp-hdr` / `.grp-body` — collapsible groups
- `.obj-row` / `.obj-hdr` / `.obj-ctrls` — object toggle rows
- `.tgl` — toggle switch, `.ctrl` — control row
- `.preset-btn` / `.preset-grid` — camera preset buttons
- `#info` — info panel (bottom-right), `#proj-label` — projection overlay (top-center)

### Change recursion

- `state.js`: `actions.recursion({ depth, scale })`, depth 1–3 and scale 0.15–0.55
- `levels.js` observes recursion changes and rebuilds using the committed state

## UI Language

All user-visible text is in **Russian**. Keep it that way.

## Gotchas

- **`file://` protocol won't work** — ES module imports across files need a local server
- **Hover color reset**: `SObj.color` is a hex number, `MCube.color` is a `THREE.Color` — both work with `.set()` but be careful comparing them
- **Exported `let` variables**: Use getter functions (e.g., `isPresetActive()`) when reading mutable state from other modules
- **Three.js importmap**: Pinned to v0.167.0 in `vendor/three` (unmodified, MIT) — don't change without testing
- **Display settings**: use `actions.display(...)` and `getState().display`; no mutable window flags
- **Preset visibility**: selecting a preset makes its required contours visible atomically. Manual appearance edits exit the preset. Recursion preserves it.
- **Regression checks**: run both test scripts described in `docs/state-model.md` after state/camera changes.


## Geometry laboratory

See [docs/implementation-plan.md](docs/implementation-plan.md) for implemented scope
and [docs/state-model.md](docs/state-model.md) for invariants and all 14 checks.

- `compound-data.js`: stable compound/component IDs; new components are regular objects in the store.
- `polyhedra-math.js`: pure convex hull/intersection, compound coordinates, symmetry and exploded-layout math.
- `lab-state.js`, `lab.js`, `lab-ui.js`, `lab-projection.js`: validated settings, one transform pipeline, controls and exact 2D panel.
- `studies-math.js`, `studies.js`: three golden-ratio demonstrations, separate from timed preset hints.
- `lab-controls.js`: accessible bound controls; settings navigation can open native details as well as legacy accordions.
- `camera-transition.js`: framing first, perspective flattening second; automatic Depth changes must not cancel the animation.

Do not mutate source vertices during animation. Picking, guides, labels and derived
layers must follow the current world transforms. Hidden render sources remain
available for Intersection; disabling the whole compound cascades through its layers.
Use `actions.assembly(...)` for atomic component activation and assembly animation.

- `golden-scene-data.js` / `golden-scenes.js`: four guided φ constructions tied to real model coordinates; local pentagram recursion is distinct from whole-scene recursion.
- `starfield.js`: real spherical 3D stars in a separate perspective pass with exactly shared camera orientation; settings live in `display`.
- `shortcuts.js`: history grouping per gesture and keyboard shortcuts. Store history covers scene settings, not free camera gestures. Use `tickLab`, `tickStudy`, `tickGoldenScene` for frame updates, never regular user commands.
- `tests/history.mjs`: undo/redo, transaction grouping, animation exclusion, guided-scene lifetime. There are now 14 regression suites.


## Hollow Geometry tours and paired bodies

- `tour-data.js`: eight Russian film scripts (82 chapters, 3–5 minutes each).
- `tour-state.js`: deterministic recipe/seek/tick functions. Each chapter atomically
  owns visibility, recursion, research layers, assembly and golden constructions.
- `tours.js`: simple card menu, player, chapter flights, transient draw effects.
  A manual orbit pauses the film; scene edits finish it. The laboratory remains
  available. `tickTour` is transient (`history:false`), never a history entry.
- `ui.mode` starts as `simple`; initial objects are off, stars on, recursion 1.
- `mirror-data.js`: central inversion pairs. The tetrahedron alone has a distinct
  opposite placement; cube/octahedron/dodecahedron/icosahedron are centrosymmetric.
  `tetrahedron_mirror` is a regular scene object at every recursion level, with
  geometry reflected from the actual source vertices. Parent-off cascades to it.
- `metatron/type`: exclusive selection of the chosen type plus its reflected
  partner and the network. Do not create disconnected visibility flags in UI.
- `appearance-buttons.js`: only visible member bodies are affected.
- `merkaba-motion.js`: attributed Drunvalo illustration (one fixed whole star,
  two counterrotating whole stars, 34:21), distinct from relative tetrahedron
  rotation. Whole-star decorations do not alter the source hull/intersection.
- `display.gentleOrbit`: slower orbit/zoom/pan with damping and polar guard.
  Camera Reset flies to diagonal [1,1,1], then flattens to exact orthographic.
- Programmatic section changes emit `camera-context-change`, never the manual
  gesture event: manual handlers may dispatch, subscribers must not.
- `starfield.mjs` verifies actual 3D depth, quaternion synchronization and stable
  sky positioning during FOV compensation. `tours.mjs` covers all 82 chapters,
  seeking, replay, pause, history and paired visibility.

Tests can use the bundled module directly: `for f in tests/*.mjs; do node "$f" "$PWD/vendor/three/three.module.js"; done`.
