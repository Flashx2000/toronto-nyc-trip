(() => {
  "use strict";

  // ===================================================================
  // Constants
  // ===================================================================
  const KEYS = {
    draft: "trip-draft-v2",
    checks: "trip-checks-v2",
    pass: "trip-pass-v1",
    token: "trip-gh-token-v1"
  };
  const TZ = "America/Toronto";
  const HOME_TZ = "America/Vancouver";
  const ITERATIONS = 310000;
  const DATA_FILE = "trip-data.enc.js";

  const CATS = {
    flight: { label: "Flight", icon: "plane" },
    transit: { label: "Getting there", icon: "train" },
    stay: { label: "Stay", icon: "bed" },
    food: { label: "Food & drink", icon: "food" },
    sight: { label: "Sight", icon: "camera" },
    shop: { label: "Shopping", icon: "bag" },
    work: { label: "Work", icon: "briefcase" },
    free: { label: "Free time", icon: "star" }
  };
  const CITIES = {
    toronto: { name: "Toronto", short: "TOR" },
    nyc: { name: "New York", short: "NYC" },
    home: { name: "Vancouver", short: "YVR" }
  };
  const BOOKING_KINDS = { flight: "plane", stay: "bed", event: "briefcase", other: "ticket" };
  const STATUS = {
    confirmed: { label: "Confirmed", cls: "ok" },
    check: { label: "Double-check", cls: "warn" },
    tbd: { label: "To add", cls: "todo" }
  };

  // ===================================================================
  // Small helpers
  // ===================================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => Math.random().toString(36).slice(2, 9);

  function load(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function drop(key) {
    try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  }

  const ICONS = {
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    train: '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 22-2-3"/>',
    bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    dollar: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="m9 20 3-6 3 3v4"/><path d="m6 12 2-3 4-1 3 3 3 1"/><path d="M12 8 10 14"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>'
  };
  const icon = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  // ===================================================================
  // Illustrations: little skylines drawn in SVG
  // ===================================================================
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function buildings(seed, minH, maxH, fill, opacity, skip) {
    const r = rng(seed);
    let x = -4, out = "";
    while (x < 404) {
      const w = 12 + Math.floor(r() * 18);
      const h = minH + Math.floor(r() * (maxH - minH));
      if (!skip || !skip(x, w)) {
        out += `<rect x="${x}" y="${150 - h}" width="${w}" height="${h}" fill="${fill}" opacity="${opacity}"/>`;
        if (r() > 0.55) out += `<rect x="${x + w / 2 - 1.5}" y="${150 - h - 6}" width="3" height="6" fill="${fill}" opacity="${opacity}"/>`;
      }
      x += w + 1;
    }
    return out;
  }
  function windows(seed, count, color) {
    const r = rng(seed);
    let out = "";
    for (let i = 0; i < count; i++) {
      out += `<rect x="${Math.floor(r() * 400)}" y="${100 + Math.floor(r() * 45)}" width="2" height="3" fill="${color}" opacity="${0.5 + r() * 0.5}"/>`;
    }
    return out;
  }
  function art(kind) {
    const id = "g" + uid();
    if (kind === "toronto") {
      return `<svg class="art" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d7b8"/><stop offset="1" stop-color="#ea8d6f"/></linearGradient></defs>
        <rect width="400" height="150" fill="url(#${id})"/>
        <circle cx="96" cy="62" r="22" fill="#fff4dc" opacity=".85"/>
        ${buildings(7, 18, 52, "#9b3f35", 0.35)}
        <path d="M300 150 Q326 116 352 150 Z" fill="#7a2c26" opacity=".7"/>
        <polygon points="270,150 278,150 276.2,44 271.8,44" fill="#6e2620"/>
        <rect x="265" y="50" width="18" height="7" rx="3.5" fill="#6e2620"/>
        <ellipse cx="274" cy="54" rx="11" ry="4" fill="#6e2620"/>
        <ellipse cx="274" cy="36" rx="4" ry="2.4" fill="#6e2620"/>
        <rect x="273" y="8" width="2" height="36" fill="#6e2620"/>
        ${buildings(19, 14, 40, "#6e2620", 0.85, (x, w) => x + w > 262 && x < 286)}
        ${windows(3, 40, "#ffe7a8")}
        <rect y="144" width="400" height="6" fill="#5a1f1a" opacity=".55"/>
      </svg>`;
    }
    if (kind === "nyc") {
      return `<svg class="art" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d8f2"/><stop offset="1" stop-color="#7b97d6"/></linearGradient></defs>
        <rect width="400" height="150" fill="url(#${id})"/>
        <circle cx="320" cy="48" r="18" fill="#fff6d6" opacity=".9"/>
        ${buildings(11, 30, 70, "#2b3f74", 0.3)}
        <g fill="#1f2d57">
          <rect x="136" y="88" width="34" height="62"/><rect x="141" y="68" width="24" height="22"/>
          <rect x="146" y="52" width="14" height="18"/><rect x="149.5" y="42" width="7" height="12"/>
          <rect x="152" y="16" width="2" height="28"/>
          <rect x="226" y="66" width="20" height="84"/>
          <path d="M226 66 Q236 30 246 66 Z"/><rect x="235" y="22" width="2" height="22"/>
        </g>
        ${buildings(29, 20, 58, "#1f2d57", 0.9, (x, w) => (x + w > 134 && x < 172) || (x + w > 224 && x < 248))}
        ${windows(9, 60, "#ffd66b")}
        <rect y="144" width="400" height="6" fill="#16224a" opacity=".6"/>
      </svg>`;
    }
    if (kind === "home") {
      return `<svg class="art" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4ebe4"/><stop offset="1" stop-color="#8cc4b5"/></linearGradient></defs>
        <rect width="400" height="150" fill="url(#${id})"/>
        <circle cx="300" cy="50" r="18" fill="#fffbe8" opacity=".85"/>
        <polygon points="0,150 70,62 130,118 190,48 260,120 320,70 400,130 400,150" fill="#3f7a6b" opacity=".45"/>
        <polygon points="160,58 190,48 205,62 188,60 175,66" fill="#fff" opacity=".7"/>
        ${buildings(41, 10, 34, "#25574b", 0.9)}
        <rect y="140" width="400" height="10" fill="#1d4a40" opacity=".6"/>
      </svg>`;
    }
    // travel
    return `<svg class="art" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3eef7"/><stop offset="1" stop-color="#a9c7e6"/></linearGradient></defs>
      <rect width="400" height="150" fill="url(#${id})"/>
      <ellipse cx="90" cy="60" rx="40" ry="10" fill="#fff" opacity=".8"/><ellipse cx="300" cy="96" rx="52" ry="12" fill="#fff" opacity=".7"/>
      <path d="M30 130 Q200 -10 370 110" fill="none" stroke="#3d5f8c" stroke-width="2" stroke-dasharray="5 6" opacity=".7"/>
    </svg>`;
  }
  const cityArt = (day) => art(day && day.city === "home" ? "home" : day ? day.city : "travel");
  // A real photo layered over the drawn skyline; if the photo fails to load, the drawing shows through.
  const photoImg = (src, cls = "photo", eager = false) => (safeLink(src)
    ? `<img class="${cls}" src="${esc(src)}" alt="" ${eager ? "" : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`
    : "");
  const bannerArt = (fallback, photo, eager) => fallback + photoImg(photo, "art photo", eager);

  // ===================================================================
  // Encryption (PBKDF2-SHA256 → AES-256-GCM; same as tools/encrypt.mjs)
  // ===================================================================
  const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  function bytesToB64(buf) {
    const bytes = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function deriveKey(pw, salt, iter, usage) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, [usage]);
  }
  async function decrypt(payload, pw) {
    const key = await deriveKey(pw, b64ToBytes(payload.salt), payload.iter || ITERATIONS, "decrypt");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function encrypt(data, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pw, salt, ITERATIONS, "encrypt");
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data)));
    return { v: 1, iter: ITERATIONS, salt: bytesToB64(salt), iv: bytesToB64(iv), ct: bytesToB64(ct) };
  }
  const fileBody = (payload) => "// Encrypted trip itinerary. Unlock it on the page with the trip password.\nwindow.TRIP_ENC = " + JSON.stringify(payload) + ";\n";

  // ===================================================================
  // State
  // ===================================================================
  const S = {
    trip: null,          // what's shown (published + local edits)
    payload: null,       // encrypted payload currently live
    password: null,
    editing: false,
    dirty: false,
    conflict: false,
    sheet: null,         // custom sheet: { type, ... }
    route: { tab: "today" },
    mainKey: ""
  };
  let checks = load(KEYS.checks) || {};

  function normalize(t) {
    t.route = t.route || [];
    t.days = t.days || [];
    t.bookings = t.bookings || [];
    t.contacts = t.contacts || [];
    t.tasks = t.tasks || [];
    t.notes = t.notes || [];
    t.perks = t.perks || [];
    t.guides = t.guides || {};
    const ensure = (o) => { if (!o.id) o.id = uid(); return o; };
    [t.route, t.bookings, t.contacts, t.tasks, t.notes, t.perks].forEach((list) => list.forEach(ensure));
    t.days.forEach((d) => {
      ensure(d);
      d.notes = d.notes || [];
      d.stops = d.stops || [];
      d.stops.forEach((s) => { ensure(s); s.tips = s.tips || []; s.nearby = s.nearby || []; });
    });
    Object.keys(t.guides).forEach((k) => {
      const g = t.guides[k];
      g.facts = (g.facts || []).map(ensure);
      g.sections = (g.sections || []).map(ensure);
      g.sections.forEach((sec) => { sec.items = (sec.items || []).map(ensure); });
    });
    return t;
  }

  // ===================================================================
  // Time
  // ===================================================================
  function nowIn(tz) {
    const parts = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
    return { date: `${parts.year}-${parts.month}-${parts.day}`, min: +parts.hour * 60 + +parts.minute, hour: +parts.hour };
  }
  const clockIn = (tz) => new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : null; };
  function fmtTime(t) {
    const m = toMin(t);
    if (m == null) return "";
    const h = Math.floor(m / 60), mm = m % 60;
    return `${h % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h >= 12 ? "PM" : "AM"}`;
  }
  const fmtRange = (s) => s.time ? fmtTime(s.time) + (s.end ? "–" + fmtTime(s.end) : "") : "";
  function dateObj(d) { return d ? new Date(d + "T12:00:00") : null; }
  function fmtDate(d, opts) {
    const o = dateObj(d);
    if (!o || isNaN(o)) return "";
    return o.toLocaleDateString("en-US", opts || { weekday: "short", month: "short", day: "numeric" });
  }
  const byTime = (a, b) => {
    const am = toMin(a.time), bm = toMin(b.time);
    if (am == null && bm == null) return 0;
    if (am == null) return -1; // untimed stops (e.g. "morning flight") lead the day
    if (bm == null) return 1;
    return am - bm;
  };

  // ===================================================================
  // Trip queries
  // ===================================================================
  const days = () => S.trip.days.slice().sort((a, b) => {
    if (!a.date && !b.date) return S.trip.days.indexOf(a) - S.trip.days.indexOf(b);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
  const dayById = (id) => S.trip.days.find((d) => d.id === id);
  const stopsOf = (d) => d.stops.slice().sort(byTime);
  function findStop(id) {
    for (const d of S.trip.days) {
      const s = d.stops.find((x) => x.id === id);
      if (s) return { day: d, stop: s };
    }
    return null;
  }
  const dayNumber = (d) => days().indexOf(d) + 1;
  function dayLabel(d) {
    if (d.date) return fmtDate(d.date);
    return d.city === "home" ? "Home" : (CITIES[d.city] ? CITIES[d.city].short + " · TBD" : "TBD");
  }
  function todayDay() {
    const now = nowIn(TZ);
    return days().find((d) => d.date === now.date) || null;
  }
  function timeline() {
    const out = [];
    days().forEach((d) => {
      if (!d.date) return;
      stopsOf(d).forEach((s) => {
        const m = toMin(s.time);
        if (m == null) return;
        out.push({ day: d, stop: s, at: d.date + " " + String(m).padStart(4, "0"), end: d.date + " " + String(toMin(s.end) ?? m).padStart(4, "0") });
      });
    });
    return out;
  }
  function nowNext() {
    const n = nowIn(TZ);
    const at = n.date + " " + String(n.min).padStart(4, "0");
    const tl = timeline();
    let current = null, next = null;
    tl.forEach((x, i) => {
      if (x.at <= at && x.day.date === n.date) {
        const following = tl[i + 1];
        const until = x.stop.end ? x.end : following && following.day.date === n.date ? following.at : n.date + " 2359";
        if (at < until) current = x;
      }
      if (!next && x.at > at) next = x;
    });
    return { current, next };
  }
  function stopState(d, s) {
    const n = nowIn(TZ);
    if (!d.date) return "";
    if (d.date < n.date) return "past";
    if (d.date > n.date) return "";
    const nn = nowNext();
    if (nn.current && nn.current.stop === s) return "current";
    const start = toMin(s.time);
    if (start != null && start < n.min) return "past";
    return "";
  }
  const mapsUrl = (place) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place);
  function routeUrl(d) {
    const places = stopsOf(d).map((s) => s.address).filter(Boolean);
    const uniq = places.filter((p, i) => places.indexOf(p) === i);
    if (uniq.length < 2) return null;
    const enc = encodeURIComponent;
    let url = `https://www.google.com/maps/dir/?api=1&origin=${enc(uniq[0])}&destination=${enc(uniq[uniq.length - 1])}`;
    if (uniq.length > 2) url += "&waypoints=" + enc(uniq.slice(1, -1).slice(0, 8).join("|"));
    return url;
  }
  const telHref = (p) => "tel:" + String(p).replace(/[^\d+]/g, "");
  const smsHref = (p) => "sms:" + String(p).replace(/[^\d+]/g, "");
  const safeLink = (u) => (/^https?:\/\//i.test(u || "") ? u : null);

  // ===================================================================
  // Routing (#/today, #/plan/<day>[/<stop>], #/guide/<city>, #/trip)
  // ===================================================================
  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const tab = ["today", "plan", "guide", "trip"].includes(parts[0]) ? parts[0] : "today";
    const r = { tab };
    if (tab === "plan") { r.day = parts[1] || null; r.stop = parts[2] || null; }
    if (tab === "guide") { r.city = parts[1] || null; }
    return r;
  }
  let internalNav = false;
  function go(hash) { internalNav = true; location.hash = hash; }
  const planHref = (d, s) => "#/plan/" + encodeURIComponent(d.id) + (s ? "/" + encodeURIComponent(s.id) : "");

  // ===================================================================
  // Rendering: shell
  // ===================================================================
  function render(force) {
    S.route = parseHash();
    const r = S.route;
    if (r.tab === "guide" && !r.city) {
      const keys = Object.keys(S.trip.guides);
      const t = todayDay();
      location.replace("#/guide/" + (t && S.trip.guides[t.city] ? t.city : keys[0] || "toronto"));
      return;
    }
    renderChrome();
    const key = JSON.stringify([r.tab, r.city, S.editing]);
    const tabChanged = !S.mainKey || JSON.parse(S.mainKey)[0] !== r.tab || JSON.parse(S.mainKey)[1] !== r.city;
    if (force || key !== S.mainKey) {
      S.mainKey = key;
      renderMain();
      if (tabChanged && !force) window.scrollTo(0, 0);
    }
    if (r.tab === "plan") {
      const target = (r.day || "") + "/" + (r.stop || "");
      if (tabChanged || target !== S.scrollTarget) {
        S.scrollTarget = target;
        const smooth = !tabChanged;
        requestAnimationFrame(() => {
          if (r.stop) scrollToEl(document.getElementById("stop-" + r.stop), smooth, true);
          else if (r.day) scrollToEl(document.getElementById("day-" + r.day), smooth);
          else if (tabChanged) { const t = todayDay(); if (t) scrollToEl(document.getElementById("day-" + t.id), false); }
          syncActiveDay(true);
        });
      }
    } else {
      S.scrollTarget = null;
    }
    renderSheet();
  }

  // Sticky offsets: the top bar plus (on Plan) the day strip.
  function stickyOffset() {
    const top = $(".topbar") ? $(".topbar").offsetHeight : 0;
    const strip = $(".plan-toolbar");
    return top + (strip ? strip.offsetHeight : 0) + 8;
  }
  function scrollToEl(el, smooth, flash) {
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
    const far = Math.abs(y - window.scrollY) > window.innerHeight * 1.5;
    window.scrollTo({ top: Math.max(0, y), behavior: smooth && !far ? "smooth" : "auto" });
    if (flash) {
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
    }
  }
  // Highlight the day chip for the section currently under the sticky strip.
  let activeDayId = null;
  function syncActiveDay(force) {
    if (S.route.tab !== "plan") return;
    const sections = document.querySelectorAll(".day-section");
    if (!sections.length) return;
    const line = stickyOffset() + 40;
    let current = sections[0];
    sections.forEach((sec) => { if (sec.getBoundingClientRect().top <= line) current = sec; });
    const id = current.dataset.day;
    if (id === activeDayId && !force) return;
    activeDayId = id;
    const strip = $("#dayStrip");
    if (!strip) return;
    strip.querySelectorAll(".chip-day").forEach((c) => c.classList.toggle("active", c.dataset.day === id));
    const chip = strip.querySelector(`.chip-day[data-day="${CSS.escape(id)}"]`);
    if (chip) strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2, behavior: force ? "auto" : "smooth" });
  }
  let scrollTick = false;
  window.addEventListener("scroll", () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => { scrollTick = false; syncActiveDay(false); });
  }, { passive: true });
  function setTopVar() {
    const tb = $(".topbar");
    if (tb) document.documentElement.style.setProperty("--top-h", tb.offsetHeight + "px");
  }
  window.addEventListener("resize", setTopVar);

  function renderChrome() {
    const t = S.trip;
    $("#brandTitle").textContent = t.title || "Trip";
    $("#brandRoute").textContent = (t.route || []).map((x) => x.code).filter((c, i, a) => a.indexOf(c) === i || i === a.length - 1).join(" · ");
    document.title = (t.title || "Trip") + " · Guide";

    $("#topActions").innerHTML = S.editing
      ? `<button class="btn ghost sm" data-act="publish-sheet">${icon("upload")}<span>Publish</span>${S.dirty ? '<i class="dot"></i>' : ""}</button>
         <button class="btn primary sm" data-act="toggle-edit">Done</button>`
      : `<button class="btn ghost sm" data-act="toggle-edit" aria-label="Edit trip">${icon("pencil")}<span>Edit</span>${S.dirty ? '<i class="dot"></i>' : ""}</button>`;

    const bar = $("#editBar");
    if (S.conflict) {
      bar.hidden = false;
      bar.className = "edit-bar warn";
      bar.innerHTML = `<span>The live plan changed since you started editing on this device.</span>
        <span class="bar-actions"><button class="link" data-act="use-live">Use live</button><button class="link" data-act="keep-mine">Keep mine</button></span>`;
    } else if (S.editing) {
      bar.hidden = false;
      bar.className = "edit-bar";
      bar.innerHTML = `<span>${icon("pencil")} Editing: tap anything to change it. Saves on this device as you type.</span>`;
    } else if (S.dirty) {
      bar.hidden = false;
      bar.className = "edit-bar subtle";
      bar.innerHTML = `<span>You have changes that aren't on the live site yet.</span><button class="link" data-act="publish-sheet">Publish</button>`;
    } else {
      bar.hidden = true;
    }

    const tabs = [["today", "Today", "sun"], ["plan", "Plan", "calendar"], ["guide", "Guide", "compass"], ["trip", "Trip", "ticket"]];
    setTopVar();
    $("#tabbar").innerHTML = `<div class="tabbar-inner">${tabs.map(([k, label, ic]) =>
      `<a href="#/${k}" class="tab ${S.route.tab === k ? "active" : ""}" ${S.route.tab === k ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span></a>`).join("")}</div>`;
  }

  function renderMain() {
    const v = $("#view");
    const r = S.route;
    v.innerHTML = r.tab === "plan" ? viewPlan(r.day) : r.tab === "guide" ? viewGuide(r.city) : r.tab === "trip" ? viewTrip() : viewToday();
  }

  // ===================================================================
  // Today
  // ===================================================================
  function greeting(h) { return h < 5 ? "Up early" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

  function viewToday() {
    const n = nowIn(TZ);
    const all = days();
    const dated = all.filter((d) => d.date);
    const today = todayDay();
    const first = dated[0], last = dated[dated.length - 1];
    let html = "";

    let hero = "", sub = "";
    if (today) {
      hero = esc(today.title);
      sub = `Day ${dayNumber(today)} · ${esc(today.route || CITIES[today.city]?.name || "")}`;
    } else if (first && n.date < first.date) {
      const daysTo = Math.round((dateObj(first.date) - dateObj(n.date)) / 86400000);
      hero = `${daysTo} day${daysTo === 1 ? "" : "s"} to go`;
      sub = "Your trip starts " + fmtDate(first.date, { weekday: "long", month: "long", day: "numeric" });
    } else {
      hero = "On the road";
      sub = last ? "Planned days are done. Add more in Plan." : "";
    }
    const heroDay = today || (first && n.date < first.date ? first : all.find((d) => !d.date) || last);
    html += `<section class="hero">
      ${bannerArt(cityArt(heroDay), heroDay && heroDay.photo, true)}
      <div class="hero-text">
        <p class="eyebrow">${greeting(n.hour)} · ${fmtDate(n.date, { weekday: "long", month: "short", day: "numeric" })}</p>
        <h1>${hero}</h1>
        ${sub ? `<p class="hero-sub">${sub}</p>` : ""}
        <p class="clocks">${icon("clock")} ${clockIn(TZ)} Toronto · ${clockIn(HOME_TZ)} Vancouver</p>
      </div>
    </section>`;

    const { current, next } = nowNext();
    if (current || next) {
      html += `<section class="now-next">`;
      if (current) html += nowCard("Happening now", current, true);
      if (next) html += nowCard(current ? "Up next" : "Next up", next, false);
      html += `</section>`;
    }

    const stayDay = today || heroDay;
    const stay = stayOf(stayDay);
    if (stay && stay.place) html += stayCard(stay, today ? "Tonight you're staying at" : "You'll be staying at");

    if (today) {
      const rem = remindersFor(today);
      if (rem.length) html += card("Reminders", "bell", `<ul class="reminders">${rem.map((x) => `<li>${x}</li>`).join("")}</ul>`, "reminder-card");
      html += card("Today's plan", "calendar", `<ol class="mini-plan">${stopsOf(today).map((s) => miniStop(today, s)).join("")}</ol>
        <a class="more" href="${planHref(today)}">See today in Plan ${icon("right")}</a>`);
      const tomorrow = all[all.indexOf(today) + 1];
      if (tomorrow) {
        const firstStop = stopsOf(tomorrow).find((s) => s.time);
        html += `<a class="card tomorrow" href="${planHref(tomorrow)}">
          <div><p class="eyebrow">Tomorrow · ${esc(dayLabel(tomorrow))}</p>
          <h3>${esc(tomorrow.title)}</h3>
          ${firstStop ? `<p class="muted">Starts ${fmtTime(firstStop.time)} · ${esc(firstStop.title)}</p>` : ""}</div>${icon("right")}</a>`;
      }
    } else if (first && n.date < first.date) {
      html += card("First up", "calendar", `<ol class="mini-plan">${stopsOf(first).map((s) => miniStop(first, s)).join("")}</ol>`);
    }

    const due = S.trip.tasks.filter((t) => !checks[t.id] && t.due && dayById(t.due) && dayById(t.due).date && dayById(t.due).date <= n.date);
    if (due.length) {
      html += card("To do", "check", `<ul class="tasks">${due.map(taskRow).join("")}</ul>`);
    }

    const missing = S.trip.bookings.filter((b) => b.status === "tbd");
    if (missing.length) {
      html += `<a class="card missing" href="#/trip">${icon("alert")}<div><h3>Still to add</h3><p class="muted">${missing.map((b) => esc(b.title)).join(" · ")}</p></div>${icon("right")}</a>`;
    }

    if (S.trip.contacts.length) {
      html += card("Key contacts", "phone", `<ul class="contact-glance">${S.trip.contacts.map((c) => `<li>
        <span><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span>
        ${c.phone ? `<a class="phone-pill" href="${telHref(c.phone)}">${icon("phone")} ${esc(c.phone)}</a>` : ""}</li>`).join("")}</ul>`);
    }

    const event = S.trip.days.find((d) => d.event);
    html += `<section class="quick">
      <a class="quick-btn" href="https://www.google.com/search?q=${encodeURIComponent("weather " + (today ? CITIES[today.city]?.name || "" : "Toronto"))}" target="_blank" rel="noopener">${icon("cloud")}<span>Weather</span></a>
      ${event ? `<a class="quick-btn" href="${planHref(event)}">${icon("briefcase")}<span>Event day</span></a>` : ""}
      <a class="quick-btn" href="#/guide">${icon("compass")}<span>City guide</span></a>
      <a class="quick-btn" href="#/trip">${icon("ticket")}<span>Bookings</span></a>
    </section>`;
    return html;
  }

  function stayCard(stay, label) {
    return `<section class="card stay-card">
      <div class="stay-top"><span class="bubble cat-stay">${icon("bed")}</span>
        <div><p class="eyebrow">${esc(label)}</p><h3>${esc(stay.title)}</h3><p class="stay-addr">${esc(stay.place)}</p></div></div>
      ${stay.details ? `<p class="muted stay-details">${esc(stay.details)}</p>` : ""}
      <div class="stay-actions">
        <a class="btn ghost sm" href="${mapsUrl(stay.place)}" target="_blank" rel="noopener">${icon("pin")} Map</a>
        <a class="btn primary sm" href="${dirUrl(stay.place)}" target="_blank" rel="noopener">${icon("route")} Directions home</a>
      </div>
    </section>`;
  }

  function nowCard(label, x, live) {
    const s = x.stop, c = CATS[s.cat] || CATS.free;
    const sameDay = x.day.date === nowIn(TZ).date;
    return `<a class="now-card ${live ? "live" : ""} cat-${esc(s.cat)}" href="${planHref(x.day, s)}">
      <p class="eyebrow">${live ? '<i class="pulse"></i>' : ""}${label}${sameDay ? "" : " · " + esc(dayLabel(x.day))}</p>
      <div class="now-row"><span class="bubble">${icon(c.icon)}</span>
        <div><h3>${esc(s.title)}</h3><p class="muted">${fmtRange(s)}${s.area ? " · " + esc(s.area) : ""}</p></div></div>
      ${s.reminder ? `<p class="now-reminder">${icon("bell")} ${esc(s.reminder)}</p>` : ""}
    </a>`;
  }
  function miniStop(d, s) {
    const c = CATS[s.cat] || CATS.free;
    return `<li class="${stopState(d, s)}"><a href="${planHref(d, s)}"><span class="t">${fmtTime(s.time) || "·"}</span><span class="bubble sm cat-${esc(s.cat)}">${icon(c.icon)}</span><span class="n">${esc(s.title)}${s.area ? `<small>${esc(s.area)}${s.via ? " · " + esc(s.via) : ""}</small>` : ""}</span></a></li>`;
  }
  function remindersFor(d) {
    const out = d.notes.map(esc);
    stopsOf(d).forEach((s) => {
      if (s.reminder && stopState(d, s) !== "past") out.push(`<a href="${planHref(d, s)}"><b>${fmtTime(s.time) || esc(s.title)}</b> ${esc(s.reminder)}</a>`);
    });
    return out;
  }
  function card(title, ic, body, cls = "") {
    return `<section class="card ${cls}"><h2 class="card-title">${icon(ic)} ${esc(title)}</h2>${body}</section>`;
  }

  // ===================================================================
  // Plan: every day on one scrolling page, every detail visible
  // ===================================================================
  const stayOf = (d) => (d && d.stay ? S.trip.bookings.find((b) => b.id === d.stay) : null);
  const dirUrl = (place) => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(place);

  function viewPlan() {
    const all = days();
    if (!all.length) return `<div class="empty">No days yet.${S.editing ? ` <button class="btn" data-act="add-day">${icon("plus")} Add a day</button>` : ""}</div>`;
    const n = nowIn(TZ);
    const compact = load("trip-density") === "compact";

    let html = `<div class="plan-toolbar"><nav class="day-strip" id="dayStrip" aria-label="Jump to day">${all.map((x) => {
      const o = dateObj(x.date);
      const top = o ? o.toLocaleDateString("en-US", { weekday: "short" }) : (x.city === "home" ? "Fly" : "More");
      const big = o ? o.getDate() : (x.city === "home" ? "Home" : CITIES[x.city]?.short || "TBD");
      return `<button class="chip-day city-${esc(x.city)} ${x.date === n.date ? "today" : ""}" data-act="jump" data-day="${esc(x.id)}">
        <span class="dw">${esc(top)}</span><span class="dn ${o ? "" : "word"}">${esc(big)}</span><i class="city-dot"></i></button>`;
    }).join("")}${S.editing ? `<button class="chip-day add" data-act="add-day" aria-label="Add a day">${icon("plus")}</button>` : ""}</nav></div>
      <div class="plan-controls"><p class="muted">${all.length} days · tap a date to jump</p>
      <div class="density" role="radiogroup" aria-label="Detail level">
        <button data-act="density" data-val="detailed" class="${compact ? "" : "on"}" role="radio" aria-checked="${!compact}">Detailed</button>
        <button data-act="density" data-val="compact" class="${compact ? "on" : ""}" role="radio" aria-checked="${compact}">Compact</button>
      </div></div>`;

    html += `<div class="days ${compact ? "compact" : ""}">${all.map((d, i) => daySection(d, i)).join("")}</div>`;
    if (S.editing) html += `<button class="add-row" data-act="add-day">${icon("plus")} Add a day</button>`;
    return html;
  }

  function daySection(d, idx) {
    const n = nowIn(TZ);
    const rUrl = routeUrl(d);
    const stay = stayOf(d);
    const stops = stopsOf(d);
    let html = `<section class="day-section city-${esc(d.city)} ${d.date === n.date ? "is-today" : ""}" id="day-${esc(d.id)}" data-day="${esc(d.id)}">
      <header class="day-banner">
        ${bannerArt(cityArt(d), d.photo, idx < 2)}
        <div class="day-banner-text">
          <p class="eyebrow">Day ${idx + 1} · ${d.date ? fmtDate(d.date, { weekday: "long", month: "long", day: "numeric" }) : "Dates to come"}${d.date === n.date ? ' · <span class="today-tag">Today</span>' : ""}</p>
          <h2>${esc(d.title)}</h2>
          ${d.route ? `<p class="route-chip">${icon("route")} ${esc(d.route)}</p>` : ""}
        </div>
      </header>`;
    if (d.summary) html += `<p class="lede">${esc(d.summary)}</p>`;

    const facts = [];
    if (stay && stay.place) facts.push(`<a class="day-fact" href="${mapsUrl(stay.place)}" target="_blank" rel="noopener">${icon("bed")}<span><small>Staying at</small>${esc(stay.place)}</span>${icon("external", "end")}</a>`);
    if (rUrl) facts.push(`<a class="day-fact" href="${rUrl}" target="_blank" rel="noopener">${icon("map")}<span><small>Today's route</small>Open every stop in Google Maps</span>${icon("external", "end")}</a>`);
    if (S.editing) facts.push(`<button class="day-fact" data-act="edit" data-type="day" data-id="${esc(d.id)}">${icon("pencil")}<span><small>Editing</small>Edit this day's title, date & notes</span></button>`);
    if (facts.length) html += `<div class="day-facts">${facts.join("")}</div>`;

    if (d.notes.length) html += `<div class="callout">${icon("bell")}<div><h3>Heads up</h3><ul>${d.notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>`;

    html += `<ol class="timeline">`;
    stops.forEach((s, i) => {
      if (i > 0 && s.via) html += `<li class="via">${icon("walk")}<span>${esc(s.via)}</span></li>`;
      html += stopCard(d, s);
    });
    html += `</ol>`;
    if (!stops.length) html += `<div class="empty soft">${icon("sparkle")}<p>Nothing planned here yet.</p>${S.trip.guides[d.city] ? `<a class="btn ghost sm" href="#/guide/${esc(d.city)}">Browse the ${esc(CITIES[d.city]?.name || "")} guide</a>` : ""}</div>`;
    if (S.editing) html += `<button class="add-row" data-act="add-stop" data-day="${esc(d.id)}">${icon("plus")} Add a stop to ${esc(dayLabel(d))}</button>`;
    return html + `</section>`;
  }

  function stopCard(d, s) {
    const c = CATS[s.cat] || CATS.free;
    const state = stopState(d, s);
    const chips = [];
    if (s.address) chips.push(`<a class="meta" href="${mapsUrl(s.address)}" target="_blank" rel="noopener">${icon("pin")}<span>${esc(s.address.replace(/,\s*(Toronto|New York|Brooklyn|Queens)(,.*)?$/i, ""))}</span></a>`);
    if (s.hours) chips.push(`<span class="meta">${icon("clock")}<span>${esc(s.hours)}</span></span>`);
    if (s.cost) chips.push(`<span class="meta">${icon("dollar")}<span>${esc(s.cost)}</span></span>`);
    if (s.booking === "book") chips.push(`<span class="meta warn">${icon("ticket")}<span>Book ahead</span></span>`);
    if (s.booking === "booked") chips.push(`<span class="meta ok">${icon("check")}<span>Booked</span></span>`);
    if (safeLink(s.link)) chips.push(`<a class="meta" href="${esc(s.link)}" target="_blank" rel="noopener">${icon("external")}<span>${esc(s.link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</span></a>`);
    const edit = S.editing ? ` data-act="edit" data-type="stop" data-id="${esc(s.id)}" role="button" tabindex="0"` : "";
    return `<li class="stop ${state} cat-${esc(s.cat)}" id="stop-${esc(s.id)}">
      <div class="stop-time">${s.time ? `<b>${fmtTime(s.time)}</b>${s.end ? `<span>to ${fmtTime(s.end)}</span>` : ""}` : ""}</div>
      <div class="stop-rail"><span class="bubble">${icon(c.icon)}</span></div>
      <div class="stop-body ${S.editing ? "editable" : ""} ${safeLink(s.photo) ? "has-photo" : ""}"${edit}>
        ${safeLink(s.photo) ? `<figure class="stop-photo detail">${photoImg(s.photo)}</figure>` : ""}
        ${s.time ? `<p class="stop-when">${fmtRange(s)}</p>` : ""}
        <p class="eyebrow">${esc(c.label)}${s.area ? " · " + esc(s.area) : ""}${state === "current" ? ' · <span class="live-tag">Now</span>' : ""}</p>
        <h3>${esc(s.title)}${S.editing ? icon("pencil", "edit-ic") : ""}</h3>
        ${s.reminder ? `<p class="stop-reminder">${icon("bell")}<span>${esc(s.reminder)}</span></p>` : ""}
        ${s.desc ? `<p class="stop-desc detail">${esc(s.desc)}</p>` : ""}
        ${s.tips.length ? `<ul class="stop-tips detail">${s.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        ${chips.length ? `<div class="metas">${chips.join("")}</div>` : ""}
        ${s.nearby.length ? `<p class="stop-nearby detail"><b>Nearby:</b> ${s.nearby.map((x) => `<a href="${mapsUrl(x.title + (CITIES[d.city] ? ", " + CITIES[d.city].name : ""))}" target="_blank" rel="noopener">${esc(x.title)}</a>${x.note ? ` (${esc(x.note)})` : ""}`).join(" · ")}</p>` : ""}
      </div>
    </li>`;
  }

  // ===================================================================
  // Guide
  // ===================================================================
  function viewGuide(cityId) {
    const keys = Object.keys(S.trip.guides);
    const g = S.trip.guides[cityId];
    let html = `<nav class="segmented" aria-label="City">${keys.map((k) =>
      `<a href="#/guide/${esc(k)}" class="${k === cityId ? "active" : ""}">${esc(S.trip.guides[k].name || k)}</a>`).join("")}</nav>`;
    if (!g) return html + `<div class="empty">No guide for this city yet.</div>`;

    html += `<section class="day-hero city-${esc(cityId)}">${bannerArt(art(cityId), g.photo, true)}<div class="day-hero-text">
      <p class="eyebrow">City guide</p><h1>${esc(g.name)}</h1>${g.tagline ? `<p class="hero-sub">${esc(g.tagline)}</p>` : ""}</div></section>`;

    if (g.base) {
      html += `<section class="card stay-card">
        <div class="stay-top"><span class="bubble cat-stay">${icon("bed")}</span>
          <div><p class="eyebrow">Where you're staying</p><h3>${esc(g.base.title)}</h3><p class="stay-addr">${esc(g.base.address)}</p></div></div>
        ${g.base.points && g.base.points.length ? `<ul class="base-points">${g.base.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        <div class="stay-actions"><a class="btn ghost sm" href="${mapsUrl(g.base.address)}" target="_blank" rel="noopener">${icon("pin")} Map</a>
          <a class="btn primary sm" href="${dirUrl(g.base.address)}" target="_blank" rel="noopener">${icon("route")} Directions</a></div>
      </section>`;
    }
    html += `<section class="facts">${g.facts.map((f) =>
      `<${S.editing ? `button data-act="edit" data-type="fact" data-id="${esc(f.id)}"` : "div"} class="fact"><small>${esc(f.label)}</small><b>${esc(f.value)}</b></${S.editing ? "button" : "div"}>`).join("")}
      ${S.editing ? `<button class="fact add" data-act="add-fact" data-city="${esc(cityId)}">${icon("plus")} Add</button>` : ""}</section>`;

    g.sections.forEach((sec) => {
      html += `<section class="card guide-sec"><h2 class="card-title">${esc(sec.title)}</h2><ul class="guide-list">`;
      sec.items.forEach((it) => {
        const linked = it.stop ? findStop(it.stop) : null;
        const place = it.place || (linked && linked.stop.address) || "";
        const inner = `<div class="gi-text"><b>${esc(it.title)}</b>${it.desc ? `<span>${esc(it.desc)}</span>` : ""}
            ${linked ? `<a class="on-plan" href="${planHref(linked.day, linked.stop)}">${icon("calendar")} On your plan · ${esc(dayLabel(linked.day))}${linked.stop.time ? " " + fmtTime(linked.stop.time) : ""}</a>` : ""}</div>`;
        if (S.editing) {
          html += `<li><button class="gi editable" data-act="edit" data-type="guideItem" data-id="${esc(it.id)}">${inner}${icon("pencil", "end")}</button></li>`;
        } else {
          const thumb = linked && safeLink(linked.stop.photo) ? `<span class="gi-thumb">${photoImg(linked.stop.photo.replace("/960px-", "/330px-"))}</span>` : "";
          html += `<li><div class="gi">${thumb}${inner}${place ? `<a class="map-btn" href="${mapsUrl(place)}" target="_blank" rel="noopener" aria-label="Open ${esc(it.title)} in Maps">${icon("pin")}</a>` : ""}</div></li>`;
        }
      });
      html += `</ul>${S.editing ? `<button class="add-row inline" data-act="add-guide-item" data-city="${esc(cityId)}" data-sec="${esc(sec.id)}">${icon("plus")} Add to ${esc(sec.title)}</button>` : ""}</section>`;
    });

    const places = [];
    days().filter((d) => d.city === cityId).forEach((d) => stopsOf(d).forEach((s) => { if (s.address) places.push({ d, s }); }));
    if (places.length) {
      html += `<section class="card"><h2 class="card-title">${icon("pin")} Your places in ${esc(g.name)}</h2><ul class="places">${places.map(({ d, s }) =>
        `<li><a href="${mapsUrl(s.address)}" target="_blank" rel="noopener"><span class="bubble sm cat-${esc(s.cat)}">${icon((CATS[s.cat] || CATS.free).icon)}</span>
          <span><b>${esc(s.title)}</b><small>${esc(dayLabel(d))}${s.time ? " · " + fmtTime(s.time) : ""}</small></span>${icon("external", "end")}</a></li>`).join("")}</ul></section>`;
    }
    return html;
  }

  // ===================================================================
  // Trip (bookings, contacts, checklist, notes, settings)
  // ===================================================================
  function viewTrip() {
    const t = S.trip;
    let html = `<section class="route-card card">
      <h2 class="card-title">${icon("route")} The route</h2>
      <ol class="route-line">${t.route.map((r) => `<li ${S.editing ? `data-act="edit" data-type="route" data-id="${esc(r.id)}" class="editable"` : ""}><i></i><b>${esc(r.code)}</b><span>${esc(r.city)}</span><small>${esc(r.when)}</small></li>`).join("")}</ol>
      ${S.editing ? `<button class="add-row inline" data-act="add" data-type="route">${icon("plus")} Add a stop on the route</button>` : ""}
    </section>`;

    const missing = t.bookings.filter((b) => b.status === "tbd");
    if (missing.length) {
      html += `<section class="callout warn">${icon("alert")}<div><h3>Still to add</h3><p>${missing.map((b) => esc(b.title)).join(", ")}. Tap Edit, then the booking, to fill it in.</p></div></section>`;
    }

    html += `<section class="card"><h2 class="card-title">${icon("ticket")} Bookings</h2><div class="bookings">${t.bookings.map(bookingCard).join("")}</div>
      ${S.editing ? `<button class="add-row inline" data-act="add" data-type="booking">${icon("plus")} Add a booking</button>` : ""}</section>`;

    if (t.perks.length || S.editing) {
      html += `<section class="card"><h2 class="card-title">${icon("star")} Card perks <span class="count">Visa Infinite Privilege</span></h2>
        <ul class="perks">${t.perks.map((x) => `<li>${S.editing ? `<button class="perk editable" data-act="edit" data-type="perk" data-id="${esc(x.id)}">` : `<div class="perk">`}
          <b>${esc(x.title)}</b><span>${esc(x.desc)}</span>${S.editing ? `</button>` : `</div>`}</li>`).join("")}</ul>
        ${S.editing ? `<button class="add-row inline" data-act="add" data-type="perk">${icon("plus")} Add a perk</button>` : ""}</section>`;
    }

    html += `<section class="card"><h2 class="card-title">${icon("user")} Contacts</h2><ul class="contacts">${t.contacts.map((c) => `<li>
        ${S.editing ? `<button class="contact-main editable" data-act="edit" data-type="contact" data-id="${esc(c.id)}">` : `<div class="contact-main">`}
          <span class="avatar">${esc((c.name || "?").slice(0, 1))}</span><span><b>${esc(c.name)}</b><small>${esc(c.role)}</small>${c.phone ? `<small class="mono">${esc(c.phone)}</small>` : ""}</span>
        ${S.editing ? `</button>` : `</div>`}
        <span class="contact-actions">
          ${c.phone ? `<a class="icon-btn" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">${icon("phone")}</a>` : ""}
          ${c.phone && c.phone.replace(/\D/g, "").length > 4 ? `<a class="icon-btn" href="${smsHref(c.phone)}" aria-label="Text ${esc(c.name)}">${icon("message")}</a>` : ""}
          ${c.email ? `<a class="icon-btn" href="mailto:${esc(c.email)}" aria-label="Email ${esc(c.name)}">${icon("mail")}</a>` : ""}
        </span></li>`).join("")}</ul>
      ${S.editing ? `<button class="add-row inline" data-act="add" data-type="contact">${icon("plus")} Add a contact</button>` : ""}</section>`;

    const groups = [];
    t.tasks.forEach((x) => { const g = x.group || "Other"; if (!groups.includes(g)) groups.push(g); });
    const done = t.tasks.filter((x) => checks[x.id]).length;
    html += `<section class="card"><h2 class="card-title">${icon("check")} Checklist <span class="count">${done}/${t.tasks.length}</span></h2>
      <div class="progress"><i style="width:${t.tasks.length ? Math.round((done / t.tasks.length) * 100) : 0}%"></i></div>
      ${groups.map((g) => `<h3 class="sub">${esc(g)}</h3><ul class="tasks">${t.tasks.filter((x) => (x.group || "Other") === g).map(taskRow).join("")}</ul>`).join("")}
      ${S.editing ? `<button class="add-row inline" data-act="add" data-type="task">${icon("plus")} Add a task</button>` : ""}</section>`;

    html += `<section class="card"><h2 class="card-title">${icon("note")} Notes</h2><div class="notes">${t.notes.map((x) =>
      `<${S.editing ? `button data-act="edit" data-type="note" data-id="${esc(x.id)}"` : "div"} class="note-card ${S.editing ? "editable" : ""}"><b>${esc(x.title)}</b><p>${esc(x.body)}</p></${S.editing ? "button" : "div"}>`).join("")}</div>
      ${S.editing ? `<button class="add-row inline" data-act="add" data-type="note">${icon("plus")} Add a note</button>` : `<button class="add-row inline" data-act="quick-note">${icon("plus")} Add a note</button>`}</section>`;

    if (t.photoCredits && t.photoCredits.length) {
      html += `<details class="card credits"><summary>${icon("camera")} Photo credits</summary><p class="muted">Photos from Wikimedia Commons.</p>
        <ul>${t.photoCredits.map((c) => `<li>${safeLink(c.page) ? `<a href="${esc(c.page)}" target="_blank" rel="noopener">${esc(c.label)}</a>` : esc(c.label)}: ${esc(c.credit)}</li>`).join("")}</ul></details>`;
    }

    const tokenOn = !!load(KEYS.token);
    html += `<section class="card settings"><h2 class="card-title">${icon("key")} Edit & share</h2>
      <button class="setting" data-act="toggle-edit">${icon("pencil")}<span><b>${S.editing ? "Finish editing" : "Edit the trip"}</b><small>Change anything: stops, guides, bookings, notes.</small></span>${icon("right", "end")}</button>
      <button class="setting" data-act="publish-sheet">${icon("upload")}<span><b>Publish changes</b><small>${S.dirty ? "You have unpublished changes." : "Everything is up to date."}${tokenOn ? " One tap: GitHub is connected." : ""}</small></span>${icon("right", "end")}</button>
      <button class="setting" data-act="password-sheet">${icon("lock")}<span><b>Change password</b><small>Re-encrypts the trip with a new password.</small></span>${icon("right", "end")}</button>
      <button class="setting" data-act="backup">${icon("download")}<span><b>Download a backup</b><small>Saves the encrypted trip file.</small></span>${icon("right", "end")}</button>
      <button class="setting" data-act="import">${icon("upload")}<span><b>Restore from a file</b><small>Load a backup or exported trip file.</small></span>${icon("right", "end")}</button>
      <button class="setting" data-act="lock">${icon("lock")}<span><b>Lock this device</b><small>Forget the saved password here.</small></span>${icon("right", "end")}</button>
    </section>`;
    return html;
  }

  function bookingCard(b) {
    const st = STATUS[b.status] || STATUS.confirmed;
    const tag = S.editing ? "button" : "div";
    return `<${tag} class="booking ${S.editing ? "editable" : ""}" ${S.editing ? `data-act="edit" data-type="booking" data-id="${esc(b.id)}"` : ""}>
      <span class="bubble">${icon(BOOKING_KINDS[b.kind] || "ticket")}</span>
      <span class="booking-text">
        <span class="booking-top"><b>${esc(b.title)}</b><span class="status ${st.cls}">${st.label}</span></span>
        ${b.when ? `<small>${esc(b.when)}</small>` : ""}
        ${b.place ? (S.editing ? `<small>${esc(b.place)}</small>` : `<a class="small-link" href="${mapsUrl(b.place)}" target="_blank" rel="noopener">${icon("pin")} ${esc(b.place)}</a>`) : ""}
        ${b.details ? `<small class="details">${esc(b.details)}</small>` : ""}
        ${b.ref ? `<small class="mono">Ref: ${esc(b.ref)}</small>` : ""}
      </span></${tag}>`;
  }
  function taskRow(x) {
    const on = !!checks[x.id];
    return `<li class="task ${on ? "done" : ""}">
      <label><input type="checkbox" data-check="${esc(x.id)}" ${on ? "checked" : ""}><span class="box">${icon("check")}</span><span class="txt">${esc(x.text)}</span></label>
      ${S.editing ? `<button class="icon-btn sm" data-act="edit" data-type="task" data-id="${esc(x.id)}" aria-label="Edit task">${icon("pencil")}</button>` : ""}
    </li>`;
  }

  // ===================================================================
  // Editor (one sheet, schema-driven)
  // ===================================================================
  const SCHEMAS = {
    stop: { title: "Stop", fields: [
      { k: "title", label: "Name", type: "text", ph: "Where are you going?" },
      { k: "cat", label: "Type", type: "chips", options: Object.keys(CATS).map((k) => [k, CATS[k].label]) },
      { row: [{ k: "time", label: "Start", type: "time" }, { k: "end", label: "End", type: "time" }] },
      { k: "area", label: "Area", type: "text", ph: "Neighbourhood" },
      { k: "address", label: "Address or place name", type: "text", ph: "Used for the Maps buttons" },
      { k: "desc", label: "What it is", type: "textarea", ph: "Why go, what to expect" },
      { k: "tips", label: "Tips", type: "lines", ph: "One tip per line" },
      { k: "reminder", label: "Reminder", type: "textarea", ph: "Shows on Today and the day's plan" },
      { k: "booking", label: "Booking", type: "chips", options: [["", "Not needed"], ["book", "Book ahead"], ["booked", "Booked"]] },
      { row: [{ k: "hours", label: "Hours", type: "text" }, { k: "cost", label: "Cost", type: "text" }] },
      { k: "via", label: "Getting there", type: "text", ph: "e.g. 10-min walk · Line 1 north" },
      { k: "link", label: "Website or booking link", type: "url", ph: "https://" },
      { k: "nearby", label: "Nearby ideas", type: "pairs", ph: "Name — short note (one per line)" },
      { k: "photo", label: "Photo link", type: "url", ph: "https://… (any image address)" },
      { k: "_day", label: "Day", type: "day" }
    ]},
    day: { title: "Day", fields: [
      { k: "title", label: "Title", type: "text" },
      { row: [{ k: "date", label: "Date", type: "date" }, { k: "city", label: "City", type: "select", options: Object.keys(CITIES).map((k) => [k, CITIES[k].name]) }] },
      { k: "route", label: "Route label", type: "text", ph: "e.g. Toronto → New York" },
      { k: "summary", label: "Summary", type: "textarea" },
      { k: "notes", label: "Heads-up notes", type: "lines", ph: "One per line, shown at the top of the day and on Today" },
      { k: "photo", label: "Banner photo link", type: "url", ph: "https://… (any image address)" },
      { k: "event", label: "Event day", type: "toggle" }
    ]},
    booking: { title: "Booking", fields: [
      { k: "title", label: "Title", type: "text" },
      { k: "kind", label: "Type", type: "chips", options: [["flight", "Flight"], ["stay", "Stay"], ["event", "Event"], ["other", "Other"]] },
      { k: "status", label: "Status", type: "chips", options: [["confirmed", "Confirmed"], ["check", "Double-check"], ["tbd", "To add"]] },
      { k: "when", label: "When", type: "text", ph: "e.g. Sun Oct 18 · 7:25 AM" },
      { k: "place", label: "Where", type: "text", ph: "Address, airport or hotel" },
      { k: "ref", label: "Confirmation #", type: "text" },
      { k: "details", label: "Details", type: "textarea" }
    ]},
    contact: { title: "Contact", fields: [
      { k: "name", label: "Name", type: "text" },
      { k: "role", label: "Role", type: "text" },
      { row: [{ k: "phone", label: "Phone", type: "tel" }, { k: "email", label: "Email", type: "email" }] }
    ]},
    task: { title: "Task", fields: [
      { k: "text", label: "Task", type: "text" },
      { k: "group", label: "Group", type: "text", list: "taskGroups" },
      { k: "due", label: "Show on Today from", type: "daySelect" }
    ]},
    perk: { title: "Perk", fields: [
      { k: "title", label: "Perk", type: "text" },
      { k: "desc", label: "Details", type: "textarea" }
    ]},
    note: { title: "Note", fields: [
      { k: "title", label: "Title", type: "text" },
      { k: "body", label: "Note", type: "textarea", rows: 6 }
    ]},
    guideItem: { title: "Guide item", fields: [
      { k: "title", label: "Name", type: "text" },
      { k: "desc", label: "Description", type: "textarea" },
      { k: "place", label: "Place for Maps", type: "text", ph: "Optional" },
      { k: "stop", label: "Linked stop on your plan", type: "stopSelect" }
    ]},
    fact: { title: "Quick fact", fields: [
      { row: [{ k: "label", label: "Label", type: "text" }, { k: "value", label: "Value", type: "text" }] }
    ]},
    route: { title: "Route stop", fields: [
      { row: [{ k: "code", label: "Code", type: "text", ph: "YVR" }, { k: "city", label: "City", type: "text" }] },
      { k: "when", label: "When", type: "text" }
    ]}
  };

  // Where an editable object lives, so the editor can update or delete it.
  function locate(type, id) {
    const t = S.trip;
    if (type === "stop") { const f = findStop(id); return f && { obj: f.stop, list: f.day.stops, day: f.day }; }
    if (type === "day") { const d = dayById(id); return d && { obj: d, list: t.days }; }
    const lists = { booking: t.bookings, contact: t.contacts, task: t.tasks, note: t.notes, route: t.route, perk: t.perks };
    if (lists[type]) { const o = lists[type].find((x) => x.id === id); return o && { obj: o, list: lists[type] }; }
    for (const k of Object.keys(t.guides)) {
      const g = t.guides[k];
      if (type === "fact") { const o = g.facts.find((x) => x.id === id); if (o) return { obj: o, list: g.facts }; }
      if (type === "guideItem") {
        for (const sec of g.sections) { const o = sec.items.find((x) => x.id === id); if (o) return { obj: o, list: sec.items }; }
      }
    }
    return null;
  }

  function fieldHtml(f, obj, type) {
    if (f.row) return `<div class="f-row">${f.row.map((x) => fieldHtml(x, obj, type)).join("")}</div>`;
    const id = "f_" + f.k;
    const v = obj[f.k];
    const label = `<label class="f-label" for="${id}">${esc(f.label)}</label>`;
    switch (f.type) {
      case "textarea":
        return `<div class="field">${label}<textarea id="${id}" data-k="${f.k}" rows="${f.rows || Math.min(9, Math.max(3, Math.ceil(String(v || "").length / 36)))}" placeholder="${esc(f.ph || "")}">${esc(v || "")}</textarea></div>`;
      case "lines":
        return `<div class="field">${label}<textarea id="${id}" data-k="${f.k}" data-type="lines" rows="${Math.max(3, (v || []).length + 1)}" placeholder="${esc(f.ph || "")}">${esc((v || []).join("\n"))}</textarea></div>`;
      case "pairs":
        return `<div class="field">${label}<textarea id="${id}" data-k="${f.k}" data-type="pairs" rows="3" placeholder="${esc(f.ph || "")}">${esc((v || []).map((x) => x.title + (x.note ? " — " + x.note : "")).join("\n"))}</textarea></div>`;
      case "chips":
        return `<div class="field"><span class="f-label">${esc(f.label)}</span><div class="chips" role="radiogroup">${f.options.map(([val, lab]) =>
          `<button type="button" class="chip ${String(v || "") === val ? "on" : ""}" data-chip="${f.k}" data-val="${esc(val)}" role="radio" aria-checked="${String(v || "") === val}">${esc(lab)}</button>`).join("")}</div></div>`;
      case "select":
        return `<div class="field">${label}<select id="${id}" data-k="${f.k}">${f.options.map(([val, lab]) => `<option value="${esc(val)}" ${v === val ? "selected" : ""}>${esc(lab)}</option>`).join("")}</select></div>`;
      case "toggle":
        return `<label class="field toggle-field"><span class="f-label">${esc(f.label)}</span><input type="checkbox" data-k="${f.k}" data-type="bool" ${v ? "checked" : ""}><span class="switch"></span></label>`;
      case "day": {
        const loc = locate("stop", obj.id);
        return `<div class="field">${label}<select id="${id}" data-move-day>${days().map((d) => `<option value="${esc(d.id)}" ${loc && loc.day === d ? "selected" : ""}>${esc(dayLabel(d))} · ${esc(d.title)}</option>`).join("")}</select></div>`;
      }
      case "daySelect":
        return `<div class="field">${label}<select id="${id}" data-k="${f.k}"><option value="">Not tied to a day</option>${days().map((d) => `<option value="${esc(d.id)}" ${v === d.id ? "selected" : ""}>${esc(dayLabel(d))} · ${esc(d.title)}</option>`).join("")}</select></div>`;
      case "stopSelect":
        return `<div class="field">${label}<select id="${id}" data-k="${f.k}"><option value="">None</option>${days().map((d) => `<optgroup label="${esc(dayLabel(d))}">${stopsOf(d).map((s) => `<option value="${esc(s.id)}" ${v === s.id ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</optgroup>`).join("")}</select></div>`;
      default: {
        const listAttr = f.list ? ` list="${f.list}"` : "";
        const dl = f.list === "taskGroups" ? `<datalist id="taskGroups">${[...new Set(S.trip.tasks.map((x) => x.group).filter(Boolean))].map((g) => `<option value="${esc(g)}">`).join("")}</datalist>` : "";
        return `<div class="field">${label}<input id="${id}" type="${f.type || "text"}" data-k="${f.k}" value="${esc(v || "")}" placeholder="${esc(f.ph || "")}"${listAttr}>${dl}</div>`;
      }
    }
  }

  function editorSheet(sh) {
    const loc = locate(sh.etype, sh.id);
    if (!loc) return `<div class="sheet-body"><p>That item no longer exists.</p></div>`;
    const schema = SCHEMAS[sh.etype];
    return `<div class="sheet-head">
        <div class="sheet-head-text"><p class="eyebrow">${sh.isNew ? "New" : "Edit"} ${esc(schema.title.toLowerCase())}</p></div>
        <span class="saved" id="savedIndicator">${icon("check")} Saved</span>
        <button class="btn primary sm" data-act="close-sheet">Done</button>
      </div>
      <form class="sheet-body editor" data-etype="${sh.etype}" data-id="${esc(sh.id)}" onsubmit="return false">
        ${schema.fields.map((f) => fieldHtml(f, loc.obj, sh.etype)).join("")}
        <button type="button" class="btn danger-ghost block" data-act="delete" data-confirm="0">${icon("trash")} Delete ${esc(schema.title.toLowerCase())}</button>
      </form>`;
  }

  function onEditorInput(e) {
    const form = e.target.closest("form.editor");
    if (!form) return;
    const loc = locate(form.dataset.etype, form.dataset.id);
    if (!loc) return;
    const el = e.target;
    if (el.matches("[data-move-day]")) {
      const target = dayById(el.value);
      if (target && target !== loc.day) {
        loc.list.splice(loc.list.indexOf(loc.obj), 1);
        target.stops.push(loc.obj);
      }
    } else if (el.dataset.k) {
      const k = el.dataset.k, type = el.dataset.type;
      if (type === "lines") loc.obj[k] = el.value.split("\n").map((x) => x.trim()).filter(Boolean);
      else if (type === "pairs") loc.obj[k] = el.value.split("\n").map((x) => x.trim()).filter(Boolean).map((x) => {
        const [title, ...rest] = x.split(/\s+[—–-]\s+/);
        return { title: title.trim(), note: rest.join(" — ").trim() };
      });
      else if (type === "bool") loc.obj[k] = el.checked;
      else loc.obj[k] = el.value;
    }
    changed();
  }

  // ===================================================================
  // Other sheets: publish, password, quick note
  // ===================================================================
  function repoSlug() {
    if (S.trip.repo && /^[\w.-]+\/[\w.-]+$/.test(S.trip.repo)) return S.trip.repo;
    const host = location.hostname.match(/^([\w-]+)\.github\.io$/);
    const repo = location.pathname.split("/").filter(Boolean)[0];
    return host && repo ? host[1] + "/" + repo : "";
  }

  function publishSheet(sh) {
    const token = load(KEYS.token);
    const slug = repoSlug();
    const head = `<div class="sheet-head"><div class="sheet-head-text"><p class="eyebrow">Publish</p></div><button class="icon-btn" data-act="close-sheet" aria-label="Close">${icon("x")}</button></div>`;
    let body = `<h2 class="sheet-title">${S.dirty ? "Put your changes live" : "Everything's up to date"}</h2>
      <p class="muted">${S.dirty ? "Your edits are saved on this device. Publishing encrypts them and updates the live site for everyone with the password." : "There are no unpublished changes on this device."}</p>`;
    if (sh.status) body += `<div class="callout small ${sh.status.ok ? "ok" : "warn"}">${icon(sh.status.ok ? "check" : "alert")}<p>${esc(sh.status.msg)}</p></div>`;

    if (token) {
      body += `<button class="btn primary block lg" data-act="publish-now" ${sh.busy ? "disabled" : ""}>${icon("upload")} ${sh.busy ? "Publishing…" : "Publish now"}</button>
        <p class="fine">Connected to GitHub · ${esc(slug)} · <button class="link" data-act="gh-disconnect">Disconnect</button></p>`;
    } else {
      body += `<div class="steps">
        <h3 class="sub">One-time setup: connect GitHub</h3>
        <ol>
          <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Create a fine-grained token ${icon("external")}</a></li>
          <li>Repository access: <b>Only select repositories</b> → <b>${esc(slug.split("/")[1] || "this repo")}</b></li>
          <li>Permissions → Repository → <b>Contents: Read and write</b></li>
          <li>Generate, copy and paste it here:</li>
        </ol>
        <input type="password" id="ghToken" placeholder="github_pat_…" autocomplete="off">
        <button class="btn primary block" data-act="gh-connect" ${sh.busy ? "disabled" : ""}>${sh.busy ? "Checking…" : "Connect & publish"}</button>
        <p class="fine">The token is stored only on this device and is only sent to GitHub.</p>
      </div>`;
    }
    body += `<div class="divider"><span>or</span></div>
      <button class="btn ghost block" data-act="download-file">${icon("download")} Download the file instead</button>
      <p class="fine">Then on GitHub: Add file → Upload files → drop in <code>${DATA_FILE}</code> → Commit.</p>
      ${S.dirty ? `<button class="btn danger-ghost block" data-act="discard" data-confirm="0">${icon("trash")} Discard my unpublished changes</button>` : ""}`;
    return head + `<div class="sheet-body">${body}</div>`;
  }

  function passwordSheet(sh) {
    return `<div class="sheet-head"><div class="sheet-head-text"><p class="eyebrow">Security</p></div><button class="icon-btn" data-act="close-sheet" aria-label="Close">${icon("x")}</button></div>
      <form class="sheet-body" id="pwForm" onsubmit="return false">
        <h2 class="sheet-title">Change the trip password</h2>
        <p class="muted">Everyone will need the new password. Devices that remembered the old one will ask again.</p>
        ${sh.status ? `<div class="callout small ${sh.status.ok ? "ok" : "warn"}">${icon(sh.status.ok ? "check" : "alert")}<p>${esc(sh.status.msg)}</p></div>` : ""}
        <div class="field"><label class="f-label" for="pw1">New password</label><input id="pw1" type="password" autocomplete="new-password"></div>
        <div class="field"><label class="f-label" for="pw2">Type it again</label><input id="pw2" type="password" autocomplete="new-password"></div>
        <button class="btn primary block" data-act="change-password" ${sh.busy ? "disabled" : ""}>${sh.busy ? "Saving…" : "Change password"}</button>
      </form>`;
  }

  function renderSheet() {
    const root = $("#sheetRoot"), el = $("#sheet");
    let html = "";
    let kind = "";
    if (S.sheet) {
      kind = S.sheet.type;
      html = kind === "editor" ? editorSheet(S.sheet) : kind === "publish" ? publishSheet(S.sheet) : kind === "password" ? passwordSheet(S.sheet) : "";
    }
    if (!html) {
      if (!root.hidden) {
        root.classList.remove("open");
        setTimeout(() => { if (!root.classList.contains("open")) root.hidden = true; }, 220);
      }
      document.documentElement.classList.remove("sheet-open");
      el.dataset.kind = "";
      return;
    }
    const sameKind = el.dataset.kind === kind && !root.hidden;
    const focused = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : null;
    el.innerHTML = html;
    el.dataset.kind = kind;
    if (!sameKind) $(".sheet-body", el) && ($(".sheet-body", el).scrollTop = 0);
    if (focused && document.getElementById(focused)) document.getElementById(focused).focus();
    root.hidden = false;
    document.documentElement.classList.add("sheet-open");
    requestAnimationFrame(() => root.classList.add("open"));
  }

  function openSheet(sheet) { S.sheet = sheet; renderSheet(); }
  function closeSheet() {
    if (S.sheet) {
      S.sheet = null;
      renderMain();
      renderSheet();
    }
  }

  // ===================================================================
  // Mutations
  // ===================================================================
  let saveTimer = null, mainTimer = null;
  function changed() {
    S.dirty = true;
    const draft = load(KEYS.draft);
    save(KEYS.draft, { data: S.trip, base: draft && draft.base !== undefined ? draft.base : (S.payload ? S.payload.ct : null) });
    const ind = $("#savedIndicator");
    if (ind) { ind.classList.remove("show"); void ind.offsetWidth; ind.classList.add("show"); }
    clearTimeout(mainTimer);
    mainTimer = setTimeout(() => { renderChrome(); renderMain(); }, 250);
  }

  function addItem(type, opts) {
    const t = S.trip;
    let obj, list;
    if (type === "stop") { const d = dayById(opts.day); list = d.stops; obj = { id: uid(), title: "", cat: "sight", time: "", tips: [], nearby: [] }; }
    else if (type === "day") {
      const all = days().filter((d) => d.date);
      const last = all[all.length - 1];
      const nd = last ? dateObj(last.date) : new Date();
      nd.setDate(nd.getDate() + 1);
      const iso = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(nd.getDate()).padStart(2, "0")}`;
      list = t.days; obj = { id: uid(), date: iso, city: last ? last.city : "toronto", title: "New day", route: "", summary: "", notes: [], stops: [] };
    }
    else if (type === "booking") { list = t.bookings; obj = { id: uid(), kind: "other", title: "", status: "confirmed", when: "", place: "", details: "", ref: "" }; }
    else if (type === "contact") { list = t.contacts; obj = { id: uid(), name: "", role: "", phone: "", email: "" }; }
    else if (type === "task") { list = t.tasks; obj = { id: uid(), text: "", group: "", due: "" }; }
    else if (type === "note") { list = t.notes; obj = { id: uid(), title: "", body: "" }; }
    else if (type === "perk") { list = t.perks; obj = { id: uid(), title: "", desc: "" }; }
    else if (type === "route") { list = t.route; obj = { id: uid(), code: "", city: "", when: "" }; }
    else if (type === "fact") { list = t.guides[opts.city].facts; obj = { id: uid(), label: "", value: "" }; }
    else if (type === "guideItem") { const sec = t.guides[opts.city].sections.find((x) => x.id === opts.sec); list = sec.items; obj = { id: uid(), title: "", desc: "" }; }
    if (!list) return;
    list.push(obj);
    changed();
    if (type === "day") { go(planHref(obj)); }
    openSheet({ type: "editor", etype: type, id: obj.id, isNew: true });
    setTimeout(() => { const first = $("#sheet input[type=text], #sheet input:not([type])"); if (first) first.focus(); }, 280);
  }

  function deleteItem(etype, id) {
    const loc = locate(etype, id);
    if (!loc) return;
    loc.list.splice(loc.list.indexOf(loc.obj), 1);
    changed();
    S.sheet = null;
    if (etype === "day") go("#/plan");
    renderMain();
    renderSheet();
    toast("Deleted");
  }

  // ===================================================================
  // Publishing
  // ===================================================================
  function download(name, body) {
    const blob = new Blob([body], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  async function ghFetch(path, opts = {}) {
    const token = load(KEYS.token);
    const res = await fetch("https://api.github.com" + path, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: "Bearer " + token, ...(opts.headers || {}) }
    });
    return res;
  }
  async function publishToGitHub(message) {
    const slug = repoSlug();
    if (!slug) throw new Error("Couldn't work out which repo to publish to.");
    const payload = await encrypt(S.trip, S.password);
    const path = `/repos/${slug}/contents/${DATA_FILE}`;
    const cur = await ghFetch(path);
    if (cur.status === 401) throw new Error("GitHub rejected the token. It may have expired. Disconnect and connect again.");
    const sha = cur.ok ? (await cur.json()).sha : undefined;
    const put = await ghFetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message || "Update trip itinerary", content: btoa(fileBody(payload)), sha })
    });
    if (!put.ok) {
      const err = await put.json().catch(() => ({}));
      if (put.status === 403 || put.status === 404) throw new Error("The token can't write to " + slug + ". Check it has Contents: Read and write for this repo.");
      throw new Error(err.message || "GitHub said no (" + put.status + ").");
    }
    S.payload = payload;
    S.dirty = false;
    S.conflict = false;
    drop(KEYS.draft);
  }
  async function doPublish() {
    openSheet({ type: "publish", busy: true });
    try {
      await publishToGitHub();
      openSheet({ type: "publish", status: { ok: true, msg: "Published! The live site updates in about a minute." } });
      renderChrome();
      toast("Published");
    } catch (e) {
      openSheet({ type: "publish", status: { ok: false, msg: e.message } });
    }
  }

  // ===================================================================
  // Toast
  // ===================================================================
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  // ===================================================================
  // Events
  // ===================================================================
  document.addEventListener("click", async (e) => {
    const replaceLink = e.target.closest("a[data-replace]");
    if (replaceLink) { e.preventDefault(); location.replace(replaceLink.getAttribute("href")); return; }

    const a = e.target.closest("[data-act]");
    if (!a) {
      const link = e.target.closest('a[href^="#/"]');
      if (link) internalNav = true;
      return;
    }
    const act = a.dataset.act;
    const ds = a.dataset;

    e.preventDefault();
    switch (act) {
      case "close-sheet": closeSheet(); break;
      case "toggle-edit":
        S.editing = !S.editing;
        S.sheet = null;
        render(true);
        if (!S.editing && S.dirty) toast("Saved on this device. Publish when you're ready.");
        break;
      case "edit":
        if (!S.editing) { S.editing = true; renderChrome(); renderMain(); }
        openSheet({ type: "editor", etype: ds.type, id: ds.id });
        break;
      case "jump": {
        const d = dayById(ds.day);
        if (!d) break;
        history.replaceState(null, "", planHref(d));
        S.route = parseHash();
        S.scrollTarget = d.id + "/";
        scrollToEl(document.getElementById("day-" + d.id), true);
        break;
      }
      case "density": {
        const compact = ds.val === "compact";
        save("trip-density", ds.val);
        const anchor = document.getElementById("day-" + activeDayId);
        $(".days").classList.toggle("compact", compact);
        a.parentElement.querySelectorAll("button").forEach((b) => { const on = b === a; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
        if (anchor) scrollToEl(anchor, false);
        break;
      }
      case "add": addItem(ds.type, {}); break;
      case "add-stop": addItem("stop", { day: ds.day }); break;
      case "add-day": addItem("day", {}); break;
      case "add-fact": addItem("fact", { city: ds.city }); break;
      case "add-guide-item": addItem("guideItem", { city: ds.city, sec: ds.sec }); break;
      case "quick-note": S.editing = true; renderChrome(); addItem("note", {}); break;
      case "delete": {
        if (ds.confirm === "0") { a.dataset.confirm = "1"; a.innerHTML = `${icon("trash")} Tap again to delete`; a.classList.add("armed"); return; }
        const form = a.closest("form.editor");
        deleteItem(form.dataset.etype, form.dataset.id);
        break;
      }
      case "publish-sheet": openSheet({ type: "publish" }); break;
      case "publish-now": doPublish(); break;
      case "gh-connect": {
        const tok = ($("#ghToken") || {}).value || "";
        if (!tok.trim()) { openSheet({ type: "publish", status: { ok: false, msg: "Paste the token first." } }); return; }
        save(KEYS.token, tok.trim());
        openSheet({ type: "publish", busy: true });
        const res = await ghFetch("/repos/" + repoSlug()).catch(() => null);
        if (!res || !res.ok) {
          drop(KEYS.token);
          openSheet({ type: "publish", status: { ok: false, msg: "That token can't see " + repoSlug() + ". Check the repository access setting." } });
          return;
        }
        if (S.dirty) doPublish();
        else openSheet({ type: "publish", status: { ok: true, msg: "Connected. Future edits publish with one tap." } });
        break;
      }
      case "gh-disconnect": drop(KEYS.token); openSheet({ type: "publish" }); break;
      case "download-file": {
        const payload = await encrypt(S.trip, S.password);
        download(DATA_FILE, fileBody(payload));
        toast("Downloaded " + DATA_FILE);
        break;
      }
      case "backup": {
        const payload = await encrypt(S.trip, S.password);
        download(DATA_FILE, fileBody(payload));
        toast("Backup downloaded");
        break;
      }
      case "import": $("#importFile").click(); break;
      case "discard":
        if (ds.confirm === "0") { a.dataset.confirm = "1"; a.innerHTML = `${icon("trash")} Tap again to discard`; a.classList.add("armed"); return; }
        drop(KEYS.draft);
        location.reload();
        break;
      case "password-sheet": openSheet({ type: "password" }); break;
      case "change-password": {
        const p1 = $("#pw1").value, p2 = $("#pw2").value;
        if (p1.length < 6) { openSheet({ type: "password", status: { ok: false, msg: "Use at least 6 characters." } }); return; }
        if (p1 !== p2) { openSheet({ type: "password", status: { ok: false, msg: "The passwords don't match." } }); return; }
        const old = S.password;
        S.password = p1;
        if (load(KEYS.pass)) save(KEYS.pass, p1);
        if (load(KEYS.token)) {
          openSheet({ type: "password", busy: true });
          try {
            await publishToGitHub("Change trip password");
            openSheet({ type: "password", status: { ok: true, msg: "Done. The live site uses the new password in about a minute." } });
          } catch (err) {
            S.password = old;
            if (load(KEYS.pass)) save(KEYS.pass, old);
            openSheet({ type: "password", status: { ok: false, msg: err.message } });
          }
        } else {
          const payload = await encrypt(S.trip, S.password);
          download(DATA_FILE, fileBody(payload));
          openSheet({ type: "password", status: { ok: true, msg: "Downloaded " + DATA_FILE + " with the new password. Upload it to the repo to make it live." } });
        }
        break;
      }
      case "lock": drop(KEYS.pass); location.reload(); break;
      case "use-live": drop(KEYS.draft); location.reload(); break;
      case "keep-mine": {
        S.conflict = false;
        const d = load(KEYS.draft);
        if (d) { d.base = S.payload ? S.payload.ct : null; save(KEYS.draft, d); }
        renderChrome();
        break;
      }
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.closest("form.editor")) onEditorInput(e);
  });
  document.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-check]");
    if (cb) {
      if (cb.checked) checks[cb.dataset.check] = true; else delete checks[cb.dataset.check];
      save(KEYS.checks, checks);
      const li = cb.closest(".task");
      if (li) li.classList.toggle("done", cb.checked);
      const card = cb.closest(".card");
      const count = card && $(".count", card);
      if (count) {
        const done = S.trip.tasks.filter((x) => checks[x.id]).length;
        count.textContent = done + "/" + S.trip.tasks.length;
        const bar = $(".progress i", card);
        if (bar) bar.style.width = Math.round((done / S.trip.tasks.length) * 100) + "%";
      }
      return;
    }
    if (e.target.closest("form.editor") && (e.target.matches("select") || e.target.type === "checkbox")) onEditorInput(e);
  });
  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-chip]");
    if (!chip) return;
    const form = chip.closest("form.editor");
    const loc = form && locate(form.dataset.etype, form.dataset.id);
    if (!loc) return;
    loc.obj[chip.dataset.chip] = chip.dataset.val;
    chip.parentElement.querySelectorAll(".chip").forEach((c) => { const on = c === chip; c.classList.toggle("on", on); c.setAttribute("aria-checked", on); });
    changed();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#sheetRoot").hidden) closeSheet();
  });
  window.addEventListener("hashchange", () => {
    if (S.sheet && S.sheet.type !== "editor") S.sheet = null;
    render();
    internalNav = internalNav && true;
  });

  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result);
      try {
        const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
        const data = parsed.ct ? await decrypt(parsed, S.password) : parsed;
        if (!data || !Array.isArray(data.days)) throw new Error("No trip found in that file.");
        S.trip = normalize(data);
        changed();
        render(true);
        toast("Restored. Publish to make it live.");
      } catch (err) {
        toast(err.name === "OperationError" ? "That file uses a different password" : "Couldn't read that file");
      }
    };
    reader.readAsText(file);
  });

  // ===================================================================
  // Boot: load data → unlock → start
  // ===================================================================
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function start(data) {
    const published = normalize(clone(data));
    const draft = load(KEYS.draft);
    if (draft && draft.data && Array.isArray(draft.data.days)) {
      S.trip = normalize(draft.data);
      S.dirty = true;
      S.conflict = !!(S.payload && draft.base && draft.base !== S.payload.ct);
    } else {
      S.trip = published;
    }
    document.body.classList.remove("locked");
    $("#lock").hidden = true;
    $("#app").hidden = false;
    render(true);
    setInterval(() => {
      if (S.sheet && S.sheet.type === "editor") return;
      if (S.route.tab === "today" || S.route.tab === "plan") { renderMain(); }
    }, 60000);
  }

  function showLock(msg) {
    document.body.classList.add("locked");
    $("#app").hidden = true;
    $("#lock").hidden = false;
    $("#lockArt").innerHTML = art("toronto");
    $("#lockError").textContent = msg || "";
    setTimeout(() => $("#lockPass").focus(), 50);
  }
  async function unlock(pw, remember) {
    const data = await decrypt(S.payload, pw);
    S.password = pw;
    if (remember) save(KEYS.pass, pw); else drop(KEYS.pass);
    start(data);
  }

  $("#lockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#lockSubmit");
    btn.disabled = true;
    btn.textContent = "Unlocking…";
    try {
      await unlock($("#lockPass").value, $("#lockRemember").checked);
    } catch (err) {
      showLock("That password didn't work.");
    }
    btn.disabled = false;
    btn.textContent = "Unlock";
  });

  async function boot() {
    try {
      await loadScript(DATA_FILE + "?v=" + Date.now());
    } catch (e) {
      try { await loadScript("trip-data.js"); } catch (e2) { /* no data */ }
    }
    if (window.TRIP_ENC) {
      S.payload = window.TRIP_ENC;
      const saved = load(KEYS.pass);
      if (saved) {
        try { await unlock(saved, true); return; } catch (e) { drop(KEYS.pass); }
      }
      showLock();
      return;
    }
    if (window.TRIP) { S.password = null; start(window.TRIP); return; }
    showLock("Couldn't load the trip data.");
  }
  boot();
})();
