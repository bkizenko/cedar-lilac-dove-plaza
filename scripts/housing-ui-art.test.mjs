import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as THREE from "three";
import { Game } from "../src/game/sim.ts";
import { improvedHomeGeo } from "../src/scene/improvedHome.ts";
import { HousingPacketLayer } from "../src/scene/housingPackets.ts";
import { BUILDINGS } from "../src/game/constants.ts";
import { housingKnowledgeTopic } from "../src/game/housingKnowledge.ts";
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "./GameTooltip")
      return next(new URL("../src/ui/GameTooltip.tsx", import.meta.url).href, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith("/src/ui/HousingControls.tsx") || url.endsWith("/src/ui/GameTooltip.tsx"))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    return next(url, context);
  },
});
after(() => hook.deregister());
const { HousingControls } = await import("../src/ui/HousingControls.tsx");
function fixture() {
  const g = new Game();
  g.reset(2, 1);
  const b = g.makeBld("hut", 0, 0, 0);
  g.state.buildings = [b];
  return {
    g,
    b,
    engine: {
      game: g,
      pushHud() {
        assert.fail("SSR must not mutate");
      },
      upgradeHome() {
        assert.fail();
      },
      tryHome() {
        assert.fail();
      },
      pauseHome() {
        assert.fail();
      },
    },
  };
}
test("selected-home actual SSR exposes quote/unlock and hides foreign/nonhomes without mutation", () => {
  const { g, b, engine } = fixture();
  const before = JSON.stringify(g.state),
    html = renderToStaticMarkup(React.createElement(HousingControls, { engine, buildingId: b.id }));
  assert.equal(JSON.stringify(g.state), before);
  assert.match(html, /Improve home/);
  assert.match(html, /24 logs/);
  assert.match(html, /6 fibre/);
  b.team = 1;
  assert.equal(
    renderToStaticMarkup(React.createElement(HousingControls, { engine, buildingId: b.id })),
    "",
  );
  b.team = 0;
  b.type = "farm";
  assert.equal(
    renderToStaticMarkup(React.createElement(HousingControls, { engine, buildingId: b.id })),
    "",
  );
});
test("real house mesh stays inside unchanged footprint and contains separate structural/roof parts", () => {
  const result = improvedHomeGeo();
  let triangles = 0;
  for (const key of ["timber", "roof", "extra"]) {
    const geometry = result[key];
    assert.ok(geometry);
    geometry.computeBoundingBox();
    const b = geometry.boundingBox;
    assert.ok(
      b.min.x >= -BUILDINGS.house.w / 2 - 0.001 && b.max.x <= BUILDINGS.house.w / 2 + 0.001,
    );
    assert.ok(
      b.min.z >= -BUILDINGS.house.d / 2 - 0.001 && b.max.z <= BUILDINGS.house.d / 2 + 0.001,
    );
    assert.ok(b.min.y >= -0.001);
    triangles += (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
    geometry.dispose();
  }
  assert.ok(triangles < 2000);
  assert.equal(BUILDINGS.house.w, BUILDINGS.hut.w);
  assert.equal(BUILDINGS.house.d, BUILDINGS.hut.d);
  assert.equal(BUILDINGS.house.pop, BUILDINGS.hut.pop + 2);
});
test("actual packet meshes show only real finite carried/dropped materials and clear after depletion", () => {
  const scene = new THREE.Scene(),
    layer = new HousingPacketLayer(scene),
    u = {
      id: 1,
      hp: 100,
      type: "worker",
      team: 0,
      x: 0,
      y: 0,
      z: 0,
      facing: 0,
      housingCargo: { materials: { wood: 8, stone: 0, plantFibre: 0 } },
    },
    g = {
      state: { units: [u], buildings: [] },
      visibleAt() {
        return true;
      },
      height() {
        return 0;
      },
    };
  layer.sync(g);
  assert.equal(
    scene.children.reduce((n, m) => n + m.count, 0),
    1,
  );
  u.housingCargo.materials.wood = 0;
  layer.sync(g);
  assert.equal(
    scene.children.reduce((n, m) => n + m.count, 0),
    0,
  );
  u.housingCargo = undefined;
  g.state.buildings = [
    {
      team: 0,
      renovation: {
        parcel: { kind: "ground", x: 3, z: 4 },
        packet: { wood: 0, stone: 0, plantFibre: 6 },
      },
    },
  ];
  layer.sync(g);
  assert.equal(
    scene.children.reduce((n, m) => n + m.count, 0),
    1,
  );
  layer.dispose();
  assert.equal(scene.children.length, 0);
});
test("knowledge reports actual paid result/use and personal method, no passive research credit", () => {
  const { g, b } = fixture();
  const before = JSON.stringify(g.state),
    topic = housingKnowledgeTopic(g);
  assert.equal(JSON.stringify(g.state), before);
  assert.equal(topic.stage, "observation");
  assert.ok(topic.actions.find((a) => a.id === "housing:place").blockedReason);
  assert.equal(topic.metrics.completedPaidHomes, 0);
});
