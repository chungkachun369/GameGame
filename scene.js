/* Original low-poly world models. Collection portraits separately use supplied textbook crops. */
let renderer,
  scene,
  camera,
  world,
  actors,
  cityGroup,
  effects,
  water,
  player,
  preview,
  plotOutline,
  gridGroup,
  navLine,
  beacon;
let carryVisual = null,
  cityPeople = [];
let npcs = [],
  obstacles = [],
  cityObstacles = [],
  boats = [],
  cameraAngle = 0.48,
  cameraDistance = 23,
  worldTime = 0;
function actorShadow(g) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.27, 20),
    new THREE.MeshBasicMaterial({
      color: "#524b36",
      transparent: true,
      opacity: 0.21,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.72;
  shadow.position.y = 0.045;
  g.add(shadow);
}
let lastPlayerMove = false,
  seedAction = 0,
  labStage = 0,
  labKind = null,
  labObjects = {},
  cameraTarget;
const materials = new Map(),
  keys = {},
  UP = new THREE.Vector3(0, 1, 0);
const SITES = {
  guide: { x: 3, z: 8, name: "Nebi · River Guide", role: "Guide" },
  field: { x: -3.5, z: 1.4, name: "Hori · Farmer", role: "Farmer" },
  workshop: { x: 14, z: 7, name: "Tia · Craft Worker", role: "Craft Worker" },
  archive: { x: 10, z: 1, name: "Merit · Scribe", role: "Scribe" },
  dock: { x: -5.2, z: 9, name: "Dedu · Boatkeeper", role: "Boatkeeper" },
  court: { x: 2, z: -6, name: "Senen · City Steward", role: "Steward" },
  museum: { x: 11, z: -6, name: "Iset · Story Keeper", role: "Story Keeper" },
  ra: { x: 0.3, z: -11.8, name: "Ra · Sun God", role: "Belief encounter" },
  osiris: {
    x: 7.5,
    z: -11.8,
    name: "Osiris · Afterlife",
    role: "Belief encounter",
  },
};
const EGYPT_NAMES = Object.fromEntries(
  Object.entries(SITES).map(([k, v]) => [k, v.name]),
);
const TEACH_SITES = {
  survey: "guide",
  deliver: "field",
  classify: "workshop",
  evidence: "archive",
  place: "court",
  route: "dock",
  process: "workshop",
  sequence: "guide",
  exhibit: "guide",
};
const WORK_SITES = {
  survey: "field",
  deliver: "dock",
  classify: "workshop",
  evidence: "archive",
  place: "court",
  route: "dock",
  process: "workshop",
  sequence: "field",
  exhibit: "museum",
};
function material(c, opts = {}) {
  const key = c + JSON.stringify(opts);
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.94, ...opts }),
    );
  return materials.get(key);
}
function shape(geo, c, parent, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, typeof c === "string" ? material(c, opts) : c);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, c, p, x = 0, y = 0, z = 0) {
  return shape(new THREE.BoxGeometry(w, h, d), c, p, x, y, z);
}
function cylinder(rt, rb, h, c, p, x = 0, y = 0, z = 0, n = 10) {
  return shape(new THREE.CylinderGeometry(rt, rb, h, n), c, p, x, y, z);
}
function orb(rx, ry, rz, c, p, x = 0, y = 0, z = 0, n = 10) {
  const m = shape(new THREE.SphereGeometry(1, n, 7), c, p, x, y, z);
  m.scale.set(rx, ry, rz);
  return m;
}
function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
function seeded(n) {
  let s = n;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function linenTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const x = cv.getContext("2d");
  x.fillStyle = "#ede5d1";
  x.fillRect(0, 0, 128, 128);
  const r = seeded(218);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(109,89,55,${r() * 0.1})`;
    x.fillRect(r() * 128, r() * 128, 1, 3);
  }
  for (let y = 0; y < 128; y += 4) {
    x.fillStyle = "#ffffff20";
    x.fillRect(0, y, 128, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
let linenMap;
function jar(p, x, y, z, s = 1, c = "#b16d45") {
  const g = group(p, x, y, z);
  const points = [
    [0.09, 0],
    [0.22, 0.08],
    [0.29, 0.27],
    [0.24, 0.45],
    [0.13, 0.53],
    [0.12, 0.63],
    [0.15, 0.65],
  ].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  shape(new THREE.LatheGeometry(points, 12), c, g);
  cylinder(0.11 * s, 0.11 * s, 0.012 * s, "#493e2d", g, 0, 0.642 * s, 0);
  return g;
}
function palm(p, x, z, s = 1, tilt = 0) {
  const g = group(p, x, 0, z),
    r = seeded(Math.round((x + 100) * 391 + z * 19));
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const m = cylinder(
      (0.13 - t * 0.035) * s,
      (0.15 - t * 0.035) * s,
      0.48 * s,
      i % 2 ? "#947250" : "#886746",
      g,
      Math.sin(t * 0.8) * tilt * s,
      (i * 0.44 + 0.22) * s,
      0,
      7,
    );
    m.rotation.z = -tilt * 0.2;
  }
  const tx = Math.sin(0.8) * tilt * s,
    ty = 3.1 * s;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.quadraticCurveTo(0.3, 1.1, 0.01, 1.85);
    sh.quadraticCurveTo(-0.3, 1.05, 0, 0);
    const leaf = shape(
      new THREE.ShapeGeometry(sh),
      i % 2 ? "#5c7950" : "#73894e",
      g,
      tx,
      ty,
      0,
      { side: THREE.DoubleSide },
    );
    leaf.rotation.x = -Math.PI / 2 + 0.35 + r() * 0.35;
    leaf.rotation.z = a;
    const mid = box(
      0.028,
      1.6,
      0.025,
      "#9b9955",
      g,
      tx + Math.sin(a) * 0.65,
      ty - 0.05,
      Math.cos(a) * 0.65,
    );
    mid.rotation.set(1.35, 0, -a);
  }
  orb(0.25 * s, 0.22 * s, 0.25 * s, "#967149", g, tx, ty - 0.12 * s, 0, 7);
  return g;
}
function reeds(p, x, z, s = 1) {
  const g = group(p, x, 0, z);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const m = cylinder(
      0.014,
      0.023,
      (0.5 + i * 0.08) * s,
      "#69804d",
      g,
      Math.cos(a) * 0.16,
      (0.25 + i * 0.04) * s,
      Math.sin(a) * 0.16,
      4,
    );
    m.rotation.z = Math.cos(a) * 0.15;
    orb(
      0.055,
      0.12,
      0.055,
      "#927b43",
      g,
      Math.cos(a) * 0.16,
      (0.52 + i * 0.08) * s,
      Math.sin(a) * 0.16,
      5,
    );
  }
  return g;
}
function clothAwning(p, x, y, z, w = 2.3, d = 1.5, c = "#be9360") {
  const g = group(p, x, y, z);
  for (const xx of [-w / 2, w / 2])
    cylinder(0.035, 0.05, y + 0.2, "#6d5639", g, xx, -y / 2 + 0.1, d / 2, 6);
  const cloth = box(w, 0.05, d, c, g, 0, 0, 0);
  cloth.rotation.x = 0.12;
  for (let i = 0; i < 7; i++)
    box(
      w / 7,
      0.13,
      0.06,
      i % 2 ? c : "#e6d4a6",
      g,
      -w / 2 + ((i + 0.5) * w) / 7,
      -0.05,
      d / 2,
    );
  return g;
}
function homeModel(p, x, z, s = 1, variant = 0) {
  const g = group(p, x, 0, z);
  g.scale.setScalar(s);
  const clay = ["#bd9368", "#c5a07a", "#b99770"][variant % 3];
  box(1.8, 1.5, 1.65, clay, g, 0, 0.75, 0);
  box(1.98, 0.12, 1.83, "#dcc5a0", g, 0, 1.55, 0);
  for (const xx of [-0.88, 0.88]) box(0.12, 0.27, 1.7, clay, g, xx, 1.7, 0);
  box(1.8, 0.27, 0.12, clay, g, 0, 1.7, -0.8);
  box(0.42, 0.95, 0.035, "#554533", g, 0.25, 0.48, 0.834);
  box(0.2, 0.28, 0.035, "#4a5142", g, -0.5, 1.1, 0.834);
  for (let i = 0; i < 5; i++)
    box(0.04, 0.31, 0.05, "#8e7351", g, -0.6 + i * 0.05, 1.1, 0.86);
  box(0.68, 0.08, 0.42, "#b49b75", g, 0.22, 0.04, 1.04);
  for (let i = 0; i < 4; i++)
    box(1.9, 0.055, 0.08, "#6a573e", g, 0, 1.64, -0.6 + i * 0.4);
  jar(g, -0.55, 0, 1.03, 0.6);
  if (variant % 2 === 0) clothAwning(g, -0.3, 1.28, 1.25, 1.7, 0.8, "#bc9e69");
  return g;
}
function granaryModel(p, x, z, s = 1) {
  const g = group(p, x, 0, z);
  g.scale.setScalar(s);
  for (const xx of [-0.5, 0.5]) {
    cylinder(0.48, 0.54, 1.7, "#c09a71", g, xx, 0.85, 0, 12);
    shape(
      new THREE.SphereGeometry(0.48, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
      "#d2b48b",
      g,
      xx,
      1.7,
      0,
    );
    box(0.22, 0.3, 0.03, "#6b5941", g, xx, 0.25, 0.51);
    jar(g, xx, 0, 0.83, 0.6);
  }
  return g;
}
function farmModel(p, x, z, grown = true) {
  const g = group(p, x, 0.02, z);
  box(2.08, 0.08, 2.08, "#796344", g, 0, 0.01, 0);
  for (let i = 0; i < 5; i++) {
    box(0.17, 0.06, 1.96, "#4c7970", g, -0.9 + i * 0.44, 0.07, 0);
    for (let j = 0; j < 5; j++) {
      const xx = -0.72 + i * 0.34,
        zz = -0.75 + j * 0.33;
      const h = grown ? 0.38 : 0.13;
      const stalk = cylinder(
        0.014,
        0.022,
        h,
        grown ? "#c2a450" : "#6f8747",
        g,
        xx,
        h / 2 + 0.1,
        zz,
        4,
      );
      if (grown) orb(0.05, 0.13, 0.045, "#d7bd6f", g, xx, h + 0.12, zz, 5);
    }
  }
  return g;
}
function workshopModel(p, x, z) {
  const g = group(p, x, 0, z);
  clothAwning(g, 0, 1.7, 0, 2, 1.6, "#ac7752");
  box(1.4, 0.15, 0.65, "#806345", g, 0, 0.7, 0);
  for (const xx of [-0.55, 0.55])
    box(0.09, 0.65, 0.5, "#6b553c", g, xx, 0.33, 0);
  jar(g, 0.3, 0.78, 0, 0.65);
  jar(g, -0.5, 0, 0.5, 0.9);
  cylinder(0.32, 0.4, 0.65, "#ad7856", g, 0.7, 0.32, -0.5);
  orb(0.34, 0.28, 0.34, "#be9169", g, 0.7, 0.65, -0.5);
  return g;
}
function dockModel(p, x, z, s = 1) {
  const g = group(p, x, 0, z);
  g.scale.setScalar(s);
  for (let i = 0; i < 9; i++)
    box(
      0.23,
      0.12,
      2.0,
      i % 2 ? "#9c8054" : "#ac8d60",
      g,
      -1 + i * 0.25,
      0.16,
      0,
    );
  for (const xx of [-1, 1])
    for (const zz of [-0.8, 0.8])
      cylinder(0.07, 0.08, 0.7, "#705f42", g, xx, 0.2, zz, 6);
  jar(g, 0.5, 0.23, 0.6, 0.65);
  return g;
}
function shrineModel(p, x, z, s = 1) {
  const g = group(p, x, 0, z);
  g.scale.setScalar(s);
  box(2.2, 0.15, 2.2, "#bca580", g, 0, 0.075, 0);
  for (const xx of [-0.75, 0.75])
    for (const zz of [-0.7, 0.7]) {
      cylinder(0.12, 0.16, 1.8, "#d3bf96", g, xx, 1, zz, 10);
      cylinder(0.2, 0.16, 0.15, "#b19870", g, xx, 1.9, zz);
    }
  box(2.1, 0.24, 1.9, "#c5ae83", g, 0, 2.1, 0);
  box(0.62, 0.55, 0.55, "#aa8a5e", g, 0, 0.4, 0);
  return g;
}
function pyramid(p, x, z, s = 1) {
  const g = group(p, x, 0, z);
  for (let i = 0; i < 16; i++) {
    const w = (16 - i) * 0.53 * s;
    box(
      w,
      0.32 * s,
      w,
      i % 2 ? "#c8ae7e" : "#bfa373",
      g,
      0,
      (i + 0.5) * 0.32 * s,
      0,
    );
  }
  const cap = shape(
    new THREE.ConeGeometry(0.4 * s, 0.7 * s, 4),
    "#e0c58c",
    g,
    0,
    5.45 * s,
    0,
  );
  cap.rotation.y = Math.PI / 4;
  return g;
}
function temple(p, x, z) {
  const g = group(p, x, 0, z);
  box(11, 0.2, 7, "#baab86", g, 0, 0.1, 0);
  for (let i = 0; i < 3; i++)
    box(6 + i * 0.55, 0.13, 1.4, "#c9b38b", g, 0, 0.12 + i * 0.12, 4 - i * 0.4);
  for (const xx of [-4, 4]) {
    box(2.1, 3.5, 1.5, "#c4a67a", g, xx, 1.85, 1.7);
    box(2.3, 0.24, 1.65, "#dbc298", g, xx, 3.7, 1.7);
    for (let j = 0; j < 3; j++)
      box(0.12, 0.9, 0.04, "#a1855b", g, xx - 0.4 + j * 0.4, 2.2, 2.47);
  }
  for (const xx of [-2.1, 2.1])
    for (const zz of [-1.8, 0.7]) {
      cylinder(0.25, 0.32, 2.8, "#cfb88e", g, xx, 1.6, zz);
      cylinder(0.42, 0.27, 0.35, "#b69a6d", g, xx, 2.95, zz);
      box(0.8, 0.17, 0.8, "#d3bf99", g, xx, 0.27, zz);
    }
  box(6, 0.36, 4.5, "#ceb68c", g, 0, 3.3, -0.9);
  box(4.1, 2.8, 0.5, "#bfa378", g, 0, 1.55, -2.8);
  box(1.3, 2.2, 0.05, "#535a44", g, 0, 1.25, -2.52);
  for (const xx of [-5.3, 5.3]) {
    box(0.3, 0.6, 7, "#c9b18b", g, xx, 0.45, 0);
  }
  return g;
}
function regionalLandmark(p, c, x, z) {
  const g = group(p, x, 0, z);
  if (c === "meso") {
    for (let i = 0; i < 4; i++)
      box(7 - i * 1.3, 0.7, 5 - i * 0.8, "#ba9367", g, 0, (i + 0.5) * 0.7, 0);
    box(2.2, 1.3, 1.8, "#c3a77b", g, 0, 3.45, 0);
  } else if (c === "indus") {
    box(9, 0.2, 6, "#b99578", g, 0, 0.1, 0);
    for (const xx of [-4, 4]) box(0.4, 0.6, 6, "#ad8a6e", g, xx, 0.3, 0);
    for (const zz of [-2.8, 2.8]) box(8, 0.6, 0.4, "#ad8a6e", g, 0, 0.3, zz);
    box(6, 0.08, 3, "#577f7b", g, 0, 0.23, 0);
    for (let i = 0; i < 4; i++)
      box(2 - i * 0.2, 0.15, 1, "#b99a7c", g, 0, 0.3 + i * 0.1, 1.6 + i * 0.2);
  } else {
    box(8, 0.3, 5, "#b9a47d", g, 0, 0.15, 0);
    box(5, 2.3, 3.5, "#b99a71", g, 0, 1.4, 0);
    const roof = shape(
      new THREE.ConeGeometry(4, 1.3, 4),
      "#766d52",
      g,
      0,
      3.1,
      0,
    );
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.7;
    for (const xx of [-2, 2])
      cylinder(0.1, 0.12, 2.3, "#6b5b43", g, xx, 1.4, 1.8, 7);
  }
}
function boatModel(p, x, z, s = 1) {
  const g = group(p, x, 0.05, z);
  g.scale.setScalar(s);
  const hull = orb(0.65, 0.28, 1.8, "#81653e", g, 0, 0.18, 0, 12);
  box(0.9, 0.07, 2.2, "#ba9b66", g, 0, 0.35, 0);
  for (const zz of [-1.55, 1.55]) {
    const tip = orb(0.25, 0.3, 0.55, "#94764b", g, 0, 0.34, zz);
    tip.rotation.x = zz > 0 ? -0.4 : 0.4;
  }
  cylinder(0.035, 0.045, 2.6, "#886c45", g, 0, 1.56, -0.1, 6);
  const sail = shape(
    new THREE.PlaneGeometry(1.5, 1.7, 4, 4),
    "#e3d2aa",
    g,
    0,
    1.9,
    0,
    { side: THREE.DoubleSide },
  );
  const pa = sail.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++)
    pa.setZ(i, Math.cos(pa.getX(i) * 2) * 0.25);
  sail.rotation.y = 0.45;
  box(1.8, 0.045, 0.045, "#8e7550", g, 0, 2.78, 0);
  jar(g, 0, 0.4, 0.7, 0.5);
  return g;
}
function character(p, opts = {}) {
  const g = group(p),
    skin = opts.god === "osiris" ? "#668570" : opts.skin || "#b78055",
    hair = "#302f28";
  const root = group(g, 0, 0, 0);
  const torso = group(root, 0, 0.91, 0);
  const body = shape(
    new THREE.CylinderGeometry(0.23, 0.18, 0.46, 8),
    skin,
    torso,
    0,
    0.2,
    0,
  );
  body.scale.z = 0.66;
  orb(0.2, 0.1, 0.14, skin, torso, 0, 0.43, 0);
  const head = group(torso, 0, 0.66, 0);
  orb(0.165, 0.21, 0.155, skin, head, 0, 0, 0, 10);
  orb(0.07, 0.06, 0.045, skin, head, 0, -0.04, 0.15, 7);
  for (const side of [-1, 1]) {
    orb(0.034, 0.055, 0.025, skin, head, side * 0.164, -0.015, 0, 6);
    orb(0.022, 0.023, 0.015, "#302e23", head, side * 0.065, 0.02, 0.147, 5);
    orb(0.025, 0.008, 0.02, hair, head, side * 0.065, 0.068, 0.135, 5);
  }
  const hairMesh = shape(
    new THREE.SphereGeometry(0.173, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.53),
    hair,
    head,
    0,
    0.04,
    0,
  );
  hairMesh.scale.set(1, 1, 0.98);
  const kilt = shape(
    new THREE.CylinderGeometry(0.205, 0.31, 0.42, 12),
    material("#f0e5cc", { map: linenMap }),
    root,
    0,
    0.73,
    0,
  );
  kilt.scale.z = 0.77;
  for (let i = 0; i < 6; i++) {
    const pleat = box(
      0.018,
      0.35,
      0.02,
      "#cbbf9f",
      root,
      -0.18 + i * 0.072,
      0.72,
      0.195 + Math.sin((i / 5) * Math.PI) * 0.02,
    );
    pleat.rotation.z = (i - 2.5) * 0.025;
  }
  const belt = cylinder(
    0.215,
    0.215,
    0.055,
    opts.trim || "#a38b5f",
    root,
    0,
    0.94,
    0,
  );
  belt.scale.z = 0.76;
  const flap = box(0.15, 0.36, 0.024, "#f6ecd6", root, 0, 0.71, 0.232);
  flap.rotation.z = 0.1;
  const legs = [],
    arms = [],
    knees = [],
    elbows = [];
  for (const side of [-1, 1]) {
    const leg = group(root, side * 0.116, 0.58, 0);
    cylinder(0.077, 0.062, 0.29, skin, leg, 0, -0.135, 0, 8);
    const knee = group(leg, 0, -0.27, 0);
    cylinder(0.06, 0.044, 0.27, skin, knee, 0, -0.13, 0, 7);
    orb(0.066, 0.045, 0.12, skin, knee, 0, -0.265, 0.047, 7);
    legs.push(leg);
    knees.push(knee);
    const arm = group(torso, side * 0.25, 0.36, 0);
    orb(0.083, 0.1, 0.08, skin, arm);
    cylinder(0.066, 0.05, 0.27, skin, arm, 0, -0.15, 0, 7);
    const elbow = group(arm, 0, -0.28, 0);
    cylinder(0.05, 0.037, 0.25, skin, elbow, 0, -0.125, 0, 7);
    orb(0.045, 0.06, 0.038, skin, elbow, 0, -0.265, 0, 7);
    arm.rotation.z = side * 0.09;
    arms.push(arm);
    elbows.push(elbow);
  }
  if (opts.robe) {
    const robe = shape(
      new THREE.CylinderGeometry(0.24, 0.32, 0.9, 10),
      material(opts.robe, { map: linenMap }),
      root,
      0,
      0.73,
      0,
    );
    robe.scale.z = 0.78;
  }
  if (!opts.god) {
    const bag = orb(0.19, 0.22, 0.135, "#a98b55", root, -0.3, 0.74, 0.17);
    cylinder(0.14, 0.16, 0.06, "#756342", root, -0.3, 0.96, 0.17, 9);
    orb(0.1, 0.025, 0.09, "#d1ae65", root, -0.3, 0.97, 0.17, 7);
    const strap = box(0.035, 0.62, 0.035, "#b39b6a", root, -0.2, 1.19, 0.14);
    strap.rotation.z = -0.36;
    arms[0].rotation.x = -0.4;
    elbows[0].rotation.x = -0.7;
  }
  if (opts.god === "ra") {
    hairMesh.visible = false;
    head.children.filter((_, i) => i < 8).forEach((m) => (m.visible = false));
    orb(0.15, 0.22, 0.15, "#ae9563", head, 0, 0, 0);
    const beak = shape(
      new THREE.ConeGeometry(0.09, 0.22, 5),
      "#e1bb66",
      head,
      0,
      -0.04,
      0.24,
    );
    beak.rotation.x = Math.PI / 2;
    for (const side of [-1, 1])
      orb(0.03, 0.035, 0.02, "#173e3a", head, side * 0.11, 0.05, 0.11, 6);
    cylinder(0.29, 0.29, 0.075, "#d9b352", head, 0, 0.39, 0, 24).rotation.x =
      Math.PI / 2;
    orb(0.2, 0.24, 0.18, "#c5a057", head, 0, -0.12, -0.06);
    box(0.12, 1.4, 0.08, "#d1b278", g, 0.4, 0.8, 0.1);
  } else if (opts.god === "osiris") {
    cylinder(0.13, 0.2, 0.35, "#eee6cb", head, 0, 0.35, 0, 9);
    for (const xx of [-0.2, 0.2]) {
      const f = orb(0.055, 0.26, 0.025, "#d1b87a", head, xx, 0.37, 0);
      f.rotation.z = -xx;
    }
  }
  g.userData = { root, torso, head, legs, arms, knees, elbows, god: opts.god };
  return g;
}
function animateCharacter(g, moving, t, dt) {
  const d = g.userData;
  if (!d.legs) return;
  const stride = moving ? Math.sin(t * 9) : 0;
  d.legs[0].rotation.x = stride * 0.55;
  d.legs[1].rotation.x = -stride * 0.55;
  d.knees[0].rotation.x = Math.max(0, -stride) * 0.5;
  d.knees[1].rotation.x = Math.max(0, stride) * 0.5;
  d.arms[1].rotation.x = moving ? -stride * 0.35 : Math.sin(t * 1.7) * 0.03;
  d.root.position.y = moving
    ? Math.abs(Math.sin(t * 9)) * 0.025
    : Math.sin(t * 1.8) * 0.008;
  if (g === player && seedAction > 0) {
    d.arms[1].rotation.x = -0.7 + Math.sin(t * 6) * 0.5;
    d.arms[1].rotation.z = -0.5;
    d.torso.rotation.x = 0.15;
  } else {
    d.arms[1].rotation.z = 0.09;
    d.torso.rotation.x = 0;
  }
}
function mergeStatic(g) {
  g.updateMatrixWorld(true);
  const batches = new Map();
  g.traverse((o) => {
    if (o.isMesh) {
      const geom = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      geom.applyMatrix4(o.matrixWorld);
      const key = o.material.uuid;
      if (!batches.has(key)) batches.set(key, { mat: o.material, geoms: [] });
      batches.get(key).geoms.push(geom);
    }
  });
  const out = new THREE.Group();
  for (const b of batches.values()) {
    const total = b.geoms.reduce(
        (n, gg) => n + gg.attributes.position.count,
        0,
      ),
      pos = new Float32Array(total * 3),
      normal = new Float32Array(total * 3),
      uv = new Float32Array(total * 2);
    let offset = 0;
    for (const gg of b.geoms) {
      const n = gg.attributes.position.count;
      pos.set(gg.attributes.position.array, offset * 3);
      if (gg.attributes.normal)
        normal.set(gg.attributes.normal.array, offset * 3);
      if (gg.attributes.uv) uv.set(gg.attributes.uv.array, offset * 2);
      offset += n;
      gg.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(geo, b.mat);
    m.castShadow = true;
    m.receiveShadow = true;
    out.add(m);
  }
  g.traverse((o) => {
    if (o.isMesh) o.geometry.dispose();
  });
  return out;
}
function disposeGroup(g) {
  if (!g) return;
  scene.remove(g);
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material?.userData?.transient) o.material.dispose();
  });
}
function initGraphics() {
  renderer = new THREE.WebGLRenderer({
    canvas: $("#world"),
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !state.settings.low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#b9d1c8");
  scene.fog = new THREE.Fog("#bacbb6", 47, 105);
  camera = new THREE.PerspectiveCamera(43, 1, 0.1, 180);
  cameraTarget = new THREE.Vector3(3, 0, 4);
  scene.add(new THREE.HemisphereLight("#fff1d0", "#677e70", 2.15));
  const sun = new THREE.DirectionalLight("#ffe1aa", 3.3);
  sun.position.set(-15, 28, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -32,
    right: 32,
    top: 32,
    bottom: -32,
    near: 1,
    far: 95,
  });
  sun.shadow.normalBias = 0.03;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 3;
  sun.target.position.set(3, 0, 0);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#abcbd7", 0.65);
  fill.position.set(20, 12, -20);
  scene.add(fill);
  linenMap = linenTexture();
  resizeGraphics();
  window.addEventListener("resize", resizeGraphics);
  $("#world").addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    persist();
    fatal(
      "The graphics context was interrupted. Export your saved progress, then reload.",
    );
  });
}
function resizeGraphics() {
  if (!renderer) return;
  const w = $("#app").clientWidth,
    h = $("#app").clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
function groundTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const x = cv.getContext("2d"),
    r = seeded(987);
  x.fillStyle = "#d4c09a";
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 7000; i++) {
    x.fillStyle = i % 3 ? "#b8a68018" : "#f7dfae28";
    x.fillRect(r() * 256, r() * 256, r() * 3 + 1, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(18, 18);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let groundMap;
function buildScene() {
  for (const g of [
    world,
    actors,
    cityGroup,
    effects,
    water,
    gridGroup,
    preview,
    plotOutline,
    navLine,
    beacon,
  ])
    disposeGroup(g);
  npcs = [];
  boats = [];
  carryVisual = null;
  cityPeople = [];
  obstacles = [];
  cityObstacles = [];
  labObjects = {};
  labKind = null;
  labStage = 0;
  $("#worldLabels").innerHTML = "";
  groundMap ||= groundTexture();
  const raw = new THREE.Group();
  world = raw;
  effects = new THREE.Group();
  actors = new THREE.Group();
  scene.add(effects, actors);
  const builder = state.mode === "builder",
    c = state.chapter;
  for (const [id, v] of Object.entries(SITES))
    v.name = c === "egypt" || builder ? EGYPT_NAMES[id] : v.role;
  const ground = shape(
    new THREE.PlaneGeometry(180, 180),
    material("#ffffff", { map: groundMap }),
    raw,
    0,
    -0.05,
    0,
  );
  ground.rotation.x = -Math.PI / 2;
  const r = seeded(7721);
  for (let i = 0; i < 110; i++) {
    const xx = -7 + r() * 32,
      zz = -28 + r() * 55;
    const patch = cylinder(
      1 + r() * 1.5,
      1 + r() * 1.5,
      0.015,
      i % 3 ? "#d0bd99" : "#d4c09b",
      raw,
      xx,
      -0.025,
      zz,
      7,
    );
    patch.scale.z = 0.5 + r() * 0.8;
  }
  // Living banks, wet silt and the river are separate from the desert.
  for (const side of [-1, 1]) {
    const bank = box(
      1.6,
      0.12,
      100,
      side === 1 ? "#89916a" : "#a4a57b",
      raw,
      -13 + side * 4,
      0.03,
      0,
    );
  }
  const wmat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader:
      "varying vec2 vUv;varying vec3 vP;uniform float time;void main(){vUv=uv;vec3 p=position;p.y+=sin(p.z*1.6+time)*.015+sin(p.x*3.+time*.6)*.008;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}",
    fragmentShader:
      "varying vec2 vUv;varying vec3 vP;uniform float time;void main(){float a=sin(vP.z*3.-time*1.5+sin(vP.x*4.))*sin(vP.x*8.+vP.z*.3-time*.4);float line=pow(max(a,0.),12.);float edge=pow(abs(vUv.x-.5)*2.,7.);vec3 col=mix(vec3(.16,.40,.40),vec3(.38,.59,.55),vUv.x*.4+edge*.35);col+=line*vec3(.17,.19,.16);float streak=pow(max(sin(vP.z*1.2-time+vP.x*5.),0.),24.);col+=streak*.045;gl_FragColor=vec4(col,1.);}",
    side: THREE.DoubleSide,
  });
  const wg = new THREE.PlaneGeometry(7.4, 115, 32, 180);
  wg.rotateX(-Math.PI / 2);
  water = shape(wg, wmat, scene, -13, 0.04, 0);
  water.castShadow = false;
  for (let i = 0; i < 45; i++) {
    const z = -40 + i * 1.8;
    reeds(raw, -8.4 + r() * 0.35, z, 0.65 + r() * 0.4);
    if (i % 3 === 0) reeds(raw, -17.5 - r() * 0.6, z, 0.8 + r() * 0.4);
  }
  for (let i = 0; i < 36; i++) {
    const x = i < 14 ? -20 - r() * 12 : 23 + r() * 18,
      z = -40 + r() * 85;
    palm(raw, x, z, 0.7 + r() * 0.6, r() * 0.4);
  }
  for (const [x, z, s] of [
    [-7, 4, 1.1],
    [-6, 14, 1],
    [-1, 15, 1.15],
    [18, 12, 1.1],
    [17, -4, 0.9],
    [-7, -9, 1],
  ])
    palm(raw, x, z, s, 0.3);
  // Low desert ridges provide depth without replacing the playable world with an image.
  for (let i = 0; i < 16; i++) {
    const hill = orb(
      5 + r() * 9,
      1 + r() * 3,
      4 + r() * 8,
      i % 2 ? "#c9b48a" : "#c3ac80",
      raw,
      -38 + i * 6,
      -1,
      -43 - r() * 12,
      8,
    );
    hill.rotation.y = r() * 3;
  }
  if (c === "egypt" || builder) {
    pyramid(raw, 26, -29, 1.8);
    pyramid(raw, 38, -37, 1.2);
    pyramid(raw, 16, -37, 0.85);
  } else if (c === "meso") {
    for (let i = 0; i < 5; i++)
      box(10 - i * 1.7, 1.0, 8 - i * 1.2, "#b4936b", raw, 15, i + 0.5, -25);
    box(2, 2, 2, "#bea178", raw, 15, 6, -25);
  } else if (c === "indus") {
    for (let i = 0; i < 4; i++) homeModel(raw, 18 + i * 3, -21, 1.5, i);
    box(8, 0.2, 5, "#a9876c", raw, 4, 0, -22);
    box(6, 0.12, 3, "#4c7b76", raw, 4, 0.15, -22);
  } else {
    for (let i = 0; i < 4; i++) {
      homeModel(raw, 18 + i * 3, -22, 1.4, i);
      const roof = shape(
        new THREE.ConeGeometry(1.8, 1, 4),
        "#7b6b50",
        raw,
        18 + i * 3,
        3,
        -22,
      );
      roof.rotation.y = Math.PI / 4;
    }
  }
  if (!builder) {
    const street = box(2, 0.035, 28, "#c7b58b", raw, 3, 0.005, 1);
    box(22, 0.035, 1.8, "#cbb98f", raw, 5, 0.01, 7);
    for (const [x, z, v] of [
      [16, 1, 0],
      [18, 7, 1],
      [8, 12, 2],
      [13, 12, 0],
      [17, -8, 1],
      [-4, 6, 2],
    ]) {
      homeModel(raw, x, z, 1, v);
      obstacles.push({ x, z, w: 1.05, d: 1.0 });
    }
    if (c === "egypt") temple(raw, 4, -12.5);
    else regionalLandmark(raw, c, 4, -12.5);
    obstacles.push({ x: 4, z: -14.5, w: 4.7, d: 2.6 });
    granaryModel(raw, 7, -1.8);
    obstacles.push({ x: 7, z: -1.8, w: 1.15, d: 0.8 });
    workshopModel(raw, 14, 4.6);
    obstacles.push({ x: 14, z: 4.6, w: 1.05, d: 0.9 });
    dockModel(raw, -7.4, 9, 1.2);
    box(1.5, 0.12, 2.5, "#bda47a", raw, -6.2, 0.08, 9);
    for (let i = 0; i < 3; i++) jar(raw, 9 + i * 0.5, 0.03, -8, 0.7);
    for (let i = 0; i < 2; i++) farmModel(raw, -5.3 + i * 2.25, -4.5, true);
    for (const id of Object.keys(SITES)) {
      if (c !== "egypt" && GOD_IDS.includes(id)) continue;
      const s = SITES[id];
      let g;
      if(GOD_IDS.includes(id)){
        g=deityModel(actors,godById(id));g.scale.setScalar(id==='apis'?1.35:1.45);
        cylinder(.65,.70,.12,godById(id).accent,actors,s.x,.03,s.z,24);
      }else{
        g=character(actors,{robe:id==='archive'?'#d6cfb2':id==='guide'?'#74928b':null,skin:id==='workshop'?'#a57853':'#b88a63'});
        const mergedActor=mergeStatic(g);actors.remove(g);g=mergedActor;actors.add(g);
      }
      g.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
      actorShadow(g);
      g.position.set(s.x, 0, s.z);
      g.rotation.y = Math.PI * 0.25;
      npcs.push({ id, g, base: g.position.clone() });
      const label = document.createElement("div");
      label.className = "label";
      label.id = "label-" + id;
      $("#worldLabels").appendChild(label);
    }
  } else {
    homeModel(raw, -4, 12, 1.2, 1);
    dockModel(raw, -7.2, 11, 1.2);
    workshopModel(raw, 17, 17);
    box(3, 0.04, 30, "#c5b78f", raw, 19, 0.0, 5);
  }
  // Bank bridge is scenery; crossing remains outside the settlement walking boundary.
  for (let i = 0; i < 16; i++)
    box(0.55, 0.18, 1.8, "#b69a6a", raw, -17 + i * 0.5, 0.08, 20);
  for (const xx of [-16, -10])
    for (const zz of [19.2, 20.8])
      cylinder(0.06, 0.08, 1.1, "#786344", raw, xx, 0.5, zz, 6);
  world = mergeStatic(raw);
  scene.add(world);
  for (let i = 0; i < 2; i++) {
    const b = boatModel(actors, -13 + (i ? 1 : -1), -12 + i * 27, 0.8);
    b.rotation.y = i ? Math.PI : 0;
    boats.push({ g: b, start: -12 + i * 27, sign: i ? 1 : -1 });
  }
  player = character(actors);
  player.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  actorShadow(player);
  const pos = state.positions[state.mode];
  player.position.set(pos.x, 0, pos.z);
  if (isBlocked(pos.x, pos.z)) player.position.set(3, 0, builder ? 12 : 8);
  player.rotation.y = 0.1;
  renderer.shadowMap.needsUpdate = true;
  buildCityVisuals();
  makeGrid();
  makeNavigation();
  buildLabVisual();
  cameraTarget.copy(player.position);
  updateGhost();
  applyGodOutfit(player,state.gods.equipped);
  buildGodDecorations();
}
function buildCityVisuals() {
  disposeGroup(cityGroup);
  for (const g of cityPeople) {
    actors.remove(g);
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
  cityPeople = [];
  cityObstacles = [];
  const raw = new THREE.Group();
  if (state.mode === "builder") {
    for (const b of state.city.buildings) {
      const x = GRID.x + b.col * GRID.size,
        z = GRID.z + b.row * GRID.size;
      buildingModel(raw, b.kind, x, z);
      cityObstacles.push({ x, z, w: 0.93, d: 0.93 });
    }
  }
  cityGroup = mergeStatic(raw);
  scene.add(cityGroup);
  renderer.shadowMap.needsUpdate = true;
  if (state.mode === "builder") {
    const count = Math.min(3, cityStats(state).residents);
    for (let i = 0; i < count; i++) {
      const g = character(actors, {
        robe: i === 1 ? "#baa578" : null,
        skin: i === 2 ? "#a97955" : "#b78055",
      });
      g.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
      actorShadow(g);
      g.userData.phase = i * 2.3;
      g.scale.setScalar(0.9);
      cityPeople.push(g);
    }
  }
}
function buildingModel(g, kind, x, z) {
  if (kind === "home") return homeModel(g, x, z, 0.95, ((x + z + 100) % 3) | 0);
  if (kind === "farm") return farmModel(g, x, z, state.city.season >= 2);
  if (kind === "granary") return granaryModel(g, x, z);
  if (kind === "workshop") return workshopModel(g, x, z);
  if (kind === "dock") return dockModel(g, x, z);
  if (kind === "shrine") return shrineModel(g, x, z);
  if (kind === "grove") {
    box(2, 0.1, 2, "#a5a679", g, x, 0.0, z);
    palm(g, x - 0.4, z - 0.4, 0.65, 0.2);
    palm(g, x + 0.45, z + 0.35, 0.6, -0.2);
  }
  if (kind === "pit") {
    box(2, 0.08, 2, "#af8262", g, x, 0.01, z);
    for (let i = 0; i < 5; i++) {
      orb(
        0.35,
        0.16 + i * 0.03,
        0.3,
        i % 2 ? "#bc8d65" : "#986e4c",
        g,
        x - 0.6 + i * 0.3,
        0.14,
        z + (i % 2) * 0.5 - 0.2,
        7,
      );
    }
    clothAwning(g, x, 1.25, z + 0.5, 1.5, 1, "#bda275");
  }
}
function makeGrid() {
  gridGroup = new THREE.Group();
  scene.add(gridGroup);
  if (state.mode !== "builder") return;
  const points = [],
    x0 = GRID.x - GRID.size / 2,
    z0 = GRID.z - GRID.size / 2;
  for (let i = 0; i <= GRID.cols; i++)
    points.push(
      x0 + i * GRID.size,
      0.055,
      z0,
      x0 + i * GRID.size,
      0.055,
      z0 + GRID.rows * GRID.size,
    );
  for (let i = 0; i <= GRID.rows; i++)
    points.push(
      x0,
      0.055,
      z0 + i * GRID.size,
      x0 + GRID.cols * GRID.size,
      0.055,
      z0 + i * GRID.size,
    );
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  gridGroup.add(
    new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: "#657c65",
        transparent: true,
        opacity: 0.48,
      }),
    ),
  );
  const floor = shape(
    new THREE.PlaneGeometry(GRID.cols * GRID.size, GRID.rows * GRID.size),
    material("#a7b58a", {
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    gridGroup,
    x0 + (GRID.cols * GRID.size) / 2,
    0.025,
    z0 + (GRID.rows * GRID.size) / 2,
  );
  floor.rotation.x = -Math.PI / 2;
}
function updateGhost() {
  disposeGroup(preview);
  disposeGroup(plotOutline);
  if (!scene || state.mode !== "builder") return;
  const x = GRID.x + selectedCol * GRID.size,
    z = GRID.z + selectedRow * GRID.size;
  const reason = buildReason(state, selectedBuilding, selectedCol, selectedRow);
  preview = new THREE.Group();
  scene.add(preview);
  if (
    !state.city.buildings.some(
      (b) => b.col === selectedCol && b.row === selectedRow,
    )
  ) {
    const raw = new THREE.Group();
    buildingModel(raw, selectedBuilding, x, z);
    preview.add(raw);
    preview.traverse((o) => {
      if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({
          color: reason ? "#d37b61" : "#e8d19b",
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          roughness: 1,
        });
        o.material.userData.transient = true;
        o.castShadow = false;
      }
    });
  }
  plotOutline = new THREE.Group();
  scene.add(plotOutline);
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 0.04, 2.3)),
    new THREE.LineBasicMaterial({ color: reason ? "#be5c41" : "#fff0ad" }),
  );
  line.position.set(x, 0.14, z);
  plotOutline.add(line);
}
function makeNavigation() {
  beacon = new THREE.Group();
  scene.add(beacon);
  const ring = shape(
    new THREE.TorusGeometry(0.36, 0.045, 6, 32),
    "#e5c473",
    beacon,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  const diamond = shape(
    new THREE.OctahedronGeometry(0.14),
    "#e8ca80",
    beacon,
    0,
    2.1,
    0,
  );
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  navLine = new THREE.Line(
    lineGeo,
    new THREE.LineDashedMaterial({
      color: "#f8df91",
      dashSize: 0.18,
      gapSize: 0.18,
      transparent: true,
      opacity: 0.7,
    }),
  );
  scene.add(navLine);
}
function buildLabVisual() {
  disposeGroup(effects);
  effects = new THREE.Group();
  scene.add(effects);
  labObjects = {};
  if (state.mode === "builder") return;
  const g = group(effects, -3.7, 0.06, -0.1);
  const base = box(3.4, 0.12, 2.2, "#806f4e", g, 0, 0, 0);
  if (state.chapter === "egypt") {
    labObjects.water = box(3.15, 0.06, 2, "#6caaa2", g, 0, 0.1, 0);
    labObjects.crops = new THREE.Group();
    g.add(labObjects.crops);
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 4; j++) {
        cylinder(
          0.015,
          0.02,
          0.35,
          "#bdad68",
          labObjects.crops,
          -1.3 + i * 0.6,
          0.28,
          -0.75 + j * 0.48,
          4,
        );
        orb(
          0.05,
          0.11,
          0.045,
          "#d5bb77",
          labObjects.crops,
          -1.3 + i * 0.6,
          0.5,
          -0.75 + j * 0.48,
          5,
        );
      }
    labObjects.harvest = new THREE.Group();
    g.add(labObjects.harvest);
    for (let i = 0; i < 4; i++)
      jar(labObjects.harvest, -1.1 + i * 0.7, 0.1, 0, 0.9, "#c2a56e");
  } else if (state.chapter === "indus") {
    labObjects.drains = [];
    for (let i = 0; i < 3; i++) {
      const part = group(g, -1 + i, 0.12, 0);
      box(0.85, 0.1, 0.3, "#a27655", part);
      box(0.85, 0.12, 0.07, "#c19c75", part, 0, 0.08, -0.18);
      box(0.85, 0.12, 0.07, "#c19c75", part, 0, 0.08, 0.18);
      labObjects.drains.push(part);
    }
    labObjects.water = box(3, 0.05, 0.22, "#67a9ad", g, 0, 0.25, 0);
  } else if (state.chapter === "meso") {
    for (let i = 0; i < 3; i++)
      jar(g, -1 + i, 0.1, 0, 0.8, ["#cba970", "#917251", "#be875d"][i]);
  } else {
    for (let i = 0; i < 3; i++)
      box(
        0.7,
        0.05,
        0.7,
        ["#dccda8", "#af9166", "#698d79"][i],
        g,
        -1 + i,
        0.1,
        0,
      );
  }
  updateLabVisual();
}
function updateLabVisual() {
  if (!labObjects.water && !labObjects.drains) return;
  if (state.chapter === "egypt") {
    const p = state.progress["egypt-2"];
    const stage = p?.practical ? 4 : (p?.workbench?.stage ?? labStage);
    labObjects.water.visible = stage === 0;
    labObjects.crops.visible = stage === 3;
    labObjects.harvest.visible = stage >= 4;
  }
  if (state.chapter === "indus") {
    labObjects.water.visible =
      !!state.progress["indus-5"]?.practical || labStage >= 3;
    if (labObjects.drains)
      labObjects.drains.forEach(
        (p, i) => (p.rotation.y = ((drainAngles?.[i] || 0) * Math.PI) / 2),
      );
  }
}
function isBlocked(x, z) {
  if (x < -7.6 || x > 22 || z < -17.7 || z > 22) return true;
  return [...obstacles, ...cityObstacles].some(
    (o) => Math.abs(x - o.x) < o.w + 0.17 && Math.abs(z - o.z) < o.d + 0.17,
  );
}
function syncCarryVisual() {
  if (!player) return;
  const q = currentQuest(),
    needed =
      state.mode === "journey" && questRecord(q).packed && !questRecord(q).done;
  if (carryVisual && (!needed || carryVisual.userData.id !== q.id)) {
    player.remove(carryVisual);
    carryVisual.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    carryVisual = null;
  }
  if (needed && !carryVisual) {
    carryVisual = group(player, 0, 0.95, 0.34);
    carryVisual.userData.id = q.id;
    if (["tablet", "record", "scroll"].includes(q.prop)) {
      box(0.34, 0.24, 0.07, "#b89b67", carryVisual);
      for (let i = 0; i < 3; i++)
        box(
          0.22,
          0.012,
          0.012,
          "#725d3d",
          carryVisual,
          0,
          -0.06 + i * 0.055,
          0.04,
        );
    } else {
      cylinder(0.18, 0.14, 0.24, "#bc9a61", carryVisual, 0, 0.02, 0, 10);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28;
        cylinder(
          0.013,
          0.018,
          0.28,
          "#dbc179",
          carryVisual,
          Math.cos(a) * 0.08,
          0.22,
          Math.sin(a) * 0.08,
          4,
        );
      }
    }
  }
}
function moveActor(dx, dz, dt, speed = 3.4) {
  const len = Math.hypot(dx, dz);
  if (!len) return false;
  const x = player.position.x + (dx / len) * dt * speed,
    z = player.position.z + (dz / len) * dt * speed;
  let moved = false;
  if (!isBlocked(x, player.position.z)) {
    player.position.x = x;
    moved = true;
  }
  if (!isBlocked(player.position.x, z)) {
    player.position.z = z;
    moved = true;
  }
  if (moved) player.rotation.y = Math.atan2(dx, dz);
  return moved;
}
function findPath(x, z) {
  const start = [Math.round(player.position.x), Math.round(player.position.z)],
    goal = [Math.round(x), Math.round(z)],
    queue = [start],
    seen = new Map([[start.join(","), null]]);
  let found = null;
  while (queue.length) {
    const a = queue.shift();
    if (Math.hypot(a[0] - goal[0], a[1] - goal[1]) < 1.5) {
      found = a;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const b = [a[0] + dx, a[1] + dz],
        k = b.join(",");
      if (seen.has(k) || isBlocked(...b)) continue;
      seen.set(k, a);
      queue.push(b);
    }
  }
  if (!found) return [];
  const path = [];
  let a = found;
  while (a) {
    path.unshift(new THREE.Vector3(a[0], 0, a[1]));
    a = seen.get(a.join(","));
  }
  path.shift();
  return path;
}
function pointFromEvent(e) {
  const r = $("#world").getBoundingClientRect(),
    v = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    ),
    ray = new THREE.Raycaster(),
    out = new THREE.Vector3();
  ray.setFromCamera(v, camera);
  return ray.ray.intersectPlane(new THREE.Plane(UP, 0), out) ? out : null;
}
function frameGraphics(dt, now) {
  if(godBattle){frameGodBattle(dt);return;}
  worldTime += dt;
  if (!renderer || !player) return;
  const reduced =
    state.settings.reduced ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  let moving = false;
  if (active && !dialogOpen) {
    let dx =
        (keys.d || keys.ArrowRight ? 1 : 0) -
        (keys.a || keys.ArrowLeft ? 1 : 0),
      dz =
        (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0);
    if (dx || dz) path = [];
    if (!dx && !dz && path.length) {
      const v = path[0].clone().sub(player.position);
      if (v.length() < 0.17) path.shift();
      else {
        dx = v.x;
        dz = v.z;
      }
    }
    if (dx || dz)
      moving = moveActor(dx, dz, dt, keys.Shift || running ? 5.4 : 3.4);
  }
  for (const g of cityPeople) {
    const a = (reduced ? 0 : worldTime) * 0.17 + g.userData.phase;
    g.position.set(6 + Math.sin(a) * 7, 0, 12 + Math.cos(a * 0.7) * 0.7);
    g.rotation.y = Math.cos(a) > 0 ? Math.PI / 2 : -Math.PI / 2;
    animateCharacter(
      g,
      !reduced,
      reduced ? 0 : worldTime + g.userData.phase,
      dt,
    );
  }
  if (seedAction > 0) seedAction -= dt;
  animateCharacter(player, moving, reduced ? 0 : worldTime, dt);
  if(godEmote>0&&!dialogOpen){godEmote-=dt;const i=GOD_IDS.indexOf(state.gods.equipped);const d=player.userData;d.arms[1].rotation.x=-1.5;d.arms[1].rotation.z=.35+Math.sin(godEmote*(4+(i+1)*.3))*.20;d.torso.rotation.y=Math.sin(godEmote*3)*.12;if(godEmote<=0)d.torso.rotation.y=0;}
  for (const n of npcs) {
    animateCharacter(n.g, false, reduced ? 0 : worldTime + n.g.position.x, dt);
    if (active && !dialogOpen && n.g.position.distanceTo(player.position) < 3)
      n.g.rotation.y = Math.atan2(
        player.position.x - n.g.position.x,
        player.position.z - n.g.position.z,
      );
  }
  if (!reduced) {
    water.material.uniforms.time.value = worldTime;
    for (const b of boats)
      b.g.position.z = b.start + Math.sin(worldTime * 0.025) * 15 * b.sign;
  }
  const target = labCamera
    ? new THREE.Vector3(-3.7, 0, 0)
    : active
      ? player.position
      : new THREE.Vector3(3, 0, -1);
  cameraTarget.lerp(target, reduced ? 1 : 1 - Math.exp(-dt * 4));
  const wide = camera.aspect < 0.7 ? 1.25 : 1;
  const distance = labCamera
    ? 17 * wide
    : active
      ? cameraDistance * wide
      : camera.aspect < 0.7
        ? 36
        : 37;
  const a = active ? cameraAngle : 0.57;
  const desired = new THREE.Vector3(
    cameraTarget.x + Math.sin(a) * distance,
    cameraTarget.y + distance * 0.77,
    cameraTarget.z + Math.cos(a) * distance,
  );
  camera.position.copy(desired);
  camera.lookAt(
    cameraTarget.x + (labCamera && camera.aspect < 0.7 ? 2.5 : 0),
    0,
    cameraTarget.z + (labCamera && camera.aspect < 0.7 ? 5 : -(active ? 1 : 3)),
  );
  const targetId = active && state.mode === "journey" ? objectiveSite() : null;
  if (beacon) {
    beacon.visible = !!targetId;
    if (targetId) {
      const s = SITES[targetId];
      beacon.position.set(s.x, 0, s.z);
      beacon.children[1].position.y =
        2.1 + (reduced ? 0 : Math.sin(worldTime * 2) * 0.08);
    }
  }
  if (navLine) {
    navLine.visible = active && path.length > 0;
    if (navLine.visible) {
      navLine.geometry.dispose();
      navLine.geometry = new THREE.BufferGeometry().setFromPoints([
        player.position.clone().setY(0.12),
        ...path.map((v) => v.clone().setY(0.12)),
      ]);
      navLine.computeLineDistances();
    }
  }
  if (active && state.mode === "journey" && !dialogOpen) {
    nearId = null;
    let nearest = 2.7;
    for (const n of npcs) {
      const d = n.g.position.distanceTo(player.position);
      if (d < nearest) {
        nearId = n.id;
        nearest = d;
      }
    }
    $("#interactBtn").disabled = !nearId;
    $("#interactBtn span").textContent = nearId
      ? "Meet " + SITES[nearId].name
      : "Approach a resident";
  } else if (state.mode === "builder") {
    $("#interactBtn").disabled = false;
    $("#interactBtn span").textContent = "Inspect selected plot";
  }
  for (const n of npcs) {
    const label = $("#label-" + n.id);
    if (!label) continue;
    const relevant =
      active && !dialogOpen && (n.id === nearId || n.id === targetId);
    label.hidden = !relevant;
    if (relevant) {
      const v = n.g.position
        .clone()
        .add(new THREE.Vector3(0, 2.0, 0))
        .project(camera);
      label.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px";
      label.style.top = (-v.y * 0.5 + 0.5) * innerHeight + "px";
      label.innerHTML =
        SITES[n.id].name +
        `<small>${n.id === targetId ? "Current destination" : SITES[n.id].role}</small>`;
      if (v.x < -0.95 || v.x > 0.95 || v.y < -0.7 || v.y > 0.7 || v.z > 1)
        label.hidden = true;
      if (!label.hidden) {
        const lr = label.getBoundingClientRect();
        const panels = [
          "#objective",
          "#brand",
          "#resources",
          "#builder",
          "#cameraTools",
          ".tools",
          "#interaction",
        ];
        if (
          panels.some((sel) => {
            const e = $(sel);
            if (!e || e.hidden) return false;
            const r = e.getBoundingClientRect();
            return (
              r.width &&
              r.height &&
              lr.left < r.right &&
              lr.right > r.left &&
              lr.top < r.bottom &&
              lr.bottom > r.top
            );
          })
        )
          label.hidden = true;
      }
    }
  }
  renderer.render(scene, camera);
}
