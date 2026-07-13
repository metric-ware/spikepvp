(function exposeSwordfightProtocol(root, factory) {
  "use strict";

  const protocol = factory();
  if (typeof module === "object" && module.exports) module.exports = protocol;
  else root.SWORDFIGHT_PROTOCOL = protocol;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  return Object.freeze({
    ITEM: Object.freeze({
      SWORD: 2,
      HAMMER: 3,
      APPLE: 4,
      SPIKE: 5,
      TRAP: 6,
      WALL: 7,
      GATHERER: 8
    }),
    RESOURCE: Object.freeze({
      TREE: "tree",
      STONE: "stone",
      GOLD: "gold",
      BUSH: "bush"
    }),
    BUILDING_RELATION: Object.freeze({
      ENEMY: 0,
      CLANMATE: 1,
      OWNER: 2
    }),
    CLIENT: Object.freeze({
      JOIN: 1,
      MOVE: 2,
      AIM: 3,
      PLACE_BUILDING: 4,
      ATTACK: 5,
      EQUIP_WEAPON: 6,
      USE_APPLE: 7,
      CREATE_CLAN: 8,
      REQUEST_CLAN_JOIN: 9,
      ANSWER_CLAN_REQUEST: 10,
      KICK_CLAN_MEMBER: 11,
      LEAVE_CLAN: 12,
      PING: 13,
      CHAT: 14,
      BUY_HELMET: 15,
      TOGGLE_HELMET: 16
    }),
    SERVER: Object.freeze({
      INIT: 1,
      SNAPSHOT: 2,
      LEADERBOARD: 3,
      CLAN_DATA: 4,
      PONG: 5,
      NOTICE: 6
    })
  });
});
