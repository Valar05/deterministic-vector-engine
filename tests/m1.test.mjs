import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const engineSource = readFileSync(new URL('../engine.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styleSource = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const FULL_TURN_DRAG = Math.PI * 2 / 0.0105;

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.listeners = new Map();
    this.capturedPointer = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttributeNames() { return [...this.attributes.keys()]; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter(item => item !== listener));
  }
  dispatch(type, value) {
    for (const listener of this.listeners.get(type) ?? []) listener(value);
  }
  setPointerCapture(pointerId) { this.capturedPointer = pointerId; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 320, height: 320 }; }
  focus() {}
}

function fixture(includeOutput = true) {
  const elements = new Map();
  if (includeOutput) elements.set('vector-output', new FakeElement('svg'));
  elements.set('resolvedStatus', new FakeElement('output'));
  const document = {
    getElementById(id) { return elements.get(id) ?? null; },
    createElementNS(namespace, tagName) {
      assert.equal(namespace, 'http://www.w3.org/2000/svg');
      return new FakeElement(tagName);
    }
  };
  const context = vm.createContext({ document });
  vm.runInContext(engineSource, context);
  return {
    compile: context.compileNoodleOrganism,
    render: context.renderPromptToSvg,
    start: context.startSvgIllusion,
    elements
  };
}

function serialize(element, geometryOnly = false) {
  const appearance = new Set(['aria-label', 'data-color', 'data-dragging', 'fill', 'stroke', 'opacity', 'filter']);
  const attributes = [...element.attributes]
    .filter(([key]) => !geometryOnly || !appearance.has(key))
    .map(([key, value]) => key + '=' + JSON.stringify(value))
    .join(' ');
  const body = element.children.map(child => serialize(child, geometryOnly)).join('');
  return '<' + element.tagName + (attributes ? ' ' + attributes : '') + '>' + (body || element.textContent) + '</' + element.tagName + '>';
}

function event(overrides = {}) {
  return {
    pointerId: 1,
    clientX: 160,
    clientY: 160,
    timeStamp: 0,
    key: '',
    prevented: false,
    preventDefault() { this.prevented = true; },
    ...overrides
  };
}

function layer(output) {
  return output.children.find(child => child.tagName === 'g');
}

function paths(output) {
  return layer(output).children;
}

function geometry(output) {
  return serialize(output, true);
}

function faceSet(output) {
  return new Set(paths(output)
    .filter(path => ['swept-hull', 'chamfer-hull'].includes(path.getAttribute('data-kind')))
    .map(path => path.getAttribute('data-face')));
}

function quaternionLength(controller) {
  return Math.hypot(...controller.getState().orientation);
}

test('compiler produces a frozen contour-and-depth Noodle organism', () => {
  const { compile } = fixture();
  const organism = compile({ primitive: 'box', color: 'concrete', genotype: 0 });
  assert.equal(organism.sourceCurves.length, 2);
  assert.equal(organism.sourceCurves[0].id, 'chamfered-contour');
  assert.equal(organism.sourceCurves[0].segments.length, 8);
  assert.equal(organism.sourceCurves[1].id, 'depth-noodle');
  assert.equal(organism.surfaces.length, 10);
  assert.equal(organism.materialSlots.base, 'concrete');
  assert.equal(organism.materialSlots.wear, 'fixed-noise-17');
  assert.ok(Object.isFrozen(organism));
  assert.ok(Object.isFrozen(organism.sourceCurves[0].segments[0]));
});

test('straight structural edges are stored as collinear cubic segments', () => {
  const { compile } = fixture();
  const segment = compile({ primitive: 'box', color: 'concrete', genotype: 0 }).sourceCurves[0].segments[0];
  for (let axis = 0; axis < 2; axis += 1) {
    assert.equal(segment.c1[axis], segment.p0[axis] + (segment.p1[axis] - segment.p0[axis]) / 3);
    assert.equal(segment.c2[axis], segment.p0[axis] + (segment.p1[axis] - segment.p0[axis]) * 2 / 3);
  }
});

test('sweep closes caps and eight connecting hull ribbons within budget', () => {
  const { compile } = fixture();
  const organism = compile({ primitive: 'box', color: 'concrete', genotype: 0 });
  assert.equal(organism.surfaces.filter(surface => surface.id.endsWith('-cap')).length, 2);
  assert.equal(organism.surfaces.filter(surface => surface.id.startsWith('hull-')).length, 8);
  assert.equal(organism.surfaces.filter(surface => surface.chamfer).length, 4);
  assert.ok(organism.estimatedPathCount <= 160);
  for (const surface of organism.surfaces) {
    assert.ok(surface.points.length >= 4);
    assert.ok(surface.points.flat().every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...surface.normal) - 1) < 1e-9);
    if (surface.featureFrame) {
      assert.ok(surface.featureFrame.hu > 0);
      assert.ok(surface.featureFrame.hv > 0);
    }
  }
});

test('compiler is deterministic, material-independent, and genotype-ready', () => {
  const { compile } = fixture();
  const first = compile({ primitive: 'box', color: 'concrete', genotype: 0 });
  const repeat = compile({ primitive: 'box', color: 'concrete', genotype: 0 });
  const recolor = compile({ primitive: 'box', color: 'rust', genotype: 0 });
  const child = compile({ primitive: 'box', color: 'concrete', genotype: 15 });
  assert.equal(JSON.stringify(first), JSON.stringify(repeat));
  assert.equal(first.structuralId, recolor.structuralId);
  assert.notEqual(first.materialSlots.base, recolor.materialSlots.base);
  assert.notEqual(first.structuralId, child.structuralId);
});

test('compiler rejects unsupported and unbounded inputs explicitly', () => {
  const { compile } = fixture();
  assert.throws(() => compile({ primitive: 'sphere' }), /REJECT:UNSUPPORTED_PRIMITIVE/);
  assert.throws(() => compile({ color: 'purple' }), /REJECT:UNSUPPORTED_MATERIAL/);
  assert.throws(() => compile({ genotype: 16 }), /REJECT:GENOTYPE_OUT_OF_RANGE/);
  assert.throws(() => compile({ randomSeed: 4 }), /REJECT:UNKNOWN_SPEC_FIELD/);
});

test('empty and unknown prompts fall back to the concrete box', () => {
  const { render } = fixture();
  assert.equal(render('').primitive, 'box');
  assert.equal(render('').color, 'concrete');
  assert.equal(render('sing purple cloud').primitive, 'box');
  assert.equal(render('sing purple cloud').color, 'concrete');
});

test('box, cube compatibility, case, punctuation, and first match are deterministic', () => {
  const { render } = fixture();
  assert.equal(render('RUST...CUBE!').primitive, 'cube');
  assert.equal(render('RUST...CUBE!').color, 'rust');
  const result = render('hazard rust rect box');
  assert.equal(result.color, 'hazard');
  assert.equal(result.primitive, 'rect');
});

test('same prompt and orientation produce identical SVG while reusing pooled paths', () => {
  const { render, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  const first = serialize(output);
  const firstPaths = [...paths(output)];
  render('concrete box');
  assert.equal(serialize(output), first);
  assert.deepEqual(paths(output), firstPaths);
});

test('material changes appearance without changing geometry or structural identity', () => {
  const { render, elements } = fixture();
  const concrete = render('concrete box');
  const output = elements.get('vector-output');
  const concreteGeometry = geometry(output);
  const concreteAppearance = serialize(output);
  const rust = render('rust box');
  assert.equal(geometry(output), concreteGeometry);
  assert.notEqual(serialize(output), concreteAppearance);
  assert.equal(rust.structuralId, concrete.structuralId);
});

test('prompt content cannot become SVG markup or event attributes', () => {
  const { render, elements } = fixture();
  render('concrete box <script onload alert');
  assert.doesNotMatch(serialize(elements.get('vector-output')), /script|onload|alert/i);
});

test('rendered organism contains brutalist detail noodles and fixed procedural wear', () => {
  const { render, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  const kinds = new Set(paths(output).map(path => path.getAttribute('data-kind')));
  for (const expected of ['swept-hull', 'chamfer-hull', 'procedural-wear', 'bevel-noodle', 'recess-noodle', 'panel-noodle', 'rib-noodle', 'anchor-noodle', 'rust-noodle']) {
    assert.ok(kinds.has(expected), 'missing ' + expected);
  }
  const tags = [];
  const visit = node => { tags.push(node.tagName); node.children.forEach(visit); };
  visit(output);
  assert.ok(tags.includes('feTurbulence'));
  assert.ok(tags.includes('feColorMatrix'));
  assert.ok(paths(output).every(path => path.tagName === 'path'));
});

test('runtime contains no forbidden rendering technology or external asset', () => {
  const combined = (engineSource + '\n' + htmlSource + '\n' + styleSource)
    .replace('http://www.w3.org/2000/svg', 'SVG_NAMESPACE');
  assert.doesNotMatch(combined, /<canvas|getContext\s*\(|WebGL|THREE\.|three\.js|transform-style\s*:\s*preserve-3d|https?:\/\//i);
  assert.match(combined, /createElementNS/);
  assert.match(combined, /feTurbulence/);
});

test('missing SVG target fails visibly', () => {
  const { render } = fixture(false);
  assert.throws(() => render('concrete box'), /Missing #vector-output SVG target/);
});

test('horizontal, vertical, diagonal, and one-pixel controls alter flat paths', () => {
  const { render, start, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  const controller = start({ reducedMotion: true });
  const initial = geometry(output);
  controller.applyDrag(24, 0);
  const horizontal = geometry(output);
  controller.reset();
  controller.applyDrag(0, 24);
  const vertical = geometry(output);
  controller.reset();
  controller.applyDrag(24, 24);
  const diagonal = geometry(output);
  controller.reset();
  controller.applyDrag(1, 1);
  const tiny = geometry(output);
  assert.notEqual(horizontal, initial);
  assert.notEqual(vertical, initial);
  assert.notEqual(diagonal, horizontal);
  assert.notEqual(diagonal, vertical);
  assert.notEqual(tiny, initial);
});

test('inverse and full-turn drags restore the exact projected geometry', () => {
  const { render, start, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  const controller = start({ reducedMotion: true });
  const initial = geometry(output);
  controller.applyDrag(37, -24);
  controller.applyDrag(-37, 24);
  assert.equal(geometry(output), initial);
  controller.applyDrag(FULL_TURN_DRAG, 0, 1000);
  assert.equal(geometry(output), initial);
});

test('curved virtual-trackball gesture creates orientation beyond two-axis dragging', () => {
  const { render, start } = fixture();
  render('concrete box');
  const controller = start({ reducedMotion: true });
  const initial = [...controller.getState().orientation];
  const points = [[0.6, 0, 0.8], [0, 0.6, 0.8], [-0.6, 0, 0.8], [0, -0.6, 0.8], [0.6, 0, 0.8]];
  for (let index = 1; index < points.length; index += 1) controller.applyTrackball(points[index - 1], points[index], 16);
  assert.notDeepEqual(controller.getState().orientation, initial);
  assert.ok(Math.abs(quaternionLength(controller) - 1) < 1e-12);
});

test('opposing orientation changes visible hulls and keeps details on visible parents', () => {
  const { render, start, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  const controller = start({ reducedMotion: true });
  const initialFaces = faceSet(output);
  controller.applyDrag(Math.PI / 0.0105, 0, 1000);
  const oppositeFaces = faceSet(output);
  assert.notDeepEqual(oppositeFaces, initialFaces);
  const baseFaces = faceSet(output);
  for (const path of paths(output)) {
    const face = path.getAttribute('data-face');
    if (face && !['contact-shadow'].includes(path.getAttribute('data-kind'))) assert.ok(baseFaces.has(face));
  }
});

test('real pointer capture preserves trackball control, ignores extras, and recovers', () => {
  const { render, start, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  start({ reducedMotion: true });
  const initial = geometry(output);
  output.dispatch('pointerdown', event({ pointerId: 7, clientX: 120, clientY: 130, timeStamp: 10 }));
  assert.equal(output.capturedPointer, 7);
  output.dispatch('pointerdown', event({ pointerId: 8, clientX: 200, clientY: 200, timeStamp: 12 }));
  output.dispatch('pointermove', event({ pointerId: 8, clientX: 240, clientY: 240, timeStamp: 20 }));
  assert.equal(geometry(output), initial);
  output.dispatch('pointermove', event({ pointerId: 7, clientX: 156, clientY: 176, timeStamp: 28 }));
  const dragged = geometry(output);
  assert.notEqual(dragged, initial);
  assert.equal(output.getAttribute('data-dragging'), 'true');
  output.dispatch('lostpointercapture', event({ pointerId: 7, timeStamp: 30 }));
  assert.equal(output.getAttribute('data-dragging'), 'false');
  output.dispatch('pointermove', event({ pointerId: 7, clientX: 250, clientY: 250, timeStamp: 45 }));
  assert.equal(geometry(output), dragged);
});

test('demonstration moves before input and stops on pointer-down without a drag', () => {
  const { render, start, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  const controller = start({ reducedMotion: false });
  const initial = geometry(output);
  controller.step(0.05);
  assert.notEqual(geometry(output), initial);
  output.dispatch('pointerdown', event({ pointerId: 4, timeStamp: 100 }));
  const contacted = geometry(output);
  controller.step(0.05);
  assert.equal(geometry(output), contacted);
  output.dispatch('pointerup', event({ pointerId: 4, timeStamp: 130 }));
  controller.step(0.05);
  assert.equal(geometry(output), contacted);
});

test('same input tape proves inertia enabled and reduced-motion ablated', () => {
  const movingFixture = fixture();
  movingFixture.render('concrete box');
  const moving = movingFixture.start({ reducedMotion: false });
  moving.applyDrag(24, 11, 16);
  const beforeMotion = geometry(movingFixture.elements.get('vector-output'));
  moving.step(0.05);
  assert.notEqual(geometry(movingFixture.elements.get('vector-output')), beforeMotion);

  const stillFixture = fixture();
  stillFixture.render('concrete box');
  const still = stillFixture.start({ reducedMotion: true });
  still.applyDrag(24, 11, 16);
  const beforeStill = geometry(stillFixture.elements.get('vector-output'));
  still.step(0.05);
  assert.equal(geometry(stillFixture.elements.get('vector-output')), beforeStill);
});

test('double tap and Home restore the exact initial geometry', () => {
  const { render, start, elements } = fixture();
  render('concrete box');
  const output = elements.get('vector-output');
  const controller = start({ reducedMotion: true });
  const initial = geometry(output);
  controller.applyDrag(40, 20);
  output.dispatch('pointerdown', event({ timeStamp: 100 }));
  output.dispatch('pointerup', event({ timeStamp: 130 }));
  output.dispatch('pointerdown', event({ timeStamp: 240 }));
  output.dispatch('pointerup', event({ timeStamp: 270 }));
  assert.equal(geometry(output), initial);
  controller.applyDrag(25, -12);
  output.dispatch('keydown', event({ key: 'Home' }));
  assert.equal(geometry(output), initial);
});

test('material rerender preserves orientation and rect stays planar', () => {
  const boxFixture = fixture();
  boxFixture.render('concrete box');
  const controller = boxFixture.start({ reducedMotion: true });
  controller.applyDrag(22, -17);
  const orientation = [...controller.getState().orientation];
  boxFixture.render('hazard box');
  assert.equal(JSON.stringify(controller.getState().orientation), JSON.stringify(orientation));

  const rectFixture = fixture();
  rectFixture.render('rust rect');
  const rectOutput = rectFixture.elements.get('vector-output');
  const rectController = rectFixture.start({ reducedMotion: false });
  const initial = geometry(rectOutput);
  rectController.applyDrag(100, 100);
  rectController.step(0.05);
  assert.equal(geometry(rectOutput), initial);
  assert.deepEqual(paths(rectOutput).map(path => path.getAttribute('data-kind')), ['contact-shadow', 'rect-noodle']);
});

test('controller lifecycle is isolated and destroy is idempotent', () => {
  const { render, start } = fixture();
  render('concrete box');
  const first = start({ reducedMotion: true });
  assert.equal(start({ reducedMotion: true }), first);
  first.destroy();
  first.destroy();
  const replacement = start({ reducedMotion: true });
  assert.notEqual(replacement, first);
});
