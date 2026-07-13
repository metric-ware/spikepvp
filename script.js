(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const minimapCanvas = document.getElementById("minimapCanvas");
  const minimapCtx = minimapCanvas.getContext("2d");
  const VISUALS = globalThis.SWORDFIGHT_VISUALS;
  const {
    CLIENT: CLIENT_PACKET,
    SERVER: SERVER_PACKET,
    ITEM: ITEM_ID,
    RESOURCE,
    BUILDING_RELATION
  } = globalThis.SWORDFIGHT_PROTOCOL;
  const {
    clamp,
    normalizeAngle,
    lerpAngle,
    circlesOverlap,
    circleIntersectsAnyLake
  } = globalThis.SWORDFIGHT_GEOMETRY;

  const dom = {
    lobby: document.getElementById("lobby"),
    nickname: document.getElementById("nickname"),
    serverPreset: document.getElementById("serverPreset"),
    joinError: document.getElementById("joinError"),
    joinButton: document.getElementById("joinButton"),
    lobbySettingsButton: document.getElementById("lobbySettingsButton"),
    hud: document.getElementById("hud"),
    clanButton: document.getElementById("clanButton"),
    helmetsButton: document.getElementById("helmetsButton"),
    settingsButton: document.getElementById("settingsButton"),
    pingDisplay: document.getElementById("pingDisplay"),
    clanRequestPopups: document.getElementById("clanRequestPopups"),
    leaderboardRows: document.getElementById("leaderboardRows"),
    treeCount: document.getElementById("treeCount"),
    stoneCount: document.getElementById("stoneCount"),
    goldCount: document.getElementById("goldCount"),
    bushCount: document.getElementById("bushCount"),
    killCount: document.getElementById("killCount"),
    minimapCanvas,
    inventory: document.getElementById("inventory"),
    inventoryCostPreview: document.getElementById("inventoryCostPreview"),
    chatComposer: document.getElementById("chatComposer"),
    chatInput: document.getElementById("chatInput"),
    chatCounter: document.getElementById("chatCounter"),
    modalShade: document.getElementById("modalShade"),
    clanModal: document.getElementById("clanModal"),
    clanModalBody: document.getElementById("clanModalBody"),
    helmetsModal: document.getElementById("helmetsModal"),
    helmetsModalBody: document.getElementById("helmetsModalBody"),
    settingsModal: document.getElementById("settingsModal"),
    showPingSetting: document.getElementById("showPingSetting"),
    showHitboxesSetting: document.getElementById("showHitboxesSetting"),
    hotkeyRows: document.getElementById("hotkeyRows"),
    resetHotkeysButton: document.getElementById("resetHotkeysButton"),
    toastStack: document.getElementById("toastStack")
  };

  const ACTIONS = ["sword", "hammer", "apple", "spike", "trap", "wall", "gatherer"];
  const ACTION_LABELS = {
    sword: "Equip katana",
    hammer: "Equip hammer",
    apple: "Heal / apple",
    spike: "Select spike",
    trap: "Select trap",
    wall: "Select wall",
    gatherer: "Select windmill"
  };
  const ACTION_ITEM_IDS = {
    sword: ITEM_ID.SWORD,
    hammer: ITEM_ID.HAMMER,
    apple: ITEM_ID.APPLE,
    spike: ITEM_ID.SPIKE,
    trap: ITEM_ID.TRAP,
    wall: ITEM_ID.WALL,
    gatherer: ITEM_ID.GATHERER
  };
  const ITEM_ACTIONS = Object.fromEntries(
    Object.entries(ACTION_ITEM_IDS).map(([action, id]) => [id, action])
  );
  const FIXED_NUMBER_ACTIONS = {
    Digit1: "sword",
    Digit2: "hammer",
    Digit3: "apple",
    Digit4: "spike",
    Digit5: "trap",
    Digit6: "wall",
    Digit7: "gatherer",
    Numpad1: "sword",
    Numpad2: "hammer",
    Numpad3: "apple",
    Numpad4: "spike",
    Numpad5: "trap",
    Numpad6: "wall",
    Numpad7: "gatherer"
  };
  const DEFAULT_HOTKEYS = {
    sword: "1",
    hammer: "2",
    apple: "q",
    spike: "v",
    trap: "f",
    wall: "b",
    gatherer: "g"
  };

  const LOBBY_ASSETS = [
    ...Object.values(VISUALS.RESOURCES).map((resource) => resource.image),
    VISUALS.BUILDS.gatherer.baseImage,
    VISUALS.BUILDS.gatherer.rotateImage
  ];
  const LOBBY_SPRITE_SCALE = 1 / 2.5;
  const LOBBY_WINTER_EDGE = Object.freeze([
    Object.freeze({ x: 0.315, y: 0.00 }),
    Object.freeze({ x: 0.296, y: 0.22 }),
    Object.freeze({ x: 0.326, y: 0.50 }),
    Object.freeze({ x: 0.292, y: 0.78 }),
    Object.freeze({ x: 0.312, y: 1.00 })
  ]);
  const LOBBY_LAVA_EDGE = Object.freeze([
    Object.freeze({ x: 0.685, y: 0.00 }),
    Object.freeze({ x: 0.681, y: 0.13 }),
    Object.freeze({ x: 0.705, y: 0.31 }),
    Object.freeze({ x: 0.697, y: 0.55 }),
    Object.freeze({ x: 0.675, y: 0.73 }),
    Object.freeze({ x: 0.682, y: 0.89 }),
    Object.freeze({ x: 0.689, y: 1.00 })
  ]);
  const LOBBY_RESOURCES = Object.freeze([
    // Winter: a tall grove above a lower mining outcrop.
    Object.freeze({ type: "tree", x: 0.075, y: 0.190 }),
    Object.freeze({ type: "stone", x: 0.255, y: 0.380 }),
    Object.freeze({ type: "gold", x: 0.075, y: 0.780 }),

    // Meadow: the card occupies the clearing, so its resources peek through
    // the two open corridors above and below it.
    Object.freeze({ type: "tree", x: 0.395, y: 0.135 }),
    Object.freeze({ type: "gold", x: 0.610, y: 0.135 }),
    Object.freeze({ type: "bush", x: 0.405, y: 0.875 }),
    Object.freeze({ type: "stone", x: 0.610, y: 0.875 }),

    // Lava: brighter resources surround a larger working windmill.
    Object.freeze({ type: "gold", x: 0.760, y: 0.210 }),
    Object.freeze({ type: "tree", x: 0.955, y: 0.430 }),
    Object.freeze({ type: "stone", x: 0.755, y: 0.745 }),
    Object.freeze({ type: "bush", x: 0.925, y: 0.835 })
  ]);
  const LOBBY_WINDMILLS = Object.freeze([
    Object.freeze({ x: 0.225, y: 0.720, phase: 0.0 }),
    Object.freeze({ x: 0.505, y: 0.865, phase: 1.8 }),
    Object.freeze({ x: 0.845, y: 0.495, phase: 3.6 })
  ]);

  const imageCache = new Map();
  const inventoryCells = new Map();
  const pressedMovementKeys = new Set();
  const ANGLE_SEND_INTERVAL_MS = 100;
  const PING_INTERVAL_MS = 1000;
  const NETWORK_ANGLE_SCALE = 10_000;
  const PERFORMANCE_SAMPLE_INTERVAL_MS = 1000;
  const BUILDING_INDICATOR_COLORS = Object.freeze({
    [BUILDING_RELATION.ENEMY]: "#ff4d4d",
    [BUILDING_RELATION.CLANMATE]: "#ffd84a",
    [BUILDING_RELATION.OWNER]: "#8fe63f"
  });
  const SPRITE_RENDER_SCALE = VISUALS.SPRITE_SCALE;
  const LOCAL_INTERPOLATION_OVERLAP_MS = 12;
  const REMOTE_INTERPOLATION_OVERLAP_MS = 42;
  const ANGLE_LERP_RATE = 0.012;
  const HEALTH_TRAIL_LERP_RATE = 0.016;
  const INVENTORY_VISUALS = VISUALS.INVENTORY;
  const INVENTORY_ORDER = [...INVENTORY_VISUALS.order];
  const INVENTORY_SLOTS = INVENTORY_VISUALS.slots;
  const RESOURCE_TYPES = Object.freeze(Object.values(RESOURCE));
  const BUILD_TYPES = Object.freeze(Object.keys(VISUALS.BUILDS));

  function emptyResources() {
    return Object.fromEntries(RESOURCE_TYPES.map((type) => [type, 0]));
  }

  function emptyBuildCounts() {
    return Object.fromEntries(BUILD_TYPES.map((type) => [type, 0]));
  }

  function loadStoredJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function saveStoredJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The game still works when storage is unavailable.
    }
  }

  const HOTKEY_SCHEMA_VERSION = 2;
  const storedHotkeysRaw = Number(localStorage.getItem("swordfight.hotkeyVersion")) === HOTKEY_SCHEMA_VERSION
    ? loadStoredJson("swordfight.hotkeys", {})
    : {};
  const storedHotkeys = Object.fromEntries(
    ACTIONS
      .filter((action) => typeof storedHotkeysRaw[action] === "string")
      .map((action) => [action, storedHotkeysRaw[action]])
  );
  const DEFAULT_SETTINGS = Object.freeze({
    showPing: true,
    showHitboxes: false
  });
  const settings = {
    ...DEFAULT_SETTINGS,
    ...loadStoredJson("swordfight.settings", {}),
    hotkeys: { ...DEFAULT_HOTKEYS, ...storedHotkeys }
  };

  const game = {
    mode: "lobby",
    socket: null,
    connectionAttempt: 0,
    selfId: null,
    config: null,
    definitions: new Map(),
    world: { width: 5000, height: 5000 },
    lakes: [],
    obstacles: [],
    obstacleById: new Map(),
    players: new Map(),
    buildings: new Map(),
    serverTick: -1,
    resources: emptyResources(),
    buildCounts: emptyBuildCounts(),
    killCount: 0,
    selectedItemId: ITEM_ID.SWORD,
    localAimAngle: 0,
    camera: { x: 0, y: 0 },
    tickMs: 50,
    mouseDown: false,
    attackIntentActive: false,
    attackReadyAt: 0,
    lastDirection: 0,
    lastAngleSentAt: 0,
    clanData: { clans: [], selfClan: null, requests: [] },
    clanById: new Map(),
    ownedHelmetIds: new Set(),
    equippedHelmetId: null,
    openModal: null,
    capturingHotkey: null,
    predictedSwings: [],
    cooldownVisuals: new Map(),
    ping: null,
    fps: 0,
    fpsFrameCount: 0,
    fpsSampleStartedAt: performance.now(),
    tps: 0,
    tpsSampleTick: -1,
    tpsSampleStartedAt: performance.now(),
    nextPingAt: 0,
    latestNotice: null,
    latestNoticeTimer: null,
    lastFrameAt: performance.now()
  };

  function defaultServerUrl() {
    const hostname = location.hostname || "localhost";
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${hostname}:3000`;
  }

  function selectedServerUrl() {
    return dom.serverPreset.value === "frankfurt"
      ? "wss://frankfurt.spikepvp.org"
      : defaultServerUrl();
  }

  const storedServerPreset = localStorage.getItem("swordfight.serverPreset");
  dom.serverPreset.value = storedServerPreset === "local" ? "local" : "frankfurt";
  dom.nickname.value = localStorage.getItem("swordfight.nickname") || "";
  dom.showPingSetting.checked = Boolean(settings.showPing);
  dom.showHitboxesSetting.checked = Boolean(settings.showHitboxes);

  function getImage(path) {
    if (!path) return null;
    if (imageCache.has(path)) return imageCache.get(path);
    const image = new Image();
    image.decoding = "async";
    image.src = path;
    imageCache.set(path, image);
    return image;
  }

  for (const path of LOBBY_ASSETS) getImage(path);

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function normalizeKey(key) {
    if (key === " ") return "space";
    return String(key).toLowerCase();
  }

  function displayKey(key) {
    const names = {
      " ": "Space",
      space: "Space",
      arrowup: "↑",
      arrowdown: "↓",
      arrowleft: "←",
      arrowright: "→"
    };
    return names[key] || key.toUpperCase();
  }

  function actionForInput(event) {
    if (FIXED_NUMBER_ACTIONS[event.code]) return FIXED_NUMBER_ACTIONS[event.code];
    const normalized = normalizeKey(event.key);
    return ACTIONS.find((action) => settings.hotkeys[action] === normalized) || null;
  }

  function primaryKeyForItem(itemId) {
    const action = ITEM_ACTIONS[itemId];
    return action ? displayKey(settings.hotkeys[action]) : "";
  }

  function send(packet) {
    if (!game.socket || game.socket.readyState !== WebSocket.OPEN) return false;
    game.socket.send(JSON.stringify(packet));
    return true;
  }

  function sendCurrentAngle(now = performance.now()) {
    if (game.mode !== "game" || !game.players.has(game.selfId)) return false;
    const networkAngle = Math.round(game.localAimAngle * NETWORK_ANGLE_SCALE) / NETWORK_ANGLE_SCALE;
    if (!send([CLIENT_PACKET.AIM, networkAngle])) return false;
    game.lastAngleSentAt = now;
    return true;
  }

  function clearToast() {
    if (game.latestNoticeTimer) {
      window.clearTimeout(game.latestNoticeTimer);
      game.latestNoticeTimer = null;
    }
    game.latestNotice = null;
    dom.toastStack.hidden = true;
    dom.toastStack.replaceChildren();
  }

  function syncToastVisibility() {
    const notice = game.latestNotice;
    if (!notice || performance.now() >= notice.hideAt) {
      dom.toastStack.hidden = true;
      dom.toastStack.replaceChildren();
      return;
    }
    if (!dom.inventoryCostPreview.hidden) {
      dom.toastStack.hidden = true;
      return;
    }
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = String(notice.message);
    dom.toastStack.hidden = false;
    dom.toastStack.replaceChildren(toast);
  }

  function showToast(message, duration = 2600) {
    if (!message) return;
    if (game.latestNoticeTimer) window.clearTimeout(game.latestNoticeTimer);
    game.latestNotice = {
      message: String(message),
      hideAt: performance.now() + duration
    };
    syncToastVisibility();
    game.latestNoticeTimer = window.setTimeout(() => {
      game.latestNoticeTimer = null;
      if (game.latestNotice && performance.now() >= game.latestNotice.hideAt) clearToast();
      else syncToastVisibility();
    }, duration);
  }

  function setLobbyError(message) {
    dom.joinError.textContent = message || "";
  }

  function setConnectingUi(connecting) {
    dom.joinButton.disabled = connecting;
    dom.joinButton.textContent = connecting ? "Connecting…" : "Play";
  }

  function connectToServer() {
    if (game.mode === "connecting" || game.mode === "game") return;
    const nickname = dom.nickname.value.trim();
    const endpoint = selectedServerUrl();

    const nicknameMaximum = dom.nickname.maxLength;
    if (nickname.length < 1 || nickname.length > nicknameMaximum || /[\u0000-\u001f\u007f]/.test(nickname)) {
      setLobbyError(`Use a nickname between 1 and ${nicknameMaximum} characters.`);
      dom.nickname.focus();
      return;
    }
    localStorage.setItem("swordfight.nickname", nickname);
    localStorage.setItem("swordfight.serverPreset", dom.serverPreset.value);
    setLobbyError("");
    setConnectingUi(true);
    game.mode = "connecting";
    const attempt = ++game.connectionAttempt;

    let socket;
    try {
      socket = new WebSocket(endpoint);
    } catch {
      game.mode = "lobby";
      setConnectingUi(false);
      setLobbyError("The server URL could not be opened.");
      return;
    }

    game.socket = socket;
    socket.addEventListener("open", () => {
      if (attempt !== game.connectionAttempt) return;
      send([CLIENT_PACKET.JOIN, nickname]);
    });
    socket.addEventListener("message", (event) => handleServerMessage(event.data));
    socket.addEventListener("error", () => {
      if (game.mode === "connecting") setLobbyError("Could not reach the game server.");
    });
    socket.addEventListener("close", (event) => handleSocketClose(socket, event));

    window.setTimeout(() => {
      if (attempt !== game.connectionAttempt || game.mode !== "connecting") return;
      setLobbyError("The server did not answer in time.");
      socket.close();
      game.mode = "lobby";
      setConnectingUi(false);
    }, 6000);
  }

  function handleSocketClose(socket, event) {
    if (socket !== game.socket) return;
    const previousMode = game.mode;
    game.socket = null;

    if (previousMode === "connecting") {
      game.mode = "lobby";
      setConnectingUi(false);
      if (!dom.joinError.textContent) setLobbyError("The server closed the connection.");
      return;
    }

    if (previousMode !== "game") return;
    returnToLobby();
  }

  function resetGameState() {
    game.selfId = null;
    game.config = null;
    game.definitions.clear();
    game.world = { width: 5000, height: 5000 };
    game.tickMs = 50;
    game.players.clear();
    game.buildings.clear();
    game.lakes = [];
    game.obstacles = [];
    game.obstacleById.clear();
    game.serverTick = -1;
    game.resources = emptyResources();
    game.killCount = 0;
    game.buildCounts = emptyBuildCounts();
    game.clanData = { clans: [], selfClan: null, requests: [] };
    game.clanById.clear();
    game.ownedHelmetIds.clear();
    game.equippedHelmetId = null;
    game.selectedItemId = ITEM_ID.SWORD;
    game.localAimAngle = 0;
    game.camera.x = 0;
    game.camera.y = 0;
    game.mouseDown = false;
    game.attackIntentActive = false;
    game.attackReadyAt = 0;
    game.lastDirection = 0;
    game.lastAngleSentAt = 0;
    game.predictedSwings.length = 0;
    game.cooldownVisuals.clear();
    game.ping = null;
    game.fps = 0;
    game.fpsFrameCount = 0;
    game.fpsSampleStartedAt = performance.now();
    game.tps = 0;
    game.tpsSampleTick = -1;
    game.tpsSampleStartedAt = performance.now();
    pressedMovementKeys.clear();
    dom.leaderboardRows.replaceChildren();
    dom.clanRequestPopups.replaceChildren();
    clearToast();
    updatePerformanceDisplay();
  }

  function inventoryMetadataById(itemId) {
    return VISUALS.INVENTORY?.slots?.[itemId] || null;
  }

  function hydrateClientConfig(serverConfig) {
    const config = serverConfig && typeof serverConfig === "object" ? serverConfig : {};
    const items = Object.fromEntries(
      Object.entries(config.ITEMS || {}).map(([type, definition]) => {
        const metadata = inventoryMetadataById(definition.id);
        return [type, {
          ...definition,
          name: metadata?.name || type,
          description: metadata?.description || "",
          render: { ...(VISUALS.ITEMS[type] || {}) }
        }];
      })
    );
    const builds = Object.fromEntries(
      Object.entries(config.BUILDS || {}).map(([type, definition]) => {
        const metadata = inventoryMetadataById(definition.id);
        return [type, {
          ...definition,
          type,
          name: metadata?.name || type,
          description: metadata?.description || "",
          render: { ...(VISUALS.BUILDS[type] || {}) }
        }];
      })
    );
    const resources = Object.fromEntries(
      Object.entries(VISUALS.RESOURCES).map(([type, render]) => [type, {
        ...(config.RESOURCES?.[type] || {}),
        ...render
      }])
    );

    return {
      ...config,
      PLAYER: { ...(config.PLAYER || {}), ...VISUALS.PLAYER },
      ITEMS: items,
      BUILDS: builds,
      RESOURCES: resources
    };
  }

  function hydrateMapObstacles(rows, resources) {
    if (!Array.isArray(rows)) return [];
    const obstacles = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 4) continue;
      const [id, type, x, y] = row;
      const radius = resources?.[type]?.radius;
      if (!Number.isInteger(id) || typeof type !== "string" || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) continue;
      obstacles.push({ id, type, x, y, radius });
    }
    return obstacles;
  }

  function hydrateMapLakes(rows) {
    if (!Array.isArray(rows)) return [];
    const lakes = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 3) continue;
      const [id, type, pointRows] = row;
      if (typeof id !== "string" || !["ice", "lava"].includes(type) || !Array.isArray(pointRows)) continue;
      const points = pointRows
        .filter((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))
        .map(([x, y]) => ({ x, y }));
      if (points.length < 3) continue;
      const xValues = points.map((point) => point.x);
      const yValues = points.map((point) => point.y);
      lakes.push({
        id,
        type,
        points,
        bounds: {
          minX: Math.min(...xValues),
          minY: Math.min(...yValues),
          maxX: Math.max(...xValues),
          maxY: Math.max(...yValues)
        }
      });
    }
    return lakes;
  }

  function enterGame(init) {
    resetGameState();
    game.mode = "game";
    game.selfId = init.selfId;
    game.config = hydrateClientConfig(init.config);
    game.tickMs = Number.isFinite(game.config.TICK_MS) ? game.config.TICK_MS : 50;
    game.world = init.map;
    game.lakes = hydrateMapLakes(init.map?.lakes);
    game.obstacles = hydrateMapObstacles(init.obstacles, game.config.RESOURCES);
    game.obstacleById = new Map(game.obstacles.map((obstacle) => [obstacle.id, obstacle]));
    game.definitions.clear();

    getImage(game.config.PLAYER.bodyImage);
    getImage(game.config.PLAYER.handImage);

    for (const item of Object.values(game.config.ITEMS || {})) {
      game.definitions.set(item.id, item);
      if (item.render?.image) getImage(item.render.image);
    }
    for (const build of Object.values(game.config.BUILDS || {})) {
      game.definitions.set(build.id, build);
      if (build.render?.image) getImage(build.render.image);
      if (build.render?.baseImage) getImage(build.render.baseImage);
      if (build.render?.rotateImage) getImage(build.render.rotateImage);
    }
    for (const resource of Object.values(game.config.RESOURCES || {})) getImage(resource.image);
    for (const helmet of Object.values(game.config.HELMETS || {})) getImage(helmet.image);

    dom.lobby.hidden = true;
    dom.hud.hidden = false;
    setConnectingUi(false);
    setLobbyError("");
    buildInventory();
    updateInventory();
    updateResourcePanel();
    game.nextPingAt = performance.now();
  }

  function returnToLobby() {
    game.mode = "lobby";
    game.selfId = null;
    dom.hud.hidden = true;
    dom.lobby.hidden = false;
    setConnectingUi(false);
    closeMajorModal();
    hideInventoryCostPreview();
    closeChat(false);
    resetGameState();
  }

  function handleServerMessage(raw) {
    let packet;
    try {
      packet = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(packet) || !Number.isInteger(packet[0])) return;

    switch (packet[0]) {
      case SERVER_PACKET.INIT:
        if (packet[1] && Number.isInteger(packet[1].selfId) && packet[1].config) enterGame(packet[1]);
        break;
      case SERVER_PACKET.SNAPSHOT:
        if (game.mode === "game") applyGameData(packet[1]);
        break;
      case SERVER_PACKET.LEADERBOARD:
        if (Array.isArray(packet[1])) updateLeaderboard(packet[1]);
        break;
      case SERVER_PACKET.CLAN_DATA:
        if (packet[1] && typeof packet[1] === "object") updateClanData(packet[1]);
        break;
      case SERVER_PACKET.PONG:
        if (Number.isFinite(packet[1])) {
          game.ping = Math.max(0, Math.round(performance.now() - packet[1]));
          updatePerformanceDisplay();
        }
        break;
      case SERVER_PACKET.NOTICE:
        if (typeof packet[1] === "string") {
          if (game.mode === "connecting") setLobbyError(packet[1]);
          else showToast(packet[1]);
        }
        break;
      default:
        break;
    }
  }

  function getDefinition(itemId) {
    return game.definitions.get(itemId) || null;
  }

  function getBuildDefinition(type) {
    return game.config?.BUILDS?.[type] || null;
  }

  function maximumBuildingsPerType() {
    return game.config?.BUILDING?.maxPerPlayerPerType ?? 50;
  }

  function getHelmetDefinition(helmetId) {
    if (!Number.isInteger(helmetId)) return null;
    return Object.values(game.config?.HELMETS || {})
      .find((helmet) => helmet.id === helmetId) || null;
  }

  function createRenderPlayer(row, now = performance.now(), serverTick = game.serverTick) {
    const selectedDefinition = getDefinition(row[7]);
    return {
      id: row[0],
      nick: row[1],
      x: row[2],
      y: row[3],
      fromX: row[2],
      fromY: row[3],
      targetX: row[2],
      targetY: row[3],
      snapshotStartedAt: now,
      snapshotDurationMs: game.tickMs + (
        row[0] === game.selfId ? LOCAL_INTERPOLATION_OVERLAP_MS : REMOTE_INTERPOLATION_OVERLAP_MS
      ),
      lastSnapshotTick: serverTick,
      angle: row[4],
      targetAngle: row[4],
      hp: row[5],
      healthTrailHp: row[5],
      healthTrailDirection: null,
      clanId: row[6],
      selectedItemId: row[7],
      chatText: row[8],
      ally: row[9],
      attackSeq: row[10],
      equippedHelmetId: row[11],
      lastWeaponItemId: selectedDefinition && ["tool", "weapon"].includes(selectedDefinition.kind)
        ? row[7]
        : ITEM_ID.SWORD,
      swing: null
    };
  }

  function samplePlayerPosition(player, now) {
    const duration = Math.max(1, player.snapshotDurationMs || game.tickMs);
    const progress = clamp((now - player.snapshotStartedAt) / duration, 0, 1);
    return {
      x: player.fromX + (player.targetX - player.fromX) * progress,
      y: player.fromY + (player.targetY - player.fromY) * progress
    };
  }


  function swingDurationForItem(itemId) {
    const definition = getDefinition(itemId);
    if (definition?.reloadMs) {
      const reloadDuration = definition.reloadMs;
      if (definition.kind === "tool" || definition.kind === "weapon") {
        return Math.round(reloadDuration / 1.5);
      }
      return reloadDuration;
    }
    return 250;
  }

  function startSwing(player, itemId = player?.selectedItemId, startTime = performance.now()) {
    if (!player) return;
    player.swing = {
      startTime,
      duration: swingDurationForItem(itemId),
      itemId
    };
  }

  function predictLocalSwing(itemId, startTime = performance.now()) {
    const player = game.players.get(game.selfId);
    if (!player) return;
    startSwing(player, itemId, startTime);
    game.predictedSwings.push({ at: startTime });
  }

  function startCooldownVisual(itemId, start = performance.now()) {
    const definition = getDefinition(itemId);
    if (!definition?.reloadMs) return;
    const duration = definition.reloadMs;
    game.cooldownVisuals.set(itemId, { start, end: start + duration });
  }

  function lockAttackCooldown(itemId, start = performance.now()) {
    const definition = getDefinition(itemId);
    if (!definition?.reloadMs) return;
    const duration = definition.reloadMs;
    game.attackReadyAt = Math.max(game.attackReadyAt, start + duration);
  }

  function applyAttackSequence(player, previousSeq, nextSeq) {
    if (!Number.isInteger(nextSeq) || nextSeq <= previousSeq) return;
    let changes = nextSeq - previousSeq;
    const now = performance.now();

    if (player.id === game.selfId) {
      game.predictedSwings = game.predictedSwings.filter((prediction) => now - prediction.at < 1500);
      // attackSeq acknowledgements are ordered, so consume predictions FIFO.
      // Matching against the currently equipped item was incorrect when the
      // player switched tools before the acknowledgement snapshot arrived.
      while (changes > 0 && game.predictedSwings.length > 0) {
        game.predictedSwings.shift();
        changes--;
      }
    }

    if (changes > 0) {
      startSwing(player, player.selectedItemId, now);
      if (player.id === game.selfId) {
        startCooldownVisual(player.selectedItemId, now);
        lockAttackCooldown(player.selectedItemId, now);
      }
    }
  }

  function applyGameData(data) {
    if (!data || !Number.isInteger(data.serverTick) || data.serverTick <= game.serverTick) return;
    if (!Array.isArray(data.players) || !Array.isArray(data.buildings)) return;
    const snapshotNow = performance.now();
    sampleTickRate(data.serverTick, snapshotNow);
    game.serverTick = data.serverTick;

    if (data.myPlayer && data.myPlayer.id === game.selfId) {
      const previousEquippedHelmetId = game.equippedHelmetId;
      const previousOwnedHelmetIds = Array.from(game.ownedHelmetIds).join(",");
      let buildCountsChanged = false;
      for (const resource of RESOURCE_TYPES) {
        if (Number.isFinite(data.myPlayer[resource])) game.resources[resource] = data.myPlayer[resource];
      }
      if (Number.isInteger(data.myPlayer.killCount)) game.killCount = data.myPlayer.killCount;
      game.ownedHelmetIds = new Set(
        (Array.isArray(data.myPlayer.ownedHelmetIds) ? data.myPlayer.ownedHelmetIds : [])
          .filter((helmetId) => Number.isInteger(helmetId))
      );
      game.equippedHelmetId = Number.isInteger(data.myPlayer.equippedHelmetId)
        ? data.myPlayer.equippedHelmetId
        : null;
      if (data.myPlayer.buildCounts && typeof data.myPlayer.buildCounts === "object") {
        for (const type of BUILD_TYPES) {
          const count = data.myPlayer.buildCounts[type];
          const nextCount = Number.isInteger(count) && count >= 0 ? count : 0;
          if (game.buildCounts[type] !== nextCount) buildCountsChanged = true;
          game.buildCounts[type] = nextCount;
        }
      }
      updateResourcePanel();
      const helmetStateChanged = previousEquippedHelmetId !== game.equippedHelmetId
        || previousOwnedHelmetIds !== Array.from(game.ownedHelmetIds).join(",");
      if (helmetStateChanged && game.openModal === "helmets") renderHelmetsModal();
      if (buildCountsChanged || previousEquippedHelmetId !== game.equippedHelmetId) {
        updateInventory();
      }
    }

    const seenPlayers = new Set();
    for (const row of data.players) {
      if (!Array.isArray(row) || row.length !== 12 || !Number.isInteger(row[0])) continue;
      seenPlayers.add(row[0]);
      let player = game.players.get(row[0]);
      if (!player) {
        player = createRenderPlayer(row, snapshotNow, data.serverTick);
        game.players.set(player.id, player);
        if (player.id === game.selfId) game.localAimAngle = row[4];
      } else {
        const previousSeq = player.attackSeq;
        const sampled = samplePlayerPosition(player, snapshotNow);
        player.x = sampled.x;
        player.y = sampled.y;
        player.fromX = sampled.x;
        player.fromY = sampled.y;
        const previousSnapshotTick = Number.isInteger(player.lastSnapshotTick)
          ? player.lastSnapshotTick
          : data.serverTick - 1;
        const tickDelta = Math.max(1, data.serverTick - previousSnapshotTick);
        const interpolationOverlap = player.id === game.selfId
          ? LOCAL_INTERPOLATION_OVERLAP_MS
          : REMOTE_INTERPOLATION_OVERLAP_MS;
        player.snapshotStartedAt = snapshotNow;
        player.snapshotDurationMs = clamp(
          tickDelta * game.tickMs + interpolationOverlap,
          game.tickMs,
          game.tickMs * 4
        );
        player.lastSnapshotTick = data.serverTick;
        player.targetX = row[2];
        player.targetY = row[3];
        player.targetAngle = row[4];
        player.nick = row[1];
        const previousHp = player.hp;
        const nextHp = row[5];
        if (nextHp !== previousHp) {
          const currentTrail = Number.isFinite(player.healthTrailHp)
            ? player.healthTrailHp
            : previousHp;
          player.healthTrailHp = nextHp < previousHp
            ? Math.max(currentTrail, previousHp)
            : Math.min(currentTrail, previousHp);
          player.healthTrailDirection = nextHp < previousHp ? "damage" : "heal";
        }
        player.hp = nextHp;
        player.clanId = row[6];
        if (player.id !== game.selfId) {
          player.selectedItemId = row[7];
          const selectedDefinition = getDefinition(row[7]);
          if (selectedDefinition && ["tool", "weapon"].includes(selectedDefinition.kind)) {
            player.lastWeaponItemId = row[7];
          }
        }
        player.chatText = row[8];
        player.ally = row[9];
        player.attackSeq = row[10];
        player.equippedHelmetId = Number.isInteger(row[11]) ? row[11] : null;

        applyAttackSequence(player, previousSeq, player.attackSeq);
      }
    }

    for (const [id, player] of game.players) {
      if (seenPlayers.has(id)) continue;
      game.players.delete(id);
      if (id === game.selfId) {
        returnToLobby();
        return;
      }
    }

    const nextBuildings = new Map();
    for (const row of data.buildings) {
      if (!Array.isArray(row) || row.length !== 7 || !Number.isInteger(row[0])) continue;
      const previous = game.buildings.get(row[0]);
      const building = previous || { id: row[0], wobble: null };
      building.type = row[1];
      building.x = row[2];
      building.y = row[3];
      building.angle = row[4];
      building.hp = row[5];
      building.relation = row[6];
      nextBuildings.set(building.id, building);
    }
    game.buildings = nextBuildings;

    if (Array.isArray(data.hitImpacts)) {
      const now = performance.now();
      for (const impact of data.hitImpacts) {
        if (!Array.isArray(impact) || impact.length !== 3 || !Number.isFinite(impact[2])) continue;
        const object = impact[0] === "obstacle"
          ? game.obstacleById.get(impact[1])
          : game.buildings.get(impact[1]);
        if (object) object.wobble = { startTime: now, duration: 200, angle: impact[2] };
      }
    }
  }

  function updateResourcePanel() {
    dom.treeCount.textContent = Math.floor(game.resources.tree);
    dom.stoneCount.textContent = Math.floor(game.resources.stone);
    dom.goldCount.textContent = Math.floor(game.resources.gold);
    dom.bushCount.textContent = Math.floor(game.resources.bush);
    dom.killCount.textContent = game.killCount;
  }

  function inventorySlotForItem(itemId) {
    return INVENTORY_SLOTS[itemId] || null;
  }

  function inventoryDisplayName(itemId, fallback = "") {
    return inventorySlotForItem(itemId)?.name || fallback;
  }

  function inventoryDisplayDescription(itemId, fallback = "") {
    return inventorySlotForItem(itemId)?.description || fallback;
  }

  function canAfford(cost = {}) {
    return Object.entries(cost).every(([resource, amount]) => game.resources[resource] >= amount);
  }

  function effectiveItemCost(definition) {
    if (!definition?.cost) return null;
    const equippedHelmet = getHelmetDefinition(game.equippedHelmetId);
    const multiplier = definition.kind === "food"
      ? equippedHelmet?.appleCostMultiplier ?? 1
      : 1;
    return Object.fromEntries(
      Object.entries(definition.cost).map(([resource, amount]) => [
        resource,
        Math.round(amount * multiplier)
      ])
    );
  }

  function inventoryTitleForDefinition(definition) {
    const displayName = inventoryDisplayName(definition.id, definition.name);
    const displayDescription = inventoryDisplayDescription(definition.id, definition.description);
    const cost = effectiveItemCost(definition);
    const costText = cost
      ? ` Cost: ${Object.entries(cost).map(([key, value]) => `${value} ${key}`).join(", ")}.`
      : "";
    return `${displayName} — ${displayDescription}${costText}`;
  }

  function createInventoryArt(meta) {
    if (!meta?.art) return null;
    const art = document.createElement("div");
    art.className = `inventory-art ${meta.art.type === "windmill" ? "windmill-art" : "single-art"}`;
    const artSizePercent = ((meta.art.size || 68) / 122) * 100;
    const artTopPercent = ((meta.art.top || 5) / 122) * 100;
    art.style.setProperty("--inventory-art-size", `${artSizePercent}%`);
    art.style.setProperty("--inventory-art-top", `${artTopPercent}%`);
    if (meta.art.type === "windmill") {
      const base = document.createElement("img");
      base.src = meta.art.baseImage;
      base.alt = "";
      const rotate = document.createElement("img");
      rotate.src = meta.art.rotateImage;
      rotate.alt = "";
      art.append(base, rotate);
      return art;
    }
    const image = document.createElement("img");
    image.src = meta.art.image;
    image.alt = "";
    image.style.setProperty("--inventory-rotation", `${meta.art.rotationDeg || 0}deg`);
    art.append(image);
    return art;
  }

  function hideInventoryCostPreview() {
    dom.inventoryCostPreview.hidden = true;
    dom.inventoryCostPreview.replaceChildren();
    syncToastVisibility();
  }

  function showInventoryCostPreview(definition) {
    if (!definition?.cost) {
      hideInventoryCostPreview();
      return;
    }

    const title = document.createElement("strong");
    title.className = "inventory-cost-title";
    title.textContent = `${inventoryDisplayName(definition.id, definition.name)} cost`;
    const costs = document.createElement("div");
    costs.className = "inventory-cost-items";

    for (const [resource, amount] of Object.entries(effectiveItemCost(definition))) {
      const item = document.createElement("span");
      item.className = "inventory-cost-item";
      const image = document.createElement("img");
      image.src = VISUALS.RESOURCES[resource]?.image || "";
      image.alt = "";
      const count = document.createElement("b");
      count.className = "resource-value";
      count.dataset.resource = resource;
      count.textContent = amount;
      const label = document.createElement("small");
      label.textContent = resource;
      item.append(image, count, label);
      costs.append(item);
    }

    dom.inventoryCostPreview.replaceChildren(title, costs);
    dom.inventoryCostPreview.hidden = false;
    syncToastVisibility();
  }

  function buildInventory() {
    hideInventoryCostPreview();
    dom.inventory.replaceChildren();
    inventoryCells.clear();
    const order = INVENTORY_ORDER;

    for (const itemId of order) {
      const definition = getDefinition(itemId);
      if (!definition) continue;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "inventory-cell";
      const meta = inventorySlotForItem(itemId);
      const displayName = inventoryDisplayName(itemId, definition.name);
      const displayDescription = inventoryDisplayDescription(itemId, definition.description);
      cell.title = inventoryTitleForDefinition(definition);

      const key = document.createElement("span");
      key.className = "slot-key";
      key.textContent = primaryKeyForItem(itemId);
      cell.append(key);

      let limit = null;
      if (definition.kind === "build") {
        limit = document.createElement("span");
        limit.className = "slot-limit";
        cell.append(limit);
      }

      const art = createInventoryArt(meta);
      if (art) cell.append(art);

      const labels = document.createElement("span");
      labels.className = "inventory-labels";

      const name = document.createElement("span");
      name.className = "slot-name";
      name.textContent = displayName;

      const description = document.createElement("span");
      description.className = "slot-description";
      description.textContent = displayDescription;

      labels.append(name, description);
      cell.append(labels);

      const cooldown = document.createElement("span");
      cooldown.className = "cooldown-overlay";
      cooldown.hidden = true;
      cell.append(cooldown);

      cell.addEventListener("click", () => {
        selectItem(itemId);
        cell.blur();
      });
      cell.addEventListener("pointerenter", () => showInventoryCostPreview(definition));
      cell.addEventListener("pointerleave", hideInventoryCostPreview);
      cell.addEventListener("focus", () => showInventoryCostPreview(definition));
      cell.addEventListener("blur", hideInventoryCostPreview);
      dom.inventory.append(cell);
      inventoryCells.set(itemId, { cell, key, limit, cooldown });
    }
  }

  function updateInventory() {
    for (const [itemId, parts] of inventoryCells) {
      parts.key.textContent = primaryKeyForItem(itemId);
      const definition = getDefinition(itemId);
      if (definition) parts.cell.title = inventoryTitleForDefinition(definition);
      if (parts.limit) {
        const maximum = maximumBuildingsPerType();
        const count = definition?.type ? (game.buildCounts[definition.type] || 0) : 0;
        parts.limit.textContent = `${count}/${maximum}`;
        parts.limit.classList.toggle("at-limit", count >= maximum);
      }
    }
  }

  function updateCooldownOverlays(now) {
    for (const [itemId, parts] of inventoryCells) {
      const cooldown = game.cooldownVisuals.get(itemId);
      if (!cooldown || now >= cooldown.end) {
        parts.cooldown.hidden = true;
        if (cooldown) game.cooldownVisuals.delete(itemId);
        continue;
      }
      const ratio = (cooldown.end - now) / (cooldown.end - cooldown.start);
      parts.cooldown.hidden = false;
      parts.cooldown.style.transform = `scaleY(${Math.max(0, Math.min(1, ratio))})`;
    }
  }

  function buildLimitReached(definition) {
    if (definition?.kind !== "build" || !definition.type) return false;
    const maximum = maximumBuildingsPerType();
    return (game.buildCounts[definition.type] || 0) >= maximum;
  }

  function selectItem(itemId) {
    const definition = getDefinition(itemId);
    if (game.mode !== "game" || !definition) return;

    const self = game.players.get(game.selfId);

    if (game.selectedItemId === itemId) {
      if (definition.kind === "food" || definition.kind === "build") {
        returnToLastHeldTool();
      } else if (["tool", "weapon"].includes(definition.kind) && game.mouseDown) {
        tryStartHitting();
      }
      return;
    }

    if (definition.kind === "food" && self?.hp >= game.config.PLAYER.maxHp) return;
    if (buildLimitReached(definition)) {
      showToast("Build limit reached.");
      return;
    }

    const isCombatItem = definition.kind === "tool" || definition.kind === "weapon";
    if (!isCombatItem) stopAttackIntent();

    game.selectedItemId = itemId;
    if (self && isCombatItem) {
      const heldItemChanged = self.selectedItemId !== itemId;
      self.selectedItemId = itemId;
      self.lastWeaponItemId = itemId;
      if (heldItemChanged) send([CLIENT_PACKET.EQUIP_WEAPON, itemId]);
    }
    updateInventory();

    if (isCombatItem && game.mouseDown) tryStartHitting();
  }

  function returnToLastHeldTool() {
    const self = game.players.get(game.selfId);
    const fallbackItemId = self?.lastWeaponItemId || ITEM_ID.SWORD;
    if (getDefinition(fallbackItemId)) selectItem(fallbackItemId);
  }

  function useSelectedApple() {
    const self = game.players.get(game.selfId);
    const apple = getDefinition(ITEM_ID.APPLE);
    if (!self || !apple || game.selectedItemId !== apple.id) return;
    if (self.hp < game.config.PLAYER.maxHp) {
      const appleCost = effectiveItemCost(apple);
      if (!canAfford(appleCost)) {
        const [resource, amount] = Object.entries(appleCost)[0];
        showToast(`You need ${amount} ${resource}.`);
      } else {
        send([CLIENT_PACKET.USE_APPLE]);
      }
    }
    returnToLastHeldTool();
  }

  function updateLeaderboard(rows) {
    dom.leaderboardRows.replaceChildren();
    for (const row of rows.slice(0, 10)) {
      if (!Array.isArray(row) || row.length !== 2) continue;
      const item = document.createElement("li");
      const name = document.createElement("span");
      const gold = document.createElement("b");
      gold.className = "resource-value";
      gold.dataset.resource = "gold";
      name.textContent = String(row[0]);
      gold.textContent = Math.floor(Number(row[1]) || 0);
      item.append(name, gold);
      dom.leaderboardRows.append(item);
    }
  }

  function updateClanData(data) {
    const clans = Array.isArray(data.clans) ? data.clans : [];
    game.clanData = {
      clans,
      selfClan: data.selfClan || null,
      requests: Array.isArray(data.requests) ? data.requests : []
    };
    game.clanById = new Map(
      clans
        .filter((row) => Array.isArray(row) && Number.isInteger(row[0]))
        .map((row) => [row[0], row])
    );
    renderClanModal();
    renderClanRequestPopups();
  }

  function makeMiniButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mini-button ${className || ""}`.trim();
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderClanRequestPopups() {
    dom.clanRequestPopups.replaceChildren();
    for (const request of game.clanData.requests) {
      if (!Array.isArray(request) || request.length !== 2) continue;
      const card = document.createElement("div");
      card.className = "request-card";
      const copy = document.createElement("p");
      copy.textContent = `${request[1]} wants to join your clan.`;
      const actions = document.createElement("div");
      actions.className = "mini-actions";
      actions.append(
        makeMiniButton("Accept", "accept", () => send([CLIENT_PACKET.ANSWER_CLAN_REQUEST, request[0], true])),
        makeMiniButton("Reject", "danger", () => send([CLIENT_PACKET.ANSWER_CLAN_REQUEST, request[0], false]))
      );
      card.append(copy, actions);
      dom.clanRequestPopups.append(card);
    }
  }

  function emptyCopy(text) {
    const element = document.createElement("div");
    element.className = "empty-copy";
    element.textContent = text;
    return element;
  }

  function renderClanModal() {
    dom.clanModalBody.replaceChildren();
    const data = game.clanData;

    if (!data.selfClan) {
      const create = document.createElement("div");
      create.className = "clan-create";
      const input = document.createElement("input");
      input.className = "text-field";
      input.maxLength = game.config?.CLAN?.maxNameLength || 16;
      input.placeholder = "New clan name";
      input.autocomplete = "off";
      const createButton = document.createElement("button");
      createButton.type = "button";
      createButton.className = "primary-button";
      createButton.textContent = "Create";
      const submit = () => {
        const name = input.value.trim();
        if (name) send([CLIENT_PACKET.CREATE_CLAN, name]);
      };
      createButton.addEventListener("click", submit);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submit();
      });
      create.append(input, createButton);

      const title = document.createElement("p");
      title.className = "section-title";
      title.textContent = "Existing clans";
      const list = document.createElement("div");
      list.className = "data-list";

      for (const clan of data.clans) {
        if (!Array.isArray(clan) || clan.length < 3) continue;
        const row = document.createElement("div");
        row.className = "data-row";
        const info = document.createElement("div");
        const name = document.createElement("strong");
        const count = document.createElement("small");
        name.textContent = clan[1];
        count.textContent = `${clan[2]} member${clan[2] === 1 ? "" : "s"}`;
        info.append(name, count);
        const full = clan[2] >= (game.config?.CLAN?.maxMembers || 10);
        const joinButton = makeMiniButton(full ? "Full" : "Request to join", "accept", () => {
          send([CLIENT_PACKET.REQUEST_CLAN_JOIN, clan[0]]);
        });
        joinButton.disabled = full;
        row.append(info, joinButton);
        list.append(row);
      }

      dom.clanModalBody.append(create, title, list.children.length ? list : emptyCopy("No clans exist yet. Create the first one."));
      return;
    }

    const clan = data.selfClan;
    const heading = document.createElement("div");
    heading.className = "clan-heading";
    const name = document.createElement("h3");
    name.textContent = clan.name;
    heading.append(name, makeMiniButton("Leave clan", "danger", () => {
      send([CLIENT_PACKET.LEAVE_CLAN]);
    }));

    const title = document.createElement("p");
    title.className = "section-title";
    title.textContent = "Members";
    const list = document.createElement("div");
    list.className = "data-list";
    const isLeader = clan.leaderId === game.selfId;

    for (const member of clan.members || []) {
      if (!Array.isArray(member) || member.length < 3) continue;
      const row = document.createElement("div");
      row.className = "data-row";
      const info = document.createElement("div");
      const memberName = document.createElement("strong");
      const role = document.createElement("small");
      memberName.textContent = member[1];
      role.textContent = member[2] ? "Leader" : "Member";
      info.append(memberName, role);
      row.append(info);
      if (isLeader && member[0] !== game.selfId) {
        row.append(makeMiniButton("Kick", "danger", () => {
          send([CLIENT_PACKET.KICK_CLAN_MEMBER, member[0]]);
        }));
      }
      list.append(row);
    }
    dom.clanModalBody.append(heading, title, list);
  }

  function renderHelmetsModal() {
    dom.helmetsModalBody.replaceChildren();
    const helmets = Object.values(game.config?.HELMETS || {})
      .filter((helmet) => Number.isInteger(helmet.id))
      .sort((first, second) => first.goldCost - second.goldCost || first.id - second.id);

    for (const helmet of helmets) {
      const owned = game.ownedHelmetIds.has(helmet.id);
      const equipped = game.equippedHelmetId === helmet.id;
      const row = document.createElement("article");
      row.className = "helmet-row";
      row.classList.toggle("equipped", equipped);

      const image = document.createElement("img");
      image.className = "helmet-image";
      image.src = helmet.image;
      image.alt = helmet.name;

      const info = document.createElement("div");
      info.className = "helmet-info";
      const name = document.createElement("h3");
      name.textContent = helmet.name;
      const description = document.createElement("p");
      description.textContent = helmet.description;
      description.title = helmet.description;
      info.append(name, description);

      row.append(image, info);

      if (!owned) {
        const price = document.createElement("div");
        price.className = "helmet-price";
        const goldImage = document.createElement("img");
        goldImage.src = "sprites/resources/gold.png";
        goldImage.alt = "";
        const amount = document.createElement("span");
        amount.className = "resource-value";
        amount.dataset.resource = "gold";
        amount.textContent = helmet.goldCost.toLocaleString();
        price.append(goldImage, amount);
        row.append(price);
      }

      const action = document.createElement("button");
      action.type = "button";
      action.className = `helmet-action${equipped ? " equipped" : ""}`;
      action.textContent = owned ? (equipped ? "Unequip" : "Equip") : "Buy";
      action.addEventListener("click", () => {
        const packetId = owned ? CLIENT_PACKET.TOGGLE_HELMET : CLIENT_PACKET.BUY_HELMET;
        const sent = send([packetId, helmet.id]);
        if (sent && owned && !equipped) closeMajorModal();
      });
      row.append(action);
      dom.helmetsModalBody.append(row);
    }
  }

  function openMajorModal(name) {
    closeChat(false);
    hideInventoryCostPreview();
    stopHitting();
    game.openModal = name;
    document.body.classList.toggle("modal-open-from-lobby", game.mode !== "game");
    dom.modalShade.hidden = false;
    dom.clanModal.hidden = name !== "clan";
    dom.helmetsModal.hidden = name !== "helmets";
    dom.settingsModal.hidden = name !== "settings";
    dom.clanButton.classList.toggle("active", name === "clan");
    dom.helmetsButton.classList.toggle("active", name === "helmets");
    dom.settingsButton.classList.toggle("active", name === "settings");
    if (name === "clan") renderClanModal();
    if (name === "helmets") renderHelmetsModal();
    if (name === "settings") renderHotkeyRows();
  }

  function closeMajorModal() {
    game.openModal = null;
    game.capturingHotkey = null;
    document.body.classList.remove("modal-open-from-lobby");
    dom.modalShade.hidden = true;
    dom.clanModal.hidden = true;
    dom.helmetsModal.hidden = true;
    dom.settingsModal.hidden = true;
    dom.clanButton.classList.remove("active");
    dom.helmetsButton.classList.remove("active");
    dom.settingsButton.classList.remove("active");
  }

  function toggleMajorModal(name) {
    if (game.openModal === name) closeMajorModal();
    else openMajorModal(name);
  }

  function renderHotkeyRows() {
    dom.hotkeyRows.replaceChildren();
    for (const action of ACTIONS) {
      const row = document.createElement("div");
      row.className = "hotkey-row";
      const label = document.createElement("span");
      label.textContent = ACTION_LABELS[action];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hotkey-capture";
      button.textContent = displayKey(settings.hotkeys[action]);
      button.classList.toggle("listening", game.capturingHotkey === action);
      button.addEventListener("click", () => {
        game.capturingHotkey = action;
        renderHotkeyRows();
      });
      row.append(label, button);
      dom.hotkeyRows.append(row);
    }
  }

  function saveSettings() {
    saveStoredJson("swordfight.settings", {
      showPing: settings.showPing,
      showHitboxes: settings.showHitboxes
    });
    saveStoredJson("swordfight.hotkeys", settings.hotkeys);
    localStorage.setItem("swordfight.hotkeyVersion", String(HOTKEY_SCHEMA_VERSION));
    dom.pingDisplay.hidden = !settings.showPing || game.mode !== "game";
    updateInventory();
  }

  function captureHotkey(event) {
    if (!game.capturingHotkey) return false;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      game.capturingHotkey = null;
      renderHotkeyRows();
      return true;
    }

    const key = normalizeKey(event.key);
    if (/^(Digit|Numpad)[1-7]$/.test(event.code)) {
      showToast("Number keys are reserved as inventory fallbacks.");
      return true;
    }
    if (["enter", "tab", "shift", "control", "alt", "meta"].includes(key)) return true;

    const keyIsAlreadyAssigned = ACTIONS.some(
      (action) => action !== game.capturingHotkey && settings.hotkeys[action] === key
    );
    if (keyIsAlreadyAssigned) return true;

    settings.hotkeys[game.capturingHotkey] = key;
    game.capturingHotkey = null;
    saveSettings();
    renderHotkeyRows();
    return true;
  }

  function movementDirection() {
    const up = pressedMovementKeys.has("KeyW") || pressedMovementKeys.has("ArrowUp");
    const down = pressedMovementKeys.has("KeyS") || pressedMovementKeys.has("ArrowDown");
    const left = pressedMovementKeys.has("KeyA") || pressedMovementKeys.has("ArrowLeft");
    const right = pressedMovementKeys.has("KeyD") || pressedMovementKeys.has("ArrowRight");
    const vertical = up === down ? 0 : up ? -1 : 1;
    const horizontal = left === right ? 0 : left ? -1 : 1;

    if (vertical === -1 && horizontal === -1) return 5;
    if (vertical === -1 && horizontal === 1) return 6;
    if (vertical === 1 && horizontal === -1) return 7;
    if (vertical === 1 && horizontal === 1) return 8;
    if (vertical === -1) return 1;
    if (vertical === 1) return 2;
    if (horizontal === -1) return 3;
    if (horizontal === 1) return 4;
    return 0;
  }

  function sendMovementIfChanged() {
    if (game.mode !== "game") return;
    const direction = movementDirection();
    if (direction === game.lastDirection) return;
    game.lastDirection = direction;
    send([CLIENT_PACKET.MOVE, direction]);
  }

  function stopAttackIntent() {
    if (!game.attackIntentActive) return;
    game.attackIntentActive = false;
    send([CLIENT_PACKET.ATTACK, false]);
  }

  function stopHitting() {
    game.mouseDown = false;
    stopAttackIntent();
  }

  function tryStartHitting(now = performance.now()) {
    if (
      !game.mouseDown ||
      game.attackIntentActive ||
      game.mode !== "game" ||
      !game.players.has(game.selfId) ||
      now < game.attackReadyAt
    ) return false;
    const definition = getDefinition(game.selectedItemId);
    if (
      !definition ||
      (definition.kind !== "tool" && definition.kind !== "weapon")
    ) return false;

    sendCurrentAngle(now);
    if (!send([CLIENT_PACKET.ATTACK, true])) return false;
    game.attackIntentActive = true;
    predictLocalSwing(definition.id, now);
    startCooldownVisual(definition.id, now);
    lockAttackCooldown(definition.id, now);
    return true;
  }

  function stopAllInput() {
    pressedMovementKeys.clear();
    if (game.lastDirection !== 0) {
      game.lastDirection = 0;
      send([CLIENT_PACKET.MOVE, 0]);
    }
    stopHitting();
  }

  function openChat() {
    if (game.mode !== "game" || game.openModal) return;
    stopAllInput();
    dom.chatComposer.hidden = false;
    dom.chatInput.value = "";
    dom.chatCounter.textContent = `0/${dom.chatInput.maxLength}`;
    dom.chatInput.focus();
  }

  function closeChat(sendMessage) {
    if (dom.chatComposer.hidden) return;
    const text = dom.chatInput.value.trim();
    dom.chatComposer.hidden = true;
    dom.chatInput.blur();
    if (sendMessage && text) send([CLIENT_PACKET.CHAT, text]);
  }

  function handleItemHotkey(action) {
    selectItem(ACTION_ITEM_IDS[action]);
  }

  function isTextEntryTarget(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  }

  document.addEventListener("keydown", (event) => {
    if (captureHotkey(event)) return;
    if (!dom.chatComposer.hidden) return;

    if (event.key === "Escape") {
      if (game.openModal) closeMajorModal();
      return;
    }
    if (isTextEntryTarget(event.target)) return;
    if (game.mode !== "game") return;

    if (event.key === "Enter") {
      event.preventDefault();
      openChat();
      return;
    }

    const movementCodes = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (movementCodes.includes(event.code)) {
      event.preventDefault();
      pressedMovementKeys.add(event.code);
      sendMovementIfChanged();
    }

    if (!event.repeat && !game.openModal) {
      const action = actionForInput(event);
      if (action) {
        event.preventDefault();
        handleItemHotkey(action);
      }
    }
  });

  document.addEventListener("keyup", (event) => {
    if (pressedMovementKeys.delete(event.code)) sendMovementIfChanged();
  });

  dom.chatInput.addEventListener("input", () => {
    dom.chatCounter.textContent = `${dom.chatInput.value.length}/${dom.chatInput.maxLength}`;
  });
  dom.chatInput.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      closeChat(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeChat(false);
    }
  });

  function updateAimFromPointer(clientX, clientY) {
    if (game.mode !== "game") return;
    const self = game.players.get(game.selfId);
    if (!self) return;
    const screenX = self.x - game.camera.x;
    const screenY = self.y - game.camera.y;
    game.localAimAngle = Math.atan2(clientY - screenY, clientX - screenX);
    self.angle = game.localAimAngle;
    self.targetAngle = game.localAimAngle;
  }

  window.addEventListener("pointermove", (event) => updateAimFromPointer(event.clientX, event.clientY));

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || game.mode !== "game" || game.openModal || !dom.chatComposer.hidden) return;
    const definition = getDefinition(game.selectedItemId);
    if (!definition) return;
    updateAimFromPointer(event.clientX, event.clientY);

    if (definition.kind === "tool" || definition.kind === "weapon") {
      if (!game.mouseDown) {
        game.mouseDown = true;
        tryStartHitting();
      }
    } else if (definition.kind === "food") {
      useSelectedApple();
    } else if (definition.kind === "build") {
      const preview = getPlacementPreview();
      if (preview?.valid && preview.affordable && preview.underLimit) {
        sendCurrentAngle();
        if (send([CLIENT_PACKET.PLACE_BUILDING, definition.id])) returnToLastHeldTool();
      } else if (!preview?.underLimit) {
        showToast("Build limit reached.");
      } else if (preview && !preview.affordable) {
        showToast("Not enough resources.");
      }
    }
  });

  window.addEventListener("pointerup", (event) => {
    if (event.button === 0) stopHitting();
  });
  window.addEventListener("blur", stopAllInput);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  dom.joinButton.addEventListener("click", connectToServer);
  dom.nickname.addEventListener("keydown", (event) => {
    if (event.key === "Enter") connectToServer();
  });
  dom.serverPreset.addEventListener("change", () => {
    localStorage.setItem("swordfight.serverPreset", dom.serverPreset.value);
  });
  dom.clanButton.addEventListener("click", () => toggleMajorModal("clan"));
  dom.helmetsButton.addEventListener("click", () => toggleMajorModal("helmets"));
  dom.settingsButton.addEventListener("click", () => toggleMajorModal("settings"));
  dom.lobbySettingsButton.addEventListener("click", () => toggleMajorModal("settings"));
  dom.modalShade.addEventListener("click", closeMajorModal);
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeMajorModal);
  });
  dom.showPingSetting.addEventListener("change", () => {
    settings.showPing = dom.showPingSetting.checked;
    saveSettings();
  });
  dom.showHitboxesSetting.addEventListener("change", () => {
    settings.showHitboxes = dom.showHitboxesSetting.checked;
    saveSettings();
  });
  dom.resetHotkeysButton.addEventListener("click", () => {
    settings.hotkeys = { ...DEFAULT_HOTKEYS };
    settings.showPing = DEFAULT_SETTINGS.showPing;
    settings.showHitboxes = DEFAULT_SETTINGS.showHitboxes;
    dom.showPingSetting.checked = settings.showPing;
    dom.showHitboxesSetting.checked = settings.showHitboxes;
    game.capturingHotkey = null;
    saveSettings();
    renderHotkeyRows();
  });

  renderHotkeyRows();
  saveSettings();

  function imageReady(image) {
    return image && image.complete && image.naturalWidth > 0;
  }

  function drawImageCentered(image, x, y, width, height = width, rotation = 0, alpha = 1) {
    if (!imageReady(image)) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
    return true;
  }

  function nativeRenderWidth(image, scale = SPRITE_RENDER_SCALE) {
    return image.naturalWidth * scale;
  }

  function nativeRenderHeight(image, scale = SPRITE_RENDER_SCALE) {
    return image.naturalHeight * scale;
  }

  function drawImageNative(image, x, y, rotation = 0, alpha = 1, scale = SPRITE_RENDER_SCALE) {
    if (!imageReady(image)) return false;
    return drawImageCentered(
      image,
      x,
      y,
      nativeRenderWidth(image, scale),
      nativeRenderHeight(image, scale),
      rotation,
      alpha
    );
  }

  function roundedRectPath(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
  }

  function drawGrid(cameraX, cameraY, color) {
    const gridSize = 250;
    const startX = ((-cameraX % gridSize) + gridSize) % gridSize;
    const startY = ((-cameraY % gridSize) + gridSize) % gridSize;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = startX; x < canvas.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = startY; y < canvas.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  function interpolateNaturalTransition(points, inputKey, outputKey, fallback, input) {
    if (!Array.isArray(points) || points.length < 2) return fallback;
    const first = points[0];
    const last = points[points.length - 1];
    const value = clamp(input, first[inputKey], last[inputKey]);
    if (value <= first[inputKey]) return first[outputKey];

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      if (value > current[inputKey]) continue;

      const before = points[Math.max(0, index - 2)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const span = Math.max(0.0001, current[inputKey] - previous[inputKey]);
      const progress = clamp((value - previous[inputKey]) / span, 0, 1);
      const progress2 = progress * progress;
      const progress3 = progress2 * progress;
      const p0 = before[outputKey];
      const p1 = previous[outputKey];
      const p2 = current[outputKey];
      const p3 = after[outputKey];
      return 0.5 * (
        2 * p1 +
        (-p0 + p2) * progress +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * progress2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * progress3
      );
    }

    return last[outputKey];
  }

  function biomeTransitionY(points, fallbackY, normalizedX) {
    return interpolateNaturalTransition(points, "x", "y", fallbackY, normalizedX);
  }

  function traceGameBiomeEdge(points, fallbackY, cameraX, cameraY, worldWidth, worldHeight) {
    const segmentCount = Math.max(2, Math.ceil(canvas.width / 64));
    ctx.beginPath();
    for (let index = 0; index <= segmentCount; index += 1) {
      const x = canvas.width * index / segmentCount;
      const normalizedWorldX = (cameraX + x) / worldWidth;
      const y = biomeTransitionY(points, fallbackY, normalizedWorldX) * worldHeight - cameraY;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function fillGameRegionBelowEdge(
    points,
    fallbackY,
    color,
    cameraX,
    cameraY,
    worldWidth,
    worldHeight
  ) {
    traceGameBiomeEdge(points, fallbackY, cameraX, cameraY, worldWidth, worldHeight);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawGroundBiomes(cameraX, cameraY, world, biomes, outside = false) {
    const transitions = world.biomeTransitions || [];
    const firstColor = outside
      ? biomes[0].outsideBackground
      : biomes[0].background;
    ctx.fillStyle = firstColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 1; index < biomes.length; index += 1) {
      const biome = biomes[index];
      const fallbackY = biome.start;
      const color = outside ? biome.outsideBackground : biome.background;
      fillGameRegionBelowEdge(
        transitions[index - 1],
        fallbackY,
        color,
        cameraX,
        cameraY,
        game.world.width,
        game.world.height
      );
    }
  }

  function drawGameGround(cameraX, cameraY) {
    const world = { ...VISUALS.WORLD, ...(game.config?.WORLD || {}) };
    const biomes = world.biomes || [{
      start: 0,
      end: 1,
      background: world.background,
      outsideBackground: world.outsideBackground
    }];

    drawGroundBiomes(cameraX, cameraY, world, biomes, true);

    ctx.save();
    ctx.beginPath();
    ctx.rect(-cameraX, -cameraY, game.world.width, game.world.height);
    ctx.clip();
    drawGroundBiomes(cameraX, cameraY, world, biomes);
    ctx.restore();
  }

  function traceLakePath(renderContext, lake, scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0) {
    const points = lake.points;
    if (points.length < 3) return;
    const first = points[0];
    const last = points[points.length - 1];
    renderContext.beginPath();
    renderContext.moveTo(
      ((last.x + first.x) / 2) * scaleX + offsetX,
      ((last.y + first.y) / 2) * scaleY + offsetY
    );
    for (let index = 0; index < points.length; index++) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      renderContext.quadraticCurveTo(
        current.x * scaleX + offsetX,
        current.y * scaleY + offsetY,
        ((current.x + next.x) / 2) * scaleX + offsetX,
        ((current.y + next.y) / 2) * scaleY + offsetY
      );
    }
    renderContext.closePath();
  }

  function lakeScreenBounds(lake) {
    return {
      minX: lake.bounds.minX - game.camera.x,
      minY: lake.bounds.minY - game.camera.y,
      maxX: lake.bounds.maxX - game.camera.x,
      maxY: lake.bounds.maxY - game.camera.y
    };
  }

  function lakeIsVisible(bounds, margin = 24) {
    return bounds.maxX >= -margin &&
      bounds.maxY >= -margin &&
      bounds.minX <= canvas.width + margin &&
      bounds.minY <= canvas.height + margin;
  }

  function drawLakeFill(lake, style) {
    ctx.save();
    traceLakePath(ctx, lake, 1, 1, -game.camera.x, -game.camera.y);
    ctx.fillStyle = style.base;
    ctx.fill();
    ctx.restore();
  }

  function drawLakeOutline(lake, style) {
    ctx.save();
    traceLakePath(ctx, lake, 1, 1, -game.camera.x, -game.camera.y);
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }

  function drawMapSurface() {
    drawGameGround(game.camera.x, game.camera.y);

    const visibleLakes = [];
    for (const lake of game.lakes) {
      const style = VISUALS.LAKES?.[lake.type];
      if (!style || !lakeIsVisible(lakeScreenBounds(lake))) continue;
      visibleLakes.push({ lake, style });
      drawLakeFill(lake, style);
    }

    drawGrid(game.camera.x, game.camera.y, VISUALS.WORLD.grid);
    for (const { lake, style } of visibleLakes) drawLakeOutline(lake, style);
  }

  function wobbleOffset(object, now) {
    if (!object.wobble) return { x: object.x, y: object.y };
    const elapsed = now - object.wobble.startTime;
    const progress = Math.min(elapsed / object.wobble.duration, 1);
    if (progress >= 1) {
      object.wobble = null;
      return { x: object.x, y: object.y };
    }
    const strength = Math.sin(progress * Math.PI) * 8;
    return {
      x: object.x + Math.cos(object.wobble.angle) * strength,
      y: object.y + Math.sin(object.wobble.angle) * strength
    };
  }

  function visibleOnScreen(x, y, margin = 80) {
    return x >= -margin && y >= -margin && x <= canvas.width + margin && y <= canvas.height + margin;
  }

  function drawObstacle(obstacle, now) {
    const definition = game.config.RESOURCES[obstacle.type];
    if (!definition) return;
    const position = wobbleOffset(obstacle, now);
    const x = position.x - game.camera.x;
    const y = position.y - game.camera.y;
    const image = getImage(definition.image);
    const scale = definition.scale ?? SPRITE_RENDER_SCALE;
    const margin = imageReady(image)
      ? Math.max(nativeRenderWidth(image, scale), nativeRenderHeight(image, scale)) / 2
      : 250 * scale;
    if (!visibleOnScreen(x, y, margin)) return;

    drawImageNative(image, x, y, 0, 1, scale);
  }

  function drawWindmillSprite(render, x, y, alpha = 1, options = {}) {
    const baseImage = getImage(render?.baseImage);
    const rotateImage = getImage(render?.rotateImage);
    drawImageNative(baseImage, x, y, 0, alpha, render?.scale ?? 1);
    const spinAngle = options.staticRotor ? 0 : performance.now() * (render?.spinRate ?? 0.0032);
    drawImageNative(rotateImage, x, y, spinAngle, alpha, render?.rotateScale ?? render?.scale ?? 1);
  }

  function drawBuildingSprite(building, x, y, alpha = 1, options = {}) {
    const definition = getBuildDefinition(building.type);
    if (!definition) return;
    const rotation = building.angle || 0;

    if (building.type === "gatherer") {
      drawWindmillSprite(definition.render, x, y, alpha, options);
    } else if (building.type === "wall") {
      const wallImage = getImage(definition.render?.image);
      const scale = definition.render?.scale ?? SPRITE_RENDER_SCALE;
      drawImageNative(wallImage, x, y, rotation, alpha, scale);
    } else {
      drawImageNative(
        getImage(definition.render?.image),
        x,
        y,
        rotation,
        alpha,
        definition.render?.scale ?? SPRITE_RENDER_SCALE
      );
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = BUILDING_INDICATOR_COLORS[building.relation]
      || BUILDING_INDICATOR_COLORS[BUILDING_RELATION.ENEMY];
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(15, 21, 16, 0.9)";
    ctx.stroke();
    ctx.restore();

  }

  function drawBuilding(building, now) {
    const position = wobbleOffset(building, now);
    const x = position.x - game.camera.x;
    const y = position.y - game.camera.y;
    if (!visibleOnScreen(x, y, 240)) return;
    drawBuildingSprite(building, x, y);
  }

  function drawHeldItemLocal(definition) {
    if (!definition) return false;
    const render = definition.render || {};
    const image = getImage(render.image);
    if (!imageReady(image)) return false;

    const scale = render.scale ?? SPRITE_RENDER_SCALE;
    const itemWidth = Number.isFinite(render.width)
      ? render.width
      : nativeRenderWidth(image, scale);
    const itemHeight = Number.isFinite(render.height)
      ? render.height
      : nativeRenderHeight(image, scale);
    const itemOffsetX = Number.isFinite(render.offsetX) ? render.offsetX : 0;
    const itemOffsetY = Number.isFinite(render.offsetY) ? render.offsetY : 0;

    // Exact player-local placement. The shared player transform supplies all rotation.
    const itemX = 29 - itemWidth / 2 + itemOffsetX;
    const itemY = -48 + itemOffsetY;
    ctx.drawImage(image, itemX, itemY, itemWidth, itemHeight);
    return true;
  }

  function smoothStep(progress) {
    const clamped = clamp(progress, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
  }

  function swingPose(player, now) {
    if (!player.swing) return { swingAngle: 0, progress: 0 };
    const progress = Math.min((now - player.swing.startTime) / player.swing.duration, 1);
    if (progress >= 1) {
      player.swing = null;
      return { swingAngle: 0, progress: 0 };
    }

    // The complete player assembly rotates by facing angle minus this melee angle.
    const forwardStrike = 160 * Math.PI / 180;
    const swingAngle = progress < 0.55
      ? forwardStrike * smoothStep(progress / 0.55)
      : forwardStrike * (1 - smoothStep((progress - 0.55) / 0.45));
    return { swingAngle, progress };
  }

  function clanPresentationForPlayer(player) {
    if (player.clanId === null || player.clanId === undefined) return null;
    const clan = game.clanById.get(player.clanId);
    if (!clan || typeof clan[1] !== "string") return null;
    return {
      tag: `[${clan[1]}] `,
      isLeader: clan[3] === player.id
    };
  }

  function drawPlayerName(player, x, y) {
    const clan = clanPresentationForPlayer(player);
    const nameColor = player.id === game.selfId ? "#f4f6e9" : "#fff1ee";

    if (!clan) {
      ctx.strokeText(player.nick, x, y);
      ctx.fillStyle = nameColor;
      ctx.fillText(player.nick, x, y);
      return;
    }

    const tagWidth = ctx.measureText(clan.tag).width;
    const nameWidth = ctx.measureText(player.nick).width;
    const startX = x - (tagWidth + nameWidth) / 2;
    const tagColor = clan.isLeader ? "#f2c65c" : "#58adff";

    ctx.save();
    ctx.textAlign = "left";
    ctx.strokeText(clan.tag, startX, y);
    ctx.strokeText(player.nick, startX + tagWidth, y);
    ctx.fillStyle = tagColor;
    ctx.fillText(clan.tag, startX, y);
    ctx.fillStyle = nameColor;
    ctx.fillText(player.nick, startX + tagWidth, y);
    ctx.restore();
  }

  function drawPlayerOverlay(player, x, y, bodySize) {
    const maxHp = game.config.PLAYER.maxHp;
    const barWidth = Math.max(78, bodySize * 0.86);
    const barHeight = 8;
    const barOutline = 3;
    const barY = y + bodySize / 2 + 10;
    roundedRectPath(
      x - barWidth / 2 - barOutline,
      barY - barOutline,
      barWidth + barOutline * 2,
      barHeight + barOutline * 2,
      6
    );
    ctx.fillStyle = "rgba(11, 17, 12, 0.9)";
    ctx.fill();
    const barX = x - barWidth / 2;
    const currentRatio = clamp(player.hp / maxHp, 0, 1);
    const trailHp = Number.isFinite(player.healthTrailHp) ? player.healthTrailHp : player.hp;
    const trailRatio = clamp(trailHp / maxHp, 0, 1);
    const currentWidth = barWidth * currentRatio;
    const trailWidth = barWidth * trailRatio;
    const mainColor = player.ally ? "#9bd85d" : "#ed655e";
    const transitionColor = player.ally ? "#bce88c" : "#f2938d";

    ctx.save();
    roundedRectPath(barX, barY, barWidth, barHeight, 3);
    ctx.clip();

    if (player.healthTrailDirection === "damage" && trailWidth > currentWidth + 0.1) {
      ctx.fillStyle = transitionColor;
      ctx.fillRect(barX, barY, trailWidth, barHeight);
      ctx.fillStyle = mainColor;
      ctx.fillRect(barX, barY, currentWidth, barHeight);
    } else if (player.healthTrailDirection === "heal" && currentWidth > trailWidth + 0.1) {
      ctx.fillStyle = transitionColor;
      ctx.fillRect(barX, barY, currentWidth, barHeight);
      ctx.fillStyle = mainColor;
      ctx.fillRect(barX, barY, trailWidth, barHeight);
    } else {
      ctx.fillStyle = mainColor;
      ctx.fillRect(barX, barY, currentWidth, barHeight);
    }
    ctx.restore();

    const nameTextSize = 27;
    const chatTextSize = 24;
    ctx.font = `900 ${nameTextSize}px "Baloo Paaji 2", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(11, 17, 12, 0.88)";
    const nameY = y - bodySize / 2 - 13;
    drawPlayerName(player, x, nameY);

    if (player.chatText) {
      const lineHeight = 28;
      const verticalPadding = 16;
      const horizontalPadding = 13;
      const nameToBubbleGap = 7;
      ctx.font = `800 ${chatTextSize}px "Baloo Paaji 2", system-ui, sans-serif`;
      const fullSizeTextWidth = ctx.measureText(player.chatText).width;
      const availableTextWidth = Math.max(110, canvas.width - horizontalPadding * 2 - 24);
      const fittedChatTextSize = fullSizeTextWidth > availableTextWidth
        ? Math.max(10, chatTextSize * availableTextWidth / fullSizeTextWidth)
        : chatTextSize;
      ctx.font = `800 ${fittedChatTextSize}px "Baloo Paaji 2", system-ui, sans-serif`;
      const textWidth = Math.max(ctx.measureText(player.chatText).width, 50);
      const width = textWidth + horizontalPadding * 2;
      const height = lineHeight + verticalPadding;
      const bubbleBottom = nameY - nameTextSize / 2 - nameToBubbleGap;
      const bubbleY = bubbleBottom - height;
      roundedRectPath(x - width / 2, bubbleY, width, height, 13);
      ctx.fillStyle = "rgba(21, 31, 22, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#f4f4eb";
      const textOpticalOffsetY = 2.5;
      ctx.fillText(
        player.chatText,
        x,
        bubbleY + verticalPadding / 2 + lineHeight / 2 + textOpticalOffsetY
      );
    }
  }

  function drawPlayerAttachmentDebug(playerVisual) {
    if (!settings.showHitboxes) return;
    const points = [
      [0, 0, "#ffffff"],
      [playerVisual.lowerHandCenter.x, playerVisual.lowerHandCenter.y, "#7ee7ff"],
      [playerVisual.upperHandCenter.x, playerVisual.upperHandCenter.y, "#ffca68"]
    ];
    for (const [x, y, color] of points) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(20, 25, 20, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawPlayer(player, now) {
    const x = player.x - game.camera.x;
    const y = player.y - game.camera.y;
    if (!visibleOnScreen(x, y, 300)) return;

    const playerVisual = VISUALS.PLAYER;
    const bodyImage = getImage(playerVisual.bodyImage);
    const handImage = getImage(playerVisual.handImage);
    const bodyWidth = playerVisual.bodyWidth;
    const bodyHeight = playerVisual.bodyHeight;
    const handWidth = playerVisual.handWidth;
    const handHeight = playerVisual.handHeight;
    const aimAngle = player.id === game.selfId ? game.localAimAngle : player.angle;
    const pose = swingPose(player, now);

    const selectedDefinition = getDefinition(player.selectedItemId);
    const heldDefinition = selectedDefinition && ["tool", "weapon"].includes(selectedDefinition.kind)
      ? selectedDefinition
      : getDefinition(player.lastWeaponItemId || 2);

    function drawHandsLocal() {
      if (!imageReady(handImage)) return;
      const lower = playerVisual.lowerHandCenter;
      ctx.drawImage(
        handImage,
        lower.x - handWidth / 2,
        lower.y - handHeight / 2,
        handWidth,
        handHeight
      );

      const upper = playerVisual.upperHandCenter;
      ctx.save();
      ctx.translate(upper.x, upper.y);
      ctx.scale(1, -1);
      ctx.drawImage(handImage, -handWidth / 2, -handHeight / 2, handWidth, handHeight);
      ctx.restore();
    }

    function drawBodyLocal() {
      if (!imageReady(bodyImage)) return;
      ctx.drawImage(bodyImage, -bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight);
    }

    function drawHelmetLocal() {
      const helmet = getHelmetDefinition(player.equippedHelmetId);
      const helmetImage = getImage(helmet?.image);
      if (!imageReady(helmetImage)) return;
      const helmetWidth = nativeRenderWidth(helmetImage, SPRITE_RENDER_SCALE);
      const helmetHeight = nativeRenderHeight(helmetImage, SPRITE_RENDER_SCALE);
      ctx.drawImage(
        helmetImage,
        -helmetWidth / 2,
        -helmetHeight / 2,
        helmetWidth,
        helmetHeight
      );
    }

    // Every player part is drawn in one player-local coordinate system.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(aimAngle - pose.swingAngle);

    // Melee items stay beneath the hands and body. Food/build previews are
    // rendered separately in world space, exactly like placement previews.
    drawHeldItemLocal(heldDefinition);
    drawHandsLocal();
    drawBodyLocal();
    drawHelmetLocal();

    drawPlayerAttachmentDebug(playerVisual);
    ctx.restore();

    const bodySize = Math.max(bodyWidth, bodyHeight);
    drawPlayerOverlay(player, x, y, bodySize);
  }

  function updateHealthTrail(player, now, deltaMs) {
    if (!Number.isFinite(player.healthTrailHp)) player.healthTrailHp = player.hp;

    const difference = player.hp - player.healthTrailHp;
    if (Math.abs(difference) < 0.02) {
      player.healthTrailHp = player.hp;
      player.healthTrailDirection = null;
      return;
    }

    // Exponential time-based easing begins on the first rendered frame and
    // produces the same curve at 60 Hz, 144 Hz, or any other refresh rate.
    const amount = 1 - Math.exp(-deltaMs * HEALTH_TRAIL_LERP_RATE);
    player.healthTrailHp += difference * amount;
  }

  function updateRenderPlayers(now, deltaMs) {
    const angleAmount = 1 - Math.exp(-deltaMs * ANGLE_LERP_RATE);
    for (const player of game.players.values()) {
      const sampled = samplePlayerPosition(player, now);
      player.x = sampled.x;
      player.y = sampled.y;
      if (player.id === game.selfId) player.angle = game.localAimAngle;
      else player.angle = lerpAngle(player.angle, player.targetAngle, angleAmount);
      updateHealthTrail(player, now, deltaMs);
    }
  }

  function updateCamera() {
    const self = game.players.get(game.selfId);
    if (!self) return;

    // The local player is already sampled from time-based interpolation.
    // Following that exact position avoids a second smoothing phase and keeps
    // world motion and the player phase-locked at every display refresh rate.
    game.camera.x = self.x - canvas.width / 2;
    game.camera.y = self.y - canvas.height / 2;
  }

  function previewPositionInFrontOfPlayer(player, distance) {
    return {
      x: player.x + Math.cos(game.localAimAngle) * distance,
      y: player.y + Math.sin(game.localAimAngle) * distance
    };
  }

  function drawApplePreview() {
    const player = game.players.get(game.selfId);
    const definition = getDefinition(game.selectedItemId);
    if (!player || definition?.kind !== "food") return;

    const render = definition.render || {};
    const image = getImage(render.image);
    if (!imageReady(image)) return;

    // Match the building-preview path: place the selected object in world
    // space in front of the local player, rotate it with the aim direction,
    // and draw it after players so it is always visible. Unlike buildings,
    // food has no collision/range debug shapes.
    const position = previewPositionInFrontOfPlayer(
      player,
      Number.isFinite(render.previewDistance) ? render.previewDistance : 74.5
    );
    drawImageNative(
      image,
      position.x - game.camera.x,
      position.y - game.camera.y,
      game.localAimAngle,
      1,
      render.scale ?? SPRITE_RENDER_SCALE
    );
  }

  function getPlacementPreview() {
    if (game.mode !== "game") return null;
    const definition = getDefinition(game.selectedItemId);
    const player = game.players.get(game.selfId);
    if (!definition || definition.kind !== "build" || !player) return null;

    const position = previewPositionInFrontOfPlayer(player, definition.placeDistance);
    const { x, y } = position;
    const maximum = maximumBuildingsPerType();
    const underLimit = (game.buildCounts[definition.type] || 0) < maximum;
    let valid = underLimit;
    if (
      x - definition.radius < 0 ||
      y - definition.radius < 0 ||
      x + definition.radius > game.world.width ||
      y + definition.radius > game.world.height
    ) valid = false;

    if (valid && circleIntersectsAnyLake(game.lakes, x, y, definition.radius)) valid = false;

    if (valid) {
      for (const obstacle of game.obstacles) {
        if (circlesOverlap(x, y, definition.radius, obstacle.x, obstacle.y, obstacle.radius)) {
          valid = false;
          break;
        }
      }
    }
    if (valid) {
      for (const building of game.buildings.values()) {
        const otherDefinition = getBuildDefinition(building.type);
        if (otherDefinition && circlesOverlap(x, y, definition.radius, building.x, building.y, otherDefinition.radius)) {
          valid = false;
          break;
        }
      }
    }

    return { x, y, valid, affordable: canAfford(definition.cost), underLimit, definition };
  }

  function drawPlacementPreview() {
    const preview = getPlacementPreview();
    const player = game.players.get(game.selfId);
    if (!preview || !player) return;
    const playerX = player.x - game.camera.x;
    const playerY = player.y - game.camera.y;
    const valid = preview.valid && preview.affordable && preview.underLimit;

    if (settings.showHitboxes) {
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = valid ? "rgba(218, 244, 157, 0.7)" : "rgba(255, 105, 98, 0.76)";
      ctx.beginPath();
      ctx.arc(playerX, playerY, preview.definition.placeDistance, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = valid ? "rgba(188, 230, 111, 0.13)" : "rgba(240, 87, 80, 0.15)";
      ctx.beginPath();
      ctx.arc(preview.x - game.camera.x, preview.y - game.camera.y, preview.definition.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawBuildingSprite(
      {
        type: preview.definition.type,
        angle: game.localAimAngle,
        relation: BUILDING_RELATION.OWNER
      },
      preview.x - game.camera.x,
      preview.y - game.camera.y,
      valid ? 0.58 : 0.36
    );
  }


  function drawDebugShapes() {
    if (!settings.showHitboxes) return;
    ctx.save();
    ctx.lineWidth = 1.5;

    ctx.strokeStyle = "rgba(59, 87, 229, 0.72)";
    for (const obstacle of game.obstacles) {
      const x = obstacle.x - game.camera.x;
      const y = obstacle.y - game.camera.y;
      if (!visibleOnScreen(x, y, obstacle.radius + 5)) continue;
      ctx.beginPath();
      ctx.arc(x, y, obstacle.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const building of game.buildings.values()) {
      const definition = getBuildDefinition(building.type);
      if (!definition) continue;
      ctx.strokeStyle = building.type === "trap" ? "rgba(185, 79, 219, 0.85)" : "rgba(244, 154, 45, 0.78)";
      ctx.beginPath();
      ctx.arc(building.x - game.camera.x, building.y - game.camera.y, definition.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const player of game.players.values()) {
      const x = player.x - game.camera.x;
      const y = player.y - game.camera.y;
      ctx.strokeStyle = player.ally ? "rgba(84, 226, 107, 0.9)" : "rgba(246, 70, 67, 0.9)";
      ctx.beginPath();
      ctx.arc(x, y, game.config.PLAYER.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }

    const self = game.players.get(game.selfId);
    const selected = getDefinition(game.selectedItemId);
    if (self && (selected?.kind === "tool" || selected?.kind === "weapon")) {
      const x = self.x - game.camera.x;
      const y = self.y - game.camera.y;
      const halfCone = (game.config.COMBAT.coneDegrees * Math.PI / 180) / 2;
      ctx.fillStyle = "rgba(255, 235, 103, 0.11)";
      ctx.strokeStyle = "rgba(255, 235, 103, 0.72)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, selected.range, game.localAimAngle - halfCone, game.localAimAngle + halfCone);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMinimapPlayerDot(
    player,
    fillColor,
    radiusCssPx,
    width,
    height,
    pixelRatio,
    playerRadius,
    playableWidth,
    playableHeight
  ) {
    const normalizedX = clamp((player.x - playerRadius) / playableWidth, 0, 1);
    const normalizedY = clamp((player.y - playerRadius) / playableHeight, 0, 1);
    const dotRadius = radiusCssPx * pixelRatio;
    const dotX = dotRadius + normalizedX * Math.max(0, width - dotRadius * 2);
    const dotY = dotRadius + normalizedY * Math.max(0, height - dotRadius * 2);

    minimapCtx.beginPath();
    minimapCtx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    minimapCtx.fillStyle = fillColor;
    minimapCtx.fill();
    minimapCtx.strokeStyle = "rgba(0, 0, 0, 0.48)";
    minimapCtx.lineWidth = 1.5 * pixelRatio;
    minimapCtx.stroke();
  }

  function drawMinimap() {
    const self = game.players.get(game.selfId);
    const cssWidth = dom.minimapCanvas.clientWidth || 180;
    const cssHeight = dom.minimapCanvas.clientHeight || 180;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(cssWidth * pixelRatio));
    const height = Math.max(1, Math.round(cssHeight * pixelRatio));

    if (dom.minimapCanvas.width !== width || dom.minimapCanvas.height !== height) {
      dom.minimapCanvas.width = width;
      dom.minimapCanvas.height = height;
    }

    minimapCtx.clearRect(0, 0, width, height);
    const biomes = VISUALS.WORLD.biomes || [{
      start: 0,
      end: 1,
      background: VISUALS.WORLD.background
    }];
    for (const biome of biomes) {
      const top = Math.round(height * biome.start);
      const bottom = Math.round(height * biome.end);
      minimapCtx.fillStyle = biome.background;
      minimapCtx.fillRect(0, top, width, bottom - top);
    }
    if (!self || !game.world.width || !game.world.height) return;

    const playerRadius = game.config?.PLAYER?.radius || 0;
    const playableWidth = Math.max(1, game.world.width - playerRadius * 2);
    const playableHeight = Math.max(1, game.world.height - playerRadius * 2);
    const selfClan = game.clanData.selfClan;

    if (selfClan && Array.isArray(selfClan.members)) {
      for (const member of selfClan.members) {
        if (!Array.isArray(member) || member[0] === game.selfId) continue;
        const clanmate = game.players.get(member[0]);
        if (!clanmate) continue;
        drawMinimapPlayerDot(
          clanmate,
          member[2] ? "#f2c65c" : "#58adff",
          3.75,
          width,
          height,
          pixelRatio,
          playerRadius,
          playableWidth,
          playableHeight
        );
      }
    }

    // Draw the local player last so its white marker always has priority.
    drawMinimapPlayerDot(
      self,
      "#ffffff",
      4.5,
      width,
      height,
      pixelRatio,
      playerRadius,
      playableWidth,
      playableHeight
    );
  }

  function drawGame(now, deltaMs) {
    updateRenderPlayers(now, deltaMs);
    updateCamera();
    drawMapSurface();

    const buildings = Array.from(game.buildings.values()).sort((a, b) => a.y - b.y);
    for (const building of buildings) drawBuilding(building, now);

    for (const obstacle of game.obstacles) drawObstacle(obstacle, now);

    const players = Array.from(game.players.values()).sort((a, b) => a.y - b.y);
    for (const player of players) {
      if (player.id !== game.selfId) drawPlayer(player, now);
    }

    // Selection previews sit above every remote player but below the local
    // player, so the local body/hands always remain the topmost assembly.
    drawApplePreview();
    drawPlacementPreview();

    const self = game.players.get(game.selfId);
    if (self) drawPlayer(self, now);

    drawDebugShapes();
    drawMinimap();
  }


  function traceLobbyBiomeEdge(points) {
    const first = points[0];
    ctx.beginPath();
    ctx.moveTo(canvas.width * first.x, canvas.height * first.y);

    for (let index = 1; index < points.length; index += 1) {
      const beforePrevious = points[Math.max(0, index - 2)];
      const previous = points[index - 1];
      const current = points[index];
      const afterCurrent = points[Math.min(points.length - 1, index + 1)];
      const splineStrength = 0.78 / 6;
      ctx.bezierCurveTo(
        canvas.width * (previous.x + (current.x - beforePrevious.x) * splineStrength),
        canvas.height * (previous.y + (current.y - beforePrevious.y) * splineStrength),
        canvas.width * (current.x - (afterCurrent.x - previous.x) * splineStrength),
        canvas.height * (current.y - (afterCurrent.y - previous.y) * splineStrength),
        canvas.width * current.x,
        canvas.height * current.y
      );
    }
  }

  function fillLobbyRegionRightOf(points, color) {
    traceLobbyBiomeEdge(points);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawLobbyTerrain() {
    const biomes = VISUALS.WORLD.biomes || [];
    const north = biomes[0] || { background: "#d2cdc5" };
    const meadow = biomes[1] || { background: VISUALS.WORLD.background };
    const south = biomes[2] || { background: "#74483f" };

    ctx.fillStyle = north.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    fillLobbyRegionRightOf(LOBBY_WINTER_EDGE, meadow.background);
    fillLobbyRegionRightOf(LOBBY_LAVA_EDGE, south.background);

    ctx.save();
    ctx.globalAlpha = 0.72;
    drawGrid(0, 0, VISUALS.WORLD.grid);
    ctx.restore();
  }

  function drawLobbyVignette() {
    const outerRadius = Math.hypot(canvas.width, canvas.height) * 0.56;
    const innerRadius = Math.min(canvas.width, canvas.height) * 0.24;
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      innerRadius,
      canvas.width / 2,
      canvas.height / 2,
      outerRadius
    );
    gradient.addColorStop(0, "rgba(18, 24, 17, 0)");
    gradient.addColorStop(0.72, "rgba(18, 24, 17, 0.025)");
    gradient.addColorStop(1, "rgba(18, 24, 17, 0.14)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawLobbyScene(now) {
    drawLobbyTerrain();

    for (const resource of LOBBY_RESOURCES) {
      const visual = VISUALS.RESOURCES[resource.type];
      if (!visual) continue;
      const image = getImage(visual.image);
      const x = canvas.width * resource.x;
      const y = canvas.height * resource.y;
      drawImageNative(
        image,
        x,
        y,
        0,
        1,
        LOBBY_SPRITE_SCALE
      );
    }

    const windmillVisual = VISUALS.BUILDS.gatherer;
    for (const windmill of LOBBY_WINDMILLS) {
      const x = canvas.width * windmill.x;
      const y = canvas.height * windmill.y;
      const baseImage = getImage(windmillVisual.baseImage);
      drawImageNative(baseImage, x, y, 0, 1, LOBBY_SPRITE_SCALE);
      const rotation = now * (windmillVisual.spinRate ?? 0.0032) + windmill.phase;
      drawImageNative(
        getImage(windmillVisual.rotateImage),
        x,
        y,
        rotation,
        1,
        LOBBY_SPRITE_SCALE
      );
    }

    drawLobbyVignette();
  }

  function updatePerformanceDisplay() {
    const fps = game.fps > 0 ? game.fps : "—";
    const tps = game.tps > 0 ? game.tps.toFixed(1) : "—";
    const ping = Number.isFinite(game.ping) ? game.ping : "—";
    dom.pingDisplay.textContent = `${fps} fps ${tps} tps ${ping} ping`;
  }

  function sampleFrameRate(now) {
    game.fpsFrameCount++;
    const elapsed = now - game.fpsSampleStartedAt;
    if (elapsed < PERFORMANCE_SAMPLE_INTERVAL_MS) return;
    game.fps = Math.max(1, Math.round(game.fpsFrameCount * 1000 / elapsed));
    game.fpsFrameCount = 0;
    game.fpsSampleStartedAt = now;
    updatePerformanceDisplay();
  }

  function sampleTickRate(serverTick, now) {
    if (game.tpsSampleTick < 0 || serverTick < game.tpsSampleTick) {
      game.tpsSampleTick = serverTick;
      game.tpsSampleStartedAt = now;
      return;
    }

    const elapsed = now - game.tpsSampleStartedAt;
    if (elapsed < PERFORMANCE_SAMPLE_INTERVAL_MS) return;

    const tickDelta = serverTick - game.tpsSampleTick;
    game.tps = Math.max(0, Math.round((tickDelta * 1000 / elapsed) * 10) / 10);
    game.tpsSampleTick = serverTick;
    game.tpsSampleStartedAt = now;
    updatePerformanceDisplay();
  }

  function serviceOutgoingTimers(now) {
    if (game.mode !== "game") return;
    tryStartHitting(now);
    if (game.players.has(game.selfId) && now - game.lastAngleSentAt >= ANGLE_SEND_INTERVAL_MS) {
      sendCurrentAngle(now);
    }

    dom.pingDisplay.hidden = !settings.showPing;
    if (settings.showPing && now >= game.nextPingAt) {
      send([CLIENT_PACKET.PING, Math.round(now)]);
      game.nextPingAt = now + PING_INTERVAL_MS;
    }
  }

  function render(now) {
    const deltaMs = Math.min(50, Math.max(0, now - game.lastFrameAt));
    game.lastFrameAt = now;
    sampleFrameRate(now);
    serviceOutgoingTimers(now);
    updateCooldownOverlays(now);

    if (game.mode === "game" && game.config) drawGame(now, deltaMs);
    else drawLobbyScene(now);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
