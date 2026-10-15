(function () {
  "use strict";

  var DATA_KEY = "trip-data-v1";
  var CHECK_KEY = "trip-checks-v1";
  var TAGS = ["travel", "see", "food", "work"];
  var DEFAULT_TZ = "America/Toronto";

  // ---------- storage (never required for the page to work) ----------
  function load(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function drop(key) {
    try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var PASS_KEY = "trip-pass-v1";
  var ITERATIONS = 310000;

  var published = null;
  var trip = null;
  var checks = load(CHECK_KEY) || {};
  var editing = false;
  var password = null;

  function normalize(t) {
    t.keyInfo = t.keyInfo || [];
    t.days = t.days || [];
    t.checklist = t.checklist || [];
    t.tips = t.tips || [];
    t.days.forEach(function (d) { d.items = d.items || []; });
    return t;
  }

  // ---------- encryption (PBKDF2-SHA256 -> AES-256-GCM, same as tools/encrypt.mjs) ----------
  function b64ToBytes(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function bytesToB64(buf) {
    var bytes = new Uint8Array(buf), s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deriveKey(pw, salt, iter, usage) {
    var subtle = window.crypto.subtle;
    return subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: iter, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, [usage]);
    });
  }
  function decrypt(payload, pw) {
    return deriveKey(pw, b64ToBytes(payload.salt), payload.iter || ITERATIONS, "decrypt").then(function (key) {
      return window.crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ct));
    }).then(function (plain) { return JSON.parse(new TextDecoder().decode(plain)); });
  }
  function encrypt(data, pw) {
    var salt = window.crypto.getRandomValues(new Uint8Array(16));
    var iv = window.crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pw, salt, ITERATIONS, "encrypt").then(function (key) {
      return window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(JSON.stringify(data)));
    }).then(function (ct) {
      return { v: 1, iter: ITERATIONS, salt: bytesToB64(salt), iv: bytesToB64(iv), ct: bytesToB64(ct) };
    });
  }

  function persist() {
    save(DATA_KEY, trip);
    document.getElementById("localNotice").hidden = false;
    document.getElementById("resetBtn").hidden = false;
  }

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else if (k === "value") el.value = v;
        else if (k === "checked") el.checked = v;
        else el.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }

  function safeHref(href) {
    return /^(https?:|tel:|mailto:)/i.test(href || "") ? href : null;
  }
  function mapHref(place) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place);
  }

  // ---------- time ----------
  function nowIn(tz) {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).formatToParts(new Date());
      var p = {};
      parts.forEach(function (x) { p[x.type] = x.value; });
      return p.year + "-" + p.month + "-" + p.day + " " + p.hour + ":" + p.minute;
    } catch (e) {
      return "";
    }
  }
  function fmtTime(t) {
    if (!t) return "";
    var m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return t;
    var hr = +m[1], ap = hr >= 12 ? "PM" : "AM";
    hr = hr % 12 || 12;
    return hr + (m[2] === "00" ? "" : ":" + m[2]) + " " + ap;
  }
  function fmtDate(d) {
    var dt = new Date(d + "T12:00:00");
    if (isNaN(dt)) return d || "";
    return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  function byTime(a, b) {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  }
  function sortedDays() {
    return trip.days.slice().sort(function (a, b) { return (a.date || "") < (b.date || "") ? -1 : 1; });
  }
  function dayId(d) { return "day-" + (d.date || "x"); }

  // ---------- view mode ----------
  function renderHeader() {
    document.getElementById("title").textContent = trip.title || "Trip";
    document.getElementById("subtitle").textContent = trip.subtitle || "";
    document.title = trip.title || "Trip Itinerary";
    var nav = document.getElementById("dayNav");
    nav.textContent = "";
    sortedDays().forEach(function (d) {
      var today = nowIn(d.timezone || DEFAULT_TZ).slice(0, 10) === d.date;
      nav.appendChild(h("a", { href: "#" + dayId(d), class: today ? "today" : null, text: fmtDate(d.date) }));
    });
  }

  function renderNow() {
    var box = document.getElementById("now");
    box.textContent = "";
    var all = [];
    sortedDays().forEach(function (d) {
      d.items.filter(function (i) { return i.time; }).sort(byTime).forEach(function (i) {
        all.push({ day: d, item: i, at: d.date + " " + i.time, now: nowIn(d.timezone || DEFAULT_TZ) });
      });
    });
    if (!all.length) { box.hidden = true; return; }
    var current = null, next = null;
    all.forEach(function (x) {
      if (x.at <= x.now) current = x;
      else if (!next) next = x;
    });
    var tripStart = all[0], tripEnd = all[all.length - 1];
    if (!next && current && current === tripEnd && current.now.slice(0, 10) > tripEnd.day.date) { box.hidden = true; return; }
    if (!current && next && next.now.slice(0, 10) < tripStart.day.date) {
      box.hidden = false;
      box.appendChild(h("div", { class: "label", text: "Trip starts" }));
      box.appendChild(h("div", { class: "what", text: fmtDate(next.day.date) + " · " + fmtTime(next.item.time) + " · " + next.item.title }));
      return;
    }
    box.hidden = false;
    if (current) {
      box.appendChild(h("div", { class: "label", text: "Now" }));
      box.appendChild(h("div", { class: "what", text: current.item.title }));
    }
    if (next) {
      box.appendChild(h("div", { class: "label", style: current ? "margin-top:8px" : null, text: "Up next" }));
      var sameDay = current && current.day === next.day;
      box.appendChild(h("div", { text: (sameDay ? "" : fmtDate(next.day.date) + " · ") + fmtTime(next.item.time) + " · " + next.item.title }));
    }
  }

  function renderKeyInfo() {
    var box = document.getElementById("keyInfo");
    box.textContent = "";
    trip.keyInfo.forEach(function (kv) {
      var href = safeHref(kv.href);
      box.appendChild(h(href ? "a" : "div", {
        class: "kv", href: href,
        target: href && /^https?:/.test(href) ? "_blank" : null,
        rel: href && /^https?:/.test(href) ? "noopener" : null
      }, [h("div", { class: "k", text: kv.label }), h("div", { class: "v", text: kv.value })]));
    });
  }

  function renderDays() {
    var box = document.getElementById("days");
    box.textContent = "";
    sortedDays().forEach(function (d) {
      var now = nowIn(d.timezone || DEFAULT_TZ);
      var timed = d.items.filter(function (i) { return i.time; }).sort(byTime);
      var currentItem = null;
      timed.forEach(function (i) { if (d.date + " " + i.time <= now) currentItem = i; });
      if (now.slice(0, 10) !== d.date) currentItem = null;

      var list = h("ul", { class: "items" });
      d.items.slice().sort(byTime).forEach(function (i) {
        var at = d.date + " " + i.time;
        var cls = "item tag-" + (TAGS.indexOf(i.tag) >= 0 ? i.tag : "see");
        if (i === currentItem) cls += " current";
        else if (i.time && at < now) cls += " past";
        list.appendChild(h("li", { class: cls }, [
          h("div", { class: "time", text: fmtTime(i.time) || "—" }),
          h("div", null, [
            h("div", { class: "title", text: i.title }),
            i.note ? h("div", { class: "note", text: i.note }) : null,
            i.place ? h("a", { class: "map", href: mapHref(i.place), target: "_blank", rel: "noopener", text: "Map ↗" }) : null
          ])
        ]));
      });
      box.appendChild(h("section", { class: "day", id: dayId(d) }, [
        h("div", { class: "day-head" }, [
          h("h2", { text: d.title }),
          h("span", { class: "date", text: fmtDate(d.date) }),
          d.city ? h("span", { class: "city", text: d.city }) : null
        ]),
        list
      ]));
    });
  }

  function renderChecklist() {
    var ul = document.getElementById("checklist");
    ul.textContent = "";
    document.getElementById("checklistSection").hidden = !trip.checklist.length;
    trip.checklist.forEach(function (c) {
      var done = !!checks[c.text];
      ul.appendChild(h("li", { class: done ? "done" : null }, [
        h("label", null, [
          h("input", {
            type: "checkbox", checked: done,
            onchange: function (e) {
              if (e.target.checked) checks[c.text] = true; else delete checks[c.text];
              save(CHECK_KEY, checks);
              e.target.closest("li").className = e.target.checked ? "done" : "";
            }
          }),
          h("span", { text: c.text })
        ])
      ]));
    });
  }

  function renderTips() {
    var box = document.getElementById("tips");
    box.textContent = "";
    trip.tips.forEach(function (t) {
      box.appendChild(h("section", { class: "card tips" }, [
        h("h2", { text: t.title }),
        h("ul", null, (t.items || []).map(function (x) { return h("li", { text: x }); }))
      ]));
    });
  }

  // ---------- edit mode ----------
  function input(type, value, onChange, placeholder) {
    return h("input", {
      type: type, value: value || "", placeholder: placeholder || null,
      oninput: function (e) { onChange(e.target.value); persist(); }
    });
  }
  function textarea(value, onChange, placeholder) {
    return h("textarea", {
      placeholder: placeholder || null, value: value || "",
      oninput: function (e) { onChange(e.target.value); persist(); }
    });
  }
  function rerenderEdit() { persist(); renderEdit(); }

  function renderEdit() {
    document.getElementById("now").hidden = true;
    document.getElementById("dayNav").textContent = "";

    // Title & key info
    var key = document.getElementById("keyInfo");
    key.textContent = "";
    key.appendChild(h("div", { class: "card", style: "grid-column:1/-1;margin-top:0" }, [
      h("h2", { text: "Trip" }),
      h("div", { class: "title-edit", style: "margin-top:0" }, [
        input("text", trip.title, function (v) { trip.title = v; document.getElementById("title").textContent = v; }, "Title"),
        input("text", trip.subtitle, function (v) { trip.subtitle = v; }, "Subtitle")
      ]),
      h("h2", { text: "Key info", style: "margin-top:16px" })
    ].concat(trip.keyInfo.map(function (kv, idx) {
      return h("div", { class: "kv-edit" }, [
        input("text", kv.label, function (v) { kv.label = v; }, "Label"),
        input("text", kv.value, function (v) { kv.value = v; }, "Value"),
        h("button", { type: "button", class: "danger", "aria-label": "Remove", text: "✕", onclick: function () { trip.keyInfo.splice(idx, 1); rerenderEdit(); } }),
        h("input", { type: "text", class: "href", value: kv.href || "", placeholder: "Link (https://…, tel:…) optional", oninput: function (e) { kv.href = e.target.value; persist(); } })
      ]);
    })).concat([
      h("div", { class: "add-row" }, [h("button", { type: "button", text: "+ Key info", onclick: function () { trip.keyInfo.push({ label: "", value: "" }); rerenderEdit(); } })])
    ])));

    // Days
    var box = document.getElementById("days");
    box.textContent = "";
    sortedDays().forEach(function (d) {
      var items = h("div", { class: "items" });
      d.items.slice().sort(byTime).forEach(function (i) {
        items.appendChild(h("div", { class: "edit-item" }, [
          h("div", { class: "edit-row" }, [
            h("input", { type: "time", value: i.time || "", onchange: function (e) { i.time = e.target.value; rerenderEdit(); } }),
            input("text", i.title, function (v) { i.title = v; }, "What")
          ]),
          textarea(i.note, function (v) { i.note = v; }, "Notes"),
          h("div", { class: "edit-row three" }, [
            input("text", i.place, function (v) { i.place = v; }, "Place for map link (optional)"),
            h("select", { onchange: function (e) { i.tag = e.target.value; persist(); } },
              TAGS.map(function (t) { var o = h("option", { value: t, text: t }); if (i.tag === t) o.selected = true; return o; })),
            h("button", { type: "button", class: "danger", text: "Remove", onclick: function () { d.items.splice(d.items.indexOf(i), 1); rerenderEdit(); } })
          ])
        ]));
      });
      box.appendChild(h("section", { class: "day" }, [
        h("div", { class: "edit-day-head" }, [
          h("input", { type: "date", value: d.date || "", onchange: function (e) { d.date = e.target.value; rerenderEdit(); } }),
          input("text", d.title, function (v) { d.title = v; }, "Day title"),
          h("div", { class: "wide" }, [
            input("text", d.city, function (v) { d.city = v; }, "City"),
            h("button", { type: "button", class: "danger", text: "Delete day", onclick: function () {
              if (confirm("Delete " + (d.title || "this day") + " and its stops?")) { trip.days.splice(trip.days.indexOf(d), 1); rerenderEdit(); }
            } })
          ])
        ]),
        items,
        h("div", { class: "add-row" }, [
          h("button", { type: "button", text: "+ Add stop", onclick: function () { d.items.push({ time: "", title: "New stop", note: "", place: "", tag: "see" }); rerenderEdit(); } })
        ])
      ]));
    });
    box.appendChild(h("div", { class: "add-row", style: "margin-top:20px" }, [
      h("button", { type: "button", text: "+ Add day", onclick: function () {
        var last = sortedDays().slice(-1)[0];
        var next = last && last.date ? new Date(last.date + "T12:00:00") : new Date();
        if (last && last.date) next.setDate(next.getDate() + 1);
        var iso = next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0") + "-" + String(next.getDate()).padStart(2, "0");
        trip.days.push({ date: iso, title: "New day", city: last ? last.city : "", timezone: last ? last.timezone : DEFAULT_TZ, items: [] });
        rerenderEdit();
      } })
    ]));

    // Checklist
    var ul = document.getElementById("checklist");
    ul.textContent = "";
    document.getElementById("checklistSection").hidden = false;
    trip.checklist.forEach(function (c, idx) {
      ul.appendChild(h("li", null, [h("div", { class: "kv-edit", style: "grid-template-columns:1fr auto;margin:0" }, [
        input("text", c.text, function (v) { c.text = v; }, "Task"),
        h("button", { type: "button", class: "danger", "aria-label": "Remove", text: "✕", onclick: function () { trip.checklist.splice(idx, 1); rerenderEdit(); } })
      ])]));
    });
    ul.appendChild(h("li", null, [h("button", { type: "button", text: "+ Task", onclick: function () { trip.checklist.push({ text: "" }); rerenderEdit(); } })]));

    // Tips
    var tips = document.getElementById("tips");
    tips.textContent = "";
    trip.tips.forEach(function (t, idx) {
      tips.appendChild(h("section", { class: "card" }, [
        h("div", { class: "kv-edit", style: "grid-template-columns:1fr auto" }, [
          input("text", t.title, function (v) { t.title = v; }, "Section title"),
          h("button", { type: "button", class: "danger", text: "Delete", onclick: function () { trip.tips.splice(idx, 1); rerenderEdit(); } })
        ]),
        h("textarea", {
          rows: Math.max(4, (t.items || []).length + 1), value: (t.items || []).join("\n"),
          placeholder: "One tip per line",
          oninput: function (e) { t.items = e.target.value.split("\n").filter(function (x) { return x.trim(); }); persist(); }
        })
      ]));
    });
    tips.appendChild(h("div", { class: "add-row" }, [
      h("button", { type: "button", text: "+ Notes section", onclick: function () { trip.tips.push({ title: "Notes", items: [] }); rerenderEdit(); } })
    ]));
  }

  // ---------- render ----------
  function render() {
    document.body.classList.toggle("editing", editing);
    var btn = document.getElementById("editBtn");
    btn.textContent = editing ? "Done" : "Edit";
    btn.classList.toggle("on", editing);
    var dirty = !!load(DATA_KEY);
    document.getElementById("localNotice").hidden = !dirty;
    document.getElementById("resetBtn").hidden = !dirty;
    if (editing) { renderEdit(); return; }
    renderHeader();
    renderNow();
    renderKeyInfo();
    renderDays();
    renderChecklist();
    renderTips();
  }

  // ---------- export / import ----------
  function download(name, body) {
    var blob = new Blob([body], { type: "text/javascript" });
    var a = h("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  // Exports the encrypted file the repo serves. Without a password (plain mode) it exports trip-data.js.
  function exportData() {
    if (!password) {
      download("trip-data.js", "window.TRIP = " + JSON.stringify(trip, null, 2) + ";\n");
      return Promise.resolve();
    }
    return encrypt(trip, password).then(function (payload) {
      download("trip-data.enc.js",
        "// Encrypted trip itinerary. Unlock it on the page with the trip password.\n" +
        "window.TRIP_ENC = " + JSON.stringify(payload) + ";\n");
    });
  }
  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      var parsed;
      try {
        parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      } catch (e) {
        alert("Couldn't read that file: " + e.message);
        return;
      }
      var pending = parsed && parsed.ct ? decrypt(parsed, password || "") : Promise.resolve(parsed);
      pending.then(function (data) {
        if (!data || !Array.isArray(data.days)) throw new Error("No days found");
        trip = normalize(data);
        persist();
        render();
      }).catch(function (e) {
        alert(parsed && parsed.ct ? "That file uses a different password." : "Couldn't read that file: " + e.message);
      });
    };
    reader.readAsText(file);
  }
  function changePassword() {
    var next = prompt("New trip password (share it with anyone who should see the trip):");
    if (!next) return;
    if (prompt("Type the new password again:") !== next) { alert("Passwords didn't match. Nothing changed."); return; }
    password = next;
    if (load(PASS_KEY)) save(PASS_KEY, password);
    exportData().then(function () {
      alert("Downloaded trip-data.enc.js with the new password. Upload it to the repo to make the change live.");
    });
  }

  // ---------- lock screen ----------
  function start(data) {
    published = normalize(clone(data));
    trip = normalize(load(DATA_KEY) || clone(published));
    document.body.classList.remove("locked");
    document.getElementById("lock").hidden = true;
    render();
  }
  function showLock(message) {
    document.body.classList.add("locked");
    var lock = document.getElementById("lock");
    lock.hidden = false;
    document.getElementById("lockError").textContent = message || "";
    document.getElementById("lockPass").focus();
  }
  function unlock(pw, remember) {
    return decrypt(window.TRIP_ENC, pw).then(function (data) {
      password = pw;
      if (remember) save(PASS_KEY, pw); else drop(PASS_KEY);
      start(data);
    });
  }
  function boot() {
    if (!window.TRIP_ENC) {
      document.getElementById("changePassBtn").hidden = true;
      document.getElementById("lockBtn").hidden = true;
      start(window.TRIP || { title: "Trip", days: [] });
      return;
    }
    var saved = load(PASS_KEY);
    if (saved) {
      unlock(saved, true).catch(function () { drop(PASS_KEY); showLock(); });
    } else {
      showLock();
    }
  }
  document.getElementById("lockForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = document.getElementById("lockSubmit");
    btn.disabled = true;
    btn.textContent = "Unlocking…";
    unlock(document.getElementById("lockPass").value, document.getElementById("lockRemember").checked)
      .catch(function () { showLock("Wrong password."); })
      .then(function () { btn.disabled = false; btn.textContent = "Unlock"; });
  });

  // ---------- wiring ----------
  var menu = document.getElementById("menu");
  var menuBtn = document.getElementById("menuBtn");
  function closeMenu() { menu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    menuBtn.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", function (e) { if (!menu.contains(e.target)) closeMenu(); });

  document.getElementById("editBtn").addEventListener("click", function () { editing = !editing; render(); window.scrollTo(0, 0); });
  document.getElementById("exportBtn").addEventListener("click", function () { closeMenu(); exportData(); });
  document.getElementById("noticeExport").addEventListener("click", exportData);
  document.getElementById("importBtn").addEventListener("click", function () { closeMenu(); document.getElementById("importFile").click(); });
  document.getElementById("importFile").addEventListener("change", function (e) {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("changePassBtn").addEventListener("click", function () { closeMenu(); changePassword(); });
  document.getElementById("lockBtn").addEventListener("click", function () {
    drop(PASS_KEY);
    location.reload();
  });
  document.getElementById("resetBtn").addEventListener("click", function () {
    closeMenu();
    if (!confirm("Discard edits on this device and go back to the published itinerary?")) return;
    drop(DATA_KEY);
    trip = normalize(clone(published));
    editing = false;
    render();
  });

  boot();
  // Keep "Now / Up next" fresh while the page is open.
  setInterval(function () { if (trip && !editing) { renderNow(); renderDays(); renderHeader(); } }, 60000);
})();
