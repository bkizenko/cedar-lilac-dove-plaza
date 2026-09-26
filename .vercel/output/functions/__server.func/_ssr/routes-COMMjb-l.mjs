import { i as __toESM } from "../_runtime.mjs";
import { I as require_jsx_runtime, L as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as ChevronLeft, C as GraduationCap, D as Church, E as Compass, M as Castle, N as Axe, O as ChevronUp, S as Hammer, T as Eye, _ as Pause, a as Users, b as House, c as Swords, d as Store, f as Shield, g as PawPrint, h as Pickaxe, i as Volume2, j as ChevronDown, k as ChevronRight, l as Sword, m as Play, n as Warehouse, p as RotateCcw, r as VolumeX, s as TreePine, t as Wheat, u as Sun, v as Mountain, w as FastForward, x as Hand, y as Landmark } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-COMMjb-l.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var WATER_Y = .42;
var TRADE_OFFERS = [
	{
		give: "food",
		giveAmt: 40,
		get: "wood",
		getAmt: 30
	},
	{
		give: "wood",
		giveAmt: 35,
		get: "stone",
		getAmt: 18
	},
	{
		give: "food",
		giveAmt: 50,
		get: "stone",
		getAmt: 16
	}
];
var AGES = [
	"Stone",
	"Bronze",
	"Iron",
	"Classical",
	"Medieval",
	"Renaissance"
];
var AGE_COST = [
	null,
	{
		food: 160,
		wood: 120,
		stone: 40,
		pop: 8
	},
	{
		food: 260,
		wood: 200,
		stone: 90,
		pop: 12
	},
	{
		food: 380,
		wood: 280,
		stone: 160,
		pop: 16
	},
	{
		food: 520,
		wood: 400,
		stone: 240,
		pop: 20
	},
	{
		food: 700,
		wood: 520,
		stone: 340,
		pop: 24
	}
];
var AGE_STAT = [
	1,
	1.1,
	1.22,
	1.35,
	1.5,
	1.68
];
var BUILDINGS = {
	townhall: {
		name: "Town Hall",
		w: 10,
		d: 10,
		food: 0,
		wood: 0,
		stone: 0,
		pop: 8,
		hp: 1100,
		age: 0,
		hint: "Heart of the tribe. Trains gatherers."
	},
	hut: {
		name: "Hut",
		w: 5.4,
		d: 5.2,
		food: 0,
		wood: 40,
		stone: 0,
		pop: 5,
		hp: 240,
		age: 0,
		hint: "Raises population cap by 5."
	},
	farm: {
		name: "Farm",
		w: 8.2,
		d: 8.2,
		food: 0,
		wood: 50,
		stone: 0,
		pop: 0,
		hp: 200,
		age: 0,
		hint: "Needs fertile, level ground. Infinite food plot."
	},
	lumber: {
		name: "Lumber Camp",
		w: 6.2,
		d: 5.8,
		food: 0,
		wood: 45,
		stone: 0,
		pop: 0,
		hp: 220,
		age: 0,
		hint: "Must stand among pines. Speeds woodcutting."
	},
	quarry: {
		name: "Quarry",
		w: 6.4,
		d: 6,
		food: 0,
		wood: 50,
		stone: 10,
		pop: 0,
		hp: 240,
		age: 1,
		hint: "Must sit on a stone outcrop. Speeds quarrying."
	},
	warehouse: {
		name: "Storehouse",
		w: 6.6,
		d: 6,
		food: 0,
		wood: 60,
		stone: 0,
		pop: 0,
		hp: 300,
		age: 1,
		hint: "Extra resource drop-off."
	},
	barracks: {
		name: "Barracks",
		w: 8.8,
		d: 8.2,
		food: 0,
		wood: 80,
		stone: 40,
		pop: 0,
		hp: 480,
		age: 1,
		hint: "Train hunters, archers, and swordsmen."
	},
	forge: {
		name: "Forge",
		w: 6.4,
		d: 6,
		food: 0,
		wood: 70,
		stone: 80,
		pop: 0,
		hp: 360,
		age: 2,
		hint: "Tempers blades. +12% military damage."
	},
	watchtower: {
		name: "Watchtower",
		w: 4.6,
		d: 4.6,
		food: 0,
		wood: 60,
		stone: 50,
		pop: 0,
		hp: 420,
		age: 2,
		hint: "Fires on enemies in range."
	},
	temple: {
		name: "Temple",
		w: 8.4,
		d: 8,
		food: 40,
		wood: 60,
		stone: 120,
		pop: 8,
		hp: 520,
		age: 3,
		hint: "Faith and order. +8 population."
	},
	market: {
		name: "Market",
		w: 7.4,
		d: 7,
		food: 0,
		wood: 90,
		stone: 40,
		pop: 0,
		hp: 340,
		age: 3,
		hint: "Traders. Gatherers work 12% faster."
	},
	keep: {
		name: "Keep",
		w: 9.2,
		d: 9.2,
		food: 0,
		wood: 80,
		stone: 180,
		pop: 6,
		hp: 900,
		age: 4,
		hint: "Stone stronghold. +6 population."
	},
	stables: {
		name: "Stables",
		w: 8.4,
		d: 8,
		food: 40,
		wood: 100,
		stone: 40,
		pop: 0,
		hp: 400,
		age: 4,
		hint: "Train cavalry."
	},
	university: {
		name: "University",
		w: 10,
		d: 8.6,
		food: 80,
		wood: 140,
		stone: 160,
		pop: 10,
		hp: 640,
		age: 5,
		hint: "Learning. +10 population."
	}
};
var UNITS = {
	worker: {
		name: "Gatherer",
		hp: 48,
		speed: 5.4,
		range: 1.6,
		dmg: 4,
		rof: 1.2,
		food: 50,
		wood: 0,
		stone: 0,
		train: 7,
		r: .55,
		age: 0,
		from: "townhall"
	},
	spearman: {
		name: "Hunter",
		hp: 92,
		speed: 4.8,
		range: 2.6,
		dmg: 12,
		rof: 1.05,
		food: 50,
		wood: 20,
		stone: 0,
		train: 8,
		r: .6,
		age: 0,
		from: "barracks"
	},
	archer: {
		name: "Archer",
		hp: 58,
		speed: 5,
		range: 12,
		dmg: 9,
		rof: 1.2,
		food: 40,
		wood: 35,
		stone: 0,
		train: 10,
		r: .55,
		age: 1,
		from: "barracks"
	},
	swordsman: {
		name: "Swordsman",
		hp: 130,
		speed: 4.5,
		range: 2,
		dmg: 16,
		rof: 1,
		food: 70,
		wood: 20,
		stone: 20,
		train: 12,
		r: .65,
		age: 2,
		from: "barracks"
	},
	cavalry: {
		name: "Rider",
		hp: 150,
		speed: 7.2,
		range: 2.3,
		dmg: 18,
		rof: 1.1,
		food: 80,
		wood: 40,
		stone: 0,
		train: 14,
		r: .9,
		age: 4,
		from: "stables"
	}
};
var GATHER = {
	food: {
		period: 2.6,
		carry: 7,
		campBonus: .62
	},
	wood: {
		period: 2.5,
		carry: 7,
		campBonus: .58
	},
	stone: {
		period: 3.3,
		carry: 6,
		campBonus: .6
	}
};
var BUILD_ORDER = [
	"hut",
	"farm",
	"lumber",
	"quarry",
	"warehouse",
	"barracks",
	"forge",
	"watchtower",
	"temple",
	"market",
	"keep",
	"stables",
	"university"
];
var TEAM_COLORS = [
	"#c4a060",
	"#8a3030",
	"#3d5c7a"
];
var TEAM_NAMES = [
	"Dawnfolk",
	"Redcliff",
	"Ashfen"
];
var TEAM_SHORT = [
	"You",
	"Redcliff",
	"Ashfen"
];
var SAVE_KEY = "dawn-of-empire-v6";
var AGE_CHOICES = [
	{
		econ: {
			name: "Granaries",
			hint: "Everyone gathers 15% faster"
		},
		army: {
			name: "Hardened hides",
			hint: "People gain 15% more health"
		}
	},
	{
		econ: {
			name: "Timber rights",
			hint: "Gather another 12% faster"
		},
		army: {
			name: "Long spears",
			hint: "+12% damage"
		}
	},
	{
		econ: {
			name: "Market weights",
			hint: "Gather another 10% faster"
		},
		army: {
			name: "Watchfires",
			hint: "A free watchtower at your hall"
		}
	},
	{
		econ: {
			name: "Open fields",
			hint: "Farms and forage run quicker"
		},
		army: {
			name: "Shield wall",
			hint: "+10% health and damage"
		}
	},
	{
		econ: {
			name: "Ledgers",
			hint: "Traders and gatherers hurry"
		},
		army: {
			name: "Royal guard",
			hint: "Two extra hunters at the hall"
		}
	}
];
var BLD_ICON = {
	hut: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "size-4" }),
	farm: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "size-4" }),
	lumber: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Axe, { className: "size-4" }),
	quarry: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pickaxe, { className: "size-4" }),
	warehouse: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Warehouse, { className: "size-4" }),
	barracks: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-4" }),
	forge: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hammer, { className: "size-4" }),
	watchtower: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" }),
	temple: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Church, { className: "size-4" }),
	market: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "size-4" }),
	keep: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Castle, { className: "size-4" }),
	stables: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PawPrint, { className: "size-4" }),
	university: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GraduationCap, { className: "size-4" })
};
function resWord(k) {
	if (k === "food") return "berries";
	if (k === "wood") return "logs";
	return "stone";
}
function Hud({ hud, engine }) {
	const [selMin, setSelMin] = (0, import_react.useState)(false);
	if (!hud.started) return null;
	const sel = hud.selection;
	const hpPct = sel.maxHp > 0 ? Math.round(100 * sel.hp / sel.maxHp) : 0;
	const weatherBits = hud.weather.split(" · ");
	const weatherName = weatherBits[0] || hud.weather;
	const weatherTemp = weatherBits[1] || "";
	const showJobs = !selMin && hud.workerSelected > 0;
	const showFight = !selMin && hud.militarySelected > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "hud-shell font-sans text-parchment",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hud-res",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hud-panel rounded-xl px-3 py-2.5 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResRow, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "size-3.5 text-blood" }),
								label: "Berries",
								value: hud.food
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResRow, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreePine, { className: "size-3.5 text-ok" }),
								label: "Logs",
								value: hud.wood
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResRow, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "size-3.5 text-parchment-dim" }),
								label: "Stone",
								value: hud.stone
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								title: "Train a gatherer (G)",
								onClick: () => engine?.trainPeople(),
								className: "flex w-full items-center gap-2 text-sm leading-7 rounded-md hover:bg-ink-soft",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-3.5 text-dawn" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex-1 text-left text-parchment-dim text-[13px]",
										children: "People"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tabular min-w-10 text-right text-parchment",
										children: `${hud.pop}/${hud.popCap}`
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => engine?.trainPeople(),
								disabled: hud.pop >= hud.popCap || hud.paused || !!hud.ended,
								className: "mt-1 min-h-8 w-full rounded-md border border-dawn/40 bg-ink-soft px-2 py-1 text-[11px] text-dawn hover:border-dawn disabled:opacity-40",
								children: "Train gatherer · 50 berries"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hud-panel rounded-xl px-3 py-2 flex items-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hammer, { className: "size-3.5 mt-0.5 text-bronze shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs leading-snug text-parchment-dim",
							children: hud.objective
						})]
					}),
					hud.event ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hud-panel rounded-xl px-3 py-1.5 text-[11px] text-bronze-bright",
						children: hud.event
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hud-clock",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hud-panel rounded-xl px-3 py-2.5 text-right",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-end gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "size-3.5 text-bronze-bright" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display text-lg leading-none tracking-wide text-bronze-bright",
								children: hud.period
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 text-xs text-parchment-dim tabular",
							children: [
								hud.clock,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-parchment-dim/70",
									children: [
										"(Day ",
										hud.day,
										")"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-0.5 flex items-center justify-end gap-2 text-[11px] text-parchment-dim/85",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tabular",
								children: weatherTemp
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: weatherName })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 font-display text-sm text-bronze",
							children: hud.ages[hud.age]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex justify-end gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									active: hud.paused,
									title: "Pause",
									onClick: () => engine?.setPaused(!hud.paused),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									active: !hud.paused && hud.speed === 1,
									title: "1×",
									onClick: () => engine?.setSpeed(1),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									active: hud.speed === 2,
									title: "2×",
									onClick: () => engine?.setSpeed(2),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FastForward, { className: "size-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									active: hud.speed === 3,
									title: "3×",
									onClick: () => engine?.setSpeed(3),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-semibold",
										children: "3×"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									title: hud.muted ? "Unmute" : "Mute",
									onClick: () => engine?.toggleMute(),
									children: hud.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
									title: "Restart",
									onClick: () => engine?.restart(),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3.5" })
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: !hud.nextAge || hud.paused || !!hud.ended,
					onClick: () => engine?.ageUp(),
					className: "hud-panel w-full rounded-xl px-3 py-2 text-xs font-medium text-bronze-bright hover:bg-ink-soft disabled:opacity-40",
					children: [hud.nextAge ? `Advance to ${hud.nextAge}` : "Renaissance", hud.ageCost ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mt-0.5 block text-[10px] font-normal text-parchment-dim",
						children: [
							hud.ageCost.food ?? 0,
							" berries · ",
							hud.ageCost.wood ?? 0,
							" logs · ",
							hud.ageCost.stone ?? 0,
							" stone",
							hud.ageCost.pop ? ` · ${hud.ageCost.pop} people` : ""
						]
					}) : null]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hud-banner",
				children: hud.placing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-bronze/40 bg-ink/80 px-3 py-2 text-center text-xs text-bronze-bright shadow-lg",
					children: [
						"Click open grass to raise a ",
						BUILDINGS[hud.placing].name,
						". Green ghost = clear. Right-click or Esc cancels."
					]
				}) : hud.banner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-center font-display text-2xl tracking-[0.18em] text-bronze-bright drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] md:text-3xl",
					children: hud.banner
				}) : null
			}),
			hud.paused && !hud.ended && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0 flex items-center justify-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-display text-2xl tracking-[0.4em] text-bronze-bright",
					children: "PAUSED"
				})
			}),
			hud.pendingAge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-ink/55 px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hud-panel w-full max-w-md rounded-2xl p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-display text-xl text-bronze-bright",
							children: [
								"Enter the ",
								hud.pendingAge.next,
								" Age"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-parchment-dim",
							children: "Pick one. The other is gone this play."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => engine?.pickAge("econ"),
								className: "rounded-xl border border-ok/40 bg-ink-soft px-3 py-3 text-left hover:border-ok",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-display text-sm text-ok",
									children: hud.pendingAge.econ.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-[11px] text-parchment-dim",
									children: hud.pendingAge.econ.hint
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => engine?.pickAge("army"),
								className: "rounded-xl border border-blood/40 bg-ink-soft px-3 py-3 text-left hover:border-blood",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-display text-sm text-blood",
									children: hud.pendingAge.army.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-[11px] text-parchment-dim",
									children: hud.pendingAge.army.hint
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => engine?.cancelAge(),
							className: "mt-3 w-full text-[11px] text-parchment-dim hover:text-parchment",
							children: "Wait"
						})
					]
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hud-sel hud-panel rounded-xl p-2.5 w-full",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-display text-base leading-tight text-bronze-bright",
							children: sel.name
						}), !selMin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-parchment-dim mt-0.5",
							children: sel.info
						}) : null]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						title: selMin ? "Expand" : "Minimize",
						onClick: () => setSelMin((v) => !v),
						className: "grid size-8 shrink-0 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40",
						children: selMin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5" })
					})]
				}), selMin ? sel.kind !== "none" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1.5 h-1 rounded-full bg-ink overflow-hidden border border-parchment/10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full rounded-full bg-ok",
						style: { width: `${hpPct}%` }
					})
				}) : null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					sel.carry ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[11px] text-dawn mt-1",
						children: sel.carry
					}) : null,
					sel.kind !== "none" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1.5 text-[11px] text-parchment-dim",
						children: [
							"Condition ",
							hpPct,
							"%"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 h-1.5 rounded-full bg-ink overflow-hidden border border-parchment/10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full rounded-full bg-ok",
							style: { width: `${hpPct}%` }
						})
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[11px] leading-snug text-parchment-dim",
						children: "Tap Gatherer (or People) to train. Right-click an enemy to fight."
					}),
					hud.idleWorkers > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => engine?.focusIdle(),
						className: "mt-1.5 min-h-8 w-full rounded-md border border-bronze/30 bg-ink-soft px-2 text-[11px] text-bronze-bright hover:border-bronze",
						children: [hud.idleWorkers, " idle · cycle to them (I)"]
					}) : null,
					showJobs ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1.5 grid grid-cols-4 gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobBtn, {
								active: hud.job === "food",
								label: "Berries",
								title: "Gather berries",
								onClick: () => engine?.assignJob("food"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheat, { className: "size-3.5 text-blood" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobBtn, {
								active: hud.job === "wood",
								label: "Logs",
								title: "Cut logs",
								onClick: () => engine?.assignJob("wood"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreePine, { className: "size-3.5 text-ok" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobBtn, {
								active: hud.job === "stone",
								label: "Stone",
								title: "Quarry stone",
								onClick: () => engine?.assignJob("stone"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "size-3.5 text-parchment-dim" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobBtn, {
								active: hud.job === "hold",
								label: "Rest",
								title: "Stop working",
								onClick: () => engine?.assignJob("hold"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "size-3.5 text-parchment-dim" })
							})
						]
					}) : null,
					hud.workerSelected > 0 || hud.idleWorkers > 0 || sel.kind === "none" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						title: "Send people to unexplored ground. Fog returns if you leave. (X)",
						onClick: () => engine?.explore(),
						className: "mt-1.5 flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dawn/30 bg-ink-soft px-2 text-[11px] text-dawn hover:border-dawn",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compass, { className: "size-3.5" }), "Explore (X)"]
					}) : null,
					showFight ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1.5 flex gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							title: hud.raidName ? `March on ${hud.raidName}. Right-click a foe to fight.` : "Train hunters, then strike.",
							onClick: () => engine?.raidRival(),
							className: "flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-blood/40 bg-ink-soft px-2 py-1.5 text-[11px] text-parchment hover:border-blood",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Swords, { className: "size-3.5 text-blood" }), hud.raidName ? `Strike ${hud.raidName}` : "Strike camp"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							title: "Halt",
							onClick: () => engine?.halt(),
							className: "min-h-8 rounded-md border border-parchment/20 bg-ink-soft px-2 py-1.5 text-[11px] text-parchment hover:border-bronze/40",
							children: "Halt"
						})]
					}) : null,
					sel.kind === "none" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hud-trade-mobile mt-1.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TradeBlock, {
							hud,
							engine
						})
					}) : null
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hud-build hud-panel rounded-xl p-2 flex gap-1.5 overflow-x-auto",
				children: [hud.buildOptions.map((b, i) => {
					const locked = hud.age < b.age;
					const active = hud.placing === b.type;
					const unaffordable = hud.wood < (b.cost.wood || 0) || hud.stone < (b.cost.stone || 0) || hud.food < (b.cost.food || 0);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: locked || !!hud.ended,
						title: `${b.name} [${i + 1}]\n${b.hint}`,
						onClick: () => engine?.setPlacing(b.type),
						className: `w-16 shrink-0 rounded-lg border px-1 py-1.5 text-center transition-colors ${active ? "border-bronze bg-bronze/20" : "border-parchment/15 bg-ink-soft hover:border-bronze/40"} ${locked || unaffordable ? "opacity-40" : ""}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mx-auto mb-1 flex size-8 items-center justify-center rounded-md bg-ink text-bronze",
								children: BLD_ICON[b.type] || /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Landmark, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] leading-tight text-parchment",
								children: shortName(b.name)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[9px] text-parchment-dim tabular",
								children: [
									b.cost.wood ? `L${b.cost.wood}` : "",
									" ",
									b.cost.stone ? `S${b.cost.stone}` : ""
								]
							})
						]
					}, b.type);
				}), hud.trainOptions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ml-1 flex gap-1.5 border-l border-parchment/15 pl-2",
					children: hud.trainOptions.map((u) => {
						const locked = hud.age < u.age || hud.pop >= hud.popCap;
						const gatherer = u.type === "worker";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: locked || hud.paused || !!hud.ended,
							title: gatherer ? "Train a gatherer (G)" : `Train ${u.name}. Right-click enemies to fight.`,
							onClick: () => engine?.train(u.type),
							className: `w-16 shrink-0 rounded-lg border px-1 py-1.5 text-center hover:border-bronze/40 disabled:opacity-40 ${gatherer ? "border-dawn/40 bg-dawn/10" : "border-parchment/15 bg-ink-soft"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mx-auto mb-1 flex size-8 items-center justify-center rounded-md bg-ink",
									children: gatherer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-4 text-dawn" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sword, { className: "size-4 text-bronze" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-parchment",
									children: u.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[9px] text-parchment-dim",
									children: ["B", u.cost.food || 0]
								})
							]
						}, u.type);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hud-map hud-panel rounded-xl overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimap, {
						hud,
						engine
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-2 py-1.5 space-y-0.5",
						children: hud.tribes.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => engine?.focusTribe(t.id),
							className: "flex w-full items-center gap-1.5 text-[10px] text-parchment-dim hover:text-parchment",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "size-1.5 rounded-full",
									style: { background: t.alive ? t.color : "#4a4038" }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: t.alive ? "text-parchment" : "line-through opacity-50",
									children: t.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto tabular",
									children: t.alive ? t.name === "You" ? hud.ages[t.age] : t.hostile ? "Warring" : "Peaceful" : "Fallen"
								})
							]
						}, t.name))
					}),
					hud.trade ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-2 pb-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TradeBlock, {
							hud,
							engine
						})
					}) : null
				]
			}),
			hud.ended && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ink/70",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-5xl text-bronze-bright",
						children: hud.ended === "win" ? "Victory" : "Defeat"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-parchment max-w-md text-center px-6",
						children: hud.endReason
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => engine?.restart(),
						className: "rounded-lg border border-bronze/40 bg-ink-soft px-5 py-2 text-sm text-bronze-bright hover:bg-ink",
						children: "Begin again"
					})
				]
			})
		]
	});
}
function TradeBlock({ hud, engine }) {
	const t = hud.trade;
	if (!t) return null;
	if (!t.alive) return null;
	if (t.hostile) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TradeHead, {
			hud,
			engine
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-[10px] leading-snug text-blood",
			children: [
				"War with ",
				t.rival,
				". Trade closed."
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TradeHead, {
			hud,
			engine
		}), t.cd > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-[10px] text-parchment-dim",
			children: [
				"Caravan · ",
				Math.ceil(t.cd),
				"s"
			]
		}) : t.offers.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TradeBtn, {
			deal: o,
			hud,
			engine
		}, o.give + o.get))]
	});
}
function TradeHead({ hud, engine }) {
	const t = hud.trade;
	if (!t) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1",
		children: [
			t.canCycle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				title: "Previous tribe (T)",
				onClick: () => engine?.cycleTrade(),
				className: "grid size-7 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-3.5" })
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1 text-center text-[10px] uppercase tracking-wide text-parchment-dim",
				children: ["Trade ", t.rival]
			}),
			t.canCycle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				title: "Next tribe (T)",
				onClick: () => engine?.cycleTrade(),
				className: "grid size-7 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3.5" })
			}) : null
		]
	});
}
function TradeBtn({ deal, hud, engine }) {
	const ok = (deal.give === "food" ? hud.food : deal.give === "wood" ? hud.wood : hud.stone) >= deal.giveAmt && !hud.paused && !hud.ended;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		disabled: !ok,
		onClick: () => engine?.trade(deal),
		className: "flex min-h-8 w-full items-center justify-between rounded-md border border-parchment/15 bg-ink-soft px-2 py-1 text-[10px] text-parchment hover:border-bronze/40 disabled:opacity-40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
			"Give ",
			deal.giveAmt,
			" ",
			resWord(deal.give)
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-bronze-bright",
			children: [
				deal.getAmt,
				" ",
				resWord(deal.get)
			]
		})]
	});
}
function JobBtn({ children, label, title, onClick, active }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		title,
		onClick,
		className: `flex min-h-8 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[9px] ${active ? "border-bronze bg-bronze/20 text-bronze-bright" : "border-parchment/15 bg-ink-soft text-parchment hover:border-bronze/40"}`,
		children: [children, label]
	});
}
function ResRow({ icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2 text-sm leading-7",
		children: [
			icon,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex-1 text-parchment-dim text-[13px]",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular min-w-10 text-right text-parchment",
				children: value
			})
		]
	});
}
function IconBtn({ children, onClick, active, title }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		title,
		onClick,
		className: `grid size-8 place-items-center rounded-md border text-parchment ${active ? "border-bronze text-bronze-bright" : "border-parchment/20 hover:border-bronze/40"}`,
		children
	});
}
function shortName(n) {
	if (n === "Lumber Camp") return "Lumber";
	if (n === "Watchtower") return "Tower";
	if (n === "University") return "Univ.";
	if (n === "Storehouse") return "Store";
	return n;
}
function Minimap({ hud, engine }) {
	const camps = hud.camps?.length ? hud.camps : [{
		x: hud.rivalX,
		z: hud.rivalZ,
		name: "Redcliff",
		color: "#8a3030",
		alive: true,
		hostile: false
	}];
	const homeLeft = 50 + (hud.homeX ?? 0) / 220 * 100;
	const homeTop = 50 + (hud.homeZ ?? 0) / 220 * 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-label": "Minimap",
		className: "block h-20 w-36 bg-moss/80 relative overflow-hidden",
		onClick: (e) => {
			const r = e.currentTarget.getBoundingClientRect();
			const nx = ((e.clientX - r.left) / r.width - .5) * 220;
			const nz = ((e.clientY - r.top) / r.height - .5) * 220;
			engine?.focusMinimap(nx, nz);
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, {
				className: "absolute size-3 -translate-x-1/2 -translate-y-1/2 text-bronze-bright",
				style: {
					left: `${homeLeft}%`,
					top: `${homeTop}%`
				}
			}),
			camps.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
				style: {
					left: `${50 + c.x / 220 * 100}%`,
					top: `${50 + c.z / 220 * 100}%`,
					background: c.alive ? c.color : "#4a4038",
					opacity: c.alive ? 1 : .4
				},
				title: c.name
			}, c.name)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Focus valley"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "absolute bottom-1 right-1 text-[9px] text-parchment/70 tabular",
				children: [hud.fps, " fps"]
			})
		]
	});
}
var EMPTY = {
	food: 0,
	wood: 0,
	stone: 0,
	pop: 0,
	popCap: 0,
	age: 0,
	ages: [
		"Stone",
		"Bronze",
		"Iron",
		"Classical",
		"Medieval",
		"Renaissance"
	],
	time: 0,
	day: 1,
	clock: "06:42",
	period: "Dawn",
	weather: "Valley mist · 11°C",
	paused: false,
	speed: 1,
	ended: null,
	endReason: "",
	objective: "",
	placing: null,
	banner: null,
	selection: {
		name: "No selection",
		info: "",
		hp: 0,
		maxHp: 1,
		kind: "none"
	},
	canAge: false,
	ageCost: null,
	nextAge: "Bronze",
	tribes: [],
	trainOptions: [],
	buildOptions: [],
	fps: 0,
	started: false,
	muted: false,
	quality: "high",
	workerSelected: 0,
	militarySelected: 0,
	job: null,
	canRaid: false,
	trade: null,
	rivalX: 82,
	rivalZ: -86,
	homeX: 0,
	homeZ: 38,
	camps: [],
	raidName: null,
	idleWorkers: 0,
	pendingAge: null,
	event: null
};
function GameApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(EMPTY);
	const [fail, setFail] = (0, import_react.useState)(null);
	const [drag, setDrag] = (0, import_react.useState)(null);
	const [boot, setBoot] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!canvasRef.current) return;
		let cancelled = false;
		let engine = null;
		let dragTimer = null;
		const bootEngine = async () => {
			try {
				const { Engine } = await import("./engine-B653hBxa.mjs");
				if (cancelled || !canvasRef.current) return;
				engine = new Engine(canvasRef.current, (snap) => {
					if (!cancelled) setHud(snap);
				});
				engineRef.current = engine;
				engine.begin();
				dragTimer = window.setInterval(() => {
					setDrag(engine?.getDragRect() ?? null);
				}, 50);
			} catch (err) {
				if (cancelled) return;
				const msg = err instanceof Error ? err.message : String(err);
				console.error(err);
				setFail(msg || "The valley failed to load.");
			}
		};
		bootEngine();
		return () => {
			cancelled = true;
			if (dragTimer) window.clearInterval(dragTimer);
			engine?.dispose();
			engineRef.current = null;
		};
	}, [boot]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-dvh w-full overflow-hidden bg-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 size-full touch-none",
				style: {
					display: "block",
					cursor: hud.placing ? "crosshair" : "default"
				}
			}),
			drag && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute z-20 border border-bronze-bright/80 bg-bronze/10",
				style: {
					left: Math.min(drag.sx, drag.x),
					top: Math.min(drag.sy, drag.y),
					width: Math.abs(drag.x - drag.sx),
					height: Math.abs(drag.y - drag.sy)
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hud, {
				hud,
				engine: engineRef.current
			}),
			!hud.started && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0 z-30 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_70%_20%,#6a4a20_0%,#1a160e_55%,#0c0e0a_100%)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-xs tracking-[0.35em] text-bronze uppercase",
						children: "An island at first light"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-3 font-display text-6xl tracking-[0.28em] text-bronze-bright md:text-7xl",
						children: "DAWN"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-display text-xl tracking-[0.42em] text-parchment-dim",
						children: "OF EMPIRE"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 max-w-md px-6 text-center text-sm leading-relaxed text-parchment-dim",
						children: fail ? fail : "Raising the camp…"
					}),
					fail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setFail(null);
							setHud(EMPTY);
							setBoot((n) => n + 1);
						},
						className: "mt-5 rounded-lg border border-bronze/40 bg-ink-soft px-5 py-2 text-sm text-bronze-bright hover:bg-ink",
						children: "Raise the camp again"
					}) : null
				]
			})
		]
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameApp, {});
}
//#endregion
export { AGE_STAT as a, GATHER as c, TEAM_NAMES as d, TEAM_SHORT as f, WATER_Y as h, AGE_COST as i, SAVE_KEY as l, UNITS as m, AGES as n, BUILDINGS as o, TRADE_OFFERS as p, AGE_CHOICES as r, BUILD_ORDER as s, routes_exports as t, TEAM_COLORS as u };
