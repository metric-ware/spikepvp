(function exposeSwordfightVisuals(root, factory) {
  "use strict";

  const visuals = factory();
  if (typeof module === "object" && module.exports) module.exports = visuals;
  else root.SWORDFIGHT_VISUALS = visuals;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const SPRITE_SCALE = 0.5;
  const GRID_COLOR = "rgba(48, 48, 48, 0.1)";

  return Object.freeze({
    SPRITE_SCALE,
    WORLD: Object.freeze({
      background: "#778e58",
      grid: GRID_COLOR,
      outsideBackground: "#55643f",
      biomes: Object.freeze([
        Object.freeze({
          start: 0,
          end: 0.25,
          background: "#d2cdc5",
          outsideBackground: "#a8a39b"
        }),
        Object.freeze({
          start: 0.25,
          end: 0.75,
          background: "#778e58",
          outsideBackground: "#55643f"
        }),
        Object.freeze({
          start: 0.75,
          end: 1,
          background: "#74483f",
          outsideBackground: "#633a35"
        })
      ]),
      biomeTransitions: Object.freeze([
        Object.freeze([
          Object.freeze({ x: -0.30, y: 0.246 }),
          Object.freeze({ x: -0.16, y: 0.260 }),
          Object.freeze({ x: 0.00, y: 0.252 }),
          Object.freeze({ x: 0.08, y: 0.245 }),
          Object.freeze({ x: 0.19, y: 0.263 }),
          Object.freeze({ x: 0.31, y: 0.258 }),
          Object.freeze({ x: 0.39, y: 0.239 }),
          Object.freeze({ x: 0.52, y: 0.247 }),
          Object.freeze({ x: 0.66, y: 0.267 }),
          Object.freeze({ x: 0.74, y: 0.261 }),
          Object.freeze({ x: 0.89, y: 0.241 }),
          Object.freeze({ x: 1.00, y: 0.250 }),
          Object.freeze({ x: 1.14, y: 0.265 }),
          Object.freeze({ x: 1.30, y: 0.244 })
        ]),
        Object.freeze([
          Object.freeze({ x: -0.30, y: 0.762 }),
          Object.freeze({ x: -0.17, y: 0.741 }),
          Object.freeze({ x: 0.00, y: 0.750 }),
          Object.freeze({ x: 0.11, y: 0.765 }),
          Object.freeze({ x: 0.23, y: 0.758 }),
          Object.freeze({ x: 0.34, y: 0.739 }),
          Object.freeze({ x: 0.48, y: 0.746 }),
          Object.freeze({ x: 0.60, y: 0.769 }),
          Object.freeze({ x: 0.69, y: 0.754 }),
          Object.freeze({ x: 0.81, y: 0.742 }),
          Object.freeze({ x: 0.93, y: 0.748 }),
          Object.freeze({ x: 1.00, y: 0.744 }),
          Object.freeze({ x: 1.16, y: 0.765 }),
          Object.freeze({ x: 1.30, y: 0.751 })
        ])
      ])
    }),
    LAKES: Object.freeze({
      ice: Object.freeze({
        base: "#8fcfda",
        outline: "rgba(42, 48, 49, 0.74)"
      }),
      lava: Object.freeze({
        base: "#ef642d",
        outline: "rgba(50, 33, 29, 0.74)"
      })
    }),
    PLAYER: Object.freeze({
      bodyImage: "sprites/player/body.png",
      handImage: "sprites/player/hand.png",
      bodyWidth: 70,
      bodyHeight: 70,
      handWidth: 35,
      handHeight: 35,
      lowerHandCenter: Object.freeze({ x: 70 / 3, y: 70 / 3 }),
      upperHandCenter: Object.freeze({ x: 70 / 3, y: -70 / 3 })
    }),
    ITEMS: Object.freeze({
      sword: Object.freeze({
        image: "sprites/tools/stone_sword.png",
        scale: SPRITE_SCALE,
        offsetX: 0,
        offsetY: 0
      }),
      hammer: Object.freeze({
        image: "sprites/tools/stone_hammer.png",
        scale: SPRITE_SCALE,
        offsetX: 0,
        offsetY: 0
      }),
      apple: Object.freeze({
        image: "sprites/food/apple.png",
        scale: SPRITE_SCALE,
        previewDistance: 48
      })
    }),
    RESOURCES: Object.freeze({
      tree: Object.freeze({ image: "sprites/resources/tree.png", scale: SPRITE_SCALE }),
      stone: Object.freeze({ image: "sprites/resources/stone.png", scale: SPRITE_SCALE }),
      gold: Object.freeze({ image: "sprites/resources/gold.png", scale: SPRITE_SCALE }),
      bush: Object.freeze({ image: "sprites/resources/bush.png", scale: SPRITE_SCALE })
    }),
    BUILDS: Object.freeze({
      spike: Object.freeze({
        image: "sprites/buildings/spike.png",
        scale: SPRITE_SCALE
      }),
      trap: Object.freeze({
        image: "sprites/buildings/trap.png",
        scale: SPRITE_SCALE
      }),
      wall: Object.freeze({ image: "sprites/buildings/wall.png", scale: SPRITE_SCALE }),
      gatherer: Object.freeze({
        baseImage: "sprites/buildings/windmill_base.png",
        rotateImage: "sprites/buildings/windmill_rotate.png",
        scale: SPRITE_SCALE,
        rotateScale: SPRITE_SCALE,
        spinRate: 0.0032
      })
    }),
    INVENTORY: Object.freeze({
      order: Object.freeze([
        "sword",
        "hammer",
        "apple",
        "spike",
        "trap",
        "wall",
        "gatherer"
      ]),
      slots: Object.freeze({
        ["sword"]: Object.freeze({
          name: "Katana",
          art: Object.freeze({ type: "single", image: "sprites/tools/stone_sword.png", rotationDeg: 180, size: 84, top: 7 })
        }),
        ["hammer"]: Object.freeze({
          name: "Hammer",
          art: Object.freeze({ type: "single", image: "sprites/tools/stone_hammer.png", rotationDeg: 180, size: 76, top: 11 })
        }),
        ["apple"]: Object.freeze({
          name: "Apple",
          art: Object.freeze({ type: "single", image: "sprites/food/apple.png", rotationDeg: 0, size: 73, top: 13 })
        }),
        ["spike"]: Object.freeze({
          name: "Spike",
          art: Object.freeze({ type: "single", image: "sprites/buildings/spike.png", rotationDeg: 0, size: 82, top: 8 })
        }),
        ["trap"]: Object.freeze({
          name: "Trap",
          art: Object.freeze({ type: "single", image: "sprites/buildings/trap.png", rotationDeg: 0, size: 77, top: 11 })
        }),
        ["wall"]: Object.freeze({
          name: "Wall",
          art: Object.freeze({ type: "single", image: "sprites/buildings/wall.png", rotationDeg: 0, size: 82, top: 8 })
        }),
        ["gatherer"]: Object.freeze({
          name: "Windmill",
          art: Object.freeze({
            type: "windmill",
            baseImage: "sprites/buildings/windmill_base.png",
            rotateImage: "sprites/buildings/windmill_rotate.png",
            size: 84,
            top: 7
          })
        })
      })
    })
  });
});
