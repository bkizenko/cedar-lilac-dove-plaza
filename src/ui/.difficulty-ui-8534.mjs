import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLifecycleAction } from './useLifecycleAction';
import { DIFFICULTIES, difficultyEffects } from "../game/difficulty";
import { useState } from "react";
import { SkinPicker } from "./SkinPicker";
import { PRESETS } from "../game/mapgen/presets";
export function WorldSetup({ engine }) {
    const [mapType, setMapType] = useState("random");
    const [size, setSize] = useState(1560);
    const [preset, setPreset] = useState(engine.game.state.difficulty ?? "normal");
    const [skin, setSkin] = useState({ mode: "random" });
    const lifecycle = useLifecycleAction(engine), busy = lifecycle.busy;
    const [wildCraft, setWildCraft] = useState(false);
    const [sharedRoutes, setSharedRoutes] = useState(true), [seaTides, setSeaTides] = useState(true);
    const [previewRiverbanks, setPreviewRiverbanks] = useState(false);
    return (_jsxs("div", { className: "world-setup", children: [_jsx("p", { className: "text-xs", children: engine.game.testMode
                    ? "Test world · your village is kept."
                    : "Starts a new world; keeps your current village as a protected checkpoint." }), _jsxs("label", { children: ["Difficulty", _jsx("select", { "aria-label": "New world difficulty", value: preset, onChange: (e) => setPreset(e.target.value), children: Object.entries(DIFFICULTIES).map(([id, p]) => (_jsx("option", { value: id, children: p.name }, id))) })] }), _jsxs("details", { children: [_jsx("summary", { children: "Preset effects" }), _jsx("p", { className: "text-xs", children: difficultyEffects(preset) })] }), _jsxs("label", { children: ["Map type", _jsxs("select", { "aria-label": "Map type", value: mapType, onChange: (e) => setMapType(e.target.value), children: [_jsx("option", { value: "random", children: "Surprise me" }), Object.values(PRESETS).map((p) => (_jsx("option", { value: p.id, children: p.name }, p.id)))] })] }), _jsxs("label", { children: ["World size", _jsxs("select", { value: size, onChange: (e) => setSize(Number(e.target.value)), children: [_jsx("option", { value: 1040, children: "Standard" }), _jsx("option", { value: 1560, children: "Large \u00B7 2.25\u00D7 area" }), _jsx("option", { value: 2080, children: "Huge \u00B7 4\u00D7 area" })] })] }), _jsx(SkinPicker, { value: skin, onChange: setSkin }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: wildCraft, onChange: e => setWildCraft(e.target.checked) }), " Detailed hunting and hide work \u00B7 experimental"] }), engine.game.testMode && _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: previewRiverbanks, onChange: e => setPreviewRiverbanks(e.target.checked) }), "Experimental riverbanks"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: sharedRoutes, onChange: e => setSharedRoutes(e.target.checked) }), " Shared routes"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: seaTides, onChange: e => setSeaTides(e.target.checked) }), " Sea tides"] }), _jsx("button", { type: "button", disabled: busy, onClick: () => void lifecycle.run(async () => {
                    await new Promise(resolve => requestAnimationFrame(() => resolve()));
                    return await engine.configureNewWorld({ preset: mapType, size, difficulty: preset, skin, ...(sharedRoutes ? { flowFieldVersion: 1 } : {}), ...(seaTides ? { tideVersion: 2 } : {}) }, previewRiverbanks, wildCraft);
                }), children: busy ? "Generating…" : "New world" }), lifecycle.error && _jsx("p", { role: "status", className: "text-xs", children: lifecycle.error }), _jsxs("span", { children: [engine.game.state.skins?.slots["0"]?.name ?? "Village", " \u00B7", " ", engine.game.world.mapgen?.name ?? engine.game.world.options?.layout ?? "Classic island", " \u00B7", " ", Math.round(engine.game.world.size), " m across"] })] }));
}
