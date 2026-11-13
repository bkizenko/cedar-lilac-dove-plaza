// Helpers that draw flat-shaded SVG props for the first-person mockups. Deterministic (seeded); no libraries.
window.FP = (function () {
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; }; };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); };
  // A person in the shared-rig look: seven rigid parts (hips, spine, head, two arms, two legs). Feet at (x,y), height h px.
  // o: {tunic, trousers, skin, hair, cap, arm:'down'|'beckon'|'carry'|'fold', facing:'front'|'side', staff, belt}
  function person(x, y, h, o = {}) {
    const s = h / 100, t = o.tunic || '#8a5a3a', tr = o.trousers || '#5b4630', sk = o.skin || '#c08963', hr = o.hair || '#3a2a20', bl = o.belt || '#2b2016';
    const arm = o.arm || 'down';
    const lA = arm === 'fold' ? `M-15 30 L-20 46 L-4 46 L-2 40 Z` : `M-15 29 L-21 56 L-14 58 L-9 33 Z`;
    let rA = `M15 29 L21 56 L14 58 L9 33 Z`, hand = `<circle cx="17.5" cy="59" r="3.6" fill="${sk}"/>`;
    if (arm === 'beckon') { rA = `M15 29 L30 17 L25 11 L9 28 Z`; hand = `<circle cx="28" cy="10" r="3.8" fill="${sk}"/>`; }
    if (arm === 'carry') { rA = `M15 29 L24 44 L8 50 L6 44 Z`; hand = `<circle cx="9" cy="48" r="3.6" fill="${sk}"/>`; }
    const lHand = arm === 'fold' ? `<circle cx="-11" cy="45" r="3.4" fill="${sk}"/>` : `<circle cx="-17.5" cy="59" r="3.6" fill="${sk}"/>`;
    const cap = o.cap ? `<path d="M-10.5 11 Q0 -3 10.5 11 Q0 7 -10.5 11 Z" fill="${o.cap}"/>` : `<path d="M-10 10 Q-9 -2 0 -2.5 Q9 -2 10 10 Q6 4 0 4.6 Q-6 4 -10 10 Z" fill="${hr}"/>`;
    const staff = o.staff ? `<rect x="22" y="-4" width="2.6" height="106" rx="1.2" fill="#6b4a2c"/><circle cx="23.3" cy="-5" r="3.2" fill="#8a6a3c"/>` : '';
    return `<g transform="translate(${x} ${y - h}) scale(${s})">
 <ellipse cx="0" cy="100" rx="17" ry="3.2" fill="rgba(20,14,8,.34)"/>
 <rect x="-12" y="55" width="10" height="45" rx="3.5" fill="${tr}"/><rect x="2" y="55" width="10" height="45" rx="3.5" fill="${shade(tr, .86)}"/>
 <rect x="-12.5" y="94" width="11" height="6.5" rx="3" fill="${shade(tr, .55)}"/><rect x="1.5" y="94" width="11" height="6.5" rx="3" fill="${shade(tr, .5)}"/>
 <path d="${lA}" fill="${shade(t, .82)}"/>${lHand}
 <path d="M-16 27 Q-16 22 -9 22 L9 22 Q16 22 16 27 L14 62 L-14 62 Z" fill="${t}"/>
 <path d="M-1 22 L9 22 Q16 22 16 27 L14 62 L-1 62 Z" fill="${shade(t, .88)}"/>
 <rect x="-14.2" y="50" width="28.4" height="4.6" fill="${bl}"/>
 <path d="${rA}" fill="${t}"/>${hand}
 <rect x="-3.6" y="17" width="7.2" height="6" fill="${shade(sk, .9)}"/>
 <ellipse cx="0" cy="10" rx="8.6" ry="9.6" fill="${sk}"/>${cap}
 <circle cx="-3.2" cy="11" r="1.1" fill="#2b2016"/><circle cx="3.2" cy="11" r="1.1" fill="#2b2016"/><path d="M-2.4 16 Q0 17.6 2.4 16" stroke="#7a3f2a" stroke-width="1" fill="none"/>
 ${staff}</g>`;
  }
  function tree(x, y, h, c = '#4f6b3a', seed = 1) {
    const r = rng(seed), w = h * 0.55;
    let leaves = '';
    for (let i = 0; i < 9; i++) leaves += `<ellipse cx="${x + (r() - 0.5) * w * 0.9}" cy="${y - h * (0.55 + r() * 0.42)}" rx="${w * (0.22 + r() * 0.16)}" ry="${w * (0.16 + r() * 0.1)}" fill="${shade(c, 0.78 + r() * 0.4)}"/>`;
    return `<rect x="${x - h * 0.03}" y="${y - h * 0.62}" width="${h * 0.06}" height="${h * 0.62}" fill="#5b4126"/>${leaves}`;
  }
  function tufts(n, seed, x0, x1, y0, y1, col = '#6f8f45') {
    const r = rng(seed); let o = '';
    for (let i = 0; i < n; i++) {
      const y = y0 + (y1 - y0) * Math.pow(r(), 1.4), k = (y - y0) / (y1 - y0), x = x0 + (x1 - x0) * r(), h = 3 + k * 26;
      o += `<path d="M${x} ${y} l${-h * 0.18} ${-h} M${x} ${y} l${h * 0.04} ${-h * 1.1} M${x} ${y} l${h * 0.2} ${-h * 0.9}" stroke="${shade(col, 0.7 + r() * 0.5)}" stroke-width="${1 + k * 1.6}" stroke-linecap="round" fill="none"/>`;
    }
    return o;
  }
  const icon = {
    steward: '<svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="5" fill="#f6d58c"/><path d="M6 27 Q16 12 26 27 Z" fill="#f6d58c"/><rect x="13" y="19" width="6" height="3" fill="#2c2218"/></svg>',
    elder: '<svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="5" fill="#f6d58c"/><path d="M7 27 Q16 12 25 27 Z" fill="#f6d58c"/><rect x="24" y="6" width="2.4" height="22" rx="1" fill="#f6d58c"/></svg>',
    water: '<svg viewBox="0 0 32 32"><path d="M16 4 C10 13 8 17 8 21 a8 8 0 0 0 16 0 C24 17 22 13 16 4 Z" fill="#8ccfe3"/></svg>',
    warn: '<svg viewBox="0 0 32 32"><path d="M16 4 L29 27 H3 Z" fill="#f2c76b"/><rect x="14.6" y="12" width="2.8" height="8" fill="#2c2218"/><circle cx="16" cy="23.4" r="1.7" fill="#2c2218"/></svg>',
    envoy: '<svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="5" fill="#f6d58c"/><path d="M6 27 Q16 12 26 27 Z" fill="#f6d58c"/><path d="M22 5 L30 8 L22 11 Z" fill="#f4a287"/></svg>',
    clock: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#f6d58c" stroke-width="2.5"/><path d="M16 9 V16 L21 19" stroke="#f6d58c" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
    eye: '<svg viewBox="0 0 32 32"><path d="M3 16 Q16 4 29 16 Q16 28 3 16 Z" fill="none" stroke="#f6d58c" stroke-width="2.4"/><circle cx="16" cy="16" r="4" fill="#f6d58c"/></svg>',
    wheat: '<svg viewBox="0 0 32 32"><path d="M16 29 V6" stroke="#f6d58c" stroke-width="2.4"/><ellipse cx="11.5" cy="12" rx="3" ry="5" fill="#f6d58c" transform="rotate(-25 11.5 12)"/><ellipse cx="20.5" cy="12" rx="3" ry="5" fill="#f6d58c" transform="rotate(25 20.5 12)"/><ellipse cx="11.5" cy="20" rx="3" ry="5" fill="#f6d58c" transform="rotate(-25 11.5 20)"/><ellipse cx="20.5" cy="20" rx="3" ry="5" fill="#f6d58c" transform="rotate(25 20.5 20)"/></svg>',
    people: '<svg viewBox="0 0 32 32"><circle cx="11" cy="11" r="4.4" fill="#f6d58c"/><circle cx="22" cy="12" r="3.8" fill="#f6d58c"/><path d="M3 27 Q11 14 19 27 Z" fill="#f6d58c"/><path d="M15 27 Q22 16 29 27 Z" fill="#dccfae"/></svg>',
    well: '<svg viewBox="0 0 32 32"><rect x="6" y="14" width="20" height="13" rx="2" fill="#8a8574"/><rect x="8" y="5" width="2.6" height="10" fill="#f6d58c"/><rect x="21.4" y="5" width="2.6" height="10" fill="#f6d58c"/><rect x="7" y="4" width="18" height="3" fill="#f6d58c"/></svg>',
  };
  return { rng, shade, person, tree, tufts, icon };
})();
