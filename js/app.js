/* ============================================================
   GameCampus · lógica del portal (JavaScript simple, sin librerías)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byCode = (code) => COURSES.find((c) => c.code === code);
  const creditsOf = (list) => list.reduce((s, code) => s + byCode(code).credits, 0);
  const overlap = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end;
  const hh = (h) => String(Math.floor(h)).padStart(2, "0") + ":" + (h % 1 ? "30" : "00");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Cada materia matriculada guarda el grupo elegido: state.pendingGroup / state.confirmedGroup = { CÓDIGO: "A01" }
  const groupOf = (code, which = "pending") => {
    const c = byCode(code);
    const id = state[which + "Group"][code];
    return c.groups.find((g) => g.id === id) || c.groups[0];
  };
  // materia + datos de su grupo elegido (day, start, end, room, teacher, seats, group)
  const entry = (code, which = "pending") => {
    const g = groupOf(code, which);
    return { ...byCode(code), ...g, group: g.id };
  };
  const sameEnroll = () =>
    state.pending.length === state.confirmed.length &&
    state.pending.every((c) => state.confirmed.includes(c) && groupOf(c, "pending").id === groupOf(c, "confirmed").id);
  const slotText = (c) => `${DAYS[c.day - 1]} ${hh(c.start)}–${hh(c.end)}`;
  const blockHTML = (credits) => `<span class="blk blk-${BLOCKS[credits].key}" aria-hidden="true"></span>`;

  /* ---------- íconos de línea (SVG) ---------- */
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    cube: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5"/><path d="M12 12v9"/>',
    crown: '<path d="M4 19h16"/><path d="M4.5 17.5 3 8l5 4 4-7 4 7 5-4-1.5 9.5Z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/>',
    soundOn: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    soundOff: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    logout: '<path d="M14 4H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20h7"/><path d="M10 12h10"/><path d="m17 8.5 3.5 3.5-3.5 3.5"/>',
    collapse: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 4.5v15"/><path d="m16 9.5-2.5 2.5 2.5 2.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.8.5-1.1 1-1.1 1.8"/><path d="M12 17h.01"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  };
  const icoHTML = (name) => `<svg class="svg" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  const setIco = (el, name) => {
    el.innerHTML = `<svg class="svg" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  };
  /* ---------- presas de comida de Minecraft (imágenes reales de 9x9 px) ---------- */
  const drumstick = (state) => `<img class="drum" src="img/hambre-${state}.png" alt="" width="27" height="27">`;
  /* ---------- estado ---------- */
  const state = {
    view: "home",
    filter: 0, // filtro de créditos en Matrícula (0 = todas)
    pending: DEMO_ENROLLMENT.slice(), // inventario (sin confirmar)
    confirmed: DEMO_ENROLLMENT.slice(), // matrícula confirmada (alimenta horario y notas)
    busy: false,
  };
  state.pendingGroup = {};
  state.confirmedGroup = {};
  DEMO_ENROLLMENT.forEach((code) => { state.pendingGroup[code] = state.confirmedGroup[code] = byCode(code).groups[0].id; });
  let scheduleToken = 0;

  const view = $("#view");
  const layer = $("#layer");

  /* ============================================================
     DIÁLOGOS Y AVISOS
     ============================================================ */
  function dialog({ title, html, actions = [], theme = "mc", closable = true, outsideClose = false }) {
    const prev = document.activeElement;
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal modal-${theme}" role="dialog" aria-modal="true" aria-labelledby="mTitle">
      <h2 id="mTitle">${title}</h2><div class="modal-body">${html}</div><div class="modal-actions"></div></div>`;
    const box = $(".modal", back);
    const acts = $(".modal-actions", back);
    function close() {
      document.removeEventListener("keydown", onKey);
      back.remove();
      if (prev && prev.focus) prev.focus();
    }
    function onKey(e) {
      if (e.key === "Escape" && closable) close();
      if (e.key === "Tab") {
        const f = $$("button", back).filter((b) => !b.disabled);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    }
    actions.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = a.cls || "mc-btn";
      b.textContent = a.label;
      b.addEventListener("click", () => a.onClick && a.onClick({ close, box, back, button: b }));
      acts.appendChild(b);
    });
    document.addEventListener("keydown", onKey);
    if (outsideClose) back.addEventListener("mousedown", (e) => { if (e.target === back) close(); });
    layer.appendChild(back);
    const firstBtn = $("button", acts);
    if (firstBtn) firstBtn.focus();
    return { close, box, back };
  }

  function toast(icon, title, msg, kind = "", ms = 4200) {
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.innerHTML = `<span class="toast-ico">${icon}</span><div><small>${esc(title)}</small><strong>${esc(msg)}</strong></div><button class="toast-x" type="button" aria-label="Cerrar aviso">✕</button>`;
    $("#toasts").appendChild(t);
    const hide = () => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 500);
    };
    $(".toast-x", t).addEventListener("click", hide);
    setTimeout(hide, ms);
  }

  /* ============================================================
     LOGIN
     ============================================================ */
  function initLogin() {
    const form = $("#loginForm");
    const user = $("#user");
    const pass = $("#password");
    const err = $("#loginError");
    const cab = $("#cabinet");

    $("#togglePw").addEventListener("click", () => {
      const show = pass.type === "password";
      pass.type = show ? "text" : "password";
      $("#togglePw").setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    });
    $("#fillDemo").addEventListener("click", () => {
      user.value = USER.code;
      pass.value = USER.password;
      err.textContent = "";
      SFX.coin();
      $("#loginBtn").focus();
    });
    [user, pass].forEach((i) => i.addEventListener("input", () => { err.textContent = ""; i.classList.remove("bad"); }));

    function fail(msg, field) {
      err.textContent = msg;
      if (field) { field.classList.add("bad"); field.focus(); }
      cab.classList.remove("shake");
      void cab.offsetWidth;
      cab.classList.add("shake");
      SFX.error();
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = user.value.trim();
      const p = pass.value;
      if (!u) return fail("Ingresa tu código o correo institucional.", user);
      if (!p) return fail("Ingresa tu contraseña.", pass);
      const ok = (u === USER.code || u.toLowerCase() === USER.email) && p === USER.password;
      if (!ok) return fail("GAME OVER: las credenciales no coinciden. Revisa tus datos e inténtalo de nuevo.", user);

      const btn = $("#loginBtn");
      btn.disabled = true;
      btn.textContent = "CARGANDO...";
      SFX.start();
      $("#ready").hidden = false;
      await wait(reduced() ? 200 : 1100);
      enterApp("home");
      $("#ready").hidden = true;
      btn.disabled = false;
      btn.textContent = "▶ ENTRAR";
    });
  }

  function enterApp(first) {
    $("#login").hidden = true;
    $("#app").hidden = false;
    document.body.classList.add("in-app");
    go(first || "home");
  }

  function leaveApp() {
    $("#app").hidden = true;
    $("#login").hidden = false;
    document.body.classList.remove("in-app");
    $("#loginForm").reset();
    $("#loginError").textContent = "";
    state.pending = state.confirmed.slice();
    state.pendingGroup = { ...state.confirmedGroup };
    $("#user").focus();
  }

  /* ============================================================
     NAVEGACIÓN
     ============================================================ */
  const TITLES = { home: "Inicio", enrollment: "Matrícula", grades: "Notas", schedule: "Horario" };

  function go(name) {
    if (state.busy) return;
    state.view = name;
    scheduleToken++;
    $$("[data-view]").forEach((b) => {
      const on = b.dataset.view === name;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $("#crumb").textContent = TITLES[name];
    document.body.dataset.view = name;
    ({ home: renderHome, enrollment: renderEnrollment, grades: renderGrades, schedule: renderSchedule })[name]();
    view.classList.remove("enter");
    void view.offsetWidth;
    view.classList.add("enter");
    window.scrollTo(0, 0);
  }

  /* ============================================================
     MATRÍCULA · estilo Minecraft
     ============================================================ */
  function renderEnrollment() {
    const used = creditsOf(state.pending);
    const dirty = !sameEnroll();
    const empty = state.pending.length === 0;

    const shown = COURSES.filter((c) => !state.filter || c.credits === state.filter);
    const cards = shown.map((c) => {
      const taken = state.pending.includes(c.code);
      const out = c.groups.every((g) => g.seats === 0);
      const ng = c.groups.length;
      const gid = taken ? groupOf(c.code).id : "";
      const nText = `${ng} ${ng === 1 ? "grupo" : "grupos"}`;
      return `<div class="block-card ${taken ? "taken" : ""} ${out ? "out" : ""}" role="button" tabindex="0" draggable="${!out}"
        data-block="${c.code}" aria-label="${esc(c.name)}, ${c.credits} créditos, bloque de ${BLOCKS[c.credits].name}, ${nText}${out ? ", sin cupos" : ""}${taken ? ", en tu inventario, grupo " + gid : ""}">
        <span class="blk-wrap">${blockHTML(c.credits)}<b class="stack ${out ? "zero" : ""}">${out ? 0 : ng}</b></span>
        <span class="bc-name">${esc(c.name)}</span>
        <span class="bc-sub">${c.code} · ${c.credits} cr</span>
        ${out ? `<span class="bc-flag red">AGOTADO</span>` : taken ? `<span class="bc-flag green">✔ GRUPO ${gid}</span>` : `<span class="bc-flag">${nText}</span>`}
        <span class="tip" role="tooltip">
          <b>${esc(c.name)}</b>
          <i>${BLOCKS[c.credits].name} · ${c.credits} créditos</i>
          ${c.groups.map((g) => `<i>${g.id} · ${slotText(g)}${g.seats === 0 ? " · sin cupos" : ""}</i>`).join("")}
          ${c.prerequisite ? `<i>Requiere: ${esc(c.prerequisite)}</i>` : ""}
        </span>
      </div>`;
    }).join("");

    const mslot = (code) => {
      const c = entry(code);
      return `<div class="mslot filled" role="button" tabindex="0" draggable="true" data-slot="${c.code}" data-remove="${c.code}" aria-label="Quitar ${esc(c.name)} (grupo ${c.group}) de la mesa de crafteo">
        ${blockHTML(c.credits)}<b class="stack">${c.credits}</b>
        <span class="tip" role="tooltip"><b>${esc(c.name)}</b><i>Grupo ${c.group} · ${BLOCKS[c.credits].name} · ${c.credits} créditos</i><i>${slotText(c)} · ${esc(c.room)}</i><i>Clic para quitar</i></span></div>`;
    };
    const grid = Array.from({ length: MAX_SLOTS }, (_, i) => (state.pending[i] ? mslot(state.pending[i]) : `<div class="mslot" aria-hidden="true"></div>`)).join("");
    const hotbar = Array.from({ length: MAX_SLOTS }, (_, i) => {
      const code = state.confirmed[i];
      if (!code) return `<div class="mslot sm" aria-hidden="true"></div>`;
      const c = byCode(code);
      return `<div class="mslot sm filled" role="img" aria-label="Matriculada: ${esc(c.name)}, grupo ${groupOf(code, "confirmed").id}">${blockHTML(c.credits)}<b class="stack">${c.credits}</b></div>`;
    }).join("");
    const summary = state.pending.length
      ? state.pending.map((code) => { const c = entry(code); return `<li><b>${esc(c.name)}</b><span>${c.group} · ${slotText(c)}</span></li>`; }).join("")
      : `<li class="none">Arrastra bloques a la cuadrícula.</li>`;

    // La comida de Minecraft se llena de derecha a izquierda
    const meat = Array.from({ length: 10 }, (_, p) => {
      const cr = used - (9 - p) * 2;
      const st = cr >= 2 ? "full" : cr === 1 ? "half" : "empty";
      return `<span class="meat" aria-hidden="true">${drumstick(st)}</span>`;
    }).join("");
    let note = "";
    if (empty) note = "Agrega al menos un bloque para matricular.";
    else if (!dirty) note = "Sin cambios por confirmar.";
    else note = "Tienes cambios sin confirmar.";

    view.innerHTML = `
    <div class="mc-view">
      <header class="page-head">
        <p class="kicker">MESA DE CRAFTEO</p>
        <h1>Matrícula</h1>
        <p>Arrastra los bloques a la mesa de crafteo (o tócalos) y elige tu grupo: el horario cambia según el grupo.</p>
      </header>
      <div class="legend" aria-label="Materiales y créditos">
        ${[1, 2, 3, 4].map((n) => `<span>${blockHTML(n)} <b>${n}</b> crédito${n > 1 ? "s" : ""} · ${BLOCKS[n].name}</span>`).join("")}
      </div>
      <div class="mc-layout">
        <section class="world" id="world" aria-label="Materias disponibles">
          <h2>Mundo · Materias</h2>
          <div class="filters" role="group" aria-label="Filtrar por créditos">
            ${[0, 1, 2, 3, 4].map((n) => `<button class="chip-f ${state.filter === n ? "on" : ""}" data-filter="${n}" aria-pressed="${state.filter === n}">${n === 0 ? "Todas" : n + (n === 1 ? " crédito" : " créditos")}</button>`).join("")}
            <span class="count">${shown.length} de ${COURSES.length}</span>
          </div>
          <div class="block-grid">${cards}</div>
        </section>
        <section class="gui" id="inventory" aria-label="Mesa de crafteo e inventario">
          <h2>Mesa de crafteo</h2>
          <div class="craft-row">
            <div class="craft-grid">${grid}</div>
            <span class="craft-arrow" aria-hidden="true"></span>
            <button class="mslot result" id="resultSlot" ${empty || !dirty ? "disabled" : ""} aria-label="Confirmar matrícula"><span class="book" aria-hidden="true"></span><b class="stack">${state.pending.length}</b></button>
          </div>
          <ul class="sel-list">${summary}</ul>
          <h2 class="inv-title">Inventario</h2>
          <div class="hunger ${used >= MAX_CREDITS ? "full" : ""}" id="hunger">
            <span class="hunger-info"><span class="hunger-label">Créditos</span><strong class="hunger-num">${used}<small>/${MAX_CREDITS}</small></strong></span>
            <div class="meats" role="img" aria-label="${used} de ${MAX_CREDITS} créditos">${meat}</div>
          </div>
          <p class="hot-label">Matrícula confirmada</p>
          <div class="hotbar">${hotbar}</div>
          <button class="mc-btn big" id="confirmBtn" ${empty || !dirty ? "disabled" : ""}>CONFIRMAR</button>
          <p class="mc-note ${dirty && !empty ? "warn" : ""}">${note}</p>
        </section>
      </div>
    </div>`;
  }

  function flash(sel, cls) {
    const el = $(sel);
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function noSeats(c) {
    SFX.error();
    flash(`[data-block="${c.code}"]`, "denied");
    dialog({
      title: "Sin cupos",
      html: `<p>La materia <b>${esc(c.name)}</b> está agotada: no quedan cupos ${c.groups.length > 1 ? "en ningún grupo" : "en el grupo " + c.groups[0].id}.</p><p>Vuelve más tarde o elige otra materia.</p>`,
      actions: [{ label: "ENTENDIDO", onClick: ({ close }) => close() }],
    });
  }

  // Agrega la materia (o cambia su grupo) validando cupos, mesa llena, choques de horario y créditos
  function placeCourse(code, gid) {
    if (state.busy || !gid) return false;
    const c = byCode(code);
    const g = c.groups.find((x) => x.id === gid);
    const had = state.pending.includes(code);
    if (g.seats === 0) {
      SFX.error();
      toast("⛔", "Sin cupos", `El grupo ${g.id} de ${c.name} no tiene cupos.`, "warn");
      return false;
    }
    if (!had && state.pending.length >= MAX_SLOTS) {
      SFX.error();
      flash("#inventory", "denied");
      toast("🎒", "Mesa llena", `Solo caben ${MAX_SLOTS} materias. Quita una para continuar.`, "warn");
      return false;
    }
    const clash = state.pending.filter((x) => x !== code).map((x) => entry(x)).find((o) => overlap(o, g));
    if (clash) { clashAlert({ ...c, ...g, group: g.id }, clash); return false; }
    if (creditsOf(state.pending.filter((x) => x !== code)) + c.credits > MAX_CREDITS) {
      SFX.error();
      flash("#hunger", "denied");
      toast(drumstick("full"), "Barra de créditos llena", `Con ${c.name} pasarías de ${MAX_CREDITS} créditos.`, "warn");
      return false;
    }
    if (!had) state.pending.push(code);
    state.pendingGroup[code] = gid;
    SFX.pick();
    renderEnrollment();
    flash(`[data-slot="${code}"]`, "pop");
    return true;
  }

  function removeCourse(code) {
    if (state.busy) return;
    state.pending = state.pending.filter((c) => c !== code);
    delete state.pendingGroup[code];
    SFX.drop();
    renderEnrollment();
  }

  // Ventana para elegir el grupo de una materia: cada grupo muestra su horario, aula y cupos (sin nombre del docente)
  function openGroups(code) {
    if (state.busy) return;
    const c = byCode(code);
    const inInv = state.pending.includes(code);
    const others = state.pending.filter((x) => x !== code).map((x) => entry(x));
    const current = inInv ? groupOf(code).id : null;
    const rows = c.groups.map((g) => {
      const clash = others.find((o) => overlap(o, g));
      const full = g.seats === 0 && g.id !== current;
      const off = full || !!clash;
      const status = full ? "SIN CUPOS" : clash ? `Choca con ${esc(clash.name)}` : `${g.seats} ${g.seats === 1 ? "cupo" : "cupos"}`;
      return `<button type="button" class="grp" data-group="${g.id}" ${off ? "disabled" : ""} aria-pressed="false">
        <b class="gid">${g.id}</b>
        <span class="gwhen"><span class="gday">${slotText(g)}</span><span class="groom">${esc(g.room)}</span></span>
        <span class="gst ${off ? "bad" : ""}">${status}</span></button>`;
    });
    let chosen = current;
    const dlg = dialog({
      title: esc(c.name),
      theme: "groups",
      outsideClose: true,
      html: `<p class="grp-help">${c.credits} ${c.credits === 1 ? "crédito" : "créditos"} · elige el grupo (el horario cambia según el grupo):</p><div class="grp-list">${rows.join("")}</div>`,
      actions: [
        { label: inInv ? "CAMBIAR GRUPO" : "AGREGAR", onClick: ({ close }) => { if (chosen && placeCourse(code, chosen)) close(); } },
        ...(inInv ? [{ label: "QUITAR", onClick: ({ close }) => { close(); removeCourse(code); } }] : []),
        { label: "CANCELAR", onClick: ({ close }) => close() },
      ],
    });
    const btns = $$(".grp", dlg.box);
    const commit = $(".modal-actions .mc-btn", dlg.box);
    const paint = () => {
      btns.forEach((b) => { const on = b.dataset.group === chosen; b.classList.toggle("sel", on); b.setAttribute("aria-pressed", String(on)); });
      commit.disabled = !chosen;
    };
    btns.forEach((b) => b.addEventListener("click", () => { chosen = b.dataset.group; SFX.click(); paint(); }));
    paint();
    (btns.find((b) => b.classList.contains("sel")) || btns.find((b) => !b.disabled) || commit).focus();
  }

  // Tocar una materia: con varios grupos abre la ventana de grupos; con uno solo se agrega o se quita directo
  function selectCourse(code) {
    if (state.busy) return;
    const c = byCode(code);
    if (c.groups.every((g) => g.seats === 0)) return noSeats(c);
    if (c.groups.length > 1) return openGroups(code);
    if (state.pending.includes(code)) return removeCourse(code);
    placeCourse(code, c.groups[0].id);
  }

  // Choque de horario: aviso flotante + las dos materias se marcan en rojo un momento
  function clashAlert(incoming, existing) {
    const els = [$(`[data-slot="${existing.code}"]`), $(`[data-block="${incoming.code}"]`)].filter(Boolean);
    els.forEach((el) => { el.classList.remove("clash"); void el.offsetWidth; el.classList.add("clash"); });
    setTimeout(() => els.forEach((el) => el.classList.remove("clash")), 2200);
    SFX.error();
    dialog({
      title: "Choque de horario",
      html: `<p>El grupo <b>${incoming.group}</b> de <b>${esc(incoming.name)}</b> choca con <b>${esc(existing.name)}</b> (grupo ${existing.group}): coinciden el <b>${slotText(incoming)}</b>.</p><p>Quita una de las dos materias o elige otro grupo.</p>`,
      actions: [{ label: "ENTENDIDO", onClick: ({ close }) => close() }],
    });
  }

  function confirmEnrollment() {
    state.confirmed = state.pending.slice();
    state.confirmedGroup = {};
    state.confirmed.forEach((code) => { state.confirmedGroup[code] = groupOf(code, "pending").id; });
    renderEnrollment();
    SFX.achievement();
    toast("🏆", "¡Logro desbloqueado!", `Matrícula completa · ${creditsOf(state.confirmed)} créditos`, "achievement");
  }

  function initEnrollmentEvents() {
    view.addEventListener("click", (e) => {
      if (state.view !== "enrollment") return;
      const rm = e.target.closest("[data-remove]");
      if (rm) return removeCourse(rm.dataset.remove);
      const fl = e.target.closest("[data-filter]");
      if (fl) { state.filter = Number(fl.dataset.filter); SFX.click(); return renderEnrollment(); }
      if (e.target.closest("#confirmBtn, #resultSlot")) return confirmEnrollment();
      const card = e.target.closest("[data-block]");
      if (card) selectCourse(card.dataset.block);
    });
    view.addEventListener("keydown", (e) => {
      const card = e.target.closest && e.target.closest("[data-block], [data-remove]");
      if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); card.click(); }
    });
    view.addEventListener("dragstart", (e) => {
      const b = e.target.closest && e.target.closest("[data-block]");
      const s = e.target.closest && e.target.closest("[data-slot]");
      if (b) { e.dataTransfer.setData("text/plain", "add:" + b.dataset.block); e.dataTransfer.effectAllowed = "move"; b.classList.add("dragging"); }
      else if (s) { e.dataTransfer.setData("text/plain", "rm:" + s.dataset.slot); e.dataTransfer.effectAllowed = "move"; s.classList.add("dragging"); }
    });
    view.addEventListener("dragend", () => $$(".dragging", view).forEach((n) => n.classList.remove("dragging")));
    view.addEventListener("dragover", (e) => {
      const zone = e.target.closest && e.target.closest("#inventory, #world");
      if (zone) { e.preventDefault(); zone.classList.add("over"); }
    });
    view.addEventListener("dragleave", (e) => {
      const zone = e.target.closest && e.target.closest("#inventory, #world");
      if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove("over");
    });
    view.addEventListener("drop", (e) => {
      const zone = e.target.closest && e.target.closest("#inventory, #world");
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove("over");
      const [kind, code] = (e.dataTransfer.getData("text/plain") || "").split(":");
      if (kind === "add" && zone.id === "inventory") {
        // soltar una materia de un solo grupo que ya está en la mesa no la quita
        if (!(state.pending.includes(code) && byCode(code).groups.length === 1)) selectCourse(code);
      } else if (kind === "rm" && zone.id === "world") removeCourse(code);
    });
  }
  /* ============================================================
     NOTAS · Pokédex (Pokémon)
     ============================================================ */
  // Pokébolas pixel art: la que usas para capturar depende de tu nota final (redondeada a 1 decimal)
  const BALLS = {
    poke: { name: "Poké Ball", range: "3.0 a 3.9" },
    super: { name: "Súper Ball", range: "4.0 a 4.4" },
    ultra: { name: "Ultra Ball", range: "4.5 a 4.7" },
    master: { name: "Master Ball", range: "4.8 o más" },
  };
  function ballTier(fin) {
    const r = Math.round(fin * 10) / 10;
    return r >= 4.8 ? "master" : r >= 4.5 ? "ultra" : r >= 4 ? "super" : "poke";
  }
  function ball(tier, cls = "") {
    return `<img class="pball ${cls}" src="img/bola-${tier}.png" alt="" aria-hidden="true" width="52" height="52">`;
  }  const dexStatus = (g) => {
    const fin = finalGrade(g.cuts);
    if (fin === null) return "seen";
    return fin >= PASS ? "caught" : "fled";
  };
  const DEX_LABEL = { seen: "VISTO", caught: "¡CAPTURADO!", fled: "¡SE ESCAPÓ!" };
  const statColor = (v) => (v >= 4 ? "#4cd137" : v >= PASS ? "#f5c518" : "#e0443e");

  // Cuántos puntos lleva y cuánto necesita en los cortes que faltan para llegar a la nota mínima.
  // puntos = suma de (nota del corte × peso); la nota final es la suma de los 3 cortes ponderados.
  function needInfo(g) {
    let pts = 0;
    let rem = 0;
    const left = [];
    g.cuts.forEach((c, i) => {
      if (c === null) { rem += WEIGHTS[i]; left.push(`C${i + 1}`); }
      else pts += (c * WEIGHTS[i]) / 100;
    });
    if (!rem) return null;
    const x = (PASS - pts) / (rem / 100); // nota que debe sacar, en promedio, en los cortes que faltan
    const who = left.length === 1 ? left[0] : left.slice(0, -1).join(", ") + " y " + left[left.length - 1];
    let msg;
    if (x <= 0) msg = "¡Captura asegurada! Con lo que llevas ya pasas.";
    else if (x > 5) msg = `Ya no alcanza: ni con 5.0 en ${who} llegas a ${PASS.toFixed(1)}.`;
    else {
      const need = (Math.ceil(x * 10 - 1e-9) / 10).toFixed(1);
      msg = left.length === 1
        ? `Necesitas ${need} o más en ${who}.`
        : `Necesitas ${need} o más en cada uno de ${who} (sacando lo mismo en todos).`;
    }
    return { pts, msg };
  }

  const needText = (g) => {
    const n = needInfo(g);
    return n ? `Llevas ${n.pts.toFixed(2)} de ${PASS.toFixed(2)} puntos. ${n.msg}` : "";
  };

  // Barra de PS del Pokémon salvaje: baja a medida que se evalúan los cortes
  function wildInfo(g) {
    const part = partialGrade(g.cuts);
    const done = part ? part.weight : 0;
    const left = 100 - done;
    const col = left > 50 ? "#4cd137" : left > 20 ? "#f5c518" : "#e0443e";
    const n = needInfo(g);
    return `<div class="hp"><span>PS</span><div class="hp-bar" role="img" aria-label="Queda ${left}% por evaluar"><i style="width:${left}%;background:${col}"></i></div></div>
      <p class="need">${n ? `<b>Llevas ${n.pts.toFixed(2)} de ${PASS.toFixed(2)} pts.</b><br>${n.msg}` : ""}</p>`;
  }
  function dexCard(g, src, n) {
    const st = dexStatus(g);
    const fin = finalGrade(g.cuts);
    const tier = fin !== null && fin >= PASS ? ballTier(fin) : "poke";
    const stats = g.cuts.map((c, i) => `
      <div class="stat-line"><span>C${i + 1}<small>${WEIGHTS[i]}%</small></span>
        <div class="sbar" role="img" aria-label="${c === null ? "sin nota" : "nota " + c.toFixed(1)}"><i style="width:${c === null ? 0 : (c / 5) * 100}%;background:${c === null ? "transparent" : statColor(c)}"></i></div>
        <b>${c === null ? "—" : c.toFixed(1)}</b></div>`).join("");
    return `<button class="dex ${st}" data-dex="${src}:${g.code}" aria-label="Abrir ficha de ${esc(g.name)}: ${DEX_LABEL[st]}">
      <div class="dex-head"><span>N.º ${String(n).padStart(3, "0")}</span><span>${g.credits} CR</span></div>
      <div class="dex-body">
        <div class="dex-ball">${st === "caught" ? ball(tier) : st === "fled" ? ball("poke", "broken") : ball("poke", "silhouette")}</div>
        <div class="dex-info"><strong>${esc(g.name)}</strong><span>${g.code}${st === "caught" ? " · " + BALLS[tier].name : ""}</span>${stats}${st === "seen" ? wildInfo(g) : ""}</div>
      </div>
      <div class="dex-foot"><span>${DEX_LABEL[st]}</span><span>${fin !== null ? "Nv. " + fin.toFixed(1) : partialGrade(g.cuts) ? "Parcial " + partialGrade(g.cuts).value.toFixed(1) : "Sin notas"}</span></div>
    </button>`;
  }

  // Explicación visible de cómo se calcula la nota (usa los mismos pesos que el cálculo real)
  function howHTML() {
    const ex = PAST[0];
    const parts = ex.cuts.map((c, i) => `${c.toFixed(1)} × ${(WEIGHTS[i] / 100).toFixed(2)}`).join(" + ");
    return `
      <div class="helpbox">
          <div class="how-weights">${WEIGHTS.map((w, i) => `<span><small>CORTE ${i + 1}</small><b>${w}%</b></span>`).join("")}</div>
          <ul>
            <li><b>Nota final</b> = ${WEIGHTS.map((w, i) => `(C${i + 1} × ${(w / 100).toFixed(2)})`).join(" + ")}. Las notas van de 0.0 a 5.0.</li>
            <li>La materia se <b>aprueba (captura)</b> con <b>${PASS.toFixed(1)}</b> o más. Con menos, se escapa.</li>
            <li>La <b>Pokébola</b> depende de tu nota final: ${Object.values(BALLS).map((b) => `${b.name} (${b.range})`).join(", ")}.</li>
            <li>Cada corte de cada materia se compone de: ${CUT_PARTS.map((k) => `<b>${k.n}</b> (${k.w}%)`).join(", ")}. Las ves al tocar una materia.</li>
            <li><b>Parcial</b> = promedio ponderado solo de los cortes que ya tienen nota.</li>
            <li><b>Lo que necesitas</b> = (${PASS.toFixed(1)} − los puntos que llevas) ÷ el peso de los cortes que faltan. Son los puntos que aún tienes que reunir entre los cortes pendientes.</li>
            <li><b>Promedio acumulado</b> = suma de (nota final × créditos) ÷ suma de créditos de las materias cerradas.</li>
          </ul>
          <p class="how-ex">Ejemplo con <b>${esc(ex.name)}</b>: ${parts} = <b>${finalGrade(ex.cuts).toFixed(2)}</b></p>
        </div>`;
  }
  function renderGrades() {
    const current = state.confirmed.map(byCode);
    const caught = PAST.filter((g) => dexStatus(g) === "caught").length;
    const fled = PAST.length - caught;
    let n = 0;
    view.innerHTML = `
    <div class="grades-view">
      <header class="page-head">
        <p class="kicker">POKÉDEX ACADÉMICA</p>
        <h1>Notas</h1>
        <p>Una materia se captura con ${PASS.toFixed(1)} o más. Toca una ficha para ver qué pasó.</p>
        <div class="score-chips">
          <span class="chip-win">⚪ Capturadas <b>${caught}</b></span>
          <span class="chip-lose">💨 Escapadas <b>${fled}</b></span>
          <span class="chip-play">👀 Vistas <b>${current.length}</b></span>
          <button class="help-btn" id="helpBtn" type="button" aria-haspopup="dialog">${icoHTML("help")}<span>Ayuda</span></button>
        </div>
      </header>
      <section>
        <h2 class="sec">Promedio · tu equipo</h2>
        ${avgCardHTML()}
      </section>
      <section>
        <h2 class="sec">Vistas · en curso ${PERIOD}</h2>
        ${current.length ? `<div class="dex-grid">${current.map((c) => dexCard(c, "cur", ++n)).join("")}</div>`
          : `<p class="empty-msg">Aún no tienes materias matriculadas. Ve a <b>Matrícula</b> y confirma tu inventario.</p>`}
      </section>
      <section>
        <h2 class="sec">Registro cerrado · ${PAST_PERIOD}</h2>
        <div class="dex-grid">${PAST.map((c) => dexCard(c, "past", ++n)).join("")}</div>
      </section>
    </div>`;
  }

  function typeText(el, text, speed) {
    if (reduced()) { el.textContent = text; el.classList.add("done"); return; }
    let i = 0;
    const iv = setInterval(() => {
      if (!document.body.contains(el)) return clearInterval(iv);
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(iv); el.classList.add("done"); }
    }, speed);
  }

  // Notas por corte en forma de "stats": cada corte con sus actividades, su peso y su nota
  function cutBreakdownHTML(g) {
    return `<h3 class="detail-title">NOTAS POR CORTE</h3>` + g.parts.map((comps, i) => {
      const cut = g.cuts[i];
      const done = comps.filter((k) => k.g !== null).length;
      const state = cut !== null ? cut.toFixed(1) : done ? `En curso ${done}/${comps.length}` : "Sin notas";
      const rows = comps.map((k) => `
        <div class="stat-line cmp"><span class="cn">${esc(k.n)}<small>${k.w}%</small></span>
          <div class="sbar" role="img" aria-label="${k.g === null ? "sin nota" : "nota " + k.g.toFixed(1)}"><i style="width:${k.g === null ? 0 : (k.g / 5) * 100}%;background:${k.g === null ? "transparent" : statColor(k.g)}"></i></div>
          <b>${k.g === null ? "—" : k.g.toFixed(1)}</b></div>`).join("");
      return `<section class="cut-group"><h4><span>CORTE ${i + 1} · ${WEIGHTS[i]}%</span><b class="${cut === null ? "pend" : ""}">${state}</b></h4>${rows}</section>`;
    }).join("");
  }
  function showDex(src, code) {
    const g = src === "past" ? PAST.find((x) => x.code === code) : byCode(code);
    const st = dexStatus(g);
    const fin = finalGrade(g.cuts);
    const part = partialGrade(g.cuts);
    const tier = fin !== null && fin >= PASS ? ballTier(fin) : "poke";
    const msg = {
      caught: `¡${g.name} fue capturado con una ${BALLS[tier].name}! Nota final ${fin === null ? "" : fin.toFixed(1)}. Ganas +${g.credits * 50} XP.`,
      fled: `¡${g.name} se escapó! Nota final ${fin === null ? "" : fin.toFixed(1)}, y necesitabas ${PASS.toFixed(1)}. Podrás encontrarlo otra vez en la próxima matrícula.`,
      seen: `¡Un ${g.name} salvaje apareció! ${part ? `Llevas ${part.weight}% evaluado con parcial ${part.value.toFixed(1)}. ` : ""}${needText(g)}`,
    }[st];
    const dlg = dialog({
      title: esc(g.name),
      theme: "poke",
      html: `<div class="dex-scene ${st}">${st === "caught" ? ball(tier) : st === "fled" ? ball("poke") : ball("poke", "silhouette")}<span class="sparkles" aria-hidden="true">★ ★ ★</span></div>
             <div class="dex-text" id="dexText" aria-live="polite"></div>
             <div class="dex-detail">${cutBreakdownHTML(g)}</div>`,
      actions: [{ label: "CONTINUAR", cls: "px-btn gold", onClick: ({ close }) => close() }],
    });
    const scene = $(".dex-scene", dlg.box);
    const ballEl = $(".pball", scene);
    const text = $("#dexText", dlg.box);
    const fast = reduced();
    if (st === "caught") {
      SFX.drop();
      setTimeout(() => { scene.classList.add("done"); SFX.victory(); typeText(text, msg, 26); }, fast ? 0 : 2100);
    } else if (st === "fled") {
      SFX.drop();
      setTimeout(() => {
        ballEl.classList.add("escape");
        scene.classList.add("flash");
        SFX.error();
        typeText(text, msg, 26);
      }, fast ? 0 : 1700);
    } else {
      SFX.click();
      typeText(text, msg, 26);
    }
  }

  // Ventana de ayuda: cómo se calculan los cortes y la nota
  function openHelp() {
    SFX.click();
    dialog({
      title: "¿Cómo se calculan los cortes y la nota?",
      theme: "help",
      outsideClose: true,
      html: howHTML(),
      actions: [{ label: "ENTENDIDO", onClick: ({ close }) => close() }],
    });
  }
  function initGradesEvents() {
    view.addEventListener("click", (e) => {
      if (e.target.closest("#helpBtn") && state.view === "grades") return openHelp();
      const card = e.target.closest("[data-dex]");
      if (card && state.view === "grades") {
        const [src, code] = card.dataset.dex.split(":");
        showDex(src, code);
      }
    });
  }
  /* ============================================================
     PROMEDIO · estilo Zelda (se usa en Inicio y dentro de Notas)
     ============================================================ */
  function avgCardHTML() {
    const avg = weightedAverage(PAST);
    const units = Math.max(0, Math.min(10, avg / 0.5)); // 10 corazones = 5.0 (cada corazón vale 0.5)
    let hearts = "";
    for (let i = 0; i < 10; i++) {
      const f = Math.max(0, Math.min(1, units - i)); // cuánto de este corazón está lleno
      const frame = f >= 0.875 ? 0 : f >= 0.625 ? 1 : f >= 0.375 ? 2 : f >= 0.125 ? 3 : 4;
      hearts += `<span class="h" style="animation-delay:${i * 90}ms"><i class="hrt" style="background-position:-${frame * 51}px 0"></i></span>`;
    }
    let idx = 0;
    RANKS.forEach((r, i) => { if (avg >= r.min) idx = i; });
    const rank = RANKS[idx];
    const next = RANKS[idx + 1];
    const pct = next ? Math.round(((avg - rank.min) / (next.min - rank.min)) * 100) : 100;
    return `
      <section class="zelda-card" aria-label="Promedio acumulado">
        <div class="avg-num"><span>PROMEDIO</span><strong>${avg.toFixed(2)}</strong><small>/ 5.0</small></div>
        <div class="avg-mid">
          <div class="hearts" role="img" aria-label="${units.toFixed(1)} de 10 corazones">${hearts}</div>
          <p class="rank-line">NIVEL ${idx + 1} · <b>${rank.name}</b></p>
          <div class="xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
          <p class="avg-sub">Acumulado ponderado por créditos · cierre ${PAST_PERIOD}</p>
        </div>
      </section>`;
  }

  /* ============================================================
     INICIO · ficha del jugador
     ============================================================ */
  function renderHome() {
    const list = state.confirmed.map((code) => entry(code, "confirmed")).sort((a, b) => a.day - b.day || a.start - b.start);
    const cr = creditsOf(state.confirmed);
    const wins = PAST.filter((g) => finalGrade(g.cuts) >= PASS).length;
    view.innerHTML = `
    <div class="home-view">
      <header class="page-head">
        <p class="kicker">PANTALLA DE INICIO</p>
        <h1>Hola, ${esc(USER.name.split(" ")[0])}</h1>
        <p>Este es tu resumen del periodo ${PERIOD}.</p>
      </header>
      <div class="home-grid">
        <section class="char-card" aria-label="Datos del estudiante">
          <div class="char-top">
            <div class="avatar-big" aria-hidden="true">🎮</div>
            <div>
              <span class="badge-ok">● ${esc(USER.status.toUpperCase())}</span>
              <h2>${esc(USER.name)}</h2>
              <p>${esc(USER.program)}</p>
            </div>
          </div>
          <dl class="char-data">
            <div><dt>Código</dt><dd>${esc(USER.code)}</dd></div>
            <div><dt>Correo institucional</dt><dd>${esc(USER.email)}</dd></div>
            <div><dt>Facultad</dt><dd>${esc(USER.faculty)}</dd></div>
            <div><dt>Semestre</dt><dd>${USER.semester}</dd></div>
            <div><dt>Ingreso</dt><dd>${esc(USER.entry)}</dd></div>
            <div><dt>Periodo actual</dt><dd>${PERIOD}</dd></div>
          </dl>
        </section>
        <div class="home-right">
          ${avgCardHTML()}
          <div class="stat-row">
            <div class="stat"><small>CRÉDITOS</small><strong>${cr}<em>/${MAX_CREDITS}</em></strong><div class="mini-bar" role="img" aria-label="${cr} de ${MAX_CREDITS} créditos"><i style="width:${(cr / MAX_CREDITS) * 100}%"></i></div></div>
            <div class="stat"><small>MATERIAS</small><strong>${list.length}</strong><span>matriculadas</span></div>
            <div class="stat"><small>VICTORIAS</small><strong>${wins}<em>/${PAST.length}</em></strong><span>periodo ${PAST_PERIOD}</span></div>
          </div>
          <div class="home-actions">
            <button class="px-btn gold" data-go="grades">VER MIS NOTAS ▶</button>
            <button class="px-btn outline" data-go="schedule">VER HORARIO ▶</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ============================================================
     HORARIO · Tetris
     ============================================================ */
  // Próxima clase según el reloj real del equipo (lunes a viernes)
  function nextFromNow(list) {
    if (!list.length) return null;
    const now = new Date();
    const dow = now.getDay(); // 0 domingo ... 6 sábado
    const cur = now.getHours() + now.getMinutes() / 60;
    const live = list.find((c) => c.day === dow && c.start <= cur && cur < c.end);
    if (live) return { c: live, label: "EN CLASE", sub: `Hasta las ${hh(live.end)} · ${live.room}` };
    let best = null;
    let bestD = Infinity;
    list.forEach((c) => {
      let d = (c.day - dow) * 24 + (c.start - cur);
      if (d < 0) d += 168;
      if (d < bestD) { bestD = d; best = c; }
    });
    let when;
    if (best.day === dow && bestD < 24) when = `Hoy ${hh(best.start)} · en ${Math.max(1, Math.round(bestD))} h`;
    else if (best.day === (dow + 1) % 7 && bestD < 48) when = `Mañana ${hh(best.start)}`;
    else when = `${DAYS[best.day - 1]} ${hh(best.start)}`;
    return { c: best, label: "PRÓXIMA CLASE", sub: when };
  }

  // Figuritas pequeñas de la caja "siguiente": un cuadro por hora (los 30 min sobrantes, medio cuadro)
  function miniCells(len) {
    const n = Math.max(1, Math.ceil(len));
    const h = Math.round((20 * len) / n);
    return Array.from({ length: n }, () => `<i style="height:${h}px"></i>`).join("");
  }

  function nextBoxHTML(c, label, sub, note = "") {
    if (!c) return `<small>${label}</small><span>—</span>`;
    return `<small>${label}</small><div class="next p-${c.piece}">${miniCells(c.end - c.start)}</div><strong>${esc(c.name)}</strong><span>${sub}</span>${note ? `<em class="clock">${note}</em>` : ""}`;
  }

  function renderSchedule() {
    const list = state.confirmed.map((code) => entry(code, "confirmed")).sort((a, b) => a.day - b.day || a.start - b.start);
    // el tablero va de 6 am a 6 pm y se extiende si hay clases fuera de ese rango
    const first = Math.min(FIRST_HOUR, ...list.map((c) => Math.floor(c.start)));
    const last = Math.max(LAST_HOUR, ...list.map((c) => Math.ceil(c.end)));
    const rows = last - first;
    const hours = list.reduce((s, c) => s + (c.end - c.start), 0);
    const cr = creditsOf(state.confirmed);

    const labels = Array.from({ length: rows }, (_, i) => `<span>${hh(first + i)}</span>`).join("");
    const heads = DAYS.map((d) => `<span>${d}</span>`).join("");
    const token = scheduleToken;
    const step = list.length > 6 ? 0.55 : 0.85; // con muchas piezas caen un poco más rápido
    const landAt = [];

    const pieces = list.map((c, i) => {
      const len = c.end - c.start; // 1 rectángulo = 1 hora
      const fall = Math.ceil(c.start - first + len);
      const dur = (fall * 0.09).toFixed(2);
      const delay = (0.2 + i * step).toFixed(2);
      landAt.push((parseFloat(delay) + parseFloat(dur)) * 1000);
      const n = Math.max(1, Math.ceil(len)); // un rectángulo por hora o fracción: 1 h 30 = 2 rectángulos iguales, 3 h = 3
      const cells = Array.from({ length: n }, () => `<i class="cell"></i>`).join("");
      return `<button class="piece p-${c.piece}" data-piece="${c.code}" title="${esc(c.name)}"
        style="left:${((c.day - 1) * 100) / DAYS.length}%;top:calc(${c.start - first} * var(--row));height:calc(${len} * var(--row));--rows:${fall};--n:${n};--dur:${dur}s;--d:${delay}s"
        aria-label="${esc(c.name)}, ${slotText(c)}, ${esc(c.room)}">
        <span class="cells">${cells}</span>
        <span class="plabel"><b>${esc(c.name)}</b><small>${esc(c.room)}</small></span>
      </button>`;
    }).join("");

    view.innerHTML = `
    <div class="tet-view">
      <header class="page-head">
        <p class="kicker">BLOQUES CAYENDO</p>
        <h1>Horario</h1>
        <p>Cada cuadro es una hora de clase. Toca una pieza para ver sus datos.</p>
      </header>
      ${list.length ? "" : `<p class="empty-msg">Tablero vacío. Confirma materias en <b>Matrícula</b> para ver caer tus piezas.</p>`}
      <div class="tet-layout">
        <div class="well" style="--cols:${DAYS.length}">
          <div class="well-head"><span></span>${heads}</div>
          <div class="well-body">
            <div class="hours" style="grid-template-rows:repeat(${rows}, var(--row))">${labels}<span class="end" style="top:calc(${rows} * var(--row) - 10px)">${hh(last)}</span></div>
            <div class="board" style="--rowcount:${rows}">${pieces}</div>
          </div>
        </div>
        <aside class="tet-side">
          <div class="t-box" id="nextBox" aria-live="polite">${nextBoxHTML(list[0], "SIGUIENTE", list[0] ? slotText(list[0]) : "")}</div>
          <div class="t-box"><small>PUNTAJE</small><strong class="digits">${String(Math.round(hours * 100)).padStart(6, "0")}</strong><span>${+hours.toFixed(1)} h por semana</span></div>
          <div class="t-box"><small>LÍNEAS</small><strong class="digits">${String(cr).padStart(2, "0")}</strong><span>créditos</span></div>
          <div class="t-box"><small>NIVEL</small><strong class="digits">${String(USER.semester).padStart(2, "0")}</strong><span>semestre</span></div>
          <button class="px-btn gold" id="replay">↻ NUEVA PARTIDA</button>
        </aside>
      </div>
      <div class="piece-info" id="pieceInfo" aria-live="polite">Toca una pieza para ver docente, aula y horario.</div>
      <ul class="tet-list">${list.map((c) => `<li><i class="sw p-${c.piece}"></i><b>${esc(c.name)}</b> <span>${slotText(c)} · ${esc(c.room)} · ${esc(c.teacher)}</span></li>`).join("")}</ul>
    </div>`;

    // "Siguiente" avanza a medida que cae cada pieza; al final muestra la próxima clase real
    const box = $("#nextBox");
    const showNext = (html) => {
      if (token !== scheduleToken || state.view !== "schedule" || !box) return;
      box.innerHTML = html;
      box.classList.remove("flash");
      void box.offsetWidth;
      box.classList.add("flash");
    };
    landAt.forEach((ms, i) => setTimeout(() => {
      if (token === scheduleToken && state.view === "schedule") SFX.drop();
      const nxt = list[i + 1];
      if (nxt) showNext(nextBoxHTML(nxt, "SIGUIENTE", slotText(nxt)));
      else { const r = nextFromNow(list); if (r) showNext(nextBoxHTML(r.c, r.label, r.sub, "Según la hora de tu computador")); }
    }, ms));
  }
  function initScheduleEvents() {
    view.addEventListener("click", (e) => {
      if (state.view !== "schedule") return;
      if (e.target.closest("#replay")) { SFX.start(); return go("schedule"); }
      const p = e.target.closest("[data-piece]");
      if (p) {
        const c = entry(p.dataset.piece, "confirmed");
        $$(".piece.sel", view).forEach((x) => x.classList.remove("sel"));
        p.classList.add("sel");
        SFX.click();
        $("#pieceInfo").innerHTML = `<b>${esc(c.name)}</b> · ${slotText(c)} · ${esc(c.room)} · Docente ${esc(c.teacher)} · Grupo ${c.group} · ${c.credits} ${c.credits === 1 ? "crédito" : "créditos"}`;
      }
    });
  }

  /* ============================================================
     CERRAR SESIÓN · Mario entra por la puerta
     ============================================================ */
  function openLogout() {
    if (state.busy) return;
    const html = `
      <div class="mario-scene" id="marioScene">
        <i class="ms-cloud c1"></i><i class="ms-cloud c2"></i><i class="ms-hill"></i>
        <div class="ms-door" id="msDoor"><i class="ms-dark"></i><i class="ms-leaf"></i></div>
        <div class="ms-mario" id="msMario"><img class="m-stand" src="img/mario-stand.png" alt="Mario"><span class="m-run" aria-hidden="true"></span></div>
        <div class="ms-ground"></div>
        <p class="ms-text" id="msText"></p>
      </div>
      <p>¿Quieres salir por la puerta? Tu matrícula y tus notas quedan guardadas para la próxima partida.</p>`;
    const dlg = dialog({
      title: "¿Fin de la partida?",
      html,
      theme: "mario",
      actions: [
        { label: "SEGUIR JUGANDO", cls: "px-btn outline", onClick: ({ close }) => close() },
        {
          label: "SALIR POR LA PUERTA",
          cls: "px-btn red",
          onClick: async ({ close, box }) => {
            state.busy = true;
            $$("button", box).forEach((b) => (b.disabled = true));
            $("#mTitle", box).textContent = "Saliendo...";
            const scene = $("#marioScene", box);
            const door = $("#msDoor", box);
            const mario = $("#msMario", box);
            const text = $("#msText", box);
            const fast = reduced();
            scene.classList.add("walking");
            let steps = 0;
            const iv = setInterval(() => SFX.step(), 180);
            await wait(fast ? 100 : 1900);
            clearInterval(iv);
            scene.classList.add("stopped");
            door.classList.add("open");
            SFX.door();
            await wait(fast ? 100 : 500);
            mario.classList.add("enter");
            await wait(fast ? 100 : 600);
            door.classList.remove("open");
            SFX.door();
            await wait(fast ? 100 : 500);
            text.textContent = "¡Hasta la próxima partida!";
            text.classList.add("show");
            SFX.coin();
            await wait(fast ? 300 : 1200);
            close();
            state.busy = false;
            leaveApp();
          },
        },
      ],
    });
  }

  /* ============================================================
     ARRANQUE
     ============================================================ */
  function init() {
    $("#playerName").textContent = USER.name;
    $("#playerMeta").textContent = `Semestre ${String(USER.semester).padStart(2, "0")}`;
    $("#periodLabel").textContent = PERIOD;
    $("#periodChip").textContent = PERIOD;

    $$("[data-view]").forEach((b) => b.addEventListener("click", () => { SFX.click(); go(b.dataset.view); }));
    view.addEventListener("click", (e) => {
      const g = e.target.closest("[data-go]");
      if (g) { SFX.click(); go(g.dataset.go); }
    });
    $("#logoutBtn").addEventListener("click", openLogout);
    $("#logoutBtn2").addEventListener("click", openLogout);

    $$("[data-ico]").forEach((el) => setIco(el, el.dataset.ico));

    // menú lateral minimizable (se recuerda entre visitas)
    const appEl = $("#app");
    const cb = $("#collapseBtn");
    const setCollapsed = (c) => {
      appEl.classList.toggle("collapsed", c);
      cb.setAttribute("aria-expanded", String(!c));
      cb.dataset.tip = c ? "Expandir menú" : "Minimizar menú";
      try { localStorage.setItem("gc-collapsed", c ? "1" : "0"); } catch (e) {}
    };
    let startCollapsed = false;
    try { startCollapsed = localStorage.getItem("gc-collapsed") === "1"; } catch (e) {}
    setCollapsed(startCollapsed);
    cb.addEventListener("click", () => { SFX.click(); setCollapsed(!appEl.classList.contains("collapsed")); });

    // modo oscuro / claro (solo ícono)
    const root = document.documentElement;
    const tb = $("#themeBtn");
    const applyTheme = (light, save = false) => {
      if (light) root.setAttribute("data-theme", "light"); else root.removeAttribute("data-theme");
      setIco($(".ico", tb), light ? "moon" : "sun");
      const label = light ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
      tb.setAttribute("aria-label", label);
      tb.title = label;
      if (save) { try { localStorage.setItem("gc-theme2", light ? "light" : "dark"); } catch (e) {} }
    };
    applyTheme(root.getAttribute("data-theme") === "light");
    tb.addEventListener("click", () => { SFX.click(); applyTheme(root.getAttribute("data-theme") !== "light", true); });
    const sb = $("#soundBtn");
    const paint = () => {
      const m = SFX.isMuted();
      sb.setAttribute("aria-pressed", String(m));
      setIco($(".ico", sb), m ? "soundOff" : "soundOn");
      $(".lbl", sb).textContent = m ? "Sonido apagado" : "Sonido";
      sb.dataset.tip = m ? "Sonido apagado" : "Sonido";
    };
    sb.addEventListener("click", () => { SFX.toggle(); paint(); });
    paint();

    initLogin();
    initEnrollmentEvents();
    initGradesEvents();
    initScheduleEvents();

    // Atajo para la demo: index.html?demo=schedule entra directo a esa pantalla
    const demo = new URLSearchParams(location.search).get("demo");
    if (demo && TITLES[demo]) enterApp(demo);
  }

  init();
})();
