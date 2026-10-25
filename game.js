const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state = freshSave(),
  active = false,
  dialogOpen = false,
  nearId = null,
  path = [],
  running = false,
  selectedBuilding = "home",
  selectedCol = 2,
  selectedRow = 3,
  drainAngles = [1, 2, 1],
  labCamera = false;
let toastTimer,
  saveWarning = "",
  returnFocus = null,
  frameLast = 0,
  saveClock = 0,
  uiClock = 0,
  audioCtx,
  musicTimer;
const SEASONS = ["Flooding", "Water recedes", "Growing", "Harvest"];
const LAB_IDS = {
  meso: "meso-3",
  egypt: "egypt-2",
  indus: "indus-5",
  china: "china-6",
};
const ICON_PATHS = {
  rotateLeft: "M4 10a8 8 0 1 1 1 8M4 4v6h6",
  rotateRight: "M20 10a8 8 0 1 0-1 8m1-14v6h-6",
  menu: "M4 6h16M4 12h16M4 18h16",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16",
  book: "M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15",
  switch: "M4 7h15l-4-4m5 14H5l4 4M19 7l-4 4M5 17l4-4",
  help: "M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3m0 3v1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  wood: "m4 17 12-12 4 4L8 21Zm9-10 4 4M5 16l4 4",
  clay: "m4 19 3-8 5-5 5 5 3 8Zm3-8h10M7 19l5-13 5 13",
  grain: "M12 22V4m0 4L7 3m5 10L5 7m7 12L5 13m7-5 5-5m-5 10 7-6m-7 12 7-6",
  gems: "m12 3 9 9-9 9-9-9Zm0 0v18M3 12h18",
  home: "m2 11 10-8 10 8M5 9v12h14V9m-9 12v-8h4v8",
  farm: "M3 21h18M6 21V9m6 12V4m6 17V9M6 14l-3-3m3 7 3-3m3-6-3-3m3 8 3-3m3 3 3-3",
  grove:
    "M12 22V8m0 0C5 0 3 4 2 9c4-3 8-3 10-1Zm0 0c7-8 9-4 10 1-4-3-8-3-10-1Zm0 0c-5-1-8 3-8 7 3-3 6-5 8-7Zm0 0c5-1 8 3 8 7-3-3-6-5-8-7Z",
  pit: "M2 20h20M4 20l3-8h10l3 8M8 12V8h8v4M10 8V4h4v4",
  granary: "M5 21V9a7 7 0 0 1 14 0v12ZM5 9h14M9 21v-6h6v6",
  workshop: "M3 10h18L18 3H6Zm2 0v11m14-11v11M4 16h16M9 16v-5m6 5v-5",
  dock: "M2 16h20M5 16V9m7 7V9m7 7V9M3 21c3-3 6 3 9 0s6 3 9 0",
  shrine: "M2 8h20L12 2ZM4 21h16M6 21V8m6 13V8m6 13V8",
};
function icon(id) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[id] || ICON_PATHS.home}"/></svg>`;
}
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4200);
}
function downloadFile(name, data, type = "application/json") {
  const url = URL.createObjectURL(
    new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function persist() {
  if (player && active)
    state.positions[state.mode] = {
      x: player.position.x,
      z: player.position.z,
    };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    saveWarning = "";
    $("#saveStatus").textContent = "Progress saved on this device";
  } catch (e) {
    saveWarning = "Saving is unavailable. Export your progress from Menu.";
    $("#saveStatus").textContent = saveWarning;
  }
}
function fatal(msg) {
  $("#loading").hidden = true;
  $("#fatal").hidden = false;
  $("#fatalText").textContent = msg;
  $("#emergencyExport").onclick = () => {
    try {
      const data =
        localStorage.getItem(SAVE_KEY) ||
        localStorage.getItem("valley-four-civilisations-v4");
      downloadFile(
        "River-Chronicles-Recovery.json",
        data || JSON.stringify(state),
      );
    } catch (e) {
      downloadFile("River-Chronicles-Recovery.json", state);
    }
  };
}
function openDialog(html, wide = false) {
  returnFocus = document.activeElement;
  path = [];
  running = false;
  Object.keys(keys).forEach((k) => delete keys[k]);
  dialogOpen = true;
  $("#overlay").hidden = false;
  $("#dialog").className = wide ? "wide" : "";
  $("#dialogContent").innerHTML = html;
  $("#dialog").scrollTop = 0;
  $("#dialog").focus({ preventScroll: true });
  $$("[data-icon]").forEach((n) => (n.innerHTML = icon(n.dataset.icon)));
}
function closeDialog() {
  if(godBattle?.finished){endGodBattle();return;}
  dialogOpen = false;
  labCamera = false;
  $("#app").classList.remove("labOpen");
  $("#overlay").hidden = true;
  if (active) $("#world").focus({ preventScroll: true });
  else if (returnFocus?.isConnected) returnFocus.focus();
  persist();
}
function title() {
  if(godBattle)endGodBattle();
  if (active) persist();
  active = false;
  path = [];
  running = false;
  Object.keys(keys).forEach((k) => delete keys[k]);
  dialogOpen = false;
  labCamera = false;
  $("#app").classList.remove("labOpen");
  $("#overlay").hidden = true;
  $("#hud").hidden = true;
  $("#start").hidden = false;
  $("#journeyStartLabel").textContent = Object.values(state.progress).some(
    (p) => p.accepted,
  )
    ? "Continue journey →"
    : "Begin journey →";
  $("#builderStartLabel").textContent = state.city.buildings.length
    ? "Continue settlement →"
    : "Found a settlement →";
  $("#startProgress").textContent =
    Object.values(state.progress).filter((p) => p.done).length +
    " / 40 discoveries";
  $("#start [data-start]").focus({ preventScroll: true });
}
function enterMode(mode) {
  if(godBattle)endGodBattle();
  if (!["journey", "builder"].includes(mode)) return;
  persist();
  state.mode = mode;
  state.started = true;
  active = true;
  dialogOpen = false;
  labCamera = false;
  $("#app").classList.remove("labOpen");
  $("#overlay").hidden = true;
  $("#start").hidden = true;
  $("#hud").hidden = false;
  $("#builder").hidden = mode !== "builder";
  $("#app").classList.toggle("builderMode", mode === "builder");
  $("#app").classList.toggle("journeyMode", mode === "journey");
  path = [];
  buildScene();
  renderHUD();
  persist();
  $("#world").focus({ preventScroll: true });
  updateMusic();
  if (saveWarning) toast(saveWarning);
}
function chapter() {
  return CHAPTERS.find((c) => c.id === state.chapter);
}
function currentQuest() {
  return (
    chapter().quests.find((q) => !state.progress[q.id]?.done) ||
    chapter().quests[9]
  );
}
function questRecord(q = currentQuest()) {
  return record(state, q.id);
}
function objectiveSite() {
  const q = currentQuest(),
    p = questRecord(q);
  if (p.done) return "museum";
  return !p.accepted
    ? TEACH_SITES[q.mode]
    : !p.observed
      ? WORK_SITES[q.mode]
      : "museum";
}
function needPractical(q) {
  return LAB_IDS[state.chapter] === q.id;
}
function renderHUD() {
  syncCarryVisual();
  $("#modeLabel").textContent =
    state.mode === "builder" ? "CITY BUILDER" : chapter().name.toUpperCase();
  $("#resources").innerHTML = ["wood", "clay", "grain", "gems"]
    .map(
      (k) =>
        `<span title="${k === "wood" ? "Timber" : k[0].toUpperCase() + k.slice(1)}">${icon(k)}<b>${state.resources[k]}</b><span class="resourceName">${k === "wood" ? "timber" : k}</span></span>`,
    )
    .join("");
  if (state.mode === "journey") {
    const q = currentQuest(),
      p = questRecord(q),
      n = chapter().quests.filter((q) => state.progress[q.id]?.done).length;
    $("#objectiveKicker").textContent = chapter().name + " · " + n + "/10";
    $("#objectiveTitle").textContent = p.done
      ? "A river full of stories"
      : q.title;
    $("#objectiveText").textContent = p.done
      ? "Your chapter is complete. Revisit the journal or choose another civilisation."
      : !p.accepted
        ? "Meet " +
          SITES[TEACH_SITES[q.mode]].name +
          " and read three short lessons."
        : !p.observed
          ? "Explore with " + SITES[WORK_SITES[q.mode]].name + ". " + q.goal
          : "Take your evidence to Iset, the Story Keeper.";
    $("#trackBtn").textContent = "Follow the river path →";
  } else {
    const st = cityStats(state);
    $("#objectiveKicker").textContent =
      "YEAR " +
      state.city.year +
      " · " +
      SEASONS[state.city.season].toUpperCase();
    $("#objectiveTitle").textContent = state.city.buildings.length
      ? "A settlement of your own"
      : "Lay your first foundation";
    $("#objectiveText").textContent =
      "Choose a building, select a plot and confirm. Water farms after the flood; advance to harvest for grain.";
    $("#trackBtn").textContent = "Settlement overview →";
    renderBuilder();
  }
  $("#runBtn").setAttribute("aria-pressed", String(running));
  $("#runBtn").classList.toggle("selected", running);
}
function navigate(id) {
  const s = SITES[id];
  if (!s) return;
  path = findPath(s.x, s.z);
  if (
    !path.length &&
    player.position.distanceTo(new THREE.Vector3(s.x, 0, s.z)) > 2.7
  )
    toast("The route is blocked. Walk around the buildings and try again.");
  else toast("Following the path to " + s.name + ". Press E when you arrive.");
}
function interact(id = nearId) {
  if (!active || dialogOpen) return;
  if (state.mode === "builder") {
    inspectPlot();
    return;
  }
  if (!id) return;
  if (
    player.position.distanceTo(new THREE.Vector3(SITES[id].x, 0, SITES[id].z)) >
    2.8
  ) {
    navigate(id);
    return;
  }
  if (GOD_IDS.includes(id)) {
    godEncounter(id);
    return;
  }
  const q = currentQuest(),
    p = questRecord(q);
  if (p.done) {
    showJournal();
    return;
  }
  if (p.accepted && p.observed && id === "museum") {
    commissionQuiz(q);
    return;
  }
  if (p.accepted && id === WORK_SITES[q.mode]) {
    activity(q);
    return;
  }
  if (id === TEACH_SITES[q.mode]) {
    if (!p.accepted) lesson(q, Math.min(p.read, 2));
    else residentMenu(q, id);
    return;
  }
  if (p.accepted && id === WORK_SITES[q.mode]) {
    activity(q);
    return;
  }
  if (p.accepted && p.observed && id === "museum") {
    commissionQuiz(q);
    return;
  }
  residentMenu(q, id);
}
function residentMenu(q, id) {
  const p = questRecord(q);
  openDialog(
    `<div class="eyebrow">${esc(SITES[id].name)}</div><h2 id="dialogTitle">Life along the river</h2><p>${id === "museum" ? "Every good story needs evidence. Bring your observations here when you are ready." : id === "dock" ? "Boats connect fields, workshops and storehouses. The river is a route as well as a water supply." : id === "workshop" ? "Materials and skilled work turn everyday needs into useful things." : id === "archive" ? "A record helps people remember and compare. Always ask what the evidence can show." : "Our settlement depends on people doing different kinds of work."}</p><div class="callout"><b>Current discovery: ${esc(q.title)}</b><br>${esc(q.goal)}</div><div class="row"><button id="residentTrack" class="gold">Find my next destination</button><button id="residentReview">${p.accepted ? "Review lesson" : "Meet my guide"}</button></div>`,
  );
  $("#residentTrack").onclick = () => {
    closeDialog();
    navigate(objectiveSite());
  };
  $("#residentReview").onclick = () => {
    if (p.accepted) lesson(q, 0, true);
    else {
      closeDialog();
      navigate(TEACH_SITES[q.mode]);
    }
  };
}
function lesson(q, index = 0, review = false) {
  const p = questRecord(q);
  openDialog(
    `<div class="eyebrow">${esc(SITES[TEACH_SITES[q.mode]].name)} · RESIDENT LESSON</div><h2 id="dialogTitle">${esc(q.title)}</h2><div class="lessonDots">${[0, 1, 2].map((i) => `<i class="${i <= index ? "on" : ""}"></i>`).join("")}</div><p class="lesson">${esc(q.lesson[index])}</p><p class="infoLine">${index + 1} / 3 · ${["Understand the background", "Observe and explain", "Respect the limits of evidence"][index]}</p><div class="row">${index ? '<button id="lessonPrev">Previous</button>' : ""}<button class="gold" id="lessonNext">${index < 2 ? "Continue reading →" : review ? "Back to the river" : "Accept this commission →"}</button></div>`,
  );
  if ($("#lessonPrev"))
    $("#lessonPrev").onclick = () => lesson(q, index - 1, review);
  $("#lessonNext").onclick = () => {
    if (!review) {
      p.read = Math.max(p.read, index + 1);
      persist();
    }
    if (index < 2) lesson(q, index + 1, review);
    else {
      if (!review) p.accepted = true;
      closeDialog();
      renderHUD();
      if (!review) toast("Commission accepted. Follow your next destination.");
    }
  };
}
function activity(q) {
  if (needPractical(q) && !questRecord(q).practical) {
    openLab(q);
    return;
  }
  const p = questRecord(q);
  if (p.observed) {
    openDialog(
      `<div class="eyebrow">EVIDENCE COLLECTED</div><h2 id="dialogTitle">${esc(q.title)}</h2><p>${esc(q.lesson[1])}</p><div class="row"><button class="gold" id="goKeeper">Take evidence to the Story Keeper</button><button id="practiceAgain">Review the activity</button></div>`,
    );
    $("#goKeeper").onclick = () => {
      closeDialog();
      navigate("museum");
    };
    $("#practiceAgain").onclick = () => genericActivity(q);
    return;
  }
  genericActivity(q);
}
function genericActivity(q) {
  const p = questRecord(q);
  let choice = null;
  const arrange = ["sequence", "process"].includes(q.mode),
    isTransport = ["deliver", "route"].includes(q.mode);
  const options = arrange
    ? [
        "Observe starting conditions",
        "Organise tools and work",
        "Record and explain the result",
      ]
    : ["Material & use", "Place & function", "Evidence & limits"];
  openDialog(
    `<div class="eyebrow">${esc(SITES[WORK_SITES[q.mode]].name)} · PRACTICAL OBSERVATION</div><h2 id="dialogTitle">${esc(q.title)}</h2><p>${esc(q.goal)}</p><div class="callout">${esc(q.lesson[1])}</div><p>${arrange ? "Build a sensible work plan. Select the three steps in order." : isTransport ? "Inspect the supplies and take them to the Story Keeper. Select an observation to pack with them." : "Choose a lens for observing this evidence. Read its clue before recording your observation."}</p><div class="labSteps">${options.map((s, i) => `<button data-observe="${i}"><b>${i + 1}</b>${s}</button>`).join("")}</div><div id="observeFeedback" class="feedback" hidden></div><div class="row"><button id="recordObservation" class="gold" disabled>${isTransport ? "Pack supplies & evidence" : "Record observation"}</button><button id="observeLesson">Review lesson</button></div>`,
  );
  let sequence = [];
  $$("[data-observe]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.observe;
        if (arrange) {
          if (i !== sequence.length) {
            $("#observeFeedback").hidden = false;
            $("#observeFeedback").textContent =
              "Start by observing, then organise the work, then record the result.";
            return;
          }
          if (!sequence.includes(i)) sequence.push(i);
          b.classList.add("selected");
          b.disabled = true;
          choice = sequence.length === 3 ? 2 : null;
        } else {
          choice = i;
          $$("[data-observe]").forEach((n) =>
            n.classList.toggle("selected", n === b),
          );
        }
        $("#observeFeedback").hidden = false;
        $("#observeFeedback").textContent = q.lesson[Math.min(i, 2)];
        $("#recordObservation").disabled = choice === null;
      }),
  );
  $("#observeLesson").onclick = () => lesson(q, 0, true);
  $("#recordObservation").onclick = () => {
    p.observed = true;
    p.observation = q.lesson[choice || 0];
    p.packed = isTransport;
    seedAction = 2;
    closeDialog();
    renderHUD();
    toast(
      isTransport
        ? "Supplies packed. Take your evidence to the Story Keeper."
        : "Observation recorded. Bring it to the Story Keeper.",
    );
  };
}
function quizPanel(bank, onCorrect, options = {}) {
  let choice = -1;
  openDialog(
    `<div class="eyebrow">${options.kicker || "STORY KEEPER · ANSWER REQUIRED"}</div><h2 id="dialogTitle">${esc(options.title || "What does the evidence show?")}</h2><p>${esc(bank.prompt)}</p><div class="answerList">${bank.options.map((o, i) => `<button data-answer="${i}" aria-pressed="false"><b>${"ABCD"[i]}</b><span>${esc(o)}</span></button>`).join("")}</div><div class="feedback" id="answerFeedback" hidden role="status"></div><div class="row"><button class="gold" id="submitAnswer" disabled>Submit answer</button>${options.review ? '<button id="quizReview">Review lesson</button>' : ""}</div>`,
  );
  if (options.lab) {
    labCamera = true;
    $("#app").classList.add("labOpen");
  }
  $$("[data-answer]").forEach(
    (b) =>
      (b.onclick = () => {
        choice = +b.dataset.answer;
        $$("[data-answer]").forEach((n) => {
          n.classList.toggle("selected", n === b);
          n.setAttribute("aria-pressed", String(n === b));
        });
        $("#submitAnswer").disabled = false;
      }),
  );
  $("#submitAnswer").onclick = () => {
    if (choice < 0) return;
    const fb = $("#answerFeedback");
    fb.hidden = false;
    if (choice !== bank.answer) {
      fb.className = "feedback bad";
      fb.textContent = "Not quite. " + bank.explanation;
      return;
    }
    fb.className = "feedback good";
    fb.textContent = "Well observed. " + bank.explanation;
    $("#submitAnswer").textContent = "Continue →";
    $$("[data-answer]").forEach((b) => (b.disabled = true));
    $("#submitAnswer").onclick = onCorrect;
  };
  if (options.review) $("#quizReview").onclick = options.review;
}
function commissionQuiz(q) {
  const p = questRecord(q);
  if (!p.accepted || !p.observed) {
    toast("Collect the lesson and an observation first.");
    return;
  }
  if (p.quiz) {
    termOrFinish(q);
    return;
  }
  quizPanel(
    QUESTION_BANK[q.id],
    () => {
      p.quiz = true;
      persist();
      termOrFinish(q);
    },
    { title: q.title, review: () => lesson(q, 0, true) },
  );
}
function normalTerm(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[‐‑–—-]/g, " ")
    .replace(/\s+/g, " ");
}
function termOrFinish(q) {
  const p = questRecord(q),
    term = TERM_BANK[q.id];
  if (!term || p.term) {
    finishCommission(q);
    return;
  }
  openDialog(
    `<div class="eyebrow">ONE LAST TERM · ANSWER REQUIRED</div><h2 id="dialogTitle">Name the idea</h2><p>${esc(term.prompt)}</p><label for="termAnswer">English word or term</label><input type="text" id="termAnswer" autocomplete="off" maxlength="100"><div id="termFeedback" class="feedback" hidden role="status"></div><div class="row"><button id="checkTerm" class="gold">Check term</button><button id="termClue">Show a clue</button></div>`,
  );
  const check = () => {
    const v = normalTerm($("#termAnswer").value);
    $("#termFeedback").hidden = false;
    if (term.accepted.some((a) => normalTerm(a) === v)) {
      p.term = true;
      persist();
      finishCommission(q);
    } else {
      $("#termFeedback").className = "feedback bad";
      $("#termFeedback").textContent =
        "Not quite. Check the term and try again. " + term.hint;
    }
  };
  $("#checkTerm").onclick = check;
  $("#termAnswer").onkeydown = (e) => {
    if (e.key === "Enter") check();
  };
  $("#termClue").onclick = () => {
    $("#termFeedback").hidden = false;
    $("#termFeedback").textContent = term.hint;
  };
  $("#termAnswer").focus();
}
function finishCommission(q) {
  const p = questRecord(q);
  p.done = true;
  p.packed = false;
  persist();
  openDialog(
    `<div class="eyebrow">DISCOVERY ${q.num} / 10 · ${esc(chapter().name)}</div><h2 id="dialogTitle">${esc(q.title)}</h2><p>${esc(q.feedback)}</p><div class="reward">+25 gems</div><p>Plus 12 timber, 10 clay and 8 grain for your settlement.</p><div class="callout">Your discovery and notes stay in the journal. Your rewards are shared with City Builder.</div><div class="row"><button id="claimReward" class="gold">${p.claimed ? "Return to the river" : "Collect rewards →"}</button><button id="rewardBuilder">Visit City Builder</button></div>`,
  );
  $("#claimReward").onclick = () => {
    rewardCommission(state, q.id);
    closeDialog();
    renderHUD();
    chime();
    toast("Discovery saved. Your next commission is ready.");
  };
  $("#rewardBuilder").onclick = () => {
    rewardCommission(state, q.id);
    closeDialog();
    enterMode("builder");
  };
  renderHUD();
}
function saveLabCheckpoint(q, quizIndex = 0) {
  questRecord(q).workbench = {
    stage: labStage,
    drains: drainAngles.slice(),
    sequence: labSequence.slice(),
    assignments: { ...labAssignments },
    quizIndex,
  };
  persist();
}
function openLab(q) {
  labKind = state.chapter;
  const saved = questRecord(q).workbench;
  labStage = saved?.stage || 0;
  drainAngles = saved?.drains?.slice() || [1, 2, 1];
  labCamera = true;
  labSequence = saved?.sequence?.slice() || [];
  labAssignments = { ...(saved?.assignments || {}) };
  const complete = labStage >= (state.chapter === "egypt" ? 4 : 3);
  if (complete) labKnowledgeChecks(q, saved?.quizIndex || 0);
  else renderLab(q);
  updateLabVisual();
}
let labSequence = [],
  labAssignments = {};
function renderLab(q) {
  const kind = state.chapter;
  let body = "";
  if (kind === "egypt")
    body = `<p>Change the field in the world. Choose the next step of the farming cycle.</p><div class="labStatus">${["Flood", "Recede", "Sow & tend", "Harvest"].map((s, i) => `<span class="${i < labStage ? "done" : ""}">${s}</span>`).join("")}</div><div class="labSteps">${["Let the river flood", "Wait for water to recede", "Sow and tend the crops", "Harvest and store the grain"].map((s, i) => `<button data-lab-step="${i}" ${i < labStage ? "disabled" : ""}><b>${i < labStage ? "✓" : i + 1}</b>${s}</button>`).join("")}</div>`;
  if (kind === "meso")
    body = `<p>Give each object to the worker who uses it. Use the resident’s clues to make each match.</p><div class="matchRows">${[
      ["harvest", "Harvest"],
      ["net", "Fishing net"],
      ["tablet", "Clay tablet"],
    ]
      .map(
        ([id, n]) =>
          `<label>${n}<select data-job="${id}" aria-label="Worker for ${n}"><option value="">Choose a worker</option>${["Farmer", "Fisherman", "Scribe"].map((r) => `<option>${r}</option>`).join("")}</select></label>`,
      )
      .join(
        "",
      )}</div><div class="row"><button id="testJobs" class="gold">Deliver the objects</button></div>`;
  if (kind === "indus")
    body = `<p>Rotate each drain until all three channels connect the house to the street. Then test the water.</p><div class="drains">${drainAngles.map((a, i) => `<button class="drain" data-drain="${i}" aria-label="Rotate drain segment ${i + 1}"><svg style="transform:rotate(${a * 90}deg)" viewBox="0 0 70 70"><path d="M0 24H70M0 46H70" stroke="#e6d0a1" fill="none" stroke-width="7"/><path d="M0 35H70" stroke="#70b0b5" stroke-width="9"/></svg></button>`).join("")}</div><div class="row"><button id="testDrains" class="gold">Test water flow</button></div>`;
  if (kind === "china")
    body = `<p>Arrange the simplified record-making process. These model marks are not a translation tool.</p><div class="labStatus">${labSequence.map((s) => `<span class="done">${s + 1}</span>`).join("") || "<span>Choose the first step</span>"}</div><div class="labSteps">${[
      [2, "Carve a record of the event"],
      [0, "Prepare the bone or shell"],
      [1, "Heat it and interpret the cracks"],
    ]
      .map(
        ([i, s]) =>
          `<button data-oracle="${i}" ${labSequence.includes(i) ? "disabled" : ""}><b>${labSequence.includes(i) ? "✓" : "·"}</b>${s}</button>`,
      )
      .join("")}</div>`;
  openDialog(
    `<div class="eyebrow">HANDS-ON WORKBENCH</div><h2 id="dialogTitle">${kind === "egypt" ? "Work with the river" : kind === "meso" ? "A city of many jobs" : kind === "indus" ? "Connect the water route" : "From material to record"}</h2><div id="labOverlayHint">The model is changing in the 3D world.</div>${body}<div id="labFeedback" class="feedback" hidden role="status"></div><div class="row"><button id="labReview">Review lesson</button><button id="labExit">Return to the world</button></div>`,
  );
  labCamera = true;
  $("#app").classList.add("labOpen");
  $("#labReview").onclick = () => {
    labCamera = false;
    $("#app").classList.remove("labOpen");
    lesson(q, 0, true);
  };
  $("#labExit").onclick = closeDialog;
  if (kind === "egypt")
    $$("[data-lab-step]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.labStep;
          if (i !== labStage) {
            labFeedback(
              "Follow the river cycle: flooding, receding water, sowing and tending, then harvest.",
            );
            return;
          }
          labStage++;
          seedAction = 3;
          saveLabCheckpoint(q);
          updateLabVisual();
          if (labStage === 4) {
            labKnowledgeChecks(q);
          } else {
            renderLab(q);
            updateLabVisual();
          }
        }),
    );
  if (kind === "meso") {
    $$("[data-job]").forEach(
      (s) => (s.value = labAssignments[s.dataset.job] || ""),
    );
    $$("[data-job]").forEach(
      (s) =>
        (s.onchange = () => {
          labAssignments[s.dataset.job] = s.value;
          saveLabCheckpoint(q);
        }),
    );
    $("#testJobs").onclick = () => {
      if (
        labAssignments.harvest === "Farmer" &&
        labAssignments.net === "Fisherman" &&
        labAssignments.tablet === "Scribe"
      ) {
        labStage = 3;
        saveLabCheckpoint(q);
        labKnowledgeChecks(q);
      } else
        labFeedback(
          "A harvest comes from farming, a net catches fish and a clay tablet holds written records. Check each worker.",
        );
    };
  }
  if (kind === "indus") {
    $$("[data-drain]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.drain;
          drainAngles[i] = (drainAngles[i] + 1) % 4;
          saveLabCheckpoint(q);
          renderLab(q);
          updateLabVisual();
        }),
    );
    $("#testDrains").onclick = () => {
      if (drainAngles.every((a) => a % 2 === 0)) {
        labStage = 3;
        saveLabCheckpoint(q);
        updateLabVisual();
        labKnowledgeChecks(q);
      } else
        labFeedback(
          "Water needs one continuous outward channel. Turn the disconnected sections.",
        );
    };
  }
  if (kind === "china")
    $$("[data-oracle]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.oracle;
          if (i !== labSequence.length) {
            labFeedback(
              "Prepare the material first, then heat and interpret the cracks, then carve a record.",
            );
            return;
          }
          labSequence.push(i);
          labStage++;
          saveLabCheckpoint(q);
          if (labSequence.length === 3) labKnowledgeChecks(q);
          else renderLab(q);
        }),
    );
}
function labFeedback(msg) {
  $("#labFeedback").hidden = false;
  $("#labFeedback").textContent = msg;
}
function labKnowledgeChecks(q, index = 0) {
  const banks = Object.entries(WORLD_BANK).filter(([k]) =>
    k.startsWith(state.chapter),
  );
  const bank =
    index < banks.length ? banks[index][1] : PRACTICAL_BANK[state.chapter];
  if (!bank) {
    completeLab(q);
    return;
  }
  quizPanel(
    bank,
    () => {
      saveLabCheckpoint(q, index + 1);
      if (index < banks.length) labKnowledgeChecks(q, index + 1);
      else completeLab(q);
    },
    {
      title:
        index < banks.length
          ? "Read the world you changed"
          : "Explain the result",
      kicker: "PRACTICAL WORKBENCH · ANSWER REQUIRED",
      lab: true,
    },
  );
}
function completeLab(q) {
  const p = questRecord(q);
  p.practical = true;
  p.observed = true;
  updateLabVisual();
  persist();
  openDialog(
    `<div class="eyebrow">PRACTICAL COMPLETE</div><h2 id="dialogTitle">Knowledge changed the world</h2><p>${esc(PRACTICAL_BANK[state.chapter].explanation)}</p><div class="row"><button id="labDone" class="gold">Return to the river</button></div>`,
  );
  $("#labDone").onclick = () => {
    closeDialog();
    renderHUD();
    toast(
      "Practical evidence collected. Meet the Story Keeper to complete your commission.",
    );
  };
}
function godEncounter(id) { godIntro(id); }
function showJournal(tab = "discoveries") {
  const total = Object.values(state.progress).filter((p) => p.done).length;
  openDialog(
    `<div class="eyebrow">YOUR RIVER JOURNAL · ${total}/40 DISCOVERIES</div><h2 id="dialogTitle">Stories worth keeping</h2><div class="tabs"><button id="journalDiscoveries" class="${tab === "discoveries" ? "selected" : ""}">Discoveries</button><button id="journalBeliefs" class="${tab === "beliefs" ? "selected" : ""}">Gods Collection</button><button id="journalChapters" class="${tab === "chapters" ? "selected" : ""}">Civilisations</button></div><div id="journalBody"></div>`,
    true,
  );
  $("#journalDiscoveries").onclick = () => showJournal();
  $("#journalBeliefs").onclick = () => showJournal("beliefs");
  $("#journalChapters").onclick = () => showJournal("chapters");
  if (tab === "discoveries") {
    $("#journalBody").innerHTML =
      `<p>${esc(chapter().intro)}</p><div class="cards">${chapter()
        .quests.map((q) => {
          const p = state.progress[q.id],
            available =
              q.num === 1 ||
              state.progress[chapter().quests[q.num - 2].id]?.done;
          return `<button class="card" data-journal-q="${q.id}" ${available || p?.done ? "" : "disabled"}><b>${String(q.num).padStart(2, "0")} · ${p?.done ? "DISCOVERED" : p?.accepted ? "IN PROGRESS" : available ? "READY" : "LATER"}</b><h3>${esc(q.title)}</h3><p>${esc(q.goal)}</p>${p?.done ? '<span class="badge">Read · observed · explained</span>' : ""}</button>`;
        })
        .join("")}</div>`;
    $$("[data-journal-q]").forEach(
      (b) => (b.onclick = () => journalEntry(b.dataset.journalQ)),
    );
  }
  if (tab === "beliefs") {
    showGodCollection();return;
    $("#journalBody").innerHTML = state.visitedGods.length
      ? state.visitedGods
          .map(
            (id) =>
              `<div class="card"><h3>${id === "ra" ? "Ra · Sun god" : "Osiris · Afterlife beliefs"}</h3><p>${id === "ra" ? "A religious explanation of the sun’s place in the world. Observations and beliefs are different kinds of evidence." : "Afterlife beliefs help explain body preservation and burial practices. They do not establish supernatural claims as scientific facts."}</p></div>`,
          )
          .join("<br>")
      : "<p>Visit the two figures in the Nile temple courtyard to collect their stories.</p>";
  }
  if (tab === "chapters") {
    $("#journalBody").innerHTML =
      `<p>Egypt is your starting point. Follow another river whenever you are ready; your discoveries remain saved.</p><div class="cards">${CHAPTERS.map((c) => `<button class="card" data-select-chapter="${c.id}"><b>${c.quests.filter((q) => state.progress[q.id]?.done).length} / 10 DISCOVERIES</b><h3>${esc(c.name)}</h3><p>${esc(c.intro)}</p></button>`).join("")}</div>`;
    $$("[data-select-chapter]").forEach(
      (b) =>
        (b.onclick = () => {
          persist();
          state.chapter = b.dataset.selectChapter;
          state.positions.journey = { x: 3, z: 10 };
          active = false;
          closeDialog();
          enterMode("journey");
          toast(chapter().name + " is ready to explore.");
        }),
    );
  }
}
function journalEntry(id) {
  const q = CHAPTERS.flatMap((c) => c.quests).find((q) => q.id === id),
    p = record(state, id);
  openDialog(
    `<div class="eyebrow">DISCOVERY ${q.num} · ${p.done ? "COMPLETE" : "IN PROGRESS"}</div><h2 id="dialogTitle">${esc(q.title)}</h2>${q.lesson.map((t) => `<p>${esc(t)}</p>`).join("")}<label for="journalNote">Your notes</label><textarea id="journalNote" maxlength="5000" placeholder="Keep an observation or a question…">${esc(p.notes)}</textarea><div class="row"><button id="saveNote" class="gold">Save note</button>${p.done && !p.claimed ? '<button id="journalClaim">Collect unclaimed reward</button>' : ""}<button id="backJournal">Back to journal</button></div>`,
  );
  $("#saveNote").onclick = () => {
    p.notes = $("#journalNote").value;
    persist();
    toast("Journal note saved.");
  };
  $("#backJournal").onclick = () => {
    p.notes = $("#journalNote").value;
    persist();
    showJournal();
  };
  if ($("#journalClaim"))
    $("#journalClaim").onclick = () => {
      rewardCommission(state, id);
      persist();
      renderHUD();
      journalEntry(id);
      toast("Reward collected once.");
    };
}
function showMap() {
  openDialog(
    `<div class="eyebrow">RIVER WAYFINDER</div><h2 id="dialogTitle">${state.mode === "builder" ? "Your Nile settlement" : esc(chapter().name)}</h2><canvas id="mapCanvas" class="mapCanvas" width="760" height="570" role="img" aria-label="Map of the playable riverbank. Blue is your position and gold is the destination."></canvas><div class="mapLegend"><span>Blue · You</span><span>Gold · Destination</span><span>Squares · Buildings</span></div><div class="tabs" id="mapDestinations"></div><p class="disclosure">A wayfinder for this game world, not a geographical map or a reconstruction of one ancient city.</p>`,
    true,
  );
  drawMap();
  if (state.mode === "journey") {
    $("#mapDestinations").innerHTML = Object.entries(SITES)
      .filter(
        ([k]) => state.chapter === "egypt" || !GOD_IDS.includes(k),
      )
      .map(([k, s]) => `<button data-map-go="${k}">${esc(s.name)}</button>`)
      .join("");
    $$("[data-map-go]").forEach(
      (b) =>
        (b.onclick = () => {
          closeDialog();
          navigate(b.dataset.mapGo);
        }),
    );
  } else {
    $("#mapDestinations").innerHTML =
      '<button id="mapCityFocus">Return to settlement</button>';
    $("#mapCityFocus").onclick = () => {
      closeDialog();
      cameraDistance = 27;
    };
  }
}
function drawMap() {
  const cv = $("#mapCanvas"),
    x = cv.getContext("2d");
  const px = (v) => ((v + 19) / 47) * 760,
    pz = (v) => ((v + 20) / 46) * 570;
  x.fillStyle = "#d8c6a0";
  x.fillRect(0, 0, 760, 570);
  x.fillStyle = "#79977e";
  x.fillRect(px(-9), 0, px(-7) - px(-9), 570);
  x.fillStyle = "#477e7e";
  x.fillRect(px(-17), 0, px(-9) - px(-17), 570);
  x.strokeStyle = "#e8d7b0";
  x.lineWidth = 16;
  x.beginPath();
  x.moveTo(px(3), pz(-16));
  x.lineTo(px(3), pz(20));
  x.moveTo(px(-7), pz(7));
  x.lineTo(px(21), pz(7));
  x.stroke();
  x.fillStyle = "#ab8f68";
  for (const o of [...obstacles, ...cityObstacles])
    x.fillRect(
      px(o.x - o.w),
      pz(o.z - o.d),
      ((o.w * 2) / 47) * 760,
      ((o.d * 2) / 46) * 570,
    );
  if (state.mode === "journey") {
    for (const [id, s] of Object.entries(SITES)) {
      if (state.chapter !== "egypt" && GOD_IDS.includes(id)) continue;
      x.fillStyle = id === objectiveSite() ? "#a87226" : "#365b4c";
      x.beginPath();
      x.arc(px(s.x), pz(s.z), id === objectiveSite() ? 8 : 5, 0, Math.PI * 2);
      x.fill();
      x.font = "12px Arial";
      x.fillStyle = "#233e34";
      x.fillText(s.role, px(s.x) + 10, pz(s.z) + 4);
    }
  } else {
    for (let col = 0; col < GRID.cols; col++)
      for (let row = 0; row < GRID.rows; row++) {
        x.strokeStyle = "#7c8f6a";
        x.lineWidth = 1;
        x.strokeRect(
          px(GRID.x + col * GRID.size - GRID.size / 2),
          pz(GRID.z + row * GRID.size - GRID.size / 2),
          (GRID.size / 47) * 760,
          (GRID.size / 46) * 570,
        );
      }
  }
  x.fillStyle = "#8ed8f3";
  x.strokeStyle = "#fff";
  x.lineWidth = 3;
  x.beginPath();
  x.arc(px(player.position.x), pz(player.position.z), 7, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.font = "16px Georgia";
  x.fillStyle = "#f4e6c5";
  x.save();
  x.translate(px(-13), pz(-4));
  x.rotate(-Math.PI / 2);
  x.fillText("RIVER", 0, 0);
  x.restore();
}
function renderBuilder() {
  const st = cityStats(state);
  $("#cityInfo").textContent =
    `${state.city.buildings.length} buildings · ${st.residents} residents · ${st.storage} storage / resource · ${st.landmarks} landmarks`;
  $("#seasonBtn").textContent = `${SEASONS[state.city.season]} → Next season`;
  $("#buildCatalog").innerHTML = Object.entries(BUILDINGS)
    .map(
      ([k, b]) =>
        `<button data-build="${k}" class="${selectedBuilding === k ? "selected" : ""}" aria-pressed="${selectedBuilding === k}">${icon(k)}<span>${esc(b.name)}<small>${Object.entries(
          b.cost,
        )
          .map(([r, n]) => n + " " + (r === "wood" ? "timber" : r))
          .join(" · ")}</small></span></button>`,
    )
    .join("");
  $$("[data-build]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedBuilding = b.dataset.build;
        renderBuilder();
        updateGhost();
      }),
  );
  $("#buildDescription").textContent =
    BUILDINGS[selectedBuilding].desc +
    " " +
    (buildReason(state, selectedBuilding, selectedCol, selectedRow) || "");
  $("#plotCol").value = selectedCol;
  $("#plotRow").value = selectedRow;
  $("#placeBtn").disabled = !!buildReason(
    state,
    selectedBuilding,
    selectedCol,
    selectedRow,
  );
  $("#irrigateBtn").disabled = ![1, 2].includes(state.city.season) || !st.farms;
}
function selectPlot(col, row) {
  if (col < 0 || row < 0 || col >= GRID.cols || row >= GRID.rows) return;
  selectedCol = col;
  selectedRow = row;
  renderBuilder();
  updateGhost();
}
function placeSelected() {
  const result = placeBuilding(
    state,
    selectedBuilding,
    selectedCol,
    selectedRow,
  );
  if (result.ok) {
    if (
      isBlocked(player.position.x, player.position.z) ||
      Math.hypot(
        player.position.x - (GRID.x + selectedCol * GRID.size),
        player.position.z - (GRID.z + selectedRow * GRID.size),
      ) < 1.6
    )
      player.position.set(3, 0, 12);
    buildCityVisuals();
    persist();
    renderHUD();
    updateGhost();
    chime();
  }
  toast(result.message);
}
function inspectPlot() {
  const b = state.city.buildings.find(
    (b) => b.col === selectedCol && b.row === selectedRow,
  );
  if (!b) {
    toast(
      `Plot ${selectedCol + 1}, ${selectedRow + 1} is empty. Choose a building and press Place building.`,
    );
    return;
  }
  const d = BUILDINGS[b.kind];
  openDialog(
    `<div class="eyebrow">PLOT ${b.col + 1} · ${b.row + 1}</div><h2 id="dialogTitle">${d.name}</h2><p>${d.desc}</p>${b.kind === "farm" ? `<div class="callout">${state.city.watered.includes(`${b.col},${b.row}`) ? "Watered for this harvest." : "Not watered this year. Irrigate after the flood or during growing."}</div>` : ""}<p>Removing this building returns half of its original cost. No learning progress is affected.</p><div class="row"><button id="removeBuilding" class="danger">Remove building</button><button id="keepBuilding" class="gold">Keep building</button></div>${b.kind === "dock" ? '<h3>River trade</h3><p>Trade 10 grain for 8 timber or 8 clay.</p><div class="row"><button id="tradeWood">Trade for timber</button><button id="tradeClay">Trade for clay</button></div>' : ""}`,
  );
  $("#keepBuilding").onclick = closeDialog;
  $("#removeBuilding").onclick = () => {
    const result = removeBuilding(state, b.col, b.row);
    closeDialog();
    buildCityVisuals();
    renderHUD();
    updateGhost();
    persist();
    toast(result.message);
  };
  for (const [id, k] of [
    ["tradeWood", "wood"],
    ["tradeClay", "clay"],
  ])
    if ($("#" + id))
      $("#" + id).onclick = () => {
        if (trade(state, k)) {
          persist();
          renderHUD();
          toast(
            "Trade complete: +8 " +
              (k === "wood" ? "timber" : k) +
              ", −10 grain.",
          );
        } else toast("You need 10 grain to make this trade.");
      };
}
function nextSeason() {
  const report = advanceSeason(state);
  buildCityVisuals();
  updateGhost();
  persist();
  renderHUD();
  const diff = Object.entries(report.delta)
    .filter(([, v]) => v)
    .map(
      ([k, v]) => (v > 0 ? "+" : "") + v + " " + (k === "wood" ? "timber" : k),
    )
    .join(" · ");
  toast(
    `${SEASONS[state.city.season]} · Year ${state.city.year}. ${diff || "Build groves and clay yards to produce supplies."}${report.shortage ? " Food is short. Residents stay, but plan more farms or earn commission supplies." : ""}`,
  );
}
function help() {
  openDialog(
    `<div class="eyebrow">TRAVELLER'S GUIDE</div><h2 id="dialogTitle">Find your way along the river</h2><dl class="keys"><dt>W A S D / arrows</dt><dd>Walk around buildings. On touchscreens, use the direction pad.</dd><dt>Shift / Run</dt><dd>Move faster. No stamina or countdown.</dd><dt>E / interaction button</dt><dd>Talk to a nearby resident, or inspect a builder plot.</dd><dt>Click / tap the ground</dt><dd>Walk there in Guided Journey. Select a construction plot in City Builder.</dd><dt>M / J / Esc</dt><dd>Map, journal and menu. Esc closes a dialog.</dd><dt>↶ ↷ / + −</dt><dd>Rotate and zoom the camera. The mouse wheel also zooms.</dd></dl><h3>Guided Journey</h3><p>Follow the gold marker. Read all three lesson sections, accept a commission, observe or operate the workbench, then explain your evidence to the Story Keeper. A correct answer does not automatically skip the separate submission action. Collect your reward after finishing.</p><h3>City Builder</h3><p>Choose from eight buildings, tap an empty plot or use the Column and Row controls, then press Place building. The ghost is only a preview. Riversides are column 1. Water farms after the flood, then advance through growing to harvest. Groves and clay yards produce every season. Houses add residents who use grain. Granaries add storage. Inspect a river landing to trade grain for materials.</p><div class="callout">All costs, production amounts and season steps are game rules. They are not historical statistics. Historical beliefs are presented as beliefs.</div><div class="row"><button id="helpClose" class="gold">Ready to explore</button></div>`,
  );
  $("#helpClose").onclick = closeDialog;
}
function menu() {
  openDialog(
    `<div class="eyebrow">RIVER CHRONICLES</div><h2 id="dialogTitle">Pause by the river</h2><label for="playerName">Traveller name</label><input id="playerName" type="text" maxlength="20" value="${esc(state.name)}"><div class="setting"><label for="musicToggle">Original ambient music</label><input type="checkbox" id="musicToggle" ${state.settings.music ? "checked" : ""}></div><div class="setting"><label for="qualityToggle">Low-power graphics (no shadows)</label><input type="checkbox" id="qualityToggle" ${state.settings.low ? "checked" : ""}></div><div class="setting"><label for="motionToggle">Reduced motion</label><input type="checkbox" id="motionToggle" ${state.settings.reduced ? "checked" : ""}></div><div class="row"><button id="menuExport" class="gold">Export save</button><button id="menuImport">Import save</button></div><div class="row"><button id="menuModes">Choose a mode</button><button id="menuChapters">Other civilisations</button><button id="menuAbout">About & teacher notes</button></div><div class="row"><button id="menuReset" class="danger">New game…</button><button id="menuResume" class="gold">Return to the world</button></div>${saveWarning ? `<div class="feedback bad">${esc(saveWarning)}</div>` : ""}`,
  );
  $("#playerName").onchange = (e) => {
    state.name = e.target.value.trim() || "Nile Farmer";
    persist();
  };
  $("#musicToggle").onchange = (e) => {
    state.settings.music = e.target.checked;
    persist();
    updateMusic();
  };
  $("#qualityToggle").onchange = (e) => {
    state.settings.low = e.target.checked;
    renderer.shadowMap.enabled = !e.target.checked;
    renderer.shadowMap.needsUpdate = true;
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, e.target.checked ? 1 : 1.5),
    );
    persist();
  };
  $("#motionToggle").onchange = (e) => {
    state.settings.reduced = e.target.checked;
    persist();
  };
  $("#menuExport").onclick = exportSave;
  $("#menuImport").onclick = chooseImport;
  $("#menuModes").onclick = title;
  $("#menuChapters").onclick = () => showJournal("chapters");
  $("#menuAbout").onclick = about;
  $("#menuReset").onclick = resetPrompt;
  $("#menuResume").onclick = closeDialog;
}
function exportSave() {
  persist();
  downloadFile("River-Chronicles-Save.json", state);
  toast("Save exported. Keep the file to move between browsers or devices.");
}
function chooseImport() {
  $("#importFile").value = "";
  $("#importFile").click();
}
async function importData(file) {
  try {
    if (file.size > 3e6) throw Error("Save file is too large.");
    const text = await file.text(),
      next = migrateSave(JSON.parse(text));
    const old = JSON.stringify(state);
    openDialog(
      `<div class="eyebrow">SAVE READY</div><h2 id="dialogTitle">Continue this river story?</h2><p>${esc(next.name)} · ${Object.values(next.progress).filter((p) => p.done).length} completed discoveries · ${next.city.buildings.length} buildings.</p><p>Your current game will be replaced. Export it first to keep both.</p>${next.legacyArchive ? '<div class="callout">v4 records, notes, completed commissions and unspent gems are imported. The complete original save is retained in the export archive. Old wardrobe items and movement upgrades are archived, not equipped in this new 3D game.</div>' : ""}<div class="row"><button id="backupBeforeImport">Export current game</button><button id="confirmImport" class="gold">Import & continue</button><button id="cancelImport">Cancel</button></div>`,
    );
    $("#backupBeforeImport").onclick = () =>
      downloadFile("River-Chronicles-Before-Import.json", old);
    $("#confirmImport").onclick = () => {
      try {
        localStorage.setItem(SAVE_KEY + "-before-import", old);
        localStorage.setItem(SAVE_KEY, JSON.stringify(next));
        state = next;
        active = false;
        closeDialog();
        enterMode(next.mode);
        toast("Save imported. Your discoveries are ready.");
      } catch (e) {
        toast(
          "Import stopped because the backup could not be saved. Export your current game first, then free storage and retry.",
        );
      }
    };
    $("#cancelImport").onclick = closeDialog;
  } catch (e) {
    toast(
      "Import stopped: " + e.message + " Your current game was not changed.",
    );
  }
}
function resetPrompt() {
  openDialog(
    `<div class="eyebrow">KEEP YOUR RIVER STORY</div><h2 id="dialogTitle">Begin a new game?</h2><p>This resets both modes and the Gods Collection in this edition only. It does not erase earlier two-mode or v4 storage. Export your current save before starting again.</p><div class="row"><button id="resetExport" class="gold">Export current save</button><button id="resetConfirm" class="danger">Reset both modes</button><button id="resetCancel">Cancel</button></div>`,
  );
  $("#resetExport").onclick = exportSave;
  $("#resetCancel").onclick = closeDialog;
  $("#resetConfirm").onclick = () => {
    const backup = JSON.stringify(state);
    try {
      localStorage.setItem(SAVE_KEY + "-before-reset", backup);
      const s = freshSave();
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      state = s;
      active = false;
      buildScene();
      title();
      toast("New game ready. A local backup of the previous game was kept.");
    } catch (e) {
      toast("Reset stopped: the backup could not be saved.");
    }
  };
}
function about() {
  openDialog(
    `<div class="eyebrow">ABOUT THIS EDITION</div><h2 id="dialogTitle">A world shaped by evidence</h2><p>River Chronicles has exactly two modes: Guided Journey and City Builder. Egypt is the starting chapter; the supplied four-civilisation teaching collection remains available through Journal → Civilisations.</p><p>The 40 commission lessons, 53 multiple-choice items and 12 term blanks come from the existing supplied project. Activities adapt these materials into observation, transport, sequencing and four practical workbenches. These are formative activities, not a secure exam or comprehensive assessment.</p><p>Each chapter is a teaching stage combining topics from different periods. It is not an exact archaeological reconstruction. God figures represent ancient religious beliefs. City population, costs, yields, seasons and trading rates are game rules, not historical statistics or a reconstruction of an ancient economy.</p><p>Gods Edition uses a separate storage key and never writes over earlier two-mode or v4 storage. Imported v4 notes and records remain archived. The new game does not recreate old cosmetic purchases or every old interaction. Progress is local to the browser and device; export it before replacing an embed or moving devices.</p><p>Original programmatic models and ambient sound. Gods Collection portraits are cropped from the supplied textbook photograph, not original artwork. Fantasy duels are invented and are separate from historical evidence. Three.js is distributed under its MIT licence. No accounts, backend, tracking or network assets.</p><div class="row"><button id="aboutBack" class="gold">Back to menu</button></div>`,
  );
  $("#aboutBack").onclick = menu;
}
function updateMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (!state.settings.music || !active) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    let t = 0;
    const notes = [0, 7, 12, 9, 4, 7, 2, 0];
    musicTimer = setInterval(() => {
      if (!document.hidden && active && state.settings.music)
        tone(146.83 * Math.pow(2, notes[t++ % notes.length] / 12), 1.5, 0.026);
    }, 1200);
  } catch (e) {
    state.settings.music = false;
    toast("Audio is unavailable in this browser. The game remains playable.");
  }
}
function tone(f, d, v) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(),
    g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.value = f;
  g.gain.setValueAtTime(0.001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(v, audioCtx.currentTime + 0.08);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + d + 0.1);
}
function chime() {
  if (audioCtx && state.settings.music)
    [0, 4, 7].forEach((n, i) =>
      setTimeout(() => tone(440 * 2 ** (n / 12), 0.5, 0.035), i * 90),
    );
}
function setupInput() {
  $("#rotateLeft").innerHTML = icon("rotateLeft");
  $("#rotateRight").innerHTML = icon("rotateRight");
  $$("[data-icon]").forEach((n) => (n.innerHTML = icon(n.dataset.icon)));
  $$("[data-start]").forEach(
    (b) => (b.onclick = () => enterMode(b.dataset.start)),
  );
  $("#brand").onclick = title;
  $("#modeBtn").onclick = title;
  $("#startHelp").onclick = help;
  $("#startImport").onclick = chooseImport;
  $("#helpBtn").onclick = help;
  $("#menuBtn").onclick = menu;
  $("#mapBtn").onclick = showMap;
  $("#journalBtn").onclick = () => showJournal();
  $("#closeDialog").onclick = closeDialog;
  $("#interactBtn").onclick = () => interact();
  $("#trackBtn").onclick = () =>
    state.mode === "builder" ? showMap() : navigate(objectiveSite());
  $("#runBtn").onclick = () => {
    running = !running;
    renderHUD();
  };
  $("#rotateLeft").onclick = () => (cameraAngle -= 0.3);
  $("#rotateRight").onclick = () => (cameraAngle += 0.3);
  $("#zoomPlus").onclick = () =>
    (cameraDistance = Math.max(12, cameraDistance - 2));
  $("#zoomMinus").onclick = () =>
    (cameraDistance = Math.min(38, cameraDistance + 2));
  for (let i = 0; i < GRID.cols; i++) $("#plotCol").add(new Option(i + 1, i));
  for (let i = 0; i < GRID.rows; i++) $("#plotRow").add(new Option(i + 1, i));
  $("#plotCol").onchange = (e) => selectPlot(+e.target.value, selectedRow);
  $("#plotRow").onchange = (e) => selectPlot(selectedCol, +e.target.value);
  $("#placeBtn").onclick = placeSelected;
  $("#inspectBtn").onclick = inspectPlot;
  $("#seasonBtn").onclick = nextSeason;
  $("#irrigateBtn").onclick = () => {
    if (waterFarms(state)) {
      persist();
      renderHUD();
      toast("All existing farms are watered for this year’s harvest.");
    } else toast("Wait until the flood recedes before watering fields.");
  };
  $("#importFile").onchange = (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
  };
  $$("[data-move]").forEach((b) => {
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys[b.dataset.move] = true;
    };
    for (const evt of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(evt, () => delete keys[b.dataset.move]);
  });
  document.addEventListener("keydown", (e) => {
    if (dialogOpen && e.key === "Tab") {
      const nodes = $$(
        "#dialog button:not([disabled]),#dialog input,#dialog textarea,#dialog select",
      ).filter((n) => n.getClientRects().length);
      if (!nodes.length) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === nodes[0] ||
          document.activeElement === $("#dialog"))
      ) {
        e.preventDefault();
        nodes.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
        e.preventDefault();
        nodes[0].focus();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      dialogOpen ? closeDialog() : active ? menu() : null;
      return;
    }
    if (e.target.matches("input,textarea,select,button") && e.key !== "Escape")
      return;
    if (!active || dialogOpen) return;
    const k = e.key.toLowerCase();
    if (k === "e") {
      e.preventDefault();
      interact();
      return;
    }
    if (k === "m") {
      e.preventDefault();
      showMap();
      return;
    }
    if (k === "j") {
      e.preventDefault();
      showJournal();
      return;
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
      e.preventDefault();
    keys[e.key] = true;
    keys[k] = true;
  });
  document.addEventListener("keyup", (e) => {
    delete keys[e.key];
    delete keys[e.key.toLowerCase()];
  });
  window.addEventListener("blur", () => {
    Object.keys(keys).forEach((k) => delete keys[k]);
    running = false;
    path = [];
    persist();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      Object.keys(keys).forEach((k) => delete keys[k]);
      path = [];
      persist();
    }
  });
  $("#world").addEventListener("click", (e) => {
    if (!active || dialogOpen || godBattle) return;
    const p = pointFromEvent(e);
    if (!p) return;
    if (state.mode === "builder") {
      const col = Math.round((p.x - GRID.x) / GRID.size),
        row = Math.round((p.z - GRID.z) / GRID.size);
      if (col >= 0 && col < GRID.cols && row >= 0 && row < GRID.rows)
        selectPlot(col, row);
      else toast("Select a plot inside the marked settlement grid.");
    } else if (!isBlocked(p.x, p.z)) path = findPath(p.x, p.z);
  });
  $("#world").addEventListener(
    "wheel",
    (e) => {
      if (!active || dialogOpen) return;
      e.preventDefault();
      cameraDistance = Math.max(
        12,
        Math.min(38, cameraDistance + Math.sign(e.deltaY)),
      );
    },
    { passive: false },
  );
}
function tick(now) {
  requestAnimationFrame(tick);
  if ($("#fatal").hidden === false || document.hidden) {
    frameLast = now;
    return;
  }
  const dt = Math.min(0.05, (now - (frameLast || now)) / 1000);
  frameLast = now;
  frameGraphics(dt, now);
  saveClock += dt;
  uiClock += dt;
  if (saveClock > 5) {
    saveClock = 0;
    if (active) persist();
  }
  if (uiClock > 0.5) {
    uiClock = 0;
    if ($("#mapCanvas")) drawMap();
  }
}
function init() {
  let corrupt = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem("river-chronicles-two-modes-v1");
    if (raw) state = migrateSave(JSON.parse(raw));
  } catch (e) {
    saveWarning =
      "An existing save could not be loaded. It has not been overwritten. Export a recovery copy before saving.";
    corrupt = e;
  }
  if (corrupt) {
    $("#loading").hidden = true;
    fatal(saveWarning);
    return;
  }
  try {
    attachGodSites();
    initGraphics();
    setupInput();
    mountGodUI();
    buildScene();
    $("#loading").hidden = true;
    clearTimeout(window.gameBootTimer);
    title();
    window.RIVER = {
      MODEL,
      GOD_LIST,
      godIntro,
      showGodCollection,
      godCard,
      godReady,
      startGodBattle,
      fireGodBolt,
      dodgeGod,
      endGodBattle,
      get battle(){return godBattle},
      get gods(){return GOD_LIST},
      CHAPTERS,
      QUESTION_BANK,
      TERM_BANK,
      WORLD_BANK,
      PRACTICAL_BANK,
      get state() {
        return state;
      },
      get player() {
        return player;
      },
      get renderer() {
        return renderer;
      },
      get scene() {
        return scene;
      },
      get camera() {
        return camera;
      },
      get active() {
        return active;
      },
      get route() {
        return path;
      },
      get dialogOpen() {
        return dialogOpen;
      },
      get selected() {
        return { kind: selectedBuilding, col: selectedCol, row: selectedRow };
      },
      enterMode,
      title,
      currentQuest,
      objectiveSite,
      interact,
      navigate,
      lesson,
      activity,
      openLab,
      commissionQuiz,
      showJournal,
      showMap,
      menu,
      help,
      persist,
      closeDialog,
      selectPlot,
      placeSelected,
      nextSeason,
      inspectPlot,
      importData,
      renderHUD,
      updateGhost,
      get labStage() {
        return labStage;
      },
      get npcs() {
        return npcs;
      },
    };
    requestAnimationFrame(tick);
    try {
      if (
        !localStorage.getItem(SAVE_KEY) &&
        localStorage.getItem("valley-four-civilisations-v4")
      ) {
        openDialog(
          '<div class="eyebrow">AN EARLIER RIVER STORY</div><h2 id="dialogTitle">Your v4 save is still here</h2><p>Import it to carry completed discoveries, notes and unspent gems into the new game. The old save will not be overwritten.</p><div class="row"><button id="useLocalV4" class="gold">Review v4 import</button><button id="skipLocalV4">Start separately</button></div>',
        );
        $("#useLocalV4").onclick = () =>
          importData(
            new File(
              [localStorage.getItem("valley-four-civilisations-v4")],
              "v4.json",
            ),
          );
        $("#skipLocalV4").onclick = closeDialog;
      }
    } catch (e) {}
  } catch (e) {
    console.error(e);
    fatal(
      "The 3D world could not start. " +
        e.message +
        " Try enabling hardware acceleration or using a WebGL 2 browser. Saved data was not deleted.",
    );
  }
}
init();
