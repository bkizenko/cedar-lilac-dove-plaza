import { a as AGE_STAT, c as GATHER, d as TEAM_NAMES, f as TEAM_SHORT, h as WATER_Y, i as AGE_COST, l as SAVE_KEY, m as UNITS, n as AGES, o as BUILDINGS, p as TRADE_OFFERS, r as AGE_CHOICES, s as BUILD_ORDER, u as TEAM_COLORS } from "./routes-COMMjb-l.mjs";
import { A as Matrix4, B as Quaternion, C as FogExp2, D as InstancedMesh, E as InstancedBufferAttribute, F as Plane, G as SRGBColorSpace, H as Raycaster, I as PlaneGeometry, J as SphereGeometry, K as Scene, L as PointLight, M as MeshBasicMaterial, N as MeshStandardMaterial, O as LinearFilter, P as PerspectiveCamera, R as Points, S as Float32BufferAttribute, T as HemisphereLight, U as RepeatWrapping, V as RGBAFormat, W as RingGeometry, X as Vector2, Y as TorusGeometry, Z as Vector3, _ as DataTexture, a as EffectComposer, b as DynamicDrawUsage, c as AmbientLight, d as BufferGeometry, f as CanvasTexture, g as CylinderGeometry, h as ConeGeometry, i as RenderPass, j as Mesh, k as MathUtils, l as BoxGeometry, m as Color, n as FilmPass, o as ShaderPass, p as CapsuleGeometry, q as ShaderMaterial, r as UnrealBloomPass, s as WebGLRenderer, t as mergeGeometries, u as BufferAttribute, v as DirectionalLight, w as Group, x as Euler, y as DodecahedronGeometry, z as PointsMaterial } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-B653hBxa.js
function mulberry32(seed) {
	let a = seed >>> 0;
	return function rand() {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function hash2(x, z) {
	const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
	return n - Math.floor(n);
}
function noise2(x, z) {
	const xi = Math.floor(x);
	const zi = Math.floor(z);
	const xf = x - xi;
	const zf = z - zi;
	const u = xf * xf * (3 - 2 * xf);
	const v = zf * zf * (3 - 2 * zf);
	const a = hash2(xi, zi);
	const b = hash2(xi + 1, zi);
	const c = hash2(xi, zi + 1);
	const d = hash2(xi + 1, zi + 1);
	return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x, z, oct = 4) {
	let amp = .5;
	let freq = 1;
	let sum = 0;
	let norm = 0;
	for (let i = 0; i < oct; i++) {
		sum += amp * noise2(x * freq, z * freq);
		norm += amp;
		amp *= .5;
		freq *= 2.03;
	}
	return sum / norm;
}
function idx(ix, iz) {
	return iz * 113 + ix;
}
function node(id, kind, x, z, y, amount, scale, rich) {
	return {
		id,
		kind,
		x,
		z,
		y,
		amount,
		maxAmt: amount,
		regenT: 0,
		scale,
		rich
	};
}
function generateWorld(seed) {
	const rand = mulberry32(seed);
	const n = 113;
	const heights = /* @__PURE__ */ new Float32Array(12769);
	const islandR = 74 + rand() * 26;
	const hillScale = .75 + rand() * .85;
	const nHills = 3 + (rand() * 4 | 0);
	const hills = [];
	for (let i = 0; i < nHills; i++) {
		const a = rand() * Math.PI * 2;
		const d = islandR * (.22 + rand() * .5);
		hills.push({
			x: Math.sin(a) * d,
			z: Math.cos(a) * d,
			r: 12 + rand() * 16,
			h: (1.6 + rand() * 2.4) * hillScale
		});
	}
	const nRivers = rand() < .45 ? 2 : 1;
	const rivers = [];
	for (let i = 0; i < nRivers; i++) rivers.push({
		z: (rand() - .5) * islandR * .7,
		a: .018 + rand() * .03,
		w: 22 + rand() * 16
	});
	const fordSpread = islandR * .55;
	const fords = [];
	for (let k = 0; k < 5; k++) {
		const fx = -fordSpread + k / 4 * fordSpread * 2 + (rand() - .5) * 4;
		const fz = rivers[0] ? rivers[0].z + Math.sin(fx * rivers[0].a) * 12 : 0;
		fords.push({
			x: fx,
			z: fz
		});
	}
	const waterY = WATER_Y;
	for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
		const x = ix / 112 * 220 - 110;
		const z = iz / 112 * 220 - 110;
		const dist = Math.hypot(x, z);
		const r = islandR + fbm(x * .018 + 3, z * .018, 4) * 10;
		const coast = Math.max(0, Math.min(1, (r - dist) / 7));
		let h = .9 + fbm(x * .026, z * .026, 5) * (2.6 + hillScale);
		h += fbm(x * .07 + 20, z * .07, 3) * .55 * hillScale;
		for (const hill of hills) {
			const hd = hill.r - Math.hypot(x - hill.x, z - hill.z);
			if (hd > 0) h += hd / hill.r * (hd / hill.r) * hill.h;
		}
		for (const rv of rivers) {
			const rz = z - (rv.z + Math.sin(x * rv.a) * 12);
			const trench = Math.exp(-(rz * rz) / rv.w);
			h -= trench * 1.9;
		}
		for (const fd of fords) {
			const d = Math.hypot(x - fd.x, z - fd.z);
			if (d < 6.8) h += (1 - d / 6.8) * 1.55;
		}
		if (coast < .18) h = .06;
		else h = Math.max(.08, h * (.25 + .75 * coast));
		heights[idx(ix, iz)] = h;
	}
	const pickCamp = (ang, spread) => {
		for (let t = 0; t < 40; t++) {
			const a = ang + (rand() - .5) * spread;
			const d = islandR * (.28 + rand() * .22);
			const x = Math.sin(a) * d;
			const z = Math.cos(a) * d;
			if (sampleHeight(heights, x, z) > waterY + .85 && Math.hypot(x, z) < islandR - 12) return {
				x,
				z
			};
		}
		return {
			x: Math.sin(ang) * islandR * .35,
			z: Math.cos(ang) * islandR * .35
		};
	};
	const player = pickCamp(.05, .45);
	let rival = pickCamp(2.35, .5);
	let ash = pickCamp(-2.35, .5);
	const minD = 52 + rand() * 28;
	for (let t = 0; t < 24 && Math.hypot(rival.x - player.x, rival.z - player.z) < minD; t++) rival = pickCamp(2.2 + rand() * .6, .4);
	for (let t = 0; t < 24 && (Math.hypot(ash.x - player.x, ash.z - player.z) < minD || Math.hypot(ash.x - rival.x, ash.z - rival.z) < 48); t++) ash = pickCamp(-2.2 - rand() * .6, .4);
	const camps = [
		{
			x: player.x,
			z: player.z,
			team: 0
		},
		{
			x: rival.x,
			z: rival.z,
			team: 1
		},
		{
			x: ash.x,
			z: ash.z,
			team: 2
		}
	];
	for (const c of camps) {
		const bowlR = 16;
		for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
			const x = ix / 112 * 220 - 110;
			const z = iz / 112 * 220 - 110;
			const b = Math.hypot(x - c.x, z - c.z);
			if (b < bowlR) {
				const i = idx(ix, iz);
				heights[i] += (1 - b / bowlR) * .32;
			}
		}
	}
	let nid = 1;
	const trees = [];
	const stones = [];
	const forage = [];
	const tooClose = (list, x, z, min) => {
		for (const n0 of list) {
			const dx = n0.x - x;
			const dz = n0.z - z;
			if (dx * dx + dz * dz < min * min) return true;
		}
		return false;
	};
	const nearCamp = (x, z, r) => camps.some((c) => Math.hypot(x - c.x, z - c.z) < r);
	const treeTries = 380 + (rand() * 80 | 0);
	for (let i = 0; i < treeTries; i++) {
		const x = (rand() - .5) * 204;
		const z = (rand() - .5) * 204;
		const h = sampleHeight(heights, x, z);
		if (h < waterY + .6) continue;
		if (nearCamp(x, z, 13)) continue;
		if (tooClose(trees, x, z, 3.4)) continue;
		if (fbm(x * .055 + 4, z * .055, 3) < .4 && rand() > .22) continue;
		const amt = 8 + (rand() * 8 | 0);
		trees.push(node(nid++, "tree", x, z, h, amt, .9 + rand() * .7, .7 + rand() * .6));
	}
	for (let i = 0; i < 42; i++) {
		const x = (rand() - .5) * 202;
		const z = (rand() - .5) * 202;
		const h = sampleHeight(heights, x, z);
		if (h < waterY + 1) continue;
		if (tooClose(stones, x, z, 7)) continue;
		if (h < 2.2 && rand() > .4) continue;
		const amt = 12 + (rand() * 10 | 0);
		stones.push(node(nid++, "stone", x, z, h, amt, .8 + rand() * .5, .75 + rand() * .5));
	}
	for (let i = 0; i < 70; i++) {
		const x = (rand() - .5) * 202;
		const z = (rand() - .5) * 202;
		const h = sampleHeight(heights, x, z);
		if (h < waterY + .5 || h > 2.4) continue;
		if (tooClose(forage, x, z, 4.6)) continue;
		const amt = 8 + (rand() * 7 | 0);
		forage.push(node(nid++, "forage", x, z, h, amt, .85 + rand() * .35, .7 + rand() * .55));
	}
	const kinds = [
		"food",
		"wood",
		"stone"
	];
	const megaliths = [];
	for (let i = 0; i < 5 + (rand() * 4 | 0); i++) {
		const a = rand() * Math.PI * 2;
		const d = islandR * (.22 + rand() * .52);
		const x = Math.sin(a) * d;
		const z = Math.cos(a) * d;
		if (sampleHeight(heights, x, z) < waterY + .7 || nearCamp(x, z, 18)) continue;
		megaliths.push({
			x,
			z,
			ry: rand() * Math.PI,
			cache: kinds[rand() * 3 | 0],
			amt: 18 + (rand() * 22 | 0)
		});
	}
	return {
		size: 220,
		segs: 112,
		heights,
		waterY,
		baseWaterY: waterY,
		islandR,
		trees,
		stones,
		forage,
		camps,
		megaliths
	};
}
function sampleHeight(heights, x, z) {
	const gx = (x + 110) / 220 * 112;
	const gz = (z + 110) / 220 * 112;
	const ix = Math.max(0, Math.min(111, Math.floor(gx)));
	const iz = Math.max(0, Math.min(111, Math.floor(gz)));
	const fx = Math.max(0, Math.min(1, gx - ix));
	const fz = Math.max(0, Math.min(1, gz - iz));
	const nn = 113;
	const a = heights[iz * nn + ix];
	const b = heights[iz * nn + ix + 1];
	const c = heights[(iz + 1) * nn + ix];
	const d = heights[(iz + 1) * nn + ix + 1];
	return a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz;
}
function inBounds(x, z, pad = 2) {
	return Math.abs(x) < 110 - pad && Math.abs(z) < 110 - pad;
}
function isFertile(heights, x, z, waterY) {
	const h = sampleHeight(heights, x, z);
	if (h < waterY + .45 || h > waterY + 1.85) return false;
	return Math.abs(sampleHeight(heights, x + 2.2, z) - sampleHeight(heights, x - 2.2, z)) + Math.abs(sampleHeight(heights, x, z + 2.2) - sampleHeight(heights, x, z - 2.2)) < 1.05;
}
var WALK = 72;
var Game = class {
	state;
	world;
	walk;
	vision = /* @__PURE__ */ new Uint8Array(6400);
	visAge = /* @__PURE__ */ new Float32Array(6400);
	looted = /* @__PURE__ */ new Set();
	started = false;
	muted = false;
	quality = "high";
	fps = 60;
	idleCursor = 0;
	tradeTeam = 1;
	onSfx = () => {};
	constructor() {
		this.world = generateWorld(56033);
		this.walk = /* @__PURE__ */ new Uint8Array(5184);
		this.state = this.blank();
	}
	blank() {
		return {
			seed: 56033,
			time: 0,
			age: 0,
			tribes: [],
			units: [],
			buildings: [],
			trees: [],
			stones: [],
			forage: [],
			projectiles: [],
			floaters: [],
			particles: [],
			selBld: null,
			paused: false,
			speed: 1,
			ended: null,
			endReason: "",
			banner: "",
			bannerT: 0,
			placing: null,
			nextId: 1,
			walkDirty: true,
			agePicks: [],
			pendingAge: false,
			event: "none",
			eventT: 80,
			weather: "mist",
			weatherT: 48,
			birthT: 42
		};
	}
	id() {
		return this.state.nextId++;
	}
	height(x, z) {
		return sampleHeight(this.world.heights, x, z);
	}
	campOf(team) {
		return this.world.camps.find((c) => c.team === team) || this.world.camps[0] || {
			x: 0,
			z: 0,
			team
		};
	}
	reset(seed) {
		const s = seed ?? Math.random() * 4294967295 | 0;
		this.world = generateWorld(s);
		this.state = this.blank();
		this.state.seed = s;
		this.started = true;
		this.state.trees = this.world.trees.map((t) => ({
			...t,
			maxAmt: t.maxAmt || t.amount,
			regenT: 0,
			rich: t.rich ?? 1
		}));
		this.state.stones = this.world.stones.map((t) => ({
			...t,
			maxAmt: t.maxAmt || t.amount,
			regenT: 0,
			rich: t.rich ?? 1
		}));
		this.state.forage = this.world.forage.map((t) => ({
			...t,
			maxAmt: t.maxAmt || t.amount,
			regenT: 0,
			rich: t.rich ?? 1
		}));
		this.tradeTeam = 1;
		this.looted.clear();
		this.visAge.fill(0);
		this.state.tribes = TEAM_NAMES.map((name, i) => ({
			id: i,
			name,
			short: TEAM_SHORT[i],
			color: TEAM_COLORS[i],
			food: i === 0 ? 72 : 55,
			wood: i === 0 ? 58 : 42,
			stone: i === 0 ? 16 : 10,
			age: 0,
			aggro: 0,
			expand: i === 2 ? .85 : i === 1 ? .4 : .5,
			tech: i === 2 ? .7 : i === 1 ? .4 : .45,
			lastRaid: 90,
			thinkT: 1 + i * .4,
			alive: true,
			hostile: false,
			tradeCd: 0
		}));
		for (const camp of this.world.camps) {
			const h = this.height(camp.x, camp.z);
			this.state.buildings.push(this.makeBld("townhall", camp.x, camp.z, camp.team, h));
			this.state.buildings.push(this.makeBld("hut", camp.x - 8, camp.z + 6, camp.team, this.height(camp.x - 8, camp.z + 6)));
			this.state.buildings.push(this.makeBld("hut", camp.x + 8, camp.z + 5, camp.team, this.height(camp.x + 8, camp.z + 5)));
			if (camp.team === 0) this.state.buildings.push(this.makeBld("hut", camp.x - 3, camp.z + 10, camp.team, this.height(camp.x - 3, camp.z + 10)));
			else this.state.buildings.push(this.makeBld("lumber", camp.x + 10, camp.z - 4, camp.team, this.height(camp.x + 10, camp.z - 4)));
			const nWork = camp.team === 0 || camp.team === 2 ? 3 : 2;
			for (let i = 0; i < nWork; i++) {
				const a = i / nWork * Math.PI * 2;
				const u = this.spawnUnit("worker", camp.x + Math.cos(a) * 5, camp.z + Math.sin(a) * 5 - 3, camp.team);
				u.order = "idle";
			}
			if (camp.team === 1) for (let i = 0; i < 2; i++) {
				const a = i * 1.4;
				this.spawnUnit("spearman", camp.x + Math.cos(a) * 6, camp.z + Math.sin(a) * 6, camp.team);
			}
			else if (camp.team === 2) {
				this.spawnUnit("spearman", camp.x + 5, camp.z - 4, camp.team);
				this.spawnUnit("archer", camp.x - 5, camp.z - 3, camp.team);
			} else {
				this.spawnUnit("spearman", camp.x + 4, camp.z - 5, camp.team);
				this.spawnUnit("spearman", camp.x - 5, camp.z - 4, camp.team);
			}
		}
		for (const camp of this.world.camps) {
			const hx = camp.x;
			const hz = camp.z;
			const nExtra = camp.team === 0 ? 6 : 4;
			for (let i = 0; i < nExtra; i++) {
				const x = hx - 8 - i % 3 * 2.4;
				const z = hz - 9 - Math.floor(i / 3) * 2.2;
				this.state.forage.push({
					id: this.id(),
					kind: "forage",
					x,
					z,
					y: this.height(x, z),
					amount: 12,
					maxAmt: 12,
					regenT: 0,
					scale: 1,
					rich: .85 + Math.random() * .4
				});
			}
			for (let i = 0; i < nExtra; i++) {
				const x = hx + 10 + i % 3 * 2.6;
				const z = hz - 7 - Math.floor(i / 3) * 2.4;
				this.state.trees.push({
					id: this.id(),
					kind: "tree",
					x,
					z,
					y: this.height(x, z),
					amount: 12,
					maxAmt: 12,
					regenT: 0,
					scale: 1,
					rich: .8 + Math.random() * .45
				});
			}
			for (let i = 0; i < 2; i++) {
				const x = hx + (i === 0 ? 12 : -11);
				const z = hz + (i === 0 ? 8 : -10);
				this.state.stones.push({
					id: this.id(),
					kind: "stone",
					x,
					z,
					y: this.height(x, z),
					amount: 14,
					maxAmt: 14,
					regenT: 0,
					scale: 1.05,
					rich: .9 + Math.random() * .35
				});
			}
		}
		this.rebuildWalk();
		this.vision.fill(0);
		const home = this.campOf(0);
		this.stampVision(home.x, home.z, 26, 1);
		this.updateVision(0);
		this.banner("An island at first light  ·  gatherers find their own work", 2.8);
		this.onSfx("age");
	}
	makeBld(type, x, z, team, y) {
		const d = BUILDINGS[type];
		const hp = d.hp;
		return {
			id: this.id(),
			kind: "building",
			type,
			team,
			x,
			y: y ?? this.height(x, z),
			z,
			w: d.w,
			d: d.d,
			hp,
			maxHp: hp,
			selected: false,
			queue: [],
			rally: null,
			cd: 0
		};
	}
	spawnUnit(type, x, z, team) {
		const d = UNITS[type];
		const tribe = this.state.tribes[team];
		const mul = AGE_STAT[tribe?.age ?? 0];
		const u = {
			id: this.id(),
			kind: "unit",
			type,
			team,
			x,
			y: this.height(x, z),
			z,
			vx: 0,
			vz: 0,
			facing: 0,
			hp: Math.round(d.hp * mul),
			maxHp: Math.round(d.hp * mul),
			speed: d.speed,
			range: d.range,
			dmg: d.dmg * mul,
			rof: d.rof,
			cd: 0,
			r: d.r,
			selected: false,
			order: "idle",
			tx: x,
			tz: z,
			job: null,
			node: null,
			gatherT: 0,
			carry: 0,
			carryType: null,
			target: null,
			wanderT: 2,
			aggroT: 20 + Math.random() * 20,
			stride: Math.random() * Math.PI * 2,
			trade: null,
			tradeTeam: 0,
			ageT: 40 + Math.random() * 90,
			jobLock: false
		};
		if (team === 1 && type !== "worker") {
			u.hp = Math.round(u.hp * 1.15);
			u.maxHp = u.hp;
			u.dmg *= 1.08;
		}
		if (team === 2) {
			if (type === "worker") u.speed *= 1.1;
			if (type === "archer") u.range += 2;
		}
		this.state.units.push(u);
		return u;
	}
	tribe(team) {
		return this.state.tribes[team];
	}
	popCap(team = 0) {
		let cap = 0;
		for (const b of this.state.buildings) if (b.hp > 0 && b.team === team) cap += BUILDINGS[b.type]?.pop || 0;
		return cap;
	}
	popNow(team = 0) {
		let n = 0;
		for (const u of this.state.units) if (u.team === team && u.hp > 0) n++;
		return n;
	}
	queued(team = 0) {
		let n = 0;
		for (const b of this.state.buildings) if (b.team === team) n += b.queue.length;
		return n;
	}
	canAfford(team, cost) {
		const t = this.tribe(team);
		if (!t) return false;
		return t.food >= (cost.food || 0) && t.wood >= (cost.wood || 0) && t.stone >= (cost.stone || 0);
	}
	spend(team, cost) {
		const t = this.tribe(team);
		if (!t) return;
		t.food -= cost.food || 0;
		t.wood -= cost.wood || 0;
		t.stone -= cost.stone || 0;
	}
	hasBld(team, type) {
		return this.state.buildings.some((b) => b.team === team && b.type === type && b.hp > 0);
	}
	gatherMul(team) {
		let m = 1;
		if (this.hasBld(team, "market")) m *= .88;
		const picks = team === 0 ? this.state.agePicks : [];
		for (const p of picks) if (p === "econ") m *= .88;
		if (this.state.weather === "frost") m *= 1.22;
		if (this.state.weather === "storm") m *= 1.24;
		if (this.state.weather === "rain") m *= .92;
		if (this.state.weather === "golden") m *= .9;
		if (this.state.weather === "flood") m *= 1.18;
		if (this.state.weather === "drought") m *= 1.16;
		if (this.state.event === "herd" && team === 0) m *= .78;
		return m;
	}
	dmgMul(team) {
		let m = this.hasBld(team, "forge") ? 1.12 : 1;
		if (team === 0) {
			for (const p of this.state.agePicks) if (p === "army") m *= 1.08;
		}
		return m;
	}
	hpMul(team) {
		let m = 1;
		if (team === 0) {
			for (const p of this.state.agePicks) if (p === "army") m *= 1.1;
		}
		return m;
	}
	banner(text, t = 2) {
		this.state.banner = text;
		this.state.bannerT = t;
	}
	addFloater(x, y, z, text, color) {
		if (this.state.floaters.length > 36) this.state.floaters.splice(0, 8);
		this.state.floaters.push({
			x,
			y,
			z,
			text,
			color,
			life: 1.4,
			max: 1.4
		});
	}
	addBurst(x, y, z, color, n = 8) {
		if (this.state.particles.length > 160) return;
		const count = Math.min(n, 160 - this.state.particles.length);
		for (let i = 0; i < count; i++) this.state.particles.push({
			x,
			y,
			z,
			vx: (Math.random() - .5) * 4,
			vy: 2 + Math.random() * 3,
			vz: (Math.random() - .5) * 4,
			life: .5 + Math.random() * .4,
			max: .8,
			r: .08 + Math.random() * .08,
			color
		});
	}
	rebuildWalk() {
		const cell = 220 / WALK;
		for (let iz = 0; iz < WALK; iz++) for (let ix = 0; ix < WALK; ix++) {
			const x = -110 + (ix + .5) * cell;
			const z = -110 + (iz + .5) * cell;
			let ok = this.height(x, z) > this.world.waterY + .28 && inBounds(x, z, 1.5);
			if (ok) for (const b of this.state.buildings) {
				if (b.hp <= 0) continue;
				if (Math.abs(b.x - x) < b.w * .36 && Math.abs(b.z - z) < b.d * .36) {
					ok = false;
					break;
				}
			}
			this.walk[iz * WALK + ix] = ok ? 1 : 0;
		}
		this.state.walkDirty = false;
	}
	walkable(x, z) {
		if (!inBounds(x, z, 1.2)) return false;
		if (this.height(x, z) < this.world.waterY + .22) return false;
		const cell = 220 / WALK;
		const ix = Math.max(0, Math.min(71, Math.floor((x + 110) / cell)));
		const iz = Math.max(0, Math.min(71, Math.floor((z + 110) / cell)));
		return this.walk[iz * WALK + ix] === 1;
	}
	canStep(u, x, z) {
		if (!inBounds(x, z, 1)) return false;
		const h = this.height(x, z);
		if (h < this.world.waterY - .08) return false;
		if (u.order === "attack" && u.target && u.target.kind === "building") return true;
		if (h < this.world.waterY + .22) return true;
		return this.walkable(x, z);
	}
	placementIssue(type, x, z, _team = 0) {
		const d = BUILDINGS[type];
		if (!inBounds(x, z, Math.max(d.w, d.d) * .5 + 1)) return "Too close to the shore";
		if (Math.hypot(x, z) > this.world.islandR - 10) return "Too close to the shore";
		const steps = 4;
		for (let iz = 0; iz <= steps; iz++) for (let ix = 0; ix <= steps; ix++) {
			const px = x - d.w / 2 + ix / steps * d.w;
			const pz = z - d.d / 2 + iz / steps * d.d;
			if (this.height(px, pz) < this.world.waterY + .28) return "Can't raise that in the water";
		}
		if (type !== "quarry") for (const n of this.state.stones) {
			if (n.amount <= 0) continue;
			if (Math.abs(n.x - x) < d.w / 2 + 1 && Math.abs(n.z - z) < d.d / 2 + 1) return "Too close to a stone outcrop";
		}
		for (const n of this.state.trees) {
			if (n.amount <= 0) continue;
			if (Math.abs(n.x - x) < d.w / 2 + .85 && Math.abs(n.z - z) < d.d / 2 + .85) return "Too close to the trees — clear a plot first";
		}
		for (const n of this.state.forage) {
			if (n.amount <= 0) continue;
			if (Math.abs(n.x - x) < d.w / 2 + .7 && Math.abs(n.z - z) < d.d / 2 + .7) return "That's a berry thicket";
		}
		for (const b of this.state.buildings) {
			if (b.hp <= 0) continue;
			if (Math.abs(b.x - x) < (b.w + d.w) * .48 && Math.abs(b.z - z) < (b.d + d.d) * .48) return "Too close to another building";
		}
		if (type === "quarry") {
			let on = false;
			for (const s of this.state.stones) if (s.amount > 0 && Math.hypot(s.x - x, s.z - z) < 6.5) {
				on = true;
				break;
			}
			if (!on) return "A quarry must sit on a stone outcrop";
		}
		if (type === "lumber") {
			let n = 0;
			for (const t of this.state.trees) if (t.amount > 0 && Math.hypot(t.x - x, t.z - z) < 14) n++;
			if (n < 4) return "A lumber camp needs a stand of pines";
		}
		if (type === "farm") {
			if (!isFertile(this.world.heights, x, z, this.world.baseWaterY)) return "Farms need fertile, level ground";
		}
		return null;
	}
	placementValid(type, x, z, team = 0) {
		return this.placementIssue(type, x, z, team) === null;
	}
	findPlaceSpot(type, x, z, team = 0) {
		const sx = Math.round(x / 2) * 2;
		const sz = Math.round(z / 2) * 2;
		if (this.placementValid(type, sx, sz, team)) return {
			x: sx,
			z: sz
		};
		for (let ring = 1; ring <= 5; ring++) {
			const r = ring * 2;
			for (let i = 0; i < ring * 8; i++) {
				const a = i / (ring * 8) * Math.PI * 2;
				const px = Math.round((sx + Math.cos(a) * r) / 2) * 2;
				const pz = Math.round((sz + Math.sin(a) * r) / 2) * 2;
				if (this.placementValid(type, px, pz, team)) return {
					x: px,
					z: pz
				};
			}
		}
		return null;
	}
	placeBuilding(type, x, z, team = 0) {
		if (this.state.ended) return false;
		if (team === 0 && this.state.weather === "storm") {
			this.banner("The storm holds the builders", 1.6);
			this.onSfx("invalid");
			return false;
		}
		const d = BUILDINGS[type];
		const tribe = this.tribe(team);
		if (!d || !tribe) return false;
		if (this.state.buildings.filter((b) => b.type === type && b.hp > 0).length >= 56) {
			if (team === 0) this.banner("The island can't hold more of those", 1.6);
			return false;
		}
		if (tribe.age < d.age) {
			if (team === 0) this.banner("Requires " + AGES[d.age] + " Age", 1.4);
			return false;
		}
		const cost = {
			food: d.food,
			wood: d.wood,
			stone: d.stone
		};
		if (!this.canAfford(team, cost)) {
			if (team === 0) {
				this.banner("Not enough resources", 1.3);
				this.onSfx("invalid");
			}
			return false;
		}
		const sx = Math.round(x / 2) * 2;
		const sz = Math.round(z / 2) * 2;
		const spot = this.findPlaceSpot(type, sx, sz, team);
		if (!spot) {
			if (team === 0) {
				this.banner(this.placementIssue(type, sx, sz, team) || "Can't build there", 1.6);
				this.onSfx("invalid");
			}
			return false;
		}
		this.spend(team, cost);
		const b = this.makeBld(type, spot.x, spot.z, team);
		this.state.buildings.push(b);
		this.state.walkDirty = true;
		this.addBurst(spot.x, b.y + 1, spot.z, "#c4b494", 10);
		if (team === 0) {
			this.addFloater(spot.x, b.y + 3, spot.z, d.name, "#efe4b0");
			this.onSfx("place");
		}
		return true;
	}
	clearSelect() {
		for (const u of this.state.units) u.selected = false;
		for (const b of this.state.buildings) b.selected = false;
		this.state.selBld = null;
	}
	selectedUnits() {
		return this.state.units.filter((u) => u.selected && u.team === 0 && u.hp > 0);
	}
	selectAt(x, z, additive) {
		let bestU = null;
		let bd = 2.2;
		for (const u of this.state.units) {
			if (u.hp <= 0) continue;
			const d = Math.hypot(u.x - x, u.z - z);
			if (d < bd) {
				bd = d;
				bestU = u;
			}
		}
		let bestB = null;
		let bb = 1e9;
		for (const b of this.state.buildings) {
			if (b.hp <= 0) continue;
			if (Math.abs(b.x - x) < b.w * .55 && Math.abs(b.z - z) < b.d * .55) {
				const d = Math.hypot(b.x - x, b.z - z);
				if (d < bb) {
					bb = d;
					bestB = b;
				}
			}
		}
		if (bestU && (!bestB || bd < 1.6)) {
			if (!additive) this.clearSelect();
			if (bestU.team === 0) bestU.selected = true;
			else {
				this.clearSelect();
				bestU.selected = true;
			}
			return;
		}
		if (bestB) {
			if (!additive) this.clearSelect();
			bestB.selected = true;
			this.state.selBld = bestB;
			return;
		}
		if (!additive) this.clearSelect();
	}
	selectBox(x0, z0, x1, z1) {
		const minx = Math.min(x0, x1), maxx = Math.max(x0, x1);
		const minz = Math.min(z0, z1), maxz = Math.max(z0, z1);
		this.clearSelect();
		for (const u of this.state.units) {
			if (u.team !== 0 || u.hp <= 0) continue;
			if (u.x >= minx && u.x <= maxx && u.z >= minz && u.z <= maxz) u.selected = true;
		}
	}
	issueMove(x, z, attackMove = false) {
		const units = this.selectedUnits();
		if (!units.length) {
			if (this.state.selBld && this.state.selBld.team === 0) this.state.selBld.rally = {
				x,
				z
			};
			return;
		}
		const n = units.length;
		const ring = Math.ceil(Math.sqrt(n));
		units.forEach((u, i) => {
			const ox = (i % ring - (ring - 1) / 2) * 1.3;
			const oz = (Math.floor(i / ring) - (ring - 1) / 2) * 1.3;
			u.tx = x + ox;
			u.tz = z + oz;
			u.order = attackMove ? "attackmove" : "move";
			u.target = null;
			u.node = null;
		});
		this.onSfx("move");
	}
	issueAttack(target) {
		const selected = this.selectedUnits();
		const anyMil = selected.some((u) => u.type !== "worker");
		if (target.team !== 0 && (anyMil || !selected.length)) {
			if (this.marchMilitary(target.x, target.z, target, "attack")) {
				this.makeHostile(target.team);
				this.onSfx("move");
				return;
			}
		}
		const units = selected;
		const n = units.length;
		const ring = Math.max(1, Math.ceil(Math.sqrt(n)));
		units.forEach((u, i) => {
			const ox = (i % ring - (ring - 1) / 2) * 1.5;
			const oz = (Math.floor(i / ring) - (ring - 1) / 2) * 1.5;
			u.target = target;
			u.order = "attack";
			u.tx = target.x + ox;
			u.tz = target.z + oz;
		});
		if (target.team !== 0) this.makeHostile(target.team);
		if (units.length) this.onSfx("move");
	}
	marchMilitary(tx, tz, target, order) {
		const mil = this.state.units.filter((u) => u.team === 0 && u.type !== "worker" && u.hp > 0);
		if (!mil.length) return false;
		const n = mil.length;
		const ring = Math.max(1, Math.ceil(Math.sqrt(n)));
		mil.forEach((u, i) => {
			const ox = (i % ring - (ring - 1) / 2) * 1.7;
			const oz = (Math.floor(i / ring) - (ring - 1) / 2) * 1.7;
			u.tx = tx + ox;
			u.tz = tz + oz;
			u.order = order;
			u.target = target;
			u.node = null;
			u.selected = true;
		});
		return true;
	}
	makeHostile(team) {
		const tr = this.tribe(team);
		if (!tr || tr.hostile || team === 0) return;
		tr.hostile = true;
		tr.aggro = team === 1 ? .75 : .35;
		tr.lastRaid = 50;
		this.banner(tr.name + " takes up arms", 2.4);
	}
	isArmed(ent) {
		return ent.kind === "building" || ent.kind === "unit" && ent.type !== "worker" && ent.order !== "trade";
	}
	assignJob(job) {
		const units = this.selectedUnits().filter((u) => u.type === "worker");
		if (!units.length) {
			this.banner("Select gatherers first", 1.4);
			return;
		}
		if (job === "hold") {
			for (const u of units) {
				u.order = "hold";
				u.job = null;
				u.jobLock = false;
				u.node = null;
				u.target = null;
				u.trade = null;
			}
			this.banner("Resting", 1.1);
			this.onSfx("click");
			return;
		}
		for (const u of units) {
			u.job = job;
			u.jobLock = true;
			u.trade = null;
			u.target = null;
			const node = this.findNode(u, job);
			if (node) {
				u.node = node;
				u.order = "gather";
				u.tx = node.x;
				u.tz = node.z;
			} else {
				u.order = "idle";
				this.banner("No " + (job === "food" ? "berries" : job) + " nearby", 1.3);
			}
		}
		this.onSfx("move");
	}
	resourceAt(x, z) {
		let best = null;
		let bd = 2.4;
		const consider = (n, nx, nz, reach) => {
			const d = Math.hypot(nx - x, nz - z);
			if (d < reach && d < bd) {
				bd = d;
				best = n;
			}
		};
		for (const n of this.state.forage) if (n.amount > 0) consider(n, n.x, n.z, 2.2);
		for (const n of this.state.trees) if (n.amount > 0) consider(n, n.x, n.z, 2.4);
		for (const n of this.state.stones) if (n.amount > 0) consider(n, n.x, n.z, 2.6);
		for (const b of this.state.buildings) if (b.hp > 0 && b.team === 0 && b.type === "farm") consider(b, b.x, b.z, Math.max(b.w, b.d) * .55);
		return best;
	}
	issueGather(node) {
		const workers = this.selectedUnits().filter((u) => u.type === "worker");
		if (!workers.length) {
			this.issueMove(node.x, node.z);
			return;
		}
		const job = this.resKind(node);
		if (!job) {
			this.issueMove(node.x, node.z);
			return;
		}
		for (const u of workers) {
			u.job = job;
			u.jobLock = true;
			u.node = node;
			u.order = "gather";
			u.tx = node.x;
			u.tz = node.z;
			u.target = null;
			u.trade = null;
		}
		this.onSfx("move");
	}
	issueExplore() {
		let units = this.selectedUnits();
		if (!units.length) units = this.idleWorkers().slice(0, 2);
		if (!units.length) {
			this.banner("Select people, then Explore (X)", 1.6);
			return;
		}
		let sent = 0;
		for (const u of units) {
			const t = this.findExploreTarget(u);
			if (!t) continue;
			u.order = "explore";
			u.tx = t.x;
			u.tz = t.z;
			u.target = null;
			u.node = null;
			u.trade = null;
			u.wanderT = 0;
			u.gatherT = 0;
			sent++;
		}
		if (sent) {
			this.banner("Scouting the island", 1.6);
			this.onSfx("move");
		} else this.banner("The island is already known", 1.4);
	}
	findExploreTarget(u) {
		const n = 80;
		const cell = 220 / n;
		let best = null;
		let bd = 0xe8d4a51000;
		const step = 2;
		for (let iz = 1; iz < 79; iz += step) for (let ix = 1; ix < 79; ix += step) {
			if (this.vision[iz * n + ix] !== 0) continue;
			const wx = -110 + (ix + .5) * cell;
			const wz = -110 + (iz + .5) * cell;
			if (!this.walkable(wx, wz)) continue;
			if (Math.hypot(wx, wz) > this.world.islandR - 8) continue;
			const d = Math.hypot(wx - u.x, wz - u.z);
			if (d < 12) continue;
			const score = d + Math.random() * 8;
			if (score < bd) {
				bd = score;
				best = {
					x: wx,
					z: wz
				};
			}
		}
		if (!best) for (let i = 0; i < this.world.megaliths.length; i++) {
			if (this.looted.has(i)) continue;
			const m = this.world.megaliths[i];
			if (this.walkable(m.x, m.z) || this.canStep(u, m.x, m.z)) return {
				x: m.x,
				z: m.z
			};
		}
		return best;
	}
	lootMegaliths(u) {
		if (u.team !== 0 || u.type !== "worker") return;
		const tr = this.tribe(0);
		for (let i = 0; i < this.world.megaliths.length; i++) {
			if (this.looted.has(i)) continue;
			const m = this.world.megaliths[i];
			if (Math.hypot(u.x - m.x, u.z - m.z) > 5.2) continue;
			this.looted.add(i);
			tr[m.cache] += m.amt;
			this.addFloater(m.x, this.height(m.x, m.z) + 2.4, m.z, "+" + m.amt, "#efe4b0");
			this.banner("The standing stones hide a cache of " + (m.cache === "food" ? "berries" : m.cache), 2.2);
			this.onSfx("age");
		}
	}
	exploreAI(u, dt) {
		this.lootMegaliths(u);
		if (this.steer(u, dt)) {
			u.gatherT += 1;
			const next = u.gatherT < 5 ? this.findExploreTarget(u) : null;
			if (next) {
				u.tx = next.x;
				u.tz = next.z;
			} else {
				u.order = "idle";
				u.gatherT = 0;
			}
		}
	}
	raidRival() {
		const rival = this.pickRaidRival();
		if (!rival) {
			this.banner("No rival remains", 1.4);
			return;
		}
		const hall = this.state.buildings.find((b) => b.team === rival.id && b.type === "townhall" && b.hp > 0);
		if (!hall) return;
		if (!this.marchMilitary(hall.x, hall.z, hall, "attackmove")) {
			this.banner("Train hunters, then strike", 1.8);
			this.onSfx("invalid");
			return;
		}
		this.makeHostile(rival.id);
		this.banner("Marching on " + rival.name, 1.8);
		this.onSfx("move");
	}
	pickRaidRival() {
		const selU = this.state.units.find((u) => u.selected && u.team !== 0 && u.hp > 0);
		if (selU) {
			const tr = this.tribe(selU.team);
			if (tr?.alive) return tr;
		}
		const selB = this.state.selBld;
		if (selB && selB.team !== 0 && selB.hp > 0) {
			const tr = this.tribe(selB.team);
			if (tr?.alive) return tr;
		}
		const mil = this.selectedUnits().filter((u) => u.type !== "worker");
		const ox = mil.length ? mil.reduce((s, u) => s + u.x, 0) / mil.length : this.campOf(0).x;
		const oz = mil.length ? mil.reduce((s, u) => s + u.z, 0) / mil.length : this.campOf(0).z;
		let best = null;
		let bd = 0xe8d4a51000;
		for (const tr of this.state.tribes) {
			if (tr.id === 0 || !tr.alive) continue;
			const hall = this.state.buildings.find((b) => b.team === tr.id && b.type === "townhall" && b.hp > 0);
			if (!hall) continue;
			const d = (hall.x - ox) ** 2 + (hall.z - oz) ** 2;
			if (d < bd) {
				bd = d;
				best = tr;
			}
		}
		return best;
	}
	pickTradeRival() {
		const focused = this.tribe(this.tradeTeam);
		if (focused && focused.id !== 0 && focused.alive && !focused.hostile) return focused;
		const selU = this.state.units.find((u) => u.selected && u.team !== 0 && u.hp > 0);
		if (selU) {
			const tr = this.tribe(selU.team);
			if (tr?.alive && !tr.hostile) {
				this.tradeTeam = tr.id;
				return tr;
			}
		}
		const next = this.state.tribes.find((t) => t.id !== 0 && t.alive && !t.hostile) || this.state.tribes.find((t) => t.id !== 0 && t.alive) || null;
		if (next) this.tradeTeam = next.id;
		return next;
	}
	cycleTrade() {
		const rivals = this.state.tribes.filter((t) => t.id !== 0 && t.alive);
		if (!rivals.length) {
			this.banner("No one left to trade with", 1.4);
			return;
		}
		const next = rivals[(rivals.findIndex((t) => t.id === this.tradeTeam) + 1 + rivals.length) % rivals.length];
		this.tradeTeam = next.id;
		this.banner(next.hostile ? next.name + " is at war — trade closed" : "Trading with " + next.name, 1.6);
		this.onSfx("click");
	}
	setTradeTeam(id) {
		const tr = this.tribe(id);
		if (!tr || tr.id === 0) return;
		this.tradeTeam = id;
		this.banner(tr.hostile ? tr.name + " is at war" : "Trading with " + tr.name, 1.4);
	}
	tryTrade(deal) {
		const rival = this.pickTradeRival();
		if (!rival) {
			this.banner("No one left to trade with", 1.4);
			return;
		}
		if (rival.hostile) {
			this.banner(rival.name + " will not trade while at war", 1.8);
			this.onSfx("invalid");
			return;
		}
		if (rival.tradeCd > 0) {
			this.banner("Traders are still on the path", 1.4);
			return;
		}
		const cost = { [deal.give]: deal.giveAmt };
		if (!this.canAfford(0, cost)) {
			this.banner("Not enough to trade", 1.4);
			this.onSfx("invalid");
			return;
		}
		const hall = this.state.buildings.find((b) => b.team === rival.id && b.type === "townhall" && b.hp > 0);
		if (!hall) return;
		let worker = this.selectedUnits().find((u) => u.type === "worker") || this.state.units.find((u) => u.team === 0 && u.type === "worker" && u.hp > 0 && (u.order === "idle" || u.order === "hold" || u.order === "gather"));
		if (!worker) {
			this.banner("Need a gatherer to carry the goods", 1.6);
			return;
		}
		this.spend(0, cost);
		rival.tradeCd = 32;
		worker.trade = { ...deal };
		worker.tradeTeam = rival.id;
		worker.order = "trade";
		worker.tx = hall.x;
		worker.tz = hall.z;
		worker.node = null;
		worker.target = null;
		worker.selected = true;
		this.banner("A trader walks to " + rival.name, 1.8);
		this.onSfx("move");
	}
	haltSelected() {
		const units = this.selectedUnits();
		if (!units.length) return;
		for (const u of units) {
			u.order = u.type === "worker" ? "hold" : "idle";
			u.target = null;
			u.node = null;
			u.trade = null;
		}
		this.onSfx("click");
	}
	idleWorkers() {
		return this.state.units.filter((u) => u.team === 0 && u.hp > 0 && u.type === "worker" && (u.order === "hold" || u.order === "idle"));
	}
	focusIdleWorker() {
		const idle = this.idleWorkers();
		if (!idle.length) {
			this.banner("Everyone is working. Tap Gatherer to train more.", 2);
			return null;
		}
		this.idleCursor = (this.idleCursor + 1) % idle.length;
		this.clearSelect();
		const u = idle[this.idleCursor];
		u.selected = true;
		this.banner("Idle gatherer", 1.1);
		return u;
	}
	selectTownHall() {
		const hall = this.state.buildings.find((b) => b.team === 0 && b.type === "townhall" && b.hp > 0);
		if (!hall) return null;
		this.clearSelect();
		hall.selected = true;
		this.state.selBld = hall;
		return hall;
	}
	tickEvents(dt) {
		this.tickWeather(dt);
		this.state.eventT -= dt;
		if (this.state.event === "herd" && this.state.eventT <= 0) {
			this.state.event = "none";
			this.state.eventT = 70 + Math.random() * 40;
		} else if (this.state.event === "none" && this.state.eventT <= 0 && this.state.time > 50) {
			if (Math.random() < .34) {
				this.state.event = "herd";
				this.state.eventT = 26;
				this.tribe(0).food += 28;
				this.banner("A herd passes — +28 berries", 2.4);
			} else this.state.eventT = 45 + Math.random() * 35;
		}
	}
	tickWeather(dt) {
		this.state.weatherT -= dt;
		if (this.state.weatherT > 0) return;
		const prev = this.state.weather;
		const cycle = [
			"clear",
			"mist",
			"rain",
			"storm",
			"frost",
			"golden",
			"flood",
			"drought"
		];
		const weights = [
			.22,
			.12,
			.16,
			.1,
			.08,
			.12,
			.1,
			.1
		];
		let roll = Math.random();
		let next = "clear";
		for (let i = 0; i < cycle.length; i++) {
			roll -= weights[i];
			if (roll <= 0) {
				next = cycle[i];
				break;
			}
		}
		if (next === prev) next = next === "clear" ? "mist" : "clear";
		this.state.weather = next;
		this.state.weatherT = next === "flood" || next === "drought" ? 16 + Math.random() * 12 : 28 + Math.random() * 34;
		if (next === "flood") {
			this.world.waterY = this.world.baseWaterY + .55;
			this.rebuildWalk();
		} else if (next === "drought") {
			this.world.waterY = this.world.baseWaterY - .18;
			this.rebuildWalk();
		} else if (prev === "flood" || prev === "drought") {
			this.world.waterY = this.world.baseWaterY;
			this.rebuildWalk();
		}
		this.banner({
			clear: "Skies open over the island",
			mist: "Mist rolls in from the sea",
			rain: "Rain on the pines — berries swell",
			storm: "A storm. Builders wait.",
			frost: "Hard frost. Foraging slows.",
			golden: "Golden light. The island is kind.",
			flood: "The river bursts its banks",
			drought: "The wells run low. Yields falter."
		}[next], 2.2);
	}
	tickRegen(dt) {
		const rain = this.state.weather === "rain" || this.state.weather === "storm";
		const frost = this.state.weather === "frost";
		const drought = this.state.weather === "drought";
		const flood = this.state.weather === "flood";
		const grow = (list) => {
			for (const n of list) {
				if (n.amount > 0) continue;
				let rate = 1;
				if (rain && n.kind !== "stone") rate = 1.25;
				if (frost) rate = .55;
				if (drought && n.kind !== "stone") rate = .42;
				if (flood && n.kind === "forage") rate = .7;
				n.regenT -= dt * rate;
				if (n.regenT <= 0) {
					const base = n.maxAmt || (n.kind === "tree" ? 10 : 8);
					n.amount = Math.max(3, Math.floor(base * (.5 + Math.random() * .35)));
					n.regenT = 0;
				}
			}
		};
		grow(this.state.trees);
		grow(this.state.forage);
		grow(this.state.stones);
	}
	tickPeople(dt) {
		this.state.birthT -= dt;
		if (this.state.birthT <= 0) {
			this.state.birthT = 52 + Math.random() * 28;
			for (const tr of this.state.tribes) {
				if (!tr.alive) continue;
				const pop = this.popNow(tr.id);
				const cap = this.popCap(tr.id);
				if (pop + this.queued(tr.id) >= cap) continue;
				if (tr.food < 36) continue;
				const hall = this.state.buildings.find((b) => b.team === tr.id && b.type === "townhall" && b.hp > 0);
				if (!hall) continue;
				tr.food -= 16;
				const a = Math.random() * Math.PI * 2;
				const u = this.spawnUnit("worker", hall.x + Math.cos(a) * 5.5, hall.z + Math.sin(a) * 5.5, tr.id);
				u.ageT = 0;
				u.order = "idle";
				if (tr.id === 0) {
					this.addFloater(u.x, u.y + 2.2, u.z, "Born", "#c9e8a0");
					this.banner("A child is born", 1.8);
					this.onSfx("train");
				}
			}
		}
		for (const tr of this.state.tribes) {
			if (!tr.alive) continue;
			let upkeep = this.popNow(tr.id) * .028;
			if (this.state.weather === "drought") upkeep *= 1.4;
			if (this.state.weather === "frost") upkeep *= 1.15;
			tr.food = Math.max(0, tr.food - upkeep * dt);
			if (tr.id === 0 && tr.food < 8 && this.state.bannerT <= 0) this.banner("The stores run thin", 2);
		}
		for (const u of this.state.units) {
			if (u.hp <= 0) continue;
			u.ageT += dt;
			const tr = this.tribe(u.team);
			if (!tr) continue;
			const pop = this.popNow(u.team);
			if (tr.food < 3 && pop > 4 && Math.random() < .035 * dt) {
				u.hp -= 8;
				if (u.hp <= 0 && u.team === 0) this.banner("Hunger takes a " + (u.type === "worker" ? "gatherer" : "hunter"), 2);
			}
			const span = u.type === "worker" ? 1860 + u.id % 420 : 2280 + u.id % 360;
			if (u.ageT > span && pop > 4 && Math.random() < .06 * dt) {
				u.hp = 0;
				this.addBurst(u.x, u.y + 1, u.z, "#888", 8);
				if (u.team === 0) {
					this.banner("An elder has passed", 2);
					this.onSfx("death");
				}
			}
		}
	}
	stampVision(x, z, r, level = 2) {
		const n = 80;
		const vis = this.vision;
		const cell = 220 / n;
		const cx = (x + 110) / cell | 0;
		const cz = (z + 110) / cell | 0;
		const cr = Math.ceil(r / cell);
		for (let iz = cz - cr; iz <= cz + cr; iz++) {
			if (iz < 0 || iz >= n) continue;
			for (let ix = cx - cr; ix <= cx + cr; ix++) {
				if (ix < 0 || ix >= n) continue;
				const wx = -110 + (ix + .5) * cell;
				const wz = -110 + (iz + .5) * cell;
				if ((wx - x) ** 2 + (wz - z) ** 2 <= r * r) {
					if (vis[iz * n + ix] < level) vis[iz * n + ix] = level;
				}
			}
		}
	}
	updateVision(dt = 0) {
		const vis = this.vision;
		const age = this.visAge;
		for (let i = 0; i < vis.length; i++) if (vis[i] === 2) vis[i] = 1;
		for (const u of this.state.units) {
			if (u.team !== 0 || u.hp <= 0) continue;
			this.stampVision(u.x, u.z, u.type === "archer" ? 16 : u.type === "worker" ? 11 : 13, 2);
		}
		for (const b of this.state.buildings) {
			if (b.team !== 0 || b.hp <= 0) continue;
			this.stampVision(b.x, b.z, b.type === "watchtower" ? 22 : b.type === "townhall" ? 18 : 12, 2);
		}
		for (let i = 0; i < vis.length; i++) if (vis[i] === 2) age[i] = 0;
		else if (vis[i] === 1) {
			age[i] += dt;
			if (age[i] > 55) {
				vis[i] = 0;
				age[i] = 0;
			}
		}
	}
	enqueueTrain(bld, unitType) {
		if (!bld || bld.hp <= 0) return false;
		const d = UNITS[unitType];
		if (!d || d.from !== bld.type) return false;
		const team = bld.team;
		const tribe = this.tribe(team);
		if (!tribe) return false;
		if (tribe.age < d.age) {
			if (team === 0) this.banner("Requires " + AGES[d.age] + " Age", 1.4);
			return false;
		}
		if (this.popNow(team) + this.queued(team) >= this.popCap(team)) {
			if (team === 0) this.banner("Population cap reached", 1.5);
			this.onSfx("invalid");
			return false;
		}
		const cost = {
			food: d.food,
			wood: d.wood,
			stone: d.stone
		};
		if (!this.canAfford(team, cost)) {
			if (team === 0) this.banner("Not enough resources", 1.3);
			this.onSfx("invalid");
			return false;
		}
		if (bld.queue.length >= 5) return false;
		this.spend(team, cost);
		bld.queue.push({
			unit: unitType,
			t: 0,
			max: d.train
		});
		if (team === 0) this.onSfx("click");
		return true;
	}
	trainSelected(unitType) {
		const prefer = UNITS[unitType].from;
		let bld = this.state.selBld && this.state.selBld.type === prefer && this.state.selBld.hp > 0 ? this.state.selBld : this.state.buildings.find((b) => b.type === prefer && b.team === 0 && b.hp > 0);
		if (bld) this.enqueueTrain(bld, unitType);
	}
	tryAgeUp(team = 0) {
		const tribe = this.tribe(team);
		if (tribe.age >= 5) return;
		const c = AGE_COST[tribe.age + 1];
		if (!c) return;
		if (this.popNow(team) < (c.pop || 0)) {
			if (team === 0) this.banner("Need " + c.pop + " people — tap Gatherer", 1.8);
			return;
		}
		if (!this.canAfford(team, c)) {
			if (team === 0) this.banner("Not enough resources", 1.4);
			return;
		}
		if (team === 0) {
			this.state.pendingAge = true;
			this.banner("Choose a path into the " + AGES[tribe.age + 1] + " Age", 2.2);
			return;
		}
		this.commitAge(team, Math.random() < (tribe.aggro || .4) ? "army" : "econ");
	}
	commitAge(team, pick) {
		const tribe = this.tribe(team);
		if (tribe.age >= 5) return;
		const c = AGE_COST[tribe.age + 1];
		if (!c || !this.canAfford(team, c)) return;
		this.spend(team, c);
		tribe.age++;
		if (team === 0) {
			this.state.age = tribe.age;
			this.state.agePicks.push(pick);
			this.state.pendingAge = false;
		}
		const mul = AGE_STAT[tribe.age] / AGE_STAT[tribe.age - 1];
		const extraHp = pick === "army" ? 1.12 : 1;
		for (const u of this.state.units) {
			if (u.team !== team) continue;
			u.maxHp = Math.round(u.maxHp * mul * extraHp);
			u.hp = Math.min(u.maxHp, Math.round(u.hp * mul * extraHp));
			u.dmg *= mul * (pick === "army" ? 1.1 : 1);
		}
		if (team === 0 && pick === "army" && tribe.age === 3) {
			const hall = this.state.buildings.find((b) => b.team === 0 && b.type === "townhall" && b.hp > 0);
			if (hall && !this.hasBld(0, "watchtower")) {
				const spot = this.findOpenSpot(hall.x, hall.z, "watchtower", 0);
				if (spot) this.placeBuilding("watchtower", spot.x, spot.z, 0);
			}
		}
		if (team === 0 && pick === "army" && tribe.age === 5) {
			const hall = this.state.buildings.find((b) => b.team === 0 && b.type === "townhall" && b.hp > 0);
			if (hall) {
				this.spawnUnit("spearman", hall.x + 3, hall.z - 4, 0);
				this.spawnUnit("spearman", hall.x - 3, hall.z - 4, 0);
			}
		}
		if (team === 0) {
			this.onSfx("age");
			this.banner(AGES[tribe.age] + " Age · " + AGE_CHOICES[tribe.age - 1][pick].name, 2.8);
		}
		this.checkVictory();
	}
	nearestDrop(x, z, team) {
		let best = null;
		let bd = 0xe8d4a51000;
		for (const b of this.state.buildings) {
			if (b.hp <= 0 || b.team !== team) continue;
			if (b.type !== "townhall" && b.type !== "warehouse") continue;
			const d = (b.x - x) ** 2 + (b.z - z) ** 2;
			if (d < bd) {
				bd = d;
				best = b;
			}
		}
		return best;
	}
	resKind(node) {
		if (!node) return null;
		if (node.kind === "building") return node.type === "farm" ? "food" : null;
		if (node.kind === "tree") return "wood";
		if (node.kind === "stone") return "stone";
		if (node.kind === "forage" || node.kind === "farm") return "food";
		return null;
	}
	findNode(u, job) {
		let best = null;
		let bd = 0xe8d4a51000;
		const consider = (n, x, z, extra = 0) => {
			const d = (x - u.x) ** 2 + (z - u.z) ** 2 + extra;
			if (d < bd) {
				bd = d;
				best = n;
			}
		};
		if (job === "food") {
			for (const b of this.state.buildings) if (b.hp > 0 && b.team === u.team && b.type === "farm") consider(b, b.x, b.z, -40);
			for (const n of this.state.forage) if (n.amount > 0) consider(n, n.x, n.z);
		} else if (job === "wood") {
			for (const n of this.state.trees) if (n.amount > 0) consider(n, n.x, n.z);
		} else for (const n of this.state.stones) if (n.amount > 0) consider(n, n.x, n.z);
		return best;
	}
	pickJob(u) {
		if (u.jobLock && u.job) return u.job;
		const t = this.tribe(u.team);
		if (!t) return "food";
		let nFood = 0, nWood = 0, nStone = 0;
		for (const o of this.state.units) {
			if (o.team !== u.team || o.hp <= 0 || o.type !== "worker" || o.id === u.id) continue;
			if (o.job === "food") nFood++;
			else if (o.job === "wood") nWood++;
			else if (o.job === "stone") nStone++;
		}
		const scores = [
			["food", 100 - t.food - nFood * 22],
			["wood", 90 - t.wood - nWood * 18],
			["stone", 48 - t.stone * .85 - nStone * 20]
		];
		scores.sort((a, b) => b[1] - a[1]);
		for (const [k] of scores) if (this.findNode(u, k)) return k;
		return "food";
	}
	campBonus(u, job) {
		let m = this.gatherMul(u.team);
		const want = job === "wood" ? "lumber" : job === "stone" ? "quarry" : null;
		if (want) {
			for (const b of this.state.buildings) if (b.hp > 0 && b.team === u.team && b.type === want && Math.hypot(b.x - u.x, b.z - u.z) < 16) {
				m *= GATHER[job].campBonus;
				break;
			}
		}
		if (this.state.weather === "rain" && job === "food") m *= .82;
		if (this.state.weather === "rain" && job === "wood") m *= 1.16;
		if (this.state.weather === "frost" && job === "food") m *= 1.2;
		if (this.state.weather === "drought" && job === "food") m *= 1.28;
		if (this.state.weather === "flood" && job === "food") m *= 1.22;
		return m;
	}
	steer(u, dt) {
		const dx = u.tx - u.x;
		const dz = u.tz - u.z;
		const dist = Math.hypot(dx, dz);
		if (dist < .5) {
			u.wanderT = 0;
			return true;
		}
		const wet = this.height(u.x, u.z) < this.world.waterY + .28;
		const sp = u.speed * (wet ? .48 : 1) * dt;
		const step = Math.min(sp, dist);
		let nx = u.x + dx / dist * step;
		let nz = u.z + dz / dist * step;
		if (!this.canStep(u, nx, nz)) {
			const base = Math.atan2(dx, dz);
			let found = false;
			for (const off of [
				.6,
				-.6,
				1.15,
				-1.15,
				1.7,
				-1.7,
				2.2,
				-2.2
			]) {
				const a = base + off;
				const tx = u.x + Math.sin(a) * step;
				const tz = u.z + Math.cos(a) * step;
				if (this.canStep(u, tx, tz)) {
					nx = tx;
					nz = tz;
					found = true;
					break;
				}
			}
			if (!found) {
				u.wanderT += dt;
				if (u.wanderT > .7) {
					u.wanderT = 0;
					const a = Math.random() * Math.PI * 2;
					const tx = u.x + Math.sin(a) * 1.6;
					const tz = u.z + Math.cos(a) * 1.6;
					if (this.canStep(u, tx, tz)) {
						u.x = tx;
						u.z = tz;
						u.y = this.height(tx, tz);
					}
				}
				return false;
			}
		} else u.wanderT = Math.max(0, u.wanderT - dt);
		u.x = nx;
		u.z = nz;
		u.y = this.height(nx, nz);
		u.facing = Math.atan2(dx, dz);
		u.vx = dx / dist * u.speed;
		u.vz = dz / dist * u.speed;
		u.stride += step * 3.6;
		return false;
	}
	separate(dt) {
		const us = this.state.units;
		for (let i = 0; i < us.length; i++) {
			const a = us[i];
			if (a.hp <= 0) continue;
			for (let j = i + 1; j < us.length; j++) {
				const b = us[j];
				if (b.hp <= 0) continue;
				const dx = a.x - b.x;
				const dz = a.z - b.z;
				const min = a.r + b.r;
				const d2 = dx * dx + dz * dz;
				if (d2 > 1e-4 && d2 < min * min) {
					const d = Math.sqrt(d2);
					const push = (min - d) / 2 * dt * 8;
					const nx = dx / d;
					const nz = dz / d;
					a.x += nx * push;
					a.z += nz * push;
					b.x -= nx * push;
					b.z -= nz * push;
				}
			}
		}
	}
	workerAI(u, dt) {
		if (u.order === "hold") return;
		if (u.order === "trade") {
			this.tradeAI(u, dt);
			return;
		}
		if (u.order === "move") {
			if (this.steer(u, dt)) u.order = "idle";
			return;
		}
		if (u.order === "attack" || u.order === "attackmove") {
			this.combatAI(u, dt);
			return;
		}
		if (u.order === "explore") {
			this.exploreAI(u, dt);
			return;
		}
		if (u.order === "idle") {
			const job = this.pickJob(u);
			u.job = job;
			const node = this.findNode(u, job);
			if (node) {
				u.node = node;
				u.order = "gather";
				u.tx = node.x;
				u.tz = node.z;
			}
			return;
		}
		if (u.order === "gather") {
			const node = u.node;
			if (!node || "amount" in node && node.amount <= 0 || "hp" in node && node.hp <= 0) {
				u.order = "idle";
				u.node = null;
				return;
			}
			const reach = "w" in node ? Math.max(node.w, node.d) * .5 + .8 : 1.4;
			if (Math.hypot(u.x - node.x, u.z - node.z) > reach) {
				u.tx = node.x;
				u.tz = node.z;
				this.steer(u, dt);
				return;
			}
			const t = this.resKind(node) || u.job || "food";
			const g = GATHER[t];
			const period = g.period * this.campBonus(u, t);
			u.gatherT += dt;
			u.stride += dt * 9;
			u.facing = Math.atan2(node.x - u.x, node.z - u.z);
			if (u.gatherT >= period) {
				u.gatherT = 0;
				const rich = "rich" in node ? node.rich ?? 1 : 1;
				let gained = 1;
				const roll = Math.random();
				if (roll < .11) gained = 0;
				else if (roll > .92) gained = 1 + (rich > 1.05 || Math.random() < rich - .7 ? 1 : 0);
				if (gained <= 0) {
					if (u.team === 0) this.addFloater(u.x, u.y + 1.8, u.z, "thin", "#b8a888");
				} else {
					u.carry += gained;
					u.carryType = t;
					if (u.team === 0 && gained > 1) this.addFloater(u.x, u.y + 1.8, u.z, "+" + gained, "#efe4b0");
				}
				if ("amount" in node) {
					node.amount--;
					if (node.amount <= 0) {
						node.amount = 0;
						node.regenT = node.kind === "tree" ? 170 + Math.random() * 80 : node.kind === "forage" ? 70 + Math.random() * 50 : 190 + Math.random() * 80;
						this.addBurst(node.x, u.y + 1, node.z, t === "wood" ? "#3a5a28" : "#888", 6);
					}
				}
				if (u.carry >= g.carry || "amount" in node && node.amount <= 0) {
					const drop = this.nearestDrop(u.x, u.z, u.team);
					if (drop) {
						u.order = "return";
						u.tx = drop.x;
						u.tz = drop.z;
					} else u.order = "idle";
				}
			}
			return;
		}
		if (u.order === "return") {
			const drop = this.nearestDrop(u.x, u.z, u.team);
			if (!drop) {
				u.order = "idle";
				return;
			}
			u.tx = drop.x;
			u.tz = drop.z;
			if (Math.hypot(u.x - drop.x, u.z - drop.z) > Math.max(drop.w, drop.d) * .55 + 1.4) {
				this.steer(u, dt);
				return;
			}
			if (u.carry > 0 && u.carryType) {
				const tr = this.tribe(u.team);
				tr[u.carryType] += u.carry;
				if (u.team === 0) this.addFloater(drop.x, drop.y + 3, drop.z, "+" + u.carry, "#efe4b0");
				u.carry = 0;
				u.carryType = null;
			}
			const node = this.findNode(u, u.jobLock && u.job ? u.job : this.pickJob(u));
			if (node) {
				if (!u.jobLock) u.job = this.resKind(node) || u.job;
				u.node = node;
				u.order = "gather";
				u.tx = node.x;
				u.tz = node.z;
			} else u.order = "idle";
		}
	}
	tradeAI(u, dt) {
		const deal = u.trade;
		if (!deal) {
			u.order = "idle";
			return;
		}
		const rival = (u.tradeTeam ? this.tribe(u.tradeTeam) : null) || this.pickTradeRival();
		const hall = rival ? this.state.buildings.find((b) => b.team === rival.id && b.type === "townhall" && b.hp > 0) : null;
		if (!rival || !hall || rival.hostile) {
			this.tribe(0)[deal.give] += deal.giveAmt;
			u.trade = null;
			u.tradeTeam = 0;
			u.order = "idle";
			this.banner(rival?.hostile ? "Trade called off" : "The traders turn back", 1.6);
			return;
		}
		u.tx = hall.x;
		u.tz = hall.z;
		if (Math.hypot(u.x - hall.x, u.z - hall.z) > Math.max(hall.w, hall.d) * .55 + 1.6) {
			this.steer(u, dt);
			return;
		}
		const tr = this.tribe(0);
		tr[deal.get] += deal.getAmt;
		this.addFloater(u.x, u.y + 2.4, u.z, "+" + deal.getAmt, "#efe4b0");
		this.banner("Traded with " + rival.name, 1.8);
		u.trade = null;
		u.tradeTeam = 0;
		const drop = this.nearestDrop(u.x, u.z, 0);
		if (drop) {
			u.order = "return";
			u.tx = drop.x;
			u.tz = drop.z;
		} else u.order = "idle";
		this.onSfx("place");
	}
	acquireTarget(u, radius) {
		let best = null;
		let bd = radius * radius;
		for (const o of this.state.units) {
			if (o.hp <= 0 || o.team === u.team) continue;
			const d = (o.x - u.x) ** 2 + (o.z - u.z) ** 2;
			if (d < bd) {
				bd = d;
				best = o;
			}
		}
		if (u.team !== 0 || u.order === "attack") for (const b of this.state.buildings) {
			if (b.hp <= 0 || b.team === u.team) continue;
			const d = (b.x - u.x) ** 2 + (b.z - u.z) ** 2;
			if (d < bd) {
				bd = d;
				best = b;
			}
		}
		return best;
	}
	dealDamage(attacker, target) {
		if (!target || target.hp <= 0) return;
		const dmg = ("dmg" in attacker ? attacker.dmg : 8) * this.dmgMul(attacker.team);
		target.hp -= dmg;
		this.addBurst(target.x, ("y" in target ? target.y : 0) + 1, target.z, "#c44", 3);
		if (attacker.team === 0 || target.team === 0) this.onSfx("hit");
		if (attacker.team === 0 && target.team !== 0 && this.isArmed(attacker)) this.makeHostile(target.team);
		if (target.team === 0 && attacker.team !== 0 && this.isArmed(target)) this.makeHostile(attacker.team);
		if (target.hp <= 0) {
			target.hp = 0;
			this.addBurst(target.x, target.y + 1, target.z, target.team === 0 ? "#888" : "#6a3030", 12);
			this.addFloater(target.x, target.y + 2.4, target.z, target.kind === "building" ? "Destroyed" : "Fallen", "#c44");
			if (target.kind === "building") this.state.walkDirty = true;
			if (target.kind === "unit") {
				for (const u of this.state.units) if (u.target === target) {
					u.target = null;
					if (u.order === "attack") u.order = "idle";
				}
			}
			if (target.team === 0 || attacker.team === 0) this.onSfx("death");
		}
	}
	fireArrow(from, to) {
		const p = {
			x: from.x,
			y: from.y + 1.4,
			z: from.z,
			tx: to.x,
			ty: to.y + 1,
			tz: to.z,
			target: to,
			speed: 22,
			life: 1.1,
			dmg: ("dmg" in from ? from.dmg : 8) * this.dmgMul(from.team),
			team: from.team
		};
		this.state.projectiles.push(p);
		if (this.state.projectiles.length > 48) this.state.projectiles.splice(0, this.state.projectiles.length - 48);
	}
	combatAI(u, dt) {
		u.cd = Math.max(0, u.cd - dt);
		if (u.order === "hold") return;
		if (u.order === "move") {
			if (this.steer(u, dt)) u.order = "idle";
			return;
		}
		if (u.order === "attackmove") {
			const t = this.acquireTarget(u, 16) || (u.target && u.target.hp > 0 ? u.target : null);
			if (t) {
				u.target = t;
				u.order = "attack";
			} else if (this.steer(u, dt)) u.order = "idle";
		}
		if (u.order === "idle") {
			const t = this.acquireTarget(u, u.type === "archer" ? 13 : 7);
			if (t) {
				const foe = this.tribe(t.team);
				if (!(u.team === 0 && foe && !foe.hostile)) {
					u.target = t;
					u.order = "attack";
				}
			}
			return;
		}
		if (u.order === "attack") {
			const t = u.target;
			if (!t || t.hp <= 0) {
				u.target = null;
				u.order = "idle";
				return;
			}
			u.tx = t.x;
			u.tz = t.z;
			if (Math.hypot(u.x - t.x, u.z - t.z) > u.range + (t.kind === "building" ? Math.max(t.w, t.d) * .55 : t.r + .35)) this.steer(u, dt);
			else {
				u.facing = Math.atan2(t.x - u.x, t.z - u.z);
				u.stride += dt * 10;
				if (u.cd <= 0) {
					u.cd = u.rof;
					if (u.type === "archer") this.fireArrow(u, t);
					else this.dealDamage(u, t);
				}
			}
		}
	}
	barbarianAI(u, dt) {
		u.wanderT -= dt;
		u.aggroT -= dt;
		if (u.order === "hold") return;
		if (u.order === "attack" && u.target && u.target.hp > 0) {
			this.combatAI(u, dt);
			return;
		}
		const tr = this.tribe(u.team);
		const hall = this.state.buildings.find((b) => b.team === u.team && b.type === "townhall" && b.hp > 0);
		let near = null;
		if (tr.hostile) near = this.acquireTarget(u, 12);
		else if (hall) {
			if (Math.hypot(u.x - hall.x, u.z - hall.z) < 16) {
				near = this.acquireTarget(u, 10);
				if (near && near.kind === "unit" && (near.type === "worker" || near.order === "trade")) near = null;
				if (near && Math.hypot(near.x - hall.x, near.z - hall.z) > 18) near = null;
			}
		}
		if (near) {
			u.target = near;
			u.order = "attack";
			this.combatAI(u, dt);
			return;
		}
		if (u.order === "attackmove" || u.order === "move") {
			this.combatAI(u, dt);
			return;
		}
		if (u.wanderT <= 0 || Math.hypot(u.x - u.tx, u.z - u.tz) < .8) {
			u.wanderT = 2.5 + Math.random() * 4;
			const hall = this.state.buildings.find((b) => b.team === u.team && b.type === "townhall" && b.hp > 0);
			const cx = hall ? hall.x : u.x;
			const cz = hall ? hall.z : u.z;
			const a = Math.random() * Math.PI * 2;
			const r = 4 + Math.random() * 9;
			u.tx = cx + Math.cos(a) * r;
			u.tz = cz + Math.sin(a) * r;
			u.order = "move";
		}
		this.steer(u, dt);
	}
	updateProjectiles(dt) {
		const ps = this.state.projectiles;
		for (let i = ps.length - 1; i >= 0; i--) {
			const p = ps[i];
			p.life -= dt;
			const t = p.target;
			const gx = t && t.hp > 0 ? t.x : p.tx;
			const gy = t && t.hp > 0 ? t.y + 1 : p.ty;
			const gz = t && t.hp > 0 ? t.z : p.tz;
			const d = Math.hypot(p.x - gx, p.y - gy, p.z - gz);
			if (d < .7 || p.life <= 0) {
				if (t && t.hp > 0) {
					t.hp -= p.dmg;
					this.addBurst(t.x, t.y + 1, t.z, "#c44", 2);
					if (t.hp <= 0) {
						t.hp = 0;
						this.addBurst(t.x, t.y + 1, t.z, "#6a3030", 10);
						if (t.kind === "building") this.state.walkDirty = true;
					}
					if (p.team === 0 && t.team !== 0) this.makeHostile(t.team);
					if (p.team !== 0 && t.team === 0 && (t.kind === "building" || t.type !== "worker")) this.makeHostile(p.team);
				}
				ps.splice(i, 1);
				continue;
			}
			const sp = p.speed * dt;
			p.x += (gx - p.x) / d * sp;
			p.y += (gy - p.y) / d * sp;
			p.z += (gz - p.z) / d * sp;
		}
	}
	updateTraining(dt) {
		for (const b of this.state.buildings) {
			if (b.hp <= 0 || !b.queue.length) continue;
			const q = b.queue[0];
			q.t += dt;
			if (q.t >= q.max) {
				b.queue.shift();
				if (this.popNow(b.team) >= this.popCap(b.team)) {
					const d = UNITS[q.unit];
					const tr = this.tribe(b.team);
					if (tr) {
						tr.food += d.food;
						tr.wood += d.wood;
						tr.stone += d.stone;
					}
					continue;
				}
				const a = Math.random() * Math.PI * 2;
				const off = Math.max(b.w, b.d) * .6 + 1.2;
				const u = this.spawnUnit(q.unit, b.x + Math.cos(a) * off, b.z + Math.sin(a) * off, b.team);
				if (b.rally) {
					u.tx = b.rally.x;
					u.tz = b.rally.z;
					u.order = "move";
				} else if (q.unit === "worker") u.order = "idle";
				if (b.team === 0) {
					this.onSfx("train");
					this.addFloater(u.x, u.y + 2, u.z, UNITS[q.unit].name, "#c9e8a0");
				}
			}
		}
	}
	updateTowers(dt) {
		for (const b of this.state.buildings) {
			if (b.type !== "watchtower" || b.hp <= 0) continue;
			b.cd -= dt;
			if (b.cd > 0) continue;
			let best = null;
			let bd = 256;
			for (const u of this.state.units) {
				if (u.hp <= 0 || u.team === b.team) continue;
				if (b.team !== 0 && !this.tribe(b.team)?.hostile) {
					if (u.type === "worker" || u.order === "trade") continue;
					const hall = this.state.buildings.find((h) => h.team === b.team && h.type === "townhall" && h.hp > 0);
					if (hall && Math.hypot(u.x - hall.x, u.z - hall.z) > 16) continue;
				}
				const d = (u.x - b.x) ** 2 + (u.z - b.z) ** 2;
				if (d < bd) {
					bd = d;
					best = u;
				}
			}
			if (best) {
				b.cd = 1.15;
				this.fireArrow(b, best);
			}
		}
	}
	findOpenSpot(cx, cz, type, team) {
		if (type === "quarry") for (const s of this.state.stones) {
			if (s.amount <= 0) continue;
			for (let i = 0; i < 8; i++) {
				const a = i / 8 * Math.PI * 2;
				const x = Math.round((s.x + Math.cos(a) * 4.2) / 2) * 2;
				const z = Math.round((s.z + Math.sin(a) * 4.2) / 2) * 2;
				if (this.placementValid(type, x, z, team)) return {
					x,
					z
				};
			}
		}
		if (type === "lumber") for (const t of this.state.trees) {
			if (t.amount <= 0) continue;
			for (let i = 0; i < 6; i++) {
				const a = Math.random() * Math.PI * 2;
				const x = Math.round((t.x + Math.cos(a) * 6) / 2) * 2;
				const z = Math.round((t.z + Math.sin(a) * 6) / 2) * 2;
				if (this.placementValid(type, x, z, team) && Math.hypot(x - cx, z - cz) < 36) return {
					x,
					z
				};
			}
		}
		const maxR = type === "farm" ? 44 : 28;
		for (let r = 6; r < maxR; r += 2) for (let i = 0; i < 12; i++) {
			const a = Math.random() * Math.PI * 2;
			const x = cx + Math.cos(a) * r;
			const z = cz + Math.sin(a) * r;
			const sx = Math.round(x / 2) * 2;
			const sz = Math.round(z / 2) * 2;
			if (this.placementValid(type, sx, sz, team)) return {
				x: sx,
				z: sz
			};
		}
		return null;
	}
	rivalTick(team, dt) {
		const tr = this.tribe(team);
		if (!tr || !tr.alive) return;
		const hall = this.state.buildings.find((b) => b.team === team && b.type === "townhall" && b.hp > 0);
		if (!hall) {
			tr.alive = false;
			if (this.started) this.banner(tr.name + " has fallen", 2.2);
			return;
		}
		tr.thinkT -= dt;
		if (tr.thinkT > 0) return;
		tr.thinkT = 1.6 + Math.random();
		const costScale = 1.25;
		const pop = this.popNow(team);
		const cap = this.popCap(team);
		const stage = !tr.hostile && this.state.time < 90 && tr.age < 1 ? 1 : tr.hostile && (tr.age >= 2 || this.state.time > 110) ? 3 : 2;
		if (tr.age < 5 && pop >= (AGE_COST[tr.age + 1]?.pop || 0) * .9) {
			const c = AGE_COST[tr.age + 1];
			if (c && tr.food > (c.food || 0) * costScale && tr.wood > (c.wood || 0) * costScale && Math.random() < tr.tech + .2) this.tryAgeUp(team);
		}
		if (pop + this.queued(team) < cap && tr.food >= 50) {
			const th = hall;
			if (th.queue.length < 2 && Math.random() < .55) this.enqueueTrain(th, "worker");
		}
		if (cap - pop < 3 && tr.wood >= 40 && Math.random() < tr.expand) {
			const spot = this.findOpenSpot(hall.x, hall.z, "hut", team);
			if (spot) this.placeBuilding("hut", spot.x, spot.z, team);
		}
		if (this.state.buildings.filter((b) => b.team === team && b.type === "farm" && b.hp > 0).length < 1 + tr.age && tr.wood >= 50 && Math.random() < .5) {
			const spot = this.findOpenSpot(hall.x, hall.z, "farm", team);
			if (spot) this.placeBuilding("farm", spot.x, spot.z, team);
		}
		if (!this.hasBld(team, "lumber") && tr.wood >= 45 && Math.random() < .4) {
			const spot = this.findOpenSpot(hall.x, hall.z, "lumber", team);
			if (spot) this.placeBuilding("lumber", spot.x, spot.z, team);
		}
		if (tr.age >= 1 && !this.hasBld(team, "quarry") && tr.wood >= 50 && tr.stone >= 10 && Math.random() < .35) {
			const spot = this.findOpenSpot(hall.x, hall.z, "quarry", team);
			if (spot) this.placeBuilding("quarry", spot.x, spot.z, team);
		}
		if (tr.food < 10 && pop > 3 && Math.random() < .4) {
			const huts = this.state.buildings.filter((b) => b.team === team && b.type === "hut" && b.hp > 0);
			if (huts.length > 1) {
				huts[huts.length - 1].hp = 0;
				if (this.state.time > 40) this.banner(tr.name + " abandons a hut", 1.8);
			}
		}
		if (tr.food < 4 && pop > 4 && Math.random() < .45) {
			const w = this.state.units.find((u) => u.team === team && u.type === "worker" && u.hp > 0);
			if (w) {
				w.hp = 0;
				this.addBurst(w.x, w.y + 1, w.z, "#888", 6);
			}
		}
		if (tr.food > 90 && tr.wood > 70 && cap - pop < 2 && Math.random() < tr.expand + .15) {
			const spot = this.findOpenSpot(hall.x, hall.z, "hut", team);
			if (spot) this.placeBuilding("hut", spot.x, spot.z, team);
		}
		if (stage >= 2 && tr.age >= 1 && !this.hasBld(team, "barracks") && tr.wood >= 80 && tr.stone >= 40) {
			const spot = this.findOpenSpot(hall.x, hall.z, "barracks", team);
			if (spot) this.placeBuilding("barracks", spot.x, spot.z, team);
		}
		const bar = this.state.buildings.find((b) => b.team === team && b.type === "barracks" && b.hp > 0);
		if (stage >= 2 && bar && bar.queue.length < 2) {
			if (this.state.units.filter((u) => u.team === team && u.type !== "worker" && u.hp > 0).length < 3 + tr.age * 2) {
				let kind = "spearman";
				if (team === 2 && tr.age >= 1) kind = Math.random() < .7 ? "archer" : "spearman";
				else if (tr.age >= 2 && Math.random() < .45) kind = "swordsman";
				else if (tr.age >= 1 && Math.random() < .4) kind = "archer";
				if (tr.age >= 4 && this.hasBld(team, "stables") && Math.random() < .35) {
					const st = this.state.buildings.find((b) => b.team === team && b.type === "stables" && b.hp > 0);
					if (st) this.enqueueTrain(st, "cavalry");
				} else this.enqueueTrain(bar, kind);
			}
		}
		tr.lastRaid -= dt;
		if (stage >= 3 && tr.hostile && this.state.time > 80 && tr.lastRaid <= 0 && Math.random() < tr.aggro * .18) {
			tr.lastRaid = 70;
			const mil = this.state.units.filter((u) => u.team === team && u.type !== "worker" && u.hp > 0 && u.order !== "attack");
			if (mil.length >= 2) {
				const targets = this.state.buildings.filter((b) => b.team === 0 && b.hp > 0);
				if (targets.length) {
					const t = targets[Math.random() * targets.length | 0];
					for (const u of mil.slice(0, 2 + tr.age)) {
						u.tx = t.x;
						u.tz = t.z;
						u.order = "attackmove";
						u.target = t;
					}
				}
			}
		}
	}
	checkVictory() {
		if (this.state.ended) return;
		const th = this.state.buildings.find((b) => b.type === "townhall" && b.team === 0);
		if (!th || th.hp <= 0) {
			this.state.ended = "lose";
			this.state.endReason = "The Town Hall has fallen.";
			this.onSfx("lose");
			return;
		}
		const rivalsAlive = this.state.tribes.filter((t) => t.id !== 0 && t.alive).length;
		if (this.tribe(0).age >= 5 && this.popNow(0) >= 24) {
			this.state.ended = "win";
			this.state.endReason = "A Renaissance realm of twenty-four souls stands.";
			this.onSfx("win");
			return;
		}
		if (rivalsAlive === 0) {
			this.state.ended = "win";
			this.state.endReason = "The valley's rival tribes have been driven out.";
			this.onSfx("win");
		}
	}
	currentObjective() {
		const count = (type) => this.state.buildings.filter((b) => b.type === type && b.team === 0 && b.hp > 0).length;
		if (this.popNow(0) < 6) return "Train Gatherers — tap Gatherer (50 berries) or the People count";
		if (count("farm") < 1) return "Build a Farm  " + count("farm") + "/1";
		if (count("lumber") < 1) return "Build a Lumber Camp  " + count("lumber") + "/1";
		if (this.tribe(0).age < 1) return "Advance to the Bronze Age — you'll pick a bonus";
		if (count("barracks") < 1) return "Raise a Barracks, then train hunters";
		if (this.state.units.filter((u) => u.type === "spearman" && u.team === 0 && u.hp > 0).length < 2) return "Train hunters, then right-click an enemy or Strike";
		if (this.tribe(0).age < 2) return "Advance to the Iron Age";
		if (this.tribe(0).age < 3) return "Reach the Classical Age";
		if (this.tribe(0).age < 4) return "Reach the Medieval Age";
		if (this.tribe(0).age < 5) return "Found the Renaissance";
		const pop = this.popNow(0);
		if (pop < 24) return "Grow the realm  " + pop + "/24";
		return "The island is yours";
	}
	clockState() {
		const t = 24120 + this.state.time * 10;
		const day = 1 + Math.floor(t / 86400);
		const tod = (t % 86400 + 86400) % 86400;
		const h = Math.floor(tod / 3600);
		const m = Math.floor(tod % 3600 / 60);
		const hh = (h < 10 ? "0" : "") + h;
		const mm = (m < 10 ? "0" : "") + m;
		let period = "Night";
		if (h >= 5 && h < 8) period = "Dawn";
		else if (h >= 8 && h < 12) period = "Morning";
		else if (h >= 12 && h < 17) period = "Afternoon";
		else if (h >= 17 && h < 20) period = "Dusk";
		const names = {
			clear: "Clear",
			mist: "Sea mist",
			rain: "Rain",
			storm: "Storm",
			frost: "Hard frost",
			golden: "Golden haze",
			flood: "Flood",
			drought: "Drought"
		};
		const temps = {
			clear: 17,
			mist: 11,
			rain: 12,
			storm: 8,
			frost: 3,
			golden: 16,
			flood: 13,
			drought: 22
		};
		let weather = names[this.state.weather] || "Clear";
		let temp = temps[this.state.weather] ?? 14;
		if (h < 6 || h > 21) temp -= 3;
		if (this.state.event === "herd") weather = "Migrating herd";
		return {
			day,
			time: hh + ":" + mm,
			period,
			weather: weather + " · " + temp + "°C"
		};
	}
	dayPhase() {
		return ((24120 + this.state.time * 10) % 86400 + 86400) % 86400 / 86400;
	}
	step(dt) {
		if (!this.started) return;
		const sdt = this.state.paused || this.state.ended ? 0 : Math.min(dt, .05) * this.state.speed;
		if (this.state.walkDirty) this.rebuildWalk();
		if (sdt > 0) try {
			this.state.time += sdt;
			for (const tr of this.state.tribes) if (tr.tradeCd > 0) tr.tradeCd = Math.max(0, tr.tradeCd - sdt);
			for (const u of this.state.units) {
				if (u.hp <= 0) continue;
				u.vx = 0;
				u.vz = 0;
				try {
					if (u.team !== 0 && u.type === "worker") this.workerAI(u, sdt);
					else if (u.team !== 0) this.barbarianAI(u, sdt);
					else if (u.type === "worker") {
						if (u.order === "attack" || u.order === "attackmove") this.combatAI(u, sdt);
						else this.workerAI(u, sdt);
					} else this.combatAI(u, sdt);
				} catch {}
			}
			this.separate(sdt);
			this.updateProjectiles(sdt);
			this.updateTraining(sdt);
			this.updateTowers(sdt);
			this.tickEvents(sdt);
			this.tickRegen(sdt);
			this.tickPeople(sdt);
			this.updateVision(sdt);
			for (let i = 1; i < this.state.tribes.length; i++) this.rivalTick(i, sdt);
			this.state.units = this.state.units.filter((u) => u.hp > 0);
			this.checkVictory();
		} catch (err) {
			console.error(err);
		}
		const vdt = Math.min(dt, .05);
		for (let i = this.state.particles.length - 1; i >= 0; i--) {
			const p = this.state.particles[i];
			p.life -= vdt;
			p.x += p.vx * vdt;
			p.y += p.vy * vdt;
			p.z += p.vz * vdt;
			p.vy -= 8 * vdt;
			if (p.life <= 0) this.state.particles.splice(i, 1);
		}
		for (let i = this.state.floaters.length - 1; i >= 0; i--) {
			const f = this.state.floaters[i];
			f.life -= vdt;
			f.y += 1.2 * vdt;
			if (f.life <= 0) this.state.floaters.splice(i, 1);
		}
		if (this.state.bannerT > 0) {
			this.state.bannerT -= vdt;
			if (this.state.bannerT <= 0) this.state.banner = "";
		}
	}
	entityAt(x, z) {
		let bestU = null;
		let bd = 2;
		for (const u of this.state.units) {
			if (u.hp <= 0) continue;
			const d = Math.hypot(u.x - x, u.z - z);
			if (d < bd) {
				bd = d;
				bestU = u;
			}
		}
		for (const b of this.state.buildings) {
			if (b.hp <= 0) continue;
			if (Math.abs(b.x - x) < b.w * .55 && Math.abs(b.z - z) < b.d * .55) return bestU && bd < 1.2 ? bestU : b;
		}
		return bestU;
	}
	snapshot() {
		const t = this.tribe(0) || {
			food: 0,
			wood: 0,
			stone: 0,
			age: 0,
			name: "",
			color: "",
			alive: true,
			id: 0,
			short: "",
			aggro: 0,
			expand: 0,
			tech: 0,
			lastRaid: 0,
			thinkT: 0,
			hostile: false,
			tradeCd: 0
		};
		const ck = this.clockState();
		const units = this.selectedUnits();
		let selection = {
			name: "No selection",
			info: "Click a person or building",
			hp: 0,
			maxHp: 1,
			kind: "none"
		};
		if (units.length > 1) selection = {
			name: units.length + " people",
			info: units.map((u) => UNITS[u.type]?.name || u.type).join(", "),
			hp: units.reduce((s, u) => s + u.hp, 0),
			maxHp: units.reduce((s, u) => s + u.maxHp, 0),
			kind: "units",
			type: units[0].type,
			team: 0,
			job: units.find((u) => u.type === "worker")?.order === "hold" ? "hold" : units.find((u) => u.type === "worker")?.job ?? null
		};
		else if (units.length === 1) {
			const u = units[0];
			const info = u.order === "gather" ? "Gathering " + (u.job === "food" ? "berries" : u.job || "") : u.order === "return" ? "Returning" : u.order === "attack" ? "Attacking" : u.order === "move" ? "Moving" : u.order === "attackmove" ? "Advance" : u.order === "trade" ? "Trading" : u.order === "explore" ? "Exploring" : u.order === "hold" ? "Resting" : u.type === "worker" ? "Working" : "Ready — right-click to fight";
			const cap = u.carryType ? GATHER[u.carryType].carry : 8;
			selection = {
				name: UNITS[u.type]?.name || u.type,
				info,
				hp: u.hp,
				maxHp: u.maxHp,
				kind: "unit",
				type: u.type,
				team: u.team,
				carry: u.carry > 0 && u.carryType ? u.carryType + " " + u.carry + "/" + cap : "",
				job: u.order === "hold" ? "hold" : u.job
			};
		} else if (this.state.selBld && this.state.selBld.hp > 0) {
			const b = this.state.selBld;
			let info = BUILDINGS[b.type]?.hint || "";
			if (b.queue.length) {
				const q = b.queue[0];
				info += " · " + (UNITS[q.unit]?.name || q.unit) + " " + Math.ceil(q.max - q.t) + "s";
				if (b.queue.length > 1) info += " (+" + (b.queue.length - 1) + ")";
			}
			selection = {
				name: BUILDINGS[b.type]?.name || b.type,
				info,
				hp: b.hp,
				maxHp: b.maxHp,
				kind: "building",
				type: b.type,
				team: b.team,
				queue: b.queue.map((q) => q.unit).join(",")
			};
		} else {
			const enemy = this.state.units.find((u) => u.selected && u.team !== 0);
			if (enemy) selection = {
				name: this.tribe(enemy.team)?.name || "Rival",
				info: (this.tribe(enemy.team)?.hostile ? "Warring" : "Peaceful") + " · " + (UNITS[enemy.type]?.name || enemy.type),
				hp: enemy.hp,
				maxHp: enemy.maxHp,
				kind: "unit",
				type: enemy.type,
				team: enemy.team
			};
		}
		const age = t.age;
		const next = AGE_COST[age + 1];
		const trainOptions = [];
		const hasTH = this.hasBld(0, "townhall");
		const hasBar = this.hasBld(0, "barracks");
		const hasSt = this.hasBld(0, "stables");
		if (hasTH) trainOptions.push({
			type: "worker",
			name: UNITS.worker.name,
			cost: { food: 50 },
			age: 0
		});
		if (hasBar) {
			trainOptions.push({
				type: "spearman",
				name: UNITS.spearman.name,
				cost: {
					food: 50,
					wood: 20
				},
				age: 0
			});
			trainOptions.push({
				type: "archer",
				name: UNITS.archer.name,
				cost: {
					food: 40,
					wood: 35
				},
				age: 1
			});
			trainOptions.push({
				type: "swordsman",
				name: UNITS.swordsman.name,
				cost: {
					food: 70,
					wood: 20,
					stone: 20
				},
				age: 2
			});
		}
		if (hasSt) trainOptions.push({
			type: "cavalry",
			name: UNITS.cavalry.name,
			cost: {
				food: 80,
				wood: 40
			},
			age: 4
		});
		const buildOptions = BUILD_ORDER.map((type) => ({
			type,
			name: BUILDINGS[type].name,
			cost: {
				wood: BUILDINGS[type].wood,
				stone: BUILDINGS[type].stone,
				food: BUILDINGS[type].food
			},
			age: BUILDINGS[type].age,
			hint: BUILDINGS[type].hint
		}));
		return {
			food: Math.floor(t.food),
			wood: Math.floor(t.wood),
			stone: Math.floor(t.stone),
			pop: this.popNow(0),
			popCap: this.popCap(0),
			age,
			ages: [...AGES],
			time: this.state.time,
			day: ck.day,
			clock: ck.time,
			period: ck.period,
			weather: ck.weather,
			paused: this.state.paused,
			speed: this.state.speed,
			ended: this.state.ended,
			endReason: this.state.endReason,
			objective: this.currentObjective(),
			placing: this.state.placing,
			banner: this.state.bannerT > 0 ? this.state.banner : null,
			selection,
			canAge: !!next && this.canAfford(0, next) && this.popNow(0) >= (next.pop || 0) && age < 5,
			ageCost: next,
			nextAge: age < 5 ? AGES[age + 1] : null,
			tribes: this.state.tribes.map((tr) => ({
				id: tr.id,
				name: tr.short,
				color: tr.color,
				age: tr.age,
				alive: tr.alive,
				hostile: tr.hostile
			})),
			trainOptions,
			buildOptions,
			fps: this.fps,
			started: this.started,
			muted: this.muted,
			quality: this.quality,
			workerSelected: units.filter((u) => u.type === "worker").length,
			militarySelected: units.filter((u) => u.type !== "worker").length,
			job: units.find((u) => u.type === "worker")?.order === "hold" ? "hold" : units.find((u) => u.type === "worker")?.job ?? null,
			canRaid: this.state.units.some((u) => u.team === 0 && u.type !== "worker" && u.hp > 0),
			trade: (() => {
				const rival = this.pickTradeRival();
				if (!rival) return null;
				return {
					rival: rival.name,
					hostile: rival.hostile,
					alive: rival.alive,
					cd: rival.tradeCd,
					offers: TRADE_OFFERS,
					canCycle: this.state.tribes.filter((t) => t.id !== 0 && t.alive).length > 1
				};
			})(),
			rivalX: this.campOf(this.tradeTeam || 1).x,
			rivalZ: this.campOf(this.tradeTeam || 1).z,
			homeX: this.campOf(0).x,
			homeZ: this.campOf(0).z,
			camps: this.world.camps.filter((c) => c.team !== 0).map((c) => {
				const tr = this.tribe(c.team);
				return {
					x: c.x,
					z: c.z,
					name: tr?.name || TEAM_NAMES[c.team] || "Rival",
					color: tr?.color || TEAM_COLORS[c.team] || "#8a3030",
					alive: tr?.alive ?? false,
					hostile: tr?.hostile ?? false
				};
			}),
			raidName: this.pickRaidRival()?.name ?? null,
			idleWorkers: this.idleWorkers().length,
			pendingAge: this.state.pendingAge && age < 5 ? {
				next: AGES[age + 1],
				econ: AGE_CHOICES[age].econ,
				army: AGE_CHOICES[age].army
			} : null,
			event: this.state.weather === "storm" ? "Storm — building paused" : this.state.weather === "frost" ? "Frost — foraging slow" : this.state.weather === "rain" ? "Rain — berries swell, wood is wet" : this.state.weather === "mist" ? "Mist on the island" : this.state.weather === "golden" ? "Golden light — work runs easy" : this.state.weather === "flood" ? "Flood — the river takes the banks" : this.state.weather === "drought" ? "Drought — yields run thin" : this.state.event === "herd" ? "Herd — extra food" : null
		};
	}
	serialize() {
		const s = this.state;
		return {
			seed: s.seed,
			time: s.time,
			tribes: s.tribes,
			units: s.units.map((u) => ({
				...u,
				node: null,
				target: null
			})),
			buildings: s.buildings.map((b) => ({ ...b })),
			trees: s.trees,
			stones: s.stones,
			forage: s.forage,
			placing: null,
			nextId: s.nextId
		};
	}
};
var GameAudio = class {
	ctx = null;
	master = null;
	sfx = null;
	music = null;
	muted = false;
	unlocked = false;
	drones = [];
	scoreTimer = null;
	scoreStart = 0;
	lastBar = -1;
	noise = null;
	unlock() {
		if (this.unlocked) {
			if (this.ctx?.state === "suspended") this.ctx.resume();
			return;
		}
		const AC = window.AudioContext || window.webkitAudioContext;
		this.ctx = new AC({ latencyHint: "interactive" });
		this.master = this.ctx.createGain();
		this.sfx = this.ctx.createGain();
		this.music = this.ctx.createGain();
		this.sfx.gain.value = .7;
		this.music.gain.value = .28;
		this.master.gain.value = .5;
		this.sfx.connect(this.master);
		this.music.connect(this.master);
		this.master.connect(this.ctx.destination);
		this.noise = this.makeNoise(this.ctx);
		this.ctx.resume();
		this.unlocked = true;
		this.startScore();
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && this.ctx?.state === "suspended") this.ctx.resume();
		});
	}
	setMuted(m) {
		this.muted = m;
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : .55, this.ctx.currentTime, .04);
	}
	makeNoise(ctx) {
		const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
		const d = n.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		return n;
	}
	tone(freq, dur, type = "triangle", vol = .08, detune = 0) {
		if (!this.ctx || !this.sfx || this.muted) return;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = type;
		o.frequency.value = freq;
		o.detune.value = detune;
		g.gain.setValueAtTime(vol, this.ctx.currentTime);
		g.gain.exponentialRampToValueAtTime(8e-4, this.ctx.currentTime + dur);
		o.connect(g);
		g.connect(this.sfx);
		o.start();
		o.stop(this.ctx.currentTime + dur);
	}
	play(name) {
		const r = .92 + Math.random() * .16;
		switch (name) {
			case "click":
				this.tone(520 * r, .06, "square", .04);
				break;
			case "place":
				this.tone(180, .12, "triangle", .07);
				this.tone(320, .18, "sine", .04);
				break;
			case "move":
				this.tone(240 * r, .07, "sine", .03);
				break;
			case "hit":
				this.tone(110 * r, .08, "sawtooth", .05);
				break;
			case "death":
				this.tone(90, .25, "triangle", .06);
				this.tone(70, .3, "sine", .05);
				break;
			case "train":
				this.tone(400, .1, "triangle", .05);
				this.tone(600, .16, "sine", .03);
				break;
			case "age":
				this.tone(220, .35, "triangle", .07);
				this.tone(330, .45, "sine", .05);
				this.tone(440, .55, "sine", .04);
				break;
			case "win":
				this.tone(262, .4, "triangle", .07);
				this.tone(330, .5, "sine", .05);
				this.tone(392, .7, "sine", .05);
				break;
			case "lose":
				this.tone(196, .5, "triangle", .06);
				this.tone(147, .7, "sine", .05);
				break;
			case "invalid":
				this.tone(140, .1, "square", .04);
				break;
			default: this.tone(300, .05, "sine", .03);
		}
	}
	hz(semi) {
		return 146.83 * Math.pow(2, semi / 12);
	}
	pluck(time, semi, dur = .55, vol = .055) {
		if (!this.ctx || !this.music) return;
		const o = this.ctx.createOscillator();
		const o2 = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		const f = this.ctx.createBiquadFilter();
		o.type = "triangle";
		o2.type = "sine";
		o.frequency.value = this.hz(semi);
		o2.frequency.value = this.hz(semi) * 2;
		f.type = "lowpass";
		f.frequency.setValueAtTime(2200, time);
		f.frequency.exponentialRampToValueAtTime(480, time + dur);
		g.gain.setValueAtTime(1e-4, time);
		g.gain.exponentialRampToValueAtTime(vol, time + .012);
		g.gain.exponentialRampToValueAtTime(1e-4, time + dur);
		o.connect(f);
		o2.connect(f);
		f.connect(g);
		g.connect(this.music);
		o.start(time);
		o2.start(time);
		o.stop(time + dur + .05);
		o2.stop(time + dur + .05);
	}
	flute(time, semi, dur = .85, vol = .03) {
		if (!this.ctx || !this.music) return;
		const o = this.ctx.createOscillator();
		const lfo = this.ctx.createOscillator();
		const lfoG = this.ctx.createGain();
		const g = this.ctx.createGain();
		o.type = "sine";
		o.frequency.value = this.hz(semi + 12);
		lfo.type = "sine";
		lfo.frequency.value = 5.2;
		lfoG.gain.value = 7;
		lfo.connect(lfoG);
		lfoG.connect(o.detune);
		g.gain.setValueAtTime(1e-4, time);
		g.gain.linearRampToValueAtTime(vol, time + .08);
		g.gain.linearRampToValueAtTime(vol * .7, time + dur * .6);
		g.gain.exponentialRampToValueAtTime(1e-4, time + dur);
		o.connect(g);
		g.connect(this.music);
		o.start(time);
		lfo.start(time);
		o.stop(time + dur + .05);
		lfo.stop(time + dur + .05);
	}
	drum(time) {
		if (!this.ctx || !this.music) return;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = "sine";
		o.frequency.setValueAtTime(90, time);
		o.frequency.exponentialRampToValueAtTime(42, time + .18);
		g.gain.setValueAtTime(.05, time);
		g.gain.exponentialRampToValueAtTime(1e-4, time + .22);
		o.connect(g);
		g.connect(this.music);
		o.start(time);
		o.stop(time + .25);
	}
	startPads() {
		if (!this.ctx || !this.music) return;
		for (const p of [
			{
				f: 73.42,
				type: "sine",
				vol: .048
			},
			{
				f: 110,
				type: "sine",
				vol: .028
			},
			{
				f: 146.83,
				type: "triangle",
				vol: .016
			},
			{
				f: 220,
				type: "sine",
				vol: .01
			}
		]) {
			const o = this.ctx.createOscillator();
			const g = this.ctx.createGain();
			const filt = this.ctx.createBiquadFilter();
			o.type = p.type;
			o.frequency.value = p.f;
			filt.type = "lowpass";
			filt.frequency.value = 640;
			g.gain.value = p.vol;
			o.connect(filt);
			filt.connect(g);
			g.connect(this.music);
			o.start();
			this.drones.push(o);
		}
		if (this.noise) {
			const src = this.ctx.createBufferSource();
			src.buffer = this.noise;
			src.loop = true;
			const f = this.ctx.createBiquadFilter();
			f.type = "bandpass";
			f.frequency.value = 380;
			f.Q.value = .7;
			const g = this.ctx.createGain();
			g.gain.value = .012;
			src.connect(f);
			f.connect(g);
			g.connect(this.music);
			src.start();
		}
	}
	scheduleBar(t0, beat, bar) {
		if (bar % 4 === 0) this.drum(t0);
		const luteA = [
			0,
			7,
			3,
			10
		];
		const luteB = [
			5,
			12,
			7,
			3
		];
		const luteC = [
			7,
			3,
			0,
			5
		];
		if (bar % 2 === 0) (bar % 6 === 0 ? luteA : bar % 6 === 2 ? luteB : luteC).forEach((semi, i) => {
			this.pluck(t0 + i * beat * 2, semi + 12, 1.35, .042);
		});
		if (bar % 4 === 1) (bar % 8 === 1 ? [
			7,
			10,
			12,
			7
		] : [
			12,
			7,
			5,
			3
		]).forEach((semi, i) => {
			if (i % 2 === 1) return;
			this.flute(t0 + i * beat * 2, semi, beat * 4.2, .026);
		});
	}
	startScore() {
		if (!this.ctx || !this.music) return;
		this.startPads();
		this.scoreStart = this.ctx.currentTime + .2;
		this.lastBar = -1;
		const beat = 60 / 52;
		const barLen = beat * 8;
		const tick = () => {
			if (!this.ctx || !this.unlocked) return;
			const now = this.ctx.currentTime;
			const bar = Math.floor((now - this.scoreStart + .7) / barLen);
			if (bar > this.lastBar && bar >= 0) {
				this.lastBar = bar;
				this.scheduleBar(this.scoreStart + bar * barLen, beat, bar);
			}
			this.scoreTimer = window.setTimeout(tick, 200);
		};
		tick();
	}
	dispose() {
		if (this.scoreTimer != null) window.clearTimeout(this.scoreTimer);
		this.scoreTimer = null;
		this.unlocked = false;
		for (const o of this.drones) try {
			o.stop();
		} catch {}
		this.drones = [];
		this.ctx?.close();
		this.ctx = null;
	}
};
function saveGame(game) {
	if (!game.started) return;
	try {
		const blob = JSON.stringify({
			...game.serialize(),
			version: 6
		});
		localStorage.setItem(SAVE_KEY + ":bak", localStorage.getItem("dawn-of-empire-v6") || "");
		localStorage.setItem(SAVE_KEY, blob);
	} catch {}
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
function canvasTex(size, paint) {
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const ctx = c.getContext("2d");
	if (!ctx) return null;
	paint(ctx, size);
	const t = new CanvasTexture(c);
	t.wrapS = t.wrapT = RepeatWrapping;
	t.colorSpace = SRGBColorSpace;
	t.anisotropy = 8;
	t.needsUpdate = true;
	return t;
}
function makeMaterials() {
	const straw = canvasTex(256, (ctx, s) => {
		ctx.fillStyle = "#9a7040";
		ctx.fillRect(0, 0, s, s);
		for (let i = 0; i < 1100; i++) {
			const y = Math.random() * s;
			ctx.strokeStyle = `rgba(${130 + Math.random() * 90},${90 + Math.random() * 60},${30 + Math.random() * 30},${.35 + Math.random() * .4})`;
			ctx.lineWidth = .6 + Math.random();
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(s, y + (Math.random() - .5) * 6);
			ctx.stroke();
		}
	});
	const bark = canvasTex(128, (ctx, s) => {
		ctx.fillStyle = "#4a3018";
		ctx.fillRect(0, 0, s, s);
		for (let i = 0; i < 80; i++) {
			ctx.strokeStyle = `rgba(${70 + Math.random() * 40},${40 + Math.random() * 22},12,0.45)`;
			ctx.lineWidth = 1 + Math.random() * 2;
			const x = Math.random() * s;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x + (Math.random() - .5) * 8, s);
			ctx.stroke();
		}
	});
	const rock = canvasTex(128, (ctx, s) => {
		ctx.fillStyle = "#8a8680";
		ctx.fillRect(0, 0, s, s);
		for (let i = 0; i < 400; i++) {
			ctx.fillStyle = `rgba(${110 + Math.random() * 50},${108 + Math.random() * 40},${100 + Math.random() * 30},0.4)`;
			ctx.beginPath();
			ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 0, 7);
			ctx.fill();
		}
	});
	if (straw) straw.repeat.set(2, 2);
	if (bark) bark.repeat.set(1, 2);
	if (rock) rock.repeat.set(2, 2);
	const std = (color, roughness, metalness = 0, opts = {}) => new MeshStandardMaterial({
		color,
		roughness,
		metalness,
		...opts
	});
	return {
		thatch: std("#d4b06a", .92, 0, { map: straw || void 0 }),
		timber: std("#b88858", .78),
		plaster: std("#d2c4aa", .86),
		stone: std("#a8a49c", .9, 0, { map: rock || void 0 }),
		dark: std("#4a3420", .82),
		crop: std("#8ab84a", .86),
		metal: std("#8a8884", .42, .55),
		tile: std("#7a4034", .72),
		dirt: std("#8a6a3c", .95),
		bark: std("#6a4828", .88, 0, { map: bark || void 0 }),
		leaf: std("#4e8a3c", .72),
		rock: std("#9a9890", .88, 0, { map: rock || void 0 }),
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
	timber.push(cyl(r * .9, r, wallH, 0, 0, 0, 12));
	for (let i = 0; i < 5; i++) timber.push(cyl(r * .97, r * .97, .16, 0, .12 + i * (wallH * .16), 0, 12));
	timber.push(box(.78, wallH * .82, .14, 0, .04, r * .94));
	roof.push(cone(r * 1.32, roofH, 0, wallH * .78, 0, 12));
	roof.push(cyl(r * 1.34, r * 1.14, .26, 0, wallH * .72, 0, 12));
	roof.push(cyl(.12, .08, .55, 0, wallH + roofH * .72, 0, 6));
	return {
		timber: merge(timber),
		roof: merge(roof)
	};
}
function buildingGeos() {
	const hut = thatchHut(2.4, 1.7, 2.25);
	const th = thatchHut(4.15, 2.25, 3.35);
	const farmTimber = [
		box(.18, 1.15, .18, -3.6, 0, -3.6),
		box(.18, 1.15, .18, 3.6, 0, -3.6),
		box(.18, 1.15, .18, -3.6, 0, 3.6),
		box(.18, 1.15, .18, 3.6, 0, 3.6),
		box(7.4, .12, .12, 0, .95, -3.6),
		box(7.4, .12, .12, 0, .95, 3.6),
		box(.12, .12, 7.4, -3.6, .95, 0),
		box(.12, .12, 7.4, 3.6, .95, 0)
	];
	const farmExtra = [
		box(7.4, .1, 7.4, 0, .02, 0),
		box(.4, .48, 6.2, -2.4, .12, 0),
		box(.4, .48, 6.2, -1.2, .12, 0),
		box(.4, .48, 6.2, 0, .12, 0),
		box(.4, .48, 6.2, 1.2, .12, 0),
		box(.4, .48, 6.2, 2.4, .12, 0)
	];
	const lumberT = [
		cyl(.9, 1, .5, -1.4, 0, .4, 8),
		box(3.4, 1.5, 2.4, 1.2, 0, 0),
		box(2.4, .35, .45, -.2, .55, 1.3, .3),
		box(2.4, .35, .45, -.1, .9, 1.1, .2)
	];
	const lumberR = [box(4, .2, 2.8, 1.2, 1.5, 0, .4)];
	const quarryT = [
		box(1.6, .7, 1.2, -1.6, 0, 1.2),
		box(1.2, .9, 1.4, 1.5, 0, -.8),
		box(.9, .5, 1.1, .4, 0, 1.5)
	];
	const quarryE = [new CylinderGeometry(2.4, 1.6, .8, 8), box(1.8, .6, 1.2, 1.6, 0, 1.1)];
	quarryE[0].translate(0, .15, 0);
	const wareT = [box(5.4, 1.8, 4.6, 0, 0, 0)];
	const wareR = [box(6.2, .22, 3.4, 0, 1.8, 0, .5), box(6.2, .22, 3.4, 0, 1.8, 0, -.5)];
	const barT = [box(7.2, 2, 6.4, 0, 0, 0)];
	for (let i = 0; i < 9; i++) {
		const x = -3.4 + i * .85;
		barT.push(box(.22, 2.6, .22, x, 0, 3.3));
		barT.push(box(.22, 2.6, .22, x, 0, -3.3));
	}
	const barR = [box(5.2, .2, 3.6, 0, 2, 0, .45), box(5.2, .2, 3.6, 0, 2, 0, -.45)];
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
	return {
		townhall: th,
		hut,
		farm: {
			timber: merge(farmTimber),
			roof: merge([box(2.4, 1.2, 2.2, 2.4, 0, 2.2)]),
			extra: merge(farmExtra),
			extraMat: "crop"
		},
		lumber: {
			timber: merge(lumberT),
			roof: merge(lumberR)
		},
		quarry: {
			timber: merge(quarryT),
			roof: merge([box(.1, .1, .1, 0, 0, 0)]),
			extra: merge(quarryE),
			extraMat: "stone"
		},
		warehouse: {
			timber: merge(wareT),
			roof: merge(wareR)
		},
		barracks: {
			timber: merge(barT),
			roof: merge(barR)
		},
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
		}
	};
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
	} else {
		const tool = new CylinderGeometry(.03, .03, .9, 5);
		tool.rotateZ(-.5);
		tool.translate(.28, .7, .2);
		parts.push(tool);
	}
	return merge(parts);
}
function pineGeo() {
	const trunk = new CylinderGeometry(.14, .26, 3.1, 7);
	trunk.translate(0, 1.55, 0);
	const cones = [
		[
			1.7,
			2.05,
			2.4
		],
		[
			1.38,
			1.8,
			3.25
		],
		[
			1.08,
			1.55,
			4.05
		],
		[
			.78,
			1.35,
			4.8
		],
		[
			.5,
			1.15,
			5.5
		],
		[
			.28,
			.95,
			6.1
		]
	].map(([r, h, y]) => {
		const c = new ConeGeometry(r, h, 8);
		c.translate(0, y, 0);
		return c;
	});
	return {
		trunk: merge([trunk]),
		canopy: merge(cones)
	};
}
function rockGeo() {
	const g = new DodecahedronGeometry(.7, 0);
	g.scale(1.2, .7, 1);
	g.translate(0, .28, 0);
	return g;
}
function bushGeo() {
	const a = new SphereGeometry(.55, 7, 6);
	a.translate(-.15, .4, 0);
	const b = new SphereGeometry(.45, 7, 6);
	b.translate(.28, .35, .1);
	const c = new SphereGeometry(.38, 7, 6);
	c.translate(.05, .5, -.2);
	const berry = new SphereGeometry(.08, 5, 4);
	berry.translate(.2, .62, .18);
	return merge([
		a,
		b,
		c,
		berry
	]);
}
function grassGeo() {
	const a = new ConeGeometry(.12, .62, 4);
	a.translate(0, .3, 0);
	const b = new ConeGeometry(.09, .5, 4);
	b.translate(.09, .24, .04);
	const c = new ConeGeometry(.08, .44, 4);
	c.translate(-.07, .2, -.03);
	return merge([
		a,
		b,
		c
	]);
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
function fenceSegGeo() {
	return merge([
		box(.13, 1.22, .13, -.95, 0, 0),
		box(.13, 1.22, .13, .95, 0, 0),
		box(1.95, .08, .08, 0, .48, 0),
		box(1.95, .08, .08, 0, .86, 0)
	]);
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
var UNIT_TYPES = [
	"worker",
	"spearman",
	"archer",
	"swordsman",
	"cavalry"
];
var BLD_TYPES = [
	"townhall",
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
	renderer;
	scene;
	camera;
	mats;
	terrain;
	water;
	hemi;
	sun;
	fill;
	hearth;
	look = new Vector3(0, 1.2, 0);
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
	bushes;
	grass = null;
	bldMeshes = /* @__PURE__ */ new Map();
	unitMeshes = /* @__PURE__ */ new Map();
	rings;
	ghost;
	arrows;
	smoke;
	smokeGeo;
	smokePos;
	flames;
	pits;
	floaters;
	quality = "med";
	sky;
	sunDisc;
	sunGlow;
	bounce;
	fence = null;
	goats = null;
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
	fowData = /* @__PURE__ */ new Uint8Array(25600);
	fowMesh = null;
	rain = null;
	rainGeo = null;
	rainPos = /* @__PURE__ */ new Float32Array(0);
	lost = false;
	onContextLost = null;
	onContextRestored = null;
	constructor(canvas) {
		const mobile = window.matchMedia("(max-width: 700px)").matches || navigator.maxTouchPoints > 1;
		const cores = navigator.hardwareConcurrency || 4;
		this.quality = mobile || cores <= 4 ? "med" : "high";
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: this.quality === "high",
			powerPreference: "high-performance",
			alpha: false,
			preserveDrawingBuffer: false,
			failIfMajorPerformanceCaveat: false
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === "high" ? 1.5 : 1.25));
		this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = 1;
		this.renderer.toneMapping = 4;
		this.renderer.toneMappingExposure = 1.02;
		this.renderer.outputColorSpace = SRGBColorSpace;
		canvas.addEventListener("webglcontextlost", this.onGlLost, false);
		canvas.addEventListener("webglcontextrestored", this.onGlRestored, false);
		this.scene = new Scene();
		this.scene.background = new Color("#d8c4a0");
		this.scene.fog = new FogExp2("#d8c4a0", .0034);
		this.camera = new PerspectiveCamera(38, 1, .5, 720);
		this.mats = makeMaterials();
		this.hemi = new HemisphereLight("#ffe9c8", "#4a6a38", .72);
		this.scene.add(this.hemi);
		this.fill = new AmbientLight("#efe4cc", .22);
		this.scene.add(this.fill);
		this.sun = new DirectionalLight("#fff1c4", 2.05);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(this.quality === "high" ? 1024 : 512, this.quality === "high" ? 1024 : 512);
		this.sun.shadow.camera.near = 4;
		this.sun.shadow.camera.far = 220;
		this.sun.shadow.camera.left = -80;
		this.sun.shadow.camera.right = 80;
		this.sun.shadow.camera.top = 80;
		this.sun.shadow.camera.bottom = -80;
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
		this.smokePos = /* @__PURE__ */ new Float32Array(216);
		this.smokeGeo = new BufferGeometry();
		this.smokeGeo.setAttribute("position", new BufferAttribute(this.smokePos, 3));
		this.smoke = new Points(this.smokeGeo, new PointsMaterial({
			color: "#e8e0d4",
			size: .55,
			transparent: true,
			opacity: .38,
			depthWrite: false
		}));
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
		this.rings = new InstancedMesh(new RingGeometry(.7, .88, 20), new MeshBasicMaterial({
			color: "#e8c878",
			side: 2,
			transparent: true,
			opacity: .9
		}), 40);
		this.rings.instanceMatrix.setUsage(DynamicDrawUsage);
		this.rings.count = 0;
		this.scene.add(this.rings);
		this.setupGodrays();
		this.setupFow();
		this.setupComposer();
	}
	resize() {
		if (this.lost || this.disposed) return;
		const el = this.renderer.domElement;
		const w = el.clientWidth;
		const h = el.clientHeight;
		if (!w || !h) return;
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.composer?.setSize(w, h);
		if (this.bloom) this.bloom.resolution.set(w, h);
	}
	applyQuality(q) {
		this.quality = q;
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === "low" ? 1 : q === "med" ? 1.25 : 1.5));
		this.renderer.shadowMap.enabled = q !== "low";
		this.sun.castShadow = q !== "low";
		const map = q === "high" ? 1024 : 512;
		this.sun.shadow.mapSize.set(map, map);
		this.sun.shadow.map?.dispose();
		this.sun.shadow.map = null;
		if (this.grass) this.grass.visible = q !== "low";
		if (q === "low") {
			this.composer = null;
			this.bloom = null;
		} else if (!this.composer && !this.lost) this.setupComposer();
	}
	rebuild(game) {
		this.disposeWorld();
		this.buildTerrain(game);
		this.buildNature(game);
		this.buildBuildings();
		this.buildUnits();
		this.buildHearths(game);
		this.buildCampDressing(game);
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
		const geo = new PlaneGeometry(220, 220, 112, 112);
		geo.rotateX(-Math.PI / 2);
		const pos = geo.attributes.position;
		const colors = [];
		const col = new Color();
		const grass = new Color("#b6d86a");
		const grass2 = new Color("#c8e878");
		const fertileCol = new Color("#9ec85a");
		const dirt = new Color("#d2b07a");
		const sand = new Color("#ead9b4");
		const rock = new Color("#d0ccc4");
		const path = new Color("#c4a070");
		const home = game.world.camps.find((c) => c.team === 0) || {
			x: 0,
			z: 0
		};
		const islandR = game.world.islandR || 88;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const z = pos.getZ(i);
			const h = game.height(x, z);
			pos.setY(i, h);
			const river = h < game.world.waterY + .32;
			const shore = Math.hypot(x, z) > islandR - 8;
			const pathN = Math.abs(x - home.x - Math.sin((z - home.z) * .08) * 1.6) < 1.7 && Math.hypot(x - home.x, z - home.z) < 22;
			const clearing = Math.hypot(x - home.x, z - home.z) < 16;
			const fertile = !river && isFertile(game.world.heights, x, z, game.world.baseWaterY);
			if (h < game.world.baseWaterY + .1) col.copy(sand).multiplyScalar(.72);
			else if (river) col.copy(sand);
			else if (shore) col.lerpColors(sand, rock, .35);
			else if (h > 3.6) col.copy(rock);
			else if (pathN) col.copy(path);
			else if (h > 2.6) col.lerpColors(grass, dirt, .45);
			else if (clearing) col.lerpColors(grass2, dirt, .22);
			else if (fertile) col.lerpColors(fertileCol, grass2, .4);
			else col.lerpColors(grass, grass2, (Math.sin(x * .28) + Math.cos(z * .24)) * .25 + .5);
			colors.push(col.r, col.g, col.b);
		}
		geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
		geo.computeVertexNormals();
		geo.computeBoundingBox();
		geo.computeBoundingSphere();
		this.terrain = new Mesh(geo, this.mats.ground);
		this.terrain.receiveShadow = true;
		this.terrain.name = "terrain";
		this.scene.add(this.terrain);
		const wgeo = new PlaneGeometry(220, 220, 48, 48);
		wgeo.rotateX(-Math.PI / 2);
		this.water = new Mesh(wgeo, this.makeWaterMat());
		this.water.position.y = game.world.waterY;
		this.water.renderOrder = 1;
		this.scene.add(this.water);
	}
	buildNature(game) {
		const pine = pineGeo();
		const nTree = game.state.trees.length;
		this.treesTrunk = new InstancedMesh(pine.trunk, this.mats.bark, Math.max(nTree, 1));
		this.treesLeaf = new InstancedMesh(pine.canopy, this.mats.leaf.clone(), Math.max(nTree, 1));
		this.treesLeaf.material.color.set("#ffffff");
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
		const gCount = this.quality === "low" ? 280 : this.quality === "med" ? 800 : 1400;
		if (gCount) {
			const grassMat = this.mats.crop.clone();
			grassMat.color.set("#ffffff");
			grassMat.onBeforeCompile = (shader) => {
				shader.uniforms.uTime = this.timeU;
				shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
				shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
           float wind = sin(uTime * 1.35 + transformed.x * 0.9 + instanceMatrix[3].x * 0.17);
           transformed.x += wind * 0.14 * transformed.y;
           transformed.z += cos(uTime * 1.1 + instanceMatrix[3].z * 0.13) * 0.08 * transformed.y;`);
			};
			grassMat.customProgramCacheKey = () => "grass-wind";
			this.grass = new InstancedMesh(grassGeo(), grassMat, gCount);
			this.grass.instanceColor = new InstancedBufferAttribute(new Float32Array(gCount * 3), 3);
			let gi = 0;
			const home = game.world.camps.find((c) => c.team === 0) || {
				x: 0,
				z: 0
			};
			for (let i = 0; i < gCount * 4 && gi < gCount; i++) {
				const nearCamp = i < gCount * .35;
				const x = nearCamp ? home.x + (Math.random() - .5) * 30 : (Math.random() - .5) * 212;
				const z = nearCamp ? home.z + (Math.random() - .5) * 26 : (Math.random() - .5) * 212;
				const y = game.height(x, z);
				if (y < game.world.waterY + .45) continue;
				_p.set(x, y, z);
				_e.set(0, Math.random() * 6, 0);
				_q.setFromEuler(_e);
				const sc = .85 + Math.random() * 1.1;
				_s.set(sc, sc * (.9 + Math.random() * .4), sc);
				_m.compose(_p, _q, _s);
				this.grass.setMatrixAt(gi, _m);
				_c.setHSL(.27 + Math.random() * .06, .55, .42 + Math.random() * .1);
				this.grass.setColorAt(gi, _c);
				gi++;
			}
			this.grass.count = gi;
			this.scene.add(this.grass);
		}
	}
	buildBuildings() {
		const geos = buildingGeos();
		for (const type of BLD_TYPES) {
			const g = geos[type];
			const timber = new InstancedMesh(g.timber, this.mats.timber, 80);
			const roofMat = type === "keep" || type === "temple" || type === "university" ? this.mats.tile : this.mats.thatch;
			const roof = new InstancedMesh(g.roof, roofMat, 80);
			timber.instanceMatrix.setUsage(DynamicDrawUsage);
			timber.instanceColor = new InstancedBufferAttribute(/* @__PURE__ */ new Float32Array(240), 3);
			roof.instanceMatrix.setUsage(DynamicDrawUsage);
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
				extra = new InstancedMesh(g.extra, this.mats[g.extraMat || "stone"], 80);
				extra.instanceMatrix.setUsage(DynamicDrawUsage);
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
	}
	buildHearths(game) {
		const halls = game.state.buildings.filter((b) => b.type === "townhall" && b.hp > 0);
		this.pits = new InstancedMesh(firepitGeo(), this.mats.rock, 6);
		this.pits.castShadow = true;
		this.pits.receiveShadow = true;
		this.flames = new InstancedMesh(flameGeo(), new MeshBasicMaterial({
			color: "#ffb040",
			transparent: true,
			opacity: .85,
			depthWrite: false
		}), 8);
		this.flames.frustumCulled = false;
		halls.forEach((h, i) => {
			_p.set(h.x + 1.6, h.y, h.z + 4.2);
			_q.identity();
			_s.set(1, 1, 1);
			_m.compose(_p, _q, _s);
			this.pits.setMatrixAt(i, _m);
		});
		this.pits.count = halls.length;
		this.flames.count = 0;
		this.scene.add(this.pits, this.flames);
		const home = halls.find((h) => h.team === 0);
		if (home) this.hearth.position.set(home.x + 1.6, home.y + .8, home.z + 4.2);
	}
	buildCampDressing(game) {
		const home = game.state.buildings.find((b) => b.type === "townhall" && b.team === 0);
		if (!home) return;
		const cx = home.x + 7.5;
		const cz = home.z + 2.5;
		const segs = 14;
		const radius = 5.2;
		this.fence = new InstancedMesh(fenceSegGeo(), this.mats.timber, segs);
		this.fence.castShadow = true;
		this.fence.receiveShadow = true;
		for (let i = 0; i < segs; i++) {
			const a = i / segs * Math.PI * 2;
			const x = cx + Math.cos(a) * radius;
			const z = cz + Math.sin(a) * radius;
			_p.set(x, game.height(x, z), z);
			_e.set(0, -a + Math.PI / 2, 0);
			_q.setFromEuler(_e);
			_s.set(1, 1, 1);
			_m.compose(_p, _q, _s);
			this.fence.setMatrixAt(i, _m);
		}
		this.fence.count = segs;
		this.scene.add(this.fence);
		this.goats = new InstancedMesh(goatGeo(), this.mats.hideDark, 4);
		this.goats.castShadow = true;
		[
			[
				cx + 1.2,
				cz + .6,
				.4
			],
			[
				cx - 1.4,
				cz - .8,
				2.1
			],
			[
				cx + .2,
				cz - 1.6,
				-.7
			],
			[
				cx - .6,
				cz + 1.4,
				1.3
			]
		].forEach((g, i) => {
			const x = g[0], z = g[1];
			_p.set(x, game.height(x, z), z);
			_e.set(0, g[2], 0);
			_q.setFromEuler(_e);
			_s.set(1.15, 1.15, 1.15);
			_m.compose(_p, _q, _s);
			this.goats.setMatrixAt(i, _m);
		});
		this.goats.count = 4;
		this.scene.add(this.goats);
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
			this.look.x = MathUtils.clamp(this.look.x, -100, 100);
			this.look.z = MathUtils.clamp(this.look.z, -100, 100);
		}
		this.pitch = MathUtils.clamp(this.pitch, .28, 1.28);
		this.dist = MathUtils.clamp(this.dist, 14, 118);
		this.tmpCam.set(this.look.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist, this.look.y + Math.sin(this.pitch) * this.dist, this.look.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist);
		this.camera.position.copy(this.tmpCam);
		this.camera.lookAt(this.look.x, this.look.y + 1.2, this.look.z);
	}
	groundAt(cx, cy) {
		const el = this.renderer.domElement;
		const w = el.clientWidth || 1;
		const h = el.clientHeight || 1;
		_ndc.set(cx / w * 2 - 1, -(cy / h) * 2 + 1);
		_ray.setFromCamera(_ndc, this.camera);
		const hits = _ray.intersectObject(this.terrain, false);
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
			y: (-_p.y * .5 + .5) * el.clientHeight
		};
	}
	sync(game, dt) {
		if (this.lost || this.disposed) return;
		this.updateDay(game);
		this.syncNature(game);
		this.syncBuildings(game);
		this.syncUnits(game);
		this.syncGhost(game);
		this.syncArrows(game);
		this.syncSmoke(game, dt);
		this.timeU.value = game.state.time;
		this.syncFow(game);
		this.syncRain(game, dt);
		if (this.water) this.water.position.y = game.world.waterY + Math.sin(game.state.time * .6) * .03;
	}
	updateDay(game) {
		const hour = game.dayPhase() * 24;
		const t = (hour - 5.4) / 14.799999999999999;
		const elev = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
		const dawn = Math.max(0, 1 - Math.abs(hour - 6.7) * .55);
		const dusk = Math.max(0, 1 - Math.abs(hour - 18.8) * .5);
		const night = hour < 5.2 || hour > 20.4 ? 1 : 0;
		const wx = game.state.weather;
		const wet = wx === "rain" || wx === "storm" || wx === "flood";
		const ang = (hour - 6) / 12 * Math.PI;
		const dist = 110;
		this.sun.position.set(this.look.x + Math.cos(ang) * dist, 8 + Math.max(4, elev * 58), this.look.z + Math.sin(ang) * dist * .62);
		this.sun.target.position.copy(this.look);
		this.bounce.position.set(this.look.x - 24, 20, this.look.z + 14);
		this.bounce.target.position.copy(this.look);
		let sunI = 1.15 + elev * 1.15 + dawn * .35;
		if (wx === "storm") sunI *= .28;
		else if (wx === "rain") sunI *= .5;
		else if (wx === "flood") sunI *= .42;
		else if (wx === "mist") sunI *= .62;
		else if (wx === "frost") sunI *= .72;
		else if (wx === "golden") sunI *= .9;
		else if (wx === "drought") sunI *= 1.08;
		this.sun.intensity = sunI;
		this.sun.color.set(wx === "frost" ? "#e8eef8" : wx === "storm" || wx === "flood" ? "#9aa8bc" : wx === "drought" ? "#f0d8a8" : dawn > .2 || dusk > .25 || wx === "golden" ? "#ffb060" : night ? "#9aacd0" : "#fff4d2");
		this.hemi.intensity = (.48 + elev * .32) * (wx === "storm" ? .7 : 1);
		this.hemi.color.set(night ? "#a8b8d8" : wx === "frost" ? "#d8e4f0" : "#ffe9c8");
		this.fill.intensity = .16 + elev * .12;
		this.bounce.intensity = .12 + elev * .12;
		const fog = new Color().setStyle(night ? "#1c2434" : wx === "storm" ? "#6a7380" : wx === "flood" ? "#5e7a78" : wx === "drought" ? "#c4b090" : wx === "rain" ? "#8aa0a8" : wx === "mist" ? "#c8c4b4" : wx === "frost" ? "#d4dce8" : dawn > .25 ? "#e4c8a0" : dusk > .3 || wx === "golden" ? "#e0b888" : "#d2dcbe");
		this.scene.fog.color.copy(fog);
		this.scene.background = fog;
		let dens = night ? .0085 : .003;
		if (wx === "mist") dens = .0078;
		if (wx === "rain") dens = .0052;
		if (wx === "storm") dens = .009;
		if (wx === "flood") dens = .0074;
		if (wx === "drought") dens = .0044;
		if (wx === "frost") dens = .0058;
		this.scene.fog.density = dens;
		this.renderer.toneMappingExposure = (.92 + elev * .16 + dawn * .08) * (wx === "storm" || wx === "flood" ? .82 : 1);
		const sunDir = this.sun.position.clone().sub(this.look).normalize();
		this.sunDisc.position.copy(this.camera.position).add(sunDir.clone().multiplyScalar(180));
		this.sunDisc.lookAt(this.camera.position);
		this.sunGlow.position.copy(this.sunDisc.position);
		this.sunGlow.lookAt(this.camera.position);
		const vis = night || wx === "storm" ? .08 : wet ? .45 : .92;
		this.sunDisc.material.opacity = vis;
		this.sunGlow.material.opacity = (wx === "golden" ? .55 : .38) * vis;
		this.sky.position.copy(this.camera.position);
		const elevVis = night || wet ? .012 : .028 + dawn * .02 + elev * .018;
		this.godrays.forEach((ray, i) => {
			ray.position.copy(this.look).add(sunDir.clone().multiplyScalar(32 + i * 16));
			ray.position.y = Math.max(this.look.y + 16 + i * 5, ray.position.y);
			ray.lookAt(this.sun.position);
			const mat = ray.material;
			mat.opacity = elevVis * (1 - i * .16);
			ray.visible = this.quality !== "low" && !night && !wet;
		});
	}
	syncNature(game) {
		if (!this.treesTrunk) return;
		const treeCap = instCap(this.treesTrunk);
		const nTree = Math.min(game.state.trees.length, treeCap);
		this.treeCount = nTree;
		for (let i = 0; i < nTree; i++) {
			const t = game.state.trees[i];
			const stump = t.amount <= 0;
			const sc = stump ? t.scale * .22 : t.scale;
			_p.set(t.x, t.y, t.z);
			_e.set(0, i * .7, 0);
			_q.setFromEuler(_e);
			_s.set(sc, sc, sc);
			_m.compose(_p, _q, _s);
			this.treesTrunk.setMatrixAt(i, _m);
			_s.set(stump ? .001 : sc, stump ? .001 : sc, stump ? .001 : sc);
			_m.compose(_p, _q, _s);
			this.treesLeaf.setMatrixAt(i, _m);
		}
		this.treesTrunk.count = nTree;
		this.treesLeaf.count = nTree;
		this.treesTrunk.instanceMatrix.needsUpdate = true;
		this.treesLeaf.instanceMatrix.needsUpdate = true;
		if (this.rocks && game.state.stones.length !== this.rockCount) {
			const rockCap = instCap(this.rocks);
			this.rockCount = Math.min(game.state.stones.length, rockCap);
			for (let i = 0; i < this.rockCount; i++) {
				const s = game.state.stones[i];
				const gone = s.amount <= 0;
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
		if (!this.bushes) return;
		const bushCap = instCap(this.bushes);
		const nBush = Math.min(game.state.forage.length, bushCap);
		this.bushCount = nBush;
		for (let i = 0; i < nBush; i++) {
			const b = game.state.forage[i];
			const gone = b.amount <= 0;
			_p.set(b.x, b.y, b.z);
			_e.set(0, i, 0);
			_q.setFromEuler(_e);
			_s.setScalar(gone ? .001 : b.scale);
			_m.compose(_p, _q, _s);
			this.bushes.setMatrixAt(i, _m);
		}
		this.bushes.count = nBush;
		this.bushes.instanceMatrix.needsUpdate = true;
	}
	syncBuildings(game) {
		const grouped = /* @__PURE__ */ new Map();
		for (const type of BLD_TYPES) grouped.set(type, []);
		for (const b of game.state.buildings) {
			if (b.hp <= 0) continue;
			grouped.get(b.type)?.push(b);
		}
		for (const type of BLD_TYPES) {
			const list = grouped.get(type);
			const meshes = this.bldMeshes.get(type);
			if (!meshes) continue;
			const cap = instCap(meshes.timber);
			const n = Math.min(list.length, cap);
			for (let i = 0; i < n; i++) {
				const b = list[i];
				_p.set(b.x, b.y, b.z);
				_q.identity();
				_s.set(1, 1, 1);
				_m.compose(_p, _q, _s);
				meshes.timber.setMatrixAt(i, _m);
				meshes.roof.setMatrixAt(i, _m);
				meshes.extra?.setMatrixAt(i, _m);
				const tint = TEAM_COLORS[b.team] || TEAM_COLORS[0];
				_c.set(tint);
				meshes.timber.setColorAt(i, _c);
			}
			meshes.timber.count = n;
			meshes.roof.count = n;
			if (meshes.extra) meshes.extra.count = n;
			meshes.timber.instanceMatrix.needsUpdate = true;
			meshes.roof.instanceMatrix.needsUpdate = true;
			if (meshes.extra) meshes.extra.instanceMatrix.needsUpdate = true;
			if (meshes.timber.instanceColor) meshes.timber.instanceColor.needsUpdate = true;
		}
	}
	syncUnits(game) {
		const grouped = /* @__PURE__ */ new Map();
		for (const t of UNIT_TYPES) grouped.set(t, []);
		for (const u of game.state.units) if (u.hp > 0) grouped.get(u.type)?.push(u);
		let ri = 0;
		for (const t of UNIT_TYPES) {
			const list = grouped.get(t);
			const mesh = this.unitMeshes.get(t);
			if (!mesh) continue;
			const cap = instCap(mesh);
			const n = Math.min(list.length, cap);
			for (let i = 0; i < n; i++) {
				const u = list[i];
				const walking = Math.hypot(u.vx, u.vz) > .35;
				const chopping = !walking && (u.order === "gather" || u.order === "attack");
				const phase = u.stride;
				const bob = walking ? Math.abs(Math.sin(phase)) * .16 : chopping ? Math.abs(Math.sin(phase)) * .08 : 0;
				const pitch = walking ? Math.sin(phase) * .22 : chopping ? Math.sin(phase) * .14 : 0;
				const roll = walking ? Math.sin(phase * 2) * .12 : 0;
				const yScale = walking ? 1.65 * (1 + Math.sin(phase * 2) * .045) : 1.65;
				_p.set(u.x, u.y + bob, u.z);
				_e.set(pitch, u.facing, roll);
				_q.setFromEuler(_e);
				_s.set(1.65, yScale, 1.65);
				_m.compose(_p, _q, _s);
				mesh.setMatrixAt(i, _m);
				_c.set(TEAM_COLORS[u.team] || "#c4a060");
				mesh.setColorAt(i, _c);
				if (u.selected && ri < 40) {
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
		if (game.state.selBld && game.state.selBld.hp > 0 && ri < 40) {
			const b = game.state.selBld;
			_p.set(b.x, b.y + .06, b.z);
			_e.set(-Math.PI / 2, 0, 0);
			_q.setFromEuler(_e);
			_s.set(Math.max(b.w, b.d) * .55, Math.max(b.w, b.d) * .55, 1);
			_m.compose(_p, _q, _s);
			this.rings.setMatrixAt(ri, _m);
			ri++;
		}
		this.rings.count = ri;
		this.rings.instanceMatrix.needsUpdate = true;
	}
	syncGhost(_game) {}
	setGhost(type, x, z, y, ok) {
		if (!type) {
			this.clearGhost();
			this.ghost.visible = false;
			return;
		}
		this.ghost.visible = true;
		this.ghost.position.set(x, y, z);
		const key = type + (ok ? "-ok" : "-bad");
		if (this.ghost.userData.key === key) return;
		this.clearGhost();
		this.ghost.userData.key = key;
		const meshes = this.bldMeshes.get(type);
		if (!meshes) return;
		const tint = ok ? "#6a8a48" : "#8a3a32";
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
		this.ghost.add(new Mesh(meshes.timber.geometry, mt));
		this.ghost.add(new Mesh(meshes.roof.geometry, mr));
		const pad = new Mesh(new PlaneGeometry(8, 8), new MeshBasicMaterial({
			color: tint,
			transparent: true,
			opacity: .35,
			side: 2,
			depthWrite: false
		}));
		pad.rotation.x = -Math.PI / 2;
		pad.position.y = .08;
		this.ghost.add(pad);
	}
	clearGhost() {
		while (this.ghost.children.length) {
			const ch = this.ghost.children[0];
			this.ghost.remove(ch);
			const mat = ch.material;
			if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
			else if (mat) mat.dispose();
		}
		this.ghost.userData.key = "";
	}
	syncArrows(game) {
		const ps = game.state.projectiles;
		ps.forEach((p, i) => {
			if (i >= 40) return;
			_p.set(p.x, p.y, p.z);
			const dx = p.tx - p.x, dy = p.ty - p.y, dz = p.tz - p.z;
			_e.set(0, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
			_q.setFromEuler(_e);
			_s.set(1, 1, 1);
			_m.compose(_p, _q, _s);
			this.arrows.setMatrixAt(i, _m);
		});
		this.arrows.count = Math.min(ps.length, 40);
		this.arrows.instanceMatrix.needsUpdate = true;
	}
	syncSmoke(game, dt) {
		const halls = game.state.buildings.filter((b) => b.type === "townhall" && b.hp > 0);
		const n = 72;
		for (let i = 0; i < n; i++) {
			const h = halls[i % Math.max(halls.length, 1)];
			if (!h) {
				this.smokePos[i * 3 + 1] = -10;
				continue;
			}
			const t = game.state.time * .35 + i * .4;
			const k = t % 3.2 / 3.2;
			this.smokePos[i * 3] = h.x + 1.6 + Math.sin(t) * .35;
			this.smokePos[i * 3 + 1] = h.y + .9 + k * 5.2;
			this.smokePos[i * 3 + 2] = h.z + 4.2 + Math.cos(t * .7) * .28;
		}
		this.smokeGeo.attributes.position.needsUpdate = true;
		if (this.flames) {
			let fi = 0;
			for (const h of halls) for (let k = 0; k < 2 && fi < 8; k++, fi++) {
				const flicker = .85 + Math.sin(game.state.time * 11 + fi) * .18;
				_p.set(h.x + 1.6 + (k ? .08 : -.05), h.y + .22, h.z + 4.2);
				_e.set(0, fi, 0);
				_q.setFromEuler(_e);
				_s.set(.7 + k * .25, flicker * (1.1 - k * .25), .7 + k * .25);
				_m.compose(_p, _q, _s);
				this.flames.setMatrixAt(fi, _m);
			}
			this.flames.count = fi;
			this.flames.instanceMatrix.needsUpdate = true;
		}
		const home = halls.find((h) => h.team === 0);
		if (home) {
			this.hearth.position.set(home.x + 1.6, home.y + .85, home.z + 4.2);
			this.hearth.intensity = 1.35 + Math.sin(game.state.time * 9) * .25;
		}
	}
	render() {
		if (this.lost || this.disposed) return;
		try {
			if (this.composer && this.quality !== "low") this.composer.render();
			else this.renderer.render(this.scene, this.camera);
		} catch {
			this.lost = true;
			this.composer = null;
			this.bloom = null;
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
		return new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			uniforms: {
				uTime: this.timeU,
				uColor: { value: new Color("#3e7a78") },
				uDeep: { value: new Color("#16323c") }
			},
			vertexShader: `
        varying vec3 vWPos;
        varying vec3 vN;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWPos = w.xyz;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
			fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uDeep;
        varying vec3 vWPos;
        varying vec3 vN;
        void main() {
          float waves = sin(vWPos.x * 0.32 + uTime * 1.35) + sin(vWPos.z * 0.26 + uTime * 1.05);
          vec3 n = normalize(vN + vec3(waves * 0.07, 0.0, waves * 0.05));
          float fres = pow(1.0 - clamp(n.y, 0.0, 1.0), 2.2);
          vec3 col = mix(uDeep, uColor, 0.52 + waves * 0.07);
          col += vec3(0.62, 0.78, 0.82) * fres * 0.5;
          gl_FragColor = vec4(col, 0.76 + fres * 0.14);
        }`
		});
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
		this.fowTex = new DataTexture(this.fowData, 80, 80, RGBAFormat);
		this.fowTex.magFilter = LinearFilter;
		this.fowTex.minFilter = LinearFilter;
		this.fowTex.needsUpdate = true;
		const mat = new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			uniforms: {
				uMap: { value: this.fowTex },
				uHalf: { value: 110 },
				uSize: { value: 220 }
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
        uniform sampler2D uMap;
        varying vec2 vUv;
        void main() {
          float v = texture2D(uMap, vUv).r;
          float a = v > 0.7 ? 0.0 : v > 0.2 ? 0.38 : 0.72;
          gl_FragColor = vec4(0.05, 0.06, 0.07, a);
        }`
		});
		this.fowMesh = new Mesh(new PlaneGeometry(220, 220), mat);
		this.fowMesh.rotation.x = -Math.PI / 2;
		this.fowMesh.position.y = .18;
		this.fowMesh.renderOrder = 6;
		this.fowMesh.raycast = () => {};
		this.scene.add(this.fowMesh);
	}
	setupComposer() {
		try {
			this.composer?.dispose();
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
					darkness: { value: .32 }
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
			this.composer.addPass(new FilmPass(.11, false));
			this.composer.setSize(w, h);
		} catch {
			this.composer = null;
			this.bloom = null;
		}
	}
	syncFow(game) {
		if (!this.fowTex) return;
		const src = game.vision;
		for (let i = 0; i < src.length; i++) {
			const v = src[i] === 2 ? 255 : src[i] === 1 ? 90 : 0;
			const o = i * 4;
			this.fowData[o] = v;
			this.fowData[o + 1] = v;
			this.fowData[o + 2] = v;
			this.fowData[o + 3] = 255;
		}
		this.fowTex.needsUpdate = true;
	}
	syncRain(game, dt) {
		if (!this.rain || !this.rainGeo) return;
		const wet = game.state.weather === "rain" || game.state.weather === "storm" || game.state.weather === "flood";
		this.rain.visible = wet && this.quality !== "low";
		if (!wet) return;
		const n = this.rainPos.length / 3;
		const look = this.look;
		const heavy = game.state.weather === "storm" ? 28 : 16;
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
			x += dt * (game.state.weather === "storm" ? -3 : -1.2);
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
		const mat = this.rain.material;
		mat.opacity = game.state.weather === "storm" ? .55 : .38;
	}
	disposeWorld() {
		const keep = /* @__PURE__ */ new Set([
			this.ghost,
			this.arrows,
			this.smoke,
			this.floaters,
			this.rings,
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
		this.bldMeshes.clear();
		this.unitMeshes.clear();
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
		for (const k of Object.values(this.mats)) {
			k.map?.dispose();
			k.bumpMap?.dispose();
			k.dispose();
		}
	}
};
var Engine = class {
	game;
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
	moveMode = false;
	pointer = {
		x: 0,
		y: 0
	};
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
		this.pushHud();
		this.installProbe();
		window.__engine = this;
	}
	begin() {
		if (this.running && this.game.started) {
			this.pushHud();
			return;
		}
		this.audio.unlock();
		try {
			this.game.reset();
			this.view.rebuild(this.game);
			this.homeLook();
			this.view.resize();
		} catch (err) {
			console.error(err);
			this.setQuality("low");
			try {
				this.game.reset();
				this.view.rebuild(this.game);
				this.homeLook();
				this.view.resize();
			} catch (err2) {
				console.error(err2);
			}
		}
		this.running = true;
		this.last = performance.now();
		this.view.renderer.setAnimationLoop((t) => this.frame(t));
		this.pushHud();
	}
	restart() {
		try {
			this.game.reset();
			this.view.rebuild(this.game);
			this.homeLook();
		} catch (err) {
			console.error(err);
			this.setQuality("low");
			this.game.reset();
			this.view.rebuild(this.game);
			this.homeLook();
		}
		this.pushHud();
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
		c.addEventListener("pointerdown", this.onPointerDown);
		c.addEventListener("pointermove", this.onPointerMove);
		c.addEventListener("pointerup", this.onPointerUp);
		c.addEventListener("pointercancel", this.onPointerUp);
		c.addEventListener("wheel", this.onWheel, { passive: false });
		c.addEventListener("contextmenu", (e) => e.preventDefault());
		document.addEventListener("visibilitychange", this.onVis);
	}
	onResize = () => this.view.resize();
	onBlur = () => this.keys.clear();
	onVis = () => {
		if (document.visibilityState === "hidden") saveGame(this.game);
		if (document.visibilityState === "visible" && this.audio.ctx?.state === "suspended") this.audio.ctx.resume();
	};
	onKeyDown = (e) => {
		if (e.repeat && (e.code === "Space" || e.code === "KeyP")) return;
		this.keys.add(e.code);
		if ((/* @__PURE__ */ new Set([
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight"
		])).has(e.code)) e.preventDefault();
		if (!this.game.started) return;
		if (e.code === "Escape") {
			this.game.state.placing = null;
			this.game.state.pendingAge = false;
			this.view.setGhost(null, 0, 0, 0, false);
			this.moveMode = false;
		}
		if (e.code === "KeyI") this.focusIdle();
		if (e.code === "KeyG") this.trainPeople();
		if (e.code === "KeyT") this.cycleTrade();
		if (e.code === "KeyX") this.explore();
		if (e.code === "KeyP" || e.code === "Space") this.game.state.paused = !this.game.state.paused;
		if (e.code === "Equal" || e.code === "NumpadAdd") this.game.state.speed = Math.min(3, this.game.state.speed + 1);
		if (e.code === "Minus" || e.code === "NumpadSubtract") this.game.state.speed = Math.max(1, this.game.state.speed - 1);
		if (e.code === "KeyF") {
			const hall = this.game.state.buildings.find((b) => b.team === 0 && b.type === "townhall");
			if (hall) this.view.look.set(hall.x, hall.y + .5, hall.z);
		}
		if (e.code === "KeyM") this.toggleMute();
		const map = {
			Digit1: 0,
			Digit2: 1,
			Digit3: 2,
			Digit4: 3,
			Digit5: 4,
			Digit6: 5,
			Digit7: 6,
			Digit8: 7
		};
		if (map[e.code] !== void 0 && !e.metaKey && !e.ctrlKey) {
			const type = BUILD_ORDER[map[e.code]];
			if (type) this.setPlacing(type);
		}
		if (e.code === "KeyH") this.game.banner("WASD pan · RMB rotate · wheel zoom · LMB select · RMB move", 3);
	};
	onKeyUp = (e) => {
		this.keys.delete(e.code);
	};
	onWheel = (e) => {
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
			if (moved < 6) this.rightClick(p.x, p.y);
			return;
		}
		this.rotDrag = null;
		this.panDrag = null;
		if (e.button === 0 && this.game.state.placing) {
			this.leftClick(p.x, p.y, e.shiftKey);
			this.drag = null;
			this.updateGhost();
			this.pushHud();
			return;
		}
		if (this.drag && e.button === 0) {
			const dx = this.drag.x - this.drag.sx;
			const dy = this.drag.y - this.drag.sy;
			if (Math.hypot(dx, dy) > 8) {
				const a = this.view.groundAt(this.drag.sx, this.drag.sy);
				const b = this.view.groundAt(this.drag.x, this.drag.y);
				if (a && b) this.game.selectBox(a.x, a.z, b.x, b.z);
			} else this.leftClick(p.x, p.y, e.shiftKey);
			this.drag = null;
		}
	};
	leftClick(cx, cy, additive) {
		const g = this.view.groundAt(cx, cy);
		if (!g) {
			if (this.game.state.placing) this.game.banner("Aim at the valley floor", 1.2);
			return;
		}
		if (this.game.state.placing) {
			const x = Math.round(g.x / 2) * 2;
			const z = Math.round(g.z / 2) * 2;
			this.game.placeBuilding(this.game.state.placing, x, z, 0);
			this.updateGhost();
			this.pushHud();
			return;
		}
		if (this.moveMode) {
			this.game.issueMove(g.x, g.z);
			this.moveMode = false;
			return;
		}
		this.game.selectAt(g.x, g.z, additive);
	}
	rightClick(cx, cy) {
		const g = this.view.groundAt(cx, cy);
		if (!g) return;
		if (this.game.state.placing) {
			this.game.state.placing = null;
			this.view.setGhost(null, 0, 0, 0, false);
			return;
		}
		const ent = this.game.entityAt(g.x, g.z);
		if (ent && ent.team !== 0) this.game.issueAttack(ent);
		else {
			const node = this.game.resourceAt(g.x, g.z);
			if (node) this.game.issueGather(node);
			else this.game.issueMove(g.x, g.z);
		}
	}
	updateGhost() {
		const type = this.game.state.placing;
		if (!type) {
			this.view.setGhost(null, 0, 0, 0, false);
			return;
		}
		const g = this.view.groundAt(this.pointer.x, this.pointer.y);
		if (!g) return;
		const x = Math.round(g.x / 2) * 2;
		const z = Math.round(g.z / 2) * 2;
		const ok = this.game.placementValid(type, x, z, 0) && this.game.canAfford(0, {
			food: BUILDINGS[type].food,
			wood: BUILDINGS[type].wood,
			stone: BUILDINGS[type].stone
		});
		this.view.setGhost(type, x, z, this.game.height(x, z), ok);
	}
	setPlacing(type) {
		if (type && this.game.state.ended) return;
		this.game.state.placing = this.game.state.placing === type ? null : type;
		if (this.game.state.placing) {
			const d = BUILDINGS[this.game.state.placing];
			this.game.banner("Click the valley to raise a " + d.name + "  ·  Esc cancel", 2.4);
		}
		this.updateGhost();
		this.audio.play("click");
		this.pushHud();
	}
	train(type) {
		this.game.trainSelected(type);
	}
	assignJob(job) {
		this.game.assignJob(job);
		this.pushHud();
	}
	trade(deal) {
		this.game.tryTrade(deal);
		this.pushHud();
	}
	cycleTrade() {
		this.game.cycleTrade();
		this.pushHud();
	}
	focusTribe(id) {
		if (id !== 0) this.game.setTradeTeam(id);
		const camp = this.game.world.camps.find((c) => c.team === id);
		if (camp) this.view.look.set(camp.x, this.game.height(camp.x, camp.z) + .5, camp.z);
		this.pushHud();
	}
	raidRival() {
		this.game.raidRival();
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
		this.game.selectTownHall();
		this.game.trainSelected("worker");
		const hall = this.game.state.selBld;
		if (hall) this.view.look.set(hall.x, hall.y + .5, hall.z);
		this.pushHud();
	}
	focusIdle() {
		const u = this.game.focusIdleWorker();
		if (u) this.view.look.set(u.x, u.y + .5, u.z);
		this.pushHud();
	}
	explore() {
		this.game.issueExplore();
		this.pushHud();
	}
	setPaused(p) {
		this.game.state.paused = p;
	}
	setSpeed(s) {
		this.game.state.speed = s;
	}
	toggleMute() {
		this.game.muted = !this.game.muted;
		this.audio.setMuted(this.game.muted);
	}
	setQuality(q) {
		this.game.quality = q;
		this.view.applyQuality(q);
	}
	focusMinimap(nx, nz) {
		this.view.look.x = nx;
		this.view.look.z = nz;
		this.view.look.y = this.game.height(nx, nz) + .4;
	}
	frame = (t) => {
		if (this.disposed) return;
		try {
			const dt = this.last ? Math.min((t - this.last) / 1e3, .1) : .016;
			this.last = t;
			this.frames++;
			this.fpsAcc += dt;
			if (this.fpsAcc >= .4) {
				this.fps = this.frames / this.fpsAcc;
				this.game.fps = Math.round(this.fps);
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
			this.game.step(dt);
			this.updateGhost();
			this.view.updateCamera(dt);
			this.view.sync(this.game, dt);
			this.view.render();
			this.tuneQuality(dt);
			this.hudAcc += dt;
			if (this.hudAcc > .12) {
				this.hudAcc = 0;
				this.pushHud();
			}
			this.saveAcc += dt;
			if (this.saveAcc > 18) {
				this.saveAcc = 0;
				saveGame(this.game);
			}
			this.failFrames = 0;
		} catch (err) {
			console.error(err);
			this.failFrames++;
			if (this.failFrames >= 2 && this.game.quality !== "low") {
				this.failFrames = 0;
				this.setQuality(this.game.quality === "high" ? "med" : "low");
				this.game.banner("The valley eases", 1.8);
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
				this.game.banner("The valley eases", 1.6);
			}
		} else this.slowFps = Math.max(0, this.slowFps - dt * .5);
	}
	pushHud() {
		try {
			this.hud(this.game.snapshot());
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
		this.disposed = true;
		this.running = false;
		this.view.renderer.setAnimationLoop(null);
		this.ro?.disconnect();
		window.removeEventListener("resize", this.onResize);
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("blur", this.onBlur);
		document.removeEventListener("visibilitychange", this.onVis);
		this.canvas.removeEventListener("pointerdown", this.onPointerDown);
		this.canvas.removeEventListener("pointermove", this.onPointerMove);
		this.canvas.removeEventListener("pointerup", this.onPointerUp);
		this.view.dispose();
		this.audio.dispose();
	}
};
//#endregion
export { Engine };
