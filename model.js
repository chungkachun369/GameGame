/* Save and economy layer: browser-independent; all costs/yields are game rules. */
const SAVE_KEY = "river-chronicles-gods-v1";
const BUILDINGS = {
  home: {
    name: "Linen House",
    cost: { wood: 10, clay: 14 },
    desc: "Shelter for three residents. Residents use one grain each season.",
    capacity: 3,
  },
  farm: {
    name: "Basin Farm",
    cost: { wood: 8, clay: 4 },
    desc: "Produces 16 grain at harvest if watered after the flood.",
    yield: { grain: 16 },
  },
  grove: {
    name: "Palm Grove",
    cost: { wood: 10, grain: 4 },
    desc: "Produces 6 timber each season. A renewable building supply.",
    yield: { wood: 6 },
  },
  pit: {
    name: "Clay Yard",
    cost: { wood: 8, clay: 6 },
    desc: "Produces 6 clay each season.",
    yield: { clay: 6 },
  },
  granary: {
    name: "Granary",
    cost: { wood: 14, clay: 20 },
    desc: "Adds 80 storage to each resource. Stores the harvest safely.",
    storage: 80,
  },
  workshop: {
    name: "Workshop",
    cost: { wood: 18, clay: 16 },
    desc: "Turns 3 timber and 3 clay into 2 gems at harvest.",
    yield: { gems: 2 },
  },
  dock: {
    name: "River Landing",
    cost: { wood: 22, clay: 8 },
    desc: "Trade 10 surplus grain for 8 timber or 8 clay. Must touch the river side of the grid.",
  },
  shrine: {
    name: "Courtyard Shrine",
    cost: { wood: 12, clay: 24, gems: 15 },
    desc: "A gathering place. Adds one civic landmark; does not grant supernatural powers.",
  },
};
const GRID = { cols: 8, rows: 7, size: 2.4, x: -5.6, z: -5.6 };
function freshSave() {
  return {
    version: 6,
    gods: freshGods(),
    name: "Nile Farmer",
    mode: "journey",
    chapter: "egypt",
    started: false,
    positions: { journey: { x: 3, z: 10 }, builder: { x: 3, z: 12 } },
    progress: {},
    resources: { wood: 70, clay: 60, grain: 36, gems: 0 },
    city: { buildings: [], season: 0, year: 1, watered: [] },
    visitedGods: [],
    settings: { music: false, low: false, reduced: false },
    legacyArchive: null,
    created: new Date().toISOString(),
  };
}
function plainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function validPosition(p) {
  return (
    plainObject(p) &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    p.x >= -8 &&
    p.x <= 23 &&
    p.z >= -18 &&
    p.z <= 23
  );
}
function migrateSave(raw) {
  if (!plainObject(raw)) throw Error("The save must be a JSON object.");
  if (raw.version === 4) {
    if (
      !["meso", "egypt", "indus", "china"].includes(raw.chapter) ||
      typeof raw.name !== "string" ||
      raw.name.length > 20 ||
      !plainObject(raw.progress)
    )
      throw Error("Invalid v4 save.");
    const s = freshSave();
    s.name = raw.name;
    s.started = !!raw.started;
    s.chapter = raw.chapter;
    s.legacyArchive = JSON.parse(JSON.stringify(raw));
    let earned = 0;
    for (const [id, p] of Object.entries(raw.progress)) {
      if (
        !/^(meso|egypt|indus|china)-(10|[1-9])$/.test(id) ||
        !plainObject(p) ||
        typeof p.done !== "boolean" ||
        typeof p.learned !== "boolean" ||
        typeof p.accepted !== "boolean" ||
        typeof p.claimed !== "boolean" ||
        !Number.isInteger(p.phase) ||
        p.phase < 0 ||
        p.phase > 3 ||
        (p.claimed && !p.done) ||
        (p.done && !p.accepted) ||
        (p.accepted && !p.learned) ||
        typeof p.notes !== "string" ||
        p.notes.length > 700 ||
        !Array.isArray(p.evidence) ||
        !Array.isArray(p.log)
      )
        throw Error("Invalid v4 learning record. Nothing was imported.");
      s.progress[id] = {
        read: p.learned ? 3 : 0,
        accepted: p.accepted,
        observed: p.phase > 0 || p.done,
        practical: p.done,
        quiz: p.done,
        term: p.done,
        done: p.done,
        claimed: p.claimed,
        notes: p.notes,
        legacy: JSON.parse(JSON.stringify(p)),
      };
      if (p.claimed) earned += 25;
    }
    const prices = {
      "meso-farmer": 8,
      "clay-tablet": 6,
      "storage-jar": 5,
      "egypt-scribe": 8,
      "reed-pen": 5,
      papyrus: 6,
      "indus-cotton": 8,
      "bronze-tool": 10,
      "stone-weights": 6,
      "china-craft": 8,
      "black-pot": 6,
      "jade-disk": 10,
    };
    let spent = 0;
    if (raw.market !== undefined) {
      const m = raw.market;
      if (
        !plainObject(m) ||
        !Array.isArray(m.owned) ||
        new Set(m.owned).size !== m.owned.length ||
        m.owned.some((k) => !(k in prices)) ||
        ![0, 1, 2].includes(m.training)
      )
        throw Error("Invalid v4 purchases.");
      spent =
        m.owned.reduce((a, k) => a + prices[k], 0) +
        (m.training >= 1 ? 10 : 0) +
        (m.training === 2 ? 15 : 0);
      if (spent > earned) throw Error("v4 purchases exceed earned gems.");
    }
    s.resources.gems = earned - spent;
    return s;
  }
  if (![5, 6].includes(raw.version))
    throw Error(
      "Unsupported save version. Use a River Chronicles v4 or two-mode save.",
    );
  const s = freshSave();
  if (
    typeof raw.name !== "string" ||
    raw.name.length > 20 ||
    !["journey", "builder"].includes(raw.mode) ||
    !["meso", "egypt", "indus", "china"].includes(raw.chapter) ||
    typeof raw.started !== "boolean" ||
    !plainObject(raw.progress) ||
    !plainObject(raw.resources) ||
    !plainObject(raw.city) ||
    !Array.isArray(raw.city.buildings) ||
    raw.city.buildings.length > 56 ||
    !Number.isInteger(raw.city.season) ||
    raw.city.season < 0 ||
    raw.city.season > 3 ||
    !Number.isInteger(raw.city.year) ||
    raw.city.year < 1 ||
    raw.city.year > 100000
  )
    throw Error("Invalid game state.");
  for (const k of ["wood", "clay", "grain", "gems"])
    if (
      !Number.isSafeInteger(raw.resources[k]) ||
      raw.resources[k] < 0 ||
      raw.resources[k] > 1e7
    )
      throw Error("Invalid resource amount.");
  const cells = new Set();
  for (const b of raw.city.buildings) {
    if (
      !plainObject(b) ||
      !BUILDINGS[b.kind] ||
      !Number.isInteger(b.col) ||
      !Number.isInteger(b.row) ||
      b.col < 0 ||
      b.col >= GRID.cols ||
      b.row < 0 ||
      b.row >= GRID.rows ||
      cells.has(`${b.col},${b.row}`) ||
      (b.kind === "dock" && b.col !== 0)
    )
      throw Error("Invalid city plot.");
    cells.add(`${b.col},${b.row}`);
  }
  for (const [id, p] of Object.entries(raw.progress)) {
    if (
      !/^(meso|egypt|indus|china)-(10|[1-9])$/.test(id) ||
      !plainObject(p) ||
      !Number.isInteger(p.read) ||
      p.read < 0 ||
      p.read > 3 ||
      [
        "accepted",
        "observed",
        "practical",
        "quiz",
        "term",
        "done",
        "claimed",
      ].some((k) => typeof p[k] !== "boolean") ||
      (p.claimed && !p.done) ||
      (p.done && !p.accepted) ||
      typeof p.notes !== "string" ||
      p.notes.length > 5000
    )
      throw Error("Invalid learning progress.");
    if (p.workbench !== undefined) {
      const w = p.workbench;
      if (
        !plainObject(w) ||
        !Number.isInteger(w.stage) ||
        w.stage < 0 ||
        w.stage > 4 ||
        !Array.isArray(w.drains) ||
        w.drains.length !== 3 ||
        w.drains.some((v) => !Number.isInteger(v) || v < 0 || v > 3) ||
        !Array.isArray(w.sequence) ||
        w.sequence.length > 3 ||
        w.sequence.some((v, i) => v !== i) ||
        !plainObject(w.assignments) ||
        Object.keys(w.assignments).some(
          (k) => !["harvest", "net", "tablet"].includes(k),
        ) ||
        Object.values(w.assignments).some(
          (v) => !["", "Farmer", "Fisherman", "Scribe"].includes(v),
        ) ||
        !Number.isInteger(w.quizIndex) ||
        w.quizIndex < 0 ||
        w.quizIndex > 4
      )
        throw Error("Invalid workbench checkpoint.");
    }
  }
  if (
    !plainObject(raw.positions) ||
    !validPosition(raw.positions.journey) ||
    !validPosition(raw.positions.builder)
  )
    throw Error("Invalid player position.");
  if (
    !Array.isArray(raw.city.watered) ||
    raw.city.watered.some(
      (k) =>
        typeof k !== "string" ||
        !/^\d,\d$/.test(k) ||
        !raw.city.buildings.some(
          (b) => b.kind === "farm" && k === `${b.col},${b.row}`,
        ),
    )
  )
    throw Error("Invalid irrigation data.");
  if (
    !Array.isArray(raw.visitedGods) ||
    raw.visitedGods.some((k) => !GOD_IDS.includes(k))
  )
    throw Error("Invalid encounter record.");
  if (
    !plainObject(raw.settings) ||
    ["music", "low", "reduced"].some(
      (k) => typeof raw.settings[k] !== "boolean",
    )
  )
    throw Error("Invalid settings.");
  const gods = validateGods(raw.gods);
  return Object.assign(s, JSON.parse(JSON.stringify(raw)), {version:6, gods});
}
function record(s, qid) {
  return (
    s.progress[qid] ||
    (s.progress[qid] = {
      read: 0,
      accepted: false,
      observed: false,
      practical: false,
      quiz: false,
      term: false,
      done: false,
      claimed: false,
      notes: "",
    })
  );
}
function canAfford(s, cost) {
  return Object.entries(cost).every(([k, v]) => s.resources[k] >= v);
}
function buildReason(s, kind, col, row) {
  if (!BUILDINGS[kind]) return "Choose a building first.";
  if (
    !Number.isInteger(col) ||
    !Number.isInteger(row) ||
    col < 0 ||
    col >= GRID.cols ||
    row < 0 ||
    row >= GRID.rows
  )
    return "Choose a plot inside the settlement boundary.";
  if (s.city.buildings.some((b) => b.col === col && b.row === row))
    return "This plot is occupied. Inspect or remove its building.";
  if (kind === "dock" && col !== 0)
    return "River landings need a riverside plot: column 1.";
  if (!canAfford(s, BUILDINGS[kind].cost))
    return "Not enough resources. Complete commissions, produce supplies or choose a cheaper building.";
  return "";
}
function placeBuilding(s, kind, col, row) {
  const reason = buildReason(s, kind, col, row);
  if (reason) return { ok: false, message: reason };
  for (const [k, v] of Object.entries(BUILDINGS[kind].cost))
    s.resources[k] -= v;
  s.city.buildings.push({ kind, col, row });
  return { ok: true, message: BUILDINGS[kind].name + " built." };
}
function removeBuilding(s, col, row) {
  const i = s.city.buildings.findIndex((b) => b.col === col && b.row === row);
  if (i < 0)
    return { ok: false, message: "There is no building on this plot." };
  const b = s.city.buildings.splice(i, 1)[0],
    refund = {};
  for (const [k, v] of Object.entries(BUILDINGS[b.kind].cost)) {
    refund[k] = Math.floor(v / 2);
    s.resources[k] += refund[k];
  }
  s.city.watered = s.city.watered.filter((k) => k !== `${col},${row}`);
  return {
    ok: true,
    refund,
    message:
      BUILDINGS[b.kind].name + " removed. Half of its cost was recovered.",
  };
}
function cityStats(s) {
  return {
    residents: s.city.buildings.filter((b) => b.kind === "home").length * 3,
    storage:
      180 + s.city.buildings.filter((b) => b.kind === "granary").length * 80,
    farms: s.city.buildings.filter((b) => b.kind === "farm").length,
    landmarks: s.city.buildings.filter((b) => b.kind === "shrine").length,
  };
}
function advanceSeason(s) {
  s.city.season = (s.city.season + 1) % 4;
  if (s.city.season === 0) {
    s.city.year++;
    s.city.watered = [];
  }
  const delta = { wood: 0, clay: 0, grain: 0, gems: 0 };
  for (const b of s.city.buildings) {
    if (b.kind === "grove") delta.wood += 6;
    if (b.kind === "pit") delta.clay += 6;
    if (
      b.kind === "farm" &&
      s.city.season === 3 &&
      s.city.watered.includes(`${b.col},${b.row}`)
    )
      delta.grain += 16;
    if (
      b.kind === "workshop" &&
      s.city.season === 3 &&
      s.resources.wood + delta.wood >= 3 &&
      s.resources.clay + delta.clay >= 3
    ) {
      delta.wood -= 3;
      delta.clay -= 3;
      delta.gems += 2;
    }
  }
  const st = cityStats(s),
    food = s.resources.grain + delta.grain;
  delta.grain -= Math.min(food, st.residents);
  for (const [k, v] of Object.entries(delta))
    s.resources[k] = Math.min(
      k === "gems" ? 1e7 : st.storage,
      Math.max(0, s.resources[k] + v),
    );
  return { delta, shortage: food < st.residents, residents: st.residents };
}
function waterFarms(s) {
  if (![1, 2].includes(s.city.season)) return false;
  s.city.watered = s.city.buildings
    .filter((b) => b.kind === "farm")
    .map((b) => `${b.col},${b.row}`);
  return true;
}
function rewardCommission(s, id) {
  const p = record(s, id);
  if (!p.done || p.claimed) return false;
  p.claimed = true;
  s.resources.gems += 25;
  s.resources.wood += 12;
  s.resources.clay += 10;
  s.resources.grain += 8;
  return true;
}
function trade(s, target) {
  if (
    !["wood", "clay"].includes(target) ||
    !s.city.buildings.some((b) => b.kind === "dock") ||
    s.resources.grain < 10
  )
    return false;
  s.resources.grain -= 10;
  s.resources[target] += 8;
  return true;
}
const MODEL = {
  SAVE_KEY,
  BUILDINGS,
  GRID,
  freshSave,
  migrateSave,
  record,
  canAfford,
  buildReason,
  placeBuilding,
  removeBuilding,
  cityStats,
  advanceSeason,
  waterFarms,
  rewardCommission,
  trade,
};
