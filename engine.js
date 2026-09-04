const DVE_SVG_NS = 'http://www.w3.org/2000/svg';
const DVE_BUILD = 'dve-noodle-box-v1';
const DVE_DRAG_RADIANS_PER_PIXEL = 0.0105;
const DVE_AUTO_SPEED = 0.34;
const DVE_MAX_INERTIA = 6.5;
const DVE_PATH_BUDGET = 160;
const DVE_CAMERA_DISTANCE = 5.5;

const dveClamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const dveVectorLength = vector => Math.hypot(vector[0], vector[1], vector[2]);
const dveDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dveCross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

function dveNormalizeVector(vector) {
  const length = dveVectorLength(vector);
  return length > 1e-9 ? vector.map(value => value / length) : [0, 0, 0];
}

function dveNormalizeQuaternion(quaternion) {
  const length = Math.hypot(...quaternion);
  return length > 1e-9 ? quaternion.map(value => value / length) : [1, 0, 0, 0];
}

function dveMultiplyQuaternions(a, b) {
  return dveNormalizeQuaternion([
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
  ]);
}

function dveQuaternionFromAxisAngle(axis, angle) {
  const normalized = dveNormalizeVector(axis);
  const half = angle * 0.5;
  const sine = Math.sin(half);
  return dveNormalizeQuaternion([
    Math.cos(half),
    normalized[0] * sine,
    normalized[1] * sine,
    normalized[2] * sine
  ]);
}

function dveQuaternionBetween(from, to) {
  const a = dveNormalizeVector(from);
  const b = dveNormalizeVector(to);
  const product = dveClamp(dveDot(a, b), -1, 1);
  if (product > 0.999999) return [1, 0, 0, 0];
  if (product < -0.999999) {
    const fallback = Math.abs(a[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
    return dveQuaternionFromAxisAngle(dveCross(a, fallback), Math.PI);
  }
  const axis = dveCross(a, b);
  return dveNormalizeQuaternion([1 + product, axis[0], axis[1], axis[2]]);
}

function dveRotatePoint(point, quaternion) {
  const vector = [quaternion[1], quaternion[2], quaternion[3]];
  const uv = dveCross(vector, point);
  const uuv = dveCross(vector, uv);
  return [
    point[0] + 2 * (quaternion[0] * uv[0] + uuv[0]),
    point[1] + 2 * (quaternion[0] * uv[1] + uuv[1]),
    point[2] + 2 * (quaternion[0] * uv[2] + uuv[2])
  ];
}

function dveDeepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) dveDeepFreeze(child);
  return value;
}

function dveReject(reason) {
  throw new Error('REJECT:' + reason);
}

function dveStructuralId(value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'noodle-' + (hash >>> 0).toString(16).padStart(8, '0');
}

function dveStraightCubic(start, end) {
  return {
    p0: [...start],
    c1: start.map((value, index) => value + (end[index] - value) / 3),
    c2: start.map((value, index) => value + (end[index] - value) * 2 / 3),
    p1: [...end]
  };
}

function dveClosedNoodle(id, points) {
  return {
    id,
    closed: true,
    segments: points.map((point, index) => dveStraightCubic(point, points[(index + 1) % points.length]))
  };
}

function dveOpenNoodle(id, start, end) {
  return { id, closed: false, segments: [dveStraightCubic(start, end)] };
}

function dveSegmentsIntersect(a, b, c, d) {
  const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return orient(a, b, c) !== orient(a, b, d) && orient(c, d, a) !== orient(c, d, b);
}

function dveValidateContour(points) {
  if (points.length < 3) dveReject('CONTOUR_TOO_SHORT');
  for (const point of points) {
    if (point.length !== 2 || point.some(value => !Number.isFinite(value))) dveReject('NON_FINITE_CONTOUR');
  }
  for (let first = 0; first < points.length; first += 1) {
    const nextFirst = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const nextSecond = (second + 1) % points.length;
      if (first === second || nextFirst === second || nextSecond === first) continue;
      if (dveSegmentsIntersect(points[first], points[nextFirst], points[second], points[nextSecond])) {
        dveReject('SELF_INTERSECTING_CONTOUR');
      }
    }
  }
}

function dvePolygonNormal(points) {
  const first = points[0];
  const a = points[1].map((value, index) => value - first[index]);
  const b = points[2].map((value, index) => value - first[index]);
  return dveNormalizeVector(dveCross(a, b));
}

function dveSurface(id, points, featureFrame = null, chamfer = false) {
  const center = [0, 1, 2].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
  return { id, points, center, normal: dvePolygonNormal(points), featureFrame, chamfer };
}

function dveGenomeFor(genotype) {
  if (!Number.isInteger(genotype) || genotype < 0 || genotype > 15) dveReject('GENOTYPE_OUT_OF_RANGE');
  return {
    genotype,
    halfWidth: 1.18 + ((genotype >> 0) & 1) * 0.05,
    halfHeight: 0.90 + ((genotype >> 1) & 1) * 0.04,
    halfDepth: 1.02 + ((genotype >> 2) & 1) * 0.05,
    chamfer: 0.15 + ((genotype >> 3) & 1) * 0.03,
    panelInset: 0.13,
    ribMode: (genotype >> 1) & 1
  };
}

function dveCompileNoodleOrganism(spec = {}) {
  const allowedFields = new Set(['primitive', 'color', 'genotype']);
  for (const field of Object.keys(spec)) if (!allowedFields.has(field)) dveReject('UNKNOWN_SPEC_FIELD:' + field);
  const primitive = spec.primitive ?? 'box';
  const color = spec.color ?? 'concrete';
  const genotype = spec.genotype ?? 0;
  if (!['box', 'cube', 'rect'].includes(primitive)) dveReject('UNSUPPORTED_PRIMITIVE:' + primitive);
  if (!['concrete', 'rust', 'hazard'].includes(color)) dveReject('UNSUPPORTED_MATERIAL:' + color);
  const genome = dveGenomeFor(genotype);

  if (primitive === 'rect') {
    const points2d = [[-1.18, -0.9], [1.18, -0.9], [1.18, 0.9], [-1.18, 0.9]];
    const contour = dveClosedNoodle('rect-contour', points2d);
    const points3d = points2d.map(([x, y]) => [x, y, 0]);
    const surfaces = [dveSurface('rect-plane', points3d)];
    const sourceCurves = [contour];
    const materialSlots = { base: color, wear: 'fixed-noise-17' };
    const draft = { primitive, color, genotype, genome, sourceCurves, surfaces, materialSlots, estimatedPathCount: 1 };
    const structuralId = dveStructuralId({ primitive, genotype, genome, sourceCurves, surfaces });
    return dveDeepFreeze({ ...draft, structuralId });
  }

  const { halfWidth: x, halfHeight: y, halfDepth: z, chamfer: c } = genome;
  const contourPoints = [
    [-x + c, -y], [x - c, -y], [x, -y + c], [x, y - c],
    [x - c, y], [-x + c, y], [-x, y - c], [-x, -y + c]
  ];
  dveValidateContour(contourPoints);
  const contour = dveClosedNoodle('chamfered-contour', contourPoints);
  const depth = dveOpenNoodle('depth-noodle', [0, 0, -z], [0, 0, z]);
  const front = contourPoints.map(([px, py]) => [px, py, z]);
  const back = contourPoints.map(([px, py]) => [px, py, -z]);
  const frontFrame = { center: [0, 0, z], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1], hu: x - c * 0.72, hv: y - c * 0.72 };
  const backFrame = { center: [0, 0, -z], u: [-1, 0, 0], v: [0, 1, 0], normal: [0, 0, -1], hu: x - c * 0.72, hv: y - c * 0.72 };
  const surfaces = [
    dveSurface('front-cap', front, frontFrame),
    dveSurface('back-cap', [...back].reverse(), backFrame)
  ];
  for (let index = 0; index < contourPoints.length; index += 1) {
    const next = (index + 1) % contourPoints.length;
    const edge = [front[index], back[index], back[next], front[next]];
    const edgeVector = [
      contourPoints[next][0] - contourPoints[index][0],
      contourPoints[next][1] - contourPoints[index][1],
      0
    ];
    const edgeLength = dveVectorLength(edgeVector);
    const center = [
      (contourPoints[index][0] + contourPoints[next][0]) / 2,
      (contourPoints[index][1] + contourPoints[next][1]) / 2,
      0
    ];
    const isChamfer = edgeLength < c * 2.2;
    const normal = dvePolygonNormal(edge);
    const featureFrame = isChamfer ? null : {
      center,
      u: dveNormalizeVector(edgeVector),
      v: [0, 0, 1],
      normal,
      hu: edgeLength * 0.43,
      hv: z * 0.86
    };
    surfaces.push(dveSurface('hull-' + index, edge, featureFrame, isChamfer));
  }

  const maximumRadius = Math.hypot(x, y, z);
  if (maximumRadius >= DVE_CAMERA_DISTANCE - 1) dveReject('CAMERA_PLANE_RISK');
  const featureCount = surfaces.filter(surface => surface.featureFrame).length;
  const estimatedPathCount = surfaces.length * 2 + featureCount * 16 + 1;
  if (estimatedPathCount > DVE_PATH_BUDGET) dveReject('PATH_BUDGET_EXCEEDED');
  const sourceCurves = [contour, depth];
  const materialSlots = { base: color, wear: 'fixed-noise-17' };
  const draft = { primitive, color, genotype, genome, sourceCurves, surfaces, materialSlots, estimatedPathCount };
  const structuralId = dveStructuralId({ primitive, genotype, genome, sourceCurves, surfaces });
  return dveDeepFreeze({ ...draft, structuralId });
}

const DVE_INITIAL_ORIENTATION = Object.freeze(dveMultiplyQuaternions(
  dveQuaternionFromAxisAngle([0, 1, 0], -0.62),
  dveQuaternionFromAxisAngle([1, 0, 0], -0.48)
));

const dveView = {
  orientation: [...DVE_INITIAL_ORIENTATION],
  angularVelocity: [0, 0, 0],
  organism: null,
  primitive: 'box',
  color: 'concrete',
  hasInteracted: false,
  dragging: false
};
const dveControllers = new WeakMap();
const dveScenes = new WeakMap();

function dveResolvePrompt(prompt) {
  const tokens = String(prompt ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const primitives = new Set(['box', 'cube', 'rect']);
  const colors = new Set(['concrete', 'rust', 'hazard']);
  let primitive = 'box';
  let color = 'concrete';
  let foundPrimitive = false;
  let foundColor = false;
  for (const token of tokens) {
    if (!foundPrimitive && primitives.has(token)) {
      primitive = token;
      foundPrimitive = true;
    }
    if (!foundColor && colors.has(token)) {
      color = token;
      foundColor = true;
    }
  }
  return { primitive, color };
}

function dveSvgElement(name) {
  return document.createElementNS(DVE_SVG_NS, name);
}

function dveEnsureScene(output) {
  const existing = dveScenes.get(output);
  if (existing) return existing;
  const defs = dveSvgElement('defs');
  const filter = dveSvgElement('filter');
  filter.setAttribute('id', 'dve-concrete-wear');
  filter.setAttribute('x', '-10%');
  filter.setAttribute('y', '-10%');
  filter.setAttribute('width', '120%');
  filter.setAttribute('height', '120%');
  const turbulence = dveSvgElement('feTurbulence');
  turbulence.setAttribute('type', 'fractalNoise');
  turbulence.setAttribute('baseFrequency', '0.065');
  turbulence.setAttribute('numOctaves', '1');
  turbulence.setAttribute('seed', '17');
  turbulence.setAttribute('result', 'noise');
  const matrix = dveSvgElement('feColorMatrix');
  matrix.setAttribute('in', 'noise');
  matrix.setAttribute('type', 'matrix');
  matrix.setAttribute('values', '0.35 0 0 0 0.25  0 0.28 0 0 0.22  0 0 0.22 0 0.18  0 0 0 .42 0');
  matrix.setAttribute('result', 'wear');
  const composite = dveSvgElement('feComposite');
  composite.setAttribute('in', 'wear');
  composite.setAttribute('in2', 'SourceGraphic');
  composite.setAttribute('operator', 'in');
  filter.append(turbulence, matrix, composite);
  defs.append(filter);
  const layer = dveSvgElement('g');
  layer.setAttribute('data-layer', 'projected-noodles');
  output.replaceChildren(defs, layer);
  const scene = { defs, layer, pool: [], used: 0 };
  dveScenes.set(output, scene);
  return scene;
}

function dveProject(point) {
  const perspective = DVE_CAMERA_DISTANCE / (DVE_CAMERA_DISTANCE - point[2]);
  if (!Number.isFinite(perspective) || perspective <= 0) dveReject('INVALID_PROJECTION');
  return [160 + point[0] * 76 * perspective, 158 + point[1] * 76 * perspective];
}

function dveShade(hex, factor) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = shift => dveClamp(Math.round(((value >> shift) & 255) * factor), 0, 255);
  return '#' + [channel(16), channel(8), channel(0)]
    .map(number => number.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function dvePathData(points) {
  if (points.some(point => point.some(value => !Number.isFinite(value)))) dveReject('NON_FINITE_PROJECTED_PATH');
  return points.map((point, index) => (index ? 'L' : 'M') + point[0].toFixed(2) + ' ' + point[1].toFixed(2)).join(' ') + ' Z';
}

function dvePaintPath(scene, points, attributes) {
  let path = scene.pool[scene.used];
  if (!path) {
    path = dveSvgElement('path');
    scene.pool.push(path);
  }
  scene.used += 1;
  path.setAttribute('d', dvePathData(points));
  const defaults = {
    'data-kind': '', 'data-face': '', 'data-depth': '', fill: 'none', stroke: 'none',
    'stroke-width': '0', 'stroke-linejoin': 'round', opacity: '1', filter: '',
    'vector-effect': 'non-scaling-stroke'
  };
  for (const [name, value] of Object.entries({ ...defaults, ...attributes })) path.setAttribute(name, value);
  return path;
}

function dveProjected(points) {
  return points.map(point => dveProject(dveRotatePoint(point, dveView.orientation)));
}

function dveFramePoint(frame, u, v, lift = 0) {
  return [
    frame.center[0] + frame.u[0] * u + frame.v[0] * v + frame.normal[0] * lift,
    frame.center[1] + frame.u[1] * u + frame.v[1] * v + frame.normal[1] * lift,
    frame.center[2] + frame.u[2] * u + frame.v[2] * v + frame.normal[2] * lift
  ];
}

function dveFramePolygon(frame, coordinates, lift = 0) {
  return dveProjected(coordinates.map(([u, v]) => dveFramePoint(frame, u, v, lift)));
}

const dveRectangle = (hu, hv) => [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]];
const dveCircle = (u, v, radius, segments = 10) => Array.from({ length: segments }, (_, index) => {
  const angle = index / segments * Math.PI * 2;
  return [u + Math.cos(angle) * radius, v + Math.sin(angle) * radius];
});

function dveDrawSurface(scene, surface, palette, lightAmount, depth) {
  const factor = 0.40 + lightAmount * 0.70;
  const common = { 'data-face': surface.id, 'data-depth': depth.toFixed(4) };
  const basePoints = dveProjected(surface.points);
  dvePaintPath(scene, basePoints, {
    ...common,
    'data-kind': surface.chamfer ? 'chamfer-hull' : 'swept-hull',
    fill: dveShade(palette.base, factor * (surface.chamfer ? 0.82 : 1)),
    stroke: palette.edge,
    'stroke-width': surface.chamfer ? '3.2' : '5.5'
  });
  dvePaintPath(scene, basePoints, {
    ...common,
    'data-kind': 'procedural-wear',
    fill: '#FFFFFF',
    stroke: 'none',
    opacity: surface.chamfer ? '0.08' : '0.15',
    filter: 'url(#dve-concrete-wear)'
  });
  const frame = surface.featureFrame;
  if (!frame) return;
  const hu = frame.hu;
  const hv = frame.hv;
  const inset = Math.min(hu, hv) * 0.13;
  const bevels = [
    [[-hu, -hv], [hu, -hv], [hu - inset, -hv + inset], [-hu + inset, -hv + inset]],
    [[hu, -hv], [hu, hv], [hu - inset, hv - inset], [hu - inset, -hv + inset]],
    [[hu, hv], [-hu, hv], [-hu + inset, hv - inset], [hu - inset, hv - inset]],
    [[-hu, hv], [-hu, -hv], [-hu + inset, -hv + inset], [-hu + inset, hv - inset]]
  ];
  [1.18, 0.72, 0.56, 0.90].forEach((bevelFactor, index) => {
    dvePaintPath(scene, dveFramePolygon(frame, bevels[index], 0.008), {
      ...common,
      'data-kind': 'bevel-noodle',
      fill: dveShade(palette.base, factor * bevelFactor),
      stroke: palette.edge,
      'stroke-width': '1.4'
    });
  });
  const panelU = hu * 0.67;
  const panelV = hv * 0.57;
  dvePaintPath(scene, dveFramePolygon(frame, dveRectangle(panelU, panelV), 0.012), {
    ...common,
    'data-kind': 'recess-noodle',
    fill: dveShade(palette.base, factor * 0.50),
    stroke: palette.edge,
    'stroke-width': '4'
  });
  dvePaintPath(scene, dveFramePolygon(frame, dveRectangle(panelU - inset * 0.42, panelV - inset * 0.42), 0.016), {
    ...common,
    'data-kind': 'panel-noodle',
    fill: dveShade(palette.base, factor * 0.83),
    stroke: dveShade(palette.edge, 1.4),
    'stroke-width': '2.2'
  });
  const ribWidth = Math.min(hu, hv) * 0.085;
  const horizontal = surface.id === 'hull-0' || surface.id === 'hull-4';
  const rib = horizontal
    ? [[-panelU * 0.78, -ribWidth], [panelU * 0.78, -ribWidth], [panelU * 0.78, ribWidth], [-panelU * 0.78, ribWidth]]
    : [[-ribWidth, -panelV * 0.78], [ribWidth, -panelV * 0.78], [ribWidth, panelV * 0.78], [-ribWidth, panelV * 0.78]];
  dvePaintPath(scene, dveFramePolygon(frame, rib, 0.025), {
    ...common,
    'data-kind': 'rib-noodle',
    fill: dveShade(palette.base, factor * 1.15),
    stroke: palette.edge,
    'stroke-width': '2'
  });
  const radius = Math.min(hu, hv) * 0.072;
  const anchors = [
    [-panelU * 0.78, -panelV * 0.72], [panelU * 0.78, -panelV * 0.72],
    [panelU * 0.78, panelV * 0.72], [-panelU * 0.78, panelV * 0.72]
  ];
  for (const [u, v] of anchors) {
    dvePaintPath(scene, dveFramePolygon(frame, dveCircle(u, v, radius), 0.028), {
      ...common,
      'data-kind': 'anchor-noodle',
      fill: palette.edge,
      stroke: dveShade(palette.base, factor * 1.2),
      'stroke-width': '1.4'
    });
    dvePaintPath(scene, dveFramePolygon(frame, dveCircle(u - radius * 0.14, v - radius * 0.14, radius * 0.38, 8), 0.031), {
      ...common,
      'data-kind': 'anchor-core',
      fill: dveShade(palette.base, factor * 0.42),
      stroke: 'none'
    });
  }
  if (['front-cap', 'hull-0', 'hull-2'].includes(surface.id)) {
    dvePaintPath(scene, dveFramePolygon(frame, [
      [panelU * 0.34, -panelV * 0.46], [panelU * 0.44, -panelV * 0.46], [panelU * 0.39, panelV * 0.36]
    ], 0.034), {
      ...common,
      'data-kind': 'rust-noodle',
      fill: palette.stain,
      stroke: 'none',
      opacity: '0.76'
    });
  }
}

function dveDrawFrame() {
  const output = document.getElementById('vector-output');
  if (!output) throw new Error('Missing #vector-output SVG target');
  if (!dveView.organism) dveView.organism = dveCompileNoodleOrganism({ primitive: dveView.primitive, color: dveView.color, genotype: 0 });
  const palettes = {
    concrete: { base: '#92989A', edge: '#15191B', stain: '#884226' },
    rust: { base: '#B35B30', edge: '#24100C', stain: '#532014' },
    hazard: { base: '#D6B239', edge: '#211D0C', stain: '#864323' }
  };
  const palette = palettes[dveView.color];
  output.setAttribute('viewBox', '0 0 320 320');
  output.setAttribute('role', 'img');
  output.setAttribute('tabindex', '0');
  output.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight Home');
  output.setAttribute('aria-label', dveView.color + ' brutalist ' + dveView.primitive + ' vector noodle rotation illusion');
  output.setAttribute('data-build', DVE_BUILD);
  output.setAttribute('data-primitive', dveView.primitive);
  output.setAttribute('data-color', dveView.color);
  output.setAttribute('data-structural-id', dveView.organism.structuralId);
  output.setAttribute('data-dragging', String(dveView.dragging));
  const scene = dveEnsureScene(output);
  scene.used = 0;
  dvePaintPath(scene, [[66, 250], [91, 239], [160, 234], [229, 239], [254, 250], [227, 261], [160, 265], [93, 261]], {
    'data-kind': 'contact-shadow', fill: '#000000', opacity: '0.54', stroke: 'none'
  });

  if (dveView.primitive === 'rect') {
    const plane = dveView.organism.surfaces[0];
    dvePaintPath(scene, dveProjected(plane.points), {
      'data-kind': 'rect-noodle', fill: palette.base, stroke: palette.edge, 'stroke-width': '7'
    });
  } else {
    const light = dveNormalizeVector([-0.38, -0.64, 0.67]);
    const visible = dveView.organism.surfaces.map(surface => {
      const normal = dveRotatePoint(surface.normal, dveView.orientation);
      const center = dveRotatePoint(surface.center, dveView.orientation);
      return { surface, normal, depth: center[2], lightAmount: Math.max(0, dveDot(normal, light)) };
    }).filter(item => item.normal[2] > 0.0001)
      .sort((a, b) => a.depth - b.depth);
    for (const item of visible) dveDrawSurface(scene, item.surface, palette, item.lightAmount, item.depth);
  }
  scene.layer.replaceChildren(...scene.pool.slice(0, scene.used));
  return output;
}

function renderPromptToSvg(prompt) {
  const resolved = dveResolvePrompt(prompt);
  const organism = dveCompileNoodleOrganism({ primitive: resolved.primitive, color: resolved.color, genotype: 0 });
  dveView.primitive = resolved.primitive;
  dveView.color = resolved.color;
  dveView.organism = organism;
  const output = dveDrawFrame();
  const status = document.getElementById('resolvedStatus');
  if (status) status.textContent = 'Resolved: ' + resolved.color + ' ' + resolved.primitive + ' / ' + organism.structuralId;
  return Object.freeze({ primitive: resolved.primitive, color: resolved.color, structuralId: organism.structuralId, svg: output });
}

function dveMapPointerToSphere(clientX, clientY, bounds) {
  const width = Math.max(1, bounds.width || 320);
  const height = Math.max(1, bounds.height || 320);
  const diameter = Math.min(width, height);
  let x = (2 * (clientX - bounds.left) - width) / diameter;
  let y = (height - 2 * (clientY - bounds.top)) / diameter;
  const squared = x * x + y * y;
  if (squared > 1) {
    const inverse = 1 / Math.sqrt(squared);
    return [x * inverse, y * inverse, 0];
  }
  return [x, y, Math.sqrt(1 - squared)];
}

function startSvgIllusion(options = {}) {
  const output = document.getElementById('vector-output');
  if (!output) throw new Error('Missing #vector-output SVG target');
  const existing = dveControllers.get(output);
  if (existing) return existing;
  const reducedMotion = options.reducedMotion ?? Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const requestFrame = options.requestAnimationFrame ?? globalThis.requestAnimationFrame;
  const cancelFrame = options.cancelAnimationFrame ?? globalThis.cancelAnimationFrame;
  let activePointerId = null;
  let pointerBounds = null;
  let lastSpherePoint = null;
  let lastX = 0;
  let lastY = 0;
  let lastPointerTime = 0;
  let totalMovement = 0;
  let lastTapTime = -Infinity;
  let lastFrameTime = null;
  let frameId = null;
  let destroyed = false;

  const snapshot = () => Object.freeze({
    orientation: Object.freeze([...dveView.orientation]),
    angularVelocity: Object.freeze([...dveView.angularVelocity]),
    dragging: dveView.dragging,
    hasInteracted: dveView.hasInteracted,
    reducedMotion
  });

  function applyQuaternion(delta, elapsedMs = 16) {
    dveView.hasInteracted = true;
    dveView.orientation = dveMultiplyQuaternions(delta, dveView.orientation);
    const seconds = dveClamp(Number(elapsedMs) / 1000 || 0.016, 0.008, 0.1);
    const normalized = dveNormalizeQuaternion(delta);
    const angle = 2 * Math.acos(dveClamp(normalized[0], -1, 1));
    const sine = Math.sqrt(Math.max(0, 1 - normalized[0] * normalized[0]));
    if (angle < 1e-7 || sine < 1e-7) {
      dveView.angularVelocity = [0, 0, 0];
    } else {
      const speed = Math.min(DVE_MAX_INERTIA, angle / seconds);
      dveView.angularVelocity = [
        normalized[1] / sine * speed,
        normalized[2] / sine * speed,
        normalized[3] / sine * speed
      ];
    }
    dveDrawFrame();
    return snapshot();
  }

  function applyTrackball(from, to, elapsedMs = 16) {
    if (dveView.primitive === 'rect') return snapshot();
    return applyQuaternion(dveQuaternionBetween(from, to), elapsedMs);
  }

  function applyDrag(dx, dy, elapsedMs = 16) {
    if (dveView.primitive === 'rect') return snapshot();
    dveView.hasInteracted = true;
    const x = Number.isFinite(Number(dx)) ? Number(dx) : 0;
    const y = Number.isFinite(Number(dy)) ? Number(dy) : 0;
    const magnitude = Math.hypot(x, y);
    if (magnitude < 1e-9) {
      dveView.angularVelocity = [0, 0, 0];
      return snapshot();
    }
    const delta = dveQuaternionFromAxisAngle(dveNormalizeVector([y, x, 0]), magnitude * DVE_DRAG_RADIANS_PER_PIXEL);
    return applyQuaternion(delta, elapsedMs);
  }

  function step(elapsedSeconds) {
    if (dveView.primitive === 'rect') return snapshot();
    const dt = dveClamp(Number(elapsedSeconds) || 0, 0, 0.05);
    let changed = false;
    if (!dveView.hasInteracted && !reducedMotion && dt > 0) {
      dveView.orientation = dveMultiplyQuaternions(
        dveQuaternionFromAxisAngle([0.22, 1, 0.08], DVE_AUTO_SPEED * dt),
        dveView.orientation
      );
      changed = true;
    } else if (!dveView.dragging && !reducedMotion && dt > 0) {
      const speed = dveVectorLength(dveView.angularVelocity);
      if (speed > 0.002) {
        dveView.orientation = dveMultiplyQuaternions(
          dveQuaternionFromAxisAngle(dveView.angularVelocity, speed * dt),
          dveView.orientation
        );
        const decay = Math.pow(0.035, dt);
        dveView.angularVelocity = dveView.angularVelocity.map(value => Math.abs(value * decay) < 0.002 ? 0 : value * decay);
        changed = true;
      }
    }
    if (changed) dveDrawFrame();
    return snapshot();
  }

  function reset() {
    dveView.orientation = [...DVE_INITIAL_ORIENTATION];
    dveView.angularVelocity = [0, 0, 0];
    dveView.hasInteracted = true;
    dveView.dragging = false;
    activePointerId = null;
    dveDrawFrame();
    return snapshot();
  }

  function onPointerDown(event) {
    if (activePointerId !== null || dveView.primitive === 'rect') return;
    activePointerId = event.pointerId;
    pointerBounds = output.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 320, height: 320 };
    lastSpherePoint = dveMapPointerToSphere(event.clientX, event.clientY, pointerBounds);
    lastX = event.clientX;
    lastY = event.clientY;
    lastPointerTime = Number(event.timeStamp) || 0;
    totalMovement = 0;
    dveView.hasInteracted = true;
    dveView.dragging = true;
    dveView.angularVelocity = [0, 0, 0];
    output.setAttribute('data-dragging', 'true');
    output.setPointerCapture?.(activePointerId);
    output.focus?.({ preventScroll: true });
    event.preventDefault?.();
  }

  function onPointerMove(event) {
    if (event.pointerId !== activePointerId) return;
    const current = dveMapPointerToSphere(event.clientX, event.clientY, pointerBounds);
    totalMovement += Math.hypot(event.clientX - lastX, event.clientY - lastY);
    applyTrackball(lastSpherePoint, current, (Number(event.timeStamp) || 0) - lastPointerTime);
    lastSpherePoint = current;
    lastX = event.clientX;
    lastY = event.clientY;
    lastPointerTime = Number(event.timeStamp) || lastPointerTime;
    event.preventDefault?.();
  }

  function finishPointer(event, cancelled) {
    if (event.pointerId !== activePointerId) return;
    const eventTime = Number(event.timeStamp) || 0;
    activePointerId = null;
    lastSpherePoint = null;
    dveView.dragging = false;
    output.setAttribute('data-dragging', 'false');
    if (cancelled) {
      dveView.angularVelocity = [0, 0, 0];
    } else {
      if (reducedMotion) dveView.angularVelocity = [0, 0, 0];
      if (totalMovement < 8) {
        dveView.angularVelocity = [0, 0, 0];
        if (eventTime - lastTapTime <= 325) {
          lastTapTime = -Infinity;
          reset();
        } else {
          lastTapTime = eventTime;
        }
      }
    }
    event.preventDefault?.();
  }

  const onPointerUp = event => finishPointer(event, false);
  const onPointerCancel = event => finishPointer(event, true);
  const onLostPointerCapture = event => finishPointer(event, true);

  function onKeyDown(event) {
    if (event.key === 'Home') {
      event.preventDefault?.();
      reset();
      return;
    }
    const rotations = {
      ArrowLeft: [[0, 1, 0], -0.12],
      ArrowRight: [[0, 1, 0], 0.12],
      ArrowUp: [[1, 0, 0], -0.12],
      ArrowDown: [[1, 0, 0], 0.12]
    };
    const rotation = rotations[event.key];
    if (!rotation || dveView.primitive === 'rect') return;
    event.preventDefault?.();
    applyQuaternion(dveQuaternionFromAxisAngle(rotation[0], rotation[1]), 100);
    dveView.angularVelocity = [0, 0, 0];
  }

  function animate(time) {
    if (destroyed) return;
    if (lastFrameTime !== null) step((time - lastFrameTime) / 1000);
    lastFrameTime = time;
    frameId = requestFrame(animate);
  }

  output.addEventListener('pointerdown', onPointerDown);
  output.addEventListener('pointermove', onPointerMove);
  output.addEventListener('pointerup', onPointerUp);
  output.addEventListener('pointercancel', onPointerCancel);
  output.addEventListener('lostpointercapture', onLostPointerCapture);
  output.addEventListener('keydown', onKeyDown);

  const controller = Object.freeze({
    applyDrag,
    applyTrackball,
    step,
    reset,
    getState: snapshot,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frameId !== null && typeof cancelFrame === 'function') cancelFrame(frameId);
      output.removeEventListener('pointerdown', onPointerDown);
      output.removeEventListener('pointermove', onPointerMove);
      output.removeEventListener('pointerup', onPointerUp);
      output.removeEventListener('pointercancel', onPointerCancel);
      output.removeEventListener('lostpointercapture', onLostPointerCapture);
      output.removeEventListener('keydown', onKeyDown);
      dveControllers.delete(output);
    }
  });
  dveControllers.set(output, controller);
  if (typeof requestFrame === 'function') frameId = requestFrame(animate);
  return controller;
}

globalThis.compileNoodleOrganism = dveCompileNoodleOrganism;
globalThis.renderPromptToSvg = renderPromptToSvg;
globalThis.startSvgIllusion = startSvgIllusion;
