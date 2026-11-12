import { $ as Points, A as Frustum, B as Matrix4, C as DodecahedronGeometry, D as Float32BufferAttribute, E as ExtrudeGeometry, F as InstancedMesh, G as MeshStandardMaterial, H as MeshBasicMaterial, I as LatheGeometry, J as Path, K as NearestFilter, L as LinearFilter, M as HemisphereLight, N as IcosahedronGeometry, O as FloatType, P as InstancedBufferAttribute, Q as PointLight, R as LinearMipmapLinearFilter, S as DirectionalLight, T as Euler, U as MeshDepthMaterial, V as Mesh, W as MeshLambertMaterial, X as Plane, Y as PerspectiveCamera, Z as PlaneGeometry, _ as CircleGeometry, _t as TorusGeometry, a as EffectComposer, at as Ray, b as CylinderGeometry, bt as Vector3, c as UniformsLib, ct as RepeatWrapping, d as Box3, dt as Scene, et as PointsMaterial, f as BoxGeometry, ft as ShaderMaterial, g as CapsuleGeometry, gt as SphereGeometry, h as CanvasTexture, ht as Sphere, i as RenderPass, it as RGBFormat, j as Group, k as FogExp2, l as WebGLRenderer, lt as RingGeometry, m as BufferGeometry, mt as ShapeGeometry, n as FilmPass, nt as RGBADepthPacking, o as ShaderPass, ot as Raycaster, p as BufferAttribute, pt as Shape, q as Object3D, r as UnrealBloomPass, rt as RGBAFormat, s as mergeGeometries, st as RedFormat, t as OutputPass, tt as Quaternion, u as AmbientLight, ut as SRGBColorSpace, v as Color, vt as UniformsUtils, w as DynamicDrawUsage, x as DataTexture, xt as Vector4, y as ConeGeometry, yt as Vector2, z as MathUtils } from "../_libs/three.mjs";
import { $ as resumeConstructionQueue, $n as BUILD_ORDER, $t as armorEquipIssue, A as armorAffiliationColor, An as ERA_UPGRADE_RULES, At as describe, B as resumeProduction, Bn as sampleWorldHeight, Bt as placeFacingGate, C as Game, Cn as dragPlot, Ct as rulersOf, D as placeConstructionLine, Dn as plotDragIntent, Dt as score, E as linearStructure, En as maximumPlotAxisMultiple, Et as appetite, F as equipClothing, Fn as supportsEraUpgrade, Ft as hash32, G as beginHomeUse, Gn as BANK_TERRAIN_RULES, Gt as survivalFireActive, H as unloadProductionProject, Hn as ecologicalConditionsAt, Ht as snapGate, I as pauseProductionProject, In as EXCAVATION_RULES, It as makeRng, J as setHousingPaused, Jn as seaSurfaceY, Jt as equipWaterVessel, K as beginHousingUpgrade, Kn as bankTileAt, Kt as beginClayGather, L as productionIssue, Ln as excavationHeightAt, Lt as normal, M as PRODUCTION_RECIPES, Mn as eraUpgradeIssue, Mt as BAND_LABELS, N as beginProduction, Nn as fabricContext, Nt as bandOf, O as surveyFieldTopography, On as scalablePlot, Ot as heir, P as discardDairyProject, Pn as planEraChange, Pt as clamp$1, Q as queueConstruction, Qn as BUILDINGS, Qt as societyRelation, R as productionWorkSeconds, Rn as excavationTerrain, Rt as gateFacing, S as validateGameSave, Sn as plotModules, St as implications, T as joinedConstructionLine, Tn as fieldSeedIssue, Tt as STREAMS, U as carcassAvailable, Un as provinceAt, Ut as suggestGateSnap, V as swapClothing, Vn as PROVINCE_KINDS, Vt as rotateGateFacing, W as beginEraUpgrade, Wn as fbm, Wt as hearthHeating, X as editConstructionQueue, Xn as prepareOwnedWaterWorld, Xt as setPresentationSurvivalView, Y as setSitePreparationPaused, Yn as waterSurfaceAt, Yt as surveyClay, Z as pauseConstructionQueue, Zn as riverSurfaceData, Zt as SIEGE_RAM_RULES, _ as matchingSaveSlots, _n as GROUNDING_RULES, _t as livingPeople, a as RuntimeProfile, an as boatClass, ar as serializeStoredSave, at as equipBasket, b as decodeGame, bn as groundEntryFor, bt as tiesBetween, c as surveyReachFish, cn as wildPlantVisual, ct as surveyFibre, d as craftSiteReport, dn as planBridge, dt as refuseCapitulation, en as equipArmor, er as MAP, et as setConstructionPriority, f as commitPreparedAutosave, fn as TOWER_PLATFORM_RULES, ft as cultivationIssue, g as loadRaw, gn as terrainLaidWorkplace, gt as fosterHouses, h as invalidateAutosaveWrites, hn as foundationProfile, ht as expansionOf, i as RUNTIME_PROFILE_RULES, in as GARMENT_KINDS, ir as parseStoredSave, it as beginFibreGather, j as societyIdentity, jn as eraUpgradeBenefits, jt as dominantTraits, k as projectedTreeInBox, kn as compactGrainWorkplace, kt as yearlyDeathChance, l as waterReachAt, ln as wildPlantsEnabled, lt as acceptCapitulation, m as hasSave, mn as towerBuildConfiguration, mt as exchangeHostages, n as AcousticScore, nn as wornArmor, nr as TEAM_STYLE, nt as orderConstruction, o as beginRendererFrame, on as WILD_PLANT_SPECIES, ot as fibreGatherIssue, p as currentSaveGeneration, pn as normalizeTowerPlatform, pt as ensureRulers, q as housingAdoptionIssue, qn as lakeContains, qt as clayIssue, r as peacefulMusic, rn as carryingCapacity, rr as SAVE_CODEC_RULES, rt as planStatus, s as rendererFrameMetrics, sn as soilQuality, st as returnFibreLoad, tn as unequipArmor, tr as SAVE_KEY, tt as buildingCost, u as controlCraftSiteJob, un as bridgeHeight, ut as capitulationOffers, v as readSaveSlots, vn as buildingGroundContacts, vt as marryHouses, w as buildingQuarterTurns, wn as expandedGrainWorkplace, wt as familyFeatures, x as encodeGame, xn as registerGroundContacts, xt as bondLabel, y as saveGame, yn as groundContactVersion, yt as rulersEnabled, z as queueDairyVesselCleaning, zn as isFertile, zt as gateOrientation } from "./routes-BkKOQREQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-DAaDfvWn.js
function storedVillageCandidates(protectedOnly = false, storage = localStorage) {
	const slots = readSaveSlots(storage), raw = protectedOnly ? [slots.protected] : [
		slots.primary,
		slots.backup,
		slots.protected
	];
	const candidates = [];
	for (let priority = 0; priority < raw.length; priority++) try {
		if (!raw[priority]) continue;
		const snapshot = parseStoredSave(raw[priority]);
		validateGameSave(snapshot);
		const data = snapshot;
		candidates.push({
			snapshot,
			priority,
			seed: data.state.seed,
			time: data.state.time,
			savedAt: typeof data.savedAt === "number" && Number.isFinite(data.savedAt) ? data.savedAt : 0
		});
	} catch {}
	return candidates;
}
function chooseStoredVillage(candidates) {
	const active = candidates[0];
	if (!active) return void 0;
	return candidates.filter((c) => c.seed === active.seed).reduce((best, c) => (c.savedAt || best.savedAt ? c.savedAt > best.savedAt : c.time > best.time) ? c : best, active);
}
/** Save only a completed owner barrier, never serialize the renderer projection.
* Each operation captures session, write generation and original durable slots
* before awaiting the owner. Later sessions/manual saves/other tabs win. */
var SimulationCheckpointSaver = class {
	authority;
	storage;
	constructor(authority, storage = localStorage) {
		this.authority = authority;
		this.storage = storage;
	}
	async save(destination = "village", deliberate = true) {
		const no = (status, reason) => ({
			status,
			reason
		});
		if (!this.authority.allowed()) return no("superseded", "No active authoritative village");
		const epoch = this.authority.currentEpoch(), generation = invalidateAutosaveWrites();
		let expected = {
			primary: null,
			backup: null,
			protected: null
		}, labBefore = null;
		try {
			if (destination !== "export") {
				expected = readSaveSlots(this.storage);
				labBefore = this.storage.getItem(SAVE_KEY + ":test-lab");
			}
		} catch {
			return no("failed", "Village storage is unavailable");
		}
		const current = () => this.authority.allowed() && this.authority.currentEpoch() === epoch && currentSaveGeneration() === generation;
		try {
			const checkpoint = await this.authority.checkpoint();
			if (!current() || checkpoint.sessionEpoch !== epoch) return no("superseded", "Village changed before checkpoint completed");
			if (typeof checkpoint.serialized !== "string" || checkpoint.serialized.length > SAVE_CODEC_RULES.maximumDecodedBytes * 2) return no("failed", "Invalid checkpoint size");
			const parsed = parseStoredSave(checkpoint.serialized);
			validateGameSave(parsed);
			const raw = parsed;
			const context = checkpoint.context;
			if (!context.started || context.awaitingStart) return no("failed", "The village has not started");
			if (context.testMode && destination !== "test-lab" && destination !== "export") return no("failed", "Test Lab checkpoints cannot replace village saves");
			if (!context.testMode && destination === "test-lab") return no("failed", "Only Test Lab checkpoints use the lab slot");
			if (typeof raw.savedAt !== "number" || !Number.isFinite(raw.savedAt) || raw.savedAt < 0) return no("failed", "Owner checkpoint must include its save timestamp");
			if (raw.state.time !== checkpoint.clock.time) return no("failed", "Checkpoint clock does not match authoritative state");
			if (!current() || destination !== "export" && (!matchingSaveSlots(expected, readSaveSlots(this.storage)) || this.storage.getItem("dawn-of-empire-v17:test-lab") !== labBefore)) return no("superseded", "A newer durable checkpoint exists");
			if (destination === "export") return {
				status: "committed",
				reason: "Authoritative export prepared",
				checkpoint
			};
			if (destination === "test-lab") {
				this.storage.setItem(SAVE_KEY + ":test-lab", checkpoint.serialized);
				return {
					status: "committed",
					reason: "Test Lab checkpoint saved",
					checkpoint
				};
			}
			if (destination === "protected") {
				this.storage.setItem(SAVE_KEY + ":protected", checkpoint.serialized);
				return {
					status: "committed",
					reason: "Protected checkpoint saved",
					checkpoint
				};
			}
			let previousPrimaryValid = false;
			if (expected.primary) try {
				const parsedOld = parseStoredSave(expected.primary);
				validateGameSave(parsedOld);
				const old = parsedOld;
				previousPrimaryValid = true;
				if (!deliberate && old.state.seed === raw.state.seed && old.state.time > raw.state.time) return no("superseded", "A later village state is already saved");
			} catch {}
			if (!current()) return no("superseded", "Checkpoint superseded during validation");
			const status = commitPreparedAutosave(expected, generation, checkpoint.serialized, previousPrimaryValid, this.storage);
			return {
				status,
				reason: status === "committed" ? "Authoritative village saved" : status === "superseded" ? "A newer checkpoint won" : "Storage could not accept the village",
				...status === "committed" ? { checkpoint } : {}
			};
		} catch (error) {
			return no(current() ? "failed" : "superseded", error instanceof Error ? error.message : "Checkpoint failed");
		}
	}
};
var TRAIT_WORDS = {
	ambition: ["content with what they hold", "hungry for more"],
	piety: ["worldly", "devout"],
	innovation: ["wary of new ways", "eager for new ways"],
	tradition: ["impatient with custom", "bound to custom"],
	boldness: ["careful", "daring"],
	prudence: ["rash", "prudent"],
	cruelty: ["gentle", "ruthless"],
	mercy: ["unforgiving", "merciful"],
	generosity: ["tight-fisted", "open-handed"],
	paranoia: ["trusting", "suspicious"],
	charisma: ["dull in company", "magnetic"],
	pride: ["humble", "proud"],
	honor: ["flexible with oaths", "scrupulous with oaths"]
};
var traitWord = (t, v) => TRAIT_WORDS[t][v >= 50 ? 1 : 0];
/** Dossier: plain-language summary the council panel renders. No raw numbers except bands. */
function dossier(r) {
	const top = dominantTraits(r.traits, 3);
	return {
		name: r.name,
		age: r.age,
		headline: top.map((t) => traitWord(t, r.traits[t])).join(", "),
		contradiction: r.contradiction?.note ?? null,
		wants: r.ambitions,
		fears: r.fear,
		competences: Object.fromEntries(Object.entries(r.comp).map(([k, v]) => [k, BAND_LABELS[bandOf(v)]])),
		values: STREAMS.filter((s) => appetite(r)[s] >= 1.5),
		debug: describe(r)
	};
}
var relationWord = (t) => bondLabel(t.bond);
/** Houses (families) have personalities of their own, separate from any one ruler. A house biases the sampling of every
* member born into it, and has internal factions that rule inside the polity (the "internal rule" layer).
* Pure + seeded. */
var FACTIONS_BY_FORM = {
	bigMan: [
		"kin",
		"warriors",
		"elders"
	],
	chiefly: [
		"kin",
		"warriors",
		"elders",
		"priests"
	],
	monarchy: [
		"landholders",
		"warriors",
		"priests",
		"merchants",
		"kin"
	],
	oligarchy: [
		"merchants",
		"landholders",
		"assembly",
		"warriors"
	],
	republic: [
		"assembly",
		"merchants",
		"commons",
		"landholders"
	],
	theocracy: [
		"priests",
		"warriors",
		"landholders",
		"commons"
	],
	league: [
		"assembly",
		"kin",
		"merchants",
		"warriors"
	]
};
var DEMAND = {
	kin: "offices for the family",
	warriors: "war and spoils",
	priests: "tithes and temples",
	elders: "a say in every major choice",
	merchants: "safe roads and low tariffs",
	landholders: "land and tax relief",
	commons: "bread and fair courts",
	assembly: "regular votes and a respected law"
};
function generateFactions(seed, p) {
	const r = makeRng(hash32("fac", seed));
	const kinds = FACTIONS_BY_FORM[p.form], raw = kinds.map(() => .2 + r());
	const s = raw.reduce((a, b) => a + b, 0);
	return kinds.map((k, i) => ({
		kind: k,
		power: raw[i] / s,
		loyalty: Math.round(normal(r, 55, 15)),
		demand: DEMAND[k]
	}));
}
/** Ruler vs factions: how much the ruler's personality pleases each faction (−1..1). Feeds loyalty drift and unrest. */
function factionPleasure(k, t) {
	const v = (x) => (x - 50) / 50;
	switch (k) {
		case "warriors": return clamp$1(.6 * v(t.boldness) + .4 * v(t.cruelty) + .3 * v(t.ambition), -1, 1);
		case "priests": return clamp$1(.9 * v(t.piety) + .2 * v(t.tradition), -1, 1);
		case "merchants": return clamp$1(.5 * v(t.prudence) + .4 * v(t.innovation) + .3 * v(t.generosity) - .3 * v(t.cruelty), -1, 1);
		case "elders": return clamp$1(.7 * v(t.tradition) + .3 * v(t.honor) - .3 * v(t.innovation), -1, 1);
		case "commons": return clamp$1(.6 * v(t.mercy) + .4 * v(t.generosity) - .3 * v(t.pride), -1, 1);
		case "landholders": return clamp$1(.5 * v(t.tradition) + .3 * v(t.generosity) - .3 * v(t.ambition), -1, 1);
		case "kin": return clamp$1(.7 * v(t.honor) + .4 * v(t.generosity), -1, 1);
		case "assembly": return clamp$1(.5 * v(t.mercy) + .4 * v(t.honor) - .4 * v(t.pride) - .3 * v(t.cruelty), -1, 1);
	}
}
/** One year of internal politics: loyalty drifts toward the ruler's pleasure and away from unmet demands. Returns new factions. */
function stepFactions(fs, ruler, satisfied = {}) {
	return fs.map((f) => {
		const pull = factionPleasure(f.kind, ruler) * 3 + (satisfied[f.kind] ? 2 : -1.5);
		return {
			...f,
			loyalty: Math.round(clamp$1(f.loyalty + pull, 0, 100))
		};
	});
}
/** Share of internal power that is hostile (loyalty<35), weighted: the input unrest.ts calls coalitionLoss. */
var coalitionLoss = (fs) => Math.min(100, Math.round(100 * fs.reduce((s, f) => s + (f.loyalty < 35 ? f.power : 0), 0)));
function councilModel(g, team = 0) {
	const empty = {
		enabled: false,
		stage: "household",
		showSuccession: false,
		showFactions: false,
		factions: [],
		coalitionLoss: 0,
		glory: [],
		gloryScore: 0,
		neighbours: [],
		log: []
	};
	if (!rulersEnabled(g)) return empty;
	ensureRulers(g);
	const r = rulersOf(g.state);
	const me = r?.societies[String(team)];
	if (!r || !me) return empty;
	const pop = livingPeople(g, team), f = familyFeatures(me.civ.polity.tier, pop), d = me.dynasty, head = d.people[d.rulerId];
	const person = head?.ruler;
	const factions = f.factions ? stepFactions(generateFactions(me.civ.ruler.seed, me.civ.polity), person?.traits ?? me.civ.ruler.traits) : [];
	const role = (id) => id === d.rulerId ? "ruler" : d.people[id]?.spouse === d.rulerId ? "consort" : d.people[id]?.parent === d.rulerId ? "child" : "kin";
	const exp = expansionOf(g, team);
	const neighbours = g.state.tribes.map((t, i) => i).filter((i) => i !== team && i !== 3 && societyRelation(g, team, i).known).map((i) => {
		const o = r.societies[String(i)], ties = tiesBetween(g, team, i), im = implications(ties), rel = societyRelation(g, team, i);
		return {
			team: i,
			name: g.tribe(i).name,
			bond: relationWord(ties),
			trust: Math.round(rel.trust * 100),
			grievance: Math.round(rel.grievance * 100),
			hostile: rel.hostile,
			atPeace: rel.peaceUntil > g.state.time,
			identity: societyIdentity(g, i),
			canMarry: !!o && familyFeatures(o.civ.polity.tier, livingPeople(g, i)).marriageExchange && f.marriageExchange,
			means: [
				im.willJoinDefensiveWar && "would join a defensive war",
				im.willDemandSeatInSuccession && "may claim a seat in the line",
				im.vendettaRisk && "a vendetta is brewing",
				im.cbAvailable && `grounds for a ${im.cbAvailable} claim`
			].filter(Boolean)
		};
	});
	const hp = f.showSuccessionUI && head ? heir(d, me.civ.polity.succession, makeRng(hash32("handover-preview", d.generation, d.rulerId))) : void 0;
	return {
		handover: f.showSuccessionUI && head ? {
			law: me.civ.polity.succession,
			rulerAge: head.age,
			yearlyRisk: Math.round(yearlyDeathChance(head.age) * 100),
			extinct: !hp && !d.regent,
			regent: d.regent ? d.people[d.regent]?.name : void 0,
			heir: hp ? {
				name: hp.name,
				age: hp.age,
				role: role(hp.id),
				adult: hp.age >= 16,
				legit: hp.legit,
				claim: hp.claimStrength,
				headline: hp.ruler ? dossier(hp.ruler).headline : "untested"
			} : void 0,
			others: Object.values(d.people).filter((p) => p.alive && p.id !== d.rulerId && p.id !== hp?.id && p.parent === d.rulerId).map((p) => ({
				name: p.name,
				age: p.age,
				role: role(p.id)
			}))
		} : void 0,
		enabled: true,
		stage: f.stage,
		showSuccession: f.showSuccessionUI,
		showFactions: f.factions,
		ruler: person ? { ...(({ name, age, headline, contradiction, wants, fears, competences, values }) => ({
			name,
			age,
			headline,
			contradiction,
			wants: wants.map(String),
			fears: String(fears),
			competences,
			values
		}))(dossier(person)) } : void 0,
		house: {
			name: d.house,
			generation: d.generation,
			family: Object.values(d.people).filter((p) => p.alive).map((p) => ({
				name: p.name,
				age: p.age,
				role: role(p.id),
				adult: p.age >= 16
			}))
		},
		polity: {
			form: me.civ.polity.form,
			law: me.civ.polity.succession,
			tier: me.civ.polity.tier
		},
		factions: factions.map((x) => ({
			kind: x.kind,
			power: Math.round(x.power * 100),
			loyalty: x.loyalty,
			demand: x.demand
		})),
		coalitionLoss: coalitionLoss(factions),
		glory: STREAMS.map((s) => ({
			stream: s,
			value: Math.round(me.ledger[s])
		})),
		gloryScore: Math.round(score(me.ledger)),
		expansion: exp ? {
			mode: exp.mode,
			drive: exp.drive,
			why: exp.why
		} : void 0,
		neighbours,
		log: d.log.slice(-6)
	};
}
var ENGINE_READ_MODEL_RULES = {
	maximumSources: 128,
	maximumCacheEntries: 256,
	cacheMilliseconds: 500,
	maximumMeasurements: 240
};
var id = (v) => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
function isEngineReadQuery(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const q = value, list = (v) => Array.isArray(v) && v.length <= ENGINE_READ_MODEL_RULES.maximumSources && Array.from(v).every(id) && new Set(v).size === v.length;
	if (q.kind === "rulers-council" || q.kind === "capitulation-offers") return Object.keys(q).length === 1;
	if (q.kind === "building-fabric") return Object.keys(q).every((k) => ["kind", "buildingId"].includes(k)) && id(q.buildingId);
	if (q.kind === "construction-status") return Object.keys(q).every((k) => ["kind", "buildingIds"].includes(k)) && list(q.buildingIds);
	if (q.kind === "recipe-issues") return Object.keys(q).every((k) => ["kind", "workplaceId"].includes(k)) && id(q.workplaceId);
	if (q.kind === "armor-choice") return Object.keys(q).every((k) => ["kind", "unitId"].includes(k)) && id(q.unitId);
	if (q.kind === "fibre-issues") return Object.keys(q).every((k) => [
		"kind",
		"unitId",
		"patchIds"
	].includes(k)) && id(q.unitId) && list(q.patchIds);
	if (q.kind === "clay-issues") return Object.keys(q).every((k) => [
		"kind",
		"unitId",
		"depositIds"
	].includes(k)) && id(q.unitId) && list(q.depositIds);
	return false;
}
/** Authoritative native read model. Routing/ownership caches never initialize on the display copy. */
function applyEngineReadQuery(g, query) {
	if (!isEngineReadQuery(query)) throw new Error("Unsupported or malformed owner read query");
	if (query.kind === "rulers-council") return {
		kind: query.kind,
		council: councilModel(g)
	};
	if (query.kind === "capitulation-offers") return {
		kind: query.kind,
		offers: capitulationOffers(g).map((o) => ({
			...o,
			defenderName: g.tribe(o.defenderTeam)?.name ?? "A community"
		}))
	};
	if (query.kind === "building-fabric") {
		const b = g.state.buildings.find((b) => b.id === query.buildingId && b.team === 0 && b.hp > 0);
		if (!b) throw new Error("Original owned building is unavailable");
		const choices = [{ mode: "rebuild" }, ...[
			"north",
			"south",
			"east",
			"west"
		].map((side) => ({
			mode: "extend",
			side
		}))].map(({ mode, side }) => {
			const q = ERA_UPGRADE_RULES[mode], issue = eraUpgradeIssue(g, b.id, mode, side);
			return {
				mode,
				...side ? { side } : {},
				issue,
				quote: {
					wood: q.wood,
					stone: q.stone,
					plantFibre: q.plantFibre
				},
				workSeconds: q.workSeconds,
				...!issue && supportsEraUpgrade(b.type) ? { target: planEraChange(g, b, mode, side).target } : {}
			};
		});
		const p = b.renovation, work = p && (p.mode === "rebuild" || p.mode === "extend") ? {
			mode: p.mode,
			phase: p.phase,
			progress: p.progress,
			duration: p.duration,
			paid: p.paid,
			paused: b.planPaused === true,
			...p.blockedReason ? { blockedReason: p.blockedReason } : {}
		} : void 0;
		return {
			kind: query.kind,
			buildingId: b.id,
			context: fabricContext(b),
			benefits: eraUpgradeBenefits(b),
			...work ? { work } : {},
			choices
		};
	}
	if (query.kind === "construction-status") return {
		kind: query.kind,
		statuses: query.buildingIds.flatMap((buildingId) => {
			const b = g.state.buildings.find((b) => b.id === buildingId && b.team === 0 && b.hp > 0);
			return b ? [{
				buildingId,
				status: planStatus(g, b)
			}] : [];
		})
	};
	if (query.kind === "recipe-issues") {
		const b = g.state.buildings.find((b) => b.id === query.workplaceId && b.team === 0 && g.finished(b));
		if (!b) throw new Error("Original owned finished workplace is unavailable");
		const recipes = Object.entries(PRODUCTION_RECIPES).filter(([, r]) => r.workplace === b.type);
		return {
			kind: query.kind,
			workplaceId: b.id,
			issues: recipes.map(([recipe]) => ({
				recipe,
				issue: productionIssue(g, recipe, b.id)
			}))
		};
	}
	const u = g.state.units.find((u) => u.id === query.unitId && u.team === 0 && u.hp > 0 && !u.prisoner);
	if (!u) throw new Error("Original owned resident is unavailable");
	if (query.kind === "fibre-issues") {
		const known = new Set(g.state.fibre?.patches.filter((p) => p.knownTeams.includes(0)).map((p) => p.id));
		return {
			kind: query.kind,
			unitId: u.id,
			issues: query.patchIds.filter((id) => known.has(id)).map((patchId) => ({
				patchId,
				issue: fibreGatherIssue(g, u.id, patchId)
			}))
		};
	}
	if (query.kind === "clay-issues") {
		const known = new Set(g.state.clay?.deposits.filter((d) => d.surveyedBy.includes(0)).map((d) => d.id));
		return {
			kind: query.kind,
			unitId: u.id,
			issues: query.depositIds.filter((id) => known.has(id)).map((depositId) => ({
				depositId,
				issue: clayIssue(g, u.id, depositId)
			}))
		};
	}
	const worn = wornArmor(g, u);
	const available = (g.state.armor?.assets || []).filter((a) => a.holder.kind !== "unit" && (a.holder.kind === "ground" ? g.visibleAt(a.holder.x, a.holder.z) : a.team === u.team) && Math.hypot(a.holder.x - u.x, a.holder.z - u.z) <= 24).map((asset) => ({
		asset,
		issue: armorEquipIssue(g, u.id, asset.id)
	})).sort((a, b) => Number(!!a.issue) - Number(!!b.issue) || b.asset.condition - a.asset.condition)[0];
	return {
		kind: "armor-choice",
		unitId: u.id,
		wornArmorId: worn?.id,
		availableArmorId: available?.asset.id,
		issue: available ? available.issue : "No actual armor is available nearby"
	};
}
/** Keep a slow simulation from monopolising the next drawing opportunity.
* Fixed simulation quanta are preserved; excess real-time debt is discarded,
* never converted into a larger simulation step or skipped world events. */
var FRAME_SIMULATION_RULES = Object.freeze({
	stepSeconds: 1 / 30,
	wallBudgetMs: 10,
	maximumSteps: 3,
	maximumPendingSeconds: 1 / 30
});
function advanceFrameSimulation(pending, elapsed, step, now = () => performance.now()) {
	const r = FRAME_SIMULATION_RULES;
	let accumulator = Math.max(0, pending) + Math.max(0, elapsed), steps = 0;
	const start = now();
	while (accumulator + 1e-12 >= r.stepSeconds && steps < r.maximumSteps) {
		if (steps > 0 && now() - start >= r.wallBudgetMs) break;
		step(r.stepSeconds);
		accumulator = Math.max(0, accumulator - r.stepSeconds);
		steps++;
	}
	const deferred = accumulator >= r.stepSeconds - 1e-12, discardedSeconds = Math.max(0, accumulator - r.maximumPendingSeconds);
	return {
		pendingSeconds: Math.min(accumulator, r.maximumPendingSeconds),
		steps,
		limited: deferred,
		discardedSeconds
	};
}
var SIMULATION_WORKER_RULES = {
	version: 1,
	stepSeconds: FRAME_SIMULATION_RULES.stepSeconds,
	maximumTicksPerRequest: FRAME_SIMULATION_RULES.maximumSteps,
	maximumActorsPerCommand: 128,
	retainedCommandOutcomes: 128,
	maximumPendingRequests: 128,
	maximumPoseFrames: 2,
	maximumPoseEntities: 2e4,
	poseStride: 9
};
var SimulationWorkerError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.name = "SimulationWorkerError";
		this.code = code;
	}
};
/** Transport only: never imports Game or executes/serializes simulation on main. */
var SimulationWorkerClient = class {
	worker;
	epoch = 0;
	requestId = 0;
	sequence = 0;
	disposed = false;
	faulted = false;
	pending = /* @__PURE__ */ new Map();
	timeout;
	advanceToken = null;
	releasedFrames = /* @__PURE__ */ new WeakSet();
	constructor(options = {}) {
		this.timeout = options.timeoutMilliseconds ?? 3e4;
		if (!Number.isFinite(this.timeout) || this.timeout <= 0) throw new RangeError("Invalid simulation worker timeout");
		this.worker = (options.createWorker ?? (() => new Worker(new URL("./simulation.worker.ts", import.meta.url), { type: "module" })))();
		this.worker.onmessage = (event) => this.receive(event.data);
		this.worker.onerror = (event) => {
			event.preventDefault();
			this.fail("worker-error", "Authoritative worker failed; no stale main-thread fallback was attempted");
		};
		this.worker.onmessageerror = () => this.fail("message-error", "Authoritative worker response could not be decoded");
	}
	initialize(snapshot, context) {
		if (this.disposed) return Promise.reject(new SimulationWorkerError("disposed", "Simulation worker client is disposed"));
		this.rejectPending(new SimulationWorkerError("session-replaced", "A new session superseded this request"));
		this.epoch++;
		this.requestId = 0;
		this.sequence = 0;
		this.faulted = false;
		this.advanceToken = null;
		this.releasedFrames = /* @__PURE__ */ new WeakSet();
		return this.send({
			type: "initialize",
			protocolVersion: 1,
			snapshot,
			rngMode: "legacy-worker-random",
			context
		}, "ready");
	}
	command(command, selection) {
		const blocked = this.admissionError();
		if (blocked) return Promise.reject(blocked);
		return this.send({
			type: "command",
			sequence: ++this.sequence,
			command,
			selection
		}, "command-result");
	}
	/** Retry the identical existing sequence; worker returns its bounded prior outcome without replay. */
	retryCommand(sequence, command, selection) {
		return this.send({
			type: "command",
			sequence,
			command,
			selection
		}, "command-result");
	}
	/** The host retains unsubmitted tick debt when this rejects with backpressure. */
	advance(ticks, afterSequence = this.sequence, selection) {
		if (this.advanceToken) return Promise.reject(new SimulationWorkerError("advance-busy", "One authoritative advance is already pending; retain host tick debt"));
		const blocked = this.admissionError();
		if (blocked) return Promise.reject(blocked);
		const token = {};
		this.advanceToken = token;
		return this.send({
			type: "advance",
			ticks,
			afterSequence,
			selection
		}, "advanced").finally(() => {
			if (this.advanceToken === token) this.advanceToken = null;
		});
	}
	readModel(query) {
		return this.send({
			type: "read-model",
			query
		}, "read-model-result");
	}
	presentation(includeWorld = false, selection) {
		return this.send({
			type: "presentation",
			afterSequence: this.sequence,
			includeWorld,
			selection
		}, "presentation");
	}
	checkpoint(afterSequence = this.sequence) {
		return this.send({
			type: "checkpoint",
			afterSequence
		}, "checkpoint");
	}
	inspect(query) {
		return this.send({
			type: "inspect",
			query
		}, "inspection");
	}
	recycle(frame) {
		if (frame.epoch !== this.epoch) return Promise.reject(new SimulationWorkerError("stale-frame", "A prior session frame cannot recycle current buffer custody"));
		if (this.releasedFrames.has(frame) || frame.ids.byteLength === 0 || frame.poses.byteLength === 0) return Promise.reject(new SimulationWorkerError("buffer-custody", "This pose frame was already released"));
		const blocked = this.admissionError();
		if (blocked) return Promise.reject(blocked);
		this.releasedFrames.add(frame);
		return this.send({
			type: "recycle",
			frameId: frame.frameId,
			ids: frame.ids.buffer,
			poses: frame.poses.buffer
		}, "recycled", [frame.ids.buffer, frame.poses.buffer]);
	}
	/** Bounded batch size is exported to hosts; no worker tick scheduling is hidden in the client. */
	get maximumTicksPerRequest() {
		return SIMULATION_WORKER_RULES.maximumTicksPerRequest;
	}
	admissionError() {
		if (this.disposed || this.faulted) return new SimulationWorkerError(this.disposed ? "disposed" : "faulted", "No active authoritative worker transport");
		if (this.epoch === 0) return new SimulationWorkerError("not-initialized", "Initialize a saved village first");
		if (this.pending.size >= SIMULATION_WORKER_RULES.maximumPendingRequests) return new SimulationWorkerError("backpressure", "Pending request bound reached; request was not admitted");
		return null;
	}
	send(payload, expected, transfer = []) {
		const blocked = this.admissionError();
		if (blocked) return Promise.reject(blocked);
		const requestId = ++this.requestId, epoch = this.epoch;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => this.fail("timeout", "Authoritative outcome is unknown; transport paused instead of replaying or saving stale main state"), this.timeout);
			this.pending.set(requestId, {
				expected,
				resolve: (message) => resolve(message),
				reject,
				timer
			});
			try {
				this.worker.postMessage({
					...payload,
					epoch,
					requestId
				}, transfer);
			} catch (error) {
				clearTimeout(timer);
				this.pending.delete(requestId);
				this.fail("dispatch-error", "Could not dispatch an authoritative request");
				reject(error instanceof Error ? error : /* @__PURE__ */ new Error("Worker dispatch failed"));
			}
		});
	}
	receive(message) {
		if (!message || typeof message !== "object") return;
		const result = message;
		if (result.epoch !== this.epoch) return;
		const pending = this.pending.get(result.requestId);
		if (!pending) return;
		clearTimeout(pending.timer);
		this.pending.delete(result.requestId);
		if (result.type === "error") {
			const error = new SimulationWorkerError(result.code, result.message);
			pending.reject(error);
			if (result.code === "runtime-error" || pending.expected === "ready") this.fail(result.code, result.message);
			return;
		}
		if (result.type !== pending.expected) {
			pending.reject(new SimulationWorkerError("response-type", "Unexpected authoritative response"));
			this.fail("response-type", "Unexpected authoritative response");
			return;
		}
		if (result.type === "ready" && result.protocolVersion !== SIMULATION_WORKER_RULES.version) {
			pending.reject(new SimulationWorkerError("protocol-version", "Worker protocol version differs"));
			this.fail("protocol-version", "Worker protocol version differs");
			return;
		}
		pending.resolve(result);
	}
	rejectPending(error) {
		for (const p of this.pending.values()) {
			clearTimeout(p.timer);
			p.reject(error);
		}
		this.pending.clear();
	}
	fail(code, message) {
		this.faulted = true;
		this.advanceToken = null;
		this.rejectPending(new SimulationWorkerError(code, message));
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.advanceToken = null;
		this.rejectPending(new SimulationWorkerError("disposed", "Simulation worker client disposed"));
		this.worker.terminate();
	}
};
var queries = /* @__PURE__ */ new Set([
	"height",
	"waterAt",
	"travelHeight",
	"campOf",
	"finished",
	"tribe",
	"popNow",
	"popCap",
	"queued",
	"dayPhase",
	"daylight",
	"isNight",
	"seasonMix",
	"clockState",
	"solidBuilding",
	"terrainRevision",
	"navigationRevision",
	"visibleAt",
	"exploredAt",
	"regionAt",
	"selectedUnits",
	"isFoe",
	"isAlly",
	"musicMood"
]);
var deniedArrayMethods = /* @__PURE__ */ new Set([
	"copyWithin",
	"fill",
	"pop",
	"push",
	"reverse",
	"shift",
	"sort",
	"splice",
	"unshift",
	"set"
]);
function readOnlyGraph() {
	const cache = /* @__PURE__ */ new WeakMap();
	const wrap = (value) => {
		if (!value || typeof value !== "object") return value;
		const old = cache.get(value);
		if (old) return old;
		const proxy = new Proxy(value, {
			set() {
				throw new Error("Worker projection is read-only; dispatch an authoritative command");
			},
			deleteProperty() {
				throw new Error("Worker projection is read-only");
			},
			defineProperty() {
				throw new Error("Worker projection is read-only");
			},
			setPrototypeOf() {
				throw new Error("Worker projection is read-only");
			},
			get(target, key, receiver) {
				if (target instanceof Set || target instanceof Map) {
					if ([
						"add",
						"set",
						"clear",
						"delete"
					].includes(String(key))) return () => {
						throw new Error("Worker projection collections are read-only");
					};
					if (key === "size") return target.size;
					if (key === Symbol.iterator || key === "values" || key === "entries" || key === "keys") return function* () {
						const iterator = Reflect.apply(Reflect.get(target, key, target), target, []);
						for (const item of iterator) yield wrap(item);
					};
					const item = Reflect.get(target, key, target);
					return typeof item === "function" ? (...args) => wrap(Reflect.apply(item, target, args)) : wrap(item);
				}
				if (ArrayBuffer.isView(target)) {
					if (key === Symbol.iterator || key === "values" || key === "entries" || key === "keys") return function* () {
						const iterator = Reflect.apply(Reflect.get(target, key, target), target, []);
						for (const item of iterator) yield wrap(item);
					};
					if (key === "buffer") return target.buffer.slice(0);
					const item = Reflect.get(target, key, target);
					if (typeof item === "function") {
						if (deniedArrayMethods.has(String(key))) return () => {
							throw new Error("Worker projection buffers are read-only");
						};
						return (...args) => {
							const safe = args.map((arg) => typeof arg === "function" ? (...items) => Reflect.apply(arg, void 0, items.map(wrap)) : arg);
							return wrap(Reflect.apply(item, target, safe));
						};
					}
					return wrap(item);
				}
				const item = Reflect.get(target, key, receiver);
				return wrap(item);
			}
		});
		cache.set(value, proxy);
		return proxy;
	};
	return wrap;
}
/** No Game constructor/reset/decode/step on main: only its reviewed read methods are reused. */
var SimulationRenderProjection = class {
	game;
	raw = Object.create(Game.prototype);
	wrap = readOnlyGraph();
	packet = null;
	samplerWorld = null;
	revision = -1;
	units = /* @__PURE__ */ new Map();
	selection = /* @__PURE__ */ new Set();
	selectedBuilding;
	selectedBoat;
	constructor() {
		this.game = new Proxy(this.raw, {
			get: (target, key) => {
				if (key === "waterAt") return (x, z) => {
					if (!this.samplerWorld) throw new Error("Presentation water is not ready");
					return waterSurfaceAt(this.samplerWorld, x, z);
				};
				if (key === "selectedBoat") return this.selectedBoat ?? null;
				if (key === "selectedUnits") return () => this.wrap([...this.units.values()].filter((u) => this.selection.has(u.id) && u.hp > 0 && u.team === 0));
				if (key === "navigationRevision") return () => this.packet?.navigationRevision ?? 0;
				const value = Reflect.get(target, key, target);
				if (typeof value === "function") {
					if (!queries.has(String(key))) return () => {
						throw new Error(`Game.${String(key)} is unavailable on the worker read-only projection`);
					};
					return (...args) => this.wrap(Reflect.apply(value, this.game, args));
				}
				return this.wrap(value);
			},
			set() {
				throw new Error("Worker projection is read-only; dispatch an authoritative command");
			},
			deleteProperty() {
				throw new Error("Worker projection is read-only");
			},
			defineProperty() {
				throw new Error("Worker projection is read-only");
			},
			setPrototypeOf() {
				throw new Error("Worker projection is read-only");
			}
		});
	}
	setDisplaySettings(quality, fps) {
		this.raw.quality = quality;
		this.raw.fps = fps;
	}
	get hud() {
		if (!this.packet) throw new Error("Presentation is not ready");
		return this.wrap(this.packet.hud);
	}
	apply(packet, clock) {
		if (clock.stateRevision < this.revision) return;
		if (!this.packet && !packet.world) throw new Error("First presentation requires owned terrain");
		if (packet.world) {
			this.raw.world = packet.world;
			this.samplerWorld = { ...packet.world };
			prepareOwnedWaterWorld(this.samplerWorld, true);
		}
		this.packet = packet;
		this.revision = clock.stateRevision;
		this.raw.state = packet.state;
		if (this.samplerWorld) this.samplerWorld.waterY = packet.worldWaterY;
		setPresentationSurvivalView(this.game, packet.heatingHearthIds, packet.burningFireTeams);
		this.raw.world.waterY = packet.worldWaterY;
		this.raw.world.camps = packet.worldCamps;
		this.raw.vision = packet.vision;
		this.raw.territory = packet.territory;
		this.raw.territoryStrength = packet.territoryStrength;
		this.raw.started = packet.started;
		this.raw.awaitingStart = packet.awaitingStart;
		this.raw.testMode = packet.testMode;
		this.raw.revealMap = packet.revealMap;
		this.raw.chopMarks = new Set(packet.chopMarks);
		this.raw.looted = new Set(packet.looted);
		Object.assign(this.raw, { bridges: packet.state.buildings.filter((b) => !!b.bridge) });
		this.units = new Map(packet.state.units.map((u) => [u.id, u]));
		this.applySelection();
	}
	select(unitIds, buildingId, boatId) {
		this.selection = new Set(unitIds);
		this.selectedBuilding = buildingId;
		this.selectedBoat = boatId;
		this.applySelection();
	}
	applySelection() {
		if (!this.packet) return;
		for (const u of this.raw.state.units) u.selected = this.selection.has(u.id);
		for (const b of this.raw.state.buildings) b.selected = b.id === this.selectedBuilding;
		this.raw.state.selBld = this.raw.state.buildings.find((b) => b.id === this.selectedBuilding) ?? null;
	}
	applyPose(frame) {
		if (!this.packet || frame.stateRevision < this.revision) return;
		for (let i = 0; i < frame.count; i++) {
			const u = this.units.get(frame.ids[i]);
			if (!u) continue;
			const k = i * frame.stride, p = frame.poses;
			u.x = p[k];
			u.y = p[k + 1];
			u.z = p[k + 2];
			u.facing = p[k + 3];
			u.stride = p[k + 4];
			u.hp = p[k + 5];
			u.maxHp = p[k + 6];
			u.vx = p[k + 7];
			u.vz = p[k + 8];
		}
		this.raw.state.time = frame.time;
		this.revision = frame.stateRevision;
	}
};
var SIMULATION_HOST_RULES = {
	maximumQueuedOperations: 128,
	presentationIntervalSeconds: .2
};
/** Experimental owner bridge. No main Game exists or steps here. Not a public option. */
var SimulationWorkerHost = class {
	projection = new SimulationRenderProjection();
	client;
	onPresentation;
	onFault;
	tail = Promise.resolve();
	queued = 0;
	advancing = false;
	presenting = false;
	disposed = false;
	failed = false;
	initialized = false;
	generation = 0;
	debt = 0;
	presentationDebt = 0;
	clock = null;
	measurements = [];
	measure(stage, cpuMilliseconds, stateRevision) {
		this.measurements.push({
			stage,
			cpuMilliseconds,
			stateRevision
		});
		if (this.measurements.length > ENGINE_READ_MODEL_RULES.maximumMeasurements) this.measurements.shift();
	}
	recordPresentation(result) {
		this.measure("presentation-capture", result.captureMilliseconds, result.clock.stateRevision);
		if (result.previousDispatch) this.measure("presentation-dispatch", result.previousDispatch.cpuMilliseconds, result.previousDispatch.stateRevision);
	}
	selection = { selectedUnitIds: [] };
	constructor(options = {}) {
		this.client = options.client ?? new SimulationWorkerClient();
		this.onPresentation = options.onPresentation ?? (() => {});
		this.onFault = options.onFault ?? (() => {});
	}
	get epoch() {
		return this.generation;
	}
	get ready() {
		return this.initialized && !this.disposed && !this.failed;
	}
	get game() {
		return this.projection.game;
	}
	get hud() {
		return this.projection.hud;
	}
	/** Retained debt is observable and NEVER discarded as a performance optimization. */
	get report() {
		return {
			epoch: this.epoch,
			ready: this.ready,
			pendingOperations: this.queued,
			pendingSimulationSeconds: this.debt,
			clock: this.clock,
			measurements: this.measurements.map((m) => ({ ...m }))
		};
	}
	async initialize(snapshot, context) {
		if (this.disposed) throw new Error("Worker host is disposed");
		if (this.initialized || this.queued) throw new Error("Replace the host for a new village; never mix session operations");
		const epoch = ++this.generation;
		const result = await this.client.initialize(snapshot, context);
		if (epoch !== this.generation) throw new Error("Worker session superseded");
		this.clock = result.clock;
		const presentation = await this.client.presentation(true, this.selection);
		this.recordPresentation(presentation);
		this.projection.apply(presentation.presentation, presentation.clock);
		this.clock = presentation.clock;
		this.initialized = true;
		this.onPresentation();
	}
	select(selection) {
		this.selection = {
			selectedUnitIds: [...selection.selectedUnitIds],
			selectedBuildingId: selection.selectedBuildingId,
			selectedBoatId: selection.selectedBoatId
		};
		this.projection.select(selection.selectedUnitIds, selection.selectedBuildingId, selection.selectedBoatId);
		if (this.ready) this.requestPresentation();
	}
	dispatch(command, selection = this.selection) {
		const epoch = this.epoch, captured = {
			...selection,
			selectedUnitIds: [...selection.selectedUnitIds]
		};
		return this.enqueue(async () => {
			let result;
			try {
				result = await this.client.command(command, captured);
			} catch (error) {
				this.handleError(error);
				throw error;
			}
			this.clock = result.clock;
			try {
				const presentation = await this.client.presentation(false, this.selection);
				this.clock = presentation.clock;
				this.recordPresentation(presentation);
				this.projection.apply(presentation.presentation, presentation.clock);
				this.onPresentation();
			} catch (error) {
				this.handleError(error);
			}
			return {
				accepted: result.outcome.accepted,
				reason: result.outcome.reason,
				projectId: result.outcome.projectId,
				sequence: result.outcome.sequence,
				stateRevision: result.clock.stateRevision,
				epoch
			};
		});
	}
	/** Frame supplies wall time only; actual ticks execute exclusively inside WorkerRuntime. */
	advanceWallTime(seconds) {
		if (!this.ready) return;
		if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError("Invalid host frame interval");
		if (!this.clock?.paused) this.debt += seconds;
		this.presentationDebt += seconds;
		this.pump();
		if (this.presentationDebt >= SIMULATION_HOST_RULES.presentationIntervalSeconds) this.requestPresentation();
	}
	readModel(query) {
		const epoch = this.epoch, captured = structuredClone(query);
		return this.enqueue(async () => {
			const result = await this.client.readModel(captured);
			if (result.model.kind !== query.kind) throw new Error("Owner returned the wrong read model");
			this.clock = result.clock;
			this.measure("owner-query", result.cpuMilliseconds, result.clock.stateRevision);
			return {
				model: result.model,
				epoch,
				requestId: result.requestId,
				stateRevision: result.clock.stateRevision,
				navigationRevision: result.navigationRevision,
				cpuMilliseconds: result.cpuMilliseconds
			};
		});
	}
	checkpoint() {
		return this.enqueue(async () => {
			const result = await this.client.checkpoint();
			this.clock = result.clock;
			return result;
		});
	}
	enqueue(run) {
		if (!this.ready) return Promise.reject(new SimulationWorkerError("host-unavailable", "No authoritative host is ready"));
		if (this.queued >= SIMULATION_HOST_RULES.maximumQueuedOperations) return Promise.reject(new SimulationWorkerError("backpressure", "Host queue is full; command not admitted"));
		this.queued++;
		const operation = this.tail.then(() => {
			if (!this.ready) throw new SimulationWorkerError("host-unavailable", "Authoritative host stopped");
			return run();
		});
		this.tail = operation.catch(() => {});
		return operation.finally(() => {
			this.queued--;
			if (!this.advancing) this.pump();
		});
	}
	pump() {
		if (!this.ready || this.advancing || this.debt + 1e-12 < SIMULATION_WORKER_RULES.stepSeconds || this.clock?.paused || this.queued >= SIMULATION_HOST_RULES.maximumQueuedOperations) return;
		const ticks = Math.min(SIMULATION_WORKER_RULES.maximumTicksPerRequest, Math.floor((this.debt + 1e-12) / SIMULATION_WORKER_RULES.stepSeconds));
		this.advancing = true;
		this.enqueue(async () => {
			const result = await this.client.advance(ticks, void 0, this.selection);
			this.clock = result.clock;
			this.debt = Math.max(0, this.debt - result.ticks * SIMULATION_WORKER_RULES.stepSeconds);
			if (result.frame) {
				this.projection.applyPose(result.frame);
				await this.client.recycle(result.frame);
			}
		}).catch((error) => this.handleError(error)).finally(() => {
			this.advancing = false;
			this.pump();
		});
	}
	requestPresentation() {
		if (!this.ready || this.presenting) return;
		this.presenting = true;
		this.enqueue(async () => {
			const result = await this.client.presentation(false, this.selection);
			this.clock = result.clock;
			this.recordPresentation(result);
			this.projection.apply(result.presentation, result.clock);
			this.presentationDebt = 0;
			this.onPresentation();
		}).catch((error) => this.handleError(error)).finally(() => {
			this.presenting = false;
		});
	}
	handleError(error) {
		if (error instanceof SimulationWorkerError && (error.code === "backpressure" || error.code === "advance-busy")) return;
		this.failed = true;
		this.onFault(error instanceof Error ? error : new Error(String(error)));
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.generation++;
		this.initialized = false;
		this.client.dispose();
	}
};
var integer = (n) => typeof n === "number" && Number.isSafeInteger(n) && n > 0;
var object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var R = { maximumActorsPerCommand: 128 };
function selectedOwnedPeople(g, s) {
	return s.selectedUnitIds.map((id) => g.state.units.find((u) => u.id === id && u.team === 0 && u.hp > 0)).filter((u) => !!u);
}
/** Shared native executor. Only authoritative WorkerGame or main-mode Game may call this. */
function applyEngineCommand(g, command, selection = { selectedUnitIds: [] }) {
	const no = (reason) => ({
		accepted: false,
		reason
	});
	if (!isEngineDispatchCommand(command) || !isEngineSelection(selection)) return no("Unsupported or malformed command payload");
	if ("unitId" in command && command.unitId !== void 0 && !g.state.units.some((u) => u.id === command.unitId && u.team === 0 && u.hp > 0)) return no("Original owned person unavailable");
	switch (command.kind) {
		case "begin-era-upgrade":
			if (selectedOwnedPeople(g, selection).length !== selection.selectedUnitIds.length) return no("An explicitly selected original resident is unavailable");
			applyEngineSelection(g, selection);
			return beginEraUpgrade(g, command.buildingId, command.mode, command.mode === "extend" ? command.side : void 0);
		case "era-upgrade-pause": {
			const b = g.state.buildings.find((b) => b.id === command.buildingId && b.team === 0 && b.hp > 0);
			if (!b?.renovation || !["rebuild", "extend"].includes(b.renovation.mode)) return no("Original owned fabric upgrade unavailable");
			const accepted = setHousingPaused(g, b.id, command.paused);
			return {
				accepted,
				reason: accepted ? "Paid fabric work updated; physical inputs retained" : "Fabric work cannot make that transition"
			};
		}
		case "cancel-interaction":
			g.state.placing = null;
			g.state.pendingAge = false;
			g.clearSelect();
			return {
				accepted: true,
				reason: "Interaction cancelled"
			};
		case "hold-selected": {
			const people = command.unitIds.map((id) => g.state.units.find((u) => u.id === id && u.team === 0 && u.hp > 0));
			if (people.some((u) => !u)) return no("An original selected resident is unavailable");
			for (const u of people) {
				u.order = "hold";
				u.pillage = -1;
				u.target = null;
				u.attackDestination = null;
			}
			return {
				accepted: true,
				reason: "Selected residents holding"
			};
		}
		case "pause":
			if (typeof command.paused !== "boolean") return no("Invalid pause value");
			g.state.paused = command.paused;
			return {
				accepted: true,
				reason: "Pause applied"
			};
		case "speed":
			if (![
				1,
				2,
				4
			].includes(command.speed)) return no("Invalid simulation speed");
			g.state.speed = command.speed;
			if (command.resume === true) g.state.paused = false;
			return {
				accepted: true,
				reason: "Speed applied"
			};
		case "move": {
			if (!Array.isArray(command.unitIds) || !command.unitIds.length || command.unitIds.length > R.maximumActorsPerCommand || command.unitIds.some((id) => !integer(id)) || new Set(command.unitIds).size !== command.unitIds.length) return no("Choose distinct existing residents");
			if (!Number.isFinite(command.x) || !Number.isFinite(command.z) || Math.abs(command.x) > g.world.size / 2 - 1 || Math.abs(command.z) > g.world.size / 2 - 1 || command.attackMove !== void 0 && typeof command.attackMove !== "boolean") return no("Invalid destination");
			const units = command.unitIds.map((id) => g.state.units.find((u) => u.id === id && u.team === 0 && u.hp > 0 && !u.prisoner && !u.boat));
			if (units.some((u) => !u)) return no("An original land resident is unavailable; this core does not implement hull orders");
			g.clearSelect();
			for (const u of units) g.selectEntity(u, true);
			g.issueMove(command.x, command.z, command.attackMove === true);
			return {
				accepted: true,
				reason: "Move issued to original residents"
			};
		}
		case "begin-production": {
			if (!integer(command.workplaceId) || command.unitId !== void 0 && !integer(command.unitId) || typeof command.recipe !== "string" || !Object.hasOwn(PRODUCTION_RECIPES, command.recipe)) return no("Invalid recipe or original actor/workplace ID");
			const b = g.state.buildings.find((b) => b.id === command.workplaceId && b.team === 0 && b.hp > 0), u = command.unitId === void 0 ? void 0 : g.state.units.find((u) => u.id === command.unitId && u.team === 0 && u.hp > 0);
			if (!b || command.unitId !== void 0 && !u) return no("The original owned workplace or person is unavailable");
			const issue = productionIssue(g, command.recipe, b.id, command.unitId);
			if (issue) return no(issue);
			const before = new Set(g.state.production?.projects.map((p) => p.id) || []);
			if (!beginProduction(g, command.recipe, b.id, command.unitId)) return no(g.state.banner || "Paid production admission failed");
			return {
				accepted: true,
				reason: "Actual inputs paid once; original person begins work",
				projectId: g.state.production?.projects.find((p) => !before.has(p.id) && p.workplace === b.id && p.recipe === command.recipe)?.id
			};
		}
		case "pause-production":
		case "resume-production": {
			if (!integer(command.projectId) || !g.state.production?.projects.some((p) => p.id === command.projectId && p.team === 0)) return no("The original owned project is unavailable");
			if (command.kind === "resume-production" && command.unitId !== void 0 && (!integer(command.unitId) || !g.state.units.some((u) => u.id === command.unitId && u.team === 0 && u.hp > 0))) return no("The original owned person is unavailable");
			const accepted = command.kind === "pause-production" ? pauseProductionProject(g, command.projectId) : resumeProduction(g, command.projectId, command.unitId);
			return {
				accepted,
				reason: accepted ? "Original paid project updated" : "Original paid project cannot make that transition"
			};
		}
		case "equip-armor": return equipArmor(g, command.unitId, command.armorId);
		case "unequip-armor": return unequipArmor(g, command.unitId);
		case "survey-fibre":
		case "return-fibre":
		case "equip-basket":
		case "survey-clay":
		case "equip-water-vessel":
		case "swap-clothing":
		case "gather-fibre":
		case "gather-clay":
		case "equip-clothing": {
			const accepted = command.kind === "survey-fibre" ? surveyFibre(g, command.unitId) : command.kind === "return-fibre" ? returnFibreLoad(g, command.unitId) : command.kind === "equip-basket" ? equipBasket(g, command.unitId) : command.kind === "survey-clay" ? surveyClay(g, command.unitId) : command.kind === "equip-water-vessel" ? equipWaterVessel(g, command.unitId) : command.kind === "swap-clothing" ? swapClothing(g, command.unitId) : command.kind === "gather-fibre" ? beginFibreGather(g, command.unitId, command.patchId) : command.kind === "gather-clay" ? beginClayGather(g, command.unitId, command.depositId) : equipClothing(g, command.unitId, command.item);
			return {
				accepted,
				reason: accepted ? "Original resident and goods updated" : g.state.banner || "Physical request refused"
			};
		}
		case "set-auto-work":
			g.setAutoWork(command.enabled);
			return {
				accepted: true,
				reason: "Auto work updated"
			};
		case "defense-horn":
			g.soundDefenseHorn();
			return {
				accepted: true,
				reason: g.state.banner || "Defense horn sounded"
			};
		case "recall":
			g.soundRecall();
			return {
				accepted: true,
				reason: g.state.banner || "Recall issued"
			};
		case "production-control": {
			const project = g.state.production?.projects.find((p) => p.id === command.projectId && p.team === 0);
			if (!project) return no("Original paid project unavailable");
			const accepted = command.action === "unload" ? unloadProductionProject(g, project.id) : command.action === "pause" ? pauseProductionProject(g, project.id) : resumeProduction(g, project.id, command.unitId);
			return {
				accepted,
				reason: accepted ? "Original paid project updated" : g.state.banner || "Project cannot make that transition",
				projectId: project.id
			};
		}
		case "dairy-clean":
		case "dairy-discard": {
			const project = g.state.production?.projects.find((p) => p.id === command.projectId && p.team === 0);
			if (!project) return no("Original dairy project unavailable");
			const accepted = command.kind === "dairy-clean" ? queueDairyVesselCleaning(g, project.id, command.unitId) : discardDairyProject(g, project.id);
			return {
				accepted,
				reason: accepted ? "Original held vessel updated" : g.state.banner || "Dairy request refused",
				projectId: project.id
			};
		}
		case "marry-houses": {
			if (!g.tribe(command.team) || command.team === 0 || command.team === 3) return no("That society is not known");
			const r = marryHouses(g, 0, command.team);
			return r ? {
				accepted: true,
				reason: `A marriage binds the houses (${r.why[0]})`
			} : no("No suitable match, or a house is too small to exchange spouses");
		}
		case "foster-houses":
		case "exchange-hostages": {
			if (!g.tribe(command.team) || command.team === 0 || command.team === 3) return no("That society is not known");
			const fos = command.kind === "foster-houses", r = (fos ? fosterHouses : exchangeHostages)(g, 0, command.team);
			return r ? {
				accepted: true,
				reason: `${fos ? "Children are fostered" : "Hostages are exchanged"} (${r.why[0]})`
			} : no(fos ? "No child to foster, or a house is too small, or you are at war" : "No kinsman to send, or a house is too small, or you are at war");
		}
		case "accept-capitulation": return acceptCapitulation(g, command.frontId, command.outcome, 0);
		case "refuse-capitulation": return refuseCapitulation(g, command.frontId, 0) ? {
			accepted: true,
			reason: "Terms refused; they will resist harder"
		} : no("No offer to refuse here");
		case "boat-stop": {
			const boat = g.state.boats?.find((b) => b.id === command.boatId && b.team === 0 && b.hp > 0);
			if (!boat) return no("Original owned boat unavailable");
			const captain = g.state.units.find((u) => u.id === boat.captain && u.hp > 0 && u.team === boat.team && u.boat?.id === boat.id && u.boat.phase === "aboard");
			if (!captain) return no("Original aboard captain unavailable");
			delete boat.exploration;
			captain.order = "hold";
			g.invalidateRoute(captain);
			return {
				accepted: true,
				reason: "Actual boat stopped"
			};
		}
		case "construction-priority":
		case "site-preparation-pause":
		case "paused-plan":
		case "queue-construction":
		case "order-construction":
		case "craft-site-control": {
			const b = g.state.buildings.find((b) => b.id === command.buildingId && b.team === 0 && b.hp > 0);
			if (!b) return no("Original owned building unavailable");
			if ((command.kind === "queue-construction" || command.kind === "order-construction") && selectedOwnedPeople(g, selection).length !== selection.selectedUnitIds.length) return no("An explicitly selected original resident is unavailable");
			let accepted = false;
			if (command.kind === "construction-priority") accepted = setConstructionPriority(g, b, command.priority);
			else if (command.kind === "site-preparation-pause") accepted = setSitePreparationPaused(g, b, command.paused);
			else if (command.kind === "paused-plan") {
				if (!b.plannedCost) return no("This building has no paid construction plan");
				b.planPaused = command.paused;
				accepted = true;
			} else if (command.kind === "queue-construction") {
				const result = queueConstruction(g, b, selectedOwnedPeople(g, selection));
				accepted = result.accepted;
				g.banner(result.reason, 3);
			} else if (command.kind === "order-construction") accepted = orderConstruction(g, b, selectedOwnedPeople(g, selection));
			else {
				const job = craftSiteReport(g, b)?.jobs.find((j) => j.kind === command.jobKind && j.projectId === command.projectId && j.actorId === command.actorId);
				if (!job) return no("Original workplace task unavailable");
				accepted = controlCraftSiteJob(g, b, job, command.action);
			}
			return {
				accepted,
				reason: accepted ? "Original building/task updated" : g.state.banner || "Building request refused"
			};
		}
		case "construction-queue-control": {
			const u = g.state.units.find((u) => u.id === command.unitId && u.team === 0 && u.hp > 0);
			if (!u) return no("Original owned builder unavailable");
			const accepted = command.action === "pause" ? pauseConstructionQueue(g, u) : command.action === "resume" ? resumeConstructionQueue(g, u) : command.siteId !== void 0 && editConstructionQueue(g, u, command.siteId, command.action);
			return {
				accepted: !!accepted,
				reason: accepted ? "Original builder queue updated" : "Queue request refused"
			};
		}
		default: return no("This gameplay command is not implemented");
	}
}
/** Explicit flat registry: no arbitrary Game method names or executable closures. */
function isEngineDispatchCommand(value) {
	if (!object(value) || typeof value.kind !== "string") return false;
	const bool = (v) => typeof v === "boolean", id = (v) => integer(v), optionalId = (v) => v === void 0 || id(v);
	const action = (v) => v === "pause" || v === "resume" || v === "unload";
	const schema = {
		"begin-era-upgrade": {
			buildingId: id,
			mode: (v) => v === "rebuild" || v === "extend",
			side: (v) => v === void 0 || [
				"north",
				"south",
				"east",
				"west"
			].includes(v)
		},
		"era-upgrade-pause": {
			buildingId: id,
			paused: bool
		},
		"cancel-interaction": {},
		"hold-selected": { unitIds: (v) => Array.isArray(v) && v.length <= 128 && Array.from(v).every(id) && new Set(v).size === v.length },
		pause: { paused: bool },
		speed: {
			speed: (v) => v === 1 || v === 2 || v === 4,
			resume: (v) => v === void 0 || bool(v)
		},
		move: {
			unitIds: (v) => Array.isArray(v) && v.length > 0 && v.length <= 128 && Array.from(v).every(id) && new Set(v).size === v.length,
			x: (v) => typeof v === "number" && Number.isFinite(v),
			z: (v) => typeof v === "number" && Number.isFinite(v),
			attackMove: (v) => v === void 0 || bool(v)
		},
		"begin-production": {
			recipe: (v) => typeof v === "string" && Object.hasOwn(PRODUCTION_RECIPES, v),
			workplaceId: id,
			unitId: optionalId
		},
		"pause-production": { projectId: id },
		"resume-production": {
			projectId: id,
			unitId: optionalId
		},
		"equip-armor": {
			unitId: id,
			armorId: id
		},
		"unequip-armor": { unitId: id },
		"survey-fibre": { unitId: id },
		"return-fibre": { unitId: id },
		"equip-basket": { unitId: id },
		"survey-clay": { unitId: id },
		"equip-water-vessel": { unitId: id },
		"swap-clothing": { unitId: id },
		"gather-fibre": {
			unitId: id,
			patchId: id
		},
		"gather-clay": {
			unitId: id,
			depositId: id
		},
		"equip-clothing": {
			unitId: id,
			item: (v) => GARMENT_KINDS.includes(v)
		},
		"set-auto-work": { enabled: bool },
		"defense-horn": {},
		recall: {},
		"production-control": {
			projectId: id,
			action,
			unitId: optionalId
		},
		"dairy-clean": {
			projectId: id,
			unitId: optionalId
		},
		"dairy-discard": { projectId: id },
		"accept-capitulation": {
			frontId: id,
			outcome: (v) => [
				"occupy",
				"annex",
				"tribute",
				"puppet",
				"autonomy",
				"loot",
				"captives",
				"raze"
			].includes(v)
		},
		"refuse-capitulation": { frontId: id },
		"boat-stop": { boatId: id },
		"marry-houses": { team: id },
		"foster-houses": { team: id },
		"exchange-hostages": { team: id },
		"construction-priority": {
			buildingId: id,
			priority: (v) => v === 0 || v === 1 || v === 2
		},
		"site-preparation-pause": {
			buildingId: id,
			paused: bool
		},
		"paused-plan": {
			buildingId: id,
			paused: bool
		},
		"queue-construction": { buildingId: id },
		"order-construction": { buildingId: id },
		"construction-queue-control": {
			unitId: id,
			action: (v) => v === "pause" || v === "resume" || v === "up" || v === "down" || v === "remove",
			siteId: optionalId
		},
		"craft-site-control": {
			buildingId: id,
			jobKind: (v) => [
				"production",
				"haulage",
				"weapon",
				"tool",
				"copper",
				"helper"
			].includes(v),
			projectId: optionalId,
			actorId: (v) => v === null || id(v),
			action
		}
	};
	if (value.kind === "begin-era-upgrade" && (value.mode === "extend" && value.side === void 0 || value.mode === "rebuild" && value.side !== void 0)) return false;
	const fields = Object.hasOwn(schema, value.kind) ? schema[value.kind] : void 0;
	return !!fields && Object.keys(value).every((k) => k === "kind" || Object.hasOwn(fields, k)) && Object.entries(fields).every(([k, validate]) => validate(value[k]));
}
function isEngineSelection(value) {
	if (!object(value) || Object.keys(value).some((k) => ![
		"selectedUnitIds",
		"selectedBuildingId",
		"selectedBoatId"
	].includes(k))) return false;
	const ids = value.selectedUnitIds;
	return Array.isArray(ids) && ids.length <= 128 && Array.from(ids).every(integer) && new Set(ids).size === ids.length && (value.selectedBuildingId === void 0 || integer(value.selectedBuildingId)) && (value.selectedBoatId === void 0 || integer(value.selectedBoatId));
}
/** Selection is an ordered simulation input: native work/transport eligibility reads it. */
function applyEngineSelection(g, selection) {
	if (!isEngineSelection(selection)) throw new Error("Invalid selection digest");
	g.clearSelect();
	for (const id of selection.selectedUnitIds) {
		const u = g.state.units.find((u) => u.id === id && u.team === 0 && u.hp > 0);
		if (u) g.selectEntity(u, true);
	}
	const b = g.state.buildings.find((b) => b.id === selection.selectedBuildingId && b.hp > 0);
	if (b) g.selectEntity(b, true);
	if (selection.selectedBoatId !== void 0) g.selectBoat(selection.selectedBoatId);
}
var AUTOSAVE_RULES = Object.freeze({
	timeoutMilliseconds: 8e3,
	maximumMeasurements: 240,
	recoveryInitialCooldownMilliseconds: 3e4,
	recoveryBackoffMultiplier: 2,
	recoveryMaximumCooldownMilliseconds: 12e4,
	fastRecoveryAttempts: 3,
	recoveryLongCooldownMilliseconds: 3e5
});
var AutosaveController = class {
	lastFailure = null;
	failureCounts = {};
	recordFailure(reason, phase) {
		this.lastFailure = {
			reason,
			phase
		};
		this.failureCounts[reason] = (this.failureCounts[reason] ?? 0) + 1;
	}
	workerFailureStreak = 0;
	recoveryAttemptsUsed = 0;
	retryAfterMonotonicMilliseconds = 0;
	worker = null;
	disabled = false;
	disposed = false;
	confirmed = false;
	nextId = 0;
	active = null;
	pending = null;
	measurement = 0;
	work = [];
	counts = {
		requests: 0,
		workerJobs: 0,
		committed: 0,
		superseded: 0,
		failed: 0,
		fallbacks: 0,
		coalesced: 0
	};
	now;
	storage;
	createWorker;
	encode;
	synchronous;
	options;
	constructor(options) {
		this.options = options;
		this.now = options.now ?? (() => performance.now());
		this.storage = options.storage ?? localStorage;
		this.createWorker = options.createWorker ?? (() => new Worker(new URL("./autosave.worker.ts", import.meta.url), { type: "module" }));
		this.encode = options.encode ?? encodeGame;
		this.synchronous = options.syncSave ?? saveGame;
		if (options.listenToStorage !== false && typeof window !== "undefined") window.addEventListener("storage", this.storageChanged);
	}
	/** Reports actual synchronous tasks, including Worker reply callbacks outside request().
	* Observers are diagnostics only and cannot change save success or recovery. */
	measureMainThread(r, stage, fn) {
		const startMilliseconds = this.now();
		try {
			return fn();
		} finally {
			const endMilliseconds = this.now();
			if (r.measurement === this.measurement) try {
				this.options.onMainThreadWork?.({
					stage,
					startMilliseconds,
					endMilliseconds,
					durationMilliseconds: Math.max(0, endMilliseconds - startMilliseconds)
				});
			} catch {}
		}
	}
	eligible(g) {
		return !this.disposed && this.options.allowed?.() !== false && g.started && !g.awaitingStart && !g.testMode;
	}
	current(r) {
		return this.eligible(r.game) && this.options.getGame() === r.game && r.game.state === r.state && r.generation === currentSaveGeneration() && r.game.state.seed === r.seed && r.game.state.time >= r.time;
	}
	requestState(g) {
		return {
			game: g,
			state: g.state,
			generation: currentSaveGeneration(),
			seed: g.state.seed,
			time: g.state.time,
			requestedAt: this.now(),
			measurement: this.measurement
		};
	}
	request() {
		const g = this.options.getGame();
		if (!this.eligible(g)) return false;
		const r = this.requestState(g);
		this.counts.requests++;
		if (this.active) {
			if (this.pending) this.counts.coalesced++;
			this.pending = r;
			return true;
		}
		this.dispatch(r);
		return true;
	}
	storageChanged = (event) => {
		if (event.key === null || [
			"dawn-of-empire-v17",
			"dawn-of-empire-v17:bak",
			"dawn-of-empire-v17:protected"
		].includes(event.key)) this.invalidate();
	};
	invalidate() {
		invalidateAutosaveWrites();
		this.pending = null;
	}
	port() {
		if (this.worker) return this.worker;
		const p = this.createWorker();
		p.onmessage = (event) => this.receive(p, event.data);
		p.onerror = (event) => {
			event.preventDefault?.();
			this.transportFailed(p, "worker-error");
		};
		p.onmessageerror = () => this.transportFailed(p, "message-error");
		this.worker = p;
		return p;
	}
	dispatch(r) {
		if (!this.current(r)) return;
		r = {
			...r,
			time: r.game.state.time
		};
		const start = this.now();
		let expected;
		try {
			expected = readSaveSlots(this.storage);
		} catch {
			this.recordFailure("storage-read", "storage");
			this.fallback(r, this.now() - start);
			return;
		}
		const job = {
			...r,
			id: ++this.nextId,
			expected,
			dispatchCpuMs: 0,
			workerCpuMs: 0,
			phase: "preflight"
		};
		if (this.disabled) {
			if (this.now() < this.retryAfterMonotonicMilliseconds) {
				this.fallback(job, this.now() - start);
				return;
			}
			this.disabled = false;
			this.confirmed = false;
			this.recoveryAttemptsUsed++;
		}
		try {
			const port = this.port();
			this.active = job;
			job.timer = setTimeout(() => this.transportFailed(port, "timeout"), this.options.timeoutMilliseconds ?? AUTOSAVE_RULES.timeoutMilliseconds);
			port.postMessage({
				id: job.id,
				phase: "preflight",
				seed: r.seed,
				time: r.time,
				expected
			});
			job.dispatchCpuMs = this.now() - start;
			if (r.measurement === this.measurement) this.counts.workerJobs++;
		} catch {
			this.recordFailure("dispatch-error", job.phase);
			job.dispatchCpuMs = this.now() - start;
			if (this.active === job) this.clearActive(job);
			this.disable();
			this.fallback(job, job.dispatchCpuMs);
		}
	}
	clearActive(job) {
		if (job.timer !== void 0) clearTimeout(job.timer);
		if (this.active === job) this.active = null;
	}
	disable() {
		this.disabled = true;
		this.worker?.terminate();
		this.worker = null;
		this.workerFailureStreak++;
		const cooldown = this.workerFailureStreak > AUTOSAVE_RULES.fastRecoveryAttempts ? AUTOSAVE_RULES.recoveryLongCooldownMilliseconds : Math.min(AUTOSAVE_RULES.recoveryMaximumCooldownMilliseconds, AUTOSAVE_RULES.recoveryInitialCooldownMilliseconds * AUTOSAVE_RULES.recoveryBackoffMultiplier ** (this.workerFailureStreak - 1));
		this.retryAfterMonotonicMilliseconds = this.now() + cooldown;
	}
	workerSaveSucceeded() {
		this.workerFailureStreak = 0;
		this.recoveryAttemptsUsed = 0;
		this.retryAfterMonotonicMilliseconds = 0;
	}
	transportFailed(port, reason) {
		if (port !== this.worker || this.disposed) return;
		const job = this.active;
		this.recordFailure(reason, job?.phase ?? "preflight");
		this.disable();
		if (job) {
			this.clearActive(job);
			this.fallback(job, job.dispatchCpuMs);
		}
		this.drain();
	}
	record(r, result) {
		if (r.measurement !== this.measurement) return;
		this.work.push(result);
		if (this.work.length > AUTOSAVE_RULES.maximumMeasurements) this.work.shift();
		this.counts[result.outcome]++;
	}
	fallback(r, preparationCpuMs) {
		if (!this.current(r)) {
			this.record(r, {
				mode: "sync",
				outcome: "superseded",
				dispatchCpuMs: preparationCpuMs,
				commitCpuMs: 0,
				mainCpuMs: preparationCpuMs,
				wallLatencyMs: this.now() - r.requestedAt
			});
			return;
		}
		if ("expected" in r) try {
			if (!matchingSaveSlots(r.expected, readSaveSlots(this.storage))) {
				this.record(r, {
					mode: "sync",
					outcome: "superseded",
					dispatchCpuMs: preparationCpuMs,
					commitCpuMs: 0,
					mainCpuMs: preparationCpuMs,
					wallLatencyMs: this.now() - r.requestedAt
				});
				return;
			}
		} catch {}
		if (r.measurement === this.measurement) this.counts.fallbacks++;
		const start = this.now();
		let ok = false, unchanged = false;
		let before;
		try {
			before = this.storage.getItem(SAVE_KEY);
		} catch {}
		try {
			ok = this.measureMainThread(r, "sync-fallback", () => this.synchronous(r.game));
		} catch {}
		if (ok && before !== void 0) try {
			unchanged = this.storage.getItem(SAVE_KEY) === before;
		} catch {}
		const commitCpuMs = this.now() - start;
		this.record(r, {
			mode: "sync",
			outcome: ok ? unchanged ? "superseded" : "committed" : "failed",
			dispatchCpuMs: preparationCpuMs,
			commitCpuMs,
			mainCpuMs: preparationCpuMs + commitCpuMs,
			wallLatencyMs: this.now() - r.requestedAt
		});
	}
	receive(port, value) {
		if (port !== this.worker || this.disposed || !this.active) return;
		const result = value, job = this.active;
		if (result?.id !== job.id) return;
		if (![
			"preflight",
			"ready",
			"stale",
			"invalid"
		].includes(result.status ?? "") || typeof result.workerCpuMs !== "number" || !Number.isFinite(result.workerCpuMs) || result.workerCpuMs < 0 || typeof result.previousPrimaryValid !== "boolean" || result.status === "ready" && typeof result.serialized !== "string") {
			this.transportFailed(port, "malformed-response");
			return;
		}
		if (result.status === "preflight" && job.phase !== "preflight") return;
		this.confirmed = true;
		job.workerCpuMs += result.workerCpuMs;
		if (result.status === "preflight") {
			if (job.phase !== "preflight") {
				this.transportFailed(port, "malformed-response");
				return;
			}
			const start = this.now();
			try {
				if (this.current(job) && matchingSaveSlots(job.expected, readSaveSlots(this.storage))) {
					const snapshot = this.measureMainThread(job, "snapshot", () => ({
						...this.encode(job.game),
						savedAt: (this.options.wallNow ?? Date.now)()
					}));
					job.time = job.game.state.time;
					job.phase = "serialize";
					this.measureMainThread(job, "clone", () => port.postMessage({
						id: job.id,
						phase: "serialize",
						snapshot
					}));
					job.dispatchCpuMs += this.now() - start;
					return;
				}
			} catch {
				this.recordFailure("snapshot-error", "serialize");
				job.dispatchCpuMs += this.now() - start;
				this.clearActive(job);
				this.disable();
				this.fallback(job, job.dispatchCpuMs);
				this.drain();
				return;
			}
			job.dispatchCpuMs += this.now() - start;
			this.clearActive(job);
			this.record(job, {
				mode: "worker",
				outcome: "superseded",
				dispatchCpuMs: job.dispatchCpuMs,
				commitCpuMs: 0,
				workerCpuMs: job.workerCpuMs,
				mainCpuMs: job.dispatchCpuMs,
				wallLatencyMs: this.now() - job.requestedAt
			});
			this.drain();
			return;
		}
		if (result.status === "ready" && job.phase !== "serialize") {
			this.transportFailed(port, "malformed-response");
			return;
		}
		this.clearActive(job);
		const start = this.now();
		let outcome = "superseded";
		if (this.current(job)) {
			if (result.status === "ready") outcome = this.measureMainThread(job, "commit", () => commitPreparedAutosave(job.expected, job.generation, result.serialized, result.previousPrimaryValid, this.storage));
			else if (result.status === "invalid") outcome = "failed";
		}
		if (result.status === "ready" && outcome === "committed") this.workerSaveSucceeded();
		const commitCpuMs = this.now() - start;
		this.record(job, {
			mode: "worker",
			outcome,
			dispatchCpuMs: job.dispatchCpuMs,
			commitCpuMs,
			workerCpuMs: job.workerCpuMs,
			mainCpuMs: job.dispatchCpuMs + commitCpuMs,
			wallLatencyMs: this.now() - job.requestedAt
		});
		this.drain();
	}
	drain() {
		const pending = this.pending;
		this.pending = null;
		if (pending && this.current(pending)) this.dispatch(pending);
	}
	resetMeasurements() {
		this.measurement++;
		this.work = [];
		this.failureCounts = {};
		this.counts = {
			requests: 0,
			workerJobs: 0,
			committed: 0,
			superseded: 0,
			failed: 0,
			fallbacks: 0,
			coalesced: 0
		};
	}
	report() {
		const summary = (key) => {
			const values = this.work.map((w) => w[key]).filter((n) => n !== void 0), sorted = [...values].sort((a, b) => a - b);
			return {
				samples: values.length,
				meanMs: values.reduce((a, b) => a + b, 0) / Math.max(1, values.length),
				p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] ?? 0,
				maxMs: sorted.at(-1) ?? 0
			};
		};
		return {
			recovery: {
				failureStreak: this.workerFailureStreak,
				attemptsUsed: this.recoveryAttemptsUsed,
				fastAttemptsRemaining: Math.max(0, AUTOSAVE_RULES.fastRecoveryAttempts - this.recoveryAttemptsUsed),
				slowProbe: this.disabled && this.workerFailureStreak > AUTOSAVE_RULES.fastRecoveryAttempts,
				nextAttemptInMilliseconds: this.disabled ? Math.max(0, this.retryAfterMonotonicMilliseconds - this.now()) : null
			},
			lastFailure: this.lastFailure ? { ...this.lastFailure } : null,
			failureCounts: { ...this.failureCounts },
			mode: this.disabled ? "synchronous fallback" : this.confirmed ? "worker confirmed" : this.worker ? "worker pending" : "not started",
			active: !!this.active,
			pending: !!this.pending,
			counts: { ...this.counts },
			last: this.work.at(-1) ? { ...this.work.at(-1) } : null,
			dispatchCpu: summary("dispatchCpuMs"),
			commitCpu: summary("commitCpuMs"),
			workerCpu: summary("workerCpuMs"),
			mainCpu: summary("mainCpuMs"),
			wallLatency: summary("wallLatencyMs")
		};
	}
	dispose() {
		if (this.disposed) return;
		this.invalidate();
		this.disposed = true;
		if (this.active) this.clearActive(this.active);
		this.worker?.terminate();
		this.worker = null;
		if (this.options.listenToStorage !== false && typeof window !== "undefined") window.removeEventListener("storage", this.storageChanged);
	}
};
var FIBRE_WORKSHOP_ART = {
	widthMetres: 4,
	depthMetres: 4,
	heightMetres: 2.45,
	frameWidthMetres: 1.65,
	benchHeightMetres: .78
};
function beam$4(a, b, width = .11, depth = width) {
	const d = b.clone().sub(a), g = new BoxGeometry(width, d.length(), depth);
	g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()));
	g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
	return g;
}
function box$8(w, h, d, x, y, z) {
	return new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}
function merge$7(parts) {
	const plain = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	});
	const out = mergeGeometries(plain);
	plain.forEach((g) => g.dispose());
	out.computeBoundingBox();
	out.computeBoundingSphere();
	return out;
}
/** Permanent paid timber frame/bench/pegs and stone weights. Empty shelves and
* frames deliberately contain no free fibre, cordage or finished baskets. */
function fibreWorkshopGeo() {
	const v = (x, y, z) => new Vector3(x, y, z), timber = [];
	for (const x of [-1.5, .15]) timber.push(beam$4(v(x, 0, .9), v(x, 2.1, .38), .14), beam$4(v(x, 0, -.5), v(x, 1.65, .48), .11));
	timber.push(beam$4(v(-1.57, 1.95, .44), v(.23, 1.95, .44), .16), beam$4(v(-1.57, .45, .8), v(.23, .45, .8), .12));
	for (let i = 0; i < 8; i++) timber.push(box$8(.055, .13, .055, -1.4 + i * .2, 1.98, .44));
	for (const x of [.55, 1.45]) for (const z of [-.65, .5]) timber.push(beam$4(v(x, 0, z), v(x, FIBRE_WORKSHOP_ART.benchHeightMetres, z), .12));
	timber.push(box$8(1.1, .12, 1.45, 1, .78, -.05), box$8(.085, .25, .085, .72, .9, -.42), box$8(.085, .25, .085, 1.25, .9, .35), box$8(2.8, .1, .35, 0, .28, -1.28));
	for (const x of [-1.65, 1.65]) timber.push(beam$4(v(x, 0, -1.48), v(x, 2.35, -1.48), .13));
	timber.push(beam$4(v(-1.72, 2.26, -1.48), v(1.72, 2.26, -1.48), .13));
	const shade = [];
	for (let i = 0; i < 9; i++) {
		const x = -1.6 + i * .4;
		shade.push(beam$4(v(x, 2.4, -1.65), v(x, 2.12, -.7), .16, .065));
	}
	const stones = [new IcosahedronGeometry(.19, 0).scale(1, .6, .8).translate(-.95, .12, .85), new IcosahedronGeometry(.17, 0).scale(1, .65, .85).translate(-.5, .11, .85)];
	return {
		timber: merge$7(timber),
		roof: merge$7(shade),
		extra: merge$7(stones),
		extraMat: "stone"
	};
}
/** Placement is a read-only footprint survey; the preview and finished station
* use the exact same foundation calculation without flattening any terrain. */
function fibreWorkshopPlacementLevel(g, x, z, team = 0) {
	return foundationProfile(g, {
		type: "fibreWorkshop",
		x,
		z,
		w: FIBRE_WORKSHOP_ART.widthMetres,
		d: FIBRE_WORKSHOP_ART.depthMetres,
		team
	}).level;
}
var GRAPHICS_RULES = {
	defaultQuality: "med",
	defaultRenderStyle: "current",
	defaultShadows: false,
	defaultUnitRings: true,
	profiles: {
		low: {
			maximumPixels: 8e5,
			pixelRatio: 1,
			groundCover: false,
			bloom: false
		},
		med: {
			maximumPixels: 21e5,
			pixelRatio: 1.25,
			groundCover: true,
			bloom: true
		},
		high: {
			maximumPixels: 32e5,
			pixelRatio: 1.5,
			groundCover: true,
			bloom: true
		}
	}
};
var GRAPHICS_PREFERENCE_KEY = "hearthwild:graphics-quality";
function loadGraphicsQuality() {
	try {
		const q = localStorage.getItem(GRAPHICS_PREFERENCE_KEY);
		return q === "low" || q === "med" || q === "high" ? q : GRAPHICS_RULES.defaultQuality;
	} catch {
		return GRAPHICS_RULES.defaultQuality;
	}
}
function rememberGraphicsQuality(q) {
	try {
		localStorage.setItem(GRAPHICS_PREFERENCE_KEY, q);
	} catch {}
}
function graphicsPixelRatio(quality, width, height, deviceRatio = 1) {
	const profile = GRAPHICS_RULES.profiles[quality];
	const area = Math.max(1, width) * Math.max(1, height);
	return Math.min(Math.max(.1, deviceRatio), profile.pixelRatio, Math.sqrt(profile.maximumPixels / area));
}
/** UI focus and world commands share one keyboard, never the same keystroke. */
var KeyboardCommands = class {
	mode = false;
	help = false;
	ledger = false;
	groups = /* @__PURE__ */ new Map();
	cursorId = -1;
	engine;
	constructor(engine) {
		this.engine = engine;
	}
	center() {
		const e = this.engine;
		e.pointer.x = e.canvas.clientWidth / 2;
		e.pointer.y = e.canvas.clientHeight / 2;
	}
	key(event) {
		const e = this.engine, g = e.game, code = event.code;
		if (code === "Escape") {
			this.help = false;
			this.ledger = false;
			if (e.isWorkerSession) e.cancelPresentationInteraction();
			else {
				g.state.placing = null;
				g.state.pendingAge = false;
				e.moveMode = false;
				e.loggingMode = false;
				g.clearSelect();
			}
			e.canvas.focus();
			e.pushHud();
			return;
		}
		const target = event.target;
		const typing = target?.closest("input,textarea,select,[contenteditable=true],dialog[open],[role=dialog]");
		const ui = target?.closest("button,a,summary");
		const camera = [
			"KeyW",
			"KeyA",
			"KeyS",
			"KeyD",
			"KeyQ",
			"KeyE",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"PageUp",
			"PageDown"
		].includes(code);
		if (typing || code === "Tab" || event.metaKey) {
			e.keys.clear();
			return;
		}
		if (ui && !camera && !(g.state.placing && ["BracketLeft", "BracketRight"].includes(code))) return;
		if (ui && camera) {
			event.preventDefault();
			e.canvas.focus();
		}
		if (!g.started) return;
		if (g.awaitingStart) {
			if (code === "Enter" && !event.repeat) {
				event.preventDefault();
				e.enterIsland();
			}
			return;
		}
		if (g.state.placing && [
			"farm",
			"warehouse",
			"pen"
		].includes(g.state.placing) && ["BracketLeft", "BracketRight"].includes(code)) {
			event.preventDefault();
			e.resizePlot(code === "BracketRight" ? 1 : -1, event.shiftKey);
			return;
		}
		const n = /^Digit[1-9]$/.test(code) ? Number(code.slice(-1)) : 0;
		if (event.ctrlKey || event.altKey) {
			if (n && !event.repeat) {
				event.preventDefault();
				if (event.ctrlKey) {
					this.groups.set(n, g.selectedUnits().map((u) => u.id));
					if (e.isWorkerSession) e.presentationNotice(`Group ${n} saved`, 2);
					else g.banner(`Group ${n} saved`, 2);
				} else {
					const ids = this.groups.get(n) || [];
					if (e.isWorkerSession) {
						const selectedUnitIds = g.state.units.filter((u) => u.team === 0 && u.hp > 0 && ids.includes(u.id)).map((u) => u.id);
						e.setWorkerSelection({ selectedUnitIds });
						e.presentationNotice(`Group ${n}: ${selectedUnitIds.length} people`, 2);
					} else {
						g.clearSelect();
						for (const u of g.state.units) u.selected = u.team === 0 && u.hp > 0 && ids.includes(u.id);
						g.banner(`Group ${n}: ${g.selectedUnits().length} people`, 2);
					}
				}
				e.pushHud();
			}
			return;
		}
		e.keys.add(code);
		if ([
			"Space",
			"Enter",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"PageUp",
			"PageDown"
		].includes(code)) event.preventDefault();
		if (event.repeat) return;
		if (code === "KeyN") e.toggleLogging();
		if (code === "KeyK") this.mode = !this.mode;
		if (code === "KeyH") {
			event.preventDefault();
			this.help = !this.help;
		}
		if (code === "KeyL") this.ledger = !this.ledger;
		if (code === "KeyC" || code === "KeyB") {
			const entities = (code === "KeyB" ? g.state.buildings : g.state.units).filter((x) => x.team === 0 && x.hp > 0);
			if (entities.length) {
				const next = entities[(entities.findIndex((x) => x.id === this.cursorId) + (event.shiftKey ? -1 : 1) + entities.length) % entities.length];
				this.cursorId = next.id;
				if (e.isWorkerSession) e.setWorkerSelection(next.kind === "building" ? {
					selectedUnitIds: [],
					selectedBuildingId: next.id
				} : { selectedUnitIds: [next.id] });
				else {
					g.clearSelect();
					next.selected = true;
					if (next.kind === "building") g.state.selBld = next;
				}
				e.view.look.set(next.x, next.y - 1.2, next.z);
				this.mode = true;
			}
		}
		if (code === "KeyJ" || code === "KeyV") {
			if (e.isWorkerSession) e.setWorkerSelection({ selectedUnitIds: g.state.units.filter((u) => u.hp > 0 && u.team === 0 && (code === "KeyJ" ? u.type === "worker" : u.type !== "worker")).map((u) => u.id) });
			else {
				g.clearSelect();
				for (const u of g.state.units) u.selected = u.hp > 0 && u.team === 0 && (code === "KeyJ" ? u.type === "worker" : u.type !== "worker");
			}
		}
		if (code === "BracketLeft" || code === "BracketRight") {
			const s = g.state;
			const nodes = [
				...s.forage,
				...s.trees,
				...s.stones,
				...s.copper,
				...s.iron,
				...s.fish
			].filter((x) => x.amount > 0 && (!e.loggingMode || x.kind === "tree") && g.exploredAt(x.x, x.z)).sort((a, b) => a.id - b.id);
			if (nodes.length) {
				const next = nodes[(nodes.findIndex((x) => x.id === this.cursorId) + (code === "BracketLeft" ? -1 : 1) + nodes.length) % nodes.length];
				this.cursorId = next.id;
				e.view.look.set(next.x, next.y - 1.2, next.z);
				this.mode = true;
				const message = e.loggingMode ? "Tree · Enter to mark or unmark" : `${next.kind} · R to gather`;
				if (e.isWorkerSession) e.presentationNotice(message, 2);
				else g.banner(message, 2);
			}
		}
		if ([
			"Enter",
			"KeyR",
			"KeyZ"
		].includes(code)) {
			this.mode = true;
			this.center();
			e.view.updateCamera(0);
			const point = e.view.groundAt(e.pointer.x, e.pointer.y);
			if (code === "Enter") {
				if (g.state.placing) e.leftClick(e.pointer.x, e.pointer.y, event.shiftKey);
				else if (point) e.leftClick(e.pointer.x, e.pointer.y, event.shiftKey);
			} else if (code === "KeyZ" && point) {
				if (e.isWorkerSession) e.dispatch({
					kind: "move",
					unitIds: g.selectedUnits().map((u) => u.id),
					x: point.x,
					z: point.z,
					attackMove: true
				}).catch((error) => e.presentationNotice(error instanceof Error ? error.message : String(error), 4));
				else g.issueMove(point.x, point.z, true);
			} else e.rightClick(e.pointer.x, e.pointer.y);
		}
		if (code === "Period") e.halt();
		if (code === "Semicolon") for (const u of g.selectedUnits()) {
			u.order = "hold";
			u.pillage = -1;
			u.target = null;
			u.attackDestination = null;
		}
		if (code === "Comma") e.cycleVillager(event.shiftKey ? -1 : 1);
		if (code === "KeyI") e.focusIdle();
		if (code === "KeyG") e.trainPeople();
		if (code === "KeyT") e.cycleTrade();
		if (code === "KeyX") e.explore();
		if (code === "KeyP" || code === "Space") e.setPaused(!g.state.paused);
		if (code === "Equal" || code === "NumpadAdd") e.setSpeed(g.state.speed >= 2 ? 4 : 2);
		if (code === "Minus" || code === "NumpadSubtract") e.setSpeed(g.state.speed >= 4 ? 2 : 1);
		if (code === "KeyF") e.focusHome();
		if (code === "KeyV") {
			if (e.isWorkerSession) e.dispatch({ kind: "recall" }).catch((error) => e.presentationNotice(error instanceof Error ? error.message : String(error), 4));
			else g.soundRecall();
		}
		if (code === "KeyM") e.toggleMute();
		if (n >= 1 && n <= 8) {
			const open = BUILD_ORDER.filter((t) => BUILDINGS[t].age <= g.tribe(0).age);
			if (n <= open.length) {
				this.mode = true;
				this.center();
				e.setPlacing(open[n - 1]);
			}
		}
		e.pushHud();
	}
};
var GameAudio = class {
	ctx = null;
	master = null;
	sfx = null;
	music = null;
	muted = false;
	unlocked = false;
	score = new AcousticScore();
	noise = null;
	unlock() {
		if (this.unlocked) {
			if (this.ctx?.state === "suspended") this.ctx.resume();
			this.score.unlock();
			return;
		}
		const AC = window.AudioContext || window.webkitAudioContext;
		this.ctx = new AC({ latencyHint: "interactive" });
		this.master = this.ctx.createGain();
		this.sfx = this.ctx.createGain();
		this.music = this.ctx.createGain();
		this.sfx.gain.value = .45;
		this.music.gain.value = .2;
		this.master.gain.value = .5;
		this.sfx.connect(this.master);
		this.music.connect(this.master);
		this.master.connect(this.ctx.destination);
		this.noise = this.makeNoise(this.ctx);
		this.ctx.resume();
		this.unlocked = true;
		this.score.unlock();
	}
	setMuted(m) {
		this.muted = m;
		this.score.setMuted(m);
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : .58, this.ctx.currentTime, .04);
	}
	makeNoise(ctx) {
		const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
		const d = n.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		return n;
	}
	lastSfx = {};
	voices = 0;
	tone(freq, dur, type = "triangle", vol = .08, detune = 0) {
		if (!this.ctx || !this.sfx || this.muted) return;
		if (this.voices > 10) return;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		const f = this.ctx.createBiquadFilter();
		o.type = type === "sawtooth" || type === "square" ? "triangle" : type;
		o.frequency.value = freq;
		o.detune.value = detune;
		f.type = "lowpass";
		f.frequency.value = 1400;
		const now = this.ctx.currentTime;
		const v = Math.max(8e-4, vol);
		g.gain.setValueAtTime(0, now);
		g.gain.linearRampToValueAtTime(v, now + Math.min(.012, dur * .2));
		g.gain.exponentialRampToValueAtTime(8e-4, now + dur);
		o.connect(f);
		f.connect(g);
		g.connect(this.sfx);
		this.voices++;
		o.onended = () => {
			this.voices = Math.max(0, this.voices - 1);
			o.disconnect();
			g.disconnect();
			f.disconnect();
		};
		o.start(now);
		o.stop(now + dur + .02);
	}
	play(name) {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		const gap = name === "fish" || name === "rustle" ? 2.5 : name === "chop" || name === "hammer" ? .6 : name === "drop" ? .8 : name === "hit" ? .18 : .04;
		if (this.lastSfx[name] !== void 0 && this.lastSfx[name] + gap > now) return;
		this.lastSfx[name] = now;
		const r = .94 + Math.random() * .12;
		switch (name) {
			case "click":
				this.tone(480 * r, .05, "sine", .02);
				break;
			case "place":
				this.tone(210, .12, "sine", .035);
				break;
			case "move":
				this.tone(180 * r, .04, "sine", .012);
				break;
			case "chop":
				this.tone(140 * r, .06, "triangle", .03);
				this.noiseBurst(.04, .035, 900);
				break;
			case "hit":
				this.tone(96 * r, .07, "triangle", .035);
				this.noiseBurst(.05, .04, 700);
				break;
			case "death":
				this.tone(82, .22, "sine", .04);
				this.tone(62, .3, "sine", .025);
				break;
			case "train":
				this.tone(392, .12, "sine", .03);
				this.tone(523, .16, "sine", .018);
				break;
			case "age":
				this.tone(196, .4, "sine", .04);
				this.tone(294, .5, "sine", .03);
				break;
			case "win":
				this.tone(262, .4, "sine", .045);
				this.tone(330, .55, "sine", .035);
				break;
			case "lose":
				this.tone(165, .5, "sine", .04);
				break;
			case "invalid":
				this.tone(150, .08, "sine", .02);
				break;
			case "horn":
				this.tone(174, .55, "sine", .07);
				this.tone(220, .7, "sine", .045);
				this.tone(130, .8, "sine", .03);
				break;
			case "bow":
				this.tone(620 * r, .05, "sine", .028);
				this.tone(180, .08, "triangle", .02);
				break;
			case "drop":
				this.tone(240 * r, .07, "sine", .022);
				this.noiseBurst(.05, .02, 500);
				break;
			case "rustle":
				this.noiseBurst(.16, .009, 400);
				break;
			case "fish":
				this.noiseBurst(.28, .018, 650);
				break;
			case "splash":
				this.noiseBurst(.12, .045, 1600);
				this.tone(320 * r, .08, "sine", .015);
				break;
			case "hammer":
				this.tone(90 * r, .05, "triangle", .03);
				this.noiseBurst(.04, .03, 800);
				break;
			case "pillage":
				this.tone(110, .18, "triangle", .05);
				this.tone(146, .28, "sine", .035);
				this.noiseBurst(.1, .04, 400);
				break;
			case "fire":
				this.noiseBurst(.28, .05, 1200);
				this.tone(70, .2, "sine", .02);
				break;
			case "birth":
				this.tone(440, .1, "sine", .025);
				this.tone(554, .14, "sine", .018);
				break;
			case "trade":
				this.tone(330, .1, "sine", .03);
				this.tone(392, .16, "sine", .022);
				break;
			case "thunder":
				this.noiseBurst(.45, .08, 280);
				this.tone(48, .5, "sine", .04);
		}
	}
	noiseBurst(dur, vol, cutoff) {
		if (!this.ctx || !this.sfx || !this.noise || this.muted) return;
		if (this.voices > 12) return;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		const f = this.ctx.createBiquadFilter();
		f.type = "lowpass";
		f.frequency.value = cutoff;
		const g = this.ctx.createGain();
		const now = this.ctx.currentTime;
		g.gain.setValueAtTime(0, now);
		g.gain.linearRampToValueAtTime(vol, now + Math.min(.02, dur * .25));
		g.gain.exponentialRampToValueAtTime(8e-4, now + dur);
		src.connect(f);
		f.connect(g);
		g.connect(this.sfx);
		this.voices++;
		src.onended = () => {
			this.voices = Math.max(0, this.voices - 1);
			src.disconnect();
			f.disconnect();
			g.disconnect();
		};
		src.start(now);
		src.stop(now + dur + .02);
	}
	setMood(mood, age = 0, population = 0, dt = 0, paused = false, season = "Spring") {
		const stage = mood !== "peace" ? "battle" : peacefulMusic(age, season, this.score.calm);
		const duck = (season === "Winter" ? .5 : season === "Autumn" ? .62 : .7) * (population > 30 || age > 3 ? .9 : 1);
		this.score.update(stage, dt, paused, duck);
	}
	setMusicVolume(v) {
		this.score.setVolume(v);
	}
	setSfxVolume(v) {
		if (this.sfx && this.ctx) this.sfx.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, .025);
	}
	dispose() {
		this.score.dispose();
		this.unlocked = false;
		this.ctx?.close();
		this.ctx = null;
	}
};
/** Actual paid assets, not invented combat units. One shared low-cost batch. */
var SiegeRamLayer = class {
	mesh;
	scene;
	matrix = new Matrix4();
	position = new Vector3();
	rotation = new Quaternion();
	scale = new Vector3();
	frustum = new Frustum();
	viewProjection = new Matrix4();
	sphere = new Sphere(new Vector3(), 2);
	disposed = false;
	constructor(scene) {
		this.scene = scene;
		const parts = [];
		function add(g, color, x = 0, y = 0, z = 0) {
			g.translate(x, y, z);
			const c = new Color(color), values = new Float32Array(g.attributes.position.count * 3);
			for (let i = 0; i < values.length; i += 3) {
				values[i] = c.r;
				values[i + 1] = c.g;
				values[i + 2] = c.b;
			}
			g.setAttribute("color", new BufferAttribute(values, 3));
			const plain = g.index ? g.toNonIndexed() : g;
			if (plain !== g) g.dispose();
			parts.push(plain);
		}
		const beam = new CylinderGeometry(.19, .23, 3.2, 8);
		beam.rotateX(Math.PI / 2);
		add(beam, "#886642", 0, .8);
		for (const z of [-.95, .95]) {
			add(new BoxGeometry(1.4, .12, .12), "#a58555", 0, .65, z);
			add(new TorusGeometry(.24, .026, 3, 8), "#cfb889", 0, .8, z);
		}
		const geometry = mergeGeometries(parts);
		parts.forEach((g) => g.dispose());
		geometry.computeBoundingSphere();
		this.mesh = new InstancedMesh(geometry, new MeshStandardMaterial({
			vertexColors: true,
			roughness: .95
		}), SIEGE_RAM_RULES.maximumAssets);
		this.mesh.name = "physical-beam-rams";
		this.mesh.count = 0;
		this.mesh.visible = false;
		this.mesh.frustumCulled = false;
		this.mesh.receiveShadow = true;
		scene.add(this.mesh);
	}
	sync(g, camera, quality, shadows = false) {
		if (this.disposed) return;
		camera.updateMatrixWorld();
		this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		this.frustum.setFromProjectionMatrix(this.viewProjection);
		let count = 0;
		for (const a of g.state.siegeRams?.assets || []) {
			if (!a.progress || !g.visibleAt(a.x, a.z) || count >= SIEGE_RAM_RULES.maximumAssets) continue;
			this.position.set(a.x, g.height(a.x, a.z), a.z);
			this.sphere.center.copy(this.position);
			if (!this.frustum.intersectsSphere(this.sphere)) continue;
			const p = a.approach, heading = p ? Math.atan2(p.x - a.x, p.z - a.z) : 0;
			this.rotation.setFromAxisAngle(Object3D.DEFAULT_UP, heading);
			const built = .35 + .65 * Math.min(1, a.progress / SIEGE_RAM_RULES.workSeconds);
			this.scale.set(1, a.hp > 0 ? built : .23, 1);
			this.matrix.compose(this.position, this.rotation, this.scale);
			this.mesh.setMatrixAt(count++, this.matrix);
		}
		this.mesh.count = count;
		this.mesh.visible = count > 0;
		this.mesh.castShadow = shadows && quality !== "low";
		if (count) this.mesh.instanceMatrix.needsUpdate = true;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.scene.remove(this.mesh);
		this.mesh.dispose();
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
};
var SAIL_RIG_ART = {
	maximumHulls: 96,
	width: 2.7,
	height: 3.6,
	sailHeight: 2.2
};
function mastGeometry() {
	const pole = new CylinderGeometry(.08, .11, SAIL_RIG_ART.height, 6).translate(0, SAIL_RIG_ART.height / 2, 0), yard = new BoxGeometry(SAIL_RIG_ART.width + .25, .1, .1).translate(0, 3.05, 0);
	const geometry = mergeGeometries([pole, yard]);
	pole.dispose();
	yard.dispose();
	return geometry;
}
function clothGeometry() {
	const geometry = new PlaneGeometry(SAIL_RIG_ART.width, SAIL_RIG_ART.sailHeight, 4, 2), positions = geometry.getAttribute("position");
	for (let i = 0; i < positions.count; i++) {
		const x = positions.getX(i);
		positions.setZ(i, .12 + .24 * Math.cos(x / SAIL_RIG_ART.width * Math.PI));
	}
	geometry.computeVertexNormals();
	return geometry;
}
/** Two shared bounded draw calls; no per-boat mesh, texture or animation loop. */
var SailRigs = class {
	mast;
	cloth;
	owners = [];
	matrix = new Matrix4();
	pos = new Vector3();
	rotation = new Quaternion();
	euler = new Euler();
	scale = new Vector3();
	color = new Color();
	scene;
	sailMaterial;
	constructor(scene, timber) {
		this.scene = scene;
		this.sailMaterial = new MeshStandardMaterial({
			color: "#eee2bf",
			roughness: 1,
			side: 2
		});
		this.mast = new InstancedMesh(mastGeometry(), timber, SAIL_RIG_ART.maximumHulls);
		this.cloth = new InstancedMesh(clothGeometry(), this.sailMaterial, SAIL_RIG_ART.maximumHulls);
		for (const mesh of [this.mast, this.cloth]) {
			mesh.count = 0;
			mesh.frustumCulled = false;
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			scene.add(mesh);
		}
	}
	sync(g, shadows = false) {
		this.owners = [];
		let count = 0;
		for (const b of g.state.boats || []) {
			if (!b.sailRig || b.hp <= 0 || count >= SAIL_RIG_ART.maximumHulls || b.team !== 0 && !g.exploredAt(b.x, b.z)) continue;
			this.euler.set(0, b.facing, 0);
			this.rotation.setFromEuler(this.euler);
			const size = b.hullClass === "freightPunt" ? 1.12 : 1, y = g.waterAt(b.x, b.z) + .12;
			this.pos.set(b.x, y, b.z);
			this.scale.set(size, size, size);
			this.matrix.compose(this.pos, this.rotation, this.scale);
			this.mast.setMatrixAt(count, this.matrix);
			const raised = b.sailRig.raised && b.sailRig.condition > 0;
			this.pos.y = y + (raised ? 1.85 : 2.9) * size;
			this.scale.set(size, size * (raised ? 1 : .12), size);
			this.matrix.compose(this.pos, this.rotation, this.scale);
			this.cloth.setMatrixAt(count, this.matrix);
			this.color.set("#eee2bf").multiplyScalar(.65 + .35 * b.sailRig.condition);
			this.cloth.setColorAt(count, this.color);
			this.owners.push(b);
			count++;
		}
		for (const mesh of [this.mast, this.cloth]) {
			mesh.count = count;
			mesh.castShadow = shadows;
			mesh.receiveShadow = shadows;
			mesh.instanceMatrix.needsUpdate = true;
		}
		if (this.cloth.instanceColor) this.cloth.instanceColor.needsUpdate = true;
	}
	pickingSources() {
		return /* @__PURE__ */ new Map([[this.mast, this.owners], [this.cloth, this.owners]]);
	}
	dispose() {
		for (const mesh of [this.mast, this.cloth]) {
			this.scene.remove(mesh);
			mesh.geometry.dispose();
			mesh.dispose();
		}
		this.sailMaterial.dispose();
		this.owners = [];
	}
};
/** CPU submission filter for rigid instances. Terrain-displaced geometry and
* off-camera shadow casters must retain their existing rendering paths. */
var InstanceCameraCull = class {
	frustum = new Frustum();
	projection = new Matrix4();
	world = new Matrix4();
	sphere = new Sphere();
	cameraPosition = new Vector3();
	cameraReady = false;
	metrics = {
		tested: 0,
		skipped: 0
	};
	begin(camera) {
		camera.updateWorldMatrix(true, false);
		this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
		this.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
		this.cameraReady = Number.isFinite(this.cameraPosition.x) && Number.isFinite(this.cameraPosition.y) && Number.isFinite(this.cameraPosition.z);
		this.metrics = {
			tested: 0,
			skipped: 0
		};
	}
	prepareSphere(mesh, instance, computeMissing) {
		if (computeMissing && !mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
		const bound = mesh.geometry.boundingSphere;
		if (!bound || !Number.isFinite(bound.radius) || bound.radius < 0) return false;
		mesh.updateWorldMatrix(true, false);
		this.world.multiplyMatrices(mesh.matrixWorld, instance);
		this.sphere.copy(bound).applyMatrix4(this.world);
		const s = this.sphere;
		return Number.isFinite(s.radius) && s.radius >= 0 && Number.isFinite(s.center.x) && Number.isFinite(s.center.y) && Number.isFinite(s.center.z);
	}
	sphereVisible(padding) {
		if (!Number.isFinite(padding)) return true;
		this.sphere.radius += Math.max(0, padding);
		const visible = this.frustum.intersectsSphere(this.sphere);
		if (!visible) this.metrics.skipped++;
		return visible;
	}
	visible(mesh, instance, padding = 8) {
		this.metrics.tested++;
		return this.prepareSphere(mesh, instance, true) ? this.sphereVisible(padding) : true;
	}
	/** Allocation-free rigid-instance query. Prepare geometry.boundingSphere at
	* geometry creation; missing/invalid bounds retain full near detail instead of
	* allocating a bound in this hot path. Caller owns/reuses bands and out.
	* Distances are metres from camera to the transformed bound CENTRE; padding
	* affects main-camera admission only. Thresholds are explicit, independent of
	* quality or camera zoom: [0,near) -> 0, [near,mid) -> 1, [mid,infinity) -> 2.
	* This result does not decide whether an off-camera shadow caster is drawn. */
	query(mesh, instance, bands, out, padding = 8) {
		if (!Number.isFinite(bands.near) || !Number.isFinite(bands.mid) || bands.near < 0 || bands.near >= bands.mid) throw new RangeError("LOD bands require finite 0 <= near < mid distances in metres");
		this.metrics.tested++;
		out.mainCameraVisible = true;
		out.distanceSquared = Infinity;
		out.lodTier = 0;
		if (!this.cameraReady || !this.prepareSphere(mesh, instance, false)) return out;
		const distanceSquared = this.sphere.center.distanceToSquared(this.cameraPosition);
		if (!Number.isFinite(distanceSquared)) return out;
		out.distanceSquared = distanceSquared;
		out.lodTier = distanceSquared < bands.near * bands.near ? 0 : distanceSquared < bands.mid * bands.mid ? 1 : 2;
		out.mainCameraVisible = this.sphereVisible(padding);
		return out;
	}
};
var HOUSING_PACKET_ART = {
	capacityPerKind: 512,
	groundOffset: .22
};
/** Only authoritative finite reserved packets; no free building-stock props. */
var HousingPacketLayer = class {
	meshes;
	matrix = new Matrix4();
	position = new Vector3();
	rotation = new Quaternion();
	scale = new Vector3();
	constructor(scene) {
		this.meshes = {
			wood: new InstancedMesh(new CylinderGeometry(.13, .13, 1, 5).rotateZ(Math.PI / 2), new MeshStandardMaterial({
				color: 8413252,
				roughness: 1
			}), HOUSING_PACKET_ART.capacityPerKind),
			stone: new InstancedMesh(new DodecahedronGeometry(.3, 0), new MeshStandardMaterial({
				color: 9605515,
				roughness: 1
			}), HOUSING_PACKET_ART.capacityPerKind),
			plantFibre: new InstancedMesh(new CylinderGeometry(.19, .13, .72, 7).rotateZ(Math.PI / 2), new MeshStandardMaterial({
				color: 11968875,
				roughness: 1
			}), HOUSING_PACKET_ART.capacityPerKind)
		};
		for (const mesh of Object.values(this.meshes)) {
			mesh.count = 0;
			mesh.name = "actual-housing-packets";
			mesh.raycast = () => {};
			mesh.frustumCulled = false;
			scene.add(mesh);
		}
	}
	sync(g) {
		const counts = {
			wood: 0,
			stone: 0,
			plantFibre: 0
		}, draw = (materials, x, y, z) => {
			let slot = 0;
			for (const k of [
				"wood",
				"stone",
				"plantFibre"
			]) {
				if (materials[k] <= 0 || counts[k] >= HOUSING_PACKET_ART.capacityPerKind) continue;
				this.position.set(x + (slot++ - .5) * .3, y, z);
				this.scale.setScalar(.65 + Math.min(1, materials[k] / 8) * .35);
				this.matrix.compose(this.position, this.rotation, this.scale);
				this.meshes[k].setMatrixAt(counts[k]++, this.matrix);
			}
		};
		for (const u of g.state.units) {
			if (u.hp <= 0 || u.shelterId || !u.housingCargo || u.team !== 0 && !g.visibleAt(u.x, u.z)) continue;
			draw(u.housingCargo.materials, u.x - Math.sin(u.facing) * .45, u.y + 1.1, u.z - Math.cos(u.facing) * .45);
		}
		for (const b of g.state.buildings) {
			const p = b.renovation;
			if (!p || p.parcel.kind !== "ground" || b.team !== 0 && !g.visibleAt(p.parcel.x, p.parcel.z)) continue;
			draw(p.packet, p.parcel.x, g.height(p.parcel.x, p.parcel.z) + HOUSING_PACKET_ART.groundOffset, p.parcel.z);
		}
		for (const mesh of Object.values(this.meshes)) {
			mesh.count = counts[Object.keys(this.meshes).find((k) => this.meshes[k] === mesh)];
			mesh.visible = mesh.count > 0;
			if (mesh.count) mesh.instanceMatrix.needsUpdate = true;
		}
	}
	dispose() {
		for (const mesh of Object.values(this.meshes)) {
			mesh.removeFromParent();
			mesh.geometry.dispose();
			mesh.material.dispose();
		}
	}
};
function box$7(w, h, d, x, y, z) {
	return new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}
function merge$6(parts) {
	const gs = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	}), out = mergeGeometries(gs);
	gs.forEach((g) => g.dispose());
	out.computeBoundingBox();
	out.computeBoundingSphere();
	return out;
}
function column(x, z, h = 2.7, r = .2) {
	return [new CylinderGeometry(r * .85, r, h, 10).translate(x, h / 2, z), box$7(r * 2.9, .12, r * 2.9, x, h, z)];
}
function gable(w, d, eave, rise, x = 0, z = 0) {
	const parts = [], angle = Math.atan2(rise, w / 2);
	for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
		const width = w / 12 * 1.16, g = new BoxGeometry(width / Math.cos(angle), .13, d + .12);
		g.rotateZ(-side * angle);
		g.translate(x + side * (w / 2 - (i + .5) * w / 12), eave + rise * (i + .5) / 6, z);
		parts.push(g);
	}
	parts.push(box$7(.18, .14, d + .2, x, eave + rise, z));
	return merge$6(parts);
}
function market() {
	const timber = [], walls = [], roof = [];
	for (const x of [
		-2.65,
		-.9,
		.9,
		2.65
	]) for (const z of [-1.85, 1.7]) timber.push(...column(x, z, 2.25, .13));
	timber.push(box$7(5.65, .18, .2, 0, 2.25, 1.7), box$7(5.65, .18, .2, 0, 2.25, -1.85));
	walls.push(box$7(5.6, 2.2, .18, 0, 0, -2), ...[
		-2.7,
		-.9,
		.9,
		2.7
	].map((x) => box$7(.15, 2.2, 1.35, x, 0, -1.4)));
	for (const x of [
		-1.8,
		0,
		1.8
	]) timber.push(box$7(1.2, .12, .55, x, .92, -.85));
	roof.push(gable(6.05, 4.4, 2.4, .8));
	return {
		timber: merge$6(timber),
		roof: merge$6(roof),
		extra: merge$6(walls),
		extraMat: "plaster",
		roofMat: "tile"
	};
}
function temple() {
	const stone = [], dark = [];
	stone.push(box$7(.24, 3.05, 3.6, -1.75, 0, -.65), box$7(.24, 3.05, 3.6, 1.75, 0, -.65), box$7(3.7, 3.05, .24, 0, 0, -2.35));
	for (const x of [
		-1.75,
		-.58,
		.58,
		1.75
	]) stone.push(...column(x, 2, 2.8, .18));
	for (const x of [-1.75, 1.75]) stone.push(...column(x, .65, 2.8, .18));
	stone.push(box$7(4.2, .25, .42, 0, 2.92, 2), box$7(.42, .25, 4.65, -1.75, 2.92, -.1), box$7(.42, .25, 4.65, 1.75, 2.92, -.1));
	stone.push(box$7(1.15, 3.05, .22, -1.18, 0, 1.05), box$7(1.15, 3.05, .22, 1.18, 0, 1.05), box$7(1.25, .55, .22, 0, 2.5, 1.05));
	dark.push(box$7(.16, 2.45, .14, -.58, 0, 1.08), box$7(.16, 2.45, .14, .58, 0, 1.08));
	return {
		entry: {
			x: 0,
			z: 1.07,
			width: 1.1
		},
		timber: merge$6(stone),
		roof: gable(4.75, 5.5, 3.2, 1.15, 0, -.05),
		extra: merge$6(dark),
		extraMat: "dark",
		timberMat: "stone",
		roofMat: "tile"
	};
}
function academy() {
	const walls = [], columns = [], roofs = [];
	walls.push(box$7(7.4, 2.65, .2, 0, 0, -2.9), box$7(.2, 2.65, 5.8, -3.7, 0, 0), box$7(.2, 2.65, 5.8, 3.7, 0, 0));
	for (const x of [-2.55, 2.55]) {
		walls.push(box$7(1.9, 2.65, .18, x, 0, 2.8), box$7(1.9, 2.65, .18, x, 0, -.75));
		roofs.push(gable(2.65, 6.2, 2.75, .7, x, 0));
	}
	roofs.push(gable(7.7, 2.25, 2.75, .75, 0, -2.3));
	for (const x of [-1.3, 1.3]) for (const z of [
		-1.4,
		.3,
		2
	]) columns.push(...column(x, z, 2.55, .13));
	for (const x of [-2.7, 2.7]) columns.push(box$7(1.35, .22, .42, x, .5, -2.5), box$7(.18, .5, .35, x - .48, 0, -2.5), box$7(.18, .5, .35, x + .48, 0, -2.5));
	return {
		timber: merge$6(walls),
		roof: merge$6(roofs),
		extra: merge$6(columns),
		extraMat: "stone",
		timberMat: "plaster",
		roofMat: "tile"
	};
}
function fit(type, k) {
	let scale = 1;
	const spec = BUILDINGS[type];
	for (const st of TEAM_STYLE) for (const g of [
		k.timber,
		k.roof,
		k.extra
	]) if (g) {
		const p = g.getAttribute("position"), c = Math.cos(st.yaw), s = Math.sin(st.yaw);
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i) * st.sx, z = p.getZ(i) * st.sz;
			scale = Math.min(scale, (spec.w / 2 - .2) / (Math.abs(x * c + z * s) || 1e-9), (spec.d / 2 - .2) / (Math.abs(z * c - x * s) || 1e-9));
		}
	}
	for (const g of [
		k.timber,
		k.roof,
		k.extra
	]) if (g) {
		g.scale(scale, 1, scale);
		g.computeBoundingBox();
		g.computeBoundingSphere();
	}
	if (k.entry) k.entry = {
		x: k.entry.x * scale,
		z: k.entry.z * scale,
		width: k.entry.width * scale
	};
	return k;
}
function classicalBuildingGeos() {
	return {
		market: fit("market", market()),
		temple: fit("temple", temple()),
		university: fit("university", academy())
	};
}
var CIVIC_PALETTES = {
	market: {
		timber: ["#9b7048", .35],
		roof: ["#b76445", .18],
		extra: ["#d3bc8d", .15]
	},
	temple: {
		timber: ["#d5cab4", .12],
		roof: ["#a85238", .16],
		extra: ["#5b4030", .2]
	},
	university: {
		timber: ["#dcd0ae", .15],
		roof: ["#a75a3e", .18],
		extra: ["#bdb5a4", .12]
	}
};
var villageTint = new Color();
/** Material colors retain local village accents without turning stone columns into roof-colored timber. */
function civicPartColor(type, part, village, out) {
	if (type === "house") {
		out.set(part === "timber" ? "#d8c3a3" : part === "roof" ? "#c3a26c" : "#785236").lerp(villageTint.set(village), .18);
		return true;
	}
	if (!(type in CIVIC_PALETTES)) return false;
	const [color, mix] = CIVIC_PALETTES[type][part];
	out.set(color).lerp(villageTint.set(village), mix);
	return true;
}
var excluded = /* @__PURE__ */ new Set([
	"farm",
	"pen",
	"dock",
	"bridge",
	"grove",
	"cairn",
	"cornerstone",
	"palisade",
	"gate",
	"stonewall",
	"trench",
	"moat"
]);
var cache$1 = /* @__PURE__ */ new WeakMap();
/** Only actual wall/column/leg bearing lines receive supports. No filled plot. */
function buildingGroundSupports(g, b) {
	if (terrainLaidWorkplace(b.type) || excluded.has(b.type) || b.type === "watchtower" && b.towerPlatform) return [];
	const contacts = buildingGroundContacts(b);
	if (!contacts?.length) return [];
	const revision = g.terrainRevision(), old = cache$1.get(b);
	if (old && old.world === g.world && old.state === g.state && old.height === g.height && old.heights === g.world.heights && old.revision === revision && old.team === b.team && old.x === b.x && old.y === b.y && old.z === b.z && old.w === b.w && old.d === b.d && old.contacts === contacts) return old.supports;
	const f = foundationProfile(g, b), st = TEAM_STYLE[b.team] || TEAM_STYLE[0], axisAligned = b.type === "warehouse" || expandedGrainWorkplace(b), yaw = axisAligned ? 0 : st.yaw, c = Math.cos(yaw), s = Math.sin(yaw), supports = [], sx = axisAligned ? 1 : st.sx, sz = axisAligned ? 1 : st.sz;
	const world = (x, z) => ({
		x: b.x + c * x * sx + s * z * sz,
		z: b.z - s * x * sx + c * z * sz
	});
	for (const line of contacts) {
		const a = world(line.ax, line.az), v = world(line.bx, line.bz), dx = v.x - a.x, dz = v.z - a.z, len = Math.hypot(dx, dz);
		if (len < .01) continue;
		const n = Math.ceil(len / GROUNDING_RULES.maximumStripLengthMetres), nx = -dz / len, nz = dx / len;
		for (let i = 0; i < n; i++) {
			const ax = a.x + dx * i / n, az = a.z + dz * i / n, bx = a.x + dx * (i + 1) / n, bz = a.z + dz * (i + 1) / n, x = (ax + bx) / 2, z = (az + bz) / 2;
			let bottom = Infinity;
			for (const t of [
				0,
				.25,
				.5,
				.75,
				1
			]) for (const side of [
				-.5,
				0,
				.5
			]) bottom = Math.min(bottom, g.height(ax + (bx - ax) * t + nx * GROUNDING_RULES.stripWidthMetres * side, az + (bz - az) * t + nz * GROUNDING_RULES.stripWidthMetres * side));
			if (f.level - bottom < GROUNDING_RULES.minimumVisibleGapMetres) continue;
			bottom -= GROUNDING_RULES.burialMetres;
			const top = f.level + .025;
			supports.push(Object.freeze({
				x,
				z,
				y: (top + bottom) / 2,
				length: len / n + .012,
				width: GROUNDING_RULES.stripWidthMetres,
				height: top - bottom,
				yaw: Math.atan2(-dz, dx)
			}));
		}
	}
	const entry = groundEntryFor(b.type);
	if (entry) {
		const e = world(entry.x, entry.z), direction = {
			x: s,
			z: c
		}, width = entry.width * sx, margin = Math.max(.18, width / 2), bounds = [Math.abs(direction.x) > 1e-5 ? (b.w / 2 - margin - Math.sign(direction.x) * (e.x - b.x)) / Math.abs(direction.x) : Infinity, Math.abs(direction.z) > 1e-5 ? (b.d / 2 - margin - Math.sign(direction.z) * (e.z - b.z)) / Math.abs(direction.z) : Infinity], length = Math.min(1.25, ...bounds);
		if (length > .25) {
			const end = {
				x: e.x + direction.x * length,
				z: e.z + direction.z * length
			}, gap = f.level - g.height(end.x, end.z);
			if (gap > .24) {
				const n = Math.min(8, Math.ceil(gap / .2)), tread = length / n;
				for (let i = 0; i < n; i++) {
					const x = e.x + direction.x * (i + .5) * tread, z = e.z + direction.z * (i + .5) * tread, top = f.level - gap * i / n;
					let bottom = Infinity;
					for (const a of [
						-.5,
						0,
						.5
					]) for (const b of [-.5, .5]) bottom = Math.min(bottom, g.height(x + c * width * a + direction.x * tread * b, z - s * width * a + direction.z * tread * b));
					if (top - bottom > .06) {
						bottom -= GROUNDING_RULES.burialMetres;
						supports.push(Object.freeze({
							x,
							z,
							y: (top + bottom) / 2,
							length: width,
							width: tread + .012,
							height: top - bottom,
							yaw,
							kind: "step"
						}));
					}
				}
			}
		}
	}
	const frozen = Object.freeze(supports);
	cache$1.set(b, {
		world: g.world,
		state: g.state,
		height: g.height,
		heights: g.world.heights,
		revision,
		team: b.team,
		x: b.x,
		y: b.y,
		z: b.z,
		w: b.w,
		d: b.d,
		contacts,
		supports: frozen
	});
	return frozen;
}
/** One shared draw, geometries/materials reused; no sampling work on stable sites. */
var BuildingGroundingLayer = class {
	mesh;
	metrics = {
		instances: 0,
		overflow: 0
	};
	material;
	scene;
	geometry = new BoxGeometry(1, 1, 1);
	matrix = new Matrix4();
	position = new Vector3();
	scale = new Vector3();
	rotation = new Quaternion();
	up = new Vector3(0, 1, 0);
	lastWorld = null;
	lastState = null;
	lastHeight = null;
	lastHeights = null;
	lastRevision = -1;
	lastContacts = -1;
	lastSignature = "";
	constructor(scene, material) {
		this.scene = scene;
		this.material = material;
		this.mesh = this.make(4096);
	}
	make(capacity) {
		const mesh = new InstancedMesh(this.geometry, this.material, capacity);
		mesh.name = "structure-wall-and-post-footings";
		mesh.instanceMatrix.setUsage(DynamicDrawUsage);
		mesh.count = 0;
		mesh.frustumCulled = false;
		mesh.receiveShadow = true;
		this.scene.add(mesh);
		return mesh;
	}
	sync(g) {
		const visible = g.state.buildings.filter((b) => b.hp > 0 && b.build >= .2 && (b.team === 0 || g.exploredAt(b.x, b.z))), signature = visible.map((b) => [
			b.id,
			b.type,
			b.team,
			b.x,
			b.z,
			b.w,
			b.d,
			b.y
		].join("/")).join(";"), revision = g.terrainRevision(), contacts = groundContactVersion();
		if (this.lastWorld === g.world && this.lastState === g.state && this.lastHeight === g.height && this.lastHeights === g.world.heights && this.lastRevision === revision && this.lastContacts === contacts && this.lastSignature === signature) return;
		this.lastWorld = g.world;
		this.lastState = g.state;
		this.lastHeight = g.height;
		this.lastHeights = g.world.heights;
		this.lastRevision = revision;
		this.lastContacts = contacts;
		this.lastSignature = signature;
		const rows = [];
		for (const b of visible) rows.push(...buildingGroundSupports(g, b));
		const needed = Math.min(rows.length, GROUNDING_RULES.maximumInstances);
		if (needed > this.mesh.instanceMatrix.count) {
			this.scene.remove(this.mesh);
			this.mesh.dispose();
			this.mesh = this.make(Math.min(GROUNDING_RULES.maximumInstances, 2 ** Math.ceil(Math.log2(needed))));
		}
		for (let i = 0; i < needed; i++) {
			const p = rows[i];
			this.position.set(p.x, p.y, p.z);
			this.rotation.setFromAxisAngle(this.up, p.yaw);
			this.scale.set(p.length, p.height, p.width);
			this.matrix.compose(this.position, this.rotation, this.scale);
			this.mesh.setMatrixAt(i, this.matrix);
		}
		this.mesh.count = needed;
		this.mesh.instanceMatrix.needsUpdate = true;
		this.metrics.instances = needed;
		this.metrics.overflow = rows.length - needed;
	}
	dispose() {
		this.scene.remove(this.mesh);
		this.mesh.dispose();
		this.geometry.dispose();
	}
};
/** On-demand rendered body/model bounds, not occlusion or pixel visibility.
* Sources must be the renderer's actual instance-to-owner mapping. */
function countEntityFrustum(camera, sources, totals) {
	const total = new Set(totals.filter((o) => o.team === 0 && o.hp > 0).map((o) => o.id));
	const represented = /* @__PURE__ */ new Set(), inside = /* @__PURE__ */ new Set();
	camera.updateWorldMatrix(true, false);
	const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
	const instance = new Matrix4(), world = new Matrix4(), box = new Box3(), scale = new Vector3();
	for (const { mesh, owners, admitted } of sources) {
		let visible = true;
		for (let p = mesh; p; p = p.parent) if (!p.visible) {
			visible = false;
			break;
		}
		const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		if (!visible || !camera.layers.test(mesh.layers) || !materials.some((m) => m.visible && (!m.transparent || m.opacity > 0)) || mesh.geometry.drawRange.count === 0 || !mesh.geometry.getAttribute("position")?.count) continue;
		mesh.updateWorldMatrix(true, false);
		if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
		if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) continue;
		const art = mesh.geometry.getAttribute("buildingArt");
		for (let i = 0; i < Math.min(mesh.count, owners.length, mesh.instanceMatrix.count); i++) {
			const owner = owners[i];
			if (!total.has(owner.id) || admitted && !admitted(owner)) continue;
			mesh.getMatrixAt(i, instance);
			scale.setFromMatrixScale(instance);
			if (Math.max(scale.x, scale.y, scale.z) <= .0011) continue;
			box.copy(mesh.geometry.boundingBox);
			if (art && i < art.count) {
				const dx = Math.abs(art.getX(i)) + Math.abs(art.getZ(i)), dy = Math.abs(art.getW(i)), dz = Math.abs(art.getY(i));
				box.min.add(new Vector3(-dx, -dy, -dz));
				box.max.add(new Vector3(dx, dy, dz));
			}
			world.multiplyMatrices(mesh.matrixWorld, instance);
			box.applyMatrix4(world);
			represented.add(owner.id);
			if (frustum.intersectsBox(box)) inside.add(owner.id);
		}
	}
	return {
		total: total.size,
		represented: represented.size,
		inFrustum: inside.size
	};
}
/** A finite bank-fishing resource marker, not a free simulated animal. Local
* water and supporting ground are sampled live, including flood and real cuts. */
function fishMarkerHeight(g, node) {
	return g.world.localWaterVersion === 17 ? Math.max(g.height(node.x, node.z), g.waterAt(node.x, node.z)) + .1 : g.world.waterY + .1;
}
/** One merged sparse ground mesh. Actual completed cuts take priority, including
* raycasting and shadows; no duplicate coincident surfaces remain underneath. */
var BankTerrainLayer = class {
	rayQueries = {
		queries: 0,
		lastTileCandidates: 0,
		lastTriangleTests: 0
	};
	mesh;
	data;
	fullIndices;
	cuts;
	count = -1;
	active;
	constructor(terrain, g, decorate) {
		this.data = g.world.bankTerrain;
		const data = this.data, n = data.subdivisions, positions = [], normals = [], colors = [], rock = [], sand = [], indices = [], source = terrain.geometry, coarsePos = source.getAttribute("position"), color = source.getAttribute("color"), rockSource = source.getAttribute("surfaceRock"), sandSource = source.getAttribute("surfaceSand");
		const sampleAttribute = (attr, x, z, channel) => {
			const segs = g.world.segs, px = Math.max(0, Math.min(segs, (x / g.world.size + .5) * segs)), pz = Math.max(0, Math.min(segs, (z / g.world.size + .5) * segs)), ix = Math.min(segs - 1, Math.floor(px)), iz = Math.min(segs - 1, Math.floor(pz)), fx = px - ix, fz = pz - iz, id = iz * (segs + 1) + ix, get = (i) => channel === 0 ? attr.getX(i) : channel === 1 ? attr.getY(i) : attr.getZ(i), a = get(id), b = get(id + 1), c = get(id + segs + 1), d = get(id + segs + 2);
			return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
		};
		const height = (x, z) => sampleWorldHeight(g.world, x, z), normal = new Vector3();
		for (const tile of data.tiles) {
			const offset = positions.length / 3;
			for (let iz = 0; iz <= n; iz++) for (let ix = 0; ix <= n; ix++) {
				const x = (tile.x + ix / n) * data.tileSize - g.world.size / 2, z = (tile.z + iz / n) * data.tileSize - g.world.size / 2;
				positions.push(x, tile.heights[iz * (n + 1) + ix], z);
				normal.set(height(x - .5, z) - height(x + .5, z), 1, height(x, z - .5) - height(x, z + .5)).normalize();
				normals.push(normal.x, normal.y, normal.z);
				colors.push(sampleAttribute(color, x, z, 0), sampleAttribute(color, x, z, 1), sampleAttribute(color, x, z, 2));
				rock.push(sampleAttribute(rockSource, x, z, 0));
				sand.push(sampleAttribute(sandSource, x, z, 0));
			}
			for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
				const a = offset + iz * (n + 1) + ix, b = a + 1, c = a + n + 1, d = c + 1;
				indices.push(a, c, b, b, c, d);
			}
		}
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
		geometry.setAttribute("surfaceBank", new Float32BufferAttribute(new Float32Array(positions.length / 3).fill(1), 1));
		geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
		geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
		geometry.setAttribute("surfaceRock", new Float32BufferAttribute(rock, 1));
		geometry.setAttribute("surfaceSand", new Float32BufferAttribute(sand, 1));
		geometry.setIndex(indices);
		decorate?.(geometry);
		geometry.computeBoundingSphere();
		this.fullIndices = Uint32Array.from(indices);
		this.active = new Uint8Array(indices.length / 3).fill(1);
		this.mesh = new Mesh(geometry, terrain.material);
		this.mesh.name = "terrain-refined-banks";
		this.mesh.receiveShadow = true;
		const boxes = data.tiles.map((t) => new Box3(new Vector3(t.x * data.tileSize - g.world.size / 2, Math.min(...t.heights) - .001, t.z * data.tileSize - g.world.size / 2), new Vector3((t.x + 1) * data.tileSize - g.world.size / 2, Math.max(...t.heights) + .001, (t.z + 1) * data.tileSize - g.world.size / 2))), inverse = new Matrix4(), ray = new Ray(), a = new Vector3(), b = new Vector3(), c = new Vector3(), hit = new Vector3(), faceNormal = new Vector3(), edge = new Vector3();
		this.mesh.raycast = (caster, hits) => {
			this.rayQueries.queries++;
			this.rayQueries.lastTileCandidates = 0;
			this.rayQueries.lastTriangleTests = 0;
			inverse.copy(this.mesh.matrixWorld).invert();
			ray.copy(caster.ray).applyMatrix4(inverse);
			const p = this.mesh.geometry.getAttribute("position"), perTile = n * n * 6;
			for (let t = 0; t < boxes.length; t++) {
				if (!ray.intersectsBox(boxes[t])) continue;
				this.rayQueries.lastTileCandidates++;
				for (let i = t * perTile; i < (t + 1) * perTile; i += 3) {
					if (!this.active[i / 3]) continue;
					this.rayQueries.lastTriangleTests++;
					const ai = this.fullIndices[i], bi = this.fullIndices[i + 1], ci = this.fullIndices[i + 2];
					a.fromBufferAttribute(p, ai);
					b.fromBufferAttribute(p, bi);
					c.fromBufferAttribute(p, ci);
					if (!ray.intersectTriangle(a, b, c, true, hit)) continue;
					const point = hit.clone().applyMatrix4(this.mesh.matrixWorld), distance = point.distanceTo(caster.ray.origin);
					if (distance < caster.near || distance > caster.far) continue;
					faceNormal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
					hits.push({
						distance,
						point,
						object: this.mesh,
						faceIndex: i / 3,
						face: {
							a: ai,
							b: bi,
							c: ci,
							normal: faceNormal.clone(),
							materialIndex: 0
						}
					});
				}
			}
		};
		const kept = [], original = source.index.array;
		for (let i = 0; i < original.length; i += 3) {
			const a = original[i], b = original[i + 1], c = original[i + 2], x = (coarsePos.getX(a) + coarsePos.getX(b) + coarsePos.getX(c)) / 3, z = (coarsePos.getZ(a) + coarsePos.getZ(b) + coarsePos.getZ(c)) / 3;
			if (!bankTileAt(data, x, z, g.world.size)) kept.push(a, b, c);
		}
		source.setIndex(kept);
		this.sync(g);
	}
	sync(g) {
		const records = g.state.excavations, count = records?.length || 0;
		if (records === this.cuts && count === this.count) return;
		this.cuts = records;
		this.count = count;
		if (!count) {
			this.active.fill(1);
			this.mesh.geometry.setIndex(new BufferAttribute(this.fullIndices, 1));
			return;
		}
		const cuts = excavationTerrain(g), positions = this.mesh.geometry.getAttribute("position"), kept = [];
		for (let i = 0; i < this.fullIndices.length; i += 3) {
			const a = this.fullIndices[i], b = this.fullIndices[i + 1], c = this.fullIndices[i + 2], x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3, z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3, key = Math.floor((z + g.world.size / 2) / cuts.tileSize) * cuts.width + Math.floor((x + g.world.size / 2) / cuts.tileSize);
			const keep = !cuts.tiles.has(key);
			this.active[i / 3] = keep ? 1 : 0;
			if (keep) kept.push(a, b, c);
		}
		this.mesh.geometry.setIndex(kept);
	}
	dispose() {
		this.mesh.geometry.dispose();
	}
};
var HULL_ART = {
	maximumPerClass: 96,
	maximumWidth: 2.8,
	maximumLength: 6
};
function beam$3(w, h, d, x, y, z, ry = 0) {
	const g = new BoxGeometry(w, h, d);
	g.rotateY(ry);
	g.translate(x, y, z);
	return g;
}
function taperedHull(width, length, depth) {
	const s = new Shape();
	s.moveTo(0, -length / 2);
	s.bezierCurveTo(width * .44, -length * .47, width * .5, -length * .16, width * .5, 0);
	s.bezierCurveTo(width * .5, length * .25, width * .28, length * .46, 0, length / 2);
	s.bezierCurveTo(-width * .28, length * .46, -width * .5, length * .25, -width * .5, 0);
	s.bezierCurveTo(-width * .5, -length * .16, -width * .44, -length * .47, 0, -length / 2);
	const g = new ExtrudeGeometry(s, {
		depth,
		bevelEnabled: true,
		bevelSegments: 1,
		steps: 1,
		bevelSize: .04,
		bevelThickness: .05,
		curveSegments: 8
	});
	g.rotateX(Math.PI / 2);
	g.translate(0, .2, 0);
	return g;
}
function hullClassGeometry(kind) {
	const parts = [];
	if (kind === "scoutCanoe") {
		parts.push(taperedHull(1.25, 4.8, .18));
		for (const side of [-1, 1]) for (let i = 0; i < 12; i++) {
			const z = -2.18 + i * .396, x = side * (.32 + .25 * Math.sin((i + .5) / 12 * Math.PI));
			parts.push(beam$3(.1, .34, .45, x, .25, z));
		}
		for (const z of [
			-1.2,
			.2,
			1.2
		]) parts.push(beam$3(1.22, .11, .27, 0, .44, z));
		parts.push(taperedHull(.25, 3.7, .15).translate(1.18, -.07, 0));
		for (const z of [-1.1, 1.1]) {
			parts.push(beam$3(2, .12, .12, .37, .48, z));
			for (const x of [.5, 1.18]) parts.push(beam$3(.16, .15, .22, x, .5, z, .25));
		}
	} else {
		parts.push(taperedHull(2.65, 5.8, .25));
		for (const side of [-1, 1]) for (let i = 0; i < 12; i++) {
			const z = -2.55 + i * .46, x = side * (.7 + .52 * Math.sin((i + .5) / 12 * Math.PI));
			parts.push(beam$3(.14, .68, .51, x, .43, z));
		}
		for (const z of [
			-1.8,
			-.6,
			.6,
			1.8
		]) parts.push(beam$3(2.28, .17, .3, 0, .7, z));
		for (const z of [-1.15, 1.15]) for (const side of [-1, 1]) parts.push(beam$3(.12, .13, 1.65, side * .61, .31, z, side * .62));
		for (const z of [-2.5, 2.5]) parts.push(beam$3(1.25, .9, .2, 0, .51, z));
	}
	const combined = mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p));
	for (const p of parts) p.dispose();
	if (!combined) throw Error("Hull geometry failed");
	combined.computeBoundingBox();
	return combined;
}
var HullFleet = class {
	meshes = /* @__PURE__ */ new Map();
	owners = /* @__PURE__ */ new Map();
	matrix = new Matrix4();
	pos = new Vector3();
	q = new Quaternion();
	e = new Euler();
	scale = new Vector3(1, 1, 1);
	color = new Color();
	scene;
	constructor(scene, material) {
		this.scene = scene;
		for (const kind of ["scoutCanoe", "freightPunt"]) {
			const mesh = new InstancedMesh(hullClassGeometry(kind), material, HULL_ART.maximumPerClass);
			mesh.count = 0;
			mesh.frustumCulled = false;
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			this.meshes.set(kind, mesh);
			this.owners.set(mesh, []);
			scene.add(mesh);
		}
	}
	sync(g, shadows = false) {
		for (const m of this.meshes.values()) {
			m.count = 0;
			m.castShadow = shadows;
			this.owners.get(m).length = 0;
		}
		for (const b of g.state.boats ?? []) {
			if (!b.hullClass || b.hp <= 0 || b.team !== 0 && !g.exploredAt(b.x, b.z)) continue;
			const mesh = this.meshes.get(b.hullClass);
			if (mesh.count >= HULL_ART.maximumPerClass) continue;
			this.pos.set(b.x, g.waterAt(b.x, b.z) - .12, b.z);
			this.e.set(0, b.facing, 0);
			this.q.setFromEuler(this.e);
			this.matrix.compose(this.pos, this.q, this.scale);
			mesh.setMatrixAt(mesh.count, this.matrix);
			this.color.set(b.hullClass === "scoutCanoe" ? "#b89260" : "#93704c").multiplyScalar(.78 + .22 * b.hp / boatClass(b).maxHp);
			mesh.setColorAt(mesh.count, this.color);
			mesh.count++;
			this.owners.get(mesh).push(b);
		}
		for (const m of this.meshes.values()) {
			m.instanceMatrix.needsUpdate = true;
			if (m.instanceColor) m.instanceColor.needsUpdate = true;
		}
	}
	pickingSources() {
		return this.owners;
	}
	dispose() {
		for (const m of this.meshes.values()) {
			this.scene.remove(m);
			m.dispose();
			m.geometry.dispose();
		}
		this.meshes.clear();
		this.owners.clear();
	}
};
/** Upper surface deviations only; foundations and connected construction never move. */
var CRAFTSMANSHIP_RULES = {
	maximumRoofLeanMetres: .045,
	maximumBraceBendMetres: .025,
	maximumRoofLiftMetres: .035,
	foundationLockMetres: .25,
	fullEffectHeightMetres: 3.8
};
var roles = /* @__PURE__ */ new Set([
	"hut",
	"house",
	"townhall",
	"warehouse",
	"workshop",
	"lumber",
	"quarry",
	"market",
	"temple",
	"university"
]);
function hasBuildingCraftsmanship(type) {
	return roles.has(type);
}
function channel(n) {
	n = Math.imul(n ^ n >>> 16, 73244475);
	n = Math.imul(n ^ n >>> 16, 73244475);
	return ((n ^ n >>> 16) >>> 0) / 4294967295 * 2 - 1;
}
function buildingCraftsmanship(seed, id, type) {
	if (!hasBuildingCraftsmanship(type)) return {
		x: 0,
		z: 0,
		brace: 0,
		lift: 0
	};
	const n = seed ^ Math.imul(id, 2654435761);
	return {
		x: channel(n) * CRAFTSMANSHIP_RULES.maximumRoofLeanMetres,
		z: channel(n ^ 476689399) * CRAFTSMANSHIP_RULES.maximumRoofLeanMetres,
		brace: channel(n ^ 25915) * CRAFTSMANSHIP_RULES.maximumBraceBendMetres,
		lift: channel(n ^ 1374496523) * CRAFTSMANSHIP_RULES.maximumRoofLiftMetres
	};
}
function makeCraftsmanshipAttribute(geometry, capacity) {
	geometry.setAttribute("buildingArt", new InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
}
function bindCraftsmanship(material, roof) {
	const previous = material.onBeforeCompile, oldKey = material.customProgramCacheKey.bind(material);
	material.onBeforeCompile = function(shader, renderer) {
		previous.call(this, shader, renderer);
		shader.vertexShader = "attribute vec4 buildingArt;\n" + shader.vertexShader;
		shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
 float craftUpper=smoothstep(${CRAFTSMANSHIP_RULES.foundationLockMetres.toFixed(3)},${CRAFTSMANSHIP_RULES.fullEffectHeightMetres.toFixed(3)},position.y);
 transformed.x+=(buildingArt.x${roof ? "" : "+sin(position.y*2.5+position.x)*buildingArt.z"})*craftUpper;
 transformed.z+=buildingArt.y*craftUpper;
 transformed.y+=buildingArt.w*craftUpper;`);
	};
	material.customProgramCacheKey = () => oldKey() + `/hearthwild-craft-v1/${roof ? "roof" : "frame"}`;
	material.needsUpdate = true;
}
/** Original repeatable construction surfaces, generated once and shared by every
* instance/material clone. No downloads, random state or per-frame painting. */
var BUILDING_SURFACE_RULES = {
	resolution: 128,
	metresPerRepeat: 1.6,
	families: 4,
	mapsPerFamily: 3,
	anisotropy: 4
};
function hash$2(x, y) {
	let n = Math.imul(x + 13, 374761393) ^ Math.imul(y + 71, 668265263);
	n = Math.imul(n ^ n >>> 13, 1274126177);
	return ((n ^ n >>> 16) >>> 0) / 4294967295;
}
function fract$1(x) {
	return x - Math.floor(x);
}
function smooth(a, b, x) {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}
/** Bright neutral albedo lets existing village palettes supply material colour.
* Broad joints and weaving read before fine grain; no high-contrast stipple. */
function buildingSurfaceSample(kind, u, v) {
	const x = fract$1(u), y = fract$1(v);
	let height = .5, shade = .94, roughness = .93;
	if (kind === "timber") {
		const plank = Math.floor(x * 5), fx = fract$1(x * 5), seam = 1 - smooth(0, .035, Math.min(fx, 1 - fx));
		const bend = .045 * Math.sin(y * Math.PI * 2 + plank * 1.7), grain = Math.sin((x + bend) * Math.PI * 86 + y * 6) * .5 + .5;
		const knot = Math.exp(-((x - (plank + .45) / 5) ** 2 * 1800 + (y - (.25 + hash$2(plank, 3) * .5)) ** 2 * 65));
		height = .5 + grain * .09 - seam * .32 - knot * .09;
		shade = .97 - seam * .17 - knot * .12 - grain * .045 + hash$2(plank, 7) * .025;
		roughness = .8 + seam * .15 + grain * .06;
	} else if (kind === "thatch") {
		const course = Math.floor(y * 8), fy = fract$1(y * 8), reed = Math.sin((x + hash$2(course, 4) * .15) * Math.PI * 110) * .5 + .5;
		const lap = 1 - smooth(0, .12, fy);
		height = .45 + reed * .14 + fy * .16 - lap * .17;
		shade = .96 - lap * .105 - reed * .055 + Math.sin(x * Math.PI * 10 + course) * .025;
		roughness = .91 + reed * .07;
	} else if (kind === "earth") {
		const weave = Math.sin(x * Math.PI * 12) * Math.sin(y * Math.PI * 14), broad = Math.sin(x * Math.PI * 4 + y * Math.PI * 2) * Math.sin(y * Math.PI * 6) * .5;
		height = .5 + weave * .045 + broad * .08;
		shade = .95 + broad * .055 + weave * .018;
		roughness = .94 + broad * .07;
	} else {
		const row = Math.floor(y * 5), fx = fract$1(x * 4 + row % 2 * .5 + .05 * Math.sin(y * Math.PI * 10)), fy = fract$1(y * 5), gap = 1 - smooth(.015, .065, Math.min(fx, 1 - fx, fy, 1 - fy));
		const block = hash$2(Math.floor(x * 4 + row % 2 * .5), row), worn = Math.sin(x * Math.PI * 22 + y * Math.PI * 8) * Math.sin(y * Math.PI * 18) * .025;
		height = .57 + block * .13 - gap * .31 + worn;
		shade = .94 + block * .045 - gap * .14 + worn;
		roughness = .9 + gap * .08 + block * .025;
	}
	return {
		albedo: Math.max(0, Math.min(1, shade)),
		height: Math.max(0, Math.min(1, height)),
		roughness: Math.max(0, Math.min(1, roughness))
	};
}
function texture(data, size, color = false) {
	const t = new DataTexture(data, size, size, RGBAFormat);
	t.wrapS = t.wrapT = RepeatWrapping;
	t.colorSpace = color ? SRGBColorSpace : "";
	t.generateMipmaps = true;
	t.minFilter = LinearMipmapLinearFilter;
	t.magFilter = LinearFilter;
	t.anisotropy = BUILDING_SURFACE_RULES.anisotropy;
	t.needsUpdate = true;
	return t;
}
function makeBuildingSurfaces() {
	const result = {};
	const size = BUILDING_SURFACE_RULES.resolution;
	for (const kind of [
		"timber",
		"thatch",
		"earth",
		"masonry"
	]) {
		const data = [
			new Uint8Array(size * size * 4),
			new Uint8Array(size * size * 4),
			new Uint8Array(size * size * 4)
		];
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const s = buildingSurfaceSample(kind, (x + .5) / size, (y + .5) / size), i = (y * size + x) * 4;
			for (let channel = 0; channel < 3; channel++) {
				data[0][i + channel] = Math.round(s.albedo * 255);
				data[1][i + channel] = Math.round(s.roughness * 255);
				data[2][i + channel] = Math.round(s.height * 255);
			}
			for (const d of data) d[i + 3] = 255;
		}
		result[kind] = {
			map: texture(data[0], size, true),
			roughnessMap: texture(data[1], size),
			bumpMap: texture(data[2], size),
			bumpScale: kind === "timber" ? .025 : kind === "thatch" ? .045 : kind === "earth" ? .025 : .055
		};
	}
	return result;
}
function bindBuildingSurface(material, surface) {
	Object.assign(material, surface);
	return material;
}
/** Reproject once in physical metre units; merged primitive UVs otherwise stretch
* one plank over a whole wall and repeat a whole wall on every tiny brace. */
function buildingSurfaceUV(geometry) {
	const p = geometry.getAttribute("position"), n = geometry.getAttribute("normal");
	if (!p || !n) return geometry;
	const uv = new Float32Array(p.count * 2), scale = 1 / BUILDING_SURFACE_RULES.metresPerRepeat;
	for (let i = 0; i < p.count; i++) {
		const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
		uv[i * 2] = (nx > ny && nx > nz ? p.getZ(i) : p.getX(i)) * scale;
		uv[i * 2 + 1] = (ny >= nx && ny >= nz ? p.getZ(i) : p.getY(i)) * scale;
	}
	geometry.setAttribute("uv", new BufferAttribute(uv, 2));
	return geometry;
}
function disposeBuildingSurfaceTextures(materials) {
	const textures = /* @__PURE__ */ new Set();
	for (const m of materials) for (const t of [
		m.map,
		m.roughnessMap,
		m.bumpMap
	]) if (t) textures.add(t);
	for (const t of textures) t.dispose();
}
var FIXED_ORBIT_RULES = Object.freeze({
	minimumDistance: 14,
	maximumDistance: 230,
	focusHeight: .55,
	targetOffset: 1.2,
	minimumEyeClearance: 2,
	eyeHalfWidth: .5,
	sweepSpacing: .5,
	maximumSweepSteps: 512,
	maximumHeightQueries: 8192,
	initialDistanceSpacing: 1,
	refinementSteps: 10
});
/** Collision rejects movement. It never lifts an eye, tilts a view, or promises
* a clear sightline through mountains. Only explicit requested orbit changes
* may change yaw/pitch. The current accepted rigid pose is the sweep origin. */
var FixedOrbitCameraCollision = class {
	last = null;
	ground = null;
	revision = -1;
	request = null;
	result = null;
	hits = 0;
	solves = 0;
	queries = 0;
	invalidate() {
		this.ground = null;
		this.request = null;
		this.result = null;
		this.last = null;
	}
	diagnostics() {
		return {
			solves: this.solves,
			cacheHits: this.hits,
			heightQueries: this.queries
		};
	}
	resolve(ground, requested, revision = 0) {
		const R = FIXED_ORBIT_RULES;
		if (this.ground === ground && this.revision === revision && this.request && this.result && this.request.x === requested.x && this.request.z === requested.z && this.request.distance === requested.distance && this.request.yaw === requested.yaw && this.request.pitch === requested.pitch) {
			this.hits++;
			return this.result;
		}
		let queries = 0;
		const half = ground.size / 2;
		const height = (x, z) => {
			if (Math.abs(x) > half || Math.abs(z) > half) return -Infinity;
			if (queries >= R.maximumHeightQueries) return null;
			queries++;
			const y = ground.height(x, z);
			return Number.isFinite(y) ? y : null;
		};
		const pose = (q) => {
			const h = height(q.x, q.z);
			if (h === null || !Number.isFinite(h)) return null;
			const focusY = h + R.focusHeight, c = Math.cos(q.pitch);
			return {
				...q,
				focusY,
				eye: {
					x: q.x + Math.sin(q.yaw) * c * q.distance,
					y: focusY + R.targetOffset + Math.sin(q.pitch) * q.distance,
					z: q.z + Math.cos(q.yaw) * c * q.distance
				}
			};
		};
		const eyeSafe = (eye) => {
			for (let iz = -1; iz <= 1; iz++) for (let ix = -1; ix <= 1; ix++) {
				const h = height(eye.x + ix * R.eyeHalfWidth, eye.z + iz * R.eyeHalfWidth);
				if (h === null || eye.y < h + R.minimumEyeClearance) return false;
			}
			return true;
		};
		const segmentSafe = (a, b) => {
			const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / R.sweepSpacing));
			if (steps > R.maximumSweepSteps) return false;
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				if (!eyeSafe({
					x: a.x + (b.x - a.x) * t,
					y: a.y + (b.y - a.y) * t,
					z: a.z + (b.z - a.z) * t
				})) return false;
			}
			return true;
		};
		const mix = (a, b, t) => ({
			x: a.x + (b.x - a.x) * t,
			z: a.z + (b.z - a.z) * t,
			distance: a.distance + (b.distance - a.distance) * t,
			yaw: a.yaw + (b.yaw - a.yaw) * t,
			pitch: a.pitch + (b.pitch - a.pitch) * t
		});
		const finish = (accepted, blocked) => {
			this.solves++;
			this.queries += queries;
			this.ground = ground;
			this.revision = revision;
			this.request = { ...requested };
			this.last = accepted;
			this.result = {
				pose: accepted,
				blocked,
				heightQueries: queries
			};
			return this.result;
		};
		let origin = this.last;
		if (this.ground !== ground || this.revision !== revision) {
			if (origin && !eyeSafe(origin.eye)) origin = null;
		}
		if (!origin) {
			const desired = pose(requested);
			if (desired && eyeSafe(desired.eye)) return finish(desired, false);
			for (let offset = R.initialDistanceSpacing; offset <= R.maximumDistance - R.minimumDistance; offset += R.initialDistanceSpacing) for (const distance of [requested.distance - offset, requested.distance + offset]) {
				if (distance < R.minimumDistance || distance > R.maximumDistance) continue;
				const candidate = pose({
					...requested,
					distance
				});
				if (candidate && eyeSafe(candidate.eye)) return finish(candidate, true);
			}
			return finish(null, true);
		}
		const requestedPose = pose(requested);
		if (!requestedPose) return finish(origin, true);
		const length = Math.hypot(requested.x - origin.x, requested.z - origin.z) + Math.abs(requested.distance - origin.distance) + Math.max(requested.distance, origin.distance) * (Math.abs(requested.yaw - origin.yaw) + Math.abs(requested.pitch - origin.pitch)) + Math.abs(requestedPose.focusY - origin.focusY);
		const steps = Math.max(1, Math.ceil(length / R.sweepSpacing));
		let accepted = origin, acceptedT = 0;
		for (let i = 1; i <= Math.min(steps, R.maximumSweepSteps); i++) {
			const t = i / steps, next = pose(mix(origin, requested, t));
			if (!next || !segmentSafe(accepted.eye, next.eye)) {
				let lo = acceptedT, hi = t;
				for (let k = 0; k < R.refinementSteps; k++) {
					const mid = (lo + hi) / 2, candidate = pose(mix(origin, requested, mid));
					if (candidate && segmentSafe(accepted.eye, candidate.eye)) {
						lo = mid;
						accepted = candidate;
					} else hi = mid;
				}
				return finish(accepted, true);
			}
			accepted = next;
			acceptedT = t;
		}
		return finish(accepted, steps > R.maximumSweepSteps);
	}
};
/** Small stable craftsmanship variation, applied above the foundation only. */
function buildingCharacter(seed, id) {
	let n = Math.imul(seed ^ id, 73244475);
	n = (n ^ n >>> 16) >>> 0;
	return {
		roofHeight: .98 + n % 1001 / 1e3 * .04,
		tint: .97 + (n >>> 10) % 1001 / 1e3 * .06
	};
}
/** Flames show active heating fuel or a paid cooking batch in progress. */
function workingHearths(g) {
	const ids = new Set(g.state.buildings.filter((b) => b.type === "hearth" && hearthHeating(g, b.id)).map((b) => b.id));
	for (const p of g.state.production?.projects || []) {
		const r = PRODUCTION_RECIPES[p.recipe];
		if (p.phase !== "working" || !r || r.wood <= 0) continue;
		const actor = g.state.units.find((u) => u.id === p.actorId && u.hp > 0 && u.productionProjectId === p.id);
		if (!actor) continue;
		const b = g.state.buildings.find((b) => b.id === p.workplace && b.type === "hearth" && g.finished(b));
		if (b && Math.hypot(actor.x - b.x, actor.z - b.z) <= 5) ids.add(b.id);
	}
	return ids;
}
/** Actual animals only: compact visible instances, never ambient substitute prey. */
function wildlifeInstanceAnimals(animals, species, visible, explored, available) {
	return animals.filter((c) => c.species === species && (c.hp > 0 ? visible(c.x, c.z) : available(c) && explored(c.x, c.z)));
}
/** Keep one draw per species, growing only to actual population. Animated
* instances have no stable bounding sphere; visibility is already simulation-gated. */
function growWildlifeMesh(scene, old, needed) {
	old.frustumCulled = false;
	if (needed <= old.instanceMatrix.count) return old;
	const mesh = new InstancedMesh(old.geometry, old.material, Math.max(needed, old.instanceMatrix.count * 2));
	mesh.name = old.name;
	mesh.castShadow = old.castShadow;
	mesh.receiveShadow = old.receiveShadow;
	mesh.frustumCulled = false;
	mesh.instanceMatrix.setUsage(DynamicDrawUsage);
	scene.remove(old);
	old.dispose();
	scene.add(mesh);
	return mesh;
}
var FIBRE_WORK_ART = {
	capacity: 256,
	refreshSeconds: .25,
	maximumDistanceMetres: 280
};
/** Inputs were paid earlier, but do not appear here until they actually reach
* their workplace. Paused work keeps its physical workpiece and progress. */
function paidFibreWork(p) {
	const r = PRODUCTION_RECIPES[p.recipe];
	if (!r || !(r.inputs.plantFibre || r.inputs.cordage) || !(p.phase === "working" || p.phase === "paused" && p.resumePhase === "working")) return null;
	return {
		weaving: !!r.outputs.basket,
		growth: Math.max(.05, Math.min(1, p.progress / Math.max(.1, productionWorkSeconds(p.recipe))))
	};
}
function merge$5(parts) {
	const plain = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	});
	const out = mergeGeometries(plain);
	plain.forEach((g) => g.dispose());
	return out;
}
function bundleGeometry() {
	const parts = [];
	for (let i = 0; i < 9; i++) {
		const a = i * Math.PI * 2 / 9, g = new CylinderGeometry(.012, .02, .72, 4);
		g.rotateZ(.05 * Math.sin(a));
		g.rotateX(Math.PI / 2 + .04 * Math.cos(a));
		g.translate(Math.cos(a) * .05, Math.sin(a) * .035, 0);
		parts.push(g);
	}
	for (const z of [-.22, .2]) {
		const ring = new TorusGeometry(.065, .008, 3, 8);
		ring.translate(0, 0, z);
		parts.push(ring);
	}
	return merge$5(parts);
}
function warpGeometry() {
	const parts = [];
	for (let i = 0; i < 10; i++) {
		const line = new CylinderGeometry(.007, .009, 1.05, 3);
		line.translate(-.65 + i * .145, .525, 0);
		parts.push(line);
	}
	for (let i = 0; i < 12; i++) {
		const row = new BoxGeometry(1.4, .009, .016);
		row.translate(0, .06 + i * .083, .008 * (i % 2 ? 1 : -1));
		parts.push(row);
	}
	return merge$5(parts);
}
var FibreWorkLayer = class {
	bundles;
	weaving;
	scene;
	material;
	world = null;
	state = null;
	next = -Infinity;
	disposed = false;
	axis = new Vector3(0, 1, 0);
	matrix = new Matrix4();
	base = new Matrix4();
	local = new Matrix4();
	position = new Vector3();
	quaternion = new Quaternion();
	scale = new Vector3();
	constructor(scene) {
		this.scene = scene;
		this.material = new MeshStandardMaterial({
			color: 13480315,
			roughness: .96,
			metalness: 0
		});
		this.bundles = new InstancedMesh(bundleGeometry(), this.material, FIBRE_WORK_ART.capacity);
		this.weaving = new InstancedMesh(warpGeometry(), this.material, FIBRE_WORK_ART.capacity);
		for (const [mesh, name] of [[this.bundles, "actual-paid-fibre-batches"], [this.weaving, "actual-paid-weaving-progress"]]) {
			mesh.name = name;
			mesh.count = 0;
			mesh.visible = false;
			mesh.frustumCulled = false;
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.raycast = () => void 0;
			scene.add(mesh);
		}
	}
	sync(g, camera, shadows = false) {
		if (this.disposed) return;
		if (this.world !== g.world || this.state !== g.state) {
			this.world = g.world;
			this.state = g.state;
			this.next = -Infinity;
		}
		for (const m of [this.bundles, this.weaving]) m.castShadow = shadows;
		if (g.state.time < this.next && g.state.time >= this.next - FIBRE_WORK_ART.refreshSeconds) return;
		this.next = g.state.time + FIBRE_WORK_ART.refreshSeconds;
		this.bundles.count = this.weaving.count = 0;
		if (!g.state.production?.projects.length) {
			this.bundles.visible = this.weaving.visible = false;
			return;
		}
		const sites = /* @__PURE__ */ new Map();
		for (const b of g.state.buildings) if (b.hp > 0 && g.finished(b) && Math.hypot(b.x - camera.x, b.z - camera.z) < FIBRE_WORK_ART.maximumDistanceMetres && (b.team === 0 || g.visibleAt(b.x, b.z))) sites.set(b.id, b);
		for (const p of g.state.production?.projects || []) {
			const work = paidFibreWork(p), b = sites.get(p.workplace);
			if (!work || !b || this.bundles.count >= FIBRE_WORK_ART.capacity) continue;
			const st = TEAM_STYLE[b.team] || TEAM_STYLE[0];
			this.position.set(b.x, foundationProfile(g, b).level, b.z);
			this.quaternion.setFromAxisAngle(this.axis, st.yaw);
			this.scale.set(st.sx, st.sy, st.sz);
			this.base.compose(this.position, this.quaternion, this.scale);
			this.position.set(b.type === "fibreWorkshop" ? 1 : 0, b.type === "fibreWorkshop" ? .94 : .3, 0);
			this.quaternion.identity();
			this.scale.set(1, 1, 1);
			this.local.compose(this.position, this.quaternion, this.scale);
			this.matrix.multiplyMatrices(this.base, this.local);
			this.bundles.setMatrixAt(this.bundles.count++, this.matrix);
			if (work.weaving && b.type === "fibreWorkshop" && this.weaving.count < FIBRE_WORK_ART.capacity) {
				this.position.set(-.67, .55, .65);
				this.scale.set(1, work.growth, 1);
				this.local.compose(this.position, this.quaternion, this.scale);
				this.matrix.multiplyMatrices(this.base, this.local);
				this.weaving.setMatrixAt(this.weaving.count++, this.matrix);
			}
		}
		for (const m of [this.bundles, this.weaving]) {
			m.visible = m.count > 0;
			m.instanceMatrix.needsUpdate = true;
		}
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		for (const m of [this.bundles, this.weaving]) {
			this.scene.remove(m);
			m.dispose();
			m.geometry.dispose();
		}
		this.material.dispose();
	}
};
var BASKET_ART = {
	capacity: 1024,
	roughness: .96,
	distancesMetres: {
		low: 170,
		med: 240,
		high: 320
	},
	minimumCondition: 0
};
function colored$2(g, color) {
	const c = new Color(color), a = new Float32Array(g.attributes.position.count * 3);
	for (let i = 0; i < a.length; i += 3) {
		a[i] = c.r;
		a[i + 1] = c.g;
		a[i + 2] = c.b;
	}
	g.setAttribute("color", new BufferAttribute(a, 3));
	return g;
}
function basketStyleColor(style, condition, target = new Color()) {
	let hash = 2166136261;
	for (let i = 0; i < style.length; i++) hash = Math.imul(hash ^ style.charCodeAt(i), 16777619);
	return target.setHSL(.085 + (hash >>> 0) % 35 / 1e3, .32 + (hash >>> 8) % 17 / 100, .48 + (hash >>> 16) % 13 / 100 - Math.max(0, 1 - condition) * .1);
}
/** Open, empty wicker basket. Its rim, alternating weft bands, ribs and shoulder
* straps are geometry; no painted food or cargo pretends to be real inventory. */
function basketGeometry() {
	const parts = [];
	const body = new LatheGeometry([
		new Vector2(.1, 0),
		new Vector2(.13, .035),
		new Vector2(.18, .18),
		new Vector2(.205, .3),
		new Vector2(.19, .3)
	], 12);
	parts.push(colored$2(body, 13742717));
	for (let i = 0; i < 6; i++) {
		const y = .04 + i * .049, r = .13 + (y - .035) / .265 * .075, g = new TorusGeometry(r, .008, 3, 12);
		g.rotateX(Math.PI / 2);
		g.translate(0, y, 0);
		parts.push(colored$2(g, i % 2 ? 8217150 : 15321497));
	}
	const rim = new TorusGeometry(.2, .015, 4, 12);
	rim.rotateX(Math.PI / 2);
	rim.translate(0, .305, 0);
	parts.push(colored$2(rim, 15123854));
	for (let i = 0; i < 8; i++) {
		const a = i * Math.PI / 4, b = new Vector3(Math.cos(a) * .11, .025, Math.sin(a) * .11), t = new Vector3(Math.cos(a) * .2, .3, Math.sin(a) * .2), d = t.clone().sub(b), g = new CylinderGeometry(.006, .006, d.length(), 3);
		g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()));
		g.translate((b.x + t.x) / 2, (b.y + t.y) / 2, (b.z + t.z) / 2);
		parts.push(colored$2(g, 10387540));
	}
	const bottom = new CylinderGeometry(.105, .1, .018, 12);
	bottom.translate(0, .009, 0);
	parts.push(colored$2(bottom, 11374177));
	for (const x of [-.13, .13]) {
		const strap = new BoxGeometry(.022, .45, .025);
		strap.rotateX(-.3);
		strap.translate(x, .39, .14);
		parts.push(colored$2(strap, 6771509));
	}
	const plain = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		n.translate(.08, .34, -.31);
		return n;
	});
	const out = mergeGeometries(plain);
	plain.forEach((g) => g.dispose());
	out.computeBoundingBox();
	out.computeBoundingSphere();
	return out;
}
var BasketLayer = class {
	mesh;
	owners = [];
	count = 0;
	scene;
	color = new Color();
	disposed = false;
	camera = null;
	distance = 240;
	source = /* @__PURE__ */ new Map();
	constructor(scene) {
		this.scene = scene;
		this.mesh = new InstancedMesh(basketGeometry(), new MeshStandardMaterial({
			vertexColors: true,
			roughness: BASKET_ART.roughness,
			metalness: 0,
			side: 2
		}), BASKET_ART.capacity);
		this.mesh.name = "actual-owned-wicker-baskets";
		this.mesh.count = 0;
		this.mesh.visible = false;
		this.mesh.frustumCulled = false;
		this.mesh.receiveShadow = true;
		this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
		this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(BASKET_ART.capacity * 3), 3);
		this.mesh.instanceColor.setUsage(DynamicDrawUsage);
		this.source.set(this.mesh, this.owners);
		scene.add(this.mesh);
	}
	beginFrame(quality, shadows = false, camera) {
		this.count = 0;
		this.owners.length = 0;
		this.camera = camera || null;
		this.distance = BASKET_ART.distancesMetres[quality];
		this.mesh.castShadow = shadows && quality !== "low";
	}
	write(g, u, body) {
		if (this.disposed || u.hp <= 0 || u.shelterId || !u.basket || u.basket.condition <= BASKET_ART.minimumCondition || u.team !== 0 && !g.visibleAt(u.x, u.z) || this.camera && Math.hypot(u.x - this.camera.x, u.z - this.camera.z) > this.distance || this.count >= BASKET_ART.capacity) return false;
		this.mesh.setMatrixAt(this.count, body);
		this.mesh.setColorAt(this.count, basketStyleColor(u.basket.origin?.style ?? `local-fibre-${u.team}`, u.basket.condition, this.color));
		this.owners.push(u);
		this.count++;
		return true;
	}
	endFrame() {
		this.mesh.count = this.count;
		this.mesh.visible = this.count > 0;
		if (this.count) {
			this.mesh.instanceMatrix.needsUpdate = true;
			this.mesh.instanceColor.needsUpdate = true;
		}
	}
	sources() {
		return this.source;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.scene.remove(this.mesh);
		this.mesh.dispose();
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
		this.owners.length = 0;
		this.source.clear();
	}
};
var PEN_FENCE_ART = {
	postSpacingMetres: 2,
	gateOpeningMetres: 2,
	heightMetres: .95,
	maximumPosts: 8192,
	maximumRails: 16384,
	distanceMetres: 360,
	refreshSeconds: .5
};
/** Stable human-sized posts: enlarging a field adds fence sections rather than
* stretching every wooden post and rail into a giant. Front opening admits handlers. */
function penFenceSegments(b) {
	const points = [], w = b.w / 2, d = b.d / 2, corners = [
		[-w, -d],
		[w, -d],
		[w, d],
		[-w, d]
	];
	for (let side = 0; side < 4; side++) {
		const a = corners[side], c = corners[(side + 1) % 4], steps = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / PEN_FENCE_ART.postSpacingMetres);
		if (side === 2) {
			const xs = [
				w,
				1,
				-1,
				...Array.from({ length: steps }, (_, i) => w - b.w * i / steps).filter((x) => Math.abs(x) >= 1)
			];
			for (const x of [...new Set(xs)].sort((a, b) => b - a)) points.push({
				x: b.x + x,
				z: b.z + d
			});
		} else for (let i = 0; i < steps; i++) points.push({
			x: b.x + a[0] + (c[0] - a[0]) * i / steps,
			z: b.z + a[1] + (c[1] - a[1]) * i / steps
		});
	}
	return points.map((a, i) => ({
		a,
		b: points[(i + 1) % points.length],
		gate: Math.abs(a.z - b.z - d) < 1e-5 && Math.abs(points[(i + 1) % points.length].z - b.z - d) < 1e-5 && Math.abs((a.x + points[(i + 1) % points.length].x) / 2 - b.x) < 1e-5
	}));
}
var PenFenceLayer = class {
	posts;
	rails;
	world = null;
	state = null;
	buildings = null;
	scene;
	material;
	owners = /* @__PURE__ */ new Map();
	next = -Infinity;
	signature = "";
	length = -1;
	cameraX = Infinity;
	cameraZ = Infinity;
	matrix = new Matrix4();
	position = new Vector3();
	scale = new Vector3();
	quaternion = new Quaternion();
	direction = new Vector3();
	xAxis = new Vector3(1, 0, 0);
	constructor(scene, material) {
		this.scene = scene;
		this.material = material;
		this.posts = new InstancedMesh(new BoxGeometry(.16, PEN_FENCE_ART.heightMetres, .16), material, PEN_FENCE_ART.maximumPosts);
		this.rails = new InstancedMesh(new BoxGeometry(1, .1, .1), material, PEN_FENCE_ART.maximumRails);
		for (const mesh of [this.posts, this.rails]) {
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.count = 0;
			mesh.frustumCulled = false;
			this.owners.set(mesh, []);
			scene.add(mesh);
		}
	}
	sync(g, camera, shadows = false) {
		if (this.world !== g.world || this.state !== g.state || this.buildings !== g.state.buildings) {
			this.world = g.world;
			this.state = g.state;
			this.buildings = g.state.buildings;
			this.next = -Infinity;
			this.signature = "";
		}
		for (const mesh of [this.posts, this.rails]) mesh.castShadow = shadows;
		if (g.state.time < this.next && g.state.time >= this.next - PEN_FENCE_ART.refreshSeconds && this.length === g.state.buildings.length && Math.hypot(camera.x - this.cameraX, camera.z - this.cameraZ) < 24) return;
		this.length = g.state.buildings.length;
		this.cameraX = camera.x;
		this.cameraZ = camera.z;
		this.next = g.state.time + PEN_FENCE_ART.refreshSeconds;
		const pens = g.state.buildings.filter((b) => b.type === "pen" && b.hp > 0 && (b.team === 0 || g.exploredAt(b.x, b.z)) && Math.hypot(b.x - camera.x, b.z - camera.z) < PEN_FENCE_ART.distanceMetres), key = g.terrainRevision() + ":" + pens.map((b) => `${b.id},${b.x},${b.z},${b.w},${b.d},${Math.floor(b.build * 20)},${!!b.plannedCost}`).join(";");
		if (key === this.signature) return;
		this.signature = key;
		this.posts.count = this.rails.count = 0;
		for (const owners of this.owners.values()) owners.length = 0;
		for (const pen of pens) {
			const height = pen.plannedCost ? .08 : .22 + .78 * Math.max(0, pen.build);
			for (const edge of penFenceSegments(pen)) {
				if (this.posts.count >= PEN_FENCE_ART.maximumPosts || this.rails.count + 2 > PEN_FENCE_ART.maximumRails) break;
				const ah = g.height(edge.a.x, edge.a.z), bh = g.height(edge.b.x, edge.b.z);
				this.position.set(edge.a.x, ah + PEN_FENCE_ART.heightMetres * height / 2, edge.a.z);
				this.scale.set(1, height, 1);
				this.quaternion.identity();
				this.matrix.compose(this.position, this.quaternion, this.scale);
				this.posts.setMatrixAt(this.posts.count++, this.matrix);
				this.owners.get(this.posts).push(pen);
				if (edge.gate) continue;
				this.direction.set(edge.b.x - edge.a.x, bh - ah, edge.b.z - edge.a.z);
				const length = this.direction.length();
				this.quaternion.setFromUnitVectors(this.xAxis, this.direction.normalize());
				for (const y of [.38, .75]) {
					this.position.set((edge.a.x + edge.b.x) / 2, (ah + bh) / 2 + y * height, (edge.a.z + edge.b.z) / 2);
					this.scale.set(length, height, 1);
					this.matrix.compose(this.position, this.quaternion, this.scale);
					this.rails.setMatrixAt(this.rails.count++, this.matrix);
					this.owners.get(this.rails).push(pen);
				}
			}
		}
		for (const mesh of [this.posts, this.rails]) mesh.instanceMatrix.needsUpdate = true;
	}
	pickingSources() {
		return this.owners;
	}
	dispose() {
		for (const mesh of [this.posts, this.rails]) {
			this.scene.remove(mesh);
			mesh.dispose();
			mesh.geometry.dispose();
		}
		this.material.dispose();
		this.owners.clear();
	}
};
var WATER_VESSEL_ART = {
	capacity: 2048,
	roughness: .94
};
function vesselStyleColor(style, target = new Color()) {
	let hash = 2166136261;
	for (let i = 0; i < style.length; i++) hash = Math.imul(hash ^ style.charCodeAt(i), 16777619);
	return target.setHSL(.035 + (hash >>> 0) % 35 / 1e3, .38 + (hash >>> 8) % 15 / 100, .37 + (hash >>> 16) % 15 / 100);
}
function colored$1(g, color) {
	const c = new Color(color), a = new Float32Array(g.attributes.position.count * 3);
	for (let i = 0; i < a.length; i += 3) {
		a[i] = c.r;
		a[i + 1] = c.g;
		a[i + 2] = c.b;
	}
	g.setAttribute("color", new BufferAttribute(a, 3));
	return g;
}
/** Empty equipment has no model. This is one actually owned jar, never a
* decoration that pretends to be delivered stock or an extra water source. */
function waterVesselGeometry() {
	const jar = new LatheGeometry([
		new Vector2(.035, 0),
		new Vector2(.09, .025),
		new Vector2(.13, .12),
		new Vector2(.1, .22),
		new Vector2(.055, .25),
		new Vector2(.055, .29),
		new Vector2(.043, .29)
	], 12);
	const rim = new TorusGeometry(.055, .009, 3, 12);
	rim.rotateX(Math.PI / 2);
	rim.translate(0, .285, 0);
	const band = new TorusGeometry(.124, .007, 3, 12);
	band.rotateX(Math.PI / 2);
	band.translate(0, .13, 0);
	const handle = new TorusGeometry(.045, .009, 4, 8, Math.PI * 1.5);
	handle.rotateY(Math.PI / 2);
	handle.translate(-.09, .22, 0);
	const strap = new BoxGeometry(.018, .48, .022);
	strap.translate(-.03, .35, -.01);
	const parts = [
		colored$1(jar, 16777215),
		colored$1(rim, 13220001),
		colored$1(band, 6705469),
		colored$1(handle, 16777215),
		colored$1(strap, 4799532)
	].map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		n.translate(-.28, .3, .02);
		return n;
	});
	const result = mergeGeometries(parts);
	parts.forEach((g) => g.dispose());
	result.computeBoundingBox();
	result.computeBoundingSphere();
	return result;
}
var WaterVesselLayer = class {
	mesh;
	owners = [];
	scene;
	color = new Color();
	count = 0;
	disposed = false;
	sourcesMap = /* @__PURE__ */ new Map();
	constructor(scene) {
		this.scene = scene;
		this.mesh = new InstancedMesh(waterVesselGeometry(), new MeshStandardMaterial({
			vertexColors: true,
			roughness: WATER_VESSEL_ART.roughness,
			metalness: 0,
			side: 2
		}), WATER_VESSEL_ART.capacity);
		this.mesh.name = "owned-water-vessels";
		this.mesh.count = 0;
		this.mesh.visible = false;
		this.mesh.frustumCulled = false;
		this.mesh.receiveShadow = true;
		this.mesh.castShadow = false;
		this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
		this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(WATER_VESSEL_ART.capacity * 3), 3);
		this.mesh.instanceColor.setUsage(DynamicDrawUsage);
		this.sourcesMap.set(this.mesh, this.owners);
		scene.add(this.mesh);
	}
	beginFrame(quality, shadows = false) {
		this.count = 0;
		this.owners.length = 0;
		this.mesh.castShadow = shadows && quality !== "low";
	}
	write(g, u, body) {
		if (this.disposed || u.hp <= 0 || u.shelterId || !u.waterVessel || u.waterVessel.tripsRemaining <= 0 || u.team !== 0 && !g.visibleAt(u.x, u.z) || this.count >= WATER_VESSEL_ART.capacity) return false;
		this.mesh.setMatrixAt(this.count, body);
		this.mesh.setColorAt(this.count, vesselStyleColor(u.waterVessel.origin?.style ?? `unattributed-${u.team}`, this.color));
		this.owners.push(u);
		this.count++;
		return true;
	}
	endFrame() {
		this.mesh.count = this.count;
		this.mesh.visible = this.count > 0;
		if (this.count) {
			this.mesh.instanceMatrix.needsUpdate = true;
			this.mesh.instanceColor.needsUpdate = true;
		}
	}
	sources() {
		return this.sourcesMap;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.scene.remove(this.mesh);
		this.mesh.dispose();
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
		this.owners.length = 0;
		this.sourcesMap.clear();
	}
};
var WORN_GARMENT_RULES = Object.freeze({
	instancesPerKind: 2048,
	minimumCondition: 0,
	skinColor: "#a88b61",
	leatherColor: "#70462f",
	skinRoughness: 1,
	leatherRoughness: .82,
	wornBrightness: .64
});
function paint$1(g, color) {
	const c = new Color(color), colors = new Float32Array(g.attributes.position.count * 3);
	for (let i = 0; i < colors.length; i += 3) {
		colors[i] = c.r;
		colors[i + 1] = c.g;
		colors[i + 2] = c.b;
	}
	g.setAttribute("color", new BufferAttribute(colors, 3));
	return g;
}
function box$6(w, h, d, x, y, z, color) {
	const g = new BoxGeometry(w, h, d);
	g.translate(x, y + h / 2, z);
	return paint$1(g, color);
}
function shell(rt, rb, h, y, color, backOnly = false) {
	const g = new CylinderGeometry(rt, rb, h, 10, 1, true, backOnly ? Math.PI / 2 : 0, backOnly ? Math.PI : Math.PI * 2);
	g.scale(1.08, 1, .9);
	g.translate(0, y + h / 2, 0);
	return paint$1(g, color);
}
function ring(radius, tube, y, color) {
	const g = new TorusGeometry(radius, tube, 3, 12);
	g.rotateX(Math.PI / 2);
	g.scale(1.08, 1, .9);
	g.translate(0, y, 0);
	return paint$1(g, color);
}
function joinGarment(parts) {
	const plain = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	});
	const joined = mergeGeometries(plain);
	plain.forEach((g) => g.dispose());
	joined.computeBoundingBox();
	joined.computeBoundingSphere();
	return joined;
}
function wornGarmentGeometry(kind) {
	if (kind === "lightClothes") {
		const parts = [
			shell(.19, .255, .52, .3, "#d6c4a0"),
			ring(.185, .012, .82, "#ebddbd"),
			shell(.22, .22, .035, .48, "#79664b")
		];
		for (const x of [-.24, .24]) parts.push(box$6(.16, .14, .23, x - .08, .7, -.11, "#c4b28f"));
		for (const x of [
			-.13,
			0,
			.13
		]) parts.push(box$6(.012, .38, .014, x, .32, .224, "#ead9b6"));
		return joinGarment(parts);
	}
	if (kind === "woolCoat") {
		const parts = [
			shell(.221, .255, .59, .26, "#a9a28d"),
			ring(.2, .024, .85, "#c9c2a8"),
			shell(.256, .256, .045, .28, "#7c7764"),
			box$6(.025, .43, .025, 0, .29, .238, "#646353")
		];
		for (const x of [-.277, .147]) parts.push(box$6(.13, .25, .24, x, .52, -.12, "#99947e"));
		for (const y of [
			.43,
			.55,
			.67
		]) parts.push(box$6(.055, .018, .02, 0, y, .256, "#d1c9ad"));
		return joinGarment(parts);
	}
	if (kind === "hideCoat") {
		const parts = [
			shell(.223, .26, .64, .24, "#654735"),
			ring(.199, .032, .849, "#e1c697"),
			shell(.253, .253, .06, .25, "#d1b28a"),
			shell(.236, .236, .044, .48, "#35271f"),
			box$6(.028, .51, .018, -.014, .29, .231, "#ddbb8c")
		];
		for (const x of [-.277, .147]) {
			parts.push(box$6(.13, .29, .24, x, .48, -.12, "#76513b"));
			parts.push(box$6(.134, .051, .244, x - .002, .48, -.122, "#d1b28a"));
		}
		return joinGarment(parts);
	}
	const skin = kind === "skinClothes", base = skin ? WORN_GARMENT_RULES.skinColor : WORN_GARMENT_RULES.leatherColor, parts = [];
	parts.push(shell(skin ? .19 : .185, skin ? .245 : .205, skin ? .57 : .5, skin ? .3 : .34, base));
	for (const x of [-.1, .1]) {
		const leg = new CylinderGeometry(.067, .061, .32, 6);
		leg.translate(x, .26, .04);
		parts.push(paint$1(leg, skin ? "#806a4c" : "#523a2d"));
	}
	if (skin) {
		parts.push(shell(.215, .27, .48, .31, "#c2a675", true), ring(.185, .028, .865, "#ddc99c"));
		for (let i = 0; i < 10; i++) {
			const a = i * Math.PI / 5, g = new ConeGeometry(.038, .085, 3);
			g.rotateZ(Math.PI);
			g.translate(Math.sin(a) * .245, .282, Math.cos(a) * .22);
			parts.push(paint$1(g, "#c6ac7a"));
		}
	} else {
		parts.push(ring(.19, .013, .845, "#aa835b"), shell(.211, .211, .045, .48, "#342b24"), box$6(.012, .43, .015, 0, .36, .184, "#c4a77b"));
		for (const y of [
			.57,
			.63,
			.69,
			.75
		]) parts.push(box$6(.065, .012, .017, 0, y, .19, "#b29365"));
	}
	return joinGarment(parts);
}
/** Fit the existing rider/leader/fighter body; motion itself comes from its
* already-computed instance matrix, never a second animation approximation. */
function wornGarmentFit(type, target) {
	target.identity();
	if (type === "cavalry") {
		target.makeScale(1, .72, 1);
		target.setPosition(0, .68, 0);
	} else if (type === "leader") target.makeScale(1.65, 1, 1.65);
	else if (type === "swordsman") target.makeScale(1.25, 1, 1.25);
	return target;
}
var WornGarmentLayer = class {
	scene;
	batches = /* @__PURE__ */ new Map();
	picking = /* @__PURE__ */ new Map();
	fit = new Matrix4();
	matrix = new Matrix4();
	color = new Color();
	disposed = false;
	constructor(scene) {
		this.scene = scene;
		for (const kind of GARMENT_KINDS) {
			const geometry = wornGarmentGeometry(kind), material = new MeshStandardMaterial({
				color: 16777215,
				vertexColors: true,
				roughness: kind === "skinClothes" || kind === "hideCoat" ? WORN_GARMENT_RULES.skinRoughness : WORN_GARMENT_RULES.leatherRoughness,
				metalness: 0,
				side: 2
			}), mesh = new InstancedMesh(geometry, material, WORN_GARMENT_RULES.instancesPerKind), owners = [];
			mesh.name = `worn-${kind}`;
			mesh.count = 0;
			mesh.visible = false;
			mesh.frustumCulled = false;
			mesh.receiveShadow = true;
			mesh.castShadow = false;
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(WORN_GARMENT_RULES.instancesPerKind * 3), 3);
			mesh.instanceColor.setUsage(DynamicDrawUsage);
			scene.add(mesh);
			this.batches.set(kind, {
				mesh,
				owners,
				count: 0
			});
			this.picking.set(mesh, owners);
		}
	}
	beginFrame(quality, shadows = false) {
		for (const batch of this.batches.values()) {
			batch.count = 0;
			batch.owners.length = 0;
			batch.mesh.castShadow = shadows && quality !== "low";
		}
	}
	write(g, u, bodyMatrix) {
		const garment = u.garment;
		if (this.disposed || u.hp <= 0 || u.shelterId || !garment || !(garment.condition > WORN_GARMENT_RULES.minimumCondition) || u.team !== 0 && !g.visibleAt(u.x, u.z)) return false;
		const batch = this.batches.get(garment.item);
		if (!batch || batch.count >= WORN_GARMENT_RULES.instancesPerKind) return false;
		wornGarmentFit(u.type, this.fit);
		this.matrix.copy(bodyMatrix).multiply(this.fit);
		batch.mesh.setMatrixAt(batch.count, this.matrix);
		this.color.setScalar(WORN_GARMENT_RULES.wornBrightness + (1 - WORN_GARMENT_RULES.wornBrightness) * Math.min(1, garment.condition));
		batch.mesh.setColorAt(batch.count, this.color);
		batch.owners.push(u);
		batch.count++;
		return true;
	}
	endFrame() {
		for (const batch of this.batches.values()) {
			batch.mesh.count = batch.count;
			batch.mesh.visible = batch.count > 0;
			if (batch.count) {
				batch.mesh.instanceMatrix.needsUpdate = true;
				if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
			}
		}
	}
	sources() {
		return this.picking;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		for (const { mesh } of this.batches.values()) {
			this.scene.remove(mesh);
			mesh.dispose();
			mesh.geometry.dispose();
			mesh.material.dispose();
		}
		this.batches.clear();
		this.picking.clear();
	}
};
var WORN_ARMOR_RULES = Object.freeze({
	instances: 2048,
	maximumTriangles: 600,
	wornBrightness: .6
});
function paint(g, color) {
	const c = new Color(color), values = new Float32Array(g.attributes.position.count * 3);
	for (let i = 0; i < values.length; i += 3) {
		values[i] = c.r;
		values[i + 1] = c.g;
		values[i + 2] = c.b;
	}
	g.setAttribute("color", new BufferAttribute(values, 3));
	return g;
}
/** A sleeveless quilted torso outside the ordinary clothing layer; no face,
* tool or weapon geometry is added and no armor is inferred from military duty. */
function wornArmorGeometry() {
	const parts = [];
	function box(w, h, d, x, y, z, color, roll = 0) {
		const g = new BoxGeometry(w, h, d);
		g.rotateZ(roll);
		g.translate(x, y, z);
		parts.push(paint(g, color));
	}
	function shell(rt, rb, h, y, color) {
		const g = new CylinderGeometry(rt, rb, h, 12, 1, true);
		g.scale(1, 1, .84);
		g.translate(0, y, 0);
		parts.push(paint(g, color));
	}
	shell(.255, .28, .49, .585, "#a78b55");
	for (const side of [-1, 1]) {
		for (const x of [
			-.17,
			-.085,
			0,
			.085,
			.17
		]) box(.013, .4, .014, x, .58, side * .238, "#6f5b38");
		for (const y of [
			.4,
			.51,
			.62,
			.73
		]) box(.405, .026, .018, 0, y, side * .243, "#c0a66b");
		box(.07, .11, .24, side * .205, .79, 0, "#806944", side * .1);
	}
	shell(.282, .282, .043, .425, "#51462f");
	box(.075, .065, .025, 0, .425, .25, "#c2b080");
	const plain = parts.map((g) => {
		if (!g.index) return g;
		const n = g.toNonIndexed();
		g.dispose();
		return n;
	}), joined = mergeGeometries(plain);
	plain.forEach((g) => g.dispose());
	joined.computeBoundingBox();
	joined.computeBoundingSphere();
	return joined;
}
/** One bounded shared batch follows the same already-admitted body matrix as
* garments. Ownership remains the game asset's actual current physical holder. */
var WornArmorLayer = class {
	scene;
	mesh;
	stitch;
	ground;
	groundOwners = [];
	groundPicking = /* @__PURE__ */ new Map();
	groundCount = 0;
	frustum = new Frustum();
	viewProjection = new Matrix4();
	groundSphere = new Sphere(new Vector3(), .75);
	groundPosition = new Vector3();
	groundRotation = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0));
	groundScale = new Vector3(1.65, 1.65, .36);
	groundCenter = new Matrix4().makeTranslation(0, -.594, 0);
	owners = [];
	picking = /* @__PURE__ */ new Map();
	fit = new Matrix4();
	matrix = new Matrix4();
	color = new Color();
	count = 0;
	disposed = false;
	constructor(scene) {
		this.scene = scene;
		const material = new MeshStandardMaterial({
			vertexColors: true,
			color: 16777215,
			roughness: .96,
			metalness: 0,
			side: 2
		});
		this.mesh = new InstancedMesh(wornArmorGeometry(), material, WORN_ARMOR_RULES.instances);
		this.mesh.name = "worn-padded-armor";
		this.mesh.count = 0;
		this.mesh.visible = false;
		this.mesh.frustumCulled = false;
		this.mesh.castShadow = false;
		this.mesh.receiveShadow = true;
		this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
		this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(WORN_ARMOR_RULES.instances * 3), 3);
		this.mesh.instanceColor.setUsage(DynamicDrawUsage);
		this.picking.set(this.mesh, this.owners);
		scene.add(this.mesh);
		this.ground = new InstancedMesh(this.mesh.geometry, material, WORN_ARMOR_RULES.instances);
		this.ground.name = "ground-padded-armor";
		this.ground.count = 0;
		this.ground.visible = false;
		this.ground.frustumCulled = false;
		this.ground.receiveShadow = true;
		this.ground.castShadow = false;
		this.ground.instanceMatrix.setUsage(DynamicDrawUsage);
		this.ground.instanceColor = new InstancedBufferAttribute(new Float32Array(WORN_ARMOR_RULES.instances * 3), 3);
		this.ground.instanceColor.setUsage(DynamicDrawUsage);
		this.groundPicking.set(this.ground, this.groundOwners);
		scene.add(this.ground);
		const seam = new BoxGeometry(.24, .025, .012);
		seam.translate(0, .68, .274);
		this.stitch = new InstancedMesh(seam, new MeshBasicMaterial({ color: 16777215 }), WORN_ARMOR_RULES.instances);
		this.stitch.name = "armor-affiliation-stitch";
		this.stitch.count = 0;
		this.stitch.visible = false;
		this.stitch.frustumCulled = false;
		this.stitch.castShadow = false;
		this.stitch.instanceMatrix.setUsage(DynamicDrawUsage);
		this.stitch.instanceColor = new InstancedBufferAttribute(new Float32Array(WORN_ARMOR_RULES.instances * 3), 3);
		this.stitch.instanceColor.setUsage(DynamicDrawUsage);
		this.picking.set(this.stitch, this.owners);
		scene.add(this.stitch);
	}
	beginFrame(quality, shadows = false) {
		this.count = 0;
		this.owners.length = 0;
		this.mesh.castShadow = shadows && quality !== "low";
		this.groundCount = 0;
		this.groundOwners.length = 0;
		this.ground.castShadow = shadows && quality !== "low";
	}
	write(g, u, bodyMatrix) {
		if (this.disposed || u.hp <= 0 || u.shelterId || this.count >= WORN_ARMOR_RULES.instances || u.team !== 0 && !g.visibleAt(u.x, u.z)) return false;
		const armor = wornArmor(g, u);
		if (!armor || armor.kind !== "paddedTorso" || armor.team !== u.team || armor.holder.kind !== "unit" || armor.holder.id !== u.id) return false;
		wornGarmentFit(u.type, this.fit);
		this.matrix.copy(bodyMatrix).multiply(this.fit);
		this.mesh.setMatrixAt(this.count, this.matrix);
		this.color.setScalar(WORN_ARMOR_RULES.wornBrightness + (1 - WORN_ARMOR_RULES.wornBrightness) * Math.max(0, Math.min(1, armor.condition)));
		this.mesh.setColorAt(this.count, this.color);
		this.stitch.setMatrixAt(this.count, this.matrix);
		this.color.set(armorAffiliationColor(g, u.team)).multiplyScalar(.6 + .4 * Math.max(0, Math.min(1, armor.condition)));
		this.stitch.setColorAt(this.count, this.color);
		this.owners.push(u);
		this.count++;
		return true;
	}
	/** Dropped assets stay at their actual holder coordinates. This batch has
	* asset owners, deliberately separate from the unit-picking registry. */
	writeGround(g, camera) {
		if (this.disposed) return 0;
		if (camera) {
			camera.updateMatrixWorld();
			this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
			this.frustum.setFromProjectionMatrix(this.viewProjection);
		}
		for (const armor of g.state.armor?.assets || []) {
			if (this.groundCount >= WORN_ARMOR_RULES.instances) break;
			if (armor.kind !== "paddedTorso" || armor.holder.kind !== "ground") continue;
			const { x, z } = armor.holder;
			if (!g.visibleAt(x, z)) continue;
			this.groundPosition.set(x, g.height(x, z) + .1, z);
			this.groundSphere.center.copy(this.groundPosition);
			if (camera && !this.frustum.intersectsSphere(this.groundSphere)) continue;
			this.matrix.compose(this.groundPosition, this.groundRotation, this.groundScale).multiply(this.groundCenter);
			this.ground.setMatrixAt(this.groundCount, this.matrix);
			this.color.setScalar(WORN_ARMOR_RULES.wornBrightness + (1 - WORN_ARMOR_RULES.wornBrightness) * Math.max(0, Math.min(1, armor.condition)));
			this.ground.setColorAt(this.groundCount, this.color);
			this.groundOwners.push(armor);
			this.groundCount++;
		}
		return this.groundCount;
	}
	endFrame() {
		this.stitch.count = this.count;
		this.stitch.visible = this.count > 0;
		if (this.count) {
			this.stitch.instanceMatrix.needsUpdate = true;
			this.stitch.instanceColor.needsUpdate = true;
		}
		this.mesh.count = this.count;
		this.mesh.visible = this.count > 0;
		if (this.count) {
			this.mesh.instanceMatrix.needsUpdate = true;
			if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
		}
		this.ground.count = this.groundCount;
		this.ground.visible = this.groundCount > 0;
		if (this.groundCount) {
			this.ground.instanceMatrix.needsUpdate = true;
			if (this.ground.instanceColor) this.ground.instanceColor.needsUpdate = true;
		}
	}
	sources() {
		return this.picking;
	}
	groundSources() {
		return this.groundPicking;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.scene.remove(this.mesh, this.ground, this.stitch);
		this.stitch.dispose();
		this.stitch.geometry.dispose();
		this.stitch.material.dispose();
		this.mesh.dispose();
		this.ground.dispose();
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
		this.owners.length = 0;
		this.picking.clear();
		this.groundOwners.length = 0;
		this.groundPicking.clear();
	}
};
function unitFeedbackVisible(u, hovered, persistent) {
	return u.hp > 0 && !u.shelterId && (u.id === hovered || persistent && u.selected);
}
/** Cheap screen-space prefilter: detailed scene picking runs only near a visible body. */
function pointerNearPerson(cx, cy, units, project, visible) {
	for (const u of units) {
		if (u.hp <= 0 || u.shelterId || !visible(u)) continue;
		const feet = project(u.x, u.y, u.z), head = project(u.x, u.y + 2 * (u.stature || 1), u.z);
		if (feet.behind || head.behind) continue;
		const dx = head.x - feet.x, dy = head.y - feet.y, t = Math.max(0, Math.min(1, ((cx - feet.x) * dx + (cy - feet.y) * dy) / (dx * dx + dy * dy || 1))), radius = Math.max(7, Math.min(20, Math.hypot(dx, dy) * .3));
		if (Math.hypot(cx - feet.x - dx * t, cy - feet.y - dy * t) <= radius) return true;
	}
	return false;
}
/** Hidden/sheltered people never consume a finite body slot. Feedback targets
* retain priority without changing simulation order or revealing unknown people. */
function admitVisibleUnits(units, capacity, visible, hovered = null) {
	const hover = [], selected = [], others = [];
	for (const u of units) {
		if (u.hp <= 0 || u.shelterId || !visible(u)) continue;
		if (u.id === hovered) hover.push(u);
		else if (u.selected) selected.push(u);
		else others.push(u);
	}
	return [
		...hover,
		...selected,
		...others
	].slice(0, Math.max(0, Math.floor(capacity)));
}
/** Grow a shared draw only for actual admitted instances. Geometry/materials
* remain shared; disposing the replaced mesh releases only its instance buffers. */
function ensureInstanceCapacity(scene, old, needed) {
	if (needed <= old.instanceMatrix.count) return old;
	if (!Number.isSafeInteger(needed) || needed < 0) throw new Error("Invalid actual instance count");
	const next = 2 ** Math.ceil(Math.log2(Math.max(1, needed)));
	const mesh = new InstancedMesh(old.geometry, old.material, next);
	mesh.name = old.name;
	mesh.visible = old.visible;
	mesh.castShadow = old.castShadow;
	mesh.receiveShadow = old.receiveShadow;
	mesh.frustumCulled = old.frustumCulled;
	mesh.renderOrder = old.renderOrder;
	mesh.layers.mask = old.layers.mask;
	mesh.position.copy(old.position);
	mesh.quaternion.copy(old.quaternion);
	mesh.scale.copy(old.scale);
	mesh.matrix.copy(old.matrix);
	mesh.matrixWorld.copy(old.matrixWorld);
	mesh.matrixAutoUpdate = old.matrixAutoUpdate;
	mesh.matrixWorldAutoUpdate = old.matrixWorldAutoUpdate;
	mesh.customDepthMaterial = old.customDepthMaterial;
	mesh.customDistanceMaterial = old.customDistanceMaterial;
	mesh.raycast = old.raycast;
	mesh.userData = { ...old.userData };
	mesh.instanceMatrix.setUsage(old.instanceMatrix.usage);
	mesh.instanceMatrix.array.set(old.instanceMatrix.array);
	mesh.instanceMatrix.needsUpdate = true;
	if (old.instanceColor) {
		mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(next * old.instanceColor.itemSize), old.instanceColor.itemSize, old.instanceColor.normalized);
		mesh.instanceColor.setUsage(old.instanceColor.usage);
		mesh.instanceColor.array.set(old.instanceColor.array);
		mesh.instanceColor.needsUpdate = true;
	}
	mesh.count = old.count;
	const parent = old.parent || scene;
	parent.remove(old);
	parent.add(mesh);
	old.dispose();
	return mesh;
}
/** Replaces coarse tiles with a single bounded refined mesh, including shadows. */
var ExcavationLayer = class {
	mesh;
	original;
	revision = -1;
	terrain;
	fields;
	decorate;
	constructor(terrain, fields, decorate) {
		this.terrain = terrain;
		this.fields = fields;
		this.decorate = decorate;
		this.original = Uint32Array.from(terrain.geometry.index.array);
		this.mesh = new Mesh(new BufferGeometry(), terrain.material);
		this.mesh.name = "terrain-excavation";
		this.mesh.castShadow = true;
		this.mesh.receiveShadow = true;
		this.mesh.visible = false;
	}
	sync(g) {
		const data = excavationTerrain(g);
		if (this.revision === data.revision) return;
		this.revision = data.revision;
		this.fields.excavations.update(data);
		const source = this.terrain.geometry, basePos = source.getAttribute("position"), baseColors = source.getAttribute("color");
		const positions = [], colors = [], rock = [], sand = [], exposure = [], normals = [], indices = [], n = EXCAVATION_RULES.subdivisions;
		const raw = (x, z) => sampleWorldHeight(g.world, x, z), height = (x, z) => excavationHeightAt(g, x, z, raw(x, z)), earth = new Color("#99846a"), normal = new Vector3();
		for (const tile of data.tiles.values()) {
			const offset = positions.length / 3;
			for (let iz = 0; iz <= n; iz++) for (let ix = 0; ix <= n; ix++) {
				const x = (tile.x + ix / n) * data.tileSize - g.world.size / 2, z = (tile.z + iz / n) * data.tileSize - g.world.size / 2, y = tile.heights[iz * (n + 1) + ix], removed = Math.max(0, raw(x, z) - y);
				positions.push(x, y, z);
				normal.set(height(x - .25, z) - height(x + .25, z), .5, height(x, z - .25) - height(x, z + .25)).normalize();
				normals.push(normal.x, normal.y, normal.z);
				const gx = Math.max(0, Math.min(g.world.segs, Math.round((x / g.world.size + .5) * g.world.segs))), id = Math.max(0, Math.min(g.world.segs, Math.round((z / g.world.size + .5) * g.world.segs))) * (g.world.segs + 1) + gx, mix = Math.min(.9, removed * 1.5);
				colors.push(baseColors.getX(id) * (1 - mix) + earth.r * mix, baseColors.getY(id) * (1 - mix) + earth.g * mix, baseColors.getZ(id) * (1 - mix) + earth.b * mix);
				rock.push(Math.min(.75, removed * .3));
				sand.push(0);
				exposure.push(Math.min(1, removed * 2));
			}
			for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
				const a = offset + iz * (n + 1) + ix, b = a + 1, c = a + n + 1, d = c + 1;
				indices.push(a, c, b, b, c, d);
			}
		}
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
		if (g.world.bankTerrain) geometry.setAttribute("surfaceBank", new Float32BufferAttribute(new Float32Array(positions.length / 3), 1));
		geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
		geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
		geometry.setAttribute("surfaceRock", new Float32BufferAttribute(rock, 1));
		geometry.setAttribute("surfaceSand", new Float32BufferAttribute(sand, 1));
		geometry.setIndex(indices);
		this.decorate?.(geometry);
		const cover = geometry.getAttribute("biomeCover"), tint = geometry.getAttribute("biomeTint"), surface = geometry.getAttribute("biomeMaterial");
		if (cover && tint && surface) for (let i = 0; i < exposure.length; i++) {
			const q = exposure[i];
			cover.setXYZW(i, cover.getX(i) * (1 - q), cover.getY(i) * (1 - q), cover.getZ(i) * (1 - q) + .65 * q, cover.getW(i));
			tint.setXYZ(i, tint.getX(i) * (1 - q) + earth.r * q, tint.getY(i) * (1 - q) + earth.g * q, tint.getZ(i) * (1 - q) + earth.b * q);
			surface.setXYZW(i, surface.getX(i) * (1 - q) + .97 * q, surface.getY(i) * (1 - q) + .045 * q, surface.getZ(i) * (1 - q) + 3 * q, 1);
		}
		geometry.computeBoundingSphere();
		this.mesh.geometry.dispose();
		this.mesh.geometry = geometry;
		this.mesh.visible = data.tiles.size > 0;
		const kept = [];
		for (let i = 0; i < this.original.length; i += 3) {
			const a = this.original[i], b = this.original[i + 1], c = this.original[i + 2], x = (basePos.getX(a) + basePos.getX(b) + basePos.getX(c)) / 3, z = (basePos.getZ(a) + basePos.getZ(b) + basePos.getZ(c)) / 3, key = Math.floor((z + g.world.size / 2) / data.tileSize) * data.width + Math.floor((x + g.world.size / 2) / data.tileSize);
			if (!data.tiles.has(key)) kept.push(a, b, c);
		}
		source.setIndex(kept);
	}
	dispose() {
		this.mesh.geometry.dispose();
	}
};
function foliage(species) {
	if (species === "wild-grain") return new ConeGeometry(.32, 1.7, 5).translate(0, .85, 0);
	return new IcosahedronGeometry(species.includes("berries") ? .8 : .6, species.includes("berries") ? 1 : 0).scale(1, species.includes("berries") ? .7 : species === "wild-pulses" ? .6 : .3, 1).translate(0, species.includes("berries") ? .55 : species === "wild-pulses" ? .35 : .18, 0);
}
function produce(species) {
	if (species === "wild-grain") return new ConeGeometry(.13, .45, 5);
	if (species === "wild-pulses") return new CapsuleGeometry(.1, .3, 2, 5);
	if (species === "wild-tubers") return new SphereGeometry(.24, 5, 4).scale(1, .5, .7);
	if (species === "spring-greens") return new IcosahedronGeometry(.32, 0).scale(1, .4, 1);
	return new IcosahedronGeometry(.24, 0);
}
/** Bounded instances represent the actual saved resource patches. Leaves can
* remain when a patch is dormant or harvested; visible produce follows the same
* mature-food quantity consumed by the collection executor. */
var WildPlantLayer = class {
	group = new Group();
	meshes = /* @__PURE__ */ new Map();
	at = -1;
	revision = -1;
	scene;
	ids = /* @__PURE__ */ new Map();
	constructor(scene, g) {
		this.scene = scene;
		const capacity = Math.max(1, g.state.forage.length + 32);
		this.group.name = "seasonal-wild-plants";
		for (const species of WILD_PLANT_SPECIES) {
			const leaf = new InstancedMesh(foliage(species), new MeshStandardMaterial({
				color: 16777215,
				roughness: 1,
				flatShading: true
			}), capacity), food = new InstancedMesh(produce(species), new MeshStandardMaterial({
				color: 16777215,
				roughness: .85,
				flatShading: true
			}), capacity);
			leaf.name = `wild-plant-${species}`;
			food.name = `ripe-produce-${species}`;
			leaf.count = food.count = 0;
			leaf.frustumCulled = food.frustumCulled = false;
			leaf.castShadow = true;
			leaf.receiveShadow = true;
			food.raycast = () => {};
			this.meshes.set(species, {
				leaf,
				food
			});
			this.group.add(leaf, food);
		}
		scene.add(this.group);
		this.sync(g);
	}
	sync(g) {
		const at = Math.floor(g.state.time * 2), revision = g.navigationRevision();
		if (at === this.at && revision === this.revision) return;
		this.at = at;
		this.revision = revision;
		this.ids.clear();
		const counts = new Map(WILD_PLANT_SPECIES.map((s) => [s, {
			leaf: 0,
			food: 0
		}])), matrix = new Matrix4(), q = new Quaternion(), p = new Vector3(), scale = new Vector3(), color = new Color();
		if (wildPlantsEnabled(g)) for (const n of g.state.forage) {
			if (!g.exploredAt(n.x, n.z)) continue;
			const v = wildPlantVisual(g, n), pair = this.meshes.get(v.species), count = counts.get(v.species);
			if (count.leaf >= pair.leaf.instanceMatrix.count) continue;
			p.set(n.x, g.height(n.x, n.z), n.z);
			q.setFromAxisAngle(Object3D.DEFAULT_UP, n.id * .61803398875 % (Math.PI * 2));
			scale.setScalar(n.scale * v.leafScale);
			matrix.compose(p, q, scale);
			pair.leaf.setMatrixAt(count.leaf, matrix);
			pair.leaf.setColorAt(count.leaf++, color.set(v.leafColor));
			const ids = this.ids.get(v.species) ?? [];
			ids.push(n.id);
			this.ids.set(v.species, ids);
			if (v.fruitScale > 0 && count.food < pair.food.instanceMatrix.count) {
				const height = v.species === "wild-grain" ? 1.65 : v.species === "wild-pulses" ? .55 : v.species === "wild-tubers" ? .08 : v.species === "spring-greens" ? .34 : .9;
				p.y += height * n.scale * v.leafScale;
				scale.setScalar(n.scale * v.fruitScale);
				matrix.compose(p, q, scale);
				pair.food.setMatrixAt(count.food, matrix);
				pair.food.setColorAt(count.food++, color.set(v.ripeColor));
			}
		}
		for (const [species, pair] of this.meshes) {
			const count = counts.get(species);
			for (const key of ["leaf", "food"]) {
				const mesh = pair[key];
				mesh.count = count[key];
				mesh.instanceMatrix.needsUpdate = true;
				if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
			}
		}
	}
	pickingSources() {
		return [...this.ids].map(([species, resourceIds]) => ({
			mesh: this.meshes.get(species).leaf,
			resourceIds
		}));
	}
	dispose() {
		this.scene.remove(this.group);
		for (const pair of this.meshes.values()) for (const mesh of [pair.leaf, pair.food]) {
			mesh.geometry.dispose();
			mesh.material.dispose();
		}
		this.meshes.clear();
	}
};
var TREE_FORMS = [
	"broadleaf",
	"conifer",
	"willow",
	"acacia",
	"palm",
	"stunted",
	"scrub"
];
function merge$4(parts) {
	const list = parts.map((g) => {
		if (!g.index) return g;
		const flat = g.toNonIndexed();
		g.dispose();
		return flat;
	});
	const result = mergeGeometries(list, false);
	for (const part of list) part.dispose();
	if (!result) throw new Error("Vegetation kit attributes are incompatible");
	result.computeBoundingBox();
	result.computeBoundingSphere();
	return result;
}
function branch(a, b, radius) {
	const from = new Vector3(...a), to = new Vector3(...b), delta = to.clone().sub(from);
	const g = new CylinderGeometry(radius * .62, radius, delta.length(), 6, 1);
	g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()));
	g.translate(...from.add(to).multiplyScalar(.5).toArray());
	const positions = g.attributes.position;
	for (let i = 0; i < positions.count; i++) if (positions.getY(i) < 0) positions.setY(i, 0);
	g.computeVertexNormals();
	return g;
}
function crown(x, y, z, rx, ry, rz) {
	const g = new IcosahedronGeometry(1, 1);
	g.scale(rx, ry, rz);
	g.translate(x, y, z);
	return g;
}
function needle(x, y, z, radius, height) {
	const g = new ConeGeometry(radius, height, 8, 1);
	g.translate(x, y + height * .5, z);
	return g;
}
function tintCrown(g) {
	const pos = g.attributes.position, colors = new Float32Array(pos.count * 3);
	g.computeBoundingBox();
	const box = g.boundingBox, height = box.max.y - box.min.y;
	for (let i = 0; i < pos.count; i++) {
		const light = .73 + .23 * (pos.getY(i) - box.min.y) / Math.max(.1, height);
		colors.set([
			light,
			light,
			light
		], i * 3);
	}
	g.setAttribute("color", new BufferAttribute(colors, 3));
	return g;
}
function treeKit(form) {
	let trunk, leaf;
	switch (form) {
		case "broadleaf":
			trunk = [
				branch([
					0,
					0,
					0
				], [
					.12,
					4.8,
					0
				], .24),
				branch([
					.05,
					2.3,
					0
				], [
					-1.4,
					4.6,
					.3
				], .13),
				branch([
					.08,
					2.9,
					0
				], [
					1.3,
					5,
					-.5
				], .12),
				branch([
					0,
					3.3,
					0
				], [
					.1,
					5.3,
					1.15
				], .1)
			];
			leaf = [
				crown(-1.2, 4.8, .2, 1.6, 1.4, 1.4),
				crown(1, 5, -.5, 1.7, 1.45, 1.35),
				crown(.2, 5.5, .6, 1.6, 1.2, 1.5)
			];
			break;
		case "conifer":
			trunk = [
				branch([
					0,
					0,
					0
				], [
					0,
					6.8,
					0
				], .19),
				branch([
					0,
					1.9,
					0
				], [
					1.15,
					2.3,
					.3
				], .07),
				branch([
					0,
					2.8,
					0
				], [
					-1.1,
					3.1,
					-.3
				], .065)
			];
			leaf = [
				needle(0, 1.4, 0, 1.75, 3.4),
				needle(.05, 3.1, 0, 1.45, 2.9),
				needle(0, 4.7, 0, 1, 2.9)
			];
			break;
		case "willow":
			trunk = [
				branch([
					0,
					0,
					0
				], [
					-.2,
					3.2,
					0
				], .28),
				branch([
					-.1,
					2,
					0
				], [
					-1.5,
					4.7,
					.4
				], .14),
				branch([
					-.1,
					2.5,
					0
				], [
					1.6,
					4.5,
					.1
				], .14),
				branch([
					0,
					2.4,
					0
				], [
					0,
					4.8,
					-1.2
				], .12)
			];
			leaf = [crown(0, 4.5, 0, 2.4, 1.3, 1.9)];
			for (let i = 0; i < 6; i++) {
				const a = i * Math.PI / 3;
				leaf.push(crown(Math.cos(a) * 1.8, 3.1, Math.sin(a) * 1.5, .55, 1.9, .55));
			}
			break;
		case "acacia":
			trunk = [
				branch([
					0,
					0,
					0
				], [
					.45,
					3.5,
					.15
				], .22),
				branch([
					.25,
					2.1,
					0
				], [
					-1.5,
					4.5,
					.2
				], .13),
				branch([
					.35,
					2.9,
					.1
				], [
					2,
					4.7,
					-.3
				], .12)
			];
			leaf = [
				crown(-1.4, 4.7, .15, 1.9, .7, 1.5),
				crown(1.5, 4.9, -.1, 2, .7, 1.55),
				crown(.15, 5.1, 0, 1.7, .55, 1.6)
			];
			break;
		case "palm":
			trunk = [branch([
				0,
				0,
				0
			], [
				.2,
				3.3,
				0
			], .21), branch([
				.2,
				3.3,
				0
			], [
				.8,
				6.2,
				.2
			], .18)];
			leaf = [];
			for (let i = 0; i < 7; i++) {
				const a = i * Math.PI * 2 / 7, dx = Math.cos(a), dz = Math.sin(a), g = new BufferGeometry();
				g.setAttribute("position", new Float32BufferAttribute([
					.8,
					6.25,
					.2,
					.8 + dx * 1.2 - dz * .3,
					6.75,
					.2 + dz * 1.2 + dx * .3,
					.8 + dx * 3,
					5.65,
					.2 + dz * 3,
					.8 + dx * 1.2 + dz * .3,
					6.75,
					.2 + dz * 1.2 - dx * .3
				], 3));
				g.setAttribute("uv", new Float32BufferAttribute([
					.5,
					0,
					0,
					.4,
					.5,
					1,
					1,
					.4
				], 2));
				g.setIndex([
					0,
					1,
					2,
					0,
					2,
					3
				]);
				g.computeVertexNormals();
				leaf.push(g);
			}
			break;
		case "stunted":
			trunk = [
				branch([
					0,
					0,
					0
				], [
					.6,
					2.5,
					0
				], .2),
				branch([
					.15,
					.9,
					0
				], [
					1.2,
					2.1,
					.3
				], .12),
				branch([
					.3,
					1.4,
					0
				], [
					-.8,
					2.2,
					-.2
				], .09)
			];
			leaf = [
				needle(.4, 1.5, 0, .9, 2.1),
				needle(1, 1.35, .2, .75, 1.35),
				needle(-.55, 1.5, -.1, .8, 1.2)
			];
			break;
		case "scrub":
			trunk = [
				branch([
					0,
					0,
					0
				], [
					-.5,
					1.8,
					.2
				], .11),
				branch([
					0,
					0,
					0
				], [
					.65,
					1.7,
					-.2
				], .1),
				branch([
					0,
					.4,
					0
				], [
					0,
					2.25,
					.3
				], .09)
			];
			leaf = [
				crown(-.5, 1.8, .2, .9, .7, .8),
				crown(.6, 1.7, -.1, .9, .7, .7),
				crown(0, 2.2, .3, .8, .6, .7)
			];
	}
	return {
		trunk: merge$4(trunk),
		canopy: tintCrown(merge$4(leaf))
	};
}
function dressingKit(form) {
	const parts = [];
	if (form === "grass" || form === "flowers") for (let i = 0; i < 5; i++) {
		const a = i * 2.399, g = new BufferGeometry(), x = Math.cos(a) * .17, z = Math.sin(a) * .17, h = .23 + i % 3 * .13;
		g.setAttribute("position", new Float32BufferAttribute([
			x - .025,
			0,
			z,
			x + .025,
			0,
			z,
			x + Math.cos(a) * .1,
			h,
			z + Math.sin(a) * .1
		], 3));
		g.setAttribute("uv", new Float32BufferAttribute([
			0,
			0,
			1,
			0,
			.5,
			1
		], 2));
		g.computeVertexNormals();
		parts.push(g);
		if (form === "flowers" && i % 2 === 0) {
			const flower = new IcosahedronGeometry(.065, 0);
			flower.scale(1, .45, 1);
			flower.translate(x, h, z);
			parts.push(flower);
		}
	}
	else if (form === "reeds") for (let i = 0; i < 5; i++) {
		const x = Math.cos(i * 2.1) * .3, z = Math.sin(i * 2.1) * .3, h = 1 + i % 3 * .26;
		parts.push(branch([
			x,
			0,
			z
		], [
			x + .1,
			h,
			z
		], .023));
		const top = new CylinderGeometry(.05, .05, .24, 5);
		top.translate(x + .1, h - .07, z);
		parts.push(top);
	}
	else if (form === "scrub") parts.push(branch([
		0,
		0,
		0
	], [
		-.2,
		.5,
		0
	], .035), branch([
		0,
		0,
		0
	], [
		.25,
		.4,
		.1
	], .035), crown(-.18, .45, 0, .25, .16, .2), crown(.2, .4, .1, .24, .15, .2));
	else for (let i = 0; i < 3; i++) {
		const g = new DodecahedronGeometry(.18 + i * .04, 0);
		g.scale(1.2, .65, 1);
		g.translate((i - 1) * .25, .13 + i * .025, Math.sin(i) * .15);
		parts.push(g);
	}
	return merge$4(parts);
}
var BIOME_VEGETATION_RULES = {
	version: 1,
	nearMetres: {
		low: 28,
		med: 75,
		high: 115
	},
	farMetres: 700,
	lowFarMetres: 420,
	stumpHeightScale: .075,
	dressingMaxInstances: {
		low: 0,
		med: 512,
		high: 1024
	},
	dressingDistanceMetres: 65
};
var defaults = {
	meadow: { broadleaf: 1 },
	"mixed-woodland": {
		broadleaf: .8,
		conifer: .2
	},
	"conifer-forest": { conifer: 1 },
	alpine: { stunted: 1 },
	wetland: {
		willow: .85,
		broadleaf: .15
	},
	"dry-scrub": {
		scrub: .7,
		acacia: .3
	},
	arid: {
		scrub: .6,
		acacia: .4
	},
	"warm-coast": {
		palm: .6,
		acacia: .4
	}
};
function stableUnit(id, seed) {
	let n = id ^ seed ^ 79459241 | 0;
	n = Math.imul(n ^ n >>> 16, 73244475);
	n = Math.imul(n ^ n >>> 16, 73244475);
	return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
function resourceTreeForm(id, profile, seed) {
	const weights = profile.treeForms ?? defaults[profile.kind], total = TREE_FORMS.reduce((sum, key) => sum + Math.max(0, weights[key] ?? 0), 0);
	let value = stableUnit(id, seed) * total;
	for (const form of TREE_FORMS) {
		value -= Math.max(0, weights[form] ?? 0);
		if (value < 0) return form;
	}
	return Object.keys(defaults[profile.kind])[0];
}
var leafColors = {
	broadleaf: "#668947",
	conifer: "#375f49",
	willow: "#718b4c",
	acacia: "#738052",
	palm: "#577747",
	stunted: "#536d61",
	scrub: "#838065"
};
/** Renderer adapter only. Every tree instance comes from an existing resource
* ID, position and amount; no extra wood or collision is created by this kit. */
var BiomeVegetation = class {
	scene;
	seed;
	profileAt;
	batches = /* @__PURE__ */ new Map();
	far;
	farIds = [[], []];
	farTrunk;
	farTrunkIds = [];
	cache = /* @__PURE__ */ new Map();
	matrix = new Matrix4();
	pos = new Vector3();
	scale = new Vector3();
	rotation = new Quaternion();
	euler = new Euler();
	color = new Color();
	autumnColors = {
		broadleaf: new Color("#a77942"),
		willow: new Color("#a39b53")
	};
	snowColor = new Color("#d4e0dd");
	bark = new MeshStandardMaterial({
		color: "#655444",
		roughness: .96
	});
	leaves = new MeshStandardMaterial({
		color: 16777215,
		roughness: .88,
		vertexColors: true,
		side: 2
	});
	farMaterial = new MeshStandardMaterial({
		color: 16777215,
		roughness: .95
	});
	constructor(scene, seed, profileAt, capacity = 1) {
		this.scene = scene;
		this.seed = seed;
		this.profileAt = profileAt;
		for (const form of TREE_FORMS) {
			const kit = treeKit(form), trunk = new InstancedMesh(kit.trunk, this.bark, Math.max(1, capacity)), canopy = new InstancedMesh(kit.canopy, this.leaves, Math.max(1, capacity));
			trunk.name = `resource-${form}-trunk`;
			canopy.name = `resource-${form}-canopy`;
			trunk.count = canopy.count = 0;
			trunk.frustumCulled = canopy.frustumCulled = false;
			trunk.receiveShadow = canopy.receiveShadow = true;
			scene.add(trunk, canopy);
			this.batches.set(form, {
				trunk,
				canopy,
				capacity: Math.max(1, capacity),
				crownCenter: kit.canopy.boundingBox.getCenter(new Vector3()),
				crownHalf: kit.canopy.boundingBox.getSize(new Vector3()).multiplyScalar(.5),
				ids: {
					trunk: [],
					canopy: []
				}
			});
		}
		this.farTrunk = new InstancedMesh(new CylinderGeometry(1, 1, 1, 5).translate(0, .5, 0), this.bark, Math.max(1, capacity));
		this.farTrunk.name = "resource-far-rooted-trunk";
		this.farTrunk.count = 0;
		this.farTrunk.frustumCulled = false;
		scene.add(this.farTrunk);
		const round = new IcosahedronGeometry(1, 0), needle = new ConeGeometry(1, 2, 6);
		this.far = [round, needle].map((geo, i) => {
			const mesh = new InstancedMesh(geo, this.farMaterial, Math.max(1, capacity));
			mesh.name = i ? "resource-far-needle" : "resource-far-crown";
			mesh.count = 0;
			mesh.frustumCulled = false;
			scene.add(mesh);
			return mesh;
		});
	}
	grow(form, needed) {
		const b = this.batches.get(form);
		if (needed <= b.capacity) return;
		const capacity = Math.max(needed, b.capacity * 2);
		for (const part of ["trunk", "canopy"]) {
			const old = b[part], mesh = new InstancedMesh(old.geometry, old.material, capacity);
			mesh.name = old.name;
			mesh.frustumCulled = false;
			mesh.receiveShadow = true;
			mesh.instanceMatrix.array.set(old.instanceMatrix.array);
			if (old.instanceColor) {
				mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
				mesh.instanceColor.array.set(old.instanceColor.array);
			}
			this.scene.remove(old);
			old.dispose();
			this.scene.add(mesh);
			b[part] = mesh;
		}
		b.capacity = capacity;
	}
	growFar(index, needed) {
		const old = this.far[index];
		if (needed <= old.instanceMatrix.count) return;
		const mesh = new InstancedMesh(old.geometry, old.material, Math.max(needed, old.instanceMatrix.count * 2));
		mesh.name = old.name;
		mesh.frustumCulled = false;
		mesh.instanceMatrix.array.set(old.instanceMatrix.array);
		if (old.instanceColor) {
			mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count * 3), 3);
			mesh.instanceColor.array.set(old.instanceColor.array);
		}
		this.scene.remove(old);
		old.dispose();
		this.scene.add(mesh);
		this.far[index] = mesh;
	}
	resourceId(form, part, index) {
		return this.batches.get(form)?.ids[part][index];
	}
	farResourceId(style, index) {
		return this.farIds[style][index];
	}
	pickingSources() {
		const sources = [];
		for (const b of this.batches.values()) for (const part of ["trunk", "canopy"]) sources.push({
			mesh: b[part],
			resourceIds: b.ids[part]
		});
		sources.push({
			mesh: this.farTrunk,
			resourceIds: this.farTrunkIds
		});
		for (let i = 0; i < 2; i++) sources.push({
			mesh: this.far[i],
			resourceIds: this.farIds[i]
		});
		return sources;
	}
	sync(nodes, context) {
		const counts = /* @__PURE__ */ new Map();
		for (const form of TREE_FORMS) {
			counts.set(form, {
				trunk: 0,
				canopy: 0
			});
			const b = this.batches.get(form);
			b.ids.trunk.length = b.ids.canopy.length = 0;
		}
		let farTrunks = 0;
		this.farTrunkIds.length = 0;
		const farCounts = [0, 0];
		this.farIds[0].length = this.farIds[1].length = 0;
		const near = BIOME_VEGETATION_RULES.nearMetres[context.quality];
		for (const node of nodes) {
			if (!context.known(node.x, node.z)) continue;
			const distance = Math.hypot(node.x - context.camera.x, node.z - context.camera.z);
			if (distance > (context.quality === "low" ? BIOME_VEGETATION_RULES.lowFarMetres : BIOME_VEGETATION_RULES.farMetres)) continue;
			let form = this.cache.get(node.id);
			if (!form) {
				form = resourceTreeForm(node.id, this.profileAt(node.x, node.z), this.seed);
				this.cache.set(node.id, form);
			}
			const stump = node.amount <= 0 && !node.planted, growth = node.planted ? .18 + .6 * Math.max(0, 1 - node.regenT / 120) : 1, s = node.scale * growth;
			const deciduous = form === "broadleaf" || form === "willow", bare = deciduous && context.winter > .8 && context.snow < .4;
			this.color.set(leafColors[form]);
			if (deciduous && context.autumn > .1) this.color.lerp(this.autumnColors[form], Math.min(.8, context.autumn));
			if (context.snow > .2) this.color.lerp(this.snowColor, context.snow * .8);
			this.color.multiplyScalar(.9 + stableUnit(node.id + 17, this.seed) * .16);
			if (context.marked?.(node.id)) this.color.set("#c58e43");
			this.euler.set(0, stableUnit(node.id, this.seed) * Math.PI * 2, 0);
			this.rotation.setFromEuler(this.euler);
			if (distance <= near) {
				const count = counts.get(form);
				this.grow(form, Math.max(count.trunk, count.canopy) + 1);
				const b = this.batches.get(form);
				this.pos.set(node.x, node.y, node.z);
				this.scale.set(s * (stump ? .65 : 1), s * (stump ? BIOME_VEGETATION_RULES.stumpHeightScale : 1), s * (stump ? .65 : 1));
				this.matrix.compose(this.pos, this.rotation, this.scale);
				b.trunk.setMatrixAt(count.trunk++, this.matrix);
				b.ids.trunk.push(node.id);
				if (!stump && !bare) {
					this.scale.setScalar(s);
					this.matrix.compose(this.pos, this.rotation, this.scale);
					b.canopy.setMatrixAt(count.canopy, this.matrix);
					b.canopy.setColorAt(count.canopy++, this.color);
					b.ids.canopy.push(node.id);
				}
			} else if (!stump) {
				if (farTrunks >= this.farTrunk.instanceMatrix.count) {
					const old = this.farTrunk, mesh = new InstancedMesh(old.geometry, old.material, old.instanceMatrix.count * 2);
					mesh.name = old.name;
					mesh.frustumCulled = false;
					mesh.instanceMatrix.array.set(old.instanceMatrix.array);
					this.scene.remove(old);
					old.dispose();
					this.scene.add(mesh);
					this.farTrunk = mesh;
				}
				const bounds = this.batches.get(form);
				this.pos.set(node.x, node.y, node.z);
				this.scale.set(.14 * s, Math.max(.6, bounds.crownCenter.y) * s, .14 * s);
				this.matrix.compose(this.pos, this.rotation, this.scale);
				this.farTrunk.setMatrixAt(farTrunks++, this.matrix);
				this.farTrunkIds.push(node.id);
				if (bare) continue;
				const style = form === "conifer" || form === "stunted" ? 1 : 0, i = farCounts[style]++;
				this.growFar(style, i + 1);
				const mesh = this.far[style];
				this.pos.copy(bounds.crownCenter).applyQuaternion(this.rotation).multiplyScalar(s);
				this.pos.x += node.x;
				this.pos.y += node.y;
				this.pos.z += node.z;
				this.scale.copy(bounds.crownHalf).multiplyScalar(s);
				this.matrix.compose(this.pos, this.rotation, this.scale);
				mesh.setMatrixAt(i, this.matrix);
				mesh.setColorAt(i, this.color);
				this.farIds[style].push(node.id);
			}
		}
		for (const form of TREE_FORMS) {
			const b = this.batches.get(form), count = counts.get(form);
			for (const part of ["trunk", "canopy"]) {
				const mesh = b[part];
				mesh.count = count[part];
				mesh.castShadow = context.quality !== "low";
				mesh.instanceMatrix.needsUpdate = true;
				if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
			}
		}
		this.farTrunk.count = farTrunks;
		this.farTrunk.instanceMatrix.needsUpdate = true;
		for (let i = 0; i < 2; i++) {
			const mesh = this.far[i];
			mesh.count = farCounts[i];
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		}
		return {
			nearTrees: [...counts.values()].reduce((n, c) => n + c.trunk, 0),
			nearCanopies: [...counts.values()].reduce((n, c) => n + c.canopy, 0),
			farCanopies: farCounts[0] + farCounts[1],
			resourceCount: nodes.length
		};
	}
	dispose() {
		for (const batch of this.batches.values()) for (const part of ["trunk", "canopy"]) {
			const mesh = batch[part];
			this.scene.remove(mesh);
			mesh.geometry.dispose();
			mesh.dispose();
		}
		for (const mesh of this.far) {
			this.scene.remove(mesh);
			mesh.geometry.dispose();
			mesh.dispose();
		}
		this.scene.remove(this.farTrunk);
		this.farTrunk.geometry.dispose();
		this.farTrunk.dispose();
		this.bark.dispose();
		this.leaves.dispose();
		this.farMaterial.dispose();
		this.cache.clear();
	}
};
/** Tiny nonblocking dressing: no ResourceNode, navigation obstacle, free product
* or clickable harvest target. Caller supplies actual dry-ground eligibility. */
var BiomeDressing = class {
	scene;
	batches = /* @__PURE__ */ new Map();
	matrix = new Matrix4();
	pos = new Vector3();
	scale = new Vector3();
	rotation = new Quaternion();
	constructor(scene) {
		this.scene = scene;
		const colors = {
			grass: "#7e8c58",
			flowers: "#c9b989",
			reeds: "#8d8a53",
			scrub: "#858367",
			pebbles: "#89877a"
		};
		for (const kind of [
			"grass",
			"flowers",
			"reeds",
			"scrub",
			"pebbles"
		]) {
			const mesh = new InstancedMesh(dressingKit(kind), new MeshStandardMaterial({
				color: colors[kind],
				roughness: 1,
				side: 2
			}), BIOME_VEGETATION_RULES.dressingMaxInstances.high);
			mesh.name = `nonblocking-${kind}`;
			mesh.count = 0;
			mesh.frustumCulled = false;
			mesh.receiveShadow = true;
			mesh.raycast = () => {};
			scene.add(mesh);
			this.batches.set(kind, mesh);
		}
	}
	sync(points, context, isDry) {
		const cap = BIOME_VEGETATION_RULES.dressingMaxInstances[context.quality], counts = /* @__PURE__ */ new Map();
		let total = 0;
		for (const point of points) {
			if (total >= cap) break;
			if (!context.known(point.x, point.z) || !isDry(point.x, point.z) || Math.hypot(point.x - context.camera.x, point.z - context.camera.z) > BIOME_VEGETATION_RULES.dressingDistanceMetres) continue;
			const mesh = this.batches.get(point.kind);
			const index = counts.get(point.kind) ?? 0;
			this.pos.set(point.x, point.y, point.z);
			this.scale.setScalar(Math.max(.1, Math.min(1.3, point.scale ?? 1)));
			this.matrix.compose(this.pos, this.rotation, this.scale);
			mesh.setMatrixAt(index, this.matrix);
			counts.set(point.kind, index + 1);
			total++;
		}
		for (const [kind, mesh] of this.batches) {
			mesh.count = counts.get(kind) ?? 0;
			mesh.instanceMatrix.needsUpdate = true;
		}
		return total;
	}
	dispose() {
		for (const mesh of this.batches.values()) {
			this.scene.remove(mesh);
			mesh.geometry.dispose();
			mesh.material.dispose();
			mesh.dispose();
		}
		this.batches.clear();
	}
};
var BIOME_SCENE_RULES = {
	treeRefreshSeconds: .1,
	dressingRefreshSeconds: .5,
	dressingCellMetres: 6,
	dressingRadiusMetres: 65,
	dressingMaxCandidates: 1024,
	dryClearanceMetres: .3,
	maximumDressingGrade: .65,
	bankSearchMetres: 11,
	buildingMarginMetres: .7
};
/** All coefficients affect an actual surface channel, not an independent flat
* biome paint layer. The active terrain shader is intentionally untouched here. */
var BIOME_SURFACE_PROFILES = {
	meadow: {
		organic: .9,
		litter: .08,
		grit: .08,
		damp: .2,
		roughness: .96,
		microHeightMetres: .035,
		detailScaleMetres: 5,
		tint: [
			.32,
			.39,
			.18
		],
		dressingDensity: .86
	},
	"mixed-woodland": {
		organic: .6,
		litter: .64,
		grit: .12,
		damp: .38,
		roughness: .94,
		microHeightMetres: .06,
		detailScaleMetres: 4,
		tint: [
			.24,
			.29,
			.15
		],
		dressingDensity: .62
	},
	"conifer-forest": {
		organic: .38,
		litter: .88,
		grit: .2,
		damp: .32,
		roughness: .95,
		microHeightMetres: .05,
		detailScaleMetres: 3.5,
		tint: [
			.24,
			.25,
			.18
		],
		dressingDensity: .4
	},
	alpine: {
		organic: .15,
		litter: .08,
		grit: .85,
		damp: .12,
		roughness: .9,
		microHeightMetres: .09,
		detailScaleMetres: 7,
		tint: [
			.44,
			.45,
			.43
		],
		dressingDensity: .21
	},
	wetland: {
		organic: .74,
		litter: .3,
		grit: .06,
		damp: .9,
		roughness: .79,
		microHeightMetres: .04,
		detailScaleMetres: 4.5,
		tint: [
			.22,
			.3,
			.21
		],
		dressingDensity: .83
	},
	"dry-scrub": {
		organic: .3,
		litter: .2,
		grit: .64,
		damp: .08,
		roughness: .97,
		microHeightMetres: .08,
		detailScaleMetres: 6,
		tint: [
			.42,
			.36,
			.23
		],
		dressingDensity: .37
	},
	arid: {
		organic: .06,
		litter: .02,
		grit: .95,
		damp: .01,
		roughness: .98,
		microHeightMetres: .055,
		detailScaleMetres: 8,
		tint: [
			.61,
			.48,
			.29
		],
		dressingDensity: .16
	},
	"warm-coast": {
		organic: .68,
		litter: .32,
		grit: .22,
		damp: .44,
		roughness: .91,
		microHeightMetres: .045,
		detailScaleMetres: 5.5,
		tint: [
			.34,
			.4,
			.21
		],
		dressingDensity: .53
	}
};
function biomeSurfaceParametersAt(grid, x, z) {
	const gx = (x / grid.size + .5) * grid.width - .5, gz = (z / grid.size + .5) * grid.width - .5;
	const ix = Math.max(0, Math.min(grid.width - 2, Math.floor(gx))), iz = Math.max(0, Math.min(grid.width - 2, Math.floor(gz))), fx = Math.max(0, Math.min(1, gx - ix)), fz = Math.max(0, Math.min(1, gz - iz));
	const samples = [
		[
			ix,
			iz,
			(1 - fx) * (1 - fz)
		],
		[
			ix + 1,
			iz,
			fx * (1 - fz)
		],
		[
			ix,
			iz + 1,
			(1 - fx) * fz
		],
		[
			ix + 1,
			iz + 1,
			fx * fz
		]
	];
	const result = {
		organic: 0,
		litter: 0,
		grit: 0,
		damp: 0,
		roughness: 0,
		microHeightMetres: 0,
		detailScaleMetres: 0,
		tint: [
			0,
			0,
			0
		]
	};
	let total = 0;
	for (const [cx, cz, weight] of samples) {
		const profile = BIOME_SURFACE_PROFILES[PROVINCE_KINDS[grid.kinds[cz * grid.width + cx]]];
		if (!profile || weight <= 0) continue;
		total += weight;
		for (const channel of [
			"organic",
			"litter",
			"grit",
			"damp",
			"roughness",
			"microHeightMetres",
			"detailScaleMetres"
		]) result[channel] += profile[channel] * weight;
		for (let c = 0; c < 3; c++) result.tint[c] += profile.tint[c] * weight;
	}
	if (!total) {
		const p = BIOME_SURFACE_PROFILES[provinceAt(grid, x, z).kind];
		return {
			...p,
			tint: [...p.tint]
		};
	}
	for (const channel of [
		"organic",
		"litter",
		"grit",
		"damp",
		"roughness",
		"microHeightMetres",
		"detailScaleMetres"
	]) result[channel] /= total;
	for (let c = 0; c < 3; c++) result.tint[c] /= total;
	result.damp *= Math.max(0, Math.min(1, (ecologicalConditionsAt(grid, x, z).moisture - .15) / .75));
	return result;
}
/** Prepared vertex attributes for a later TerrainSurface bind. X/Z and all
* existing heights stay untouched; organic/soil/roughness/normal channels blend. */
function biomeSurfaceAttributes(grid, positions) {
	const cover = new Float32Array(positions.count * 4), material = new Float32Array(positions.count * 4), tint = new Float32Array(positions.count * 3);
	for (let i = 0; i < positions.count; i++) {
		const p = biomeSurfaceParametersAt(grid, positions.getX(i), positions.getZ(i));
		cover.set([
			p.organic,
			p.litter,
			p.grit,
			p.damp
		], i * 4);
		material.set([
			p.roughness,
			p.microHeightMetres,
			p.detailScaleMetres,
			1
		], i * 4);
		tint.set(p.tint, i * 3);
	}
	return {
		cover,
		material,
		tint
	};
}
function hash$1(x, z, seed, salt = 0) {
	let n = Math.imul(x | 0, 73856093) ^ Math.imul(z | 0, 19349663) ^ seed ^ salt;
	n = Math.imul(n ^ n >>> 16, 73244475);
	return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
function dressingGroundAllowed(game, x, z) {
	const rules = BIOME_SCENE_RULES, h = game.height(x, z);
	if (Math.abs(x) > game.world.size * .49 || Math.abs(z) > game.world.size * .49 || h < game.waterAt(x, z) + rules.dryClearanceMetres) return false;
	if (Math.max(Math.abs(game.height(x + 2, z) - game.height(x - 2, z)), Math.abs(game.height(x, z + 2) - game.height(x, z - 2))) / 4 > rules.maximumDressingGrade) return false;
	return !game.state.buildings.some((b) => b.hp > 0 && Math.abs(x - b.x) < b.w * .5 + rules.buildingMarginMetres && Math.abs(z - b.z) < b.d * .5 + rules.buildingMarginMetres);
}
function dressingForm(kind, random, bank) {
	if (kind === "wetland" && bank) return "reeds";
	if (kind === "alpine") return random < .75 ? "pebbles" : "grass";
	if (kind === "arid") return random < .55 ? "pebbles" : "scrub";
	if (kind === "dry-scrub") return random < .7 ? "scrub" : "pebbles";
	if (kind === "meadow") return random < .16 ? "flowers" : "grass";
	if (kind === "mixed-woodland") return random < .24 ? "scrub" : "grass";
	if (kind === "conifer-forest") return random < .36 ? "scrub" : "grass";
	return random < .2 ? "scrub" : "grass";
}
function biomeDressingCandidates(game, grid, camera, quality) {
	if (quality === "low") return [];
	const rules = BIOME_SCENE_RULES, cell = rules.dressingCellMetres, cx = Math.floor(camera.x / cell), cz = Math.floor(camera.z / cell), radius = Math.ceil(rules.dressingRadiusMetres / cell), points = [];
	for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
		if (points.length >= rules.dressingMaxCandidates) return points;
		const ix = cx + dx, iz = cz + dz, x = (ix + .16 + hash$1(ix, iz, game.state.seed) * .68) * cell, z = (iz + .16 + hash$1(ix, iz, game.state.seed, 59) * .68) * cell;
		if (Math.hypot(x - camera.x, z - camera.z) > rules.dressingRadiusMetres || !game.exploredAt(x, z) || !dressingGroundAllowed(game, x, z)) continue;
		const profile = provinceAt(grid, x, z), art = BIOME_SURFACE_PROFILES[profile.kind];
		if (hash$1(ix, iz, game.state.seed, 103) > art.dressingDensity) continue;
		let bank = false;
		if (profile.kind === "wetland") for (const [ax, az] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
			[.7, .7],
			[-.7, -.7]
		]) {
			const px = x + ax * rules.bankSearchMetres, pz = z + az * rules.bankSearchMetres;
			if (game.height(px, pz) < game.waterAt(px, pz) + .12) {
				bank = true;
				break;
			}
		}
		points.push({
			x,
			y: game.height(x, z),
			z,
			kind: dressingForm(profile.kind, hash$1(ix, iz, game.state.seed, 157), bank),
			scale: .72 + hash$1(ix, iz, game.state.seed, 211) * .42
		});
	}
	return points;
}
/** Drop-in integration layer, not automatically mounted by importing it.
* Construct/dispose on WorldView rebuild; sync at normal render cadence. */
var BiomeSceneLayer = class {
	grid;
	trees;
	dressing;
	treeIn = 0;
	dressingIn = 0;
	lastQuality = "";
	constructor(scene, game, grid) {
		this.grid = grid;
		this.trees = new BiomeVegetation(scene, game.state.seed, (x, z) => provinceAt(grid, x, z));
		this.dressing = new BiomeDressing(scene);
	}
	sync(game, camera, quality, dt) {
		this.treeIn -= Math.max(0, dt);
		this.dressingIn -= Math.max(0, dt);
		const changed = quality !== this.lastQuality;
		this.lastQuality = quality;
		let treeReport, dressingCount;
		const context = {
			quality,
			camera,
			known: (x, z) => game.exploredAt(x, z),
			marked: (id) => game.chopMarks?.has(id) ?? false,
			...game.seasonMix()
		};
		if (this.treeIn <= 0 || changed) {
			treeReport = this.trees.sync(game.state.trees, context);
			this.treeIn = BIOME_SCENE_RULES.treeRefreshSeconds;
		}
		if (this.dressingIn <= 0 || changed) {
			const points = biomeDressingCandidates(game, this.grid, camera, quality);
			dressingCount = this.dressing.sync(points, context, (x, z) => dressingGroundAllowed(game, x, z));
			this.dressingIn = BIOME_SCENE_RULES.dressingRefreshSeconds;
		}
		return {
			treeReport,
			dressingCount
		};
	}
	pickingSources() {
		return this.trees.pickingSources();
	}
	dispose() {
		this.trees.dispose();
		this.dressing.dispose();
	}
};
/** Atmospheric border scenery; never included in picking, resources or navigation. */
var LandContinuation = class {
	mesh;
	mist;
	constructor(scene, g, surface, ground) {
		const data = g.world.landContinuation, half = g.world.size / 2;
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
		geometry.setIndex(new BufferAttribute(data.indices, 1));
		geometry.setAttribute("color", new Float32BufferAttribute(new Float32Array(data.positions.length).fill(.42), 3));
		geometry.setAttribute("surfaceRock", new Float32BufferAttribute(new Float32Array(data.positions.length / 3).fill(.15), 1));
		geometry.setAttribute("surfaceSand", new Float32BufferAttribute(new Float32Array(data.positions.length / 3), 1));
		geometry.computeVertexNormals();
		geometry.computeBoundingSphere();
		if (g.world.bankTerrain) geometry.setAttribute("surfaceBank", new BufferAttribute(new Float32Array(data.positions.length / 3), 1));
		if (g.world.ecology) {
			const a = biomeSurfaceAttributes(g.world.ecology, geometry.getAttribute("position"));
			geometry.setAttribute("biomeCover", new BufferAttribute(a.cover, 4));
			geometry.setAttribute("biomeMaterial", new BufferAttribute(a.material, 4));
			geometry.setAttribute("biomeTint", new BufferAttribute(a.tint, 3));
		}
		const material = ground.clone();
		surface.bind(material, !!g.world.ecology);
		const prior = material.onBeforeCompile, key = material.customProgramCacheKey();
		material.transparent = true;
		material.depthWrite = false;
		material.customProgramCacheKey = () => `${key}-bounded-border-v1`;
		material.onBeforeCompile = (shader, renderer) => {
			prior.call(material, shader, renderer);
			shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>
   float borderDistance=max(max(abs(vSurfaceWorld.x),abs(vSurfaceWorld.z))-${half.toFixed(1)},0.);
   float borderHaze=smoothstep(${(data.width * .25).toFixed(1)},${data.width.toFixed(1)},borderDistance);
   #ifdef USE_FOG
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,borderHaze);
   #endif
   gl_FragColor.a*=1.-borderHaze;
  `);
		};
		this.mesh = new Mesh(geometry, material);
		this.mesh.name = "nonplayable-land-continuation";
		this.mesh.receiveShadow = true;
		this.mesh.raycast = () => {};
		this.mesh.renderOrder = 2;
		scene.add(this.mesh);
		const outer = half + 1e4, shape = new Shape([
			new Vector2(-outer, -outer),
			new Vector2(outer, -outer),
			new Vector2(outer, outer),
			new Vector2(-outer, outer)
		]), hole = new Path([
			new Vector2(-half, -half),
			new Vector2(-half, half),
			new Vector2(half, half),
			new Vector2(half, -half)
		]);
		shape.holes.push(hole);
		const fog = scene.fog?.color || new Color("#bec9c7"), mistMat = new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			side: 2,
			uniforms: { fogTint: { value: fog } },
			vertexShader: "varying vec2 borderXZ;void main(){vec4 w=modelMatrix*vec4(position,1.);borderXZ=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}",
			fragmentShader: `
   varying vec2 borderXZ;
   uniform vec3 fogTint;
   void main(){
    float d=max(max(abs(borderXZ.x),abs(borderXZ.y))-${half.toFixed(1)},0.);
    gl_FragColor=vec4(fogTint,smoothstep(0.,${data.width.toFixed(1)},d));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `
		});
		const mistGeo = new ShapeGeometry(shape);
		mistGeo.rotateX(-Math.PI / 2);
		this.mist = new Mesh(mistGeo, mistMat);
		this.mist.name = "nonplayable-border-mist";
		this.mist.position.y = g.world.waterY + .015;
		this.mist.raycast = () => {};
		this.mist.renderOrder = 1;
		scene.add(this.mist);
	}
	sync(g) {
		this.mist.position.y = g.world.waterY + .015;
	}
	dispose() {
		for (const mesh of [this.mesh, this.mist]) {
			mesh.parent?.remove(mesh);
			mesh.geometry.dispose();
			mesh.material.dispose();
		}
	}
};
var cache = /* @__PURE__ */ new Map();
function box$5(w, h, d, x = 0, y = 0, z = 0) {
	const g = new BoxGeometry(w, h, d);
	g.translate(x, y + h / 2, z);
	return g;
}
function beam$2(a, b, width = .12) {
	const delta = b.clone().sub(a), g = new BoxGeometry(width, delta.length(), width);
	g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()));
	g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
	return g;
}
function combine$1(parts) {
	const plain = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	});
	const g = mergeGeometries(plain);
	plain.forEach((p) => p.dispose());
	g.computeBoundingBox();
	g.computeBoundingSphere();
	return g;
}
function towerPlatformGeometryKey(input) {
	const c = normalizeTowerPlatform(input);
	return `${c.material}:${c.heightMeters}`;
}
/** Shared immutable geometry: at most19 material/whole-metre variants. Callers
* own their mesh/materials, never dispose these buffers on an ordinary sync. */
function towerPlatformGeos(input) {
	const c = normalizeTowerPlatform(input), key = towerPlatformGeometryKey(c), old = cache.get(key);
	if (old) return old;
	const h = c.heightMeters, timber = [box$5(3.8, .24, 3.8, 0, h - .24, 0)], stone = [];
	if (c.material === "timber") {
		for (const x of [-1.65, 1.65]) for (const z of [-1.65, 1.65]) timber.push(box$5(.28, h, .28, x, 0, z));
		const levels = Math.ceil(h / 2.5);
		for (let level = 0; level < levels; level++) {
			const y = .12 + level * h / levels, top = (level + 1) * h / levels - .12;
			for (const side of [-1, 1]) timber.push(beam$2(new Vector3(-1.65, y, side * 1.65), new Vector3(1.65, top, side * 1.65)), beam$2(new Vector3(side * 1.65, y, -1.65), new Vector3(side * 1.65, top, 1.65)));
		}
		for (const x of [-1.8, 1.8]) for (const z of [-1.8, 1.8]) timber.push(box$5(.15, 1.08, .15, x, h, z));
		for (const y of [h + .5, h + 1]) timber.push(box$5(3.7, .12, .12, 0, y, -1.8), box$5(.12, .12, 3.7, -1.8, y, 0), box$5(.12, .12, 3.7, 1.8, y, 0), box$5(1.35, .12, .12, -1.15, y, 1.8), box$5(1.35, .12, .12, 1.15, y, 1.8));
	} else {
		const body = new CylinderGeometry(1.72, 1.82, h - .24, 8);
		body.rotateY(Math.PI / 8);
		body.translate(0, (h - .24) / 2, 0);
		stone.push(body);
		for (let y = 1; y < h - .4; y += 1.2) {
			const ring = new TorusGeometry(1.7, .035, 3, 8);
			ring.rotateX(Math.PI / 2);
			ring.rotateY(Math.PI / 8);
			ring.translate(0, y, 0);
			stone.push(ring);
		}
		stone.push(box$5(3.8, .85, .28, 0, h, -1.8), box$5(.28, .85, 3.8, -1.8, h, 0), box$5(.28, .85, 3.8, 1.8, h, 0), box$5(1.35, .85, .28, -1.15, h, 1.8), box$5(1.35, .85, .28, 1.15, h, 1.8));
		for (const side of [-1, 1]) for (const offset of [
			-1.65,
			-.55,
			.55,
			1.65
		]) stone.push(box$5(.4, .3, .36, offset, h + .85, side * 1.8), box$5(.36, .3, .4, side * 1.8, h + .85, offset));
	}
	timber.push(box$5(.1, h + .4, .12, -.29, 0, 2.03), box$5(.1, h + .4, .12, .29, 0, 2.03));
	for (let y = .28; y < h; y += .28) timber.push(box$5(.67, .08, .13, 0, y, 2.03));
	const timberGeo = combine$1(timber), stoneGeo = stone.length ? combine$1(stone) : void 0;
	const result = {
		timber: timberGeo,
		roof: combine$1([box$5(.01, .01, .01)]),
		...stoneGeo ? {
			extra: stoneGeo,
			extraMat: "stone"
		} : {},
		platformHeightMeters: h,
		overallHeightMeters: Math.max(timberGeo.boundingBox.max.y, stoneGeo?.boundingBox?.max.y ?? 0),
		geometryKey: key
	};
	cache.set(key, result);
	return result;
}
var TOWER_PLATFORM_LAYER_RULES = Object.freeze({
	instancesPerConfiguration: 2048,
	maximumConfigurations: Object.values(TOWER_PLATFORM_RULES).reduce((n, r) => n + r.maxHeightMeters - r.minHeightMeters + 1, 0)
});
/** One lazy timber/stone instance bucket per paid design. No stretched cultural
* transform: deck metres and arrow release must agree with the actual geometry. */
var TowerPlatformLayer = class {
	buckets = /* @__PURE__ */ new Map();
	picking = /* @__PURE__ */ new Map();
	matrix = new Matrix4();
	position = new Vector3();
	rotation = new Quaternion();
	scale = new Vector3(1, 1, 1);
	color = new Color();
	scene;
	mats;
	constructor(scene, mats) {
		this.scene = scene;
		this.mats = mats;
	}
	bucket(config) {
		const key = towerPlatformGeometryKey(config), old = this.buckets.get(key);
		if (old) return old;
		if (this.buckets.size >= TOWER_PLATFORM_LAYER_RULES.maximumConfigurations) return null;
		const geo = towerPlatformGeos(config), owners = [], parts = [];
		for (const [geometry, stone] of [[geo.timber, false], [geo.extra, true]]) {
			if (!geometry) continue;
			const material = (stone ? this.mats.stone : this.mats.timber).clone();
			material.color.set("#ffffff");
			const mesh = new InstancedMesh(geometry, material, TOWER_PLATFORM_LAYER_RULES.instancesPerConfiguration);
			mesh.name = `tower-platform-${key}-${stone ? "stone" : "timber"}`;
			mesh.count = 0;
			mesh.frustumCulled = false;
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(TOWER_PLATFORM_LAYER_RULES.instancesPerConfiguration * 3), 3);
			mesh.instanceColor.setUsage(DynamicDrawUsage);
			this.scene.add(mesh);
			this.picking.set(mesh, owners);
			parts.push({
				mesh,
				stone
			});
		}
		const next = {
			parts,
			owners
		};
		this.buckets.set(key, next);
		return next;
	}
	sync(game) {
		for (const b of this.buckets.values()) b.owners.length = 0;
		for (const b of game.state.buildings) {
			if (b.type !== "watchtower" || !b.towerPlatform || b.hp <= 0 || b.team !== 0 && !game.exploredAt(b.x, b.z)) continue;
			const bucket = this.bucket(b.towerPlatform);
			if (!bucket || bucket.owners.length >= TOWER_PLATFORM_LAYER_RULES.instancesPerConfiguration) continue;
			const i = bucket.owners.length, progress = b.plannedCost ? .08 : b.build >= 1 ? 1 : .22 + .78 * Math.max(0, b.build);
			this.position.set(b.x, foundationProfile(game, b).level, b.z);
			this.scale.set(1, progress, 1);
			this.matrix.compose(this.position, this.rotation, this.scale);
			for (const part of bucket.parts) {
				part.mesh.setMatrixAt(i, this.matrix);
				this.color.set(b.plannedCost ? "#87b7cb" : part.stone ? "#aaa494" : (TEAM_STYLE[b.team] || TEAM_STYLE[0]).timber);
				part.mesh.setColorAt(i, this.color);
			}
			bucket.owners.push(b);
		}
		for (const bucket of this.buckets.values()) for (const { mesh } of bucket.parts) {
			mesh.count = bucket.owners.length;
			mesh.visible = mesh.count > 0;
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		}
	}
	sources() {
		return this.picking;
	}
	dispose() {
		for (const bucket of this.buckets.values()) for (const { mesh } of bucket.parts) {
			mesh.parent?.remove(mesh);
			mesh.dispose();
			mesh.material.dispose();
		}
		this.buckets.clear();
		this.picking.clear();
	}
};
var CROP_ART_RULES = {
	maxPlantInstances: 8192,
	maximumPlantsPerField: 512,
	edgeMarginMetres: .45,
	maxDistanceMetres: 320,
	rows: {
		grain: {
			rowMetres: .95,
			plantMetres: .82
		},
		pulses: {
			rowMetres: 1.3,
			plantMetres: 1.15
		},
		tubers: {
			rowMetres: 1.45,
			plantMetres: 1.3
		}
	}
};
function fieldCropKind(field) {
	return field.crop?.kind ?? field.cropType ?? "grain";
}
function fieldCropGrowth(field) {
	const c = field.crop;
	return c?.ripened ? c.remaining > 0 ? 1 : .04 : .04 + .75 * (c?.planted || 0) + .2 * (c?.tended || 0);
}
/** Rows use the measured contour tangent. Only interior plant roots rotate;
* rectangle boundary and the heightfield never rotate or flatten. */
function contourPlantSites(plot, angle, kind) {
	const { rowMetres, plantMetres } = CROP_ART_RULES.rows[kind], margin = CROP_ART_RULES.edgeMarginMetres, halfW = Math.max(0, plot.w / 2 - margin), halfD = Math.max(0, plot.d / 2 - margin), ux = Math.cos(angle), uz = Math.sin(angle), nx = -uz, nz = ux;
	const density = Math.max(1, Math.sqrt(4 * halfW * halfD / (rowMetres * plantMetres * CROP_ART_RULES.maximumPlantsPerField)));
	const rowSpacing = rowMetres * density, plantSpacing = plantMetres * density;
	const across = Math.abs(nx) * halfW + Math.abs(nz) * halfD, points = [];
	for (let row = Math.ceil(-across / rowSpacing); row <= Math.floor(across / rowSpacing); row++) {
		const v = row * rowSpacing;
		let lo = -Infinity, hi = Infinity;
		for (const [axis, normal, bound] of [[
			ux,
			nx,
			halfW
		], [
			uz,
			nz,
			halfD
		]]) {
			if (Math.abs(axis) < 1e-8) {
				if (Math.abs(normal * v) > bound) {
					lo = 1;
					hi = 0;
					break;
				}
				continue;
			}
			const a = (-bound - normal * v) / axis, b = (bound - normal * v) / axis;
			lo = Math.max(lo, Math.min(a, b));
			hi = Math.min(hi, Math.max(a, b));
		}
		for (let col = Math.ceil(lo / plantSpacing); col <= Math.floor(hi / plantSpacing); col++) {
			const u = col * plantSpacing;
			points.push({
				x: plot.x + ux * u + nx * v,
				z: plot.z + uz * u + nz * v
			});
		}
	}
	return points.length <= CROP_ART_RULES.maximumPlantsPerField ? points : Array.from({ length: CROP_ART_RULES.maximumPlantsPerField }, (_, i) => points[Math.floor((i + .5) * points.length / CROP_ART_RULES.maximumPlantsPerField)]);
}
function colored(g, color) {
	const c = new Color(color), data = new Float32Array(g.attributes.position.count * 3);
	for (let i = 0; i < data.length; i += 3) data.set([
		c.r,
		c.g,
		c.b
	], i);
	g.setAttribute("color", new BufferAttribute(data, 3));
	return g;
}
function stem(x, y, z, r, height, color) {
	const g = new CylinderGeometry(r, r * .9, height, 4);
	g.translate(x, y + height * .5, z);
	return colored(g, color);
}
function leaf(x, y, z, length, width, angle, color) {
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute([
		0,
		0,
		0,
		length * .5,
		.07,
		width * .5,
		length,
		.025,
		0,
		length * .5,
		.07,
		-width * .5
	], 3));
	g.setAttribute("uv", new Float32BufferAttribute([
		0,
		.5,
		.5,
		1,
		1,
		.5,
		.5,
		0
	], 2));
	g.setIndex([
		0,
		1,
		2,
		0,
		2,
		3
	]);
	g.computeVertexNormals();
	g.rotateY(angle);
	g.translate(x, y, z);
	return colored(g, color);
}
function cropPlantGeometry(kind) {
	const parts = [];
	if (kind === "grain") for (let i = 0; i < 3; i++) {
		const x = (i - 1) * .1, z = i % 2 * .08, h = .67 + i * .07;
		parts.push(stem(x, .04, z, .016, h, "#92a86a"));
		const ear = new CylinderGeometry(.038, .055, .21, 5);
		ear.translate(x, h + .11, z);
		parts.push(colored(ear, "#d0be7a"));
		parts.push(leaf(x, .3, z, .23, .05, i * 2.1, "#6c984b"));
	}
	else if (kind === "pulses") for (let i = 0; i < 3; i++) {
		const a = i * Math.PI * 2 / 3, x = Math.cos(a) * .14, z = Math.sin(a) * .14;
		parts.push(stem(x, .04, z, .025, .42, "#668647"));
		for (let j = 0; j < 2; j++) parts.push(leaf(x, .21 + j * .13, z, .25, .17, a + j * 1.1, "#729a4d"));
		const pod = new CapsuleGeometry(.04, .15, 2, 4);
		pod.rotateZ(.35);
		pod.translate(x + .08, .34, z);
		parts.push(colored(pod, "#adc26b"));
	}
	else {
		const mound = new IcosahedronGeometry(.19, 0);
		mound.scale(1, .32, 1);
		mound.translate(0, .055, 0);
		parts.push(colored(mound, "#775b39"));
		for (let i = 0; i < 6; i++) {
			const a = i * Math.PI / 3;
			parts.push(leaf(0, .12, 0, .32, .2, a, "#4d8544"));
		}
	}
	const flattened = parts.map((g) => {
		if (!g.index) return g;
		const n = g.toNonIndexed();
		g.dispose();
		return n;
	}), geo = mergeGeometries(flattened, false);
	for (const g of flattened) g.dispose();
	if (!geo) throw new Error("Crop geometry attributes differ");
	geo.computeBoundingBox();
	geo.computeBoundingSphere();
	return geo;
}
var ContourFields = class {
	scene;
	surface;
	meshes = /* @__PURE__ */ new Map();
	cache = /* @__PURE__ */ new WeakMap();
	position = new Vector3();
	scale = new Vector3();
	rotation = new Quaternion();
	matrix = new Matrix4();
	color = new Color();
	up = new Vector3(0, 1, 0);
	lastSurfaceRevision = -1;
	constructor(scene, surface) {
		this.scene = scene;
		this.surface = surface;
		for (const kind of [
			"grain",
			"pulses",
			"tubers"
		]) {
			const mat = new MeshStandardMaterial({
				color: 16777215,
				vertexColors: true,
				roughness: .9,
				side: 2
			});
			surface.bind(mat);
			const mesh = new InstancedMesh(cropPlantGeometry(kind), mat, CROP_ART_RULES.maxPlantInstances);
			mesh.customDepthMaterial = surface.depth;
			mesh.name = `contour-crop-${kind}`;
			mesh.count = 0;
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.frustumCulled = false;
			mesh.raycast = () => {};
			scene.add(mesh);
			this.meshes.set(kind, mesh);
		}
	}
	orientation(ground, field) {
		const kind = fieldCropKind(field), key = `${field.x}/${field.z}/${field.w}/${field.d}/${kind}`, revision = ground.navigationRevision?.() ?? 0, old = this.cache.get(field);
		if (old?.key === key && old.heights === ground.world.heights && old.revision === revision) return old;
		const angle = surveyFieldTopography(ground, field).contourAngleRadians, sites = contourPlantSites(field, angle, kind), result = {
			key,
			heights: ground.world.heights,
			revision,
			angle,
			sites
		};
		this.cache.set(field, result);
		return result;
	}
	rows(ground, field) {
		const angle = this.orientation(ground, field).angle, nx = -Math.sin(angle), nz = Math.cos(angle);
		return {
			nx,
			nz,
			offset: -field.x * nx - field.z * nz,
			spacing: CROP_ART_RULES.rows[fieldCropKind(field)].rowMetres
		};
	}
	sync(ground, camera) {
		const counts = {
			grain: 0,
			pulses: 0,
			tubers: 0
		};
		let total = 0;
		const fields = ground.state.buildings.filter((b) => b.type === "farm" && b.hp > 0 && b.build >= 1 && !b.plannedCost && (b.team === 0 || ground.exploredAt(b.x, b.z)) && b.fallowYear !== Math.floor(ground.state.time / 1800) && Math.hypot(b.x - camera.x, b.z - camera.z) < CROP_ART_RULES.maxDistanceMetres).sort((a, b) => Math.hypot(a.x - camera.x, a.z - camera.z) - Math.hypot(b.x - camera.x, b.z - camera.z));
		for (const field of fields) {
			const kind = fieldCropKind(field), mesh = this.meshes.get(kind), plan = this.orientation(ground, field), growth = fieldCropGrowth(field);
			this.rotation.setFromAxisAngle(this.up, -plan.angle);
			this.color.set(kind === "grain" ? field.crop?.ripened ? "#e2c15a" : "#a8c17c" : kind === "pulses" ? field.crop?.ripened ? "#bac183" : "#9aba86" : "#91b887");
			for (const site of plan.sites) {
				if (total >= CROP_ART_RULES.maxPlantInstances) break;
				this.position.set(site.x, ground.height(site.x, site.z), site.z);
				this.scale.set(1, Math.max(.025, growth), 1);
				this.matrix.compose(this.position, this.rotation, this.scale);
				mesh.setMatrixAt(counts[kind], this.matrix);
				mesh.setColorAt(counts[kind]++, this.color);
				total++;
			}
		}
		for (const [kind, mesh] of this.meshes) {
			mesh.count = counts[kind];
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		}
		const revision = ground.navigationRevision?.() ?? 0;
		if (this.lastSurfaceRevision !== revision) {
			this.surface.texture.needsUpdate = true;
			this.lastSurfaceRevision = revision;
		}
		return {
			plants: total,
			...counts
		};
	}
	dispose() {
		for (const mesh of this.meshes.values()) {
			this.scene.remove(mesh);
			mesh.geometry.dispose();
			mesh.material.dispose();
			mesh.dispose();
		}
		this.meshes.clear();
	}
};
/** One sparse height atlas shared by fields, crops and their depth shadows. */
var BankSurface = class {
	uniforms = {
		bankTileMap: { value: new DataTexture(/* @__PURE__ */ new Float32Array(1), 1, 1, RedFormat, FloatType) },
		bankAtlas: { value: new DataTexture(/* @__PURE__ */ new Float32Array(1), 1, 1, RedFormat, FloatType) },
		bankInfo: { value: new Vector4(1, 1, 1, 0) },
		bankAtlasSize: { value: new Vector2(1, 1) }
	};
	size;
	subdivisions = BANK_TERRAIN_RULES.subdivisions;
	get gridSubdivisions() {
		return this.subdivisions;
	}
	constructor(size) {
		this.size = size;
		for (const u of [this.uniforms.bankTileMap, this.uniforms.bankAtlas]) {
			u.value.minFilter = u.value.magFilter = NearestFilter;
			u.value.generateMipmaps = false;
			u.value.needsUpdate = true;
		}
	}
	update(terrain) {
		this.subdivisions = terrain.subdivisions;
		const n = this.subdivisions + 1, columns = 16, rows = Math.max(1, Math.ceil(terrain.tiles.length / columns)), map = new Float32Array(terrain.width ** 2), atlas = new Float32Array(columns * n * rows * n);
		let index = 0;
		for (const tile of terrain.tiles) {
			map[tile.key] = index + 1;
			const tx = index % columns * n, tz = Math.floor(index / columns) * n;
			for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) atlas[(tz + z) * columns * n + tx + x] = tile.heights[z * n + x];
			index++;
		}
		const replace = (uniform, data, w, h) => {
			uniform.value.dispose();
			uniform.value = new DataTexture(data, w, h, RedFormat, FloatType);
			uniform.value.minFilter = uniform.value.magFilter = NearestFilter;
			uniform.value.generateMipmaps = false;
			uniform.value.needsUpdate = true;
		};
		replace(this.uniforms.bankTileMap, map, terrain.width, terrain.width);
		replace(this.uniforms.bankAtlas, atlas, columns * n, rows * n);
		this.uniforms.bankInfo.value.set(terrain.tileSize, terrain.width, columns, index);
		this.uniforms.bankAtlasSize.value.set(columns * n, rows * n);
	}
	bind(shader) {
		Object.assign(shader.uniforms, this.uniforms);
	}
	get glsl() {
		const n = this.subdivisions;
		return `
 uniform sampler2D bankTileMap;uniform sampler2D bankAtlas;uniform vec4 bankInfo;uniform vec2 bankAtlasSize;
 float refinedBankHeight(vec2 worldXZ,float fallbackHeight){
  if(bankInfo.w<.5)return fallbackHeight;
  vec2 grid=(worldXZ/${this.size.toFixed(1)}+.5)*bankInfo.y;
  vec2 tile=floor(grid);if(min(tile.x,tile.y)<0.||max(tile.x,tile.y)>=bankInfo.y)return fallbackHeight;
  float id=texture2D(bankTileMap,(tile+.5)/bankInfo.y).r-1.;if(id<-.5)return fallbackHeight;
  vec2 fine=fract(grid)*${n.toFixed(1)},cell=min(floor(fine),vec2(${(n - 1).toFixed(1)})),f=fine-cell;
  vec2 atlasTile=vec2(mod(id,bankInfo.z),floor(id/bankInfo.z))*${(n + 1).toFixed(1)};
  vec2 uv=(atlasTile+cell+.5)/bankAtlasSize,delta=1./bankAtlasSize;
  float a=texture2D(bankAtlas,uv).r,b=texture2D(bankAtlas,uv+vec2(delta.x,0.)).r,c=texture2D(bankAtlas,uv+vec2(0.,delta.y)).r,d=texture2D(bankAtlas,uv+delta).r;
  return f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
 }
 `;
	}
	dispose() {
		this.uniforms.bankTileMap.value.dispose();
		this.uniforms.bankAtlas.value.dispose();
	}
};
/** One sparse height atlas shared by fields, crops and their depth shadows. */
var ExcavationSurface = class {
	uniforms = {
		cutTileMap: { value: new DataTexture(/* @__PURE__ */ new Float32Array(1), 1, 1, RedFormat, FloatType) },
		cutAtlas: { value: new DataTexture(/* @__PURE__ */ new Float32Array(1), 1, 1, RedFormat, FloatType) },
		cutInfo: { value: new Vector4(1, 1, 1, 0) },
		cutAtlasSize: { value: new Vector2(1, 1) }
	};
	size;
	constructor(size) {
		this.size = size;
		for (const u of [this.uniforms.cutTileMap, this.uniforms.cutAtlas]) {
			u.value.minFilter = u.value.magFilter = NearestFilter;
			u.value.generateMipmaps = false;
			u.value.needsUpdate = true;
		}
	}
	update(terrain) {
		const n = EXCAVATION_RULES.subdivisions + 1, columns = 16, rows = Math.max(1, Math.ceil(terrain.tiles.size / columns)), map = new Float32Array(terrain.width ** 2), atlas = new Float32Array(columns * n * rows * n);
		let index = 0;
		for (const tile of terrain.tiles.values()) {
			map[tile.key] = index + 1;
			const tx = index % columns * n, tz = Math.floor(index / columns) * n;
			for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) atlas[(tz + z) * columns * n + tx + x] = tile.heights[z * n + x];
			index++;
		}
		const replace = (uniform, data, w, h) => {
			uniform.value.dispose();
			uniform.value = new DataTexture(data, w, h, RedFormat, FloatType);
			uniform.value.minFilter = uniform.value.magFilter = NearestFilter;
			uniform.value.generateMipmaps = false;
			uniform.value.needsUpdate = true;
		};
		replace(this.uniforms.cutTileMap, map, terrain.width, terrain.width);
		replace(this.uniforms.cutAtlas, atlas, columns * n, rows * n);
		this.uniforms.cutInfo.value.set(terrain.tileSize, terrain.width, columns, index);
		this.uniforms.cutAtlasSize.value.set(columns * n, rows * n);
	}
	bind(shader) {
		Object.assign(shader.uniforms, this.uniforms);
	}
	get glsl() {
		const n = EXCAVATION_RULES.subdivisions;
		return `
 uniform sampler2D cutTileMap;uniform sampler2D cutAtlas;uniform vec4 cutInfo;uniform vec2 cutAtlasSize;
 float refinedExcavationHeight(vec2 worldXZ,float fallbackHeight){
  if(cutInfo.w<.5)return fallbackHeight;
  vec2 grid=(worldXZ/${this.size.toFixed(1)}+.5)*cutInfo.y;
  vec2 tile=floor(grid);if(min(tile.x,tile.y)<0.||max(tile.x,tile.y)>=cutInfo.y)return fallbackHeight;
  float id=texture2D(cutTileMap,(tile+.5)/cutInfo.y).r-1.;if(id<-.5)return fallbackHeight;
  vec2 fine=fract(grid)*${n.toFixed(1)},cell=min(floor(fine),vec2(${(n - 1).toFixed(1)})),f=fine-cell;
  vec2 atlasTile=vec2(mod(id,cutInfo.z),floor(id/cutInfo.z))*${(n + 1).toFixed(1)};
  vec2 uv=(atlasTile+cell+.5)/cutAtlasSize,delta=1./cutAtlasSize;
  float a=texture2D(cutAtlas,uv).r,b=texture2D(cutAtlas,uv+vec2(delta.x,0.)).r,c=texture2D(cutAtlas,uv+vec2(0.,delta.y)).r,d=texture2D(cutAtlas,uv+delta).r;
  return f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
 }
 `;
	}
	dispose() {
		this.uniforms.cutTileMap.value.dispose();
		this.uniforms.cutAtlas.value.dispose();
	}
};
/** Original seamless packed surface texture. Channels encode mineral grain,
* fracture edges, fine ground cover and roughness; never changes collision. */
var SURFACE_RULES = {
	textureSize: 128,
	detailMetres: 9,
	provinceMetres: 42,
	normalStrength: .055,
	rockNormalStrength: .15,
	fadeStartMetres: 70,
	fadeEndMetres: 240
};
var fract = (v) => v - Math.floor(v);
function hash(x, z, seed) {
	return fract(Math.sin(x * 127.1 + z * 311.7 + seed * .017) * 43758.5453);
}
function periodicNoise(x, z, cells, seed) {
	const px = x * cells, pz = z * cells, ix = Math.floor(px), iz = Math.floor(pz), fx = fract(px), fz = fract(pz), u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
	const at = (dx, dz) => hash((ix + dx) % cells, (iz + dz) % cells, seed);
	return (at(0, 0) * (1 - u) + at(1, 0) * u) * (1 - v) + (at(0, 1) * (1 - u) + at(1, 1) * u) * v;
}
function surfacePixels(seed, size = SURFACE_RULES.textureSize) {
	const data = new Uint8Array(size * size * 4);
	for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
		const u = x / size, v = z / size, broad = periodicNoise(u, v, 8, seed), grain = periodicNoise(u, v, 48, seed + 19), fine = hash(x, z, seed + 41);
		const fracture = 1 - Math.min(1, Math.abs(periodicNoise(u, v, 12, seed + 73) - .5) * 15);
		const i = (z * size + x) * 4;
		data[i] = Math.round((broad * .6 + grain * .4) * 255);
		data[i + 1] = Math.round(fracture * 255);
		data[i + 2] = Math.round((grain * .9 + fine * .1) * 255);
		data[i + 3] = Math.round((.65 + grain * .25 + fine * .1) * 255);
	}
	return data;
}
function duneSandWeight(features, x, z) {
	let weight = 0;
	for (const feature of features) {
		if (feature.kind !== "dunes" || !feature.shape) continue;
		const { rx, rz, rotation } = feature.shape, dx = x - feature.x, dz = z - feature.z, c = Math.cos(rotation), sn = Math.sin(rotation);
		const edge = Math.hypot((dx * c + dz * sn) / rx, (-dx * sn + dz * c) / rz);
		weight = Math.max(weight, Math.max(0, Math.min(1, (1 - edge) / .15)));
	}
	return weight;
}
var TerrainSurface = class {
	bankColors;
	banks;
	bankCuts;
	detail;
	heights;
	size;
	segments;
	snow = { value: 0 };
	constructor(heights, size, seed, banks, colors) {
		if (banks) {
			this.banks = new BankSurface(size);
			this.banks.update(banks);
			this.bankCuts = new ExcavationSurface(size);
			if (colors) {
				this.bankColors = new DataTexture(colors, Math.round(Math.sqrt(heights.length)), Math.round(Math.sqrt(heights.length)), RGBFormat, FloatType);
				this.bankColors.minFilter = this.bankColors.magFilter = NearestFilter;
				this.bankColors.generateMipmaps = false;
				this.bankColors.needsUpdate = true;
			}
		}
		this.size = size;
		this.segments = Math.round(Math.sqrt(heights.length)) - 1;
		this.detail = new DataTexture(surfacePixels(seed), SURFACE_RULES.textureSize, SURFACE_RULES.textureSize, RGBAFormat);
		this.detail.wrapS = this.detail.wrapT = RepeatWrapping;
		this.detail.magFilter = LinearFilter;
		this.detail.minFilter = LinearMipmapLinearFilter;
		this.detail.generateMipmaps = true;
		this.detail.anisotropy = 4;
		this.detail.needsUpdate = true;
		this.heights = new DataTexture(heights, this.segments + 1, this.segments + 1, RedFormat, FloatType);
		this.heights.magFilter = this.heights.minFilter = NearestFilter;
		this.heights.generateMipmaps = false;
		this.heights.needsUpdate = true;
	}
	bind(material, biomes = false) {
		if (this.banks || material.userData.hearthBankSurface) {
			material.userData.hearthBankSurface = !!this.banks;
			material.needsUpdate = true;
		}
		material.flatShading = false;
		material.customProgramCacheKey = () => `hearth-terrain-surface-v3-${biomes ? "ecology" : "legacy"}${this.bankColors ? `-banks-v19-${this.size}-${this.segments}` : ""}`;
		material.onBeforeCompile = (shader) => {
			if (this.bankColors) {
				shader.uniforms.bankColors = { value: this.bankColors };
				shader.vertexShader = `attribute float surfaceBank;uniform sampler2D bankColors;
vec3 bankGroundColor(vec2 p){vec2 grid=clamp((p/${this.size.toFixed(1)}+.5)*${this.segments.toFixed(1)},vec2(0.),vec2(${this.segments.toFixed(1)}));vec2 cell=min(floor(grid),vec2(${(this.segments - 1).toFixed(1)})),f=grid-cell,uv=(cell+.5)/${(this.segments + 1).toFixed(1)},d=vec2(1./${(this.segments + 1).toFixed(1)});vec3 a=texture2D(bankColors,uv).rgb,b=texture2D(bankColors,uv+vec2(d.x,0.)).rgb,c=texture2D(bankColors,uv+vec2(0.,d.y)).rgb,e=texture2D(bankColors,uv+d).rgb;return f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:e+(c-e)*(1.-f.x)+(b-e)*(1.-f.y);}
` + shader.vertexShader;
				shader.vertexShader = shader.vertexShader.replace("#include <color_vertex>", "#include <color_vertex>\n#ifdef USE_COLOR\nif(surfaceBank>.5)vColor.rgb=bankGroundColor(position.xz);\n#endif");
			}
			shader.uniforms.surfaceDetail = { value: this.detail };
			shader.uniforms.surfaceSnow = this.snow;
			shader.vertexShader = (biomes ? "attribute vec4 biomeCover;attribute vec4 biomeMaterial;attribute vec3 biomeTint;varying vec4 vBiomeCover;varying vec4 vBiomeMaterial;varying vec3 vBiomeTint;\n" : "") + "attribute float surfaceRock;attribute float surfaceSand; varying vec3 vSurfaceWorld; varying vec3 vSurfaceNormal; varying float vSurfaceRock;varying float vSurfaceSand;\n" + shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
     vSurfaceWorld=(modelMatrix*vec4(position,1.)).xyz;
     vSurfaceNormal=normalize(mat3(modelMatrix)*normal);vSurfaceRock=surfaceRock;vSurfaceSand=surfaceSand;
     ${biomes ? "vBiomeCover=biomeCover;vBiomeMaterial=biomeMaterial;vBiomeTint=biomeTint;" : ""}`);
			shader.fragmentShader = `${biomes ? "varying vec4 vBiomeCover;varying vec4 vBiomeMaterial;varying vec3 vBiomeTint;" : ""}
    uniform sampler2D surfaceDetail;uniform float surfaceSnow;
    varying vec3 vSurfaceWorld;varying vec3 vSurfaceNormal;varying float vSurfaceRock;varying float vSurfaceSand;
    vec3 surfacePerturb(vec3 eyePosition,vec3 normalIn,float height){
     vec3 sigmaX=dFdx(eyePosition),sigmaY=dFdy(eyePosition);
     vec3 r1=cross(sigmaY,normalIn),r2=cross(normalIn,sigmaX);float determinant=dot(sigmaX,r1);
     return normalize(abs(determinant)*normalIn-sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2));
    }
   ` + shader.fragmentShader;
			shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
    vec3 weights=pow(abs(normalize(vSurfaceNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
    vec3 p=vSurfaceWorld/${SURFACE_RULES.detailMetres.toFixed(1)};
    ${biomes ? "p=vSurfaceWorld/max(2.0,vBiomeMaterial.z);" : ""}
    vec4 textureX=texture2D(surfaceDetail,p.yz),textureY=texture2D(surfaceDetail,p.xz),textureZ=texture2D(surfaceDetail,p.xy);
    vec4 surface=textureX*weights.x+textureY*weights.y+textureZ*weights.z;
    vec4 meso=texture2D(surfaceDetail,vSurfaceWorld.xz/18.0+vec2(.137,.291));
    float province=texture2D(surfaceDetail,vSurfaceWorld.xz/${SURFACE_RULES.provinceMetres.toFixed(1)}).r;
    float sand=clamp(vSurfaceSand,0.,1.)*(1.-surfaceSnow*.9);
    float rock=clamp(vSurfaceRock,0.,1.)*(1.-sand);
    float cracks=surface.g*rock;
    float strata=sin(vSurfaceWorld.y*2.2+surface.r*2.5)*.5+.5;
    float grain=mix(surface.b,surface.r,rock);
    float microFade=1.-smoothstep(${SURFACE_RULES.fadeStartMetres.toFixed(1)},${SURFACE_RULES.fadeEndMetres.toFixed(1)},length(vViewPosition));
    float variation=mix(1.,.92+grain*.16,microFade);
    vec3 mineral=mix(vec3(.81,.76,.65),vec3(1.12,1.10,1.04),province);
    diffuseColor.rgb*=mix(vec3(1.),mineral,rock*.65);
    diffuseColor.rgb*=variation*(1.-cracks*.12*microFade)*(1.-rock*strata*.075);
    float mesoFade=1.-smoothstep(120.0,400.0,length(vViewPosition));
    diffuseColor.rgb*=mix(1.,.89+meso.r*.24,mesoFade);
    float soilPatch=smoothstep(.59,.77,meso.r)*(1.-rock)*(1.-sand)*mesoFade;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.27,.23,.16)*(.9+province*.2),soilPatch*.22);
    float groundLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(groundLuma),.20*(1.-rock)*(1.-sand));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.48,.28)*(.94+grain*.12),sand);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*(.90+surface.b*.16),clamp(surfaceSnow,0.,1.));
    float surfaceHeight=(surface.r*.35+surface.b*.2-cracks*.55+rock*strata*.12+sin(p.x*8.+sin(p.z*2.))*.025*sand)*microFade+(meso.r-.5)*.12*mesoFade;
    ${biomes ? `vec3 biomeGround=vBiomeTint*(.88+meso.r*.25);
    biomeGround=mix(biomeGround,vec3(.23,.18,.12)*(.82+province*.3),vBiomeCover.y*.28);
    biomeGround*=1.-vBiomeCover.w*.12;
    biomeGround=mix(biomeGround,diffuseColor.rgb,rock*.85);
    diffuseColor.rgb=mix(diffuseColor.rgb,biomeGround,.78*(1.-surfaceSnow*.98)*(1.-sand*.85));
    surfaceHeight+=((meso.g-.5)*vBiomeCover.y*.09+(surface.b-.5)*vBiomeCover.z*.07)*mesoFade;` : ""}
   `);
			shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
     roughnessFactor=clamp(mix(.95,.72,rock)+surface.a*.12,.55,1.);
     ${biomes ? "roughnessFactor=mix(roughnessFactor,clamp(vBiomeMaterial.x+(surface.a-.8)*.05-vBiomeCover.w*.08,.52,1.),.9*(1.-rock));" : ""}`);
			shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
     normal=surfacePerturb(-vViewPosition,normal,surfaceHeight*mix(${SURFACE_RULES.normalStrength.toFixed(3)},${SURFACE_RULES.rockNormalStrength.toFixed(3)},rock)*(1.-surfaceSnow*.65)*${biomes ? "mix(clamp(vBiomeMaterial.y/0.055,.2,2.5),1.,rock)" : "1."});`);
		};
		material.needsUpdate = true;
	}
	dispose() {
		this.detail.dispose();
		this.heights.dispose();
		this.banks?.dispose();
		this.bankCuts?.dispose();
		this.bankColors?.dispose();
	}
};
var WATER_ART_RULES = {
	shallowMetres: .35,
	deepMetres: 5,
	foamMetres: .85,
	waveNormalStrength: .1,
	glintPower: 96,
	fallSegments: 10
};
function makeDepthWater(surface, time, falling = false) {
	const uniforms = UniformsUtils.merge([UniformsLib.fog, {
		uTime: time,
		uLight: { value: 1 },
		uSunDirection: { value: new Vector3(.5, 1, .3).normalize() },
		uColor: { value: new Color("#53b5b8") },
		uDeep: { value: new Color("#123d61") },
		uHeights: { value: surface.heights },
		uTerrainSize: { value: surface.size },
		uSegments: { value: surface.segments },
		uFalling: { value: falling ? 1 : 0 }
	}]);
	uniforms.uTime = time;
	uniforms.uHeights = { value: surface.heights };
	if (surface.banks) Object.assign(uniforms, surface.banks.uniforms);
	if (surface.bankCuts) Object.assign(uniforms, surface.bankCuts.uniforms);
	return new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		fog: true,
		side: 2,
		uniforms,
		vertexShader: `varying vec3 vWPos;varying vec2 vWaterUv;
  #include <fog_pars_vertex>
  void main(){vec4 w=modelMatrix*vec4(position,1.);vWPos=w.xyz;vWaterUv=uv;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
		fragmentShader: `uniform float uTime;uniform float uLight;uniform vec3 uSunDirection;uniform vec3 uColor;uniform vec3 uDeep;uniform sampler2D uHeights;
  uniform float uTerrainSize;uniform float uSegments;uniform float uFalling;
  varying vec3 vWPos;varying vec2 vWaterUv;
  ${surface.banks?.glsl ?? ""}
  ${surface.bankCuts?.glsl ?? ""}
  #include <fog_pars_fragment>
  float flowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float flowNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(flowHash(i),flowHash(i+vec2(1.,0.)),f.x),mix(flowHash(i+vec2(0.,1.)),flowHash(i+vec2(1.)),f.x),f.y);}
  float bedHeight(vec2 worldXZ){
   vec2 grid=clamp((worldXZ/uTerrainSize+.5)*uSegments,vec2(0.),vec2(uSegments));
   vec2 cell=min(floor(grid),vec2(uSegments-1.)),f=grid-cell;float texel=1./(uSegments+1.);
   vec2 uv=(cell+.5)*texel;
   float a=texture2D(uHeights,uv).r,b=texture2D(uHeights,uv+vec2(texel,0.)).r;
   float c=texture2D(uHeights,uv+vec2(0.,texel)).r,d=texture2D(uHeights,uv+vec2(texel)).r;
   float base=f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
   return ${surface.banks ? "refinedExcavationHeight(worldXZ,refinedBankHeight(worldXZ,base))" : "base"};
  }
  void main(){
   float depth=max(0.,vWPos.y-bedHeight(vWPos.xz));
   if(uFalling<.5&&depth<.015)discard;
   float phaseX=vWPos.x*.52+vWPos.z*.13+uTime*1.3,phaseZ=vWPos.z*.43-vWPos.x*.17+uTime*.9;
   vec3 n=normalize(vec3(cos(phaseX)*${WATER_ART_RULES.waveNormalStrength.toFixed(3)},1.,sin(phaseZ)*${WATER_ART_RULES.waveNormalStrength.toFixed(3)}));
   vec3 viewDir=normalize(cameraPosition-vWPos);
   float fres=pow(1.-clamp(dot(n,viewDir),0.,1.),3.);
   float shelf=1.-smoothstep(${WATER_ART_RULES.shallowMetres.toFixed(2)},${WATER_ART_RULES.deepMetres.toFixed(2)},depth);
   vec3 col=mix(uDeep,uColor,shelf*.88);
   col+=vec3(.12,.20,.24)*fres;
   float glint=pow(max(0.,dot(reflect(-uSunDirection,n),viewDir)),${WATER_ART_RULES.glintPower.toFixed(1)});
   col+=vec3(1.,.91,.69)*glint*.85;
   float shore=1.-smoothstep(.06,${WATER_ART_RULES.foamMetres.toFixed(2)},depth);
   float wash=.55+.45*sin(depth*12.-uTime*1.6+sin(vWPos.x*.8+vWPos.z*.6));
   float foam=shore*smoothstep(.35,.9,wash)*.28;
   float fallAlpha=1.;
   if(uFalling>.5){
    vec2 flow=vec2(vWaterUv.x*7.,vWaterUv.y*9.+uTime*1.7);
    float turbulence=flowNoise(flow*.65),strand=flowNoise(vec2(flow.x+turbulence*.9,flow.y*.6));
    float smallFlow=flowNoise(flow*vec2(2.1,1.4)+vec2(11.,-uTime*.8));
    float edgeWobble=(flowNoise(flow*vec2(.6,.4))-.5)*.12;
    float edge=smoothstep(.01,.09,vWaterUv.x+edgeWobble)*(1.-smoothstep(.91,.99,vWaterUv.x+edgeWobble));
    fallAlpha=edge*(.48+strand*.35)*( .7+.3*smallFlow);
    col=mix(vec3(.18,.39,.43),vec3(.74,.87,.87),.25+strand*.6);
    foam=smoothstep(.65,1.,1.-vWaterUv.y)*(.2+smallFlow*.45);
   }
   col=mix(col,vec3(.88,.94,.89),foam);
   float alpha=uFalling>.5?fallAlpha:mix(.77,.96,smoothstep(0.,5.,depth))+fres*.025;
   gl_FragColor=vec4(col*uLight,clamp(alpha,0.,.98));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
  }`
	});
}
/** One continuous grid shares every bend row. Variable-width mitered banks
* avoid the wedge-shaped dry gaps produced by independent segment quads. */
function riverWaterGeometry(points, width, caps) {
	if (caps) {
		const d = riverSurfaceData(points, width, caps), g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(d.positions, 3));
		g.setAttribute("uv", new BufferAttribute(d.uvs, 2));
		g.setIndex(new BufferAttribute(d.indices, 1));
		g.computeVertexNormals();
		g.computeBoundingSphere();
		return g;
	}
	const centers = [];
	let along = 0;
	for (let segment = 1; segment < points.length; segment++) {
		const a = points[segment - 1], b = points[segment], len = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(len / 2));
		for (let row = 0; row < steps; row++) {
			const t = row / steps;
			centers.push({
				x: a.x + (b.x - a.x) * t,
				y: a.y + (b.y - a.y) * t,
				z: a.z + (b.z - a.z) * t,
				w: (a.w ?? width) + ((b.w ?? width) - (a.w ?? width)) * t,
				distance: along + len * t
			});
		}
		along += len;
	}
	if (points.length) {
		const p = points[points.length - 1];
		centers.push({
			...p,
			w: p.w ?? width,
			distance: along
		});
	}
	const maximumWidth = Math.max(width, ...centers.map((p) => p.w)), columns = Math.max(2, Math.ceil(maximumWidth / 2)), stride = columns + 1;
	const positions = [], uvs = [], indices = [];
	for (let row = 0; row < centers.length; row++) {
		const p = centers[row], before = centers[Math.max(0, row - 1)], after = centers[Math.min(centers.length - 1, row + 1)];
		const inLen = Math.hypot(p.x - before.x, p.z - before.z) || 1, outLen = Math.hypot(after.x - p.x, after.z - p.z) || 1;
		let nx = -(p.z - before.z) / inLen - (after.z - p.z) / outLen, nz = (p.x - before.x) / inLen + (after.x - p.x) / outLen;
		const normalLen = Math.hypot(nx, nz) || 1;
		nx /= normalLen;
		nz /= normalLen;
		const segmentNx = row === centers.length - 1 ? -(p.z - before.z) / inLen : -(after.z - p.z) / outLen;
		const segmentNz = row === centers.length - 1 ? (p.x - before.x) / inLen : (after.x - p.x) / outLen;
		const miter = Math.min(1.6, 1 / Math.max(.625, nx * segmentNx + nz * segmentNz));
		for (let col = 0; col <= columns; col++) {
			const lateral = (col / columns - .5) * p.w * miter;
			positions.push(p.x + nx * lateral, p.y, p.z + nz * lateral);
			uvs.push(col / columns, p.distance / Math.max(1, width));
		}
		if (row) for (let col = 0; col < columns; col++) {
			const a = (row - 1) * stride + col, b = a + 1, c = row * stride + col, d = c + 1;
			indices.push(a, b, c, b, d, c);
		}
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
	geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
	return geometry;
}
/** Small river triangles are clipped against the exact physical lake footprint,
* eliminating the doubled transparent rectangle where a river enters its lake. */
function clippedRiverGeometry(points, width, lakes, caps) {
	if (!lakes.length) return riverWaterGeometry(points, width, caps);
	const out = [], uvs = [], inside = (p) => lakes.some((l) => lakeContains(l, p.x, p.z));
	const interpolate = (a, b, t) => ({
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
		z: a.z + (b.z - a.z) * t,
		u: a.u + (b.u - a.u) * t,
		v: a.v + (b.v - a.v) * t
	});
	const intersection = (a, b) => {
		let lo = 0, hi = 1;
		const first = inside(a);
		for (let i = 0; i < 18; i++) {
			const mid = (lo + hi) / 2;
			if (inside(interpolate(a, b, mid)) === first) lo = mid;
			else hi = mid;
		}
		return interpolate(a, b, (lo + hi) / 2);
	};
	const triangle = (verts, level = 0) => {
		const clipped = [];
		for (let i = 0; i < 3; i++) {
			const a = verts[i], b = verts[(i + 1) % 3], aIn = inside(a), bIn = inside(b);
			if (!aIn) clipped.push(a);
			if (aIn !== bIn) clipped.push(intersection(a, b));
		}
		for (let i = 1; i < clipped.length - 1; i++) {
			const a = clipped[0], b = clipped[i], c = clipped[i + 1], center = interpolate(interpolate(a, b, .5), c, 1 / 3);
			if (inside(center)) {
				if (level < 4) {
					const ab = interpolate(a, b, .5), bc = interpolate(b, c, .5), ca = interpolate(c, a, .5);
					for (const child of [
						[
							a,
							ab,
							ca
						],
						[
							ab,
							b,
							bc
						],
						[
							ca,
							bc,
							c
						],
						[
							ab,
							bc,
							ca
						]
					]) triangle(child, level + 1);
				}
				continue;
			}
			for (const p of [
				a,
				b,
				c
			]) {
				out.push(p.x, p.y, p.z);
				uvs.push(p.u, p.v);
			}
		}
	};
	const stitched = riverWaterGeometry(points, width, caps), position = stitched.attributes.position, uv = stitched.attributes.uv, index = stitched.index;
	const at = (i) => ({
		x: position.getX(i),
		y: position.getY(i),
		z: position.getZ(i),
		u: uv.getX(i),
		v: uv.getY(i)
	});
	for (let i = 0; i < index.count; i += 3) triangle([
		at(index.getX(i)),
		at(index.getX(i + 1)),
		at(index.getX(i + 2))
	]);
	stitched.dispose();
	const geo = new BufferGeometry();
	geo.setAttribute("position", new Float32BufferAttribute(out, 3));
	geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
	geo.computeVertexNormals();
	geo.computeBoundingSphere();
	return geo;
}
function addLocalWaters(group, bodies, falls, waterMaterial, fallMaterial) {
	const lakes = bodies.filter((body) => body.kind === "lake");
	for (const body of bodies) {
		let mesh;
		if (body.kind === "lake") {
			let geo;
			if (body.shoreline?.length) {
				const shape = new Shape();
				body.shoreline.forEach((p, i) => i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z));
				shape.closePath();
				geo = new ShapeGeometry(shape);
				geo.rotateX(-Math.PI / 2);
				mesh = new Mesh(geo, waterMaterial);
				mesh.position.y = body.surfaceY;
			} else {
				geo = new CircleGeometry(body.rx, 64);
				geo.rotateX(-Math.PI / 2);
				geo.scale(1, 1, body.rz / body.rx);
				mesh = new Mesh(geo, waterMaterial);
				mesh.position.set(body.x, body.surfaceY, body.z);
			}
		} else {
			if (body.pts.length < 2) continue;
			mesh = new Mesh(clippedRiverGeometry(body.pts, body.width, lakes, body.surfaceVersion === 2 ? body : void 0), waterMaterial);
		}
		mesh.name = `water-${body.kind}-${body.id}`;
		mesh.renderOrder = 1;
		mesh.raycast = () => {};
		group.add(mesh);
	}
	for (const [index, fall] of falls.entries()) {
		const geo = riverWaterGeometry(Array.from({ length: WATER_ART_RULES.fallSegments + 1 }, (_, i) => {
			const t = i / WATER_ART_RULES.fallSegments;
			return {
				x: fall.x + fall.dx * t,
				z: fall.z + fall.dz * t,
				y: fall.upperY + (fall.lowerY - fall.upperY) * t
			};
		}), fall.width);
		const fallUv = geo.attributes.uv;
		let maximumV = 1e-4;
		for (let i = 0; i < fallUv.count; i++) maximumV = Math.max(maximumV, fallUv.getY(i));
		for (let i = 0; i < fallUv.count; i++) fallUv.setY(i, 1 - fallUv.getY(i) / maximumV);
		const mesh = new Mesh(geo, fallMaterial);
		mesh.name = `waterfall-${index}`;
		mesh.renderOrder = 2;
		mesh.raycast = () => {};
		group.add(mesh);
	}
}
/** Each bundle represents up to 20 stored units, maximum eight per resource.
* These are inventory indicators at an unbuilt camp, never extra goods or fuel. */
var CAMP_VISUAL_RULES = {
	unitsPerBundle: 20,
	maxBundles: 8,
	refreshSeconds: .1,
	embersPerCamp: 6,
	emberEmissiveIntensity: 1.8
};
function campStockBundles(amount) {
	return Math.min(CAMP_VISUAL_RULES.maxBundles, Math.ceil(Math.max(0, amount) / CAMP_VISUAL_RULES.unitsPerBundle));
}
var CampVisual = class {
	meshes;
	embers;
	matrix = new Matrix4();
	position = new Vector3();
	rotation = new Quaternion();
	scale = new Vector3();
	scene;
	constructor(scene, campCapacity) {
		this.scene = scene;
		const geometry = new BoxGeometry(1, 1, 1);
		this.meshes = [
			"#b39b64",
			"#795438",
			"#92938a"
		].map((color) => {
			const mesh = new InstancedMesh(geometry, new MeshStandardMaterial({
				color,
				roughness: 1
			}), Math.max(1, campCapacity) * CAMP_VISUAL_RULES.maxBundles);
			mesh.count = 0;
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.frustumCulled = false;
			scene.add(mesh);
			return mesh;
		});
		this.embers = new InstancedMesh(geometry, new MeshStandardMaterial({
			color: "#9d4220",
			emissive: "#f06b20",
			emissiveIntensity: CAMP_VISUAL_RULES.emberEmissiveIntensity,
			roughness: 1
		}), Math.max(1, campCapacity) * CAMP_VISUAL_RULES.embersPerCamp);
		this.embers.name = "camp-embers";
		this.embers.count = 0;
		this.embers.frustumCulled = false;
		scene.add(this.embers);
	}
	sync(game) {
		const kinds = [
			"food",
			"wood",
			"stone"
		], counts = [
			0,
			0,
			0
		];
		let emberCount = 0;
		for (const camp of game.world.camps) {
			if (!game.tribe(camp.team).alive || !(camp.team === 0 ? game.exploredAt(camp.x, camp.z) : game.visibleAt(camp.x, camp.z)) || game.state.buildings.some((b) => b.team === camp.team && b.type === "townhall" && game.finished(b))) continue;
			if (game.state.survivalVersion === 1 && survivalFireActive(game, camp.team)) {
				const home = game.campOf(camp.team);
				for (let i = 0; i < CAMP_VISUAL_RULES.embersPerCamp && emberCount < this.embers.instanceMatrix.count; i++) {
					const a = i * Math.PI * 2 / CAMP_VISUAL_RULES.embersPerCamp, x = home.x + Math.cos(a) * .4, z = home.z - .8 + Math.sin(a) * .4, y = game.height(x, z);
					if (y < game.world.waterY + .3 || game.state.buildings.some((b) => game.solidBuilding(b) && Math.abs(x - b.x) < b.w * .4 && Math.abs(z - b.z) < b.d * .4)) continue;
					this.position.set(x, y + .1, z);
					this.scale.set(.28, .18, .28);
					this.matrix.compose(this.position, this.rotation, this.scale);
					this.embers.setMatrixAt(emberCount++, this.matrix);
				}
			}
			for (let kind = 0; kind < kinds.length; kind++) {
				const quantity = campStockBundles(game.tribe(camp.team)[kinds[kind]]), mesh = this.meshes[kind];
				for (let i = 0; i < quantity && counts[kind] < mesh.instanceMatrix.count; i++) {
					const x = camp.x + (kind - 1) * 1.5 + i % 2 * .48, z = camp.z + 1.1 + Math.floor(i / 2) * .46;
					const y = game.height(x, z);
					if (y < game.world.waterY + .3) continue;
					this.position.set(x, y + .22, z);
					this.scale.set(kind === 1 ? .75 : .4, kind === 2 ? .28 : .42, .36);
					this.matrix.compose(this.position, this.rotation, this.scale);
					mesh.setMatrixAt(counts[kind]++, this.matrix);
				}
			}
		}
		for (let i = 0; i < 3; i++) {
			this.meshes[i].count = counts[i];
			this.meshes[i].instanceMatrix.needsUpdate = true;
		}
		this.embers.count = emberCount;
		this.embers.instanceMatrix.needsUpdate = true;
	}
	dispose() {
		this.meshes[0].geometry.dispose();
		for (const mesh of [...this.meshes, this.embers]) {
			this.scene.remove(mesh);
			mesh.material.dispose();
			mesh.dispose();
		}
	}
};
/** Render-only controls: distances/elevations in world metres, grade in m/m.
* Changes never mutate terrain, deposits, navigation or saved villages. */
var LANDSCAPE_ART_RULES = {
	provinceMetres: 240,
	exposedGrade: .32,
	bareGrade: .85,
	strataMetres: 4.5,
	strataContrast: .055,
	aspectContrast: .1,
	rockBlend: .78
};
/** Connected rock provinces and contour-following strata, sampled once per terrain rebuild. */
function landscapeSample(seed, x, z, height, dx, dz) {
	const rules = LANDSCAPE_ART_RULES, grade = Math.hypot(dx, dz);
	const exposure = Math.max(0, Math.min(1, (grade - rules.exposedGrade) / (rules.bareGrade - rules.exposedGrade)));
	const province = fbm(x / rules.provinceMetres + seed % 997, z / rules.provinceMetres - seed % 619, 3);
	const warm = Math.max(0, Math.min(1, (province - .36) / .28));
	const strata = Math.sin(height / rules.strataMetres * Math.PI * 2) * rules.strataContrast;
	const shade = 1 + Math.max(-1, Math.min(1, (dx * .65 - dz * .75) / Math.max(.4, grade))) * rules.aspectContrast * exposure;
	return {
		exposure,
		r: .68 + warm * .1 + strata,
		g: .69 - warm * .13 + strata * .8,
		b: .66 - warm * .22 + strata * .55,
		shade
	};
}
/** Fog density is inverse metres. Clear daylight keeps the work yard crisp while
* distant ridges converge toward a cool atmospheric color. No extra render pass. */
var ATMOSPHERE_RULES = {
	clearDensity: .0023,
	nightDensity: .003,
	weatherDensity: {
		mist: .0078,
		rain: .0052,
		storm: .009,
		flood: .0074,
		drought: .0044,
		frost: .0064
	},
	coolDistance: "#b9cedb",
	coolSky: "#cedff0",
	coolGround: "#526175",
	distanceMix: .32,
	skyMix: .34,
	daylightFill: .55,
	elevatedFill: .2
};
function atmosphericDensity(weather, night, snow) {
	return Math.max(ATMOSPHERE_RULES.weatherDensity[weather] ?? (night ? ATMOSPHERE_RULES.nightDensity : ATMOSPHERE_RULES.clearDensity), snow > .45 ? .0064 : 0);
}
var FieldSurface = class {
	excavations;
	sharedCuts;
	banks;
	texture;
	segments;
	size;
	depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
	constructor(heights, size = MAP, banks, cuts) {
		this.banks = banks;
		this.sharedCuts = !!cuts;
		this.size = size;
		this.excavations = cuts ?? new ExcavationSurface(size);
		this.segments = Math.round(Math.sqrt(heights.length)) - 1;
		this.texture = new DataTexture(heights, this.segments + 1, this.segments + 1, RedFormat, FloatType);
		this.texture.minFilter = this.texture.magFilter = NearestFilter;
		this.texture.generateMipmaps = false;
		this.texture.needsUpdate = true;
		this.bind(this.depth);
	}
	bind(material, options = {}) {
		material.customProgramCacheKey = () => (options.furrows ? "hearth-contour-field-v3-cuts" : "hearth-field-surface-v2-cuts") + (this.banks ? `-banks-v19-${this.size}-${this.banks.gridSubdivisions}` : "");
		material.onBeforeCompile = (shader) => {
			this.excavations.bind(shader);
			this.banks?.bind(shader);
			shader.uniforms.fieldHeights = { value: this.texture };
			shader.vertexShader = `
        ${options.furrows ? "attribute vec4 fieldRows;varying vec4 vFieldRows;varying vec2 vFieldWorldXZ;" : ""}
        ${this.banks?.glsl ?? ""}
        ${this.excavations.glsl}
        uniform sampler2D fieldHeights;
        float fieldHeight(vec2 worldXZ) {
          vec2 grid = clamp((worldXZ / ${this.size.toFixed(1)} + .5) * ${this.segments.toFixed(1)}, vec2(0.), vec2(${this.segments.toFixed(1)}));
          vec2 cell = min(floor(grid), vec2(${(this.segments - 1).toFixed(1)}));
          vec2 f = grid - cell;
          vec2 uv = (cell + .5) / ${(this.segments + 1).toFixed(1)};
          float stepUV = 1. / ${(this.segments + 1).toFixed(1)};
          float a = texture2D(fieldHeights, uv).r;
          float b = texture2D(fieldHeights, uv + vec2(stepUV, 0.)).r;
          float c = texture2D(fieldHeights, uv + vec2(0., stepUV)).r;
          float d = texture2D(fieldHeights, uv + vec2(stepUV)).r;
          // Match the terrain plane's actual triangles, including valley creases.
          float baseHeight=f.x + f.y <= 1. ? a + (b-a)*f.x + (c-a)*f.y
            : d + (c-d)*(1.-f.x) + (b-d)*(1.-f.y);
          return refinedExcavationHeight(worldXZ,${this.banks ? "refinedBankHeight(worldXZ,baseHeight)" : "baseHeight"});
        }
      ` + shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
        #include <begin_vertex>
        mat4 fieldMatrix = modelMatrix;
        #ifdef USE_INSTANCING
          fieldMatrix = modelMatrix * instanceMatrix;
        #endif
        vec3 fieldWorld = (fieldMatrix * vec4(transformed, 1.)).xyz;
        ${options.furrows ? "vFieldRows=fieldRows;vFieldWorldXZ=fieldWorld.xz;" : ""}
        transformed.y += (fieldHeight(fieldWorld.xz) - fieldMatrix[3].y) / max(abs(fieldMatrix[1].y), .00001);
      `);
			if (options.furrows) {
				shader.fragmentShader = "varying vec4 vFieldRows;varying vec2 vFieldWorldXZ;\n" + shader.fragmentShader;
				shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
          float fieldAcross=dot(vFieldWorldXZ,vFieldRows.xy)+vFieldRows.z;
          float fieldBand=.5+.5*cos(fieldAcross/max(.3,vFieldRows.w)*6.28318530718);
          diffuseColor.rgb*=.86+.20*fieldBand;
        `);
			}
		};
	}
	dispose() {
		this.texture.dispose();
		this.depth.dispose();
		if (!this.sharedCuts) this.excavations.dispose();
	}
};
/** Art direction is independent of the astronomical clock and work schedules. */
function daylightArt(weather, night, winter, elevation) {
	const season = 1 - Math.max(0, Math.min(1, winter));
	const warmth = night ? 0 : season * (weather === "storm" || weather === "flood" ? 0 : weather === "rain" ? .15 : weather === "mist" ? .35 : .9);
	return {
		warmth,
		sunElevation: elevation * (1 - warmth) + Math.min(elevation, .42) * warmth
	};
}
/** Visual shoreline follows actual water and low banks, never a radial island mask. */
function shorelineAt(height, x, z, water) {
	const h = height(x, z);
	if (h <= water + .32 || h > water + 1.2) return false;
	return [
		[8, 0],
		[-8, 0],
		[0, 8],
		[0, -8]
	].some(([dx, dz]) => height(x + dx, z + dz) < water - .05);
}
/** Era materials with a stable local palette. These change presentation only:
* building identity, footprint, storage, pathfinding and saved progress stay put. */
function architectureStyle(seed, team, age, habitat = "plains") {
	const era = Math.max(0, Math.min(5, Math.floor(age)));
	const variant = (Math.abs(Math.imul(seed ^ team, 2654435761)) >>> 0) % 4;
	const roofs = [
		[
			"#e2bb70",
			"#dba080",
			"#b5c690",
			"#dfbf88"
		],
		[
			"#d59a62",
			"#c97b62",
			"#8dab9b",
			"#ddba77"
		],
		[
			"#865f46",
			"#985f48",
			"#73818a",
			"#947b66"
		],
		[
			"#b97150",
			"#a55f4c",
			"#7b8b91",
			"#c28863"
		],
		[
			"#706477",
			"#86564a",
			"#637e87",
			"#85715d"
		],
		[
			"#987257",
			"#b36a50",
			"#78929d",
			"#bd9870"
		]
	];
	const walls = [
		"#dfc599",
		"#ead3ad",
		"#aa9e86",
		"#ddd3bc",
		"#c5b594",
		"#e2dbc8"
	];
	const trim = [
		"#907354",
		"#b49b75",
		"#777e77",
		"#cbc2ad",
		"#64523c",
		"#9b9c93"
	];
	const localWalls = {
		plains: walls,
		forest: [
			"#c5aa80",
			"#d1b58a",
			"#a3947d",
			"#c8b99b",
			"#baa988",
			"#d5c7aa"
		],
		hills: [
			"#c9c1aa",
			"#d7cbb5",
			"#a9aaa0",
			"#d1d1c3",
			"#b7b5a3",
			"#dcdad0"
		]
	};
	return {
		roof: roofs[era][variant],
		timber: localWalls[habitat][era],
		roofHeight: [
			1,
			1.035,
			1.075,
			1.1,
			1.17,
			1.21
		][era],
		trim: trim[era],
		era,
		variant
	};
}
function localArchitecture(seed, team, age, point, halls, biomes, cache) {
	const own = halls.filter((h) => h.team === team);
	let home = own[0], nearest = Infinity;
	for (const h of own) {
		const d = (h.x - point.x) ** 2 + (h.z - point.z) ** 2;
		if (d < nearest) {
			nearest = d;
			home = h;
		}
	}
	const center = home ?? point;
	let habitat = "plains", distance = Infinity;
	for (const b of biomes) {
		const d = (b.x - center.x) ** 2 + (b.z - center.z) ** 2;
		if (d < distance) {
			distance = d;
			habitat = b.kind;
		}
	}
	const localSeed = home && home !== own[0] ? seed ^ Math.imul(home.id, 73244475) : seed;
	const key = `${seed}/${team}/${age}/${own[0]?.id ?? 0}/${home?.id ?? 0}/${habitat}`;
	let style = cache?.get(key);
	if (!style) {
		style = architectureStyle(localSeed, team, age, habitat);
		cache?.set(key, style);
	}
	return {
		key,
		style
	};
}
/** GW-12 smooth, less pronounced trails (Grok W-World, W7). Pure query, no save
* state and no change to `wearTrail` / `pathPace`. Claude opts in by drawing
* these ribbons instead of one instanced ellipse per 4 m cell.
*
* Adjacent worn cells are chained by position and heading, then Chaikin-smoothed.
* Display wear is scaled down so packed earth reads as a narrow path, not a
* wide tile stamp. Gameplay speed along the trail is unchanged. */
var TRAIL_RIBBON_RULES = {
	version: 1,
	minWear: .25,
	linkMetres: 6,
	headingLimit: .7,
	chaikinPasses: 2,
	displayScale: .45,
	minDisplayWear: .08,
	maxWidthMetres: 1.15,
	cellWidthFactor: .65
};
function trailDisplayWear(wear) {
	const R = TRAIL_RIBBON_RULES;
	return wear <= 0 ? 0 : Math.min(1, Math.max(R.minDisplayWear, wear * R.displayScale));
}
function locate(t, size) {
	const cell = size / 256, ix = t.cell % 256, iz = Math.floor(t.cell / 256), cx = (ix + .5) * cell - size / 2, cz = (iz + .5) * cell - size / 2;
	const x = t.x ?? cx, z = t.z ?? cz;
	if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
	return {
		...t,
		x,
		z
	};
}
function chaikin$1(pts, passes) {
	let cur = pts;
	for (let p = 0; p < passes; p++) {
		if (cur.length < 3) break;
		const next = [cur[0]];
		for (let i = 0; i < cur.length - 1; i++) {
			const a = cur[i], b = cur[i + 1];
			const mix = (t) => {
				const ang = a.angle + Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle)) * t;
				return {
					x: a.x + (b.x - a.x) * t,
					z: a.z + (b.z - a.z) * t,
					wear: a.wear + (b.wear - a.wear) * t,
					displayWear: trailDisplayWear(a.wear + (b.wear - a.wear) * t),
					angle: Math.atan2(Math.sin(ang), Math.cos(ang))
				};
			};
			next.push(mix(.25), mix(.75));
		}
		next.push(cur.at(-1));
		cur = next;
	}
	return cur;
}
function compatible(a, b) {
	const R = TRAIL_RIBBON_RULES, d = Math.hypot(b.x - a.x, b.z - a.z);
	if (d > R.linkMetres || d < 1e-4) return false;
	const path = Math.atan2(b.x - a.x, b.z - a.z), delta = (h) => Math.abs(Math.atan2(Math.sin(h), Math.cos(h)));
	return Math.min(delta(path - a.angle), delta(path - a.angle - Math.PI), delta(path - b.angle), delta(path - b.angle - Math.PI)) <= R.headingLimit;
}
function extend(used, from, all, dir) {
	const out = [];
	let cur = from;
	for (;;) {
		let best = null, bd = Infinity;
		for (const t of all) {
			if (used.has(t) || t === cur) continue;
			if (!compatible(cur, t)) continue;
			const d = Math.hypot(t.x - cur.x, t.z - cur.z);
			if (d < bd) {
				bd = d;
				best = t;
			}
		}
		if (!best) break;
		used.add(best);
		if (dir > 0) out.push(best);
		else out.unshift(best);
		cur = best;
	}
	return out;
}
function asPoint(t) {
	return {
		x: t.x,
		z: t.z,
		wear: t.wear,
		displayWear: trailDisplayWear(t.wear),
		angle: t.angle
	};
}
function lengthOf(pts) {
	let L = 0;
	for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
	return L;
}
/** Continuous, fainter ribbons from the saved trail cells. Does not write state. */
function trailRibbons(g) {
	const R = TRAIL_RIBBON_RULES, size = g.world.size ?? 1040, all = (g.state.trails || []).map((t) => locate(t, size)).filter((t) => !!t && t.wear >= R.minWear);
	const used = /* @__PURE__ */ new Set(), ribbons = [];
	const ordered = all.slice().sort((a, b) => b.wear - a.wear || a.cell - b.cell);
	for (const seed of ordered) {
		if (used.has(seed)) continue;
		used.add(seed);
		const points = chaikin$1([
			...extend(used, seed, all, -1),
			seed,
			...extend(used, seed, all, 1)
		].map(asPoint), R.chaikinPasses), wear = points.reduce((a, p) => a + p.wear, 0) / Math.max(1, points.length);
		const cell = size / 256, width = Math.min(R.maxWidthMetres, cell * R.cellWidthFactor * (.55 + trailDisplayWear(wear) * .45));
		ribbons.push({
			points,
			lengthMetres: +lengthOf(points).toFixed(2),
			widthMetres: +width.toFixed(3)
		});
	}
	return ribbons;
}
/** GW-12 smooth river display (Grok W-World, W7). Pure query, no save state,
* no terrain edits, no change to wet/dry or pathing. Historic worlds stay
* byte-identical. Claude opts in by drawing these polylines in place of the
* raw centreline / a stairstep bank mesh.
*
* Banks are traced on the real waterline (height vs waterAt), then lightly
* smoothed. Each smoothed bank point is clamped so it cannot wander more than
* `maxDisplayDeviationMetres` from the physical edge: the visible water stays
* consistent with the wet surface. */
var CHANNEL_SMOOTH_RULES = {
	version: 1,
	sampleMetres: 3,
	bankStepMetres: .25,
	bankSearchPadMetres: 4,
	wetDepthMetres: .05,
	maxDisplayDeviationMetres: .75,
	chaikinPasses: 2,
	axisRadians: .0873,
	widthJumpMetres: 2
};
var rivers = (g) => (g.world.waterBodies || []).filter((b) => b.kind === "river");
var wet = (g, x, z) => g.height(x, z) < g.waterAt(x, z) + CHANNEL_SMOOTH_RULES.wetDepthMetres;
function resample(path, step) {
	const d = [0];
	for (let i = 1; i < path.length; i++) d.push(d[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
	const L = d.at(-1), n = Math.max(2, Math.ceil(L / step)), out = [];
	let j = 1;
	for (let i = 0; i <= n; i++) {
		const t = L * i / n;
		while (j < path.length - 1 && d[j] < t) j++;
		const u = (t - d[j - 1]) / Math.max(1e-9, d[j] - d[j - 1]), a = path[j - 1], b = path[j];
		out.push({
			x: a.x + (b.x - a.x) * u,
			z: a.z + (b.z - a.z) * u
		});
	}
	return {
		points: out,
		length: L
	};
}
function chaikin(pts, passes) {
	let cur = pts.slice();
	for (let p = 0; p < passes; p++) {
		if (cur.length < 3) break;
		const next = [cur[0]];
		for (let i = 0; i < cur.length - 1; i++) {
			const a = cur[i], b = cur[i + 1];
			next.push({
				x: a.x * .75 + b.x * .25,
				z: a.z * .75 + b.z * .25
			}, {
				x: a.x * .25 + b.x * .75,
				z: a.z * .25 + b.z * .75
			});
		}
		next.push(cur.at(-1));
		cur = next;
	}
	return cur;
}
function heading(a, b) {
	return Math.atan2(b.z - a.z, b.x - a.x);
}
function axisAligned(h) {
	const t = CHANNEL_SMOOTH_RULES.axisRadians, wrap = (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
	return Math.min(wrap(h), wrap(h - Math.PI / 2), wrap(h - Math.PI), wrap(h + Math.PI / 2)) <= t;
}
function nearestDist(p, path) {
	let best = Infinity;
	for (let i = 1; i < path.length; i++) {
		const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
		best = Math.min(best, Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz));
	}
	return best;
}
function clampPath(smooth, raw, maxDev) {
	if (raw.length < 2) return smooth.slice();
	return smooth.map((p) => {
		const d = nearestDist(p, raw);
		if (d <= maxDev || d < 1e-9) return p;
		let best = raw[0], bd = Infinity;
		for (const q of raw) {
			const k = Math.hypot(p.x - q.x, p.z - q.z);
			if (k < bd) {
				bd = k;
				best = q;
			}
		}
		const t = maxDev / d;
		return {
			x: best.x + (p.x - best.x) * t,
			z: best.z + (p.z - best.z) * t
		};
	});
}
function designedWidth(river, s) {
	let acc = 0;
	for (let k = 1; k < river.pts.length; k++) {
		const a = river.pts[k - 1], b = river.pts[k], seg = Math.hypot(b.x - a.x, b.z - a.z);
		if (acc + seg >= s || k === river.pts.length - 1) {
			const u = seg ? Math.max(0, Math.min(1, (s - acc) / seg)) : 0;
			return (a.w ?? river.width) + ((b.w ?? river.width) - (a.w ?? river.width)) * u;
		}
		acc += seg;
	}
	return river.width;
}
function edge(g, x, z, nx, nz, limit) {
	const step = CHANNEL_SMOOTH_RULES.bankStepMetres;
	let last = 0;
	for (let o = 0; o <= limit + 1e-9; o += step) {
		if (!wet(g, x + nx * o, z + nz * o)) return last;
		last = o;
	}
	return last;
}
/** Physical banks at regular stations along the designed centreline. */
function riverBankSamples(g, river) {
	const R = CHANNEL_SMOOTH_RULES, { points } = resample(river.pts, R.sampleMetres), out = [];
	let s = 0;
	for (let i = 0; i < points.length; i++) {
		const p = points[i], q = points[Math.min(points.length - 1, i + 1)], prev = points[Math.max(0, i - 1)];
		const dx = q.x - prev.x, dz = q.z - prev.z, len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len, limit = designedWidth(river, s) * .5 + R.bankSearchPadMetres, isWet = wet(g, p.x, p.z);
		const left = isWet ? edge(g, p.x, p.z, -nx, -nz, limit) : 0, right = isWet ? edge(g, p.x, p.z, nx, nz, limit) : 0;
		out.push({
			x: p.x,
			z: p.z,
			s,
			width: left + right,
			left: {
				x: p.x - nx * left,
				z: p.z - nz * left
			},
			right: {
				x: p.x + nx * right,
				z: p.z + nz * right
			},
			wet: isWet
		});
		if (i + 1 < points.length) s += Math.hypot(q.x - p.x, q.z - p.z);
	}
	return out;
}
function jitter(path) {
	if (path.length < 5) return {
		mean: 0,
		max: 0
	};
	const sm = chaikin(path, 3);
	let sum = 0, max = 0, n = 0;
	for (const p of path) {
		const d = nearestDist(p, sm);
		sum += d;
		max = Math.max(max, d);
		n++;
	}
	return {
		mean: n ? sum / n : 0,
		max
	};
}
function staircase(path) {
	let axis = 0, n = 0;
	for (let i = 1; i < path.length; i++) {
		if (Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z) < .2) continue;
		n++;
		if (axisAligned(heading(path[i - 1], path[i]))) axis++;
	}
	return n ? axis / n : 0;
}
function jumps(widths) {
	const J = CHANNEL_SMOOTH_RULES.widthJumpMetres;
	let n = 0;
	for (let i = 1; i < widths.length; i++) if (Math.abs(widths[i] - widths[i - 1]) >= J) n++;
	return n;
}
function channelMetrics(samples) {
	const wetS = samples.filter((s) => s.wet), widths = wetS.map((s) => s.width), mean = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 0;
	const varc = widths.length ? widths.reduce((a, w) => a + (w - mean) ** 2, 0) / widths.length : 0;
	const left = wetS.map((s) => s.left), right = wetS.map((s) => s.right), jl = jitter(left), jr = jitter(right);
	return {
		samples: samples.length,
		wetSamples: wetS.length,
		meanWidthMetres: +mean.toFixed(3),
		widthCv: +(mean > 1e-6 ? Math.sqrt(varc) / mean : 0).toFixed(3),
		widthJumps: jumps(widths),
		staircaseFraction: +((staircase(left) + staircase(right)) / 2).toFixed(3),
		meanBankJitterMetres: +((jl.mean + jr.mean) / 2).toFixed(3),
		maxBankJitterMetres: +Math.max(jl.max, jr.max).toFixed(3)
	};
}
/** Smoothed banks and centreline for one river, clamped to the physical waterline. */
function smoothRiverDisplay(g, river) {
	const R = CHANNEL_SMOOTH_RULES, raw = riverBankSamples(g, river), wetS = raw.filter((s) => s.wet), rawMetrics = channelMetrics(raw);
	const leftRaw = wetS.map((s) => s.left), rightRaw = wetS.map((s) => s.right);
	const left = clampPath(chaikin(leftRaw, R.chaikinPasses), leftRaw, R.maxDisplayDeviationMetres);
	const right = clampPath(chaikin(rightRaw, R.chaikinPasses), rightRaw, R.maxDisplayDeviationMetres);
	const n = Math.min(left.length, right.length), center = [], widths = [], leftO = [], rightO = [];
	for (let i = 0; i < n; i++) {
		const a = left[i], b = right[i];
		leftO.push(a);
		rightO.push(b);
		center.push({
			x: (a.x + b.x) / 2,
			z: (a.z + b.z) / 2
		});
		widths.push(Math.hypot(b.x - a.x, b.z - a.z));
	}
	let maxDev = 0;
	for (const p of leftO) maxDev = Math.max(maxDev, nearestDist(p, leftRaw));
	for (const p of rightO) maxDev = Math.max(maxDev, nearestDist(p, rightRaw));
	const smoothSamples = center.map((p, i) => ({
		x: p.x,
		z: p.z,
		s: 0,
		width: widths[i],
		left: leftO[i],
		right: rightO[i],
		wet: true
	}));
	return {
		id: river.id,
		width: river.width,
		center,
		left: leftO,
		right: rightO,
		widths,
		raw: rawMetrics,
		smooth: channelMetrics(smoothSamples),
		maxBankDeviationMetres: +maxDev.toFixed(3)
	};
}
function smoothRivers(g) {
	return rivers(g).map((r) => smoothRiverDisplay(g, r));
}
var CIVILIAN_ART_RULES = {
	maximumTrianglesPerRole: 5500,
	wallSides: 12,
	roofCourses: 5,
	roofEdgeIrregularityMetres: .055
};
function box$4(w, h, d, x, y, z) {
	return new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}
function beam$1(ax, ay, az, bx, by, bz, r = .11) {
	const a = new Vector3(ax, ay, az), delta = new Vector3(bx, by, bz).clone().sub(a), g = new CylinderGeometry(r * .88, r, delta.length(), 5);
	g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()));
	return g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
}
function merge$3(parts) {
	const gs = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	}), out = mergeGeometries(gs);
	for (const g of gs) g.dispose();
	out.computeVertexNormals();
	out.computeBoundingBox();
	return out;
}
function pitchedRoof(w, d, eave, rise, axis = "z") {
	const parts = [];
	const n = CIVILIAN_ART_RULES.roofCourses;
	for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
		const t = i / n, span = w / 2 / n * 1.18, g = new BoxGeometry(span, .16, d + .2 + .04 * Math.sin(i * 2 + side));
		g.rotateZ(-side * Math.atan2(rise, w / 2));
		g.translate(side * (w / 2 - span / 2 - i * w / 2 / n), eave + rise * (t + .5 / n), 0);
		parts.push(g);
	}
	if (axis === "x") for (const p of parts) p.rotateY(Math.PI / 2);
	return merge$3(parts);
}
function bench(x, z, w = 1.35, d = .65, h = .8) {
	return [box$4(w, .15, d, x, h, z), ...[-1, 1].flatMap((a) => [-1, 1].map((b) => beam$1(x + a * w * .4, 0, z + b * d * .35, x + a * w * .4, h, z + b * d * .35, .07)))];
}
function hut() {
	const walls = [], frame = [], roof = [];
	const sides = CIVILIAN_ART_RULES.wallSides;
	for (let i = 0; i < sides; i++) {
		const angle = (i + .5) * Math.PI * 2 / sides;
		if (Math.cos(angle) > .85) continue;
		const x = Math.sin(angle) * 2.04, z = Math.cos(angle) * 1.94, g = box$4(1.12, 1.85, .18, 0, 0, 0);
		g.rotateY(angle);
		g.translate(x, 0, z);
		walls.push(g);
		frame.push(beam$1(x, 0, z, x + .025 * Math.sin(i), 1.96, z, .075));
	}
	frame.push(beam$1(-.72, 0, 1.8, -.68, 1.88, 1.8, .13), beam$1(.72, 0, 1.8, .68, 1.88, 1.8, .13), beam$1(-.75, 1.88, 1.8, .75, 1.88, 1.8, .13));
	for (let i = 0; i < 5; i++) {
		const lower = 2.58 - i * .4, upper = i === 4 ? .04 : Math.max(.08, lower - .54), h = .39, g = new CylinderGeometry(upper, lower, h, 12, 1, true);
		const p = g.getAttribute("position");
		for (let j = 0; j < p.count; j++) {
			const x = p.getX(j), z = p.getZ(j), f = 1 + .012 * Math.sin(x * 5 + z * 2 + i);
			p.setXYZ(j, x * f, p.getY(j), z * f * .95);
		}
		g.translate(.025 * Math.sin(i), 1.9 + i * .32 + h / 2, .025 * Math.cos(i));
		roof.push(g);
	}
	return {
		timber: merge$3(walls),
		roof: merge$3(roof),
		extra: merge$3(frame),
		extraMat: "timber",
		timberMat: "plaster"
	};
}
function townhall() {
	const walls = [], frame = [];
	const w = 7.2, d = 6.8, h = 2.6;
	for (const x of [-7.2 / 2, w / 2]) walls.push(box$4(.18, h, d, x, 0, 0));
	walls.push(box$4(w, h, .18, 0, 0, -6.8 / 2), box$4(2.65, h, .18, -2.275, 0, d / 2), box$4(2.65, h, .18, 2.275, 0, d / 2), box$4(1.9, .6, .18, 0, 2, d / 2));
	for (const x of [
		-3.65,
		-.95,
		.95,
		3.65
	]) for (const z of [-3.45, 3.45]) frame.push(beam$1(x, 0, z, x, 2.8, z, .12));
	for (const z of [-3.45, 3.45]) frame.push(beam$1(-3.65, 2.65, z, 3.65, 2.65, z, .13), beam$1(-3.5, .3, z, -1, 2.55, z, .09), beam$1(1, 2.55, z, 3.5, .3, z, .09));
	for (const x of [-3.7, 3.7]) frame.push(beam$1(x, .2, -3.3, x, 2.55, -.5, .08), beam$1(x, 2.55, .5, x, .2, 3.3, .08));
	return {
		timber: merge$3(walls),
		roof: pitchedRoof(8.4, 7.65, 2.65, 1.6),
		extra: merge$3(frame),
		extraMat: "timber",
		timberMat: "plaster"
	};
}
function warehouse() {
	const body = [box$4(5.4, .2, 4.4, 0, .68, 0)], frame = [];
	for (const x of [
		-2.5,
		0,
		2.5
	]) for (const z of [-1.95, 1.95]) if (x !== 0 || z < 0) body.push(beam$1(x, 0, z, x, 2.65, z, .14));
	for (const z of [-2.15, 2.15]) for (let course = 0; course < 6; course++) {
		const y = .9 + course * .25;
		if (z > 0) body.push(box$4(1.8, .17, .13, -1.7, y, z), box$4(1.8, .17, .13, 1.7, y, z));
		else body.push(box$4(5.4, .17, .13, 0, y, z));
	}
	for (const x of [-2.65, 2.65]) for (let i = 0; i < 6; i++) body.push(box$4(.13, .17, 4.25, x, .9 + i * .25, 0));
	frame.push(beam$1(-2.6, .85, 2.3, -2.6, 2.6, 2.3, .1), beam$1(2.6, .85, 2.3, 2.6, 2.6, 2.3, .1));
	return {
		timber: merge$3(body),
		roof: pitchedRoof(6.35, 5.7, 2.5, 1.25),
		extra: merge$3(frame),
		extraMat: "dark"
	};
}
function workshop() {
	const parts = [];
	for (const x of [-2.15, 2.15]) for (const z of [-1.8, 1.8]) parts.push(beam$1(x, 0, z, x + .04, 2.65, z, .1), beam$1(x, .2, z, x * .6, 2.55, z, .075));
	parts.push(...bench(-1.25, -.65, 1.25, 1.05), ...bench(1.25, -.65, 1.25, 1.05), ...bench(0, 1.2, 1.75, .65));
	const emptyLedge = [
		box$4(3.8, .1, .45, 0, .55, -1.65),
		box$4(.08, .9, .08, -1.8, .6, -1.7),
		box$4(.08, .9, .08, 1.8, .6, -1.7)
	];
	return {
		timber: merge$3(parts),
		roof: pitchedRoof(5.15, 4.55, 2.65, .65),
		extra: merge$3(emptyLedge),
		extraMat: "dark"
	};
}
function lumber() {
	const parts = [];
	for (const x of [-2.3, 1.7]) for (const z of [-1.65, .6]) parts.push(beam$1(x, 0, z, x, 2.35, z, .11));
	parts.push(beam$1(-2.3, .2, -1.65, -.9, 2.3, -1.65, .085), beam$1(.3, 2.3, -1.65, 1.7, .2, -1.65, .085));
	for (const x of [-1, 1]) parts.push(beam$1(x, 0, 1, x, .85, 1.6, .095), beam$1(x, 0, 2.1, x, .85, 1.55, .095), beam$1(x, .75, 1.1, x, .75, 2, .08));
	parts.push(beam$1(-1.2, .8, 1.55, 1.2, .8, 1.55, .085));
	const roof = new BoxGeometry(4.8, .18, 3.1).rotateX(-.16).translate(-.3, 2.4, -.55);
	return {
		timber: merge$3(parts),
		roof,
		extra: merge$3([new CylinderGeometry(.5, .58, .48, 9).translate(2.1, .24, 1.65)]),
		extraMat: "timber"
	};
}
function quarry() {
	const parts = [
		beam$1(-1.7, 0, -1.5, -.7, 3.1, -1.5, .14),
		beam$1(1.7, 0, -1.5, .7, 3.1, -1.5, .14),
		beam$1(-1.7, 0, -1.5, 1.7, 0, -1.5, .12),
		beam$1(-.8, 2.9, -1.5, .8, 2.9, -1.5, .15),
		...bench(1.2, .8, 1.4, .9, .65)
	];
	const stone = [new CylinderGeometry(.55, .67, .2, 7).translate(-1.1, .1, .75), box$4(.8, .15, .65, 1.2, .84, .8)];
	parts.push(box$4(2.5, .35, .12, -.8, 0, 1.95), box$4(.12, .35, 1.3, -1.95, 0, 1.35), box$4(.12, .35, 1.3, .35, 0, 1.35));
	return {
		timber: merge$3(parts),
		roof: merge$3([beam$1(-.08, 1.55, -1.5, .08, 2.85, -1.5, .045)]),
		extra: merge$3(stone),
		extraMat: "stone",
		roofMat: "dark"
	};
}
/** Fit the physical model, including all existing society transforms and the
* bounded upper variation, inside the unchanged navigation rectangle. */
function fitCivilianFootprint(type, kit) {
	const spec = BUILDINGS[type];
	let scale = 1;
	for (const style of TEAM_STYLE) for (const geometry of [
		kit.timber,
		kit.roof,
		kit.extra
	]) {
		if (!geometry) continue;
		const p = geometry.getAttribute("position"), c = Math.cos(style.yaw), s = Math.sin(style.yaw);
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i) * style.sx, z = p.getZ(i) * style.sz, wx = Math.abs(x * c + z * s), wz = Math.abs(z * c - x * s);
			if (wx > 0) scale = Math.min(scale, (spec.w / 2 - .12) / wx);
			if (wz > 0) scale = Math.min(scale, (spec.d / 2 - .12) / wz);
		}
	}
	for (const geometry of [
		kit.timber,
		kit.roof,
		kit.extra
	]) if (geometry) {
		geometry.scale(scale, 1, scale);
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();
	}
	if (kit.entry) kit.entry = {
		x: kit.entry.x * scale,
		z: kit.entry.z * scale,
		width: kit.entry.width * scale
	};
	return kit;
}
function civilianBuildingGeos() {
	const result = {
		hut: hut(),
		townhall: townhall(),
		warehouse: warehouse(),
		workshop: workshop(),
		lumber: lumber(),
		quarry: quarry()
	};
	result.hut.entry = {
		x: 0,
		z: 1.8,
		width: 1.35
	};
	result.townhall.entry = {
		x: 0,
		z: 3.4,
		width: 1.8
	};
	for (const role of Object.keys(result)) fitCivilianFootprint(role, result[role]);
	return result;
}
function box$3(w, h, d, x, y, z) {
	return new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}
function merge$2(parts) {
	const gs = parts.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	}), out = mergeGeometries(gs);
	gs.forEach((g) => g.dispose());
	out.computeBoundingBox();
	out.computeBoundingSphere();
	return out;
}
/** Original compact timber-frame/earth-infill home. Structural surfaces and
* empty interior only; delivered game materials are not decorative stock. */
function improvedHomeGeo() {
	const wall = [], frame = [], roof = [];
	wall.push(box$3(4.2, 2.2, .17, 0, 0, -1.8), box$3(1.45, 2.2, .17, -1.38, 0, 1.8), box$3(1.45, 2.2, .17, 1.38, 0, 1.8), box$3(1.3, .45, .17, 0, 1.75, 1.8));
	for (const x of [-2.1, 2.1]) wall.push(box$3(.17, .75, 3.6, x, 0, 0), box$3(.17, .65, 3.6, x, 1.55, 0), box$3(.17, .8, 1.1, x, .75, -1.25), box$3(.17, .8, 1.1, x, .75, 1.25));
	for (const x of [
		-2.14,
		-.62,
		.62,
		2.14
	]) for (const z of [-1.84, 1.84]) frame.push(box$3(.14, 2.3, .14, x, 0, z));
	for (const z of [-1.84, 1.84]) frame.push(box$3(4.35, .16, .18, 0, 2.18, z), box$3(4.35, .12, .16, 0, .15, z));
	for (const x of [-2.14, 2.14]) {
		frame.push(box$3(.15, .14, 3.7, x, 2.15, 0));
		for (const side of [-1, 1]) {
			const brace = new BoxGeometry(.1, 1.9, .12).rotateX(side * .45).translate(x, 1.1, side * .85);
			frame.push(brace);
		}
	}
	const angle = Math.atan2(1.05, 2.4);
	for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
		const g = new BoxGeometry(.46 / Math.cos(angle), .15, 4.25);
		g.rotateZ(-side * angle);
		g.translate(side * (2.4 - (i + .5) * .4), 2.28 + 1.05 * (i + .5) / 6, 0);
		roof.push(g);
	}
	roof.push(box$3(.2, .13, 4.45, 0, 3.33, 0));
	return fitCivilianFootprint("house", {
		entry: {
			x: 0,
			z: 1.83,
			width: 1.15
		},
		timber: merge$2(wall),
		roof: merge$2(roof),
		extra: merge$2(frame),
		timberMat: "plaster",
		extraMat: "timber",
		roofMat: "thatch"
	});
}
function box$2(w, h, d, x, y, z) {
	return new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}
function merge$1(parts) {
	const gs = parts.map((p) => {
		const g = p.toNonIndexed();
		p.dispose();
		return g;
	}), out = mergeGeometries(gs);
	gs.forEach((g) => g.dispose());
	out.computeBoundingBox();
	return out;
}
/** Timber field shelter: thick braced walls, an actual doorway and narrow
* openings, without stone towers or decorative equipment masquerading as stock. */
function fortifiedShelterGeo() {
	const wall = [];
	for (const z of [-3.25, 3.25]) {
		for (const side of [-1, 1]) {
			const cx = side * 2.12;
			wall.push(box$2(2.75, 1.4, .42, cx, 0, z), box$2(2.75, .72, .42, cx, 1.95, z));
			for (const x of [
				cx - 1.24,
				cx - .48,
				cx + .48,
				cx + 1.24
			]) wall.push(box$2(.3, .55, .42, x, 1.4, z));
		}
		if (z < 0) wall.push(box$2(1.5, 2.67, .42, 0, 0, z));
		else wall.push(box$2(1.5, .52, .42, 0, 2.15, z));
	}
	for (const x of [-3.65, 3.65]) {
		wall.push(box$2(.42, 1.4, 6.2, x, 0, 0), box$2(.42, .72, 6.2, x, 1.95, 0));
		for (const z of [
			-2.85,
			-1.8,
			-.8,
			.8,
			1.8,
			2.85
		]) wall.push(box$2(.42, .55, .4, x, 1.4, z));
	}
	for (const x of [-3.78, 3.78]) for (const z of [-3.38, 3.38]) wall.push(box$2(.36, 3.05, .36, x, 0, z));
	for (const x of [-3.9, 3.9]) for (const z of [-2, 2]) {
		const g = box$2(.24, 2.3, .24, x, 0, z);
		g.rotateZ(x < 0 ? -.08 : .08);
		wall.push(g);
	}
	const roof = [];
	for (const side of [-1, 1]) {
		const g = new BoxGeometry(4.35, .24, 7.55);
		g.rotateZ(side * .32);
		g.translate(side * 1.98, 3.12, 0);
		roof.push(g);
	}
	roof.push(box$2(.22, .2, 7.7, 0, 3.9, 0));
	return {
		timber: merge$1(wall),
		roof: merge$1(roof)
	};
}
function box$1(w, h, d, x = 0, y = 0, z = 0, rz = 0) {
	const g = new BoxGeometry(w, h, d);
	if (rz) g.rotateZ(rz);
	g.translate(x, y + h / 2, z);
	return g;
}
function tub(x, z) {
	const g = new CylinderGeometry(.76, .64, .65, 12, 1, true);
	g.translate(x, .4, z);
	return g;
}
function combine(gs) {
	const plain = gs.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	});
	const result = mergeGeometries(plain);
	plain.forEach((g) => g.dispose());
	result.computeBoundingBox();
	return result;
}
function frame(width = 3.4) {
	return [-width / 2, width / 2].map((x) => box$1(.15, 2.2, .15, x, 0, 0)).concat([box$1(width + .25, .15, .15, 0, 2.1, 0)]);
}
/** Distinct permanent work surfaces, not free ingredients, finished clothes or a decorative everlasting flame. */
function productionWorkplaceGeos() {
	const stones = Array.from({ length: 10 }, (_, i) => {
		const a = i * Math.PI / 5;
		return box$1(.4, .28, .35, Math.cos(a) * 1.1, .02, Math.sin(a) * 1.1, a);
	});
	const threshEarth = new PlaneGeometry(4.6, 4.6, 18, 18);
	threshEarth.rotateX(-Math.PI / 2);
	threshEarth.translate(0, .04, 0);
	const legs = [-1.25, 1.25].flatMap((x) => [-.5, .5].map((z) => box$1(.16, .95, .16, x, 0, z)));
	return {
		threshingFloor: {
			timber: combine([
				box$1(.14, .5, .14, -2.7, 0, -2.7),
				box$1(.14, .5, .14, 2.7, 0, -2.7),
				box$1(.14, .5, .14, -2.7, 0, 2.7),
				box$1(.14, .5, .14, 2.7, 0, 2.7),
				box$1(.1, .1, 4.5, -2.4, .18, 0),
				box$1(.1, .1, 4.5, 2.4, .18, 0)
			]),
			roof: threshEarth,
			roofMat: "dirt",
			extra: combine([
				box$1(5.7, .12, .22, 0, 0, -2.7),
				box$1(5.7, .12, .22, 0, 0, 2.7),
				box$1(.22, .12, 5.2, -2.7, 0, 0),
				box$1(.22, .12, 5.2, 2.7, 0, 0)
			]),
			extraMat: "stone"
		},
		fibreWorkshop: fibreWorkshopGeo(),
		potter: {
			timber: combine([
				...legs,
				box$1(2.9, .15, 1.2, 0, .95, .6),
				...frame(3.2).map((g) => g.translate(0, 0, -1)),
				...[
					-.6,
					.15,
					.9
				].map((y) => box$1(2.8, .1, .8, 0, y, -1))
			]),
			roof: combine([box$1(3.8, .14, 3.5, 0, 2.4, 0)]),
			extra: combine([box$1(.75, .12, .65, -.7, 1.1, .6), box$1(.75, .1, .65, .7, 1.1, .6)]),
			extraMat: "stone"
		},
		kiln: {
			timber: combine([
				box$1(.12, 1.2, .12, -1.75, 0, -1.5),
				box$1(.12, 1.2, .12, 1.75, 0, -1.5),
				box$1(3.6, .12, .12, 0, 1.2, -1.5)
			]),
			roof: combine([box$1(.6, .18, .65, 0, 1.65, -.25)]),
			extra: combine([
				new CylinderGeometry(1.15, 1.4, 1.4, 14, 1, true, .45, Math.PI * 2 - .9).translate(0, .8, 0),
				new CylinderGeometry(1.4, 1.5, .18, 14).translate(0, .09, 0),
				box$1(.35, .9, .45, -.5, .1, 1.12),
				box$1(.35, .9, .45, .5, .1, 1.12),
				box$1(1.35, .3, .45, 0, 1, 1.12)
			]),
			extraMat: "stone"
		},
		smokehouse: {
			timber: combine([
				...frame(3.2),
				...frame(3.2).map((g) => g.translate(0, 0, -2)),
				box$1(3.5, .2, 2.4, 0, .15, -1),
				...[-1.55, 1.55].flatMap((x) => Array.from({ length: 7 }, (_, i) => box$1(.13, .25, 2.1, x, .35 + i * .27, -1))),
				box$1(3.2, 1.9, .12, 0, .3, -2.05),
				box$1(.12, .12, 2.2, -.7, 1.4, -1),
				box$1(.12, .12, 2.2, .7, 1.4, -1)
			]),
			roof: combine([new BoxGeometry(3.8, .18, 1.8).rotateX(.18).translate(0, 2.5, -.35), new BoxGeometry(3.8, .18, 1.8).rotateX(-.18).translate(0, 2.5, -1.65)]),
			extra: combine([box$1(1.2, .6, 1, 0, .2, -1), box$1(.55, 1.2, .55, 1.05, 1.8, -1.5)]),
			extraMat: "stone"
		},
		grindingStone: {
			timber: combine([box$1(.9, .12, .5, 0, .65, 0)]),
			roof: combine([box$1(.42, .16, .3, .08, .8, 0)]),
			extra: combine([box$1(1.8, .7, 1.2, 0, 0, 0), box$1(1.5, .12, 1, 0, .7, 0)]),
			extraMat: "stone"
		},
		oven: {
			timber: combine([
				box$1(1.7, .75, 1.3, 0, 0, 0),
				box$1(.15, 1.5, .15, -1.7, 0, 1.2),
				box$1(.15, 1.5, .15, 1.7, 0, 1.2)
			]),
			roof: combine([box$1(3.5, .12, 2.8, 0, 2.2, 0)]),
			extra: combine([
				box$1(2.1, 1.3, .4, 0, .75, -.75),
				box$1(.4, 1.3, 1.4, -.85, .75, 0),
				box$1(.4, 1.3, 1.4, .85, .75, 0),
				box$1(1.5, .35, 1.6, 0, 1.7, 0)
			]),
			extraMat: "stone"
		},
		hearth: {
			timber: combine([box$1(.9, .14, .14, -.18, .04, 0, .42), box$1(.9, .14, .14, .18, .08, 0, -.42)]),
			roof: combine([box$1(.3, .04, .24, 0, .12, .12)]),
			extra: combine(stones),
			extraMat: "stone"
		},
		butcher: {
			timber: combine([
				...legs,
				box$1(3, .24, 1.4, 0, .95, 0),
				box$1(.24, 2.8, .24, -1.8, 0, -.9),
				box$1(.24, 2.8, .24, 1.8, 0, -.9),
				box$1(3.9, .24, .24, 0, 2.55, -.9),
				box$1(.9, .42, .9, -1.65, 0, .7)
			]),
			roof: combine([box$1(.07, .5, .07, -.8, 2, -.9), box$1(.07, .35, .07, .8, 2.15, -.9)]),
			extra: combine([box$1(.6, .05, .5, -.6, 1.21, 0), box$1(.35, .06, .6, 1.1, 1.21, 0)]),
			extraMat: "stone"
		},
		dryrack: {
			timber: combine([
				...frame(3.5),
				...frame(3.5).map((g) => g.translate(0, 0, -1.5)),
				...[
					-1.1,
					0,
					1.1
				].map((x) => box$1(.1, .12, 1.7, x, 1.4, -.75))
			]),
			roof: combine([box$1(4, .12, 2.5, 0, 2.3, -.75)]),
			extra: combine([box$1(3.1, .08, 1.3, 0, .75, -.75)]),
			extraMat: "dark"
		},
		tanner: {
			timber: combine([
				...frame(2.2).map((g) => g.translate(-1.4, 0, -.8)),
				tub(.9, .4),
				tub(.9, -1.3),
				box$1(1, .15, .6, -1.4, .8, .5)
			]),
			roof: combine([box$1(3.1, .1, 2.8, -1.3, 2.4, -.3)]),
			extra: combine([box$1(.5, .06, .8, -1.4, .96, .5)]),
			extraMat: "stone"
		},
		tailor: {
			timber: combine([
				...legs,
				box$1(3, .17, 1.5, 0, .95, 0),
				box$1(.8, .6, .65, -1.6, 0, 1),
				...frame(3.5).map((g) => g.translate(0, 0, -1))
			]),
			roof: combine([box$1(4.2, .14, 3.3, 0, 2.35, -.1)]),
			extra: combine([box$1(.65, .06, .4, .8, 1.12, -.2)]),
			extraMat: "dark"
		}
	};
}
function beam(w, h, d, x, y, z, rz = 0) {
	const g = new BoxGeometry(w, h, d);
	if (rz) g.rotateZ(rz);
	return g.translate(x, y + h / 2, z);
}
/** Local front is north (-Z). The front brace/latch makes all four saved
* facings visible; opening removes the whole leaf assembly, never the frame. */
function timberGateKit() {
	const join = (parts) => {
		const g = mergeGeometries(parts, false);
		for (const part of parts) part.dispose();
		return g;
	};
	return {
		timber: join([
			beam(.5, 3.5, 3.8, -1.75, 0, 0),
			beam(.5, 3.5, 3.8, 1.75, 0, 0),
			beam(4, .4, 3.8, 0, 3.1, 0)
		]),
		roof: join([
			beam(3, 2.8, .25, 0, 0, 0),
			beam(2.8, .13, .12, 0, .55, -.19),
			beam(2.8, .13, .12, 0, 2.1, -.19),
			beam(.13, 2.6, .12, 0, .1, -.19, -.72),
			beam(.38, .12, .15, .95, 1.28, -.29)
		])
	};
}
function box(w, h, d, x, y, z, ry = 0) {
	const g = new BoxGeometry(w, h, d);
	if (ry) g.rotateY(ry);
	g.translate(x, y + h / 2, z);
	return g;
}
function cyl(rt, rb, h, x, y, z, segs = 8) {
	const g = new CylinderGeometry(rt, rb, h, segs);
	g.translate(x, y + h / 2, z);
	return g;
}
function cone(r, h, x, y, z, segs = 10) {
	const g = new ConeGeometry(r, h, segs);
	g.translate(x, y + h / 2, z);
	return g;
}
function merge(list) {
	const prepared = list.map((g) => {
		const n = g.index ? g.toNonIndexed() : g;
		if (n !== g) g.dispose();
		return n;
	});
	const keep = new Set(Object.keys(prepared[0]?.attributes ?? {}));
	for (const g of prepared) for (const name of [...keep]) if (!g.getAttribute(name)) keep.delete(name);
	for (const g of prepared) for (const name of Object.keys(g.attributes)) if (!keep.has(name)) g.deleteAttribute(name);
	const m = mergeGeometries(prepared, false);
	prepared.forEach((g) => g.dispose());
	if (!m) return new BoxGeometry(1, 1, 1);
	m.computeVertexNormals();
	return m;
}
function makeMaterials() {
	const std = (color, roughness, metalness = 0, opts = {}) => new MeshStandardMaterial({
		color,
		roughness,
		metalness,
		flatShading: true,
		...opts
	});
	const surfaces = makeBuildingSurfaces();
	return {
		thatch: bindBuildingSurface(std("#d4b06a", .92), surfaces.thatch),
		timber: bindBuildingSurface(std("#b88858", .92), surfaces.timber),
		plaster: bindBuildingSurface(std("#ead5b5", .96), surfaces.earth),
		stone: bindBuildingSurface(std("#a8a49c", .96), surfaces.masonry),
		dark: bindBuildingSurface(std("#664734", .96), surfaces.timber),
		crop: std("#8ab84a", .86),
		metal: std("#8a8884", .42, .55),
		tile: bindBuildingSurface(std("#b9654f", .92), surfaces.masonry),
		dirt: std("#8a6a3c", .95),
		bark: std("#6a4828", .88, 0, {}),
		leaf: std("#579b53", .72),
		rock: std("#9a9890", .88, 0, {}),
		berry: std("#6a8a40", .74),
		hide: std("#e0c49a", .68),
		gold: std("#d4b070", .45, .35),
		ground: std("#ffffff", .92, 0, { vertexColors: true }),
		hideDark: std("#8a6a48", .75)
	};
}
function thatchHut(r, wallH, roofH) {
	const timber = [];
	const roof = [];
	timber.push(box(r * 1.5, wallH, r * 1.5, 0, 0, 0));
	timber.push(box(.8, wallH * .75, .16, 0, .02, r * .76));
	for (let i = 0; i < 4; i++) roof.push(box(r * (1.9 - i * .38), roofH * .25, r * (1.9 - i * .38), 0, wallH + i * roofH * .25, 0));
	return {
		timber: merge(timber),
		roof: merge(roof),
		extra: merge([
			box(.72, wallH * .72, .18, 0, .04, r * .77),
			box(.55, .5, .16, -r * .43, wallH * .48, r * .77),
			box(.16, .5, .55, r * .77, wallH * .48, 0),
			box(1.2, .16, .65, 0, 0, r * .77)
		]),
		extraMat: "dark"
	};
}
function hall(w, d, h, roofH, chimney = false) {
	const timber = [];
	const roof = [];
	timber.push(box(w, h, d, 0, 0, 0));
	timber.push(box(w * .18, h * .7, .12, 0, .1, d / 2 + .02));
	for (let i = 0; i < 5; i++) timber.push(cyl(.1, .12, h + .2, -w / 2 + .3 + i * ((w - .6) / 4), 0, d / 2 + .08, 6));
	roof.push(box(w + 1.1, .28, d * .78, 0, h + roofH * .12, 0, .52));
	roof.push(box(w + 1.1, .28, d * .78, 0, h + roofH * .12, 0, -.52));
	const ridge = new BoxGeometry(w + .5, .2, .28);
	ridge.translate(0, h + roofH * .58, 0);
	roof.push(ridge);
	if (chimney) timber.push(box(.7, h + roofH + .4, .7, w * .28, 0, -d * .2));
	return {
		timber: merge(timber),
		roof: merge(roof),
		extra: merge([
			box(w * .18, h * .74, .14, 0, .02, d * .51),
			box(.7, .65, .14, -w * .3, h * .48, d * .51),
			box(.7, .65, .14, w * .3, h * .48, d * .51),
			box(.14, .65, .7, w * .51, h * .48, 0),
			box(.14, .65, .7, -w * .51, h * .48, 0),
			box(w * .32, .16, .65, 0, 0, d * .5),
			box(w * .95, .12, .12, 0, h * .9, d * .51)
		]),
		extraMat: "dark"
	};
}
function buildingGeos() {
	const hut = thatchHut(2.6, 1.9, 2.5);
	const th = hall(5.4, 4.6, 2.6, 1.7, true);
	const soil = new PlaneGeometry(7.4, 7.4, 24, 24);
	soil.rotateX(-Math.PI / 2);
	soil.translate(0, .075, 0);
	const soilColors = [];
	for (let i = 0; i < soil.attributes.position.count; i++) {
		const x = soil.attributes.position.getX(i), z = soil.attributes.position.getZ(i);
		const furrow = .88 + .12 * Math.cos(x * 9) + .035 * Math.sin(z * 11 + x);
		const c = new Color("#795632").multiplyScalar(furrow);
		soilColors.push(c.r, c.g, c.b);
	}
	soil.setAttribute("color", new Float32BufferAttribute(soilColors, 3));
	const farmTimber = [soil];
	const farmExtra = [];
	for (let row = 0; row < 5; row++) for (let stalk = 0; stalk < 6; stalk++) {
		const x = -2.5 + row * 1.25 + .09 * Math.sin(stalk * 2 + row);
		const z = -2.8 + stalk * 1.1 + .08 * Math.sin(row * 3 + stalk);
		const h = .36 + .12 * (1 + Math.sin(row * 5 + stalk * 3)) / 2;
		farmExtra.push(box(.16, h, .18, x, .1, z));
		farmExtra.push(box(.3, .09, .22, x, h + .1, z));
	}
	const lumberT = [
		cyl(.9, 1, .5, -1.4, 0, .4, 8),
		box(3.4, 1.5, 2.4, 1.2, 0, 0),
		box(2.4, .35, .45, -.2, .55, 1.3, .3),
		box(2.4, .35, .45, -.1, .9, 1.1, .2)
	];
	const lumberR = [box(4, .2, 2.8, 1.2, 1.5, 0, .4)];
	const dockT = [
		box(5.6, .22, 2.2, 0, .55, 0),
		box(.22, 1.1, .22, -2.4, 0, .85),
		box(.22, 1.1, .22, -2.4, 0, -.85),
		box(.22, 1.1, .22, 0, 0, .85),
		box(.22, 1.1, .22, 0, 0, -.85),
		box(.22, 1.1, .22, 2.4, 0, .85),
		box(.22, 1.1, .22, 2.4, 0, -.85),
		box(1.6, 1.2, 1.8, -2.6, 0, -.1)
	];
	for (let i = 0; i < 9; i++) dockT.push(box(.06, .035, 2.1, -2.4 + i * .6, .78, 0));
	dockT.push(box(.12, 1.7, .12, 1, .75, -.8), box(.12, 1.7, .12, 2.3, .75, -.8), box(1.45, .12, .12, 1.65, 2.35, -.8));
	for (let i = 0; i < 4; i++) dockT.push(box(.09, .8, .07, 1.1 + i * .35, 1.55, -.8));
	const dockR = [box(2.2, .16, 2.4, -2.6, 1.2, 0, .2), box(.12, 1.4, .12, -2.6, 1.2, 0)];
	const quarryT = [
		box(1.6, .7, 1.2, -1.6, 0, 1.2),
		box(1.2, .9, 1.4, 1.5, 0, -.8),
		box(.9, .5, 1.1, .4, 0, 1.5)
	];
	const quarryE = [new CylinderGeometry(2.4, 1.6, .8, 8), box(1.8, .6, 1.2, 1.6, 0, 1.1)];
	quarryE[0].translate(0, .15, 0);
	const wareT = [box(5.4, 1.8, 4.6, 0, 0, 0)];
	const wareR = Array.from({ length: 4 }, (_, i) => box(6.2, .28, 5.4 - i * 1.25, 0, 1.8 + i * .28, 0));
	for (const x of [-2.65, 2.65]) for (const z of [
		-2.2,
		0,
		2.2
	]) wareT.push(box(.2, 2, .2, x, 0, z));
	const forgeT = [box(5, 1.8, 4.6, 0, 0, 0), box(1, 3.2, 1, 1.4, 0, -1.2)];
	const forgeR = [box(5.8, .2, 3.2, 0, 1.8, 0, .5), box(5.8, .2, 3.2, 0, 1.8, 0, -.5)];
	const towerT = [box(2.6, 5.2, 2.6, 0, 0, 0), box(3.2, .35, 3.2, 0, 5.2, 0)];
	for (let i = 0; i < 4; i++) {
		const a = i / 4 * Math.PI * 2 + Math.PI / 4;
		towerT.push(box(.4, 1.1, .4, Math.cos(a) * 1.5, 5.4, Math.sin(a) * 1.5));
	}
	const templeT = [box(6.8, .4, 6.4, 0, 0, 0), box(5.6, 2.4, 5.2, 0, .4, 0)];
	for (let i = 0; i < 6; i++) templeT.push(cyl(.22, .24, 2.6, -2.6 + i % 3 * 2.6, .4, i < 3 ? 2.4 : -2.4, 8));
	const templeR = [box(7.4, .28, 6.8, 0, 3, 0)];
	const marketT = [
		box(6.2, 1.4, 5.4, 0, 0, 0),
		box(2.2, 1.1, 1.8, -1.8, 0, 1.6),
		box(2.2, 1.1, 1.8, 1.6, 0, 1.4)
	];
	const marketR = [box(6.8, .16, 3.6, 0, 1.4, 0, .35)];
	const keepT = [
		box(7.6, 4.4, 7.6, 0, 0, 0),
		box(2.2, 6.2, 2.2, -3.4, 0, -3.4),
		box(2.2, 6.2, 2.2, 3.4, 0, -3.4),
		box(2.2, 6.2, 2.2, -3.4, 0, 3.4),
		box(2.2, 6.2, 2.2, 3.4, 0, 3.4)
	];
	const keepR = [box(8.2, .3, 8.2, 0, 4.4, 0)];
	const stabT = [
		box(7, 2.2, 6.4, 0, 0, 0),
		box(.3, 2, 5.4, -2.2, 0, 0),
		box(.3, 2, 5.4, 2.2, 0, 0)
	];
	const stabR = [box(7.8, .22, 4.6, 0, 2.2, 0, .4), box(7.8, .22, 4.6, 0, 2.2, 0, -.4)];
	const uniT = [box(8.6, 3.4, 7, 0, 0, 0), cyl(.6, .7, 5.2, 0, 0, 0, 10)];
	const uniR = [
		box(9.4, .24, 5, 0, 3.4, 0, .45),
		box(9.4, .24, 5, 0, 3.4, 0, -.45),
		cone(1.4, 1.6, 0, 5.2, 0, 8)
	];
	const result = {
		...productionWorkplaceGeos(),
		palisade: {
			timber: merge(Array.from({ length: 16 }, (_, i) => cyl(.2, .26, 2.8, (i % 4 - 1.5) * 1.1, 0, (Math.floor(i / 4) - 1.5) * 1.1, 5))),
			roof: merge([box(.1, .1, .1, 0, 0, 0)])
		},
		gate: timberGateKit(),
		stonewall: {
			timber: merge([box(4, 3, 4, 0, 0, 0)]),
			roof: merge([
				box(1, .6, 4, -1.5, 3, 0),
				box(1, .6, 4, 1.5, 3, 0),
				box(2, .6, 1, 0, 3, -1.5),
				box(2, .6, 1, 0, 3, 1.5)
			])
		},
		trench: {
			timber: merge([
				box(.08, .55, .08, -1.8, 0, -1.8),
				box(.08, .55, .08, 1.8, 0, -1.8),
				box(.08, .55, .08, -1.8, 0, 1.8),
				box(.08, .55, .08, 1.8, 0, 1.8)
			]),
			roof: merge([box(.04, .04, 3.6, -1.8, .45, 0), box(.04, .04, 3.6, 1.8, .45, 0)])
		},
		moat: {
			timber: merge([box(4, .06, 4, 0, .02, 0)]),
			roof: merge([box(4, .25, .25, 0, 0, -1.85), box(4, .25, .25, 0, 0, 1.85)])
		},
		townhall: th,
		cornerstone: {
			timber: merge([cyl(.13, .18, 4.8, 0, 0, 0, 8), box(1.7, .12, .12, .75, 4.4, 0)]),
			roof: merge([box(1.6, 1.1, .08, .85, 3.3, 0)]),
			extra: merge([cyl(.85, 1.15, .5, 0, 0, 0, 7)]),
			extraMat: "stone"
		},
		hut,
		house: improvedHomeGeo(),
		pen: {
			timber: merge([
				box(2, .4, .55, -2.5, 0, -2.5),
				box(.14, 1.9, .14, -3.5, 0, -3.5),
				box(.14, 1.9, .14, -1.5, 0, -3.5)
			]),
			roof: merge([box(3, .18, 2.8, -2.5, 1.9, -2.5, .08)])
		},
		farm: {
			timber: merge(farmTimber),
			roof: new BufferGeometry(),
			extra: merge(farmExtra),
			extraMat: "crop"
		},
		lumber: {
			timber: merge(lumberT),
			roof: merge(lumberR)
		},
		workshop: {
			timber: merge([
				box(3.8, .2, 1.5, 0, 1, 0),
				box(.3, 1, .3, -1.5, 0, 0),
				box(.3, 1, .3, 1.5, 0, 0),
				box(.2, 2.5, .2, -2, 0, -1.5),
				box(.2, 2.5, .2, 2, 0, -1.5)
			]),
			roof: merge([box(5, .15, 4, 0, 2.5, 0, .12)])
		},
		dock: {
			timber: merge(dockT),
			roof: merge(dockR)
		},
		bridge: {
			timber: merge([
				box(5.2, .25, 12, 0, -.25, 0),
				box(.2, .9, 12, -2.5, 0, 0),
				box(.2, .9, 12, 2.5, 0, 0)
			]),
			roof: merge([box(.1, .1, .1, 0, 0, 0)])
		},
		quarry: {
			timber: merge(quarryT),
			roof: merge([box(.1, .1, .1, 0, 0, 0)]),
			extra: merge(quarryE),
			extraMat: "stone"
		},
		warehouse: {
			timber: merge(wareT),
			roof: merge(wareR),
			extra: merge([
				box(1.2, 1.5, .12, 0, .02, 2.34),
				box(.7, .55, .12, -1.8, .9, 2.34),
				box(5.4, .12, .12, 0, 1.6, 2.34),
				box(5.4, .12, .12, 0, .18, 2.34),
				...[
					-2.65,
					-.7,
					.7,
					2.65
				].map((x) => box(.13, 1.8, .14, x, 0, 2.34)),
				box(.8, .65, .8, -1.8, 0, 2),
				box(.65, .5, .65, -1.8, .65, 2),
				box(.8, .7, .8, 1.8, 0, 2),
				box(.8, .1, .9, 1.8, .35, 2)
			]),
			extraMat: "dark"
		},
		barracks: fortifiedShelterGeo(),
		forge: {
			timber: merge(forgeT),
			roof: merge(forgeR)
		},
		watchtower: {
			timber: merge(towerT),
			roof: merge([box(.1, .1, .1, 0, 0, 0)])
		},
		temple: {
			timber: merge(templeT),
			roof: merge(templeR)
		},
		market: {
			timber: merge(marketT),
			roof: merge(marketR)
		},
		keep: {
			timber: merge(keepT),
			roof: merge(keepR)
		},
		stables: {
			timber: merge(stabT),
			roof: merge(stabR)
		},
		university: {
			timber: merge(uniT),
			roof: merge(uniR)
		},
		cairn: {
			timber: merge([
				cyl(.9, 1.15, .7, 0, 0, 0, 7),
				cyl(.55, .75, 1.1, 0, .7, 0, 6),
				cyl(.28, .42, 1.4, 0, 1.7, 0, 5)
			]),
			roof: merge([box(.1, .1, .1, 0, 0, 0)])
		},
		grove: {
			timber: merge([
				cyl(.12, .16, 2.2, -1.6, 0, -1.2, 5),
				cyl(.12, .16, 2.4, 1.5, 0, -1.1, 5),
				cyl(.12, .16, 2.1, -.2, 0, 1.6, 5),
				cyl(.12, .16, 1.9, 1.4, 0, 1.3, 5),
				cyl(.18, .28, 1.4, 0, 0, 0, 6)
			]),
			roof: merge([cone(2.2, 1.6, 0, 1.4, 0, 7)])
		},
		well: {
			timber: merge([
				cyl(.55, .7, .35, 0, 0, 0, 8),
				cyl(.18, .22, 1.1, 0, .35, 0, 6),
				box(.7, .08, .12, 0, 1.2, 0)
			]),
			roof: merge([
				box(.08, .7, .08, -.35, 1.15, 0),
				box(.08, .7, .08, .35, 1.15, 0),
				box(.9, .08, .08, 0, 1.85, 0)
			])
		},
		cistern: {
			timber: merge([box(4.2, .35, 4.2, 0, 0, 0), box(3.6, .08, 3.6, 0, .35, 0)]),
			roof: merge([
				box(.2, 1.1, .2, -1.8, .35, -1.8),
				box(.2, 1.1, .2, 1.8, .35, -1.8),
				box(.2, 1.1, .2, -1.8, .35, 1.8),
				box(.2, 1.1, .2, 1.8, .35, 1.8)
			]),
			extra: merge([box(3.8, .2, 3.8, 0, .08, 0)]),
			extraMat: "stone"
		},
		watermill: {
			timber: merge([
				box(4.2, 2.2, 3.6, 0, 0, 0),
				cyl(.16, .16, 2.4, 2.4, .4, 0, 8),
				box(.12, 2, .12, 2.4, .5, .9),
				box(.12, 2, .12, 2.4, .5, -.9)
			]),
			roof: merge([box(5, .22, 4.2, 0, 2.2, 0, .2)])
		},
		windmill: {
			timber: merge([
				cyl(1.1, 1.4, 3.6, 0, 0, 0, 8),
				box(.18, 3.2, .12, 0, 3.2, 0),
				box(3.2, .12, .18, 0, 4.4, 0)
			]),
			roof: merge([cone(1.6, 1.4, 0, 3.6, 0, 8)])
		},
		aqueduct: {
			timber: merge([
				box(3.6, .35, 1.2, 0, 2.4, 0),
				box(.7, 2.4, .7, -1.4, 0, 0),
				box(.7, 2.4, .7, 1.4, 0, 0)
			]),
			roof: merge([box(4, .2, 1.4, 0, 2.75, 0)]),
			extra: merge([box(3.2, .25, 1, 0, 2.2, 0)]),
			extraMat: "stone"
		},
		canal: {
			timber: merge([
				box(4, .08, 4, 0, .02, 0),
				box(.12, .45, 4, -1.9, 0, 0),
				box(.12, .45, 4, 1.9, 0, 0)
			]),
			roof: merge([box(.08, .08, 3.6, -1.9, .4, 0), box(.08, .08, 3.6, 1.9, .4, 0)])
		}
	};
	const civilian = {
		...civilianBuildingGeos(),
		...classicalBuildingGeos()
	};
	for (const [role, kit] of Object.entries(civilian)) {
		const old = result[role];
		for (const g of [
			old.timber,
			old.roof,
			old.extra
		]) g?.dispose();
		result[role] = kit;
	}
	for (const [type, kit] of Object.entries(result)) registerGroundContacts(type, [kit.timber, kit.extra], kit.entry);
	for (const [type, kit] of Object.entries(result)) if (![
		"farm",
		"pen",
		"trench",
		"moat"
	].includes(type)) {
		for (const g of [
			kit.timber,
			kit.roof,
			kit.extra
		]) if (g) buildingSurfaceUV(g);
	}
	return result;
}
function unitGeo(type) {
	const parts = [];
	if (type === "cavalry") {
		const horse = new CapsuleGeometry(.32, .9, 3, 6);
		horse.rotateZ(Math.PI / 2);
		horse.translate(0, .55, .05);
		parts.push(horse);
		parts.push(cyl(.07, .08, .5, -.35, 0, .18, 5));
		parts.push(cyl(.07, .08, .5, -.35, 0, -.18, 5));
		parts.push(cyl(.07, .08, .5, .35, 0, .18, 5));
		parts.push(cyl(.07, .08, .5, .35, 0, -.18, 5));
		const rider = new CapsuleGeometry(.16, .38, 3, 6);
		rider.translate(0, 1.15, 0);
		parts.push(rider);
		const head = new SphereGeometry(.13, 6, 5);
		head.translate(0, 1.48, .02);
		parts.push(head);
		return merge(parts);
	}
	const body = new CapsuleGeometry(type === "swordsman" ? .2 : .16, type === "swordsman" ? .55 : .48, 4, 8);
	body.translate(0, .55, 0);
	parts.push(body);
	const head = new SphereGeometry(.13, 8, 6);
	head.translate(0, 1.05, .02);
	parts.push(head);
	parts.push(cyl(.05, .06, .42, -.1, 0, .04, 5));
	parts.push(cyl(.05, .06, .42, .1, 0, .04, 5));
	if (type === "spearman") {
		const spear = new CylinderGeometry(.03, .03, 2.1, 5);
		spear.rotateX(Math.PI / 2.4);
		spear.translate(.22, .85, .55);
		parts.push(spear);
	} else if (type === "archer") {
		const bow = new TorusGeometry(.28, .03, 5, 10, Math.PI);
		bow.rotateY(Math.PI / 2);
		bow.translate(.22, .8, .15);
		parts.push(bow);
	} else if (type === "swordsman") {
		const blade = new BoxGeometry(.06, .7, .12);
		blade.rotateZ(-.4);
		blade.translate(.28, .85, .25);
		parts.push(blade);
	} else if (type === "leader") {
		const cloak = new ConeGeometry(.38, .95, 7);
		cloak.translate(0, .55, -.04);
		parts.push(cloak);
		const staff = new CylinderGeometry(.035, .035, 1.7, 5);
		staff.translate(.32, .95, .1);
		parts.push(staff);
		const circlet = new TorusGeometry(.14, .025, 5, 8);
		circlet.rotateX(Math.PI / 2);
		circlet.translate(0, 1.16, .02);
		parts.push(circlet);
	} else if (type === "warden") {
		const shield = new BoxGeometry(.08, .7, .55);
		shield.translate(-.32, .75, .05);
		parts.push(shield);
		const axe = new BoxGeometry(.12, .7, .18);
		axe.rotateZ(-.45);
		axe.translate(.3, .9, .2);
		parts.push(axe);
	} else if (type === "ranger") {
		const bow = new TorusGeometry(.34, .03, 5, 10, Math.PI);
		bow.rotateY(Math.PI / 2);
		bow.translate(.22, .85, .15);
		parts.push(bow);
		const quiver = new CylinderGeometry(.07, .08, .55, 5);
		quiver.translate(-.22, .75, -.05);
		parts.push(quiver);
	} else {
		const tool = new CylinderGeometry(.03, .03, .9, 5);
		tool.rotateZ(-.5);
		tool.translate(.28, .7, .2);
		parts.push(tool);
	}
	return merge(parts);
}
/** One shared paddle mesh, animated around its grip rather than per-boat objects. */
function canoePaddleGeo() {
	return merge([
		box(.065, 1.5, .065, 0, -1.1, 0),
		box(.26, .5, .09, 0, -1.45, 0),
		box(.24, .065, .065, 0, .35, 0)
	]);
}
/** Shared low-poly equipment; local +Z points towards the person pulling it. */
function haulageGeo(kind) {
	const parts = [];
	if (kind === "canoe") return merge([
		box(1.05, .18, 2.6, 0, 0, 0),
		box(.15, .45, 2.7, -.57, .08, 0),
		box(.15, .45, 2.7, .57, .08, 0),
		box(.85, .35, .45, 0, .12, -1.45),
		box(.85, .35, .45, 0, .12, 1.45),
		box(1, .12, .3, 0, .3, -.55),
		box(1, .12, .3, 0, .3, .55)
	]);
	if (kind === "pack") return merge([
		box(.55, .5, 1, 0, .55, 0),
		box(.28, .45, .3, 0, .88, .48),
		box(.3, .25, .38, 0, 1.23, .53),
		...[-1, 1].flatMap((side) => [
			box(.12, .6, .12, side * .2, 0, .32),
			box(.12, .6, .12, side * .2, 0, -.32),
			box(.28, .4, .65, side * .4, .55, -.1),
			box(.055, .25, .07, side * .12, 1.45, .48)
		])
	]);
	const deck = kind === "cart" ? .6 : .24;
	for (let i = 0; i < 4; i++) parts.push(box(.25, .1, 1.6, -.42 + i * .28, deck, 0));
	parts.push(box(1.16, .09, .1, 0, deck + .09, -.75));
	parts.push(box(1.16, .09, .1, 0, deck + .09, .75));
	for (const side of [-1, 1]) {
		const shaft = box(.065, .065, 2.1, side * .32, deck + .06, 1.15);
		shaft.rotateX(-.08);
		parts.push(shaft);
	}
	if (kind === "sled") for (const side of [-1, 1]) {
		parts.push(box(.11, .14, 1.9, side * .46, .04, 0));
		const tip = box(.11, .12, .48, side * .46, .02, 1.02);
		tip.rotateX(-.18);
		parts.push(tip);
		parts.push(box(.11, .13, .18, side * .46, .12, -.5));
		parts.push(box(.11, .13, .18, side * .46, .12, .5));
	}
	else {
		const axle = new CylinderGeometry(.055, .055, 1.5, 5);
		axle.rotateZ(Math.PI / 2);
		axle.translate(0, .42, -.2);
		parts.push(axle);
		for (const side of [-1, 1]) {
			const wheel = new CylinderGeometry(.41, .41, .12, 10);
			wheel.rotateZ(Math.PI / 2);
			wheel.translate(side * .69, .42, -.2);
			parts.push(wheel);
			parts.push(box(.055, .25, 1.62, side * .53, deck + .1, 0));
		}
	}
	return merge(parts);
}
/** Fits the worker's existing wooden handle, avoiding a second overlapping tool. */
function farmToolHeadGeo() {
	const blade = box(.15, .09, .38, .49, 1.04, .34);
	blade.rotateZ(-.03);
	return merge([blade, box(.13, .15, .11, .49, 1.01, .2)]);
}
function pineGeo() {
	const trunk = merge([
		box(.4, 3.1, .4, 0, 0, 0),
		box(.72, .28, .65, 0, 0, 0),
		box(1.4, .18, .18, 0, 1.55, 0, .18),
		box(.18, .16, 1.25, 0, 2.35, 0, -.22)
	]);
	const canopy = merge([
		box(2.65, .9, 2.45, -.12, 1.9, .08),
		box(1.35, .65, 1.3, -.85, 2.15, -.1),
		box(1.25, .65, 1.35, .75, 2.2, .22),
		box(2.05, 1.05, 2, .12, 2.85, -.12),
		box(1.1, .6, 1.2, -.55, 3.4, .18),
		box(1.4, .95, 1.45, -.08, 3.95, .02),
		box(.7, .75, .75, .06, 4.85, -.08)
	]);
	const pos = canopy.getAttribute("position"), colors = new Float32Array(pos.count * 3);
	for (let i = 0; i < pos.count; i++) {
		const light = .72 + .28 * Math.min(1, pos.getY(i) / 5.6);
		colors[i * 3] = light;
		colors[i * 3 + 1] = light;
		colors[i * 3 + 2] = light;
	}
	canopy.setAttribute("color", new BufferAttribute(colors, 3));
	return {
		trunk,
		canopy
	};
}
function rockGeo() {
	const g = new DodecahedronGeometry(.7, 0);
	g.scale(1.2, .7, 1);
	g.translate(0, .28, 0);
	return g;
}
function bushGeo() {
	return merge([
		box(.8, .65, .75, -.18, .05, 0),
		box(.65, .85, .65, .25, .05, .05),
		box(.55, .5, .55, .05, .1, -.4)
	]);
}
function dockPostGeo() {
	return merge([
		cyl(.09, .12, 2.4, 0, 0, 0, 6),
		box(.04, .7, .55, .28, 1.5, 0),
		box(.08, .08, .08, 0, 2.35, 0)
	]);
}
function fishGeo() {
	const body = new SphereGeometry(.22, 6, 5);
	body.scale(1.6, .55, .7);
	body.translate(0, .08, 0);
	const tail = new ConeGeometry(.12, .28, 4);
	tail.rotateZ(Math.PI / 2);
	tail.translate(-.32, .08, 0);
	return merge([body, tail]);
}
function flameGeo() {
	const g = new ConeGeometry(.28, .7, 5);
	g.translate(0, .35, 0);
	return g;
}
function firepitGeo() {
	const bits = [];
	for (let i = 0; i < 8; i++) {
		const a = i / 8 * Math.PI * 2;
		const s = new DodecahedronGeometry(.22, 0);
		s.scale(1.1, .55, .8);
		s.translate(Math.cos(a) * .7, .12, Math.sin(a) * .7);
		bits.push(s);
	}
	bits.push(cyl(.12, .14, .7, .12, .05, .05, 5));
	bits.push(cyl(.1, .12, .65, -.1, .05, -.08, 5));
	return merge(bits);
}
function goatGeo() {
	const body = new CapsuleGeometry(.22, .55, 3, 6);
	body.rotateZ(Math.PI / 2);
	body.translate(0, .48, 0);
	const head = new SphereGeometry(.14, 6, 5);
	head.translate(.38, .62, 0);
	const snout = new ConeGeometry(.07, .16, 5);
	snout.rotateZ(-Math.PI / 2);
	snout.translate(.5, .56, 0);
	const hornL = new ConeGeometry(.03, .16, 4);
	hornL.translate(.36, .78, .06);
	const hornR = new ConeGeometry(.03, .16, 4);
	hornR.translate(.36, .78, -.06);
	return merge([
		body,
		head,
		snout,
		hornL,
		hornR,
		cyl(.045, .05, .42, -.18, 0, .1, 4),
		cyl(.045, .05, .42, -.18, 0, -.1, 4),
		cyl(.045, .05, .42, .18, 0, .1, 4),
		cyl(.045, .05, .42, .18, 0, -.1, 4)
	]);
}
function deerGeo() {
	const body = new CapsuleGeometry(.2, .72, 3, 6);
	body.rotateZ(Math.PI / 2);
	body.translate(0, .62, 0);
	const neck = new CylinderGeometry(.07, .09, .32, 5);
	neck.translate(.28, .82, 0);
	const head = new SphereGeometry(.12, 6, 5);
	head.translate(.42, .98, 0);
	const antL = new ConeGeometry(.025, .28, 4);
	antL.translate(.4, 1.18, .06);
	const antR = new ConeGeometry(.025, .28, 4);
	antR.translate(.4, 1.18, -.06);
	return merge([
		body,
		neck,
		head,
		antL,
		antR,
		cyl(.04, .04, .58, -.22, 0, .1, 4),
		cyl(.04, .04, .58, -.22, 0, -.1, 4),
		cyl(.04, .04, .58, .22, 0, .1, 4),
		cyl(.04, .04, .58, .22, 0, -.1, 4)
	]);
}
function boarGeo() {
	const body = new CapsuleGeometry(.28, .5, 3, 6);
	body.rotateZ(Math.PI / 2);
	body.translate(0, .4, 0);
	const head = new SphereGeometry(.16, 6, 5);
	head.translate(.32, .42, 0);
	const tuskL = new ConeGeometry(.03, .14, 4);
	tuskL.rotateZ(-Math.PI / 2);
	tuskL.translate(.46, .34, .06);
	const tuskR = new ConeGeometry(.03, .14, 4);
	tuskR.rotateZ(-Math.PI / 2);
	tuskR.translate(.46, .34, -.06);
	return merge([
		body,
		head,
		tuskL,
		tuskR,
		cyl(.05, .05, .34, -.16, 0, .12, 4),
		cyl(.05, .05, .34, -.16, 0, -.12, 4),
		cyl(.05, .05, .34, .16, 0, .12, 4),
		cyl(.05, .05, .34, .16, 0, -.12, 4)
	]);
}
function birdGeo() {
	const body = new CapsuleGeometry(.05, .16, 3, 5);
	body.rotateZ(Math.PI / 2);
	const wingL = new ConeGeometry(.04, .28, 4);
	wingL.rotateZ(Math.PI / 2);
	wingL.translate(0, .02, .16);
	const wingR = new ConeGeometry(.04, .28, 4);
	wingR.rotateZ(-Math.PI / 2);
	wingR.translate(0, .02, -.16);
	return merge([
		body,
		wingL,
		wingR
	]);
}
function skyGeo() {
	const geo = new SphereGeometry(250, 48, 24);
	const pos = geo.attributes.position;
	const colors = new Float32Array(pos.count * 3);
	const zenith = new Color("#7eafd2");
	const horizon = new Color("#f3d6a4");
	const ground = new Color("#cbb896");
	const c = new Color();
	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i) / 250;
		if (y > 0) c.lerpColors(horizon, zenith, Math.pow(y, .55));
		else c.lerpColors(horizon, ground, Math.min(1, -y * 1.8));
		colors[i * 3] = c.r;
		colors[i * 3 + 1] = c.g;
		colors[i * 3 + 2] = c.b;
	}
	geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
	return geo;
}
/** Distinct shared cargo silhouettes, centered on the carrier's hands/vehicle. */
function cargoGeo(kind) {
	const parts = [];
	if (kind === "wood") {
		for (const [x, y] of [
			[-.18, -.22],
			[.18, -.22],
			[0, .04]
		]) parts.push(box(.29, .25, 1.05, x, y, 0));
		for (const z of [-.32, .32]) parts.push(box(.7, .045, .065, 0, .02, z));
	} else if (kind === "food") parts.push(box(.66, .43, .65, 0, -.25, 0), box(.45, .12, .48, 0, .18, 0), box(.18, .1, .2, 0, .3, 0));
	else parts.push(box(.43, .33, .5, -.14, -.25, .1, .22), box(.35, .4, .38, .18, -.25, -.12, -.3), box(.36, .24, .35, 0, .05, 0, .4));
	return merge(parts);
}
/** Five seats, raised gunwales and exposed cross ribs; one shared fleet mesh. */
function riverboatGeo() {
	return merge([
		box(2.3, .22, 5.6, 0, 0, 0),
		box(.2, .7, 5.8, -1.25, .12, 0),
		box(.2, .7, 5.8, 1.25, .12, 0),
		box(1.8, .6, .55, 0, .18, -3),
		box(1.8, .6, .55, 0, .18, 3),
		...[
			-1.8,
			-.9,
			0,
			.9,
			1.8
		].map((z) => box(2.4, .15, .3, 0, .5, z)),
		...[
			-2.4,
			-1.2,
			0,
			1.2,
			2.4
		].flatMap((z) => [-1, 1].map((side) => box(.14, .8, .14, side * 1.23, .08, z)))
	]);
}
/** A compact fleece silhouette and dark face distinguish actual sheep. */
function sheepGeo() {
	const pieces = [];
	function part(g, color, x = 0, y = 0, z = 0) {
		g.translate(x, y, z);
		const c = new Color(color), a = new Float32Array(g.attributes.position.count * 3);
		for (let i = 0; i < a.length; i += 3) {
			a[i] = c.r;
			a[i + 1] = c.g;
			a[i + 2] = c.b;
		}
		g.setAttribute("color", new BufferAttribute(a, 3));
		pieces.push(g);
	}
	const body = new IcosahedronGeometry(.36, 1);
	body.scale(1.4, 1, .92);
	part(body, "#d5d0b9", 0, .54, 0);
	const head = new SphereGeometry(.15, 6, 5);
	head.scale(1.2, 1, .8);
	part(head, "#524b40", .46, .67, 0);
	for (const z of [-.13, .13]) part(new BoxGeometry(.16, .045, .1), "#746b57", .43, .73, z);
	for (const x of [-.25, .25]) for (const z of [-.17, .17]) part(new CylinderGeometry(.045, .036, .38, 5), "#5e5547", x, .2, z);
	return merge(pieces);
}
var UNIT_TYPES = [
	"worker",
	"spearman",
	"archer",
	"swordsman",
	"cavalry",
	"leader",
	"warden",
	"ranger"
];
var BLD_TYPES = [
	"threshingFloor",
	"fibreWorkshop",
	"potter",
	"kiln",
	"smokehouse",
	"grindingStone",
	"oven",
	"hearth",
	"butcher",
	"dryrack",
	"tanner",
	"tailor",
	"palisade",
	"gate",
	"stonewall",
	"trench",
	"moat",
	"townhall",
	"cornerstone",
	"hut",
	"house",
	"farm",
	"pen",
	"lumber",
	"workshop",
	"quarry",
	"dock",
	"bridge",
	"warehouse",
	"barracks",
	"forge",
	"watchtower",
	"temple",
	"market",
	"keep",
	"stables",
	"university",
	"cairn",
	"grove",
	"well",
	"cistern",
	"watermill",
	"windmill",
	"aqueduct",
	"canal"
];
var _m = new Matrix4();
var _p = new Vector3();
var _q = new Quaternion();
var _s = new Vector3();
var _e = new Euler();
var _c = new Color();
var _ray = new Raycaster();
var _ndc = new Vector2();
var _ground = new Plane(new Vector3(0, 1, 0), 0);
var _hit = new Vector3();
var _haulMatrix = new Matrix4();
var _haulEuler = new Euler(0, 0, 0, "YXZ");
var CARGO_COLORS = {
	food: "#c5ad71",
	wood: "#73502f",
	stone: "#a2a3a2",
	copper: "#bc7a4c",
	iron: "#666e78"
};
var FARM_TOOL_COLORS = {
	stoneHoe: "#bcb6a6",
	copperTools: "#d38a55",
	ironTools: "#afbdc7"
};
function instCap(mesh) {
	return mesh.instanceMatrix.array.length / 16 | 0;
}
function makeSunSprite() {
	const c = document.createElement("canvas");
	c.width = c.height = 128;
	const ctx = c.getContext("2d");
	if (!ctx) return null;
	const g = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
	g.addColorStop(0, "rgba(255,252,240,1)");
	g.addColorStop(.14, "rgba(255,230,170,0.85)");
	g.addColorStop(.36, "rgba(255,180,80,0.28)");
	g.addColorStop(.62, "rgba(255,150,60,0.07)");
	g.addColorStop(1, "rgba(255,140,50,0)");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 128, 128);
	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	return t;
}
var WorldView = class {
	foundations = null;
	mapSize = MAP;
	renderer;
	latestRenderMetrics;
	scene;
	camera;
	mats;
	terrain;
	water;
	hemi;
	sun;
	fill;
	hearth;
	torchLights = [];
	look = new Vector3(0, 1.2, 0);
	cameraGround = null;
	cameraGroundRevision = null;
	cameraCollision = new FixedOrbitCameraCollision();
	yaw = 1.12;
	pitch = .38;
	dist = 58;
	pan = {
		x: 0,
		z: 0
	};
	treesTrunk;
	treesLeaf;
	rocks;
	copper;
	iron;
	bushes;
	fish = null;
	grass = null;
	bldMeshes = /* @__PURE__ */ new Map();
	towerPlatforms = null;
	contourFields = null;
	wildPlantLayer = null;
	landContinuation = null;
	bankLayer = null;
	excavationLayer = null;
	fieldSurface = null;
	buildingSyncIn = 0;
	synchronizedState = null;
	buildingInstances = /* @__PURE__ */ new Map();
	cargoMeshes = /* @__PURE__ */ new Map();
	haulageMeshes = /* @__PURE__ */ new Map();
	canoePaddles = null;
	riverboats = null;
	hullFleet = null;
	sailRigs = null;
	farmToolMesh = null;
	unitMeshes = /* @__PURE__ */ new Map();
	unitInstanceOwners = /* @__PURE__ */ new Map();
	penFences = null;
	wornGarments = null;
	wornArmor = null;
	siegeRamLayer = null;
	waterVessels = null;
	baskets = null;
	housingPackets = null;
	fibreWork = null;
	trailMesh;
	trailSyncAt = -1;
	hoveredUnitId = null;
	rings;
	resourceRing;
	workRings;
	ghost;
	linePreview = null;
	arrows;
	huntingStones;
	smoke;
	smokeGeo;
	smokePos;
	smokeTexture;
	flames;
	pits;
	floaters;
	quality = "med";
	shadowsEnabled = GRAPHICS_RULES.defaultShadows;
	unitRingsEnabled = GRAPHICS_RULES.defaultUnitRings;
	sky;
	sunDisc;
	sunGlow;
	bounce;
	deer = null;
	boars = null;
	wildGoats = null;
	wildSheep = null;
	domesticSheep = null;
	domesticGoats = null;
	birds = null;
	tmpCam = new Vector3();
	disposed = false;
	treeCount = 0;
	rockCount = 0;
	bushCount = 0;
	composer = null;
	bloom = null;
	timeU = { value: 0 };
	godrays = [];
	fowTex = null;
	fowData = /* @__PURE__ */ new Uint8Array(147456);
	terrTex = null;
	terrData = /* @__PURE__ */ new Uint8Array(147456);
	fowMesh = null;
	rain = null;
	rainGeo = null;
	rainPos = /* @__PURE__ */ new Float32Array(0);
	lost = false;
	onContextLost = null;
	onContextRestored = null;
	styleHalls = [];
	villageStyles = /* @__PURE__ */ new Map();
	eraDetails = null;
	biomeScene = null;
	localWater = null;
	terrainSurface = null;
	waterMaterials = [];
	campVisual = null;
	terrainLandscape = /* @__PURE__ */ new Float32Array(0);
	terrainBiome = null;
	terrainRegion = null;
	terrainBlend = /* @__PURE__ */ new Float32Array(0);
	grassRegion = null;
	seasonAcc = .4;
	lastSnow = -1;
	litSun = 1.2;
	litHemi = .55;
	litFogD = .003;
	litFog = new Color("#d2dcbe");
	litSunCol = new Color("#fff4d2");
	constructor(canvas) {
		this.quality = loadGraphicsQuality();
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: this.quality === "high",
			powerPreference: "default",
			alpha: false,
			preserveDrawingBuffer: false,
			failIfMajorPerformanceCaveat: false
		});
		this.renderer.setPixelRatio(graphicsPixelRatio(this.quality, canvas.clientWidth || 800, canvas.clientHeight || 600, window.devicePixelRatio || 1));
		this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
		this.renderer.shadowMap.enabled = this.shadowsEnabled;
		this.renderer.shadowMap.type = 1;
		this.renderer.toneMapping = 7;
		this.renderer.toneMappingExposure = 1.02;
		this.renderer.outputColorSpace = SRGBColorSpace;
		canvas.addEventListener("webglcontextlost", this.onGlLost, false);
		canvas.addEventListener("webglcontextrestored", this.onGlRestored, false);
		this.scene = new Scene();
		this.scene.background = new Color("#d8c4a0");
		this.scene.fog = new FogExp2("#d8c4a0", .0034);
		this.camera = new PerspectiveCamera(38, 1, .5, 860);
		this.mats = makeMaterials();
		this.hemi = new HemisphereLight("#dcebf8", "#5a6651", .72);
		this.scene.add(this.hemi);
		this.fill = new AmbientLight("#f1f1e6", .22);
		this.scene.add(this.fill);
		this.sun = new DirectionalLight("#fff1c4", 2.05);
		this.sun.castShadow = this.shadowsEnabled;
		this.sun.shadow.mapSize.set(this.quality === "high" ? 1024 : 512, this.quality === "high" ? 1024 : 512);
		this.sun.shadow.camera.near = 4;
		this.sun.shadow.camera.far = 280;
		this.sun.shadow.camera.left = -110;
		this.sun.shadow.camera.right = 110;
		this.sun.shadow.camera.top = 110;
		this.sun.shadow.camera.bottom = -110;
		this.sun.shadow.bias = -4e-4;
		this.sun.shadow.normalBias = .04;
		this.scene.add(this.sun);
		this.scene.add(this.sun.target);
		this.bounce = new DirectionalLight("#c8d8b8", .28);
		this.bounce.castShadow = false;
		this.scene.add(this.bounce);
		this.scene.add(this.bounce.target);
		this.hearth = new PointLight("#ff8a38", 2.1, 26, 1.5);
		this.hearth.castShadow = false;
		this.scene.add(this.hearth);
		this.torchLights = [];
		for (let i = 0; i < 6; i++) {
			const L = new PointLight("#ff9944", 0, 22, 1.6);
			L.castShadow = false;
			this.scene.add(L);
			this.torchLights.push(L);
		}
		this.sky = new Mesh(skyGeo(), new MeshBasicMaterial({
			vertexColors: true,
			fog: false,
			depthWrite: false,
			side: 1
		}));
		this.sky.renderOrder = -20;
		this.sky.frustumCulled = false;
		this.sky.scale.setScalar(1.7);
		this.scene.add(this.sky);
		const sunTex = makeSunSprite();
		this.sunDisc = new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial({
			map: sunTex,
			color: "#fff6d8",
			fog: false,
			depthWrite: false,
			transparent: true,
			blending: 2,
			toneMapped: true
		}));
		this.sunGlow = new Mesh(new PlaneGeometry(26, 26), new MeshBasicMaterial({
			map: sunTex,
			color: "#ffc070",
			fog: false,
			depthWrite: false,
			transparent: true,
			blending: 2,
			opacity: .45,
			toneMapped: true
		}));
		this.sunDisc.renderOrder = -19;
		this.sunGlow.renderOrder = -19;
		this.scene.add(this.sunDisc, this.sunGlow);
		this.terrain = new Mesh();
		this.water = new Mesh();
		this.ghost = new Group();
		this.scene.add(this.ghost);
		const arrowGeo = new ConeGeometry(.08, .55, 5);
		arrowGeo.rotateX(Math.PI / 2);
		this.arrows = new InstancedMesh(arrowGeo, new MeshStandardMaterial({
			color: "#3a2a14",
			roughness: .6
		}), 40);
		this.arrows.count = 0;
		this.arrows.frustumCulled = false;
		this.scene.add(this.arrows);
		this.huntingStones = new InstancedMesh(new DodecahedronGeometry(.13, 0), new MeshStandardMaterial({
			color: "#777467",
			roughness: .95
		}), 40);
		this.huntingStones.count = 0;
		this.huntingStones.frustumCulled = false;
		this.scene.add(this.huntingStones);
		this.smokePos = /* @__PURE__ */ new Float32Array(216);
		this.smokeGeo = new BufferGeometry();
		this.smokeGeo.setAttribute("position", new BufferAttribute(this.smokePos, 3));
		const puffSize = 32, pixels = /* @__PURE__ */ new Uint8Array(4096);
		for (let y = 0; y < puffSize; y++) for (let x = 0; x < puffSize; x++) {
			const i = (y * puffSize + x) * 4;
			const radius = Math.hypot((x + .5) / puffSize * 2 - 1, (y + .5) / puffSize * 2 - 1);
			pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
			pixels[i + 3] = Math.round(255 * Math.max(0, 1 - radius) ** 2);
		}
		this.smokeTexture = new DataTexture(pixels, puffSize, puffSize);
		this.smokeTexture.magFilter = LinearFilter;
		this.smokeTexture.minFilter = LinearFilter;
		this.smokeTexture.needsUpdate = true;
		this.smoke = new Points(this.smokeGeo, new PointsMaterial({
			color: "#e8e0d4",
			map: this.smokeTexture,
			size: 1.1,
			transparent: true,
			opacity: .38,
			depthWrite: false
		}));
		this.smoke.frustumCulled = false;
		this.scene.add(this.smoke);
		this.rainPos = /* @__PURE__ */ new Float32Array(1560);
		this.rainGeo = new BufferGeometry();
		this.rainGeo.setAttribute("position", new BufferAttribute(this.rainPos, 3));
		this.rain = new Points(this.rainGeo, new PointsMaterial({
			color: "#c5d4e4",
			size: .11,
			transparent: true,
			opacity: .42,
			depthWrite: false,
			fog: false
		}));
		this.rain.visible = false;
		this.rain.frustumCulled = false;
		this.scene.add(this.rain);
		this.floaters = new Group();
		this.scene.add(this.floaters);
		this.trailMesh = new InstancedMesh(new CircleGeometry(.5, 16), new MeshStandardMaterial({
			color: "#756d52",
			alphaMap: this.trailAlpha(),
			transparent: true,
			opacity: .12,
			depthWrite: false,
			roughness: 1,
			side: 2
		}), 4096);
		this.trailMesh.count = 0;
		this.trailMesh.frustumCulled = false;
		this.trailMesh.raycast = () => {};
		this.scene.add(this.trailMesh);
		this.rings = new InstancedMesh(new RingGeometry(.7, .88, 20), new MeshBasicMaterial({
			color: "#e8c878",
			side: 2,
			transparent: true,
			opacity: .9,
			depthWrite: false
		}), 512);
		this.rings.instanceMatrix.setUsage(DynamicDrawUsage);
		this.rings.count = 0;
		this.rings.frustumCulled = false;
		this.scene.add(this.rings);
		this.resourceRing = new Mesh(new RingGeometry(1.45, 1.72, 40), new MeshBasicMaterial({
			color: "#ffe076",
			side: 2,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -2,
			polygonOffsetUnits: -2
		}));
		this.resourceRing.geometry.rotateX(-Math.PI / 2);
		this.resourceRing.visible = false;
		this.resourceRing.frustumCulled = false;
		this.resourceRing.raycast = () => {};
		this.scene.add(this.resourceRing);
		this.workRings = new InstancedMesh(new RingGeometry(17.45, 18.2, 48), new MeshBasicMaterial({
			color: "#7a9a48",
			side: 2,
			transparent: true,
			opacity: .42,
			depthWrite: false
		}), 16);
		this.workRings.instanceMatrix.setUsage(DynamicDrawUsage);
		this.workRings.count = 0;
		this.workRings.frustumCulled = false;
		this.scene.add(this.workRings);
		this.setupFow();
		this.setupComposer();
	}
	resize() {
		if (this.lost || this.disposed) return;
		const el = this.renderer.domElement;
		const w = el.clientWidth;
		const h = el.clientHeight;
		if (!w || !h) return;
		const ratio = graphicsPixelRatio(this.quality, w, h, window.devicePixelRatio || 1);
		this.renderer.setPixelRatio(ratio);
		this.composer?.setPixelRatio(ratio);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.composer?.setSize(w, h);
		if (this.bloom) this.bloom.resolution.set(w, h);
	}
	applyQuality(q) {
		this.quality = q;
		this.renderer.setPixelRatio(graphicsPixelRatio(q, this.renderer.domElement?.clientWidth || 800, this.renderer.domElement?.clientHeight || 600, window.devicePixelRatio || 1));
		this.composer?.setPixelRatio(this.renderer.getPixelRatio?.() ?? graphicsPixelRatio(q, 800, 600, window.devicePixelRatio || 1));
		this.renderer.shadowMap.enabled = this.shadowsEnabled && q !== "low";
		this.sun.castShadow = this.shadowsEnabled && q !== "low";
		const map = q === "high" ? 1024 : 512;
		this.sun.shadow.mapSize.set(map, map);
		this.sun.shadow.map?.dispose();
		this.sun.shadow.map = null;
		if (this.grass) this.grass.visible = q !== "low";
		if (q === "low") {
			this.composer?.dispose();
			this.bloom?.dispose();
			this.composer = null;
			this.bloom = null;
		} else if (!this.composer && !this.lost) this.setupComposer();
	}
	rebuild(game) {
		const fogSegments = Math.round(Math.sqrt(game.world.heights.length)) - 1;
		if (this.fowMesh && (this.mapSize !== game.world.size || this.fowMesh.geometry.parameters.widthSegments !== fogSegments)) {
			this.fowMesh.geometry.dispose();
			this.fowMesh.geometry = new PlaneGeometry(game.world.size, game.world.size, fogSegments, fogSegments);
			const uniforms = this.fowMesh.material.uniforms;
			uniforms.uHalf.value = game.world.size / 2;
			uniforms.uSize.value = game.world.size;
		}
		this.mapSize = game.world.size;
		this.trailSyncAt = -1;
		if (this.fowMesh) {
			const positions = this.fowMesh.geometry.getAttribute("position");
			for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.max(game.world.waterY, game.height(positions.getX(i), -positions.getY(i))) + .8);
			positions.needsUpdate = true;
			this.fowMesh.geometry.computeBoundingSphere();
		}
		this.disposeWorld();
		this.lastSnow = -1;
		this.seasonAcc = 1;
		this.buildTerrain(game);
		if (game.world.landContinuation && this.terrainSurface) this.landContinuation = new LandContinuation(this.scene, game, this.terrainSurface, this.mats.ground);
		this.cameraGround = {
			size: game.world.size,
			height: (x, z) => Math.max(game.height(x, z), game.waterAt(x, z))
		};
		this.cameraGroundRevision = () => game.navigationRevision();
		this.cameraCollision.invalidate();
		this.fieldSurface = new FieldSurface(game.world.heights, game.world.size, this.terrainSurface?.banks, this.terrainSurface?.bankCuts);
		if (game.world.bankTerrain && this.terrain) {
			this.bankLayer = new BankTerrainLayer(this.terrain, game, (geometry) => {
				if (game.world.ecology) {
					const a = biomeSurfaceAttributes(game.world.ecology, geometry.getAttribute("position"));
					geometry.setAttribute("biomeCover", new BufferAttribute(a.cover, 4));
					geometry.setAttribute("biomeMaterial", new BufferAttribute(a.material, 4));
					geometry.setAttribute("biomeTint", new BufferAttribute(a.tint, 3));
				}
			});
			this.scene.add(this.bankLayer.mesh);
		}
		if (game.state.excavations?.length) this.ensureExcavationLayer(game);
		if (game.world.ecology) this.contourFields = new ContourFields(this.scene, this.fieldSurface);
		this.buildNature(game);
		if (game.state && wildPlantsEnabled(game)) {
			this.wildPlantLayer = new WildPlantLayer(this.scene, game);
			if (this.bushes) this.bushes.count = 0;
		}
		this.buildBuildings();
		this.buildUnits();
		this.buildHearths(game);
		this.campVisual = new CampVisual(this.scene, game.world.camps.length);
		this.campVisual.sync(game);
		this.buildWildlife();
		const home = game.world.camps.find((c) => c.team === 0) || game.world.camps[0] || {
			x: 0,
			z: 0
		};
		this.look.set(home.x, this.sampleY(game, home.x, home.z) + .55, home.z);
		this.updateCamera(0);
	}
	sampleY(game, x, z) {
		return game.height(x, z);
	}
	buildTerrain(game) {
		const geo = new PlaneGeometry(this.mapSize, this.mapSize, game.world.segs, game.world.segs);
		geo.rotateX(-Math.PI / 2);
		const pos = geo.attributes.position;
		const colors = [];
		const landscape = new Float32Array(pos.count * 5);
		const surfaceRock = new Float32Array(pos.count);
		const surfaceSand = new Float32Array(pos.count), sandFeatures = (game.world.features ?? []).filter((f) => f.kind === "dunes");
		const biome = new Uint8Array(pos.count);
		const region = new Uint8Array(pos.count);
		const home = game.world.camps.find((c) => c.team === 0) || {
			x: 0,
			z: 0
		};
		game.world.islandR;
		const water = game.world.baseWaterY;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const z = pos.getZ(i);
			const h = game.height(x, z);
			pos.setY(i, h);
			const heightDx = game.height(x + 2.4, z) - game.height(x - 2.4, z);
			const heightDz = game.height(x, z + 2.4) - game.height(x, z - 2.4);
			const art = landscapeSample(game.state.seed, x, z, h, heightDx / 4.8, heightDz / 4.8);
			const artOffset = i * 5;
			surfaceRock[i] = art.exposure;
			surfaceSand[i] = duneSandWeight(sandFeatures, x, z);
			landscape[artOffset] = art.exposure;
			landscape[artOffset + 1] = art.r;
			landscape[artOffset + 2] = art.g;
			landscape[artOffset + 3] = art.b;
			landscape[artOffset + 4] = art.shade;
			const slope = Math.abs(heightDx) + Math.abs(heightDz);
			const river = h < game.world.waterY + .32;
			const shore = shorelineAt((px, pz) => game.height(px, pz), x, z, water);
			const pathN = Math.abs(x - home.x - Math.sin((z - home.z) * .08) * 1.6) < 1.7 && Math.hypot(x - home.x, z - home.z) < 22;
			const fertile = !river && isFertile(game.world.heights, x, z, water, game.world.size);
			let b = 2;
			if (h < water + .08) b = 0;
			else if (river) b = 0;
			else if (shore) b = 1;
			else if (pathN) b = 6;
			else if (slope > 2.4 || h > 18) b = 5;
			else if (h > 11) b = 7;
			else if (h > 6.5 || slope > 1.45) b = 4;
			else if (fertile) b = 3;
			else b = 2;
			const biomes = game.world.biomes || [];
			if (biomes.length && b !== 0 && b !== 1 && b !== 5 && b !== 6) {
				let kind = "plains";
				let bd = 0xe8d4a51000;
				for (const bio of biomes) {
					const d = (bio.x - x) ** 2 + (bio.z - z) ** 2;
					if (d < bd) {
						bd = d;
						kind = bio.kind;
					}
				}
				if (kind === "forest") b = 8;
				else if (kind === "hills" && b !== 7) b = 4;
				else if (kind === "plains" && b !== 7) b = 3;
			}
			biome[i] = b;
			const reg = game.regionAt(x, z);
			if (!reg) region[i] = 255;
			else if (reg.res === "copper") region[i] = 3;
			else region[i] = reg.cluster;
			colors.push(.55, .62, .32);
		}
		this.terrainLandscape = landscape;
		this.terrainBiome = biome;
		this.terrainRegion = region;
		geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
		geo.setAttribute("surfaceRock", new BufferAttribute(surfaceRock, 1));
		geo.setAttribute("surfaceSand", new BufferAttribute(surfaceSand, 1));
		if (game.world.bankTerrain) geo.setAttribute("surfaceBank", new BufferAttribute(new Float32Array(pos.count), 1));
		this.terrainSurface = new TerrainSurface(game.world.heights, game.world.size, game.state.seed, game.world.bankTerrain, game.world.bankTerrain ? geo.getAttribute("color").array : void 0);
		const ecology = game.world.ecology;
		if (ecology) {
			const attributes = biomeSurfaceAttributes(ecology, pos);
			geo.setAttribute("biomeCover", new BufferAttribute(attributes.cover, 4));
			geo.setAttribute("biomeMaterial", new BufferAttribute(attributes.material, 4));
			geo.setAttribute("biomeTint", new BufferAttribute(attributes.tint, 3));
		}
		this.terrainSurface.bind(this.mats.ground, !!ecology);
		geo.computeVertexNormals();
		geo.computeBoundingBox();
		geo.computeBoundingSphere();
		this.terrain = new Mesh(geo, this.mats.ground);
		this.terrain.receiveShadow = true;
		this.terrain.name = "terrain";
		this.scene.add(this.terrain);
		const wgeo = new PlaneGeometry(this.mapSize, this.mapSize, 48, 48);
		wgeo.rotateX(-Math.PI / 2);
		const waterMaterial = this.makeWaterMat(), fallMaterial = makeDepthWater(this.terrainSurface, this.timeU, true);
		this.waterMaterials = [waterMaterial, fallMaterial];
		this.water = new Mesh(wgeo, waterMaterial);
		this.water.position.y = seaSurfaceY(game.world);
		this.water.renderOrder = 1;
		this.scene.add(this.water);
		const localWater = new Group();
		localWater.name = "local-water-bodies";
		this.localWater = localWater;
		localWater.position.y = game.world.waterY - game.world.baseWaterY;
		const hydrology = game.world;
		addLocalWaters(localWater, hydrology.waterBodies ?? [], hydrology.waterfalls ?? [], waterMaterial, fallMaterial);
		this.scene.add(localWater);
		this.buildBankRibbons(game);
		this.seasonAcc = 1;
	}
	/** GW-12/QA-013: soft shoreline ribbons on the smoothed river banks, hiding grid stair-steps.
	* Display only: no terrain, wet/dry, pathing or save state changes. Capped so huge worlds stay cheap. */
	bankRibbons = null;
	buildBankRibbons(game) {
		if (this.bankRibbons) {
			this.scene.remove(this.bankRibbons);
			this.bankRibbons.geometry.dispose();
			this.bankRibbons.material.dispose();
			this.bankRibbons = null;
		}
		const pos = [], idx = [], CAP = 24e3, half = .45;
		const y = (x, z) => Math.max(game.height(x, z), game.waterAt(x, z)) + .035;
		try {
			for (const river of smoothRivers(game)) for (const bank of [river.left, river.right]) {
				if (bank.length < 2) continue;
				for (let i = 0; i < bank.length && pos.length / 3 < CAP; i++) {
					const p = bank[i], q = bank[Math.min(bank.length - 1, i + 1)], r = bank[Math.max(0, i - 1)];
					const dx = q.x - r.x, dz = q.z - r.z, len = Math.hypot(dx, dz) || 1, nx = -dz / len * half, nz = dx / len * half;
					const base = pos.length / 3;
					pos.push(p.x - nx, y(p.x - nx, p.z - nz), p.z - nz, p.x + nx, y(p.x + nx, p.z + nz), p.z + nz);
					if (i > 0) idx.push(base - 2, base - 1, base, base - 1, base + 1, base);
				}
			}
		} catch {
			return;
		}
		if (!pos.length) return;
		const geo = new BufferGeometry();
		geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
		geo.setIndex(idx);
		const mat = new MeshBasicMaterial({
			color: "#d9e6e0",
			transparent: true,
			opacity: .22,
			depthWrite: false,
			side: 2,
			polygonOffset: true,
			polygonOffsetFactor: -2,
			polygonOffsetUnits: -2
		});
		const mesh = new Mesh(geo, mat);
		mesh.name = "river-bank-ribbons";
		mesh.renderOrder = 2;
		mesh.frustumCulled = false;
		mesh.raycast = () => {};
		this.bankRibbons = mesh;
		this.scene.add(mesh);
	}
	buildNature(game) {
		const ecology = game.world.ecology;
		if (ecology) {
			this.biomeScene = new BiomeSceneLayer(this.scene, game, ecology);
			this.biomeScene.sync(game, this.camera.position, this.quality, 1);
			this.treeCount = game.state.trees.length;
		} else {
			const pine = pineGeo();
			const nTree = game.state.trees.length;
			this.treesTrunk = new InstancedMesh(pine.trunk, this.mats.bark, Math.max(nTree, 1));
			this.treesLeaf = new InstancedMesh(pine.canopy, this.mats.leaf.clone(), Math.max(nTree, 1));
			this.treesLeaf.material.color.set("#ffffff");
			this.treesLeaf.material.vertexColors = true;
			this.treesLeaf.material.side = 2;
			this.treesLeaf.instanceColor = new InstancedBufferAttribute(new Float32Array(Math.max(nTree, 1) * 3), 3);
			this.treesTrunk.castShadow = this.quality !== "low";
			this.treesLeaf.castShadow = this.quality !== "low";
			this.treesTrunk.receiveShadow = true;
			this.treesLeaf.receiveShadow = true;
			this.treeCount = nTree;
			game.state.trees.forEach((t, i) => {
				_p.set(t.x, t.y, t.z);
				_e.set(0, i * .7, 0);
				_q.setFromEuler(_e);
				_s.set(t.scale, t.scale, t.scale);
				_m.compose(_p, _q, _s);
				this.treesTrunk.setMatrixAt(i, _m);
				this.treesLeaf.setMatrixAt(i, _m);
				_c.setHSL(.31, .52, .42 + i % 6 * .03);
				this.treesLeaf.setColorAt(i, _c);
			});
			this.treesTrunk.count = nTree;
			this.treesLeaf.count = nTree;
			this.scene.add(this.treesTrunk, this.treesLeaf);
		}
		const nRock = game.state.stones.length;
		this.rocks = new InstancedMesh(rockGeo(), this.mats.rock, Math.max(nRock, 1));
		this.rocks.castShadow = true;
		this.rocks.receiveShadow = true;
		game.state.stones.forEach((s, i) => {
			_p.set(s.x, s.y, s.z);
			_e.set(0, i * 1.1, 0);
			_q.setFromEuler(_e);
			_s.set(s.scale, s.scale * .85, s.scale);
			_m.compose(_p, _q, _s);
			this.rocks.setMatrixAt(i, _m);
		});
		this.rocks.count = nRock;
		this.rockCount = nRock;
		this.scene.add(this.rocks);
		const nCu = game.state.copper.length;
		const cuMat = this.mats.rock.clone();
		cuMat.color.set("#b87333");
		cuMat.emissive.set("#6a3a10");
		cuMat.emissiveIntensity = .22;
		this.copper = new InstancedMesh(rockGeo(), cuMat, Math.max(nCu, 1));
		this.copper.castShadow = true;
		game.state.copper.forEach((s, i) => {
			_p.set(s.x, s.y, s.z);
			_e.set(.1, i * .9, 0);
			_q.setFromEuler(_e);
			_s.set(s.scale * .85, s.scale * .55, s.scale * .85);
			_m.compose(_p, _q, _s);
			this.copper.setMatrixAt(i, _m);
		});
		this.copper.count = nCu;
		this.scene.add(this.copper);
		const nFe = game.state.iron.length;
		const feMat = this.mats.rock.clone();
		feMat.color.set("#4a4a52");
		feMat.metalness = .55;
		feMat.roughness = .4;
		this.iron = new InstancedMesh(rockGeo(), feMat, Math.max(nFe, 1));
		this.iron.castShadow = true;
		game.state.iron.forEach((s, i) => {
			_p.set(s.x, s.y, s.z);
			_e.set(.15, i * 1.3, .05);
			_q.setFromEuler(_e);
			_s.set(s.scale * .9, s.scale * .5, s.scale * .8);
			_m.compose(_p, _q, _s);
			this.iron.setMatrixAt(i, _m);
		});
		this.iron.count = nFe;
		this.scene.add(this.iron);
		const nBush = game.state.forage.length;
		this.bushes = new InstancedMesh(bushGeo(), this.mats.berry, Math.max(nBush, 1));
		this.bushes.castShadow = true;
		game.state.forage.forEach((b, i) => {
			_p.set(b.x, b.y, b.z);
			_e.set(0, i, 0);
			_q.setFromEuler(_e);
			_s.set(b.scale, b.scale, b.scale);
			_m.compose(_p, _q, _s);
			this.bushes.setMatrixAt(i, _m);
		});
		this.bushes.count = nBush;
		this.bushCount = nBush;
		this.scene.add(this.bushes);
		const nFish = game.state.fish.length;
		const fishMat = this.mats.metal.clone();
		fishMat.color.set("#8ec8c4");
		fishMat.roughness = .35;
		fishMat.metalness = .45;
		this.fish = new InstancedMesh(fishGeo(), fishMat, Math.max(nFish, 1));
		this.fish.castShadow = false;
		game.state.fish.forEach((f, i) => {
			_p.set(f.x, game.world.localWaterVersion === 17 ? fishMarkerHeight(game, f) : game.world.waterY + .12, f.z);
			_e.set(0, i * .9, .15);
			_q.setFromEuler(_e);
			_s.set(f.scale, f.scale, f.scale);
			_m.compose(_p, _q, _s);
			this.fish.setMatrixAt(i, _m);
		});
		this.fish.count = nFish;
		this.scene.add(this.fish);
		const sites = game.world.dockSites || [];
		if (sites.length) {
			const postMat = this.mats.timber.clone();
			postMat.color.set("#efe6c8");
			postMat.emissive.set("#c8b070");
			postMat.emissiveIntensity = .35;
			const posts = new InstancedMesh(dockPostGeo(), postMat, sites.length);
			posts.castShadow = true;
			sites.forEach((s, i) => {
				const y = game.height(s.x, s.z);
				_p.set(s.x, y, s.z);
				_e.set(0, i * 1.1, 0);
				_q.setFromEuler(_e);
				_s.set(1.15, 1.15, 1.15);
				_m.compose(_p, _q, _s);
				posts.setMatrixAt(i, _m);
			});
			posts.count = sites.length;
			this.scene.add(posts);
		}
		const megs = game.world.megaliths;
		if (megs.length) {
			const stones = new InstancedMesh(rockGeo(), this.mats.rock, megs.length);
			stones.castShadow = true;
			stones.receiveShadow = true;
			megs.forEach((m, i) => {
				const y = game.height(m.x, m.z);
				_p.set(m.x, y + .6, m.z);
				_e.set(.08, m.ry, .04);
				_q.setFromEuler(_e);
				_s.set(1.15, 2.6, .95);
				_m.compose(_p, _q, _s);
				stones.setMatrixAt(i, _m);
			});
			stones.count = megs.length;
			this.scene.add(stones);
		}
	}
	buildBuildings() {
		this.foundations = new BuildingGroundingLayer(this.scene, this.mats.stone);
		this.eraDetails = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({
			color: 16777215,
			roughness: .94
		}), 1600);
		this.eraDetails.instanceMatrix.setUsage(DynamicDrawUsage);
		this.eraDetails.count = 0;
		this.eraDetails.castShadow = true;
		this.eraDetails.receiveShadow = true;
		this.eraDetails.frustumCulled = false;
		this.scene.add(this.eraDetails);
		const geos = buildingGeos();
		for (const type of BLD_TYPES) {
			const g = geos[type];
			const capacity = ["farm", "warehouse"].includes(type) ? 2304 : [
				"palisade",
				"gate",
				"stonewall",
				"trench",
				"moat"
			].includes(type) ? 1024 : compactGrainWorkplace(type) ? 720 : 80;
			const timberMaterial = this.mats[g.timberMat || "timber"].clone();
			if (type === "farm") {
				timberMaterial.map = null;
				timberMaterial.bumpMap = null;
				timberMaterial.roughnessMap = null;
			}
			timberMaterial.color.set("#ffffff");
			if (type === "farm") timberMaterial.vertexColors = true;
			if (type === "farm" || type === "pen" || terrainLaidWorkplace(type)) this.fieldSurface?.bind(timberMaterial, { furrows: type === "farm" && !!this.contourFields });
			if (type === "farm" && this.contourFields) {
				g.timber.setAttribute("fieldRows", new InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
				const positions = g.timber.attributes.position, colors = g.timber.attributes.color, soilColor = new Color("#795632");
				for (let i = 0; i < positions.count; i++) if (Math.abs(positions.getY(i) - .075) < .002) colors.setXYZ(i, soilColor.r, soilColor.g, soilColor.b);
			}
			const timber = new InstancedMesh(g.timber, timberMaterial, capacity);
			if ((type === "farm" || type === "pen" || terrainLaidWorkplace(type)) && this.fieldSurface) timber.customDepthMaterial = this.fieldSurface.depth;
			const roofMat = g.roofMat ? this.mats[g.roofMat] : type === "cornerstone" ? this.mats.hide : type === "keep" || type === "temple" || type === "university" ? this.mats.tile : this.mats.thatch;
			const roof = new InstancedMesh(g.roof, roofMat.clone(), capacity);
			if ((type === "pen" || terrainLaidWorkplace(type)) && this.fieldSurface) {
				this.fieldSurface.bind(roof.material);
				roof.customDepthMaterial = this.fieldSurface.depth;
			}
			if (hasBuildingCraftsmanship(type)) for (const [mesh, isRoof] of [[timber, false], [roof, true]]) {
				makeCraftsmanshipAttribute(mesh.geometry, capacity);
				bindCraftsmanship(mesh.material, isRoof);
				mesh.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
				bindCraftsmanship(mesh.customDepthMaterial, isRoof);
			}
			timber.instanceMatrix.setUsage(DynamicDrawUsage);
			timber.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
			roof.instanceMatrix.setUsage(DynamicDrawUsage);
			roof.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
			roof.material.vertexColors = false;
			roof.material.color.set("#ffffff");
			timber.castShadow = true;
			roof.castShadow = true;
			timber.receiveShadow = true;
			timber.count = 0;
			roof.count = 0;
			timber.frustumCulled = false;
			roof.frustumCulled = false;
			this.scene.add(timber, roof);
			let extra;
			if (g.extra) {
				const sourceExtra = this.mats[g.extraMat || "stone"];
				const extraMaterial = type === "farm" ? this.mats.crop.clone() : hasBuildingCraftsmanship(type) || terrainLaidWorkplace(type) ? sourceExtra.clone() : sourceExtra;
				if (type === "farm" || terrainLaidWorkplace(type)) this.fieldSurface?.bind(extraMaterial);
				extra = new InstancedMesh(g.extra, extraMaterial, capacity);
				if ((type === "farm" || terrainLaidWorkplace(type)) && this.fieldSurface) extra.customDepthMaterial = this.fieldSurface.depth;
				if (hasBuildingCraftsmanship(type)) {
					makeCraftsmanshipAttribute(extra.geometry, capacity);
					bindCraftsmanship(extraMaterial, false);
					extra.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
					bindCraftsmanship(extra.customDepthMaterial, false);
				}
				extra.instanceMatrix.setUsage(DynamicDrawUsage);
				if (type === "farm") extra.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
				extra.castShadow = true;
				extra.count = 0;
				extra.frustumCulled = false;
				this.scene.add(extra);
			}
			this.bldMeshes.set(type, {
				timber,
				roof,
				extra
			});
		}
	}
	buildUnits() {
		this.penFences = new PenFenceLayer(this.scene, this.mats.timber.clone());
		this.wornGarments = new WornGarmentLayer(this.scene);
		this.wornArmor = new WornArmorLayer(this.scene);
		this.siegeRamLayer = new SiegeRamLayer(this.scene);
		this.waterVessels = new WaterVesselLayer(this.scene);
		this.baskets = new BasketLayer(this.scene);
		this.housingPackets = new HousingPacketLayer(this.scene);
		this.fibreWork = new FibreWorkLayer(this.scene);
		for (const t of UNIT_TYPES) {
			const geo = unitGeo(t);
			const mat = this.mats.hide.clone();
			mat.vertexColors = false;
			const mesh = new InstancedMesh(geo, mat, 140);
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.instanceColor = new InstancedBufferAttribute(/* @__PURE__ */ new Float32Array(420), 3);
			mesh.castShadow = this.quality !== "low";
			mesh.count = 0;
			mesh.frustumCulled = false;
			this.scene.add(mesh);
			this.unitMeshes.set(t, mesh);
		}
		for (const kind of Object.keys(CARGO_COLORS)) {
			const mesh = new InstancedMesh(cargoGeo(kind), this.mats.timber.clone(), 420);
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.count = 0;
			mesh.frustumCulled = false;
			this.scene.add(mesh);
			this.cargoMeshes.set(kind, mesh);
		}
		for (const kind of [
			"sled",
			"cart",
			"canoe",
			"pack"
		]) {
			const mesh = new InstancedMesh(haulageGeo(kind), kind === "pack" ? this.mats.hide : this.mats.timber, 140);
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.count = 0;
			mesh.frustumCulled = false;
			mesh.castShadow = this.quality !== "low";
			mesh.receiveShadow = true;
			this.haulageMeshes.set(kind, mesh);
			this.scene.add(mesh);
		}
		this.sailRigs = new SailRigs(this.scene, this.mats.timber);
		this.hullFleet = new HullFleet(this.scene, this.mats.timber);
		this.riverboats = new InstancedMesh(riverboatGeo(), this.mats.timber, 96);
		this.riverboats.count = 0;
		this.riverboats.frustumCulled = false;
		this.scene.add(this.riverboats);
		this.canoePaddles = new InstancedMesh(canoePaddleGeo(), this.mats.timber, 140);
		this.canoePaddles.instanceMatrix.setUsage(DynamicDrawUsage);
		this.canoePaddles.count = 0;
		this.canoePaddles.frustumCulled = false;
		this.scene.add(this.canoePaddles);
		const toolMat = new MeshStandardMaterial({
			color: "#ffffff",
			roughness: .7,
			metalness: .15
		});
		this.farmToolMesh = new InstancedMesh(farmToolHeadGeo(), toolMat, 140);
		this.farmToolMesh.instanceMatrix.setUsage(DynamicDrawUsage);
		this.farmToolMesh.instanceColor = new InstancedBufferAttribute(/* @__PURE__ */ new Float32Array(420), 3);
		this.farmToolMesh.count = 0;
		this.farmToolMesh.frustumCulled = false;
		this.scene.add(this.farmToolMesh);
	}
	buildHearths(game) {
		const halls = game.state.buildings.filter((b) => b.type === "townhall" && b.hp > 0);
		this.pits = new InstancedMesh(firepitGeo(), this.mats.rock, 64);
		this.pits.castShadow = true;
		this.pits.receiveShadow = true;
		this.flames = new InstancedMesh(flameGeo(), new MeshBasicMaterial({
			color: "#ffb040",
			transparent: true,
			opacity: .88,
			depthWrite: false
		}), 64);
		this.flames.frustumCulled = false;
		halls.slice(0, 64).forEach((h, i) => {
			_p.set(h.x + 1.6, h.y, h.z + 4.2);
			_q.identity();
			_s.set(1, 1, 1);
			_m.compose(_p, _q, _s);
			this.pits.setMatrixAt(i, _m);
		});
		this.pits.count = Math.min(halls.length, 64);
		this.flames.count = 0;
		this.scene.add(this.pits, this.flames);
		const home = halls.find((h) => h.team === 0);
		if (home) this.hearth.position.set(home.x + 1.6, home.y + .8, home.z + 4.2);
	}
	wildlifeOwners = /* @__PURE__ */ new Map();
	buildWildlife() {
		const mkHerd = (geo, mat, n) => {
			const mesh = new InstancedMesh(geo, mat, Math.max(n, 1));
			mesh.castShadow = true;
			mesh.instanceMatrix.setUsage(DynamicDrawUsage);
			mesh.count = 0;
			mesh.frustumCulled = false;
			this.scene.add(mesh);
			return mesh;
		};
		const hideMat = this.mats.hide.clone();
		hideMat.color.set("#8a6a48");
		const boarMat = this.mats.hideDark.clone();
		boarMat.color.set("#4a3a32");
		const birdMat = this.mats.hide.clone();
		birdMat.color.set("#c8c0b0");
		this.deer = mkHerd(deerGeo(), hideMat, 12);
		this.boars = mkHerd(boarGeo(), boarMat, 10);
		this.wildGoats = mkHerd(goatGeo(), this.mats.hideDark, 96);
		this.domesticGoats = mkHerd(goatGeo(), this.mats.hide, 96);
		const sheepMat = new MeshLambertMaterial({
			color: 16777215,
			vertexColors: true
		});
		this.wildSheep = mkHerd(sheepGeo(), sheepMat, 32);
		this.domesticSheep = mkHerd(sheepGeo(), sheepMat, 96);
		this.birds = mkHerd(birdGeo(), birdMat, 16);
	}
	updateCamera(dt) {
		const panSp = 22 * (this.dist / 38);
		if (this.pan.x || this.pan.z) {
			const fx = -Math.sin(this.yaw);
			const fz = -Math.cos(this.yaw);
			const rx = Math.cos(this.yaw);
			const rz = -Math.sin(this.yaw);
			this.look.x += (fx * this.pan.z + rx * this.pan.x) * panSp * dt;
			this.look.z += (fz * this.pan.z + rz * this.pan.x) * panSp * dt;
			this.look.x = MathUtils.clamp(this.look.x, -(this.mapSize / 2) + 10, this.mapSize / 2 - 10);
			this.look.z = MathUtils.clamp(this.look.z, -(this.mapSize / 2) + 10, this.mapSize / 2 - 10);
		}
		this.pitch = MathUtils.clamp(this.pitch, .2, 1.36);
		this.dist = MathUtils.clamp(this.dist, 14, 230);
		this.tmpCam.set(this.look.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist, this.look.y + 1.2 + Math.sin(this.pitch) * this.dist, this.look.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist);
		if (this.cameraGround) {
			this.cameraCollision ??= new FixedOrbitCameraCollision();
			const collision = this.cameraCollision.resolve(this.cameraGround, {
				x: this.look.x,
				z: this.look.z,
				distance: this.dist,
				yaw: this.yaw,
				pitch: this.pitch
			}, this.cameraGroundRevision?.() ?? 0);
			if (!collision.pose) return;
			const safe = collision.pose;
			this.look.set(safe.x, safe.focusY, safe.z);
			this.dist = safe.distance;
			this.yaw = safe.yaw;
			this.pitch = safe.pitch;
			this.tmpCam.set(safe.eye.x, safe.eye.y, safe.eye.z);
		}
		this.camera.position.copy(this.tmpCam);
		this.camera.lookAt(this.look.x, this.look.y + 1.2, this.look.z);
	}
	hoverPerson(cx, cy, game) {
		if (!pointerNearPerson(cx, cy, game.state.units, (x, y, z) => this.project(x, y, z), (u) => u.team === 0 || game.visibleAt(u.x, u.z))) return null;
		const hit = this.pickEntity(cx, cy, game);
		return hit?.kind === "unit" ? hit.id : null;
	}
	pickEntity(cx, cy, game) {
		const el = this.renderer.domElement;
		_ndc.set(cx / (el.clientWidth || 1) * 2 - 1, -cy / (el.clientHeight || 1) * 2 + 1);
		_ray.setFromCamera(_ndc, this.camera);
		const sources = /* @__PURE__ */ new Map();
		for (const [type, meshes] of this.bldMeshes) {
			const entities = game.state.buildings.filter((b) => b.hp > 0 && b.type === type);
			for (const mesh of [
				meshes.timber,
				meshes.roof,
				meshes.extra
			]) if (mesh && !(type === "farm" && mesh !== meshes.roof)) {
				mesh.computeBoundingSphere();
				sources.set(mesh, this.buildingInstances.get(mesh) ?? entities);
			}
		}
		for (const [mesh, owners] of this.towerPlatforms?.sources() || []) {
			mesh.computeBoundingSphere();
			sources.set(mesh, owners);
		}
		if (this.domesticGoats) {
			this.domesticGoats.computeBoundingSphere();
			sources.set(this.domesticGoats, (game.state.livestock || []).filter((a) => a.hp > 0 && a.species === "goat").slice(0, instCap(this.domesticGoats)).map((a) => game.state.buildings.find((b) => b.id === a.pen)));
		}
		if (this.domesticSheep) {
			this.domesticSheep.computeBoundingSphere();
			sources.set(this.domesticSheep, (game.state.livestock || []).filter((a) => a.hp > 0 && a.species === "sheep").slice(0, instCap(this.domesticSheep)).map((a) => game.state.buildings.find((b) => b.id === a.pen)));
		}
		for (const [type, mesh] of this.unitMeshes) {
			mesh.computeBoundingSphere();
			sources.set(mesh, this.unitInstanceOwners.get(type) ?? []);
		}
		for (const [mesh, owners] of [
			...this.penFences?.pickingSources() || [],
			...this.wornGarments?.sources() || [],
			...this.wornArmor?.sources() || [],
			...this.waterVessels?.sources() || [],
			...this.baskets?.sources() || []
		]) {
			mesh.computeBoundingSphere();
			sources.set(mesh, owners);
		}
		for (const hit of _ray.intersectObjects([...sources.keys()], false)) {
			if (hit.instanceId === void 0) continue;
			const entity = sources.get(hit.object)?.[hit.instanceId];
			if (entity && (entity.team === 0 || game.visibleAt(entity.x, entity.z))) return entity;
		}
		const ground = this.groundAt(cx, cy);
		if (ground) {
			const farm = game.state.buildings.find((b) => b.hp > 0 && (b.type === "farm" || b.type === "trench") && (b.team === 0 || game.visibleAt(b.x, b.z)) && Math.abs(ground.x - b.x) <= b.w / 2 && Math.abs(ground.z - b.z) <= b.d / 2);
			if (farm) return farm;
		}
		return null;
	}
	pickWildlife(cx, cy, game) {
		const el = this.renderer.domElement;
		_ndc.set(cx / (el.clientWidth || 1) * 2 - 1, -cy / (el.clientHeight || 1) * 2 + 1);
		_ray.setFromCamera(_ndc, this.camera);
		const terrainHit = this.terrain ? _ray.intersectObjects(this.excavationLayer ? [
			this.terrain,
			...this.bankLayer ? [this.bankLayer.mesh] : [],
			this.excavationLayer.mesh
		] : [this.terrain, ...this.bankLayer ? [this.bankLayer.mesh] : []], false)[0] : void 0;
		for (const mesh of this.wildlifeOwners.keys()) mesh.computeBoundingSphere();
		for (const hit of _ray.intersectObjects([...this.wildlifeOwners.keys()], false)) {
			if (hit.instanceId === void 0 || terrainHit && terrainHit.distance + .02 < hit.distance) continue;
			const c = this.wildlifeOwners.get(hit.object)?.[hit.instanceId];
			if (c && game.state.wildlife.includes(c) && (c.hp > 0 ? game.visibleAt(c.x, c.z) : carcassAvailable(game, c) && game.exploredAt(c.x, c.z))) return c;
		}
		return null;
	}
	pickBoat(cx, cy, game) {
		const mesh = this.riverboats;
		if (!mesh) return null;
		const el = this.renderer.domElement;
		_ndc.set(cx / (el.clientWidth || 1) * 2 - 1, -cy / (el.clientHeight || 1) * 2 + 1);
		_ray.setFromCamera(_ndc, this.camera);
		mesh.computeBoundingSphere();
		const boats = (game.state.boats || []).filter((b) => !b.hullClass && b.hp > 0 && (b.team === 0 || game.exploredAt(b.x, b.z))).slice(0, instCap(mesh));
		const groundHit = this.terrain ? _ray.intersectObjects(this.excavationLayer ? [
			this.terrain,
			...this.bankLayer ? [this.bankLayer.mesh] : [],
			this.excavationLayer.mesh
		] : [this.terrain, ...this.bankLayer ? [this.bankLayer.mesh] : []], false)[0] : void 0;
		const extra = new Map([...this.hullFleet?.pickingSources() ?? [], ...this.sailRigs?.pickingSources() ?? []]);
		for (const m of extra.keys()) m.computeBoundingSphere();
		for (const hit of _ray.intersectObjects([mesh, ...extra.keys()], false)) {
			if (groundHit && groundHit.distance + .02 < hit.distance) continue;
			const boat = hit.instanceId === void 0 ? null : hit.object === mesh ? boats[hit.instanceId] : extra.get(hit.object)?.[hit.instanceId];
			if (boat && (boat.team === 0 || game.visibleAt(boat.x, boat.z))) return boat;
		}
		return null;
	}
	waterAt(cx, cy, height) {
		const el = this.renderer.domElement;
		_ndc.set(cx / (el.clientWidth || 1) * 2 - 1, -cy / (el.clientHeight || 1) * 2 + 1);
		_ray.setFromCamera(_ndc, this.camera);
		if (this.localWater) {
			const hits = [];
			this.localWater.updateMatrixWorld(true);
			for (const mesh of this.localWater.children) if (mesh instanceof Mesh && mesh.name.startsWith("water-")) Mesh.prototype.raycast.call(mesh, _ray, hits);
			hits.sort((a, b) => a.distance - b.distance);
			if (hits.length) return hits[0].point.clone();
		}
		_ground.set(new Vector3(0, 1, 0), -height);
		return _ray.ray.intersectPlane(_ground, _hit) ? _hit.clone() : null;
	}
	pickResource(cx, cy, game) {
		const el = this.renderer.domElement;
		_ndc.set(cx / (el.clientWidth || 1) * 2 - 1, -cy / (el.clientHeight || 1) * 2 + 1);
		_ray.setFromCamera(_ndc, this.camera);
		const sources = /* @__PURE__ */ new Map();
		for (const [mesh, nodes] of [
			[this.treesTrunk, game.state.trees],
			[this.treesLeaf, game.state.trees],
			[this.rocks, game.state.stones],
			[this.bushes, game.state.forage],
			[this.copper, game.state.copper],
			[this.iron, game.state.iron]
		]) if (mesh && (!this.wildPlantLayer || mesh !== this.bushes) && (!this.biomeScene || mesh !== this.treesTrunk && mesh !== this.treesLeaf)) {
			mesh.computeBoundingSphere();
			sources.set(mesh, nodes);
		}
		if (this.biomeScene) {
			const treesById = new Map(game.state.trees.map((node) => [node.id, node]));
			for (const source of this.biomeScene.pickingSources()) {
				source.mesh.computeBoundingSphere();
				sources.set(source.mesh, source.resourceIds.map((id) => treesById.get(id)));
			}
		}
		if (this.wildPlantLayer) {
			const forageById = new Map(game.state.forage.map((node) => [node.id, node]));
			for (const source of this.wildPlantLayer.pickingSources()) {
				source.mesh.computeBoundingSphere();
				sources.set(source.mesh, source.resourceIds.map((id) => forageById.get(id)));
			}
		}
		for (const hit of _ray.intersectObjects([...sources.keys()], false)) {
			if (hit.instanceId === void 0) continue;
			const node = sources.get(hit.object)?.[hit.instanceId];
			if (node && node.amount > 0 && game.exploredAt(node.x, node.z)) return node;
		}
		return null;
	}
	groundAt(cx, cy) {
		const el = this.renderer.domElement;
		const w = el.clientWidth || 1;
		const h = el.clientHeight || 1;
		_ndc.set(cx / w * 2 - 1, -(cy / h) * 2 + 1);
		_ray.setFromCamera(_ndc, this.camera);
		const hits = _ray.intersectObjects(this.excavationLayer ? [
			this.terrain,
			...this.bankLayer ? [this.bankLayer.mesh] : [],
			this.excavationLayer.mesh
		] : [this.terrain, ...this.bankLayer ? [this.bankLayer.mesh] : []], false);
		if (hits[0]) return hits[0].point.clone();
		_ground.set(new Vector3(0, 1, 0), -this.look.y);
		if (_ray.ray.intersectPlane(_ground, _hit)) return _hit.clone();
		return null;
	}
	project(x, y, z) {
		_p.set(x, y, z).project(this.camera);
		const el = this.renderer.domElement;
		return {
			x: (_p.x * .5 + .5) * el.clientWidth,
			y: (-_p.y * .5 + .5) * el.clientHeight,
			behind: _p.z > 1
		};
	}
	ensureExcavationLayer(game) {
		if (this.excavationLayer || !this.terrain?.geometry?.index || !this.fieldSurface) return;
		this.excavationLayer = new ExcavationLayer(this.terrain, this.fieldSurface, (geometry) => {
			const ecology = game.world.ecology;
			if (!ecology) return;
			const a = biomeSurfaceAttributes(ecology, geometry.getAttribute("position"));
			geometry.setAttribute("biomeCover", new BufferAttribute(a.cover, 4));
			geometry.setAttribute("biomeMaterial", new BufferAttribute(a.material, 4));
			geometry.setAttribute("biomeTint", new BufferAttribute(a.tint, 3));
		});
		this.scene.add(this.excavationLayer.mesh);
	}
	sync(game, dt) {
		if (this.lost || this.disposed) return;
		if (this.synchronizedState !== game.state) {
			this.synchronizedState = game.state;
			this.buildingSyncIn = 0;
			this.biomeScene?.sync(game, this.camera.position, this.quality, 1);
		}
		this.landContinuation?.sync(game);
		this.bankLayer?.sync(game);
		if (game.state.excavations?.length) {
			this.ensureExcavationLayer(game);
			this.excavationLayer?.sync(game);
		}
		this.updateDay(game, dt);
		this.biomeScene?.sync(game, this.camera.position, this.quality, dt);
		this.wildPlantLayer?.sync(game);
		this.syncNature(game);
		this.syncWildlife(game);
		this.buildingSyncIn -= dt;
		if (this.buildingSyncIn <= 0) {
			this.syncBuildings(game);
			this.campVisual?.sync(game);
			this.buildingSyncIn = .1;
		}
		this.syncUnits(game);
		this.siegeRamLayer?.sync(game, this.camera, this.quality, this.shadowsEnabled);
		this.syncTrails(game);
		this.syncCargo(game);
		this.syncRiverboatMeshes(game);
		this.syncGhost(game);
		this.syncArrows(game);
		this.syncSmoke(game, dt);
		this.timeU.value = game.state.time;
		this.syncFow(game);
		this.syncRain(game, dt);
		this.paintSeason(game, dt);
		if (this.localWater) this.localWater.position.y = game.world.waterY - game.world.baseWaterY;
		if (this.water) this.water.position.y = seaSurfaceY(game.world) + Math.sin(game.state.time * .6) * .03;
	}
	updateDay(game, dt = .016) {
		const hour = game.dayPhase() * 24;
		const { sunrise: rise, sunset: set } = game.daylight();
		const t = (hour - rise) / (set - rise);
		const elev = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
		const dawn = Math.max(0, 1 - Math.abs(hour - (rise + .35)) * .55);
		const dusk = Math.max(0, 1 - Math.abs(hour - (set - .35)) * .5);
		const night = game.isNight();
		const wx = game.state.weather;
		const sn = game.seasonMix();
		const art = daylightArt(wx, night, sn.winter, elev);
		const wet = wx === "rain" || wx === "storm" || wx === "flood";
		const ang = (hour - rise) / (set - rise) * Math.PI;
		const dist = 110;
		this.sun.position.set(this.look.x + Math.cos(ang) * dist, 8 + Math.max(4, art.sunElevation * 58), this.look.z + Math.sin(ang) * dist * .62);
		this.sun.target.position.copy(this.look);
		this.bounce.position.set(this.look.x - 24, 20, this.look.z + 14);
		this.bounce.target.position.copy(this.look);
		let sunI = 1.15 + elev * 1.15 + dawn * .35;
		if (night) sunI = .62;
		if (wx === "storm") sunI *= .45;
		else if (wx === "rain") sunI *= .62;
		else if (wx === "flood") sunI *= .55;
		else if (wx === "mist") sunI *= .72;
		else if (wx === "frost") sunI *= .8;
		else if (wx === "golden") sunI *= .9;
		else if (wx === "drought") sunI *= 1.08;
		sunI *= 1 - sn.winter * .12 + sn.summer * .06;
		const hemiI = night ? .7 : (.52 + elev * .32) * (wx === "storm" ? .75 : 1) * (1 - sn.winter * .08);
		const sunCol = new Color(sn.snow > .55 || wx === "frost" ? "#e8eef8" : wx === "storm" || wx === "flood" ? "#9aa8bc" : wx === "drought" || sn.autumn > .5 ? "#f0d8a8" : dawn > .2 || dusk > .25 || wx === "golden" || sn.autumn > .25 ? "#ffd0a1" : night ? "#c8d4ee" : "#fff4d2");
		sunCol.lerp(_c.set("#ffe0aa"), art.warmth * .75);
		this.hemi.color.set(night ? "#c4d0e8" : sn.snow > .4 || wx === "frost" ? "#d8e4f0" : sn.autumn > .4 ? "#f0d4b0" : "#dcebf8");
		const fog = new Color().setStyle(night ? "#6a7890" : sn.snow > .5 ? "#c8d4e0" : wx === "storm" ? "#6a7380" : wx === "flood" ? "#5e7a78" : wx === "drought" ? "#c4b090" : wx === "rain" ? "#8aa0a8" : wx === "mist" ? "#c8c4b4" : wx === "frost" ? "#d4dce8" : sn.autumn > .45 ? "#c4a878" : dawn > .25 ? "#e4c8a0" : dusk > .3 || wx === "golden" ? "#e0b888" : sn.spring > .4 ? "#d8e7e6" : "#dce7ed");
		fog.lerp(_c.set("#ead9bb"), art.warmth * .16);
		if (!night && !wet && wx !== "mist" && wx !== "drought") {
			fog.lerp(_c.set(ATMOSPHERE_RULES.coolDistance), ATMOSPHERE_RULES.distanceMix);
			this.hemi.color.lerp(_c.set(ATMOSPHERE_RULES.coolSky), ATMOSPHERE_RULES.skyMix);
		}
		this.hemi.groundColor.set(ATMOSPHERE_RULES.coolGround);
		const dens = atmosphericDensity(wx, night, sn.snow);
		const k = dt > .4 ? 1 : 1 - Math.exp(-dt * .38);
		this.litSun += (sunI - this.litSun) * k;
		this.litHemi += (hemiI - this.litHemi) * k;
		this.litFogD += (dens - this.litFogD) * k;
		this.litFog.lerp(fog, k);
		this.litSunCol.lerp(sunCol, k);
		this.sun.intensity = this.litSun;
		this.sun.color.copy(this.litSunCol);
		this.hemi.intensity = this.litHemi * 1.2;
		this.fill.intensity = night ? .45 : ATMOSPHERE_RULES.daylightFill + elev * ATMOSPHERE_RULES.elevatedFill;
		this.bounce.intensity = night ? .22 : .12 + elev * .12;
		this.scene.fog.color.copy(this.litFog);
		this.scene.background = this.litFog;
		this.scene.fog.density = this.litFogD;
		this.renderer.toneMappingExposure = (night ? 1.08 : 1.02 + elev * .2 + dawn * .08 + sn.winter * .06) * (wx === "storm" || wx === "flood" ? .88 : 1);
		const sunDir = this.sun.position.clone().sub(this.look).normalize();
		for (const material of this.waterMaterials) {
			const uniforms = material.uniforms;
			if (uniforms?.uSunDirection) {
				uniforms.uSunDirection.value.copy(sunDir);
				uniforms.uLight.value = night ? .32 : Math.min(1.1, .45 + this.litSun * .3);
			}
		}
		this.sunDisc.position.copy(this.camera.position).add(sunDir.clone().multiplyScalar(180));
		this.sunDisc.lookAt(this.camera.position);
		this.sunGlow.position.copy(this.sunDisc.position);
		this.sunGlow.lookAt(this.camera.position);
		const vis = night ? .22 : wx === "storm" ? .12 : wet ? .45 : .92;
		this.sunDisc.material.opacity = vis;
		this.sunGlow.material.opacity = (wx === "golden" ? .55 : .38) * vis;
		this.sky.position.copy(this.camera.position);
	}
	syncWildlife(game) {
		this.wildlifeOwners.clear();
		const stamp = (key, species) => {
			const old = this[key];
			if (!old) return;
			const list = wildlifeInstanceAnimals(game.state.wildlife, species, (x, z) => game.visibleAt(x, z), (x, z) => game.exploredAt(x, z), (c) => carcassAvailable(game, c));
			const mesh = growWildlifeMesh(this.scene, old, list.length);
			this[key] = mesh;
			for (let i = 0; i < list.length; i++) {
				const c = list[i], corpse = c.hp <= 0;
				_p.set(c.x, c.y + (corpse ? .3 * c.scale : 0), c.z);
				_haulEuler.set(corpse ? Math.PI / 2 : 0, c.facing, 0);
				_q.setFromEuler(_haulEuler);
				_s.setScalar(c.scale);
				_m.compose(_p, _q, _s);
				mesh.setMatrixAt(i, _m);
			}
			mesh.count = list.length;
			mesh.instanceMatrix.needsUpdate = true;
			this.wildlifeOwners.set(mesh, list);
		};
		stamp("deer", "deer");
		stamp("boars", "boar");
		stamp("wildGoats", "goat");
		stamp("wildSheep", "sheep");
		stamp("birds", "bird");
		for (const [mesh, species] of [[this.domesticGoats, "goat"], [this.domesticSheep, "sheep"]]) if (mesh) {
			const animals = (game.state.livestock || []).filter((a) => a.hp > 0 && a.species === species).slice(0, instCap(mesh));
			for (let i = 0; i < animals.length; i++) {
				const a = animals[i], seen = a.team === 0 || game.visibleAt(a.x, a.z);
				_p.set(a.x, a.y, a.z);
				_e.set(0, a.facing, 0);
				_q.setFromEuler(_e);
				_s.setScalar(seen ? a.scale : .001);
				_m.compose(_p, _q, _s);
				mesh.setMatrixAt(i, _m);
			}
			mesh.count = animals.length;
			mesh.instanceMatrix.needsUpdate = true;
		}
	}
	trailAlpha() {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 32;
		const ctx = canvas.getContext("2d");
		const gradient = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
		gradient.addColorStop(0, "white");
		gradient.addColorStop(.4, "#aaaaaa");
		gradient.addColorStop(1, "black");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 32, 32);
		return new CanvasTexture(canvas);
	}
	syncTrails(game) {
		const stamp = Math.floor(game.state.time / 4);
		if (this.trailSyncAt === stamp) return;
		this.trailSyncAt = stamp;
		let i = 0;
		const CAP = 4096;
		for (const ribbon of trailRibbons(game)) {
			const pts = ribbon.points;
			for (let k = 1; k < pts.length && i < CAP; k++) {
				const a = pts[k - 1], b = pts[k], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
				if (len < .001) continue;
				const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
				if (!game.exploredAt(x, z)) continue;
				const w = ribbon.widthMetres * (.55 + .45 * Math.min(1, (a.displayWear + b.displayWear) / 2 / .45));
				_p.set(x, game.height(x, z) + .12, z);
				_e.set(-Math.PI / 2, 0, -Math.atan2(dx, dz));
				_q.setFromEuler(_e);
				_s.set(w, len * 1.3, 1);
				_m.compose(_p, _q, _s);
				this.trailMesh.setMatrixAt(i++, _m);
			}
		}
		this.trailMesh.count = i;
		this.trailMesh.instanceMatrix.needsUpdate = true;
	}
	syncNature(game) {
		if (!this.biomeScene && this.treesTrunk) {
			const treeCap = instCap(this.treesTrunk);
			const nTree = Math.min(game.state.trees.length, treeCap);
			this.treeCount = nTree;
			for (let i = 0; i < nTree; i++) {
				const t = game.state.trees[i];
				const stump = t.amount <= 0 && !t.planted;
				const seen = game.exploredAt(t.x, t.z);
				const sc = !seen ? .001 : t.planted ? t.scale * (.18 + .6 * Math.max(0, 1 - t.regenT / 120)) : stump ? t.scale * .22 : t.scale;
				_p.set(t.x, t.y, t.z);
				_e.set(0, i * .7, 0);
				_q.setFromEuler(_e);
				_s.set(sc, sc, sc);
				_m.compose(_p, _q, _s);
				this.treesTrunk.setMatrixAt(i, _m);
				_s.set(stump || !seen ? .001 : sc, stump || !seen ? .001 : sc, stump || !seen ? .001 : sc);
				_m.compose(_p, _q, _s);
				this.treesLeaf.setMatrixAt(i, _m);
			}
			this.treesTrunk.count = nTree;
			this.treesLeaf.count = nTree;
			this.treesTrunk.instanceMatrix.needsUpdate = true;
			this.treesLeaf.instanceMatrix.needsUpdate = true;
		}
		if (this.rocks) {
			const rockCap = instCap(this.rocks);
			this.rockCount = Math.min(game.state.stones.length, rockCap);
			for (let i = 0; i < this.rockCount; i++) {
				const s = game.state.stones[i];
				const gone = s.amount <= 0 || !game.exploredAt(s.x, s.z);
				_p.set(s.x, s.y, s.z);
				_e.set(0, i, 0);
				_q.setFromEuler(_e);
				_s.setScalar(gone ? .001 : s.scale);
				_m.compose(_p, _q, _s);
				this.rocks.setMatrixAt(i, _m);
			}
			this.rocks.count = this.rockCount;
			this.rocks.instanceMatrix.needsUpdate = true;
		}
		const hideNodes = (mesh, list) => {
			if (!mesh) return;
			const n = Math.min(list.length, instCap(mesh));
			for (let i = 0; i < n; i++) {
				const s = list[i];
				_p.set(s.x, s.y, s.z);
				_e.set(0, i, 0);
				_q.setFromEuler(_e);
				_s.setScalar(s.amount <= 0 || !game.exploredAt(s.x, s.z) ? .001 : s.scale);
				_m.compose(_p, _q, _s);
				mesh.setMatrixAt(i, _m);
			}
			mesh.count = n;
			mesh.instanceMatrix.needsUpdate = true;
		};
		for (const kind of ["copper", "iron"]) {
			const old = this[kind], needed = game.state[kind].length;
			if (old && needed > instCap(old)) {
				const grown = new InstancedMesh(old.geometry, old.material, Math.max(needed, instCap(old) * 2));
				grown.castShadow = old.castShadow;
				grown.receiveShadow = old.receiveShadow;
				grown.frustumCulled = false;
				this.scene.remove(old);
				old.dispose();
				this[kind] = grown;
				this.scene.add(grown);
			}
		}
		hideNodes(this.copper, game.state.copper);
		hideNodes(this.iron, game.state.iron);
		if (!this.bushes) return;
		const bushCap = instCap(this.bushes);
		const nBush = wildPlantsEnabled(game) ? 0 : Math.min(game.state.forage.length, bushCap);
		this.bushCount = nBush;
		for (let i = 0; i < nBush; i++) {
			const b = game.state.forage[i];
			const gone = b.amount <= 0 || !game.exploredAt(b.x, b.z);
			_p.set(b.x, b.y, b.z);
			_e.set(0, i, 0);
			_q.setFromEuler(_e);
			_s.setScalar(gone ? .001 : b.scale);
			_m.compose(_p, _q, _s);
			this.bushes.setMatrixAt(i, _m);
		}
		this.bushes.count = nBush;
		this.bushes.instanceMatrix.needsUpdate = true;
		if (this.fish) {
			const nFish = Math.min(game.state.fish.length, instCap(this.fish));
			const t = game.state.time;
			for (let i = 0; i < nFish; i++) {
				const f = game.state.fish[i];
				const gone = f.amount <= 0 || !game.exploredAt(f.x, f.z);
				const bob = Math.sin(t * 1.6 + i) * .08;
				_p.set(f.x, fishMarkerHeight(game, f) + bob, f.z);
				_e.set(0, t * .4 + i, .12);
				_q.setFromEuler(_e);
				_s.setScalar(gone ? .001 : f.scale);
				_m.compose(_p, _q, _s);
				this.fish.setMatrixAt(i, _m);
			}
			this.fish.count = nFish;
			this.fish.instanceMatrix.needsUpdate = true;
		}
	}
	villageStyle(game, team, point) {
		const age = game.tribe(team)?.age || 0;
		const local = localArchitecture(game.state.seed, team, age, point, this.styleHalls || [], game.world?.biomes || [], this.villageStyles);
		const cached = this.villageStyles.get(local.key);
		if (cached) return cached;
		this.villageStyles.set(local.key, local.style);
		return local.style;
	}
	/** Explicit inspection only: never called by the drawing loop. */
	entityFrustumCensus(game) {
		const bodies = [], unsheltered = new Set(game.state.units.filter((u) => !u.shelterId).map((u) => u.id));
		for (const [type, mesh] of this.unitMeshes) bodies.push({
			mesh,
			owners: this.unitInstanceOwners.get(type) || [],
			admitted: (o) => unsheltered.has(o.id)
		});
		const structures = [];
		for (const [mesh, owners] of this.buildingInstances) {
			if (!(mesh instanceof InstancedMesh)) continue;
			const models = new Set(owners.filter((b) => b.type !== "farm" && b.type !== "trench").map((b) => b.id));
			structures.push({
				mesh,
				owners,
				admitted: (o) => models.has(o.id)
			});
		}
		for (const [mesh, owners] of this.towerPlatforms?.sources() || []) structures.push({
			mesh,
			owners
		});
		return {
			time: game.state.time,
			quality: this.quality,
			residents: countEntityFrustum(this.camera, bodies, game.state.units),
			structures: countEntityFrustum(this.camera, structures, game.state.buildings),
			unsupportedPlots: game.state.buildings.filter((b) => b.team === 0 && b.hp > 0 && (b.type === "farm" || b.type === "trench")).length,
			camera: {
				x: this.camera.position.x,
				y: this.camera.position.y,
				z: this.camera.position.z
			}
		};
	}
	buildingCameraCull = new InstanceCameraCull();
	syncBuildings(game) {
		this.buildingCameraCull.begin(this.camera);
		if (!this.towerPlatforms) this.towerPlatforms = new TowerPlatformLayer(this.scene, this.mats);
		this.towerPlatforms.sync(game);
		this.styleHalls = game.state.buildings.filter((b) => b.type === "townhall" && game.finished(b));
		const grouped = /* @__PURE__ */ new Map();
		for (const type of BLD_TYPES) grouped.set(type, []);
		for (const b of game.state.buildings) if (b.hp > 0) grouped.get(b.type)?.push(b);
		for (const type of BLD_TYPES) {
			const meshes = this.bldMeshes.get(type);
			if (!meshes) continue;
			const counts = {
				timber: 0,
				roof: 0,
				extra: 0
			};
			for (const mesh of [
				meshes.timber,
				meshes.roof,
				meshes.extra
			]) if (mesh) {
				let owners = this.buildingInstances.get(mesh);
				if (!owners) {
					owners = [];
					this.buildingInstances.set(mesh, owners);
				}
				owners.length = 0;
			}
			for (const b of grouped.get(type)) {
				if (type === "watchtower" && b.towerPlatform) continue;
				if (type === "trench" && excavationTerrain(game).buildingIds.has(b.id)) continue;
				if (!(b.team === 0 || game.exploredAt(b.x, b.z))) continue;
				const st = TEAM_STYLE[b.team] || TEAM_STYLE[0], identity = this.villageStyle(game, b.team, b), character = buildingCharacter(game.state.seed, b.id), artisan = hasBuildingCraftsmanship(type) ? buildingCraftsmanship(game.state.seed, b.id, type) : null;
				const ys = b.plannedCost ? .08 : b.build >= 1 ? 1 : .22 + .78 * Math.max(0, b.build);
				const fort = [
					"palisade",
					"gate",
					"stonewall",
					"trench",
					"moat"
				].includes(type);
				const modular = type === "warehouse" || expandedGrainWorkplace(b);
				const scalable = type === "farm" || modular;
				const write = (part, x, z, sx, sz) => {
					const mesh = meshes[part];
					if (!mesh || !mesh.geometry.getAttribute("position")?.count || counts[part] >= instCap(mesh)) return;
					const wx = b.x + x, wz = b.z + z;
					const ground = type === "farm" || type === "pen" ? game.height(wx, wz) : foundationProfile(game, b).level;
					_p.set(wx, ground, wz);
					const terrainWork = type === "dock", limit = .2;
					const pitch = terrainWork ? Math.max(-.2, Math.min(limit, Math.atan((game.height(wx, wz + 2) - game.height(wx, wz - 2)) / 4))) : 0;
					const roll = terrainWork ? Math.max(-.2, Math.min(limit, -Math.atan((game.height(wx + 2, wz) - game.height(wx - 2, wz)) / 4))) : 0;
					_e.set(pitch, type === "gate" ? gateOrientation(b.gateFacing).yawRadians : fort || scalable || type === "pen" ? 0 : st.yaw + buildingQuarterTurns(b) * Math.PI / 2, roll);
					_s.set(scalable ? sx : fort || type === "pen" ? 1 : st.sx, ys * (scalable || fort || type === "pen" ? 1 : st.sy), scalable ? sz : fort || type === "pen" ? 1 : st.sz);
					if (b.bridge) {
						const span = b.bridge, len = Math.hypot(span.bx - span.ax, span.bz - span.az);
						_e.set(-Math.atan2(game.height(span.bx, span.bz) - game.height(span.ax, span.az), len), Math.atan2(span.bx - span.ax, span.bz - span.az), 0);
						_s.set(1, ys, len / 12);
					}
					if (part !== "timber") {
						if (b.build < .55 || type === "gate" && b.gateOpen) _s.set(.001, .001, .001);
						else if (type !== "farm" && type !== "pen" && ![
							"market",
							"temple",
							"university",
							"house"
						].includes(type)) _s.y *= identity.roofHeight * (fort ? 1 : character.roofHeight);
					}
					if (type === "farm" && part === "extra") {
						const c = b.crop;
						const growth = c?.ripened ? c.remaining > 0 ? 1 : .04 : .04 + .75 * (c?.planted || 0) + .2 * (c?.tended || 0);
						_s.y *= growth;
					}
					_q.setFromEuler(_e);
					_m.compose(_p, _q, _s);
					if (type !== "farm" && type !== "pen" && !terrainLaidWorkplace(type) && type !== "trench" && type !== "moat" && !this.renderer.shadowMap.enabled && !this.buildingCameraCull.visible(mesh, _m, 8 + this.dist * .12)) return;
					const i = counts[part]++;
					mesh.setMatrixAt(i, _m);
					this.buildingInstances.get(mesh).push(b);
					const art = mesh.geometry.getAttribute("buildingArt");
					if (art && artisan) art.setXYZW(i, artisan.x, artisan.z, artisan.brace, artisan.lift);
					if (type === "farm" && part === "timber" && this.contourFields) {
						const rows = this.contourFields.rows(game, b);
						mesh.geometry.getAttribute("fieldRows").setXYZW(i, rows.nx, rows.nz, rows.offset, rows.spacing);
					}
					if (mesh.instanceColor) {
						if (!civicPartColor(type, part, part === "timber" ? identity.timber : identity.roof, _c)) _c.set(part === "timber" ? b.plannedCost ? "#87b7cb" : type === "moat" ? "#49787e" : type === "trench" ? "#493b27" : type === "stonewall" ? "#aaa494" : type === "farm" ? "#ffffff" : identity.timber : type === "cornerstone" ? game.tribe(b.team).color : identity.roof);
						if (type === "farm" && part === "extra") _c.set(b.crop?.ripened && b.crop.remaining > 0 ? "#f1d16b" : b.crop?.planted ? "#b1df70" : "#887453");
						if (type !== "farm" && !fort) _c.multiplyScalar(character.tint);
						mesh.setColorAt(i, _c);
					}
				};
				if (modular) for (const m of plotModules(b)) for (const part of [
					"timber",
					"roof",
					"extra"
				]) write(part, m.x, m.z, m.sx, m.sz);
				else if (type === "farm") {
					write("timber", 0, 0, b.w / BUILDINGS.farm.w, b.d / BUILDINGS.farm.d);
					if (!this.contourFields) for (const m of plotModules(b)) write("extra", m.x, m.z, m.sx, m.sz);
				} else for (const part of [
					"timber",
					"roof",
					"extra"
				]) write(part, 0, 0, 1, 1);
			}
			for (const part of [
				"timber",
				"roof",
				"extra"
			]) {
				const mesh = meshes[part];
				if (!mesh) continue;
				mesh.count = counts[part];
				mesh.instanceMatrix.needsUpdate = true;
				const art = mesh.geometry.getAttribute("buildingArt");
				if (art) art.needsUpdate = true;
				if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
			}
		}
		this.penFences?.sync(game, this.camera.position, this.shadowsEnabled && this.quality !== "low");
		this.fibreWork?.sync(game, this.camera.position, this.shadowsEnabled && this.quality !== "low");
		this.contourFields?.sync(game, this.camera.position);
		const contourRows = this.bldMeshes.get("farm")?.timber.geometry.getAttribute("fieldRows");
		if (contourRows) contourRows.needsUpdate = true;
		this.syncEraDetails(game);
		this.foundations?.sync(game);
	}
	syncEraDetails(game) {
		const mesh = this.eraDetails;
		if (!mesh) return;
		let count = 0;
		const perType = /* @__PURE__ */ new Map();
		for (const b of game.state.buildings) {
			if (b.hp <= 0 || b.build < 1 || b.plannedCost) continue;
			const n = (perType.get(b.type) || 0) + 1;
			perType.set(b.type, n);
			if (n > 80 || b.team !== 0 && !game.exploredAt(b.x, b.z) || [
				"warehouse",
				"farm",
				"pen",
				"dock",
				"bridge",
				"lumber",
				"quarry",
				"cornerstone",
				"palisade",
				"gate",
				"stonewall",
				"trench",
				"moat",
				"cairn",
				"grove"
			].includes(b.type)) continue;
			if (![
				"forge",
				"stables",
				"keep"
			].includes(b.type)) continue;
			const identity = this.villageStyle(game, b.team, b), era = identity.era;
			if (era === 0) continue;
			const st = TEAM_STYLE[b.team] || TEAM_STYLE[0], yaw = st.yaw, co = Math.cos(yaw), si = Math.sin(yaw);
			const width = Math.max(2, b.w * .85), depth = Math.max(2, b.d * .85);
			const roof = this.bldMeshes.get(b.type)?.roof.geometry;
			if (roof && !roof.boundingBox) roof.computeBoundingBox();
			const top = (roof?.boundingBox?.max.y || 4) * identity.roofHeight;
			const block = (x, y, z, w, h, d, color = identity.trim) => {
				if (count >= instCap(mesh)) return;
				_p.set(b.x + (co * x + si * z) * st.sx, foundationProfile(game, b).level + y * st.sy, b.z + (-si * x + co * z) * st.sz);
				_e.set(0, yaw, 0);
				_q.setFromEuler(_e);
				_s.set(w * st.sx, h * st.sy, d * st.sz);
				_m.compose(_p, _q, _s);
				mesh.setMatrixAt(count, _m);
				_c.set(color);
				mesh.setColorAt(count++, _c);
			};
			block(-.72, 1.1, depth * .5, .18, 2.2, .22);
			block(.72, 1.1, depth * .5, .18, 2.2, .22);
			block(0, 2.2, depth * .5, 1.65, .22, .26);
			if (era >= 2) block(0, .1, depth * .5 + .35, 1.8, .2, .8);
			if (era >= 3) {
				block(-width * .45, 1.2, depth * .48, .23, 2.4, .25);
				block(width * .45, 1.2, depth * .48, .23, 2.4, .25);
				block(0, 2.4, depth * .48, width, .2, .25);
			}
			if (era >= 4) block(width * .24, top * .87, -depth * .12, .55, top * .42, .6);
			if (era >= 5) block(width * .24, top * 1.09, -depth * .12, .8, .18, .85);
		}
		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	}
	syncCargo(game) {
		this.housingPackets?.sync(game);
		const counts = {
			food: 0,
			wood: 0,
			stone: 0,
			copper: 0,
			iron: 0
		};
		const vehicles = {
			sled: 0,
			cart: 0,
			canoe: 0,
			pack: 0
		};
		let paddles = 0;
		const visible = game.state.units.filter((u) => u.hp > 0 && !u.shelterId && (u.team === 0 || game.visibleAt(u.x, u.z)));
		const neededCargo = {
			food: 0,
			wood: 0,
			stone: 0,
			copper: 0,
			iron: 0
		}, neededVehicles = {
			sled: 0,
			cart: 0,
			canoe: 0,
			pack: 0
		};
		for (const u of visible) {
			const kind = u.boat || u.haulage === "pack" && (!u.packAnimal || u.packAnimal.hp <= 0) ? void 0 : u.haulage === "canoe" ? "canoe" : u.type === "worker" && !u.militia || u.caravanArmed ? u.haulage : void 0;
			if (kind) neededVehicles[kind]++;
			const cargo = u.plantingWork ? "food" : u.carryType;
			if (cargo && (u.plantingWork || u.carry > 0)) neededCargo[cargo]++;
		}
		for (const b of game.state.buildings || []) if (b.hp <= 0 && b.raidLoot && game.visibleAt(b.x, b.z)) {
			for (const kind of Object.keys(CARGO_COLORS)) if ((b.raidLoot[kind] || 0) > 0) neededCargo[kind]++;
		}
		for (const [kind, mesh] of this.cargoMeshes) this.cargoMeshes.set(kind, ensureInstanceCapacity(this.scene, mesh, neededCargo[kind]));
		for (const [kind, mesh] of this.haulageMeshes) this.haulageMeshes.set(kind, ensureInstanceCapacity(this.scene, mesh, neededVehicles[kind]));
		if (this.canoePaddles) this.canoePaddles = ensureInstanceCapacity(this.scene, this.canoePaddles, neededVehicles.canoe);
		for (const u of visible) {
			const kind = u.boat || u.haulage === "pack" && (!u.packAnimal || u.packAnimal.hp <= 0) ? void 0 : u.haulage === "canoe" ? "canoe" : u.type === "worker" && !u.militia || u.caravanArmed ? u.haulage : void 0;
			const vehicle = kind && this.haulageMeshes.get(kind);
			const index = kind ? vehicles[kind] : 0;
			const mounted = !!vehicle && index < instCap(vehicle);
			if (mounted) {
				const dx = Math.sin(u.facing), dz = Math.cos(u.facing), offset = kind === "canoe" ? 0 : 2.1, x = u.x - dx * offset, z = u.z - dz * offset;
				const pitch = -Math.atan2(game.travelHeight(x + dx * .8, z + dz * .8) - game.travelHeight(x - dx * .8, z - dz * .8), 1.6);
				const roll = Math.atan2(game.travelHeight(x + dz * .5, z - dx * .5) - game.travelHeight(x - dz * .5, z + dx * .5), 1);
				const water = kind === "canoe" ? game.waterAt(x, z) : 0;
				const afloat = kind === "canoe" && game.height(x, z) < water + .3;
				_p.set(x, kind === "canoe" ? afloat ? water - .12 : u.y + 1.8 : game.travelHeight(x, z) + .04, z);
				_haulEuler.set(kind === "canoe" ? 0 : MathUtils.clamp(pitch, -.45, .45), u.facing, kind === "canoe" ? 0 : MathUtils.clamp(roll, -.4, .4));
				if (kind === "pack" && Math.hypot(u.vx, u.vz) > .1) {
					const gait = Math.sin(u.stride * 2 + u.id * .7);
					_p.y += Math.abs(gait) * .055;
					_haulEuler.z += gait * .025;
				}
				_q.setFromEuler(_haulEuler);
				_s.set(1, 1, 1);
				_haulMatrix.compose(_p, _q, _s);
				vehicle.setMatrixAt(index, _haulMatrix);
				vehicles[kind]++;
				if (kind === "canoe" && this.canoePaddles && paddles < instCap(this.canoePaddles)) {
					const stroke = afloat && Math.hypot(u.vx, u.vz) > .1 ? Math.sin(game.state.time * 4 + u.id * .7) : 0;
					_p.set(.72, afloat ? .85 : .5, 0);
					_e.set(afloat ? stroke * .65 : Math.PI / 2, 0, afloat ? -.25 : 0);
					_q.setFromEuler(_e);
					_s.set(1, 1, 1);
					_m.compose(_p, _q, _s).premultiply(_haulMatrix);
					this.canoePaddles.setMatrixAt(paddles++, _m);
					_q.setFromEuler(_haulEuler);
				}
			}
			const carryType = u.plantingWork ? "food" : u.carryType, carried = u.plantingWork ? 1 : u.carry;
			if (carried <= 0 || !carryType) continue;
			const mesh = this.cargoMeshes.get(carryType), i = counts[carryType];
			if (!mesh || i >= instCap(mesh)) continue;
			if (mounted && !u.plantingWork) {
				const height = .35 + Math.min(1, carried / carryingCapacity(u, carryType)) * .55;
				_p.set(0, (kind === "cart" ? .7 : kind === "pack" ? 1.05 : .34) + height * .5, kind === "canoe" ? -.85 : 0).applyMatrix4(_haulMatrix);
				_s.set(1.25, height / .55, 1.65);
				_m.compose(_p, _q, _s);
			} else {
				_p.set(u.x - Math.sin(u.facing) * .5, u.y + 1.1, u.z - Math.cos(u.facing) * .5);
				_e.set(0, u.facing, 0);
				_q.setFromEuler(_e);
				_s.set(1, 1, 1);
				_m.compose(_p, _q, _s);
			}
			mesh.setMatrixAt(i, _m);
			_c.set(CARGO_COLORS[carryType]);
			mesh.setColorAt(i, _c);
			counts[carryType]++;
		}
		for (const b of game.state.buildings || []) {
			if (b.hp > 0 || !b.raidLoot || !game.visibleAt(b.x, b.z)) continue;
			let slot = 0;
			for (const kind of Object.keys(CARGO_COLORS)) {
				const amount = b.raidLoot[kind] || 0, mesh = this.cargoMeshes.get(kind), i = counts[kind];
				if (amount <= 0 || !mesh || i >= instCap(mesh)) continue;
				const x = b.x + (slot % 3 - 1) * 1.5, z = b.z + (Math.floor(slot / 3) - .5) * 1.5;
				const size = Math.min(1.8, .45 + Math.cbrt(amount / 12) * .45);
				_p.set(x, game.height(x, z) + .4 * size, z);
				_e.set(0, b.id % 7 * .37, 0);
				_q.setFromEuler(_e);
				_s.setScalar(size);
				_m.compose(_p, _q, _s);
				mesh.setMatrixAt(i, _m);
				_c.set(CARGO_COLORS[kind]);
				mesh.setColorAt(i, _c);
				counts[kind]++;
				slot++;
			}
		}
		for (const [kind, mesh] of this.cargoMeshes) {
			mesh.count = counts[kind];
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		}
		if (this.canoePaddles) {
			this.canoePaddles.count = paddles;
			this.canoePaddles.instanceMatrix.needsUpdate = true;
		}
		for (const [kind, vehicle] of this.haulageMeshes) {
			vehicle.count = vehicles[kind];
			vehicle.instanceMatrix.needsUpdate = true;
		}
	}
	syncRiverboatMeshes(game) {
		this.hullFleet?.sync(game, this.shadowsEnabled);
		this.sailRigs?.sync(game, this.shadowsEnabled);
		const mesh = this.riverboats;
		if (!mesh) return;
		let count = 0;
		for (const b of game.state.boats || []) {
			if (b.hullClass || b.hp <= 0 || count >= instCap(mesh) || b.team !== 0 && !game.exploredAt(b.x, b.z)) continue;
			_p.set(b.x, game.waterAt(b.x, b.z) - .12, b.z);
			_e.set(0, b.facing, 0);
			_q.setFromEuler(_e);
			_s.set(1, 1, 1);
			_m.compose(_p, _q, _s);
			mesh.setMatrixAt(count++, _m);
		}
		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
	}
	syncUnits(game) {
		this.wornGarments?.beginFrame(this.quality, this.shadowsEnabled);
		this.wornArmor?.beginFrame(this.quality, this.shadowsEnabled);
		this.waterVessels?.beginFrame(this.quality, this.shadowsEnabled);
		this.baskets?.beginFrame(this.quality, this.shadowsEnabled, this.camera.position);
		const grouped = /* @__PURE__ */ new Map();
		for (const t of UNIT_TYPES) grouped.set(t, []);
		for (const u of game.state.units) if (u.hp > 0) grouped.get(u.type)?.push(u);
		const foodWork = /* @__PURE__ */ new Map();
		for (const project of game.state.production?.projects || []) {
			if (project.phase !== "working" || project.actorId === null || project.blockedReason) continue;
			if (/^(threshCereal|winnowCereal|grindGrain|bakeBread|cookFish|cookMeat|cookPorridge)/.test(project.recipe)) foodWork.set(project.actorId, {
				recipe: project.recipe,
				siteId: project.workplace
			});
		}
		let feedback = 0, toolCount = 0;
		for (const u of game.state.units) if (u.hp > 0 && !u.shelterId && (u.team === 0 || game.visibleAt(u.x, u.z))) {
			if (unitFeedbackVisible(u, this.hoveredUnitId, this.unitRingsEnabled)) feedback++;
			if (u.type === "worker" && !u.militia && u.farmTool) toolCount++;
		}
		const selectedBoat = game.state.boats?.find((b) => b.id === game.selectedBoat && b.hp > 0 && b.team === 0);
		this.rings = ensureInstanceCapacity(this.scene, this.rings, feedback + (game.state.selBld && game.state.selBld.hp > 0 ? 1 : 0) + (selectedBoat ? 1 : 0));
		if (this.farmToolMesh) this.farmToolMesh = ensureInstanceCapacity(this.scene, this.farmToolMesh, toolCount);
		let ri = 0, tools = 0;
		for (const t of UNIT_TYPES) {
			const old = this.unitMeshes.get(t);
			if (!old) {
				this.unitInstanceOwners.set(t, []);
				continue;
			}
			const list = admitVisibleUnits(grouped.get(t), grouped.get(t).length, (u) => u.team === 0 || game.visibleAt(u.x, u.z), this.hoveredUnitId);
			const mesh = ensureInstanceCapacity(this.scene, old, list.length);
			this.unitMeshes.set(t, mesh);
			this.unitInstanceOwners.set(t, list);
			const n = list.length;
			for (let i = 0; i < n; i++) {
				const u = list[i];
				const walking = Math.hypot(u.vx, u.vz) > .35;
				const chopping = !walking && (u.order === "gather" || u.order === "attack" || u.order === "build" || !!u.copperStudy && !u.copperStudy.paused);
				const farming = !walking && u.order === "gather" && (!!u.plantingWork || u.node && "type" in u.node && u.node.type === "farm");
				const work = !walking ? foodWork.get(u.id) : void 0;
				const site = work ? game.state.buildings.find((b) => b.id === work.siteId) : void 0;
				const rhythm = game.state.time * (work?.recipe.startsWith("thresh") ? 10 : 5) + u.id * .75;
				const swing = (1 + Math.sin(rhythm)) * .5;
				const workPitch = work?.recipe.startsWith("thresh") ? .48 * swing ** 3 : work?.recipe.startsWith("winnow") ? -.12 * Math.sin(rhythm) : work?.recipe.startsWith("grind") ? .25 + .14 * Math.sin(rhythm) : .09 + .31 * swing;
				const phase = u.stride;
				const afloat = u.haulage === "canoe" && game.height(u.x, u.z) < game.waterAt(u.x, u.z) + .3;
				const bob = afloat ? Math.sin(game.state.time * 2 + u.id) * .025 : walking ? Math.abs(Math.sin(phase)) * .16 : chopping ? Math.abs(Math.sin(phase)) * .08 : 0;
				const pitch = afloat ? 0 : walking ? Math.sin(phase) * .22 : work ? workPitch : farming ? .18 + Math.sin(phase) * .16 : chopping ? Math.sin(phase) * .14 : 0;
				const roll = afloat ? 0 : walking ? Math.sin(phase * 2) * .12 : work?.recipe.startsWith("winnow") ? Math.sin(rhythm) * .23 : 0;
				const yScale = afloat ? 1.3 : walking ? 1.65 * (1 + Math.sin(phase * 2) * .045) : 1.65;
				const st = TEAM_STYLE[u.team] || TEAM_STYLE[0];
				const body = (u.type === "leader" ? 1.95 : 1.65) * (u.stature || 1) * (u.team === 1 ? 1.12 : u.team === 2 ? .92 : 1);
				_p.set(u.x, u.y + bob, u.z);
				_e.set(pitch, site ? Math.atan2(site.x - u.x, site.z - u.z) : u.facing, roll);
				_q.setFromEuler(_e);
				_s.set(body * st.sx, (u.type === "leader" ? yScale * 1.18 : yScale) * (u.stature || 1) * st.sy, body * st.sz);
				_m.compose(_p, _q, _s);
				mesh.setMatrixAt(i, _m);
				this.wornGarments?.write(game, u, _m);
				this.wornArmor?.write(game, u, _m);
				this.waterVessels?.write(game, u, _m);
				this.baskets?.write(game, u, _m);
				const tool = u.farmTool;
				if (tool && u.type === "worker" && !u.militia && this.farmToolMesh && tools < instCap(this.farmToolMesh)) {
					this.farmToolMesh.setMatrixAt(tools, _m);
					_c.set(FARM_TOOL_COLORS[tool]);
					this.farmToolMesh.setColorAt(tools, _c);
					tools++;
				}
				_c.set(st.unit);
				_c.offsetHSL(((u.tint || 0) - .5) * .12, .04, ((u.stature || 1) - 1) * .12);
				if (mesh.instanceColor) mesh.setColorAt(i, _c);
				if (unitFeedbackVisible(u, this.hoveredUnitId, this.unitRingsEnabled) && ri < instCap(this.rings)) {
					_p.set(u.x, u.y + .05, u.z);
					_e.set(-Math.PI / 2, 0, 0);
					_q.setFromEuler(_e);
					_s.set(u.r * 1.6, u.r * 1.6, 1);
					_m.compose(_p, _q, _s);
					this.rings.setMatrixAt(ri, _m);
					ri++;
				}
			}
			mesh.count = n;
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		}
		this.wornGarments?.endFrame();
		this.wornArmor?.writeGround(game, this.camera);
		this.wornArmor?.endFrame();
		this.waterVessels?.endFrame();
		this.baskets?.endFrame();
		if (this.farmToolMesh) {
			this.farmToolMesh.count = tools;
			this.farmToolMesh.instanceMatrix.needsUpdate = true;
			if (this.farmToolMesh.instanceColor) this.farmToolMesh.instanceColor.needsUpdate = true;
		}
		if (game.state.selBld && game.state.selBld.hp > 0 && ri < instCap(this.rings)) {
			const b = game.state.selBld;
			_p.set(b.x, b.y + .06, b.z);
			_e.set(-Math.PI / 2, 0, 0);
			_q.setFromEuler(_e);
			_s.set(Math.max(b.w, b.d) * .55, Math.max(b.w, b.d) * .55, 1);
			_m.compose(_p, _q, _s);
			this.rings.setMatrixAt(ri, _m);
			ri++;
		}
		const boat = selectedBoat;
		if (boat && ri < instCap(this.rings)) {
			_p.set(boat.x, game.world.waterY + .08, boat.z);
			_e.set(-Math.PI / 2, 0, 0);
			_q.setFromEuler(_e);
			_s.set(4, 4, 1);
			_m.compose(_p, _q, _s);
			this.rings.setMatrixAt(ri++, _m);
		}
		const resource = game.selectedResource;
		const reach = game.selectedWaterReach, marker = resource ?? reach;
		this.resourceRing.visible = !!marker && (!resource || resource.amount > 0) && game.exploredAt(marker.x, marker.z);
		if (marker && this.resourceRing.visible) {
			const positions = this.resourceRing.geometry.getAttribute("position");
			for (let i = 0; i < positions.count; i++) {
				const x = marker.x + positions.getX(i), z = marker.z + positions.getZ(i);
				positions.setY(i, (reach ? Math.max(game.height(x, z), game.waterAt(x, z)) : game.height(x, z)) + .12);
			}
			positions.needsUpdate = true;
			this.resourceRing.position.set(marker.x, 0, marker.z);
		}
		this.rings.count = ri;
		this.rings.instanceMatrix.needsUpdate = true;
		let wi = 0;
		const wcap = instCap(this.workRings);
		for (const b of game.state.buildings) {
			if (b.hp <= 0 || b.team !== 0) continue;
			const r = b.type === "lumber" ? 18 : b.type === "quarry" ? 32 : b.type === "dock" ? 20 : 0;
			if (!r) continue;
			if (b.type !== "lumber" && !b.selected && game.state.placing !== b.type) continue;
			if (wi >= wcap) break;
			const scale = r / 18;
			_p.set(b.x, b.y + .08, b.z);
			_e.set(-Math.PI / 2, 0, 0);
			_q.setFromEuler(_e);
			_s.set(scale, scale, 1);
			_m.compose(_p, _q, _s);
			this.workRings.setMatrixAt(wi, _m);
			wi++;
		}
		if (game.state.placing === "lumber" && this.ghost.visible && wi < wcap) {
			_p.set(this.ghost.position.x, this.ghost.position.y + .08, this.ghost.position.z);
			_e.set(-Math.PI / 2, 0, 0);
			_q.setFromEuler(_e);
			_s.set(1, 1, 1);
			_m.compose(_p, _q, _s);
			this.workRings.setMatrixAt(wi, _m);
			wi++;
		}
		this.workRings.count = wi;
		this.workRings.instanceMatrix.needsUpdate = true;
	}
	syncGhost(_game) {}
	setLinePreview(points) {
		if (!points.length) {
			if (this.linePreview) this.linePreview.visible = false;
			return;
		}
		if (!this.linePreview) {
			this.linePreview = new InstancedMesh(new BoxGeometry(3.8, .25, 3.8), new MeshBasicMaterial({
				transparent: true,
				opacity: .65,
				depthWrite: false
			}), 32);
			this.linePreview.frustumCulled = false;
			this.scene.add(this.linePreview);
		}
		this.linePreview.visible = true;
		this.linePreview.count = Math.min(32, points.length);
		const matrix = new Matrix4(), color = new Color();
		for (let i = 0; i < this.linePreview.count; i++) {
			const p = points[i];
			matrix.makeTranslation(p.x, p.y + .2, p.z);
			this.linePreview.setMatrixAt(i, matrix);
			color.set(p.ok ? "#75db9a" : "#f06958");
			this.linePreview.setColorAt(i, color);
		}
		this.linePreview.instanceMatrix.needsUpdate = true;
		if (this.linePreview.instanceColor) this.linePreview.instanceColor.needsUpdate = true;
	}
	setGhost(type, x, z, y, ok, quality, bridge, size, gateFacing, towerPlatform) {
		if (!type) {
			this.clearGhost();
			this.ghost.visible = false;
			return;
		}
		this.ghost.visible = true;
		this.ghost.position.set(x, y, z);
		this.ghost.rotation.set(0, type === "gate" ? gateOrientation(gateFacing).yawRadians : 0, 0);
		this.ghost.scale.set(1, 1, 1);
		if (bridge) {
			const len = Math.hypot(bridge.bx - bridge.ax, bridge.bz - bridge.az);
			this.ghost.position.set((bridge.ax + bridge.bx) / 2, y, (bridge.az + bridge.bz) / 2);
			this.ghost.rotation.y = Math.atan2(bridge.bx - bridge.ax, bridge.bz - bridge.az);
			this.ghost.scale.z = len / 12;
		}
		const qualityStep = quality === void 0 ? null : Math.round(quality * 10) / 10;
		const key = type + (ok ? "-ok" : "-bad") + qualityStep + JSON.stringify(size) + (type === "watchtower" && towerPlatform ? towerPlatformGeometryKey(towerPlatform) : "");
		if (this.ghost.userData.key === key) return;
		this.clearGhost();
		this.ghost.userData.key = key;
		const meshes = this.bldMeshes.get(type);
		if (!meshes) return;
		const tint = !ok ? "#b53632" : qualityStep === null ? "#6a8a48" : new Color("#a69b46").lerp(new Color("#29df51"), qualityStep).getHex();
		const mt = this.mats.timber.clone();
		mt.transparent = true;
		mt.opacity = .55;
		mt.depthWrite = false;
		mt.color.set(tint);
		mt.emissive.set(tint);
		mt.emissiveIntensity = .35;
		const mr = this.mats.thatch.clone();
		mr.transparent = true;
		mr.opacity = .5;
		mr.depthWrite = false;
		mr.color.set(ok ? "#8aaa58" : "#a05048");
		const add = (geometry, material, x = 0, z = 0, sx = 1, sz = 1) => {
			const mesh = new Mesh(geometry, material);
			mesh.position.set(x, 0, z);
			mesh.scale.set(sx, 1, sz);
			this.ghost.add(mesh);
		};
		if (type === "watchtower" && towerPlatform) {
			const geo = towerPlatformGeos(towerPlatform);
			add(geo.timber, mt);
			if (geo.extra) add(geo.extra, mt);
			add(geo.roof, mr);
		} else if (size && (type === "warehouse" || expandedGrainWorkplace({
			type,
			...size
		}))) for (const m of plotModules({
			type,
			...size
		})) {
			add(meshes.timber.geometry, mt, m.x, m.z, m.sx, m.sz);
			add(meshes.roof.geometry, mr, m.x, m.z, m.sx, m.sz);
		}
		else if (type === "pen") {
			add(meshes.timber.geometry, mt);
			add(meshes.roof.geometry, mr);
			const w = size?.w ?? BUILDINGS.pen.w, d = size?.d ?? BUILDINGS.pen.d;
			for (const side of [-1, 1]) {
				const across = new BoxGeometry(w, .08, .1), along = new BoxGeometry(.1, .08, d);
				across.userData.ownedGhost = along.userData.ownedGhost = true;
				add(across, mt, 0, side * d / 2);
				add(along, mt, side * w / 2, 0);
			}
		} else if (size && type === "farm") {
			add(meshes.timber.geometry, mt, 0, 0, size.w / BUILDINGS.farm.w, size.d / BUILDINGS.farm.d);
			add(meshes.roof.geometry, mr, (size.w - BUILDINGS.farm.w) / 2, (size.d - BUILDINGS.farm.d) / 2);
		} else {
			add(meshes.timber.geometry, mt);
			add(meshes.roof.geometry, mr);
		}
		const pad = new Mesh(new PlaneGeometry(size?.w ?? (type === "fibreWorkshop" ? BUILDINGS.fibreWorkshop.w : 8), size?.d ?? (type === "fibreWorkshop" ? BUILDINGS.fibreWorkshop.d : 8)), new MeshBasicMaterial({
			color: tint,
			transparent: true,
			opacity: .35,
			side: 2,
			depthWrite: false
		}));
		if (type === "pen") pad.geometry.userData.ownedGhost = true;
		pad.rotation.x = -Math.PI / 2;
		pad.position.y = .08;
		if (type !== "bridge") this.ghost.add(pad);
		else {
			pad.geometry.dispose();
			pad.material.dispose();
		}
		if (type === "lumber") {
			const ring = new Mesh(new RingGeometry(17.5, 18.25, 48), new MeshBasicMaterial({
				color: ok ? "#8ab050" : "#8a3a32",
				transparent: true,
				opacity: .55,
				side: 2,
				depthWrite: false
			}));
			ring.rotation.x = -Math.PI / 2;
			ring.position.y = .1;
			this.ghost.add(ring);
		}
	}
	clearGhost() {
		while (this.ghost.children.length) {
			const ch = this.ghost.children[0];
			this.ghost.remove(ch);
			if (ch.geometry?.userData.ownedGhost) ch.geometry.dispose();
			const mat = ch.material;
			if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
			else if (mat) mat.dispose();
		}
		this.ghost.userData.key = "";
	}
	syncArrows(game) {
		const ps = game.state.projectiles;
		let arrows = 0, stones = 0;
		ps.forEach((p) => {
			if (p.huntingWeapon === "stone") {
				if (stones < 40) {
					_p.set(p.x, p.y, p.z);
					_q.identity();
					_s.set(1, 1, 1);
					_m.compose(_p, _q, _s);
					this.huntingStones.setMatrixAt(stones++, _m);
				}
				return;
			}
			if (arrows >= 40) return;
			_p.set(p.x, p.y, p.z);
			const dx = p.huntingVelocity?.x ?? p.tx - p.x, dy = p.huntingVelocity?.y ?? p.ty - p.y, dz = p.huntingVelocity?.z ?? p.tz - p.z;
			_e.set(0, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
			_q.setFromEuler(_e);
			_s.set(1, 1, 1);
			_m.compose(_p, _q, _s);
			this.arrows.setMatrixAt(arrows++, _m);
		});
		this.arrows.count = arrows;
		this.huntingStones.count = stones;
		this.huntingStones.instanceMatrix.needsUpdate = true;
		this.arrows.instanceMatrix.needsUpdate = true;
	}
	syncSmoke(game, dt) {
		const litHearths = workingHearths(game);
		const bakingOvens = new Set((game.state.production?.projects || []).filter((p) => (p.recipe === "bakeBreadOven" || p.recipe === "bakeBreadDouble" || p.recipe === "bakeBreadBulk") && p.phase === "working" && !p.blockedReason).map((p) => p.workplace));
		const halls = game.state.buildings.filter((b) => b.type === "townhall" && game.finished(b) && survivalFireActive(game, b.team) && !game.state.buildings.some((h) => h.team === b.team && litHearths.has(h.id)));
		const sources = game.state.buildings.filter((b) => (litHearths.has(b.id) || bakingOvens.has(b.id)) && game.finished(b) && (b.team === 0 || game.visibleAt(b.x, b.z)));
		const count = Math.min(this.smokePos.length / 3, sources.length * 8);
		this.smokeGeo.setDrawRange(0, count);
		for (let i = 0; i < count; i++) {
			const source = sources[i % sources.length];
			const t = game.state.time * .55 + i * .67;
			const height = t % 3.2 / 3.2;
			this.smokePos[i * 3] = source.x + Math.sin(t) * (.16 + height * .55);
			this.smokePos[i * 3 + 1] = source.y + (source.type === "oven" ? 1.6 : .3) + height * 4.3;
			this.smokePos[i * 3 + 2] = source.z + Math.cos(t * .7) * (.1 + height * .35);
		}
		this.smokeGeo.attributes.position.needsUpdate = true;
		if (this.flames) {
			const night = game.isNight();
			let fi = 0;
			const torchBlds = game.state.buildings.filter((b) => b.hp > 0 && game.finished(b) && (halls.includes(b) || b.type === "hut" || b.type === "watchtower" || b.type === "keep" || b.type === "lumber" || b.type === "barracks"));
			for (const h of torchBlds) {
				if (fi >= 40) break;
				const flicker = .85 + Math.sin(game.state.time * 11 + fi) * .18;
				_p.set(h.x + 1.2, h.y + (night ? 1.35 : .28), h.z + (h.type === "townhall" ? 4.2 : 1.4));
				_e.set(0, fi, 0);
				_q.setFromEuler(_e);
				const on = night || h.type === "townhall";
				_s.set(on ? .55 : .001, on ? flicker : .001, on ? .55 : .001);
				_m.compose(_p, _q, _s);
				this.flames.setMatrixAt(fi++, _m);
			}
			for (const b of game.state.buildings) {
				if (fi >= instCap(this.flames)) break;
				if (!litHearths.has(b.id) || !(b.team === 0 || game.visibleAt(b.x, b.z))) continue;
				_p.set(b.x, foundationProfile(game, b).level + .18, b.z);
				_q.identity();
				_s.set(.42, .55 + Math.sin(game.state.time * 8 + b.id) * .06, .42);
				_m.compose(_p, _q, _s);
				this.flames.setMatrixAt(fi++, _m);
			}
			let pi = 0;
			for (const h of halls) {
				if (pi >= instCap(this.pits)) break;
				_p.set(h.x + 1.6, h.y, h.z + 4.2);
				_q.set(0, 0, 0, 1);
				_s.setScalar(1);
				_m.compose(_p, _q, _s);
				this.pits.setMatrixAt(pi++, _m);
			}
			if (night) for (const u of game.state.units) {
				if (fi >= instCap(this.flames) || pi >= instCap(this.pits)) break;
				if (u.hp <= 0 || !u.expedition || u.expedition.returning || !(u.workReason || "").startsWith("Night camp") || !game.visibleAt(u.x, u.z)) continue;
				_p.set(u.x + .9, u.y, u.z + .8);
				_q.set(0, 0, 0, 1);
				_s.setScalar(.5);
				_m.compose(_p, _q, _s);
				this.pits.setMatrixAt(pi++, _m);
				_p.y += .25;
				_s.set(.3, .5, .3);
				_m.compose(_p, _q, _s);
				this.flames.setMatrixAt(fi++, _m);
			}
			this.pits.count = pi;
			this.pits.instanceMatrix.needsUpdate = true;
			if (night) {
				let torches = 0;
				for (const u of game.state.units) {
					if (fi >= instCap(this.flames) || torches >= 12) break;
					if (u.hp <= 0 || u.shelterId) continue;
					const flicker = .7 + Math.sin(game.state.time * 14 + u.id) * .2;
					_p.set(u.x + Math.sin(u.facing) * .35, u.y + 1.15, u.z + Math.cos(u.facing) * .35);
					_e.set(0, u.facing, 0);
					_q.setFromEuler(_e);
					_s.set(.28, flicker * .55, .28);
					_m.compose(_p, _q, _s);
					this.flames.setMatrixAt(fi++, _m);
					torches++;
				}
			}
			this.flames.count = fi;
			this.flames.instanceMatrix.needsUpdate = true;
			const spots = [];
			for (const h of torchBlds) if (h.type === "townhall" || h.type === "watchtower" || h.type === "keep" || night && h.type === "hut") spots.push({
				x: h.x,
				y: h.y + 2.2,
				z: h.z
			});
			this.torchLights.forEach((L, i) => {
				const s = spots[i];
				if (!s) {
					L.intensity = 0;
					return;
				}
				L.position.set(s.x, s.y, s.z);
				L.intensity = night ? 1.55 + Math.sin(game.state.time * 9 + i) * .25 : i === 0 ? .45 : .12;
				L.distance = night ? 24 : 14;
			});
		}
		const fire = sources.find((b) => b.team === 0 && litHearths.has(b.id));
		const home = halls.find((b) => b.team === 0);
		if (fire || home) {
			const site = fire || home;
			this.hearth.position.set(site.x + (fire ? 0 : 1.6), site.y + .85, site.z + (fire ? 0 : 4.2));
			this.hearth.intensity = (game.isNight() ? 2.4 : 1.35) + Math.sin(game.state.time * 9) * .25;
		} else this.hearth.intensity = 0;
	}
	render() {
		this.latestRenderMetrics = void 0;
		if (this.lost || this.disposed) return;
		beginRendererFrame(this.renderer.info);
		try {
			try {
				if (this.composer && this.quality !== "low") this.composer.render();
				else this.renderer.render(this.scene, this.camera);
			} catch {
				this.composer?.dispose();
				this.bloom?.dispose();
				this.composer = null;
				this.bloom = null;
				try {
					this.renderer.render(this.scene, this.camera);
				} catch {
					this.lost = true;
				}
			}
		} finally {
			this.latestRenderMetrics = rendererFrameMetrics(this.renderer.info);
		}
	}
	onGlLost = (e) => {
		e.preventDefault();
		this.lost = true;
		this.composer = null;
		this.bloom = null;
		this.onContextLost?.();
	};
	onGlRestored = () => {
		this.lost = false;
		this.resize();
		this.setupComposer();
		this.onContextRestored?.();
	};
	makeWaterMat() {
		return makeDepthWater(this.terrainSurface, this.timeU);
	}
	setupGodrays() {
		const geo = new PlaneGeometry(3.2, 44);
		for (let i = 0; i < 4; i++) {
			const mat = new MeshBasicMaterial({
				color: "#ffe6b8",
				transparent: true,
				opacity: .03,
				blending: 2,
				depthWrite: false,
				side: 2,
				fog: false,
				toneMapped: true
			});
			const mesh = new Mesh(geo, mat);
			mesh.renderOrder = 4;
			mesh.frustumCulled = false;
			this.scene.add(mesh);
			this.godrays.push(mesh);
		}
	}
	setupFow() {
		this.fowTex = new DataTexture(this.fowData, 192, 192, RGBAFormat);
		this.fowTex.magFilter = LinearFilter;
		this.fowTex.minFilter = LinearFilter;
		this.fowTex.needsUpdate = true;
		this.terrTex = new DataTexture(this.terrData, 192, 192, RGBAFormat);
		this.terrTex.magFilter = LinearFilter;
		this.terrTex.minFilter = LinearFilter;
		this.terrTex.needsUpdate = true;
		const mat = new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			uniforms: {
				uMap: { value: this.fowTex },
				uTime: this.timeU,
				uTerr: { value: this.terrTex },
				uHalf: { value: this.mapSize / 2 },
				uSize: { value: this.mapSize }
			},
			vertexShader: `
        uniform float uHalf;
        uniform float uSize;
        varying vec2 vUv;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vUv = (w.xz + vec2(uHalf)) / uSize;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
			fragmentShader: `
        uniform float uTime;
        uniform sampler2D uMap;
        uniform sampler2D uTerr;
        varying vec2 vUv;
        void main() {
          float v = texture2D(uMap, vUv).r;
          vec4 terr = texture2D(uTerr, vUv);
          float live = smoothstep(0.55, 0.85, v);
          float shroudA = mix(0.98, 0.10, smoothstep(0.05, 0.32, v)) * (1.0 - live);
          float seen = smoothstep(0.12, 0.28, v);
          // Colored land remains visible without concealing terrain detail.
          float contour = smoothstep(0.08,0.16,terr.a)*(1.0-smoothstep(0.22,0.32,terr.a));
          float wash = seen * (terr.a*mix(0.23,0.43,live) + contour*mix(0.24,0.45,live));
          float a = max(shroudA, wash);
          if (a < 0.012) discard;
          float cloud = sin(vUv.x * 115.0 + uTime * 0.08) * sin(vUv.y * 93.0 - uTime * 0.06);
          vec3 mist = mix(vec3(0.72, 0.82, 0.86), vec3(0.9, 0.94, 0.94), 0.5 + cloud * 0.22);
          vec3 col = mix(mist, terr.rgb, wash / max(a, 0.001));
          gl_FragColor = vec4(col, a);
        }`
		});
		this.fowMesh = new Mesh(new PlaneGeometry(this.mapSize, this.mapSize, 256, 256), mat);
		this.fowMesh.rotation.x = -Math.PI / 2;
		this.fowMesh.position.y = .45;
		this.fowMesh.renderOrder = 6;
		this.fowMesh.raycast = () => {};
		this.scene.add(this.fowMesh);
	}
	setupComposer() {
		try {
			this.composer?.dispose();
			this.bloom?.dispose();
			this.composer = null;
			this.bloom = null;
			if (this.quality === "low") return;
			const el = this.renderer.domElement;
			const w = el.clientWidth || 800;
			const h = el.clientHeight || 600;
			this.composer = new EffectComposer(this.renderer);
			this.composer.addPass(new RenderPass(this.scene, this.camera));
			this.bloom = new UnrealBloomPass(new Vector2(w, h), .14, .28, .92);
			this.composer.addPass(this.bloom);
			const vig = new ShaderPass({
				uniforms: {
					tDiffuse: { value: null },
					offset: { value: .85 },
					darkness: { value: .12 }
				},
				vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
				fragmentShader: `
          uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv;
          void main(){
            vec4 c = texture2D(tDiffuse, vUv);
            vec2 uv = (vUv - 0.5) * vec2(offset);
            float vig = clamp(1.0 - dot(uv, uv) * darkness, 0.35, 1.0);
            gl_FragColor = vec4(c.rgb * vig, c.a);
          }`
			});
			this.composer.addPass(vig);
			this.composer.addPass(new FilmPass(.025, false));
			this.composer.addPass(new OutputPass());
			this.composer.setSize(w, h);
		} catch {
			this.composer?.dispose();
			this.bloom?.dispose();
			this.composer = null;
			this.bloom = null;
		}
	}
	syncFow(game) {
		if (!this.fowTex) return;
		const src = game.vision;
		const cols = [];
		for (let t = 0; t < game.state.tribes.length; t++) {
			const hex = game.tribe(t)?.color || "#c4a060";
			const n = Number.parseInt(hex.replace("#", ""), 16);
			cols.push([
				n >> 16 & 255,
				n >> 8 & 255,
				n & 255
			]);
		}
		const terr = game.territory;
		for (let i = 0; i < src.length; i++) {
			const v = src[i] === 2 ? 255 : src[i] === 1 ? 90 : 0;
			const o = i * 4;
			this.fowData[o] = v;
			this.fowData[o + 1] = v;
			this.fowData[o + 2] = v;
			this.fowData[o + 3] = 255;
			const team = terr ? terr[i] : 255;
			if (!(src[i] > 0) || team === 255 || team === void 0) {
				this.terrData[o] = 0;
				this.terrData[o + 1] = 0;
				this.terrData[o + 2] = 0;
				this.terrData[o + 3] = 0;
			} else if (team === 254) {
				this.terrData[o] = 196;
				this.terrData[o + 1] = 154;
				this.terrData[o + 2] = 92;
				this.terrData[o + 3] = Math.round(255 * (game.territoryStrength[i] || 0));
			} else {
				const c = cols[team] || cols[0];
				this.terrData[o] = c[0];
				this.terrData[o + 1] = c[1];
				this.terrData[o + 2] = c[2];
				this.terrData[o + 3] = Math.round(255 * (game.territoryStrength[i] || 0));
			}
		}
		this.fowTex.needsUpdate = true;
		if (this.terrTex) this.terrTex.needsUpdate = true;
	}
	syncRain(game, dt) {
		if (!this.rain || !this.rainGeo) return;
		const sn = game.seasonMix();
		const mountain = game.height(this.look.x, this.look.z) > 8;
		const flake = sn.winter > .3 && (mountain || sn.snow > .35);
		const wet = game.state.weather === "rain" || game.state.weather === "storm" || game.state.weather === "flood" || flake && Math.sin(game.state.time / 24) > (mountain ? -.15 : .5);
		this.rain.visible = wet;
		this.rainGeo.setDrawRange(0, this.quality === "low" ? 96 : this.rainPos.length / 3);
		if (!wet) return;
		const n = this.rainPos.length / 3;
		const look = this.look;
		const heavy = flake ? 7 : game.state.weather === "storm" ? 28 : 16;
		const mat = this.rain.material;
		mat.color.set(flake ? "#eef4fa" : "#c5d4e4");
		mat.size = flake ? .22 : .11;
		mat.opacity = flake ? .7 : game.state.weather === "storm" ? .55 : .38;
		for (let i = 0; i < n; i++) {
			const o = i * 3;
			let x = this.rainPos[o];
			let y = this.rainPos[o + 1];
			let z = this.rainPos[o + 2];
			if (x === 0 && y === 0 && z === 0) {
				x = look.x + (Math.random() - .5) * 42;
				y = look.y + 6 + Math.random() * 14;
				z = look.z + (Math.random() - .5) * 42;
			}
			y -= heavy * dt;
			x += dt * (flake ? 1.4 : game.state.weather === "storm" ? -3 : -1.2);
			if (y < look.y - .2) {
				x = look.x + (Math.random() - .5) * 42;
				y = look.y + 8 + Math.random() * 12;
				z = look.z + (Math.random() - .5) * 42;
			}
			this.rainPos[o] = x;
			this.rainPos[o + 1] = y;
			this.rainPos[o + 2] = z;
		}
		const attr = this.rainGeo.getAttribute("position");
		attr.needsUpdate = true;
	}
	paintSeason(game, dt) {
		this.seasonAcc += dt;
		if (this.seasonAcc < 1 && this.lastSnow >= 0) return;
		this.seasonAcc = 0;
		const sn = game.seasonMix();
		this.lastSnow = sn.snow;
		if (this.terrainSurface) {
			this.terrainSurface.snow.value = sn.snow;
			this.terrainSurface.heights.needsUpdate = true;
		}
		const geo = this.terrain.geometry;
		const colAttr = geo.getAttribute("color");
		const pos = geo.attributes.position;
		const biome = this.terrainBiome;
		const region = this.terrainRegion;
		if (!colAttr || !biome) return;
		const arr = colAttr.array;
		const c = _c;
		for (let i = 0; i < pos.count; i++) {
			const h = pos.getY(i);
			const b = biome[i];
			const n = (Math.sin(pos.getX(i) * .21) + Math.cos(pos.getZ(i) * .17)) * .08;
			if (b === 0) c.set("#cbb892");
			else if (b === 1) c.set("#c8b89a");
			else if (b === 5) c.set("#b8b4ac");
			else if (b === 6) c.set("#c4a070");
			else if (b === 7) c.set("#c8c4bc");
			else if (b === 4) c.setRGB(.55 * sn.spring + .52 * sn.summer + .5 * sn.autumn + .48 * sn.winter, .48 * sn.spring + .46 * sn.summer + .38 * sn.autumn + .42 * sn.winter, .28 * sn.spring + .26 * sn.summer + .2 * sn.autumn + .32 * sn.winter);
			else if (b === 8) c.setRGB(.28 * sn.spring + .24 * sn.summer + .36 * sn.autumn + .28 * sn.winter, .44 * sn.spring + .39 * sn.summer + .33 * sn.autumn + .34 * sn.winter, .2 * sn.spring + .16 * sn.summer + .16 * sn.autumn + .25 * sn.winter);
			else {
				const gR = .42 * sn.spring + .36 * sn.summer + .48 * sn.autumn + .4 * sn.winter;
				const gG = .72 * sn.spring + .62 * sn.summer + .38 * sn.autumn + .44 * sn.winter;
				const gB = .32 * sn.spring + .26 * sn.summer + .16 * sn.autumn + .32 * sn.winter;
				if (b === 3) c.setRGB(gR * .92, gG * 1.08, gB * .9);
				else c.setRGB(gR, gG, gB);
			}
			const rk = region ? region[i] : 255;
			if (rk === 0) {
				c.r = c.r * .88 + .0552;
				c.g = c.g * .78 + .0924;
				c.b = c.b * .82 + .0684;
			} else if (rk === 1) {
				c.r = c.r * .9;
				c.g = Math.min(1, c.g * 1.12 + .04);
				c.b = Math.min(1, c.b * 1.06 + .02);
			} else if (rk === 2) {
				c.r = c.r * .86;
				c.g = c.g * .92;
				c.b = c.b * .8;
			} else if (rk === 3) {
				c.r = Math.min(1, c.r * .9 + .18);
				c.g = c.g * .82 + .08;
				c.b = c.b * .7;
			}
			c.r = Math.min(1, c.r + n);
			c.g = Math.min(1, c.g + n * .6);
			const artOffset = i * 5, art = this.terrainLandscape;
			if (art.length && b !== 0 && b !== 1 && b !== 6) {
				const blend = art[artOffset] * LANDSCAPE_ART_RULES.rockBlend;
				c.r += (art[artOffset + 1] - c.r) * blend;
				c.g += (art[artOffset + 2] - c.g) * blend;
				c.b += (art[artOffset + 3] - c.b) * blend;
				c.multiplyScalar(art[artOffset + 4]);
			}
			const snowH = Math.max(0, Math.min(1, (h - 3.2) / 12));
			let cover = Math.max(0, Math.min(1, sn.snow * (.35 + snowH * .75) + (b === 7 || b === 5 ? sn.winter * .25 : 0)));
			if (rk === 0) cover = Math.min(1, cover + sn.winter * .12);
			if (rk === 1) cover *= .72;
			if (cover > .02) {
				c.r = c.r + (.93 - c.r) * cover;
				c.g = c.g + (.95 - c.g) * cover;
				c.b = c.b + (.97 - c.b) * cover;
			}
			const o = i * 3;
			arr[o] = c.r;
			arr[o + 1] = c.g;
			arr[o + 2] = c.b;
		}
		if (this.terrainBlend.length !== arr.length) this.terrainBlend = new Float32Array(arr.length);
		const segments = geo.parameters.widthSegments;
		const width = segments + 1;
		for (let pass = 0; pass < 2; pass++) {
			this.terrainBlend.set(arr);
			for (let i = 0; i < pos.count; i++) {
				const ix = i % width, iz = Math.floor(i / width), o = i * 3;
				for (let channel = 0; channel < 3; channel++) {
					let sum = this.terrainBlend[o + channel] * 4, count = 4;
					if (ix > 0) {
						sum += this.terrainBlend[o - 3 + channel];
						count++;
					}
					if (ix < segments) {
						sum += this.terrainBlend[o + 3 + channel];
						count++;
					}
					if (iz > 0) {
						sum += this.terrainBlend[o - width * 3 + channel];
						count++;
					}
					if (iz < segments) {
						sum += this.terrainBlend[o + width * 3 + channel];
						count++;
					}
					arr[o + channel] = sum / count;
				}
			}
		}
		colAttr.needsUpdate = true;
		if (this.terrainSurface?.bankColors) this.terrainSurface.bankColors.needsUpdate = true;
		if (!this.biomeScene && this.treesLeaf?.instanceColor) {
			const nTree = this.treesLeaf.count;
			for (let i = 0; i < nTree; i++) {
				const hue = .33 * sn.spring + .3 * sn.summer + .075 * sn.autumn + .2 * sn.winter;
				const sat = .62 * sn.spring + .55 * sn.summer + .72 * sn.autumn + .16 * sn.winter;
				const lit = .34 * sn.spring + .32 * sn.summer + .42 * sn.autumn + .48 * sn.winter + i % 6 * .02;
				c.setHSL(hue, sat, lit);
				if (sn.autumn > .4) {
					c.r = c.r + (.62 - c.r) * sn.autumn * .55;
					c.g = c.g + (.32 - c.g) * sn.autumn * .4;
				}
				if (sn.spring > .45) {
					c.g = Math.min(1, c.g + .08 * sn.spring);
					c.r = Math.min(1, c.r + .04 * sn.spring);
				}
				if (sn.snow > .35) {
					const k = Math.min(1, sn.snow * .85);
					c.r = c.r + (.9 - c.r) * k;
					c.g = c.g + (.93 - c.g) * k;
					c.b = c.b + (.95 - c.b) * k;
				}
				const tree = game.state.trees[i];
				if (tree) {
					const tr = game.regionAt(tree.x, tree.z);
					if (tr) {
						if (tr.cluster === 0) {
							c.r = Math.min(1, c.r + .08);
							c.g = c.g * .88;
						} else if (tr.cluster === 1) c.g = Math.min(1, c.g + .07);
						else if (tr.res === "copper") {
							c.r = Math.min(1, c.r + .1);
							c.g = c.g * .9;
						} else {
							c.r = c.r * .9;
							c.g = c.g * .92;
							c.b = c.b * .85;
						}
					}
				}
				if (tree && game.chopMarks.has(tree.id)) c.set("#efb34b");
				this.treesLeaf.setColorAt(i, c);
			}
			this.treesLeaf.instanceColor.needsUpdate = true;
		}
		if (this.grass?.instanceColor) {
			const n = this.grass.count;
			this.grass.visible = this.quality !== "low" && sn.snow < .72;
			for (let i = 0; i < n; i++) {
				c.setHSL(.3 * sn.spring + .28 * sn.summer + .09 * sn.autumn + .16 * sn.winter, .62 * sn.spring + .5 * sn.summer + .55 * sn.autumn + .18 * sn.winter, .38 * sn.spring + .36 * sn.summer + .4 * sn.autumn + .5 * sn.winter + i % 5 * .02);
				const gk = this.grassRegion ? this.grassRegion[i] : 255;
				if (gk === 0) {
					c.r = Math.min(1, c.r + .08);
					c.g = c.g * .82;
					c.b = c.b * .85;
				} else if (gk === 1) {
					c.g = Math.min(1, c.g + .1);
					c.b = Math.min(1, c.b + .03);
				} else if (gk === 2) {
					c.r = c.r * .88;
					c.g = c.g * .9;
				} else if (gk === 3) {
					c.r = Math.min(1, c.r + .14);
					c.g = c.g * .85;
				}
				if (sn.snow > .4) {
					const k = Math.min(1, sn.snow);
					c.r += (.92 - c.r) * k;
					c.g += (.94 - c.g) * k;
					c.b += (.96 - c.b) * k;
				}
				this.grass.setColorAt(i, c);
			}
			this.grass.instanceColor.needsUpdate = true;
		}
		if (this.bushes) this.bushes.material.color.setHSL(.28 * sn.spring + .32 * sn.summer + .06 * sn.autumn + .2 * sn.winter, .45, .38 + sn.spring * .08);
		const waterMat = this.water?.material;
		if (waterMat?.uniforms?.uColor) {
			waterMat.uniforms.uColor.value.set(sn.winter > .5 ? "#8baeb9" : "#53b5b8");
			waterMat.uniforms.uDeep.value.set(sn.winter > .5 ? "#2a4450" : "#123d61");
		}
	}
	disposeWorld() {
		this.foundations?.dispose();
		this.foundations = null;
		this.penFences?.dispose();
		this.penFences = null;
		this.wornGarments?.dispose();
		this.wornGarments = null;
		this.wornArmor?.dispose();
		this.wornArmor = null;
		this.siegeRamLayer?.dispose();
		this.siegeRamLayer = null;
		this.housingPackets?.dispose();
		this.housingPackets = null;
		this.waterVessels?.dispose();
		this.waterVessels = null;
		this.baskets?.dispose();
		this.baskets = null;
		this.fibreWork?.dispose();
		this.fibreWork = null;
		this.wildPlantLayer?.dispose();
		this.wildPlantLayer = null;
		this.landContinuation?.dispose();
		this.landContinuation = null;
		this.bankLayer?.dispose();
		this.bankLayer = null;
		this.excavationLayer?.dispose();
		this.excavationLayer = null;
		this.hullFleet?.dispose();
		this.hullFleet = null;
		this.sailRigs?.dispose();
		this.sailRigs = null;
		this.towerPlatforms?.dispose();
		this.towerPlatforms = null;
		this.contourFields?.dispose();
		this.contourFields = null;
		this.biomeScene?.dispose();
		this.biomeScene = null;
		this.wildlifeOwners.clear();
		if (this.wildSheep && !this.lost) this.wildSheep.material.dispose();
		this.terrainSurface?.dispose();
		this.terrainSurface = null;
		this.localWater = null;
		for (const material of this.waterMaterials) material.dispose();
		this.waterMaterials = [];
		this.campVisual?.dispose();
		this.campVisual = null;
		const keep = /* @__PURE__ */ new Set([
			this.ghost,
			this.arrows,
			this.huntingStones,
			this.smoke,
			this.floaters,
			this.rings,
			this.resourceRing,
			this.trailMesh,
			this.workRings,
			this.hemi,
			this.sun,
			this.sun.target,
			this.fill,
			this.hearth,
			this.sky,
			this.sunDisc,
			this.sunGlow,
			this.bounce,
			this.bounce.target
		]);
		for (const L of this.torchLights) keep.add(L);
		for (const r of this.godrays) keep.add(r);
		if (this.fowMesh) keep.add(this.fowMesh);
		if (this.rain) keep.add(this.rain);
		const toRemove = [];
		this.scene.traverse((o) => {
			if (o === this.scene || keep.has(o) || keep.has(o.parent)) return;
			if (o.parent === this.scene && o !== this.hemi && o !== this.sun && o !== this.fill && o !== this.sun.target) toRemove.push(o);
		});
		for (const o of toRemove) {
			this.scene.remove(o);
			if (this.lost) continue;
			o.traverse((c) => {
				const m = c;
				if (m.geometry) m.geometry.dispose();
			});
		}
		this.wildSheep = null;
		this.domesticSheep = null;
		if (this.linePreview) {
			this.linePreview.material.dispose();
			this.linePreview = null;
		}
		if (this.eraDetails) {
			this.eraDetails.material.dispose();
			this.eraDetails = null;
		}
		this.villageStyles.clear();
		if (this.fieldSurface) {
			this.fieldSurface.dispose();
			this.fieldSurface = null;
		}
		for (const [type, meshes] of this.bldMeshes) {
			if ((type === "farm" || terrainLaidWorkplace(type) || hasBuildingCraftsmanship(type)) && meshes.extra) meshes.extra.material.dispose();
			if (hasBuildingCraftsmanship(type)) for (const mesh of [
				meshes.timber,
				meshes.roof,
				meshes.extra
			]) mesh?.customDepthMaterial?.dispose();
			meshes.timber.material.dispose();
			meshes.roof.material.dispose();
		}
		this.bldMeshes.clear();
		this.buildingInstances.clear();
		this.unitMeshes.clear();
		this.unitInstanceOwners.clear();
		this.haulageMeshes.clear();
		this.canoePaddles = null;
		this.riverboats = null;
		for (const mesh of this.cargoMeshes.values()) mesh.material.dispose();
		this.cargoMeshes.clear();
		if (this.farmToolMesh) {
			this.farmToolMesh.material.dispose();
			this.farmToolMesh = null;
		}
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		const el = this.renderer.domElement;
		el.removeEventListener("webglcontextlost", this.onGlLost);
		el.removeEventListener("webglcontextrestored", this.onGlRestored);
		this.disposeWorld();
		this.renderer.setAnimationLoop(null);
		try {
			this.composer?.dispose();
		} catch {}
		this.composer = null;
		this.bloom = null;
		try {
			this.renderer.dispose();
		} catch {}
		this.smokeTexture.dispose();
		this.smoke.material.dispose();
		this.smokeGeo.dispose();
		disposeBuildingSurfaceTextures(Object.values(this.mats));
		for (const k of Object.values(this.mats)) k.dispose();
	}
};
/** A queued animation frame can predate expensive synchronous world setup.
* Never let that stale timestamp create simulation debt or reverse timers. */
function frameDeltaSeconds(timestamp, last) {
	if (!Number.isFinite(timestamp) || !Number.isFinite(last)) return 0;
	return last ? Math.max(0, Math.min((timestamp - last) / 1e3, .1)) : .016;
}
var Engine = class {
	checkpointSaver;
	get checkpointService() {
		return this.checkpointSaver ??= new SimulationCheckpointSaver({
			checkpoint: () => this.authoritativeCheckpoint(),
			currentEpoch: () => this.dispatchEpoch,
			allowed: () => this.ownerReady
		});
	}
	lifecycleSequence = 0;
	lifecycleBusy = false;
	closing = false;
	disposal = null;
	lastLifecycle = null;
	get ownerReady() {
		return !this.disposed && !this.workerBridgeTransition && (!this.workerHost || this.workerHost.ready);
	}
	beginLifecycle() {
		if (this.disposed || this.closing) throw new Error("The village is closing");
		const token = {
			sequence: this.lifecycleSequence = (this.lifecycleSequence ?? 0) + 1,
			game: this.game,
			host: this.workerHost ?? null,
			epoch: this.dispatchEpoch
		};
		this.lifecycleBusy = true;
		this.autosave.invalidate();
		return token;
	}
	currentLifecycle(t) {
		return !this.disposed && !this.closing && this.lifecycleSequence === t.sequence && this.game === t.game && (this.workerHost ?? null) === t.host && this.dispatchEpoch === t.epoch;
	}
	finishLifecycle(t) {
		if (this.lifecycleSequence === t.sequence) {
			this.lifecycleBusy = false;
			if (!this.disposed && !this.closing) this.pushHud();
		}
	}
	async pauseLifecycleOwner(t) {
		if (!this.currentLifecycle(t)) throw new Error("Village changed during transition");
		if (t.host) await t.host.dispatch({
			kind: "pause",
			paused: true
		});
		else t.game.state.paused = true;
		if (!this.currentLifecycle(t)) throw new Error("Village changed during transition");
	}
	createLifecycleWorker() {
		const host = new SimulationWorkerHost({
			onPresentation: () => {
				if (this.workerHost === host) this.pushHud();
			},
			onFault: (error) => console.error(error)
		});
		return host;
	}
	async prepareVillage(snapshot, worker, testMode = false, revealMap = false) {
		if (worker) {
			const host = this.createLifecycleWorker();
			try {
				await host.initialize(snapshot, {
					started: true,
					awaitingStart: false,
					testMode,
					revealMap
				});
				host.projection.setDisplaySettings(this.game.quality, this.fps);
				return {
					game: host.game,
					host
				};
			} catch (error) {
				host.dispose();
				throw error;
			}
		}
		const game = decodeGame(snapshot);
		game.testMode = testMode;
		game.revealMap = testMode && revealMap;
		game.state.paused = true;
		if (testMode) game.updateVision();
		return {
			game,
			host: null
		};
	}
	installVillage(next, retainPrevious = false) {
		const previous = {
			game: this.game,
			host: this.workerHost ?? null
		}, quality = this.game.quality, muted = this.game.muted;
		if (next.host) next.host.projection.setDisplaySettings(quality, this.fps);
		else {
			next.game.quality = quality;
			next.game.muted = muted;
			next.game.onSfx = (n) => this.audio.play(n);
		}
		try {
			this.view.rebuild(next.game);
			const c = next.game.campOf(0);
			this.view.look.set(c.x, next.game.height(c.x, c.z) + .55, c.z);
			this.audio.unlock();
			this.canvas.focus();
			if (!next.host) this.profile?.personMethods.attach(next.game);
		} catch (error) {
			if (next.host && next.host !== previous.host) next.host.dispose();
			try {
				this.view.rebuild(previous.game);
			} catch {}
			throw error;
		}
		this.workerHost = next.host;
		this.game = next.game;
		this.workerBridgeTransition = false;
		this.dispatchGeneration = (this.dispatchGeneration ?? 1) + 1;
		this.dispatchObservedState = next.host ? void 0 : next.game.state;
		this.dispatchRevision = 0;
		this.dispatchSequence = 0;
		this.readModelCache?.clear();
		this.presentationFeedback = null;
		this.autosave.invalidate();
		this.simAccumulator = 0;
		this.keyboard.groups.clear();
		if (!retainPrevious && previous.host && previous.host !== next.host) previous.host.dispose();
	}
	async savedVillage(worker, protectedOnly = false) {
		if (!worker) {
			const raw = loadRaw(protectedOnly);
			if (!raw) throw new Error("No compatible save. Older partial saves cannot be restored.");
			return this.prepareVillage(raw, false);
		}
		const validated = [];
		for (const candidate of storedVillageCandidates(protectedOnly)) {
			let probe;
			try {
				probe = await this.prepareVillage(candidate.snapshot, true);
				validated.push(candidate);
			} catch {} finally {
				probe?.host?.dispose();
			}
		}
		const chosen = chooseStoredVillage(validated);
		if (!chosen) throw new Error("No compatible save. Older partial saves cannot be restored.");
		return this.prepareVillage(chosen.snapshot, true);
	}
	lifecycleReport() {
		return {
			busy: this.lifecycleBusy,
			closing: this.closing,
			last: this.lastLifecycle
		};
	}
	presentationFeedback = null;
	workerHost = null;
	workerBridgeTransition = false;
	dispatchGeneration = 1;
	dispatchObservedState;
	/** Main resets can replace state without replacing the Game identity. */
	get dispatchEpoch() {
		this.dispatchGeneration ??= 1;
		if (this.workerHost || this.workerBridgeTransition) return this.dispatchGeneration;
		if (this.dispatchObservedState !== this.game.state) {
			this.dispatchObservedState = this.game.state;
			this.dispatchGeneration++;
		}
		return this.dispatchGeneration;
	}
	get sessionEpoch() {
		return this.dispatchEpoch;
	}
	get commandReady() {
		return this.ownerReady && !this.lifecycleBusy && !this.closing;
	}
	readModelRequest = 0;
	readModelCache = /* @__PURE__ */ new Map();
	readModelMeasurements = [];
	/** Bounded asynchronous owner reads. Cached results are advisory; commands revalidate. */
	readModel(query) {
		if (!isEngineReadQuery(query)) return Promise.reject(/* @__PURE__ */ new Error("Unsupported or malformed owner read query"));
		if (!this.commandReady) return Promise.reject(/* @__PURE__ */ new Error("No authoritative session is ready"));
		const captured = structuredClone(query);
		const epoch = this.dispatchEpoch, key = JSON.stringify(captured), cached = this.readModelCache.get(key), now = performance.now();
		if (cached && cached.epoch === epoch && (!cached.completed || now - cached.at < ENGINE_READ_MODEL_RULES.cacheMilliseconds)) return cached.promise;
		const requestId = ++this.readModelRequest;
		const entry = {
			epoch,
			at: now,
			completed: false,
			promise: null
		};
		const task = async () => {
			if (this.workerHost) return {
				...await this.workerHost.readModel(captured),
				epoch
			};
			const start = performance.now(), model = applyEngineReadQuery(this.game, captured), cpuMilliseconds = Math.max(0, performance.now() - start);
			return {
				model,
				epoch,
				requestId,
				stateRevision: this.dispatchRevision,
				navigationRevision: this.game.navigationRevision(),
				cpuMilliseconds
			};
		};
		entry.promise = task().then((result) => {
			this.readModelMeasurements.push({
				kind: query.kind,
				cpuMilliseconds: result.cpuMilliseconds
			});
			if (this.readModelMeasurements.length > ENGINE_READ_MODEL_RULES.maximumMeasurements) this.readModelMeasurements.shift();
			return result;
		}).finally(() => {
			entry.completed = true;
			entry.at = performance.now();
		});
		this.readModelCache.delete(key);
		this.readModelCache.set(key, entry);
		while (this.readModelCache.size > ENGINE_READ_MODEL_RULES.maximumCacheEntries) this.readModelCache.delete(this.readModelCache.keys().next().value);
		return entry.promise;
	}
	ownerReadModelReport() {
		return {
			cacheEntries: this.readModelCache.size,
			measurements: this.readModelMeasurements.map((m) => ({ ...m }))
		};
	}
	dispatchSequence = 0;
	dispatchRevision = 0;
	/** Captures IDs at the click; native handlers revalidate original entities. */
	async dispatch(command, selection) {
		const captured = selection ?? {
			selectedUnitIds: this.game.selectedUnits().map((u) => u.id),
			selectedBuildingId: this.game.state.selBld?.id,
			selectedBoatId: this.game.selectedBoat ?? void 0
		};
		const epoch = this.dispatchEpoch;
		if (!this.commandReady) throw new Error("No authoritative session is ready");
		if (this.workerHost) {
			const result = await this.workerHost.dispatch(command, captured);
			this.readModelCache.clear();
			return {
				...result,
				epoch
			};
		}
		const sequence = ++this.dispatchSequence;
		const outcome = applyEngineCommand(this.game, command, captured);
		this.readModelCache.clear();
		const result = {
			...outcome,
			sequence,
			stateRevision: ++this.dispatchRevision,
			epoch
		};
		this.pushHud();
		return result;
	}
	/** Isolated Test Lab harness only. No public worker option until all UI/save bridges qualify. */
	async startWorkerBridgeForTestLab() {
		if (!this.originalGame || !this.game.testMode) throw new Error("Worker experiment requires an isolated Test Lab session");
		if (this.workerHost || this.workerBridgeTransition) throw new Error("A worker session already exists");
		const original = this.game, snapshot = encodeGame(original), context = {
			started: original.started,
			awaitingStart: original.awaitingStart,
			testMode: original.testMode,
			revealMap: original.revealMap
		};
		this.autosave.invalidate();
		this.dispatchEpoch;
		this.workerBridgeTransition = true;
		this.dispatchGeneration++;
		const transitionEpoch = this.dispatchGeneration;
		const host = new SimulationWorkerHost({
			onPresentation: () => {
				if (this.workerHost === host) this.pushHud();
			},
			onFault: (error) => console.error(error)
		});
		try {
			await host.initialize(snapshot, context);
			if (this.disposed || this.closing || this.game !== original || this.dispatchGeneration !== transitionEpoch) throw new Error("Worker startup was superseded by a village transition");
			host.projection.setDisplaySettings(this.view.quality, this.fps);
			this.workerHost = host;
			this.game = host.game;
			this.simAccumulator = 0;
			this.view.rebuild(this.game);
			this.view.resize();
			this.workerBridgeTransition = false;
			this.pushHud();
			return host.report;
		} catch (error) {
			host.dispose();
			if (this.game === original && this.dispatchGeneration === transitionEpoch) {
				this.workerHost = null;
				this.workerBridgeTransition = false;
			}
			throw error;
		}
	}
	workerBridgeReport() {
		return this.workerHost?.report ?? null;
	}
	get isWorkerSession() {
		return !!this.workerHost;
	}
	presentationNotice(message, seconds = 2) {
		if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError("Invalid notice duration");
		if (this.workerHost) this.presentationFeedback = {
			message,
			expires: performance.now() + seconds * 1e3
		};
		else this.game.banner(message, seconds);
		this.pushHud();
	}
	cancelPresentationInteraction() {
		this.moveMode = false;
		this.loggingMode = false;
		this.plotStart = null;
		this.plotPointerStart = null;
		this.view.setGhost(null, 0, 0, 0, false);
		this.view.setLinePreview([]);
		if (this.workerHost) this.workerHost.select({ selectedUnitIds: [] });
		this.dispatch({ kind: "cancel-interaction" }).catch((error) => this.presentationNotice(error instanceof Error ? error.message : String(error), 4));
	}
	async authoritativeCheckpoint() {
		if (!this.ownerReady) throw new Error("No authoritative session is ready");
		const sessionEpoch = this.dispatchEpoch;
		if (this.workerHost) {
			const result = await this.workerHost.checkpoint();
			return {
				source: "worker",
				sessionEpoch,
				serialized: result.serialized,
				clock: result.clock,
				rng: result.rng,
				context: result.context
			};
		}
		const g = this.game, context = {
			started: g.started,
			awaitingStart: g.awaitingStart,
			testMode: g.testMode,
			revealMap: g.revealMap
		};
		const snapshot = {
			...encodeGame(g),
			savedAt: Date.now(),
			...g.testMode ? { testLabRevealMap: g.revealMap } : {}
		};
		validateGameSave(snapshot);
		return {
			source: "main",
			sessionEpoch,
			serialized: serializeStoredSave(snapshot),
			clock: {
				tick: 0,
				time: g.state.time,
				paused: g.state.paused,
				speed: g.state.speed,
				stateRevision: this.dispatchRevision,
				appliedSequence: this.dispatchSequence
			},
			rng: null,
			context
		};
	}
	checkpointWorker() {
		if (!this.workerHost) throw new Error("No authoritative worker");
		return this.workerHost.checkpoint();
	}
	/** Selection is local presentation plus validated digest before worker ticks. */
	setWorkerSelection(selection) {
		if (!this.workerHost) throw new Error("No authoritative worker");
		this.workerHost.select(selection);
	}
	profile = new RuntimeProfile();
	entityFrustumCensus() {
		return this.view.entityFrustumCensus(this.game);
	}
	setPerformanceExpanded(open) {
		this.profile.simulationPhases.enabled = open;
		this.profile.personMethods.setEnabled(open, this.game);
	}
	game;
	autosave;
	originalGame = null;
	originalWorkerHost = null;
	async startTestSession() {
		if (this.originalGame) return true;
		const t = this.beginLifecycle();
		let next;
		try {
			await this.pauseLifecycleOwner(t);
			const saved = await this.checkpointService.save("village", true);
			if (!this.currentLifecycle(t)) return false;
			if (saved.status !== "committed" || !saved.checkpoint) throw new Error("Save your village successfully before entering test mode");
			next = await this.prepareVillage(parseStoredSave(saved.checkpoint.serialized), !!t.host, true, false);
			if (!this.currentLifecycle(t)) {
				next.host?.dispose();
				return false;
			}
			this.installVillage(next, true);
			this.originalGame = t.game;
			this.originalWorkerHost = t.host;
			this.lastLifecycle = {
				operation: "enter-lab",
				mode: next.host ? "worker" : "main"
			};
			this.pushHud();
			return true;
		} catch (error) {
			if (this.currentLifecycle(t)) this.presentationNotice(error instanceof Error ? error.message : String(error), 5);
			return false;
		} finally {
			this.finishLifecycle(t);
		}
	}
	async loadTestSession() {
		if (!this.originalGame || !this.game.testMode) return "Open the Test Lab first.";
		const t = this.beginLifecycle();
		let next;
		try {
			const raw = localStorage.getItem(SAVE_KEY + ":test-lab");
			if (!raw) throw new Error("There is no saved Test Lab run");
			const snapshot = parseStoredSave(raw);
			validateGameSave(snapshot);
			const reveal = snapshot.testLabRevealMap === true;
			await this.pauseLifecycleOwner(t);
			next = await this.prepareVillage(snapshot, !!t.host, true, reveal);
			if (!this.currentLifecycle(t)) {
				next.host?.dispose();
				return "Test Lab load cancelled: village changed";
			}
			this.installVillage(next);
			this.lastLifecycle = {
				operation: "load-lab",
				mode: next.host ? "worker" : "main"
			};
			this.pushHud();
			return "Test Lab run loaded.";
		} catch (error) {
			return error instanceof Error ? error.message : "Could not load the Test Lab run.";
		} finally {
			this.finishLifecycle(t);
		}
	}
	async endTestSession() {
		if (!this.originalGame) return;
		const t = this.beginLifecycle(), original = {
			game: this.originalGame,
			host: this.originalWorkerHost ?? null
		};
		try {
			await this.pauseLifecycleOwner(t);
			if (!this.currentLifecycle(t)) throw new Error("Return cancelled: active village changed");
			if (original.host) await original.host.dispatch({
				kind: "pause",
				paused: true
			});
			else original.game.state.paused = true;
			if (!this.currentLifecycle(t)) throw new Error("Return cancelled: active village changed");
			this.installVillage(original);
			this.originalGame = null;
			this.originalWorkerHost = null;
			this.lastLifecycle = {
				operation: "return-from-lab",
				mode: original.host ? "worker" : "main"
			};
			this.pushHud();
		} finally {
			this.finishLifecycle(t);
		}
	}
	view;
	audio;
	canvas;
	keys = /* @__PURE__ */ new Set();
	hud;
	running = false;
	last = 0;
	hudAcc = 0;
	saveAcc = 0;
	fpsAcc = 0;
	frames = 0;
	fps = 60;
	drag = null;
	panDrag = null;
	rotDrag = null;
	pinch = null;
	keyboard = new KeyboardCommands(this);
	simAccumulator = 0;
	moveMode = false;
	loggingMode = false;
	pointer = {
		x: 0,
		y: 0
	};
	nextHoverAt = 0;
	onPointerLeave = () => {
		this.view.hoveredUnitId = null;
		this.canvas.title = "";
	};
	gateFacing = "north";
	gateFacingExplicit = false;
	ghostPos = {
		x: 0,
		z: 0
	};
	plotStart = null;
	plotPointerStart = null;
	plotSize;
	bridgeSpan;
	plotWidth = 1;
	plotDepth = 1;
	plotPreviewKey = "";
	nextFieldPreviewAt = 0;
	resizePlot(delta, depth = false) {
		if (depth) this.plotDepth = Math.max(1, Math.min(maximumPlotAxisMultiple(this.game.state.placing ?? "farm"), this.plotDepth + delta));
		else this.plotWidth = Math.max(1, Math.min(maximumPlotAxisMultiple(this.game.state.placing ?? "farm"), this.plotWidth + delta));
		this.updateGhost(true);
		this.game.banner(`Plot ${this.plotWidth} × ${this.plotDepth} · [ ] width · Shift+[ ] depth`, 3);
		this.pushHud();
	}
	importSequence = 0;
	disposed = false;
	ro = null;
	failFrames = 0;
	slowFps = 0;
	constructor(canvas, hud) {
		this.canvas = canvas;
		this.hud = hud;
		this.game = new Game();
		this.view = new WorldView(canvas);
		this.audio = new GameAudio();
		this.autosave = new AutosaveController({
			getGame: () => this.game,
			allowed: () => !this.disposed && !this.workerHost && !this.workerBridgeTransition && !this.lifecycleBusy && !this.closing,
			onMainThreadWork: (work) => this.profile.recordMainThreadWork(work)
		});
		this.profile.setAutosaveReporter(() => this.autosave.report(), () => this.autosave.resetMeasurements());
		this.game.quality = this.view.quality;
		this.game.onSfx = (n) => this.audio.play(n);
		this.view.onContextLost = () => {
			if (this.game.quality !== "low") this.setQuality(this.game.quality === "high" ? "med" : "low");
		};
		this.view.onContextRestored = () => {
			try {
				this.view.rebuild(this.game);
				this.view.resize();
				this.game.banner("The island steadies", 2);
				this.pushHud();
			} catch {
				this.setQuality("low");
				try {
					this.view.rebuild(this.game);
				} catch {}
			}
		};
		this.bind();
		this.view.resize();
		this.ro = new ResizeObserver(() => this.view.resize());
		this.ro.observe(canvas.parentElement || canvas);
		this.installProbe();
		window.__engine = this;
	}
	begin() {
		if (this.running && this.game.started && !this.game.awaitingStart) {
			this.pushHud();
			return;
		}
		const saved = loadRaw(), storedVillage = hasSave();
		try {
			if (!saved && storedVillage) throw new Error("Your saved village could not be restored. Its saved copies have been kept.");
			if (saved) {
				this.game = decodeGame(saved);
				this.profile.personMethods.attach(this.game);
				this.game.quality = this.view.quality;
				this.game.onSfx = (n) => this.audio.play(n);
			} else {
				this.game.reset();
				this.game.awaitingStart = true;
			}
			if (this.game.awaitingStart) this.game.enterIsland();
			this.game.state.paused = true;
			this.view.rebuild(this.game);
			this.homeLook();
			this.view.resize();
		} catch (err) {
			console.error(err);
			if (storedVillage) throw err;
			this.setQuality("low");
			try {
				this.game.reset();
				this.game.enterIsland();
				this.game.state.paused = true;
				this.view.rebuild(this.game);
				this.homeLook();
				this.view.resize();
			} catch (err2) {
				console.error(err2);
				this.running = false;
				throw err2 instanceof Error ? err2 : /* @__PURE__ */ new Error("The camp could not be raised.");
			}
		}
		this.running = true;
		this.last = performance.now();
		this.view.renderer.setAnimationLoop((t) => this.frame(t));
		this.pushHud();
	}
	async configureNewWorld(request, previewRiverbanks = false) {
		if (this.originalGame && !this.game.testMode) return false;
		return this.restart(request, previewRiverbanks && this.game.testMode ? 19 : 18);
	}
	enterIsland() {
		this.audio.unlock();
		this.game.enterIsland();
		this.canvas.focus();
		this.pushHud();
	}
	enterAsBand() {
		this.audio.unlock();
		this.game.enterAsBand();
		this.canvas.focus();
		this.pushHud();
	}
	hasSavedGame() {
		return hasSave();
	}
	async saveNow() {
		if (!this.commandReady) return {
			saved: false,
			message: "Village transition is still in progress"
		};
		const epoch = this.dispatchEpoch, lab = this.game.testMode;
		const result = await this.checkpointService.save(lab ? "test-lab" : "village", true);
		if (this.disposed || this.dispatchEpoch !== epoch) return {
			saved: false,
			message: "Village changed before saving finished"
		};
		let saved = result.status === "committed", message = saved ? lab ? "Test Lab run saved" : "Village saved" : result.reason;
		if (saved && !lab) {
			const protectedCopy = await this.checkpointService.save("protected", true);
			if (this.disposed || this.dispatchEpoch !== epoch) return {
				saved: false,
				message: "Village changed before saving finished"
			};
			if (protectedCopy.status !== "committed") message += " · extra copy unavailable";
		}
		if (!this.workerHost) {
			this.game.banner(message, 5);
			this.pushHud();
		}
		return {
			saved,
			message
		};
	}
	async protectVillage() {
		if (!this.commandReady) return {
			saved: false,
			message: "Village transition is still in progress"
		};
		const epoch = this.dispatchEpoch, result = await this.checkpointService.save("protected", true);
		if (this.disposed || this.dispatchEpoch !== epoch) return {
			saved: false,
			message: "Village changed before protection finished"
		};
		return {
			saved: result.status === "committed",
			message: result.status === "committed" ? "Protected village saved" : result.reason
		};
	}
	async exportVillage() {
		if (!this.commandReady) return {
			saved: false,
			message: "Village transition is still in progress"
		};
		const epoch = this.dispatchEpoch;
		const result = await this.checkpointService.save("export", true);
		if (this.disposed || this.dispatchEpoch !== epoch) return {
			saved: false,
			message: "Village changed before export finished"
		};
		return {
			saved: result.status === "committed",
			message: result.status === "committed" ? "Village file prepared" : result.reason,
			...result.checkpoint ? { serialized: result.checkpoint.serialized } : {}
		};
	}
	async importVillage(file) {
		const cancelled = () => ({
			applied: false,
			saved: false,
			message: "Import cancelled — the active village changed."
		});
		if (this.disposed || this.closing) return cancelled();
		if (this.originalGame) {
			const message = "Leave test mode before importing a village";
			this.presentationNotice(message, 4);
			return {
				applied: false,
				saved: false,
				message
			};
		}
		const t = this.beginLifecycle();
		let next, applied = false;
		try {
			const text = await file.text();
			if (!this.currentLifecycle(t)) return cancelled();
			const raw = JSON.parse(text);
			validateGameSave(raw);
			next = await this.prepareVillage(raw, !!t.host);
			if (!this.currentLifecycle(t)) {
				next.host?.dispose();
				return cancelled();
			}
			await this.pauseLifecycleOwner(t);
			if (t.game.started && !t.game.awaitingStart) {
				const protectedCopy = await this.checkpointService.save("protected", true);
				if (!this.currentLifecycle(t)) return cancelled();
				if (protectedCopy.status !== "committed") throw new Error("Could not protect your current village. Download it before importing another save.");
			}
			if (t.game.started && !t.game.awaitingStart) {
				await this.checkpointService.save("village", true);
				if (!this.currentLifecycle(t)) return cancelled();
			}
			this.installVillage(next);
			applied = true;
			const appliedEpoch = this.dispatchEpoch;
			const saved = await this.checkpointService.save("village", true);
			if (this.lifecycleSequence !== t.sequence || this.disposed || this.closing || this.game !== next.game || this.dispatchEpoch !== appliedEpoch) return {
				applied: true,
				saved: false,
				message: "Import completed; a newer village transition superseded saving"
			};
			const message = saved.status === "committed" ? "Village imported; previous village kept as a protected checkpoint" : "Village imported but local saving failed. Keep the original file.";
			this.lastLifecycle = {
				operation: "import",
				mode: next.host ? "worker" : "main",
				save: saved.status
			};
			this.presentationNotice(message, 5);
			return {
				applied: true,
				saved: saved.status === "committed",
				message
			};
		} catch (error) {
			if (!applied && !this.currentLifecycle(t)) return cancelled();
			const detail = error instanceof Error ? error.message : "Invalid village backup";
			this.presentationNotice(detail, 5);
			return {
				applied,
				saved: false,
				message: detail
			};
		} finally {
			if (!applied && next?.host) next.host.dispose();
			this.finishLifecycle(t);
		}
	}
	restoreVillage(restored) {
		this.installVillage({
			game: restored,
			host: null
		});
	}
	async resumeSaved(protectedOnly = false) {
		if (this.originalGame) {
			await this.endTestSession();
			return;
		}
		const t = this.beginLifecycle();
		let next, applied = false;
		try {
			await this.pauseLifecycleOwner(t);
			next = await this.savedVillage(!!t.host, protectedOnly);
			if (!this.currentLifecycle(t)) {
				next.host?.dispose();
				throw new Error("Restore cancelled: active village changed");
			}
			if (protectedOnly && t.game.started && !t.game.awaitingStart) {
				const saved = await this.checkpointService.save("village", true);
				if (!this.currentLifecycle(t)) throw new Error("Restore cancelled: active village changed");
				if (saved.status !== "committed") throw new Error("Could not save the current village before restoring. Download it first.");
			}
			this.installVillage(next);
			applied = true;
			const appliedEpoch = this.dispatchEpoch;
			if (protectedOnly) await this.checkpointService.save("village", true);
			if (this.lifecycleSequence !== t.sequence || this.disposed || this.closing || this.game !== next.game || this.dispatchEpoch !== appliedEpoch) throw new Error("Restore superseded by a newer transition");
			this.lastLifecycle = {
				operation: "restore",
				mode: next.host ? "worker" : "main"
			};
			this.presentationNotice("Village restored · P to resume", 4);
		} catch (error) {
			if (this.currentLifecycle(t)) this.presentationNotice(error instanceof Error ? error.message : "Cannot restore save", 4);
			throw error;
		} finally {
			if (!applied) next?.host?.dispose();
			this.finishLifecycle(t);
		}
	}
	async restart(request, generation = 18) {
		const t = this.beginLifecycle();
		try {
			await this.pauseLifecycleOwner(t);
			if (t.game.started && !t.game.awaitingStart) {
				const saved = await this.checkpointService.save(t.game.testMode ? "test-lab" : "protected", true);
				if (!this.currentLifecycle(t)) return false;
				if (saved.status !== "committed") throw new Error("Could not protect this village. Export it before starting another world.");
			}
			const game = new Game();
			game.reset(void 0, generation, {
				...request,
				difficulty: request?.difficulty ?? t.game.state.difficulty ?? "normal"
			});
			game.enterIsland();
			game.state.paused = true;
			game.testMode = t.game.testMode;
			if (!this.currentLifecycle(t)) return false;
			this.installVillage({
				game,
				host: null
			});
			this.lastLifecycle = {
				operation: "new-world",
				mode: "main"
			};
			this.pushHud();
			return true;
		} catch (error) {
			if (this.currentLifecycle(t)) this.presentationNotice(error instanceof Error ? error.message : "Could not create world", 5);
			return false;
		} finally {
			this.finishLifecycle(t);
		}
	}
	homeLook() {
		const c = this.game.campOf(0);
		this.view.look.set(c.x, this.game.height(c.x, c.z) + .55, c.z);
	}
	bind() {
		const c = this.canvas;
		c.style.touchAction = "none";
		window.addEventListener("resize", this.onResize);
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		window.addEventListener("blur", this.onBlur);
		window.addEventListener("pagehide", this.onPageHide);
		window.addEventListener("beforeunload", this.onPageHide);
		c.addEventListener("pointerdown", this.onPointerDown);
		c.addEventListener("pointermove", this.onPointerMove);
		c.addEventListener("pointerleave", this.onPointerLeave);
		c.addEventListener("pointerup", this.onPointerUp);
		c.addEventListener("pointercancel", this.onPointerUp);
		window.addEventListener("wheel", this.onWheel, { passive: false });
		c.addEventListener("contextmenu", (e) => e.preventDefault());
		document.addEventListener("visibilitychange", this.onVis);
	}
	onResize = () => this.view.resize();
	onBlur = () => {
		this.keys.clear();
		this.simAccumulator = 0;
	};
	backgroundCheckpoint = null;
	requestBackgroundCheckpoint() {
		if (this.disposed || this.closing || this.lifecycleBusy || this.workerBridgeTransition) return;
		if (!this.workerHost) {
			if (this.game.testMode) this.checkpointService.save("test-lab", false);
			else saveGame(this.game);
			return;
		}
		if (this.backgroundCheckpoint) return;
		const owner = this.workerHost, epoch = this.dispatchEpoch;
		this.backgroundCheckpoint = (async () => {
			const saved = await this.checkpointService.save(this.game.testMode ? "test-lab" : "village", false);
			if (this.workerHost === owner && this.dispatchEpoch === epoch) this.lastLifecycle = {
				operation: "background-checkpoint",
				mode: "worker",
				save: saved.status
			};
		})().catch((error) => console.error(error)).finally(() => {
			this.backgroundCheckpoint = null;
		});
	}
	onPageHide = () => {
		this.requestBackgroundCheckpoint();
	};
	onVis = () => {
		this.keys.clear();
		this.simAccumulator = 0;
		this.last = 0;
		if (document.visibilityState === "hidden") this.requestBackgroundCheckpoint();
		if (document.visibilityState === "visible") {
			this.view.resize();
			if (this.audio.ctx?.state === "suspended") this.audio.ctx.resume();
		}
	};
	onKeyDown = (e) => {
		const target = e.target;
		if (e.code === "KeyR" && this.game.state.placing === "gate" && !e.metaKey && !e.ctrlKey && !target?.closest?.("input,textarea,select,[contenteditable=true],button,a,summary,dialog[open],[role=dialog]")) {
			e.preventDefault();
			if (!e.repeat) this.setGateFacing(rotateGateFacing(this.gateFacing, e.shiftKey ? -1 : 1));
			return;
		}
		this.keyboard.key(e);
	};
	onKeyUp = (e) => {
		this.keys.delete(e.code);
	};
	onWheel = (e) => {
		if (e.target?.closest("dialog, input, select, textarea, .hud-panel")) return;
		e.preventDefault();
		const s = Math.sign(e.deltaY);
		this.view.dist *= s > 0 ? 1.08 : .92;
	};
	canvasXY(e) {
		const r = this.canvas.getBoundingClientRect();
		return {
			x: e.clientX - r.left,
			y: e.clientY - r.top
		};
	}
	onPointerDown = (e) => {
		this.keyboard.mode = false;
		this.canvas.focus();
		this.canvas.setPointerCapture(e.pointerId);
		const p = this.canvasXY(e);
		this.pointer.x = p.x;
		this.pointer.y = p.y;
		if (e.button === 1 || e.buttons === 4) {
			this.panDrag = {
				x: e.clientX,
				y: e.clientY
			};
			return;
		}
		if (e.button === 2) {
			this.rotDrag = {
				x: e.clientX,
				y: e.clientY,
				sx: e.clientX,
				sy: e.clientY
			};
			return;
		}
		if (e.button === 0) {
			if (this.game.state.placing) {
				this.plotPointerStart = {
					x: p.x,
					y: p.y
				};
				this.plotStart = scalablePlot(this.game.state.placing) || this.game.state.placing === "bridge" || linearStructure(this.game.state.placing) ? this.view.groundAt(p.x, p.y) : null;
				this.drag = null;
				return;
			}
			this.drag = {
				sx: p.x,
				sy: p.y,
				x: p.x,
				y: p.y
			};
		}
	};
	onPointerMove = (e) => {
		const p = this.canvasXY(e);
		this.pointer.x = p.x;
		this.pointer.y = p.y;
		const now = performance.now();
		if (this.game.state.placing || this.loggingMode || this.drag || this.panDrag || this.rotDrag) this.view.hoveredUnitId = null;
		else if (now >= this.nextHoverAt) {
			this.nextHoverAt = now + 80;
			this.view.hoveredUnitId = this.view.hoverPerson(p.x, p.y, this.game);
			const animal = this.view.hoveredUnitId === null ? this.view.pickWildlife(p.x, p.y, this.game) : null;
			this.canvas.title = animal ? animal.hp > 0 ? `Wild ${animal.species} · right-click with hunters to hunt` : `${animal.species} carcass · ${Math.ceil(animal.carcass?.meat || 0)} raw meat remains` : "";
		}
		if (this.panDrag) {
			const dx = e.clientX - this.panDrag.x;
			const dy = e.clientY - this.panDrag.y;
			this.panDrag.x = e.clientX;
			this.panDrag.y = e.clientY;
			const sp = .04 * (this.view.dist / 30);
			const fx = -Math.sin(this.view.yaw);
			const fz = -Math.cos(this.view.yaw);
			const rx = Math.cos(this.view.yaw);
			const rz = -Math.sin(this.view.yaw);
			this.view.look.x += -rx * dx * sp + fx * dy * sp;
			this.view.look.z += -rz * dx * sp + fz * dy * sp;
			return;
		}
		if (this.rotDrag) {
			const dx = e.clientX - this.rotDrag.x;
			const dy = e.clientY - this.rotDrag.y;
			this.rotDrag.x = e.clientX;
			this.rotDrag.y = e.clientY;
			this.view.yaw -= dx * .005;
			this.view.pitch += dy * .004;
			return;
		}
		if (this.drag) {
			this.drag.x = p.x;
			this.drag.y = p.y;
		}
		this.updateGhost();
	};
	onPointerUp = (e) => {
		try {
			this.canvas.releasePointerCapture(e.pointerId);
		} catch {}
		const p = this.canvasXY(e);
		this.pointer.x = p.x;
		this.pointer.y = p.y;
		if (this.rotDrag && e.button === 2) {
			const moved = Math.hypot(e.clientX - this.rotDrag.sx, e.clientY - this.rotDrag.sy);
			this.rotDrag = null;
			if (moved < 6) this.rightClick(p.x, p.y, e.shiftKey);
			return;
		}
		this.rotDrag = null;
		this.panDrag = null;
		if (e.button === 0 && this.game.state.placing) {
			this.leftClick(p.x, p.y, e.shiftKey);
			this.plotStart = null;
			this.plotPointerStart = null;
			this.plotSize = void 0;
			this.drag = null;
			this.updateGhost();
			this.pushHud();
			return;
		}
		if (this.drag && e.button === 0) {
			this.drag.x = p.x;
			this.drag.y = p.y;
			const dx = this.drag.x - this.drag.sx;
			const dy = this.drag.y - this.drag.sy;
			if (Math.hypot(dx, dy) > 8) {
				if (this.workerHost) {
					const ids = e.shiftKey ? this.game.selectedUnits().map((u) => u.id) : [];
					for (const u of this.game.state.units) {
						if (u.team !== 0 || u.hp <= 0) continue;
						const point = this.view.project(u.x, u.y + .6, u.z);
						if (!point.behind && point.x >= Math.min(this.drag.sx, this.drag.x) && point.x <= Math.max(this.drag.sx, this.drag.x) && point.y >= Math.min(this.drag.sy, this.drag.y) && point.y <= Math.max(this.drag.sy, this.drag.y) && !ids.includes(u.id)) ids.push(u.id);
					}
					this.workerHost.select({ selectedUnitIds: ids });
					this.drag = null;
					this.pushHud();
					return;
				}
				if (!e.shiftKey && !this.loggingMode) this.game.clearSelect();
				const minx = Math.min(this.drag.sx, this.drag.x), maxx = Math.max(this.drag.sx, this.drag.x);
				const miny = Math.min(this.drag.sy, this.drag.y), maxy = Math.max(this.drag.sy, this.drag.y);
				let picked = 0;
				for (const u of this.game.state.units) {
					if (this.loggingMode || u.team !== 0 || u.hp <= 0) continue;
					const p = this.view.project(u.x, u.y + .6, u.z);
					if (p.behind) continue;
					if (p.x >= minx && p.x <= maxx && p.y >= miny && p.y <= maxy) {
						u.selected = true;
						picked++;
					}
				}
				if (picked === 0) {
					const ids = [];
					for (const tree of this.game.state.trees) {
						if (tree.amount <= 0 || !this.game.visibleAt(tree.x, tree.z)) continue;
						if (projectedTreeInBox((x, y, z) => this.view.project(x, y, z), tree, {
							minx,
							maxx,
							miny,
							maxy
						})) ids.push(tree.id);
					}
					if (ids.length) this.game.markChop(ids);
					else if (this.loggingMode) this.game.banner("No visible trees in the box — drag across the trunks or crowns", 3);
				}
			} else this.leftClick(p.x, p.y, e.shiftKey);
			this.drag = null;
			this.pushHud();
		}
	};
	residentMovePoint(cx, cy, ground) {
		const people = this.game.selectedUnits();
		if (!people.length || !people.every((u) => u.haulage === "canoe") || this.game.height(ground.x, ground.z) >= this.game.waterAt(ground.x, ground.z)) return ground;
		const water = this.view.waterAt(cx, cy, this.game.world.waterY);
		return water && this.game.height(water.x, water.z) < this.game.waterAt(water.x, water.z) ? water : ground;
	}
	leftClick(cx, cy, additive) {
		if (this.workerHost) {
			const entity = this.view.pickEntity(cx, cy, this.game);
			if (entity?.kind === "building") {
				this.workerHost.select({
					selectedUnitIds: [],
					selectedBuildingId: entity.id
				});
				return;
			}
			if (entity && entity.team === 0) {
				const ids = additive ? this.game.selectedUnits().map((u) => u.id) : [];
				this.workerHost.select({ selectedUnitIds: ids.includes(entity.id) ? ids.filter((id) => id !== entity.id) : [...ids, entity.id] });
				return;
			}
			const point = this.view.groundAt(cx, cy);
			if (point && this.game.selectedUnits().length) this.dispatch({
				kind: "move",
				unitIds: this.game.selectedUnits().map((u) => u.id),
				x: point.x,
				z: point.z
			}).catch(console.error);
			return;
		}
		const boatOrder = this.game.selectedBoat !== null && !this.game.state.placing;
		const g = boatOrder ? this.view.waterAt(cx, cy, this.game.world.waterY) : this.view.groundAt(cx, cy);
		if (!g) {
			if (this.game.state.placing) this.game.banner("Aim at the valley floor", 1.2);
			return;
		}
		if (this.game.state.placing) {
			this.updateGhost(true);
			if (linearStructure(this.game.state.placing) && this.plotStart) {
				placeConstructionLine(this.game, this.game.state.placing, this.plotStart, g);
				this.pushHud();
				return;
			}
			if (this.game.state.placing === "gate") placeFacingGate(this.game, this.ghostPos, this.gateFacing);
			else this.game.placeBuilding(this.game.state.placing, this.ghostPos.x, this.ghostPos.z, 0, this.plotSize, this.bridgeSpan);
			this.updateGhost();
			this.pushHud();
			return;
		}
		if (this.loggingMode) {
			const tree = this.game.state.trees.filter((t) => t.amount > 0 && this.game.visibleAt(t.x, t.z)).filter((t) => Math.hypot(t.x - g.x, t.z - g.z) < 8).sort((a, b) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z))[0];
			if (tree) this.game.markChop([tree.id]);
			else this.game.banner("Aim at a visible tree, or drag over a stand", 1.8);
			this.pushHud();
			return;
		}
		if (this.moveMode) {
			const target = boatOrder ? g : this.residentMovePoint(cx, cy, g);
			this.game.issueMove(target.x, target.z);
			this.moveMode = false;
			return;
		}
		const boat = this.view.pickBoat(cx, cy, this.game);
		if (boat && boat.team === 0) {
			this.game.selectBoat(boat.id);
			this.pushHud();
			return;
		}
		const entity = this.view.pickEntity(cx, cy, this.game);
		if (entity?.kind === "building" && entity.team === 0 && !this.game.finished(entity) && !additive && this.game.selectedUnits().length) this.game.orderConstruction(entity);
		else if (entity) this.game.selectEntity(entity, additive, true);
		else {
			const animal = this.view.pickWildlife(cx, cy, this.game);
			const resource = animal ? null : this.view.pickResource(cx, cy, this.game);
			if (animal) this.game.selectCritter(animal, additive);
			else if (resource) {
				if (!additive) this.game.clearSelect();
				this.game.selectedResource = resource;
			} else if (!additive && (this.game.selectedUnits().length || this.game.selectedBoat !== null)) {
				const target = boatOrder ? g : this.residentMovePoint(cx, cy, g);
				this.game.issueMove(target.x, target.z);
			} else {
				const surface = this.view.waterAt(cx, cy, this.game.world.waterY);
				const camera = this.view.camera.position;
				const reach = surface && surface.distanceTo(camera) <= g.distanceTo(camera) + .2 ? waterReachAt(this.game, surface) : null;
				if (reach) {
					this.game.clearSelect();
					this.game.selectedWaterReach = reach;
					surveyReachFish(this.game, reach);
				} else this.game.selectAt(g.x, g.z, additive);
			}
		}
		this.pushHud();
	}
	rightClick(cx, cy, queue = false) {
		if (this.workerHost) {
			const point = this.view.groundAt(cx, cy);
			if (point && this.game.selectedUnits().length) this.dispatch({
				kind: "move",
				unitIds: this.game.selectedUnits().map((u) => u.id),
				x: point.x,
				z: point.z
			}).catch(console.error);
			return;
		}
		const g = this.game.selectedBoat !== null ? this.view.waterAt(cx, cy, this.game.world.waterY) : this.view.groundAt(cx, cy);
		if (!g) return;
		if (this.game.state.placing) {
			this.game.state.placing = null;
			this.view.setGhost(null, 0, 0, 0, false);
			return;
		}
		if (this.game.selectedBoat !== null) {
			this.game.issueMove(g.x, g.z);
			this.pushHud();
			return;
		}
		const ent = this.view.pickEntity(cx, cy, this.game) || this.game.entityAt(g.x, g.z);
		if (ent && ent.team !== 0 && this.game.visibleAt(ent.x, ent.z)) this.game.issueAttack(ent);
		else if (ent?.kind === "building" && ent.team === 0 && (!this.game.finished(ent) || ent.expansion)) {
			if (queue) this.game.queueConstruction(ent);
			else this.game.orderConstruction(ent);
		} else {
			const node = this.view.pickWildlife(cx, cy, this.game) || this.view.pickResource(cx, cy, this.game) || (this.game.exploredAt(g.x, g.z) ? this.game.resourceAt(g.x, g.z) : null);
			if (node) this.game.issueGather(node);
			else {
				const target = this.residentMovePoint(cx, cy, g);
				this.game.issueMove(target.x, target.z);
			}
		}
	}
	updateGhost(force = false) {
		if (this.game.state.placing === "farm") {
			const now = performance.now();
			if (!force && now < this.nextFieldPreviewAt) return;
			this.nextFieldPreviewAt = now + 200;
		}
		this.view.setLinePreview([]);
		const type = this.game.state.placing;
		if (!type) {
			const b = this.game.state.selBld;
			if (b?.expansion) {
				this.view.setGhost(b.type, b.x, b.z, b.y, true, void 0, null, b.expansion);
				return;
			}
			this.view.setGhost(null, 0, 0, 0, false);
			return;
		}
		const g = this.view.groundAt(this.pointer.x, this.pointer.y);
		if (!g) return;
		const snap = compactGrainWorkplace(type) ? .25 : 2;
		let x = Math.round(g.x / snap) * snap;
		let z = Math.round(g.z / snap) * snap;
		if (type === "dock") {
			const site = this.game.nearestDockSite(g.x, g.z, 14);
			if (site) {
				x = site.x;
				z = site.z;
			}
		}
		this.plotSize = scalablePlot(type) && (this.plotWidth > 1 || this.plotDepth > 1) ? {
			w: BUILDINGS[type].w * this.plotWidth,
			d: BUILDINGS[type].d * this.plotDepth
		} : void 0;
		if (this.plotStart && scalablePlot(type) && plotDragIntent(this.plotPointerStart, this.pointer, this.plotStart, g)) {
			const plot = dragPlot(type, this.plotStart, g);
			x = plot.x;
			z = plot.z;
			this.plotSize = {
				w: plot.w,
				d: plot.d
			};
		}
		if (scalablePlot(type)) {
			const key = type + JSON.stringify(this.plotSize);
			if (key !== this.plotPreviewKey) {
				this.plotPreviewKey = key;
				const cost = buildingCost(type, this.game, 0, this.plotSize);
				this.game.banner(type === "farm" ? `Field · ${cost.seeds} seeds · drag to size` : `${type === "pen" ? "Pen" : "Store"} · ${cost.wood} logs · drag to size`, 4);
			}
		}
		if (linearStructure(type) && this.plotStart) {
			const line = joinedConstructionLine(this.game.state.buildings, type, this.plotStart, g), end = line[line.length - 1];
			if (!end) return;
			x = end.x;
			z = end.z;
			let blocked = false;
			this.view.setLinePreview(line.map((p) => {
				blocked = blocked || !this.game.placementValid(type, p.x, p.z, 0);
				return {
					...p,
					y: this.game.height(p.x, p.z),
					ok: !blocked
				};
			}));
			const unitCost = buildingCost(type, this.game), costs = [unitCost.wood ? `${(unitCost.wood || 0) * line.length} logs` : "", unitCost.stone ? `${(unitCost.stone || 0) * line.length} stone` : ""].filter(Boolean).join(" · ");
			this.game.banner(`${line.length} sections${costs ? " · " + costs : ""}${blocked ? " · red sections blocked" : " · leave a gate"}`, 2);
		}
		this.bridgeSpan = void 0;
		if (type === "bridge" && this.plotStart && Math.hypot(g.x - this.plotStart.x, g.z - this.plotStart.z) > 2) {
			this.bridgeSpan = {
				ax: this.plotStart.x,
				az: this.plotStart.z,
				bx: g.x,
				bz: g.z
			};
			x = (this.plotStart.x + g.x) / 2;
			z = (this.plotStart.z + g.z) / 2;
			const cost = buildingCost(type, this.game, 0, void 0, this.bridgeSpan);
			this.game.banner(`Bridge · ${Math.hypot(g.x - this.plotStart.x, g.z - this.plotStart.z).toFixed(0)} m · ${cost.wood} logs · ${cost.stone} stone`, 2);
		}
		if (type === "gate") {
			const snap = this.gateFacingExplicit ? snapGate(this.game.state.buildings, {
				x,
				z
			}, this.gateFacing) : suggestGateSnap(this.game.state.buildings, {
				x,
				z
			}, this.gateFacing);
			if (snap) {
				x = snap.x;
				z = snap.z;
				this.gateFacing = snap.facing;
			}
		}
		const issue = this.game.placementIssue(type, x, z, 0, this.plotSize, void 0, this.bridgeSpan) ?? (type === "farm" ? fieldSeedIssue(this.game.tribe(0).seeds || 0, buildingCost(type, this.game, 0, this.plotSize).seeds || 0) : null);
		this.game.state.placeIssue = issue;
		this.ghostPos.x = x;
		this.ghostPos.z = z;
		const bridge = type === "bridge" ? this.bridgeSpan ?? planBridge(this.game, x, z) : null;
		this.view.setGhost(type, x, z, bridge ? bridgeHeight(this.game, bridge, x, z) : type === "fibreWorkshop" ? fibreWorkshopPlacementLevel(this.game, x, z) : this.game.height(x, z), !issue, type === "farm" ? soilQuality(this.game, x, z) : void 0, bridge, this.plotSize, type === "gate" ? this.gateFacing : void 0, type === "watchtower" ? towerBuildConfiguration(this.game, 0) : void 0);
	}
	setGateFacing(facing) {
		this.gateFacing = gateFacing(facing);
		this.gateFacingExplicit = true;
		this.updateGhost();
		this.pushHud();
	}
	toggleLogging() {
		this.loggingMode = !this.loggingMode;
		this.game.state.placing = null;
		this.moveMode = false;
		this.game.banner(this.loggingMode ? "Mark trees: drag over a stand, or aim and press Enter. Repeat to clear marks. Esc to finish." : "Tree marking finished", 3);
		this.canvas.focus();
		this.pushHud();
	}
	upgradeHome(id) {
		const r = beginHousingUpgrade(this.game, id);
		this.game.banner(r.reason, 5);
		this.pushHud();
		return r;
	}
	tryHome(id) {
		const r = beginHomeUse(this.game, id);
		this.game.banner(r.reason, 5);
		this.pushHud();
		return r;
	}
	pauseHome(id, paused) {
		const accepted = setHousingPaused(this.game, id, paused);
		this.pushHud();
		return accepted;
	}
	setPlacing(type) {
		this.nextFieldPreviewAt = 0;
		this.bridgeSpan = void 0;
		this.plotStart = null;
		this.plotPointerStart = null;
		this.plotSize = void 0;
		this.plotWidth = 1;
		this.plotDepth = 1;
		if (type === "gate") this.gateFacingExplicit = false;
		this.loggingMode = false;
		if (type && this.game.state.ended) return;
		if (type === "house" && housingAdoptionIssue(this.game)) {
			this.game.banner(housingAdoptionIssue(this.game), 5);
			this.pushHud();
			return;
		}
		if (type === "farm" && cultivationIssue(this.game)) {
			this.game.banner(cultivationIssue(this.game), 5);
			this.pushHud();
			return;
		}
		this.game.state.placing = this.game.state.placing === type ? null : type;
		if (this.game.state.placing) {
			const t = this.game.state.placing;
			const d = BUILDINGS[t];
			this.game.banner(t === "cornerstone" ? "Outpost — choose explored dry ground at least 64m from your halls and other outposts. Costs 70 logs; plans can wait for materials." : t === "dock" ? "Fishing Dock — click the white posts by the water" : t === "farm" ? "Farm — drag a rectangle. Larger fields need more seeds and workers." : t === "warehouse" ? "Storehouse — drag a rectangle. Larger stores cost more and hold more." : t === "quarry" ? "Quarry — choose a stone outcrop or gentle mountain slope. Two miners dig and haul stone." : t === "bridge" ? "Bridge — drag bank to bank (5–28 m), or click a narrow river for an automatic crossing." : linearStructure(t) ? "Drag a defensive line. Each section needs materials and builders. Leave room for a gate." : "Click the valley to raise a " + d.name + "  ·  Esc cancel", 2.6);
		}
		this.updateGhost();
		this.audio.play("click");
		this.pushHud();
	}
	recycle() {
		this.game.recycleSelected();
		this.pushHud();
	}
	craftFarmTool(kind, workplaceId) {
		this.game.craftFarmTool(kind, workplaceId);
		this.pushHud();
	}
	craftHaulage(kind, workplaceId) {
		this.game.craftHaulage(kind, workplaceId);
		this.pushHud();
	}
	craftWeapon(kind, workplaceId) {
		this.game.craftWeapon(kind, workplaceId);
		this.pushHud();
	}
	callToArms() {
		this.game.callToArms(0);
		this.pushHud();
	}
	standDown() {
		this.game.standDown(0);
		this.pushHud();
	}
	train(type) {
		this.game.trainSelected(type);
		this.pushHud();
	}
	clearSelection() {
		this.game.clearSelect();
		this.moveMode = false;
		this.pushHud();
	}
	assignJob(job) {
		this.game.assignJob(job);
		this.pushHud();
	}
	trade(deal) {
		this.game.tryTrade(deal);
		this.pushHud();
	}
	bankTrade(give, get) {
		this.game.bankTrade(give, get);
		this.pushHud();
	}
	cycleTrade() {
		this.game.cycleTrade();
		this.pushHud();
	}
	focusTribe(id) {
		const camp = this.game.world.camps.find((c) => c.team === id);
		if (!camp) return;
		if (id !== 0 && !this.game.exploredAt(camp.x, camp.z)) {
			this.game.banner("That shore is still in fog. Send someone to explore.", 1.8);
			this.pushHud();
			return;
		}
		if (id !== 0) this.game.setTradeTeam(id);
		this.view.look.set(camp.x, this.game.height(camp.x, camp.z) + .5, camp.z);
		this.pushHud();
	}
	raidRival() {
		this.game.raidRival();
		this.pushHud();
	}
	offerPact() {
		this.game.offerPact();
		this.pushHud();
	}
	acceptRoute() {
		this.game.acceptRoute();
		this.pushHud();
	}
	declineRoute() {
		this.game.declineRoute();
		this.pushHud();
	}
	halt() {
		this.game.haltSelected();
		this.pushHud();
	}
	ageUp() {
		this.game.tryAgeUp(0);
		this.pushHud();
	}
	pickAge(which) {
		this.game.commitAge(0, which);
		this.pushHud();
	}
	cancelAge() {
		this.game.state.pendingAge = false;
		this.pushHud();
	}
	trainPeople() {
		this.game.assignJob("drill");
		this.pushHud();
	}
	focusIdle() {
		const u = this.game.focusIdleWorker();
		if (u) this.view.look.set(u.x, u.y + .5, u.z);
		this.pushHud();
	}
	cycleVillager(direction = 1) {
		const u = this.game.cycleVillager(direction);
		if (u) this.view.look.set(u.x, u.y + .5, u.z);
		this.canvas.focus();
		this.pushHud();
	}
	focusHome() {
		const c = this.game.campOf(0);
		this.view.look.set(c.x, this.game.height(c.x, c.z) + .5, c.z);
		this.canvas.focus();
	}
	explore() {
		this.game.issueExplore();
		this.pushHud();
	}
	setPaused(p) {
		if (this.workerHost) return this.dispatch({
			kind: "pause",
			paused: p
		});
		this.game.state.paused = p;
		if (p) saveGame(this.game);
		this.pushHud();
	}
	setSpeed(s) {
		if (this.workerHost) return this.dispatch({
			kind: "speed",
			speed: s === 4 || s === 3 ? 4 : s === 2 ? 2 : 1,
			resume: true
		});
		this.game.state.speed = s === 4 || s === 3 ? 4 : s === 2 ? 2 : 1;
		this.game.state.paused = false;
		this.pushHud();
	}
	toggleMute() {
		this.game.muted = !this.game.muted;
		this.audio.setMuted(this.game.muted);
	}
	setQuality(q) {
		if (this.workerHost) this.workerHost.projection.setDisplaySettings(q, this.fps);
		else this.game.quality = q;
		this.view.applyQuality(q);
		rememberGraphicsQuality(q);
	}
	focusMinimap(nx, nz) {
		this.view.look.x = nx;
		this.view.look.z = nz;
		this.view.look.y = this.game.height(nx, nz) + .4;
	}
	frame = (t) => {
		if (this.disposed) return;
		try {
			const frameGap = this.profile.frame(t);
			const workerWallDt = Number.isFinite(t) && Number.isFinite(this.last) && this.last > 0 ? Math.max(0, (t - this.last) / 1e3) : 0;
			const dt = frameDeltaSeconds(t, this.last);
			this.last = t;
			this.frames++;
			this.fpsAcc += frameGap / 1e3;
			if (this.fpsAcc >= .4) {
				this.fps = this.profile.frameRate(RUNTIME_PROFILE_RULES.displayRateWindowMilliseconds);
				if (this.workerHost) this.workerHost.projection.setDisplaySettings(this.view.quality, Math.round(this.fps));
				else this.game.fps = Math.round(this.fps);
				this.frames = 0;
				this.fpsAcc = 0;
			}
			this.view.pan.x = 0;
			this.view.pan.z = 0;
			if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.view.pan.z += 1;
			if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.view.pan.z -= 1;
			if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.view.pan.x -= 1;
			if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.view.pan.x += 1;
			if (this.keys.has("KeyQ")) this.view.yaw += .9 * dt;
			if (this.keys.has("KeyE")) this.view.yaw -= .9 * dt;
			if (this.view.lost) {
				this.hudAcc += dt;
				if (this.hudAcc > .3) {
					this.hudAcc = 0;
					this.pushHud();
				}
				return;
			}
			if (this.workerHost) {
				if (!document.hidden && !this.lifecycleBusy && !this.closing) this.workerHost.advanceWallTime(workerWallDt);
			} else if (this.workerBridgeTransition || this.lifecycleBusy || this.closing) {} else if (document.hidden) this.simAccumulator = 0;
			else {
				if (this.profile.personMethods.enabled) this.profile.personMethods.attach(this.game);
				const scheduling = advanceFrameSimulation(this.simAccumulator, dt, (step) => this.profile.measure("simulation", () => this.game.step(step, this.profile.simulationPhases)));
				this.simAccumulator = scheduling.pendingSeconds;
				this.profile.recordScheduling(scheduling);
			}
			this.audio.setMood(this.game.musicMood(), this.game.tribe(0).age, this.game.popNow(), dt, this.game.state.paused, this.game.seasonMix().name);
			if (this.keys.has("PageUp")) this.view.dist *= Math.exp(-dt);
			if (this.keys.has("PageDown")) this.view.dist *= Math.exp(dt);
			this.view.updateCamera(dt);
			if (this.keyboard.mode) this.keyboard.center();
			this.updateGhost();
			this.profile.measure("scene", () => this.view.sync(this.game, dt));
			this.profile.measure("draw", () => this.view.render());
			this.profile.recordRenderer(this.view.latestRenderMetrics);
			if (!this.workerHost) this.tuneQuality(dt);
			this.hudAcc += dt;
			if (this.hudAcc > .12) {
				this.hudAcc = 0;
				this.profile.measure("interface", () => this.pushHud());
			}
			this.saveAcc += dt;
			if (this.saveAcc > 18) {
				this.saveAcc = 0;
				this.profile.measure("save", () => this.autosave.request());
			}
			this.failFrames = 0;
		} catch (err) {
			console.error(err);
			this.failFrames++;
			if (this.failFrames >= 2 && this.game.quality !== "low") {
				this.failFrames = 0;
				this.setQuality(this.game.quality === "high" ? "med" : "low");
				if (!this.workerHost) this.game.banner("The valley eases", 1.8);
			}
		}
	};
	tuneQuality(dt) {
		if (this.game.quality === "low") {
			this.slowFps = 0;
			return;
		}
		if (this.fps > 0 && this.fps < 18 && this.frames + this.fpsAcc > 0) {
			this.slowFps += dt;
			if (this.slowFps > 3.2) {
				this.slowFps = 0;
				this.setQuality(this.game.quality === "high" ? "med" : "low");
				this.game.banner("Graphics reduced to keep the village responsive", 3);
			}
		} else this.slowFps = Math.max(0, this.slowFps - dt * .5);
	}
	pushHud() {
		if (this.workerHost) {
			if (this.workerHost.ready) {
				const notice = this.presentationFeedback && this.presentationFeedback.expires > performance.now() ? this.presentationFeedback.message : this.workerHost.hud.banner;
				this.hud({
					...this.workerHost.hud,
					fps: this.fps,
					banner: notice
				});
			}
			return;
		}
		try {
			const type = this.game.state.placing;
			const cost = type ? buildingCost(type, this.game, 0, this.plotSize, this.bridgeSpan) : null;
			const sections = type && linearStructure(type) && this.plotStart ? joinedConstructionLine(this.game.state.buildings, type, this.plotStart, this.ghostPos).length : 1;
			const materials = cost ? Object.entries(cost).filter(([, amount]) => amount > 0).map(([kind, amount]) => `${amount * sections} ${kind === "wood" ? "logs" : kind}`).join(" · ") : "";
			const summary = type ? `${sections > 1 ? sections + " sections · " : ""}${materials || "Labor only"}` : void 0;
			this.hud({
				...this.game.snapshot(),
				plotSummary: summary
			});
		} catch (err) {
			console.error(err);
		}
	}
	getDragRect() {
		if (!this.drag) return null;
		if (Math.hypot(this.drag.x - this.drag.sx, this.drag.y - this.drag.sy) < 8) return null;
		return this.drag;
	}
	installProbe() {
		window.__controlsTest = {
			getYaw: () => this.view.yaw,
			getSpeed: () => Math.hypot(this.view.pan.x, this.view.pan.z) + (this.running ? this.view.dist * .001 : 0),
			setKeys: (codes) => {
				this.keys.clear();
				for (const c of codes) this.keys.add(c);
			}
		};
		window.__engine = this;
	}
	dispose() {
		if (this.disposal) return this.disposal;
		if (this.disposed) return Promise.resolve();
		const source = this.game, owner = this.workerHost ?? null, retained = this.originalWorkerHost ?? null;
		this.closing = true;
		this.lifecycleBusy = true;
		this.lifecycleSequence = (this.lifecycleSequence ?? 0) + 1;
		this.dispatchGeneration = (this.dispatchGeneration ?? 1) + 1;
		this.running = false;
		this.profile?.personMethods.dispose();
		if (this.profile) this.profile.simulationPhases.enabled = false;
		this.autosave.dispose();
		this.view.renderer.setAnimationLoop(null);
		this.ro?.disconnect();
		window.removeEventListener("resize", this.onResize);
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("blur", this.onBlur);
		window.removeEventListener("pagehide", this.onPageHide);
		window.removeEventListener("beforeunload", this.onPageHide);
		document.removeEventListener("visibilitychange", this.onVis);
		this.canvas.removeEventListener("pointerdown", this.onPointerDown);
		this.canvas.removeEventListener("pointermove", this.onPointerMove);
		this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
		this.canvas.removeEventListener("pointerup", this.onPointerUp);
		this.canvas.removeEventListener("pointercancel", this.onPointerUp);
		window.removeEventListener("wheel", this.onWheel);
		this.view.dispose();
		this.audio.dispose();
		this.disposal = (async () => {
			try {
				if (owner?.ready) await owner.dispatch({
					kind: "pause",
					paused: true
				});
				const saved = await this.checkpointService.save(source.testMode ? "test-lab" : "village", false);
				this.lastLifecycle = {
					operation: "dispose",
					mode: owner ? "worker" : "main",
					save: saved.status
				};
			} catch (error) {
				this.lastLifecycle = {
					operation: "dispose",
					mode: owner ? "worker" : "main",
					save: "failed"
				};
				console.error(error);
			} finally {
				owner?.dispose();
				if (retained && retained !== owner) retained.dispose();
				this.workerHost = null;
				this.originalWorkerHost = null;
				this.disposed = true;
				this.lifecycleBusy = false;
			}
		})();
		return this.disposal;
	}
};
//#endregion
export { Engine };
