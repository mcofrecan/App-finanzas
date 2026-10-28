/* Caja Familiar — interfaz. Depende de F (calc.js) y Store (store.js). */
"use strict";
const APP_VERSION = "1.0.0";
const S = { cfg: null, items: [], planes: [], movs: [], cuentas: [], deudas: [], metas: [],
  tab: "inicio", mes: F.mk(F.hoy()), vista: "mes", filtro: "todos", compara: false, installEvt: null, swWaiting: null, listo: false };
const GRUPOS_DEF = [{ id: "ingreso", nombre: "Ingresos" }, { id: "vivienda", nombre: "Vivienda" }, { id: "hogar", nombre: "Hogar y comida" }, { id: "auto", nombre: "Auto" }, { id: "deudas", nombre: "Deudas y cuotas" }, { id: "otros", nombre: "Otros" }];
const TIPOS_CTA = { liquida: "Cuenta / efectivo", ahorro: "Ahorro", credito: "Tarjeta de crédito" };
const SUGERIDOS = [["Supermercado", "hogar"], ["Feria", "hogar"], ["Luz", "hogar"], ["Agua", "hogar"], ["Gas", "hogar"], ["Internet y celular", "hogar"], ["Farmacia", "hogar"], ["Salud", "hogar"],
  ["Colegio / jardín", "hogar"], ["Ropa", "hogar"], ["Mascotas", "hogar"], ["Salidas y restaurantes", "hogar"], ["Delivery", "hogar"], ["Suscripciones", "hogar"], ["Regalos", "hogar"], ["Vacaciones", "otros"],
  ["Mantención auto", "auto"], ["TAG / autopistas", "auto"], ["Revisión técnica", "auto"], ["Contribuciones", "vivienda"], ["Seguro hogar", "vivienda"], ["Arreglos casa", "vivienda"],
  ["Avance en cuotas", "deudas"], ["Línea de crédito", "deudas"], ["Honorarios", "ingreso"], ["Reembolsos", "ingreso"]];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 20);
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "item";
const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(v) === String(sel ?? "") ? "selected" : ""}>${esc(l)}</option>`;
const mesHoy = () => F.mk(F.hoy());
const grupos = () => S.cfg?.grupos?.length ? S.cfg.grupos : GRUPOS_DEF;
const itemById = id => S.items.find(i => i.id === id);
const ctaById = id => S.cuentas.find(c => c.id === id);
const planActivo = () => S.planes.find(p => p.id === S.cfg?.planActivo) || S.planes[0] || null;
function itemsActivos() {
  const gi = Object.fromEntries(grupos().map((g, i) => [g.id, i]));
  return S.items.filter(i => !i.archivado).sort((a, b) => (gi[a.grupo] ?? 99) - (gi[b.grupo] ?? 99) || (a.orden ?? 99) - (b.orden ?? 99) || a.nombre.localeCompare(b.nombre));
}
const stCalc = () => ({ cfg: S.cfg, items: itemsActivos(), movs: S.movs, ctas: S.cuentas });

/* ---------- persistencia ---------- */
const KEY = { items: "items", planes: "planes", movs: "movs", cuentas: "cuentas", deudas: "deudas", metas: "metas" };
async function save(store, obj) {
  try {
    if (store === "config") { const o = { ...obj, id: "main" }; await Store.put("config", o); S.cfg = o; }
    else { const o = await Store.put(store, obj); const arr = S[KEY[store]]; const i = arr.findIndex(x => x.id === o.id); if (i >= 0) arr[i] = o; else arr.push(o); }
    render(); return true;
  } catch (e) { toast("No se pudo guardar: " + (e.message || e)); return false; }
}
async function remove(store, id) {
  try { await Store.del(store, id); S[KEY[store]] = S[KEY[store]].filter(x => x.id !== id); render(); return true; }
  catch (e) { toast("No se pudo borrar: " + (e.message || e)); return false; }
}
async function cargar() {
  const d = await Store.loadAll();
  S.cfg = d.config.find(c => c.id === "main") || null;
  for (const k of ["items", "planes", "movs", "cuentas", "deudas", "metas"]) S[k] = d[k] || [];
  S.listo = true; render();
}

function toast(msg, ms = 2800) { const r = $("#toastRoot"); r.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toast.t); toast.t = setTimeout(() => r.innerHTML = "", ms); }

/* =====================  RENDER  ===================== */
const TIT = { inicio: "Caja Familiar", plan: "Plan", movs: "Movimientos", proy: "Proyección", mas: "Más" };
function header() {
  const conMes = S.tab === "movs" || S.tab === "plan";
  $("#top").innerHTML = `<h1>${TIT[S.tab]}</h1>` + (conMes ? `<div class="mnav"><button data-act="mes" data-n="-1" aria-label="Mes anterior">‹</button><span>${F.mesLbl(S.mes, true)}</span><button data-act="mes" data-n="1" aria-label="Mes siguiente">›</button></div>` : "");
}
function banner() {
  let h = "";
  if (S.swWaiting) h += `<div class="alert info"><span class="grow">Hay una versión nueva de la app.</span><button class="btn sm" data-act="actualizarApp">Actualizar</button></div>`;
  $("#banner").innerHTML = h;
}
function render() {
  if (!S.listo) return;
  banner();
  if (!S.cfg) { $("#tabs").hidden = true; $("#fab").hidden = true; $("#top").innerHTML = "<h1>Caja Familiar</h1>"; $("#view").innerHTML = vBienvenida(); return; }
  $("#tabs").hidden = false; $("#fab").hidden = S.tab === "mas";
  document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === S.tab ? "page" : "false"));
  header();
  const v = { inicio: vInicio, plan: vPlan, movs: vMovs, proy: vProy, mas: vMas }[S.tab];
  const y = window.scrollY; $("#view").innerHTML = v(); window.scrollTo(0, y);
}

function vBienvenida() {
  return `<section class="card hero"><h2>Bienvenido</h2><div class="mid">Tu plan, tus gastos y tu liquidez, en el teléfono.</div><div class="sub">Todo queda guardado solo en este dispositivo. Elige cómo empezar:</div></section>
  <div class="gap8"><button class="btn primary block" data-act="empOrigen">Empezar con mi plan Origen (de la planilla)</button>
  <button class="btn block" data-act="empBlanco">Empezar con un plan en blanco</button>
  <label class="btn block">Restaurar un respaldo<input type="file" id="fileRestore" accept="application/json,.json" hidden></label></div>
  <p class="note">El respaldo de la versión anterior (artefacto de Claude) también se puede restaurar aquí.</p>`;
}

const iniciales = n => (n || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
function dot(it, tipo) { return `<span class="dot ${tipo === "ingreso" ? "ing" : ""}" aria-hidden="true">${esc(iniciales(it?.nombre))}</span>`; }
function movItem(m) {
  const it = itemById(m.item), cta = ctaById(m.cuenta);
  const titulo = m.tipo === "transferencia" ? `${esc(cta?.nombre || "?")} → ${esc(ctaById(m.destino)?.nombre || "?")}` : esc(it?.nombre || "Sin ítem");
  const sign = m.tipo === "ingreso" ? "+" : m.tipo === "gasto" ? "−" : "";
  return `<button class="item" data-act="editarMov" data-id="${esc(m.id)}">${m.tipo === "transferencia" ? '<span class="dot" aria-hidden="true">⇄</span>' : dot(it, m.tipo)}<span class="grow"><span class="t">${titulo}</span><span class="d">${esc(m.nota || "")}${m.nota ? " · " : ""}${esc(m.tipo === "transferencia" ? "Transferencia" : cta?.nombre || "")}</span></span><span class="amt ${m.tipo === "ingreso" ? "pos" : ""}">${sign}${F.clp(m.monto)}</span></button>`;
}

/* ---------- Inicio ---------- */
function vInicio() {
  const hoy = F.hoy(), mes = F.mk(hoy), p = planActivo(), items = itemsActivos(), cfg = S.cfg;
  const r = F.resumen(S.cuentas, S.movs), pe = F.pendiente(p, items, S.movs, mes, cfg.uf, mes);
  const cierre = (r.tieneSaldos ? r.disponible : pe.real.neto) + pe.pendIng - pe.pendGas;
  const pct = pe.pptoGas ? Math.min(100, pe.real.gas / pe.pptoGas * 100) : 0;
  const alertas = items.filter(i => i.tipo === "gasto" && i.alertas !== false).map(i => { const pv = F.efectivo(p, i, mes, S.movs, cfg.uf, mes), rv = pe.real.by[i.id] || 0; return { i, pv, rv, st: F.estado(pv, rv, F.umbrales(i, cfg)) }; })
    .filter(x => x.st !== "ok").sort((a, b) => b.rv / (b.pv || 1) - a.rv / (a.pv || 1));
  const pagos = pe.det.filter(d => ["vivienda", "auto", "deudas"].includes(d.item.grupo) || d.item.dia).sort((a, b) => (a.item.dia || 99) - (b.item.dia || 99));
  const dHoy = +hoy.slice(8);
  const ultimos = [...S.movs].sort((a, b) => (b.fecha + String(b.ts).padStart(15, "0")).localeCompare(a.fecha + String(a.ts).padStart(15, "0"))).slice(0, 5);
  const bajo = F.proyeccion(stCalc(), p, mes).filas.find(f => f.saldo < (cfg.colchon || 0));
  let h = "";
  if (S.installEvt) h += `<div class="alert info"><span class="grow">Instala la app para abrirla desde tu pantalla de inicio, incluso sin internet.</span><button class="btn sm" data-act="instalar">Instalar</button></div>`;
  const diasResp = cfg.ultimoRespaldo ? Math.floor((Date.now() - new Date(cfg.ultimoRespaldo)) / 864e5) : null;
  if (S.movs.length >= 5 && (diasResp == null || diasResp > 30)) h += `<div class="alert cerca"><span class="grow">${diasResp == null ? "Aún no has respaldado tus datos." : `Tu último respaldo fue hace ${diasResp} días.`} Si pierdes el teléfono, se pierden.</span><button class="btn sm" data-act="backup">Respaldar</button></div>`;
  h += `<section class="card hero"><h2>Disponible hoy</h2>`;
  if (r.tieneSaldos) h += `<div class="big">${F.clp(r.disponible)}</div><div class="sub">En cuentas ${F.clp(r.liquido)}${r.deudaTC ? ` · tarjeta por pagar ${F.clp(r.deudaTC)}` : ""}${r.faltan ? ` · ${r.faltan} cuenta(s) sin saldo` : ""}</div>`;
  else h += `<div class="mid">Falta tu saldo actual</div><div class="sub">Ingresa cuánto tienes hoy en tus cuentas para calcular tu disponible real. Es opcional: el plan funciona igual sin esto.</div><div style="margin-top:12px"><button class="btn" data-act="irCuentas">Ingresar saldos</button></div>`;
  h += `</section>`;
  h += `<div class="split"><section class="card"><h2>Gastado en ${F.MES[+mes.slice(5) - 1]}</h2><div class="mid">${F.clp(pe.real.gas)}</div><div class="bar ${F.estado(pe.pptoGas, pe.real.gas, cfg)}"><i style="width:${pct}%"></i></div><div class="note" style="margin-top:6px">${pe.pptoGas ? `de ${F.clp(pe.pptoGas)} presupuestado` : "Sin presupuesto este mes"}</div></section>
  <section class="card"><h2>Cierre de mes</h2><div class="mid ${cierre < 0 ? "neg" : ""}">${F.clp(cierre)}</div><div class="note" style="margin-top:6px">${r.tieneSaldos ? "Disponible al cerrar el mes si cumples el plan" : "Ahorro del mes según plan"}</div></section></div>`;
  if (alertas.length || bajo) {
    h += `<section class="gap8" aria-label="Alertas">`;
    for (const a of alertas.slice(0, 5)) h += `<button class="alert ${a.st}" data-act="item" data-id="${esc(a.i.id)}" style="border:0;text-align:left;width:100%"><span class="grow"><b>${esc(a.i.nombre)}</b>: ${a.st === "sinppto" ? `gastaste ${F.clp(a.rv)} sin presupuesto` : `${Math.round(a.rv / a.pv * 100)}% del presupuesto (${F.clp(a.rv)} de ${F.clp(a.pv)})`}</span></button>`;
    if (bajo) h += `<div class="alert bad"><span><b>Liquidez:</b> en ${F.mesLbl(bajo.mes, true)} tu saldo proyectado baja a ${F.clp(bajo.saldo)}${cfg.colchon ? `, bajo tu colchón de ${F.clp(cfg.colchon)}` : ""}.</span></div>`;
    h += `</section>`;
  }
  h += `<section class="card"><h2>Pagos pendientes del mes</h2>`;
  h += !pagos.length ? `<div class="note">${p ? "No quedan compromisos fijos por pagar este mes." : "Sin plan activo."}</div>` :
    `<div class="list">${pagos.map(d => `<button class="item" data-act="pagar" data-id="${esc(d.item.id)}" data-monto="${d.falta}">${dot(d.item)}<span class="grow"><span class="t">${esc(d.item.nombre)}</span><span class="d">${d.item.dia ? (d.item.dia >= dHoy ? `vence el ${d.item.dia} (en ${d.item.dia - dHoy} días)` : `venció el ${d.item.dia}`) : "este mes"}${d.real ? ` · pagado ${F.clp(d.real)}` : ""}</span></span><span class="amt">${F.clp(d.falta)}</span></button>`).join("")}</div><div class="note" style="margin-top:4px">Toca un pago para registrarlo.</div>`;
  h += `</section>`;
  if (r.cupoDisp || r.ahorro) h += `<section class="card"><h2>Otros saldos</h2>${r.ahorro ? `<div class="kv"><span>Ahorro</span><span class="amt">${F.clp(r.ahorro)}</span></div>` : ""}${r.cupoDisp ? `<div class="kv"><span>Cupo disponible en tarjeta <span class="note">(crédito, no es dinero tuyo)</span></span><span class="amt muted">${F.clp(r.cupoDisp)}</span></div>` : ""}</section>`;
  h += `<section class="card"><div class="row" style="margin-bottom:4px"><h2 class="grow" style="margin:0">Últimos movimientos</h2><button class="link" data-tab="movs">Ver todos</button></div>`;
  h += ultimos.length ? `<div class="list">${ultimos.map(movItem).join("")}</div>` : `<div class="empty"><b>Sin movimientos aún</b>Toca + para registrar tu primer gasto o ingreso.</div>`;
  return h + `</section>`;
}

/* ---------- Plan ---------- */
function vPlan() {
  const p = planActivo();
  let h = `<div class="seg" role="group" aria-label="Vista">${[["mes", "Mes"], ["grilla", "Grilla anual"]].map(([k, l]) => `<button data-act="vista" data-v="${k}" aria-pressed="${S.vista === k}">${l}</button>`).join("")}</div>`;
  if (S.planes.length > 1) h += `<div class="chips" role="group" aria-label="Plan activo">${S.planes.map(x => `<button class="chip" data-act="activarPlan" data-id="${esc(x.id)}" aria-pressed="${x.id === p?.id}">${esc(x.nombre)}</button>`).join("")}</div>`;
  if (!p) return h + `<div class="card empty"><b>No hay un plan</b>Crea uno en Más → Planes.</div>`;
  if (S.mes < p.desde || S.mes > p.hasta) h += `<div class="alert info">El plan ${esc(p.nombre)} va de ${F.mesLbl(p.desde, true)} a ${F.mesLbl(p.hasta, true)}. Puedes extenderlo asignando presupuesto a meses nuevos.</div>`;
  return h + (S.vista === "grilla" ? vGrilla(p) : vPlanMes(p));
}
function vPlanMes(p) {
  const items = itemsActivos(), cfg = S.cfg, mes = S.mes, act = mesHoy(), r = F.realMes(S.movs, mes);
  const fil = items.map(i => ({ i, pv: F.efectivo(p, i, mes, S.movs, cfg.uf, act), base: F.ppto(p, i.id, mes, cfg.uf), rv: r.by[i.id] || 0 }));
  const gas = fil.filter(x => x.i.tipo !== "ingreso"), ing = fil.filter(x => x.i.tipo === "ingreso");
  const tp = gas.reduce((a, x) => a + Math.max(0, x.pv), 0), tr = gas.reduce((a, x) => a + x.rv, 0), st = F.estado(tp, tr, cfg);
  const ip = ing.reduce((a, x) => a + x.pv, 0), ir = ing.reduce((a, x) => a + x.rv, 0);
  let h = `<section class="card"><div class="row"><div class="grow"><h2>Gastos de ${F.mesLbl(mes, true)}</h2><div class="mid">${F.clp(tr)} <span class="muted small" style="font-family:var(--f-body);font-weight:500">de ${F.clp(tp)}</span></div></div><span class="pill ${st === "ok" ? "neutral" : st}">${tp ? Math.round(tr / tp * 100) + "%" : "—"}</span></div><div class="bar ${st}"><i style="width:${tp ? Math.min(100, tr / tp * 100) : 0}%"></i></div>
  <div class="kv" style="margin-top:8px"><span>Ingresos</span><span class="amt">${F.clp(ir)} <span class="muted" style="font-weight:500">/ ${F.clp(ip)}</span></span></div><div class="kv"><span>Queda por gastar</span><span class="amt ${tp - tr < 0 ? "neg" : ""}">${F.clp(tp - tr)}</span></div></section>`;
  for (const g of grupos()) {
    const fs = fil.filter(x => (x.i.grupo || "otros") === g.id); if (!fs.length) continue;
    const vis = fs.filter(x => x.pv || x.rv), ocultos = fs.filter(x => !(x.pv || x.rv));
    h += `<section class="card"><div class="row"><h2 class="grow" style="margin:0">${esc(g.nombre)}</h2><span class="note">${F.clp(vis.reduce((a, x) => a + x.rv, 0))} / ${F.clp(vis.reduce((a, x) => a + Math.max(0, x.pv), 0))}</span></div>`;
    for (const x of vis) {
      const u = F.umbrales(x.i, cfg), s2 = x.i.tipo === "ingreso" ? "ok" : F.estado(x.pv, x.rv, u), pc = x.pv > 0 ? x.rv / x.pv * 100 : (x.rv ? 100 : 0), arr = x.pv - x.base;
      h += `<button class="item block" data-act="item" data-id="${esc(x.i.id)}"><div class="row"><span class="grow t">${esc(x.i.nombre)}</span><span class="amt">${F.clp(x.rv)} <span class="muted" style="font-weight:500">/ ${F.clp(x.pv)}</span></span></div><div class="bar ${x.i.tipo === "ingreso" ? "" : s2}"><i style="width:${Math.min(100, Math.max(0, pc))}%"></i></div>${arr ? `<span class="d" style="margin-top:4px">${arr > 0 ? `incluye ${F.clp(arr)} que sobró` : `descuenta ${F.clp(-arr)} de exceso`} en meses anteriores</span>` : ""}${x.i.tipo !== "ingreso" && (x.pv > 0 || s2 !== "ok") ? `<span class="row" style="margin-top:4px">${s2 !== "ok" ? `<span class="pill ${s2}">${s2 === "sinppto" ? "sin presupuesto" : Math.round(pc) + "%"}</span>` : ""}<span class="d">${x.pv <= 0 ? "Toca para asignarle presupuesto" : x.pv - x.rv >= 0 ? "Quedan " + F.clp(x.pv - x.rv) : "Te pasaste por " + F.clp(x.rv - x.pv)}</span></span>` : ""}</button>`;
    }
    if (ocultos.length) h += `<details><summary class="note" style="padding-top:8px">${ocultos.length} ítem(s) sin presupuesto ni gasto este mes</summary><div class="chips" style="margin-top:8px">${ocultos.map(x => `<button class="chip" data-act="item" data-id="${esc(x.i.id)}">${esc(x.i.nombre)}</button>`).join("")}</div></details>`;
    h += `</section>`;
  }
  h += `<button class="btn block" data-act="nuevoItem">+ Agregar ítem al plan</button>`;
  return h + vTendencia();
}
function vTendencia() {
  const meses = F.rango(F.addM(S.mes, -5), S.mes), p = planActivo(), items = itemsActivos();
  const data = meses.map(m => ({ m, r: F.realMes(S.movs, m).gas, p: F.pptoMes(p, items, m, S.cfg.uf).gas }));
  if (!data.some(d => d.r)) return "";
  const W = 340, H = 150, pl = 40, pb = 20, max = Math.max(...data.map(d => Math.max(d.r, d.p))) * 1.1 || 1, bw = (W - pl) / data.length, y = v => H - pb - (v / max) * (H - pb - 8);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gasto real por mes, últimos 6 meses">`;
  for (let i = 0; i <= 2; i++) { const v = max / 1.1 * i / 2; svg += `<line x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 4}" y="${y(v) + 3}" text-anchor="end">${F.clpK(v)}</text>`; }
  data.forEach((d, i) => { const x = pl + i * bw + bw * .2, w = bw * .6; svg += `<rect x="${x}" y="${y(d.r)}" width="${w}" height="${H - pb - y(d.r)}" rx="3" fill="${d.p && d.r > d.p ? "var(--bad)" : "var(--accent)"}"/>`; if (d.p) svg += `<line x1="${x - 3}" x2="${x + w + 3}" y1="${y(d.p)}" y2="${y(d.p)}" stroke="var(--ink)" stroke-width="2"/>`; svg += `<text x="${x + w / 2}" y="${H - 5}" text-anchor="middle">${F.MES[+d.m.slice(5) - 1]}</text>`; });
  const prev = F.rango(F.addM(S.mes, -3), F.addM(S.mes, -1)).map(m => F.realMes(S.movs, m).by), act = F.realMes(S.movs, S.mes).by;
  const cambios = items.filter(i => i.tipo !== "ingreso").map(i => { const prom = prev.reduce((a, b) => a + (b[i.id] || 0), 0) / 3; return { i, prom, act: act[i.id] || 0 }; }).filter(x => x.prom > 0 && x.act > x.prom * 1.2 && x.act - x.prom >= 10000).sort((a, b) => (b.act - b.prom) - (a.act - a.prom)).slice(0, 3);
  return `<section class="card"><h2>Tendencia de gasto</h2>${svg}</svg><div class="note">Barras: gasto real. Línea: presupuesto.</div>${cambios.map(x => `<div class="kv"><span>${esc(x.i.nombre)}</span><span class="amt neg">+${Math.round((x.act / x.prom - 1) * 100)}% vs promedio 3 meses</span></div>`).join("")}</section>`;
}
function vGrilla(p) {
  const meses = F.rango(S.mes, F.addM(S.mes, 11)), items = itemsActivos(), cfg = S.cfg, act = mesHoy();
  const reales = Object.fromEntries(meses.map(m => [m, F.realMes(S.movs, m)]));
  let h = `<section class="card" style="padding-inline:16px"><div class="gridwrap"><table class="grid"><thead><tr><th>Ítem</th>${meses.map(m => `<th class="${m === act ? "cur" : ""}">${F.mesLbl(m)}</th>`).join("")}</tr></thead><tbody>`;
  for (const g of grupos()) {
    const is = items.filter(i => (i.grupo || "otros") === g.id); if (!is.length) continue;
    h += `<tr class="grp"><td colspan="${meses.length + 1}">${esc(g.nombre)}</td></tr>`;
    for (const i of is) {
      h += `<tr><td title="${esc(i.nombre)}">${esc(i.nombre)}</td>` + meses.map(m => {
        const pv = F.ppto(p, i.id, m, cfg.uf), rv = reales[m].by[i.id] || 0, pasado = m <= act;
        const st = pasado && i.tipo !== "ingreso" ? F.estado(F.efectivo(p, i, m, S.movs, cfg.uf, act), rv, F.umbrales(i, cfg)) : "ok";
        const txt = pv ? F.clpK(pv) : '<span class="z">·</span>';
        return `<td class="c ${m === act ? "cur" : ""} ${st}" data-act="item" data-id="${esc(i.id)}" data-mes="${m}">${txt}${pasado && rv ? `<div class="note" style="font-size:11px">${F.clpK(rv)}</div>` : ""}</td>`;
      }).join("") + `</tr>`;
    }
  }
  const tot = meses.map(m => F.pptoMes(p, items, m, cfg.uf));
  h += `<tr class="grp"><td colspan="${meses.length + 1}">Totales del plan</td></tr>`;
  h += `<tr class="tot"><td>Ingresos</td>${tot.map((t, k) => `<td class="${meses[k] === act ? "cur" : ""}">${F.clpK(t.ing)}</td>`).join("")}</tr>`;
  h += `<tr class="tot"><td>Gastos</td>${tot.map((t, k) => `<td class="${meses[k] === act ? "cur" : ""}">${F.clpK(t.gas)}</td>`).join("")}</tr>`;
  h += `<tr class="tot"><td>Neto</td>${tot.map((t, k) => `<td class="${meses[k] === act ? "cur" : ""} ${t.neto < 0 ? "neg" : ""}">${F.clpK(t.neto)}</td>`).join("")}</tr>`;
  h += `</tbody></table></div><div class="note" style="margin-top:8px">Cada celda muestra el presupuesto; debajo, lo gastado en meses ya ocurridos (en rojo o ámbar si superó el umbral). Toca una celda para editar.</div></section>`;
  return h;
}

/* ---------- Movimientos ---------- */
function vMovs() {
  const ms = S.movs.filter(m => F.mk(m.fecha) === S.mes && (S.filtro === "todos" || m.tipo === S.filtro)).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.ts || 0) - (a.ts || 0));
  const r = F.realMes(S.movs, S.mes);
  let h = `<section class="card"><div class="kv"><span>Ingresos</span><span class="amt pos">${F.clp(r.ing)}</span></div><div class="kv"><span>Gastos</span><span class="amt">${F.clp(r.gas)}</span></div><div class="kv"><span><b>Neto</b></span><span class="amt ${r.neto < 0 ? "neg" : ""}">${F.clp(r.neto)}</span></div></section>`;
  h += `<div class="chips" role="group" aria-label="Filtrar">${[["todos", "Todos"], ["gasto", "Gastos"], ["ingreso", "Ingresos"], ["transferencia", "Transferencias"]].map(([k, l]) => `<button class="chip" data-act="filtro" data-v="${k}" aria-pressed="${S.filtro === k}">${l}</button>`).join("")}</div>`;
  if (!ms.length) return h + `<div class="card empty"><b>Nada registrado en ${F.mesLbl(S.mes, true)}</b>Toca + para agregar un movimiento.</div>`;
  h += `<section class="card">`; let dia = "";
  for (const m of ms) { if (m.fecha !== dia) { dia = m.fecha; h += `<div class="daylabel">${new Date(dia + "T12:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "short" })}</div>`; } h += movItem(m); }
  return h + `</section>`;
}

/* ---------- Proyección ---------- */
function chartProy(series) {
  const all = series.flatMap(s => s.filas), meses = series[0].filas.map(f => f.mes), col = S.cfg.colchon || 0;
  const W = 340, H = 170, pl = 44, pb = 20, pt = 8, vals = all.map(f => f.saldo).concat([0, col]);
  const mn = Math.min(...vals), mx = Math.max(...vals) || 1, rng = (mx - mn) || 1;
  const x = i => pl + (i / Math.max(1, meses.length - 1)) * (W - pl - 6), y = v => pt + (mx - v) / rng * (H - pb - pt);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo proyectado por mes">`;
  for (let i = 0; i <= 3; i++) { const v = mn + rng * i / 3; svg += `<line x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 4}" y="${y(v) + 3}" text-anchor="end">${F.clpK(v)}</text>`; }
  if (mn < 0) svg += `<line x1="${pl}" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--bad)" stroke-dasharray="3 3"/>`;
  if (col) svg += `<line x1="${pl}" x2="${W}" y1="${y(col)}" y2="${y(col)}" stroke="var(--warn)" stroke-dasharray="5 3"/>`;
  const n = meses.length - 1;
  meses.forEach((m, i) => { if ((i % 6 === 0 && (n - i >= 4 || i === 0)) || i === n) svg += `<text x="${x(i)}" y="${H - 5}" text-anchor="${i === 0 ? "start" : i === n ? "end" : "middle"}">${F.mesLbl(m)}</text>`; });
  series.forEach((s, k) => {
    const pts = s.filas.map((f, i) => `${x(i).toFixed(1)},${y(f.saldo).toFixed(1)}`).join(" ");
    if (k === 0) svg += `<polygon points="${x(0)},${y(Math.max(mn, 0))} ${pts} ${x(s.filas.length - 1)},${y(Math.max(mn, 0))}" fill="var(--accent)" opacity=".12"/>`;
    svg += `<polyline points="${pts}" fill="none" stroke="${k ? "var(--chart2)" : "var(--accent)"}" stroke-width="2.2" ${k ? 'stroke-dasharray="5 4"' : ""}/>`;
    const L = s.filas[s.filas.length - 1]; svg += `<circle cx="${x(s.filas.length - 1)}" cy="${y(L.saldo)}" r="3.5" fill="${k ? "var(--chart2)" : "var(--accent)"}"/>`;
  });
  return svg + `</svg>`;
}
function vProy() {
  const mes = mesHoy(), p = planActivo(); const st = stCalc();
  let h = S.planes.length > 1 ? `<div class="chips" role="group" aria-label="Plan">${S.planes.map(x => `<button class="chip" data-act="activarPlan" data-id="${esc(x.id)}" aria-pressed="${x.id === p?.id}">${esc(x.nombre)}</button>`).join("")}<button class="chip" data-act="compara" aria-pressed="${S.compara}">Comparar</button></div>` : "";
  if (!p) return h + `<div class="card empty"><b>Sin plan</b>Crea uno en Más → Planes.</div>`;
  const otro = S.compara ? S.planes.find(x => x.id !== p.id) : null;
  const fin = [p.hasta, otro?.hasta, F.addM(mes, 1)].filter(Boolean).sort().pop();
  const pr = F.proyeccion(st, p, mes, fin), series = [pr]; if (otro) series.push(F.proyeccion(st, otro, mes, fin));
  const filas = pr.filas, L = filas[filas.length - 1], min = filas.reduce((a, b) => b.saldo < a.saldo ? b : a, filas[0]), deficit = filas.filter(f => !f.actual && f.neto < 0);
  h += `<section class="card"><h2>Saldo proyectado</h2><div class="mid">${F.clp(L.saldo)}</div><div class="note">a ${F.mesLbl(L.mes, true)} · ${pr.base === "saldos" ? "parte de tu disponible real" : "parte de $0 (ingresa saldos en Más → Cuentas para usar tu dinero real)"}</div>${chartProy(series)}
  ${otro ? `<div class="row note" style="flex-wrap:wrap"><span style="color:var(--accent)">━ ${esc(p.nombre)}</span><span style="color:var(--chart2)">╍ ${esc(otro.nombre)}: ${F.clp(series[1].filas.at(-1).saldo)}</span></div>` : ""}
  <div class="kv"><span>Punto más bajo</span><span class="amt ${min.saldo < (S.cfg.colchon || 0) ? "neg" : ""}">${F.clp(min.saldo)} · ${F.mesLbl(min.mes)}</span></div>
  <div class="kv"><span>Ahorro mensual promedio</span><span class="amt">${F.clp(filas.slice(1).reduce((a, b) => a + b.neto, 0) / Math.max(1, filas.length - 1))}</span></div>
  ${deficit.length ? `<div class="kv"><span>Meses con déficit</span><span class="amt neg" style="white-space:normal;text-align:right">${deficit.map(f => F.mesLbl(f.mes)).join(", ")}</span></div>` : ""}</section>`;
  if (p.notas?.length) h += `<section class="alert cerca" style="display:block"><b>Revisar en este plan</b><ul style="margin:6px 0 0;padding-left:18px">${p.notas.map(n => `<li>${esc(n)}</li>`).join("")}</ul></section>`;
  h += `<section class="card"><h2>Mes a mes</h2>${filas.map((f, i) => (i === 13 ? `<details><summary class="link" style="padding:8px 0">Ver ${filas.length - 13} meses más</summary>` : "") + `<details class="mrow"><summary><span>${F.mesLbl(f.mes)}${f.actual ? " •" : ""}</span><span class="${f.neto < 0 ? "neg" : "muted"}">${f.neto >= 0 ? "+" : ""}${F.clp(f.neto)}</span><span class="amt">${F.clp(f.saldo)}</span></summary>${detalleMes(p, f.mes)}</details>`).join("") + (filas.length > 13 ? "</details>" : "")}<div class="note" style="margin-top:8px">Neto del mes y saldo acumulado. • = mes en curso (lo real + lo que falta del plan).</div></section>`;
  return h + vCompromisos(p, mes) + vSupuestos(p);
}
function detalleMes(p, mes) { const items = itemsActivos(), pm = F.pptoMes(p, items, mes, S.cfg.uf); return `<div class="small" style="padding:6px 0 2px">${items.filter(i => pm.by[i.id]).map(i => `<div class="kv"><button class="link" data-act="item" data-id="${esc(i.id)}" data-mes="${mes}" style="font-weight:500;color:var(--ink)">${esc(i.nombre)}</button><span class="${i.tipo === "ingreso" ? "pos" : ""}">${i.tipo === "ingreso" ? "+" : "−"}${F.clp(pm.by[i.id])}</span></div>`).join("") || '<div class="note">Sin presupuesto en este mes.</div>'}</div>`; }
function vCompromisos(p, mes) {
  const rows = itemsActivos().filter(i => i.grupo === "deudas" || i.grupo === "vivienda").map(i => {
    const ms = Object.keys(p.presupuesto?.[i.id]?.montos || {}).filter(m => m >= mes).sort(); if (!ms.length) return null;
    return { i, tot: ms.reduce((a, m) => a + F.ppto(p, i.id, m, S.cfg.uf), 0), n: ms.length, fin: ms.at(-1), abierto: ms.at(-1) === p.hasta };
  }).filter(Boolean);
  if (!rows.length) return "";
  return `<section class="card"><h2>Compromisos proyectados</h2>${rows.map(r => `<div class="kv"><span>${esc(r.i.nombre)}<br><span class="note">${r.n} pagos · ${r.abierto ? "sigue después de " + F.mesLbl(r.fin, true) : "termina " + F.mesLbl(r.fin, true)}</span></span><span class="amt">${F.clp(r.tot)}</span></div>`).join("")}<div class="note" style="margin-top:6px">Suma de lo presupuestado desde este mes en vivienda y deudas. Son proyecciones; tus deudas reales se registran en Más → Deudas.</div></section>`;
}
function vSupuestos(p) { if (!p.supuestos?.length) return ""; return `<section class="card"><details><summary style="font-weight:600">Supuestos del plan ${esc(p.nombre)}</summary><div style="margin-top:8px">${p.supuestos.map(s => `<div class="kv small"><span>${esc(s.k)}</span><span class="amt">${s.uf != null ? esc(String(s.uf).replace(".", ",")) + (s.k === "UF" ? "" : " UF") + (s.clp != null ? " · " : "") : ""}${s.clp != null ? F.clp(s.clp) : ""}</span></div>`).join("")}<div class="note" style="margin-top:6px">Fuente: ${esc(p.origen || "")}</div></div></details></section>`; }

/* ---------- Más ---------- */
function vMas() {
  const r = F.resumen(S.cuentas, S.movs), cfg = S.cfg, standalone = matchMedia("(display-mode: standalone)").matches;
  let h = "";
  if (S.installEvt) h += `<button class="btn primary block" data-act="instalar">Instalar la app en este teléfono</button>`;
  h += `<section class="card"><div class="row"><h2 class="grow" style="margin:0">Cuentas</h2><button class="link" data-act="cuenta">Agregar</button></div>${[...r.det].sort((a, b) => (a.orden ?? 9) - (b.orden ?? 9)).map(c => `<button class="item" data-act="cuenta" data-id="${esc(c.id)}"><span class="dot" aria-hidden="true">${c.tipo === "credito" ? "TC" : c.tipo === "ahorro" ? "AH" : "$"}</span><span class="grow"><span class="t">${esc(c.nombre)}</span><span class="d">${TIPOS_CTA[c.tipo] || ""}${c.fechaSaldo ? " · conciliada " + esc(c.fechaSaldo) : ""}</span></span><span class="amt">${c.actual == null ? '<span class="pill cerca">sin saldo</span>' : c.tipo === "credito" ? F.clp(Math.max(0, -c.actual)) + " deuda" : F.clp(c.actual)}</span></button>`).join("")}<div class="note" style="margin-top:6px">Opcional. Toca una cuenta para ingresar o corregir su saldo según tu cartola.</div></section>`;
  const ds = S.deudas.map(d => ({ ...d, saldo: F.deudaSaldo(d, S.movs) }));
  h += `<section class="card"><div class="row"><h2 class="grow" style="margin:0">Deudas</h2><button class="link" data-act="deuda">Agregar</button></div>${ds.length ? ds.map(d => { const pc = d.porPagar ? Math.max(0, Math.min(100, (1 - d.saldo / d.porPagar) * 100)) : 0; return `<button class="item block" data-act="deuda" data-id="${esc(d.id)}"><div class="row"><span class="grow t">${esc(d.nombre)}</span><span class="amt">${F.clp(d.saldo)}</span></div><div class="bar"><i style="width:${pc}%"></i></div><span class="d">${d.cuota ? `Cuota ${F.clp(d.cuota)} · ~${Math.ceil(Math.max(0, d.saldo) / d.cuota)} cuotas restantes` : "Pagado " + Math.round(pc) + "%"}</span></button>`; }).join("") : `<div class="note" style="margin-top:6px">Registra deudas reales (crédito, préstamos familiares). Los pagos que marques con la deuda bajan su saldo.</div>`}</section>`;
  h += vMetas();
  h += `<section class="card"><div class="row"><h2 class="grow" style="margin:0">Planes</h2><button class="link" data-act="plan">Nuevo</button></div>${S.planes.map(p => `<button class="item" data-act="plan" data-id="${esc(p.id)}"><span class="grow"><span class="t">${esc(p.nombre)}${p.id === cfg.planActivo ? ' <span class="pill ok">activo</span>' : ""}</span><span class="d">${F.mesLbl(p.desde, true)} – ${F.mesLbl(p.hasta, true)} · ${Object.keys(p.presupuesto || {}).length} ítems</span></span></button>`).join("")}</section>`;
  const arch = S.items.filter(i => i.archivado);
  h += `<section class="card"><div class="row"><h2 class="grow" style="margin:0">Grupos</h2><button class="link" data-act="grupo">Agregar</button></div><div class="chips">${grupos().map(g => `<button class="chip" data-act="grupo" data-id="${esc(g.id)}">${esc(g.nombre)} · ${S.items.filter(i => i.grupo === g.id && !i.archivado).length}</button>`).join("")}</div>${arch.length ? `<div class="daylabel">Ítems ocultos</div><div class="chips" style="margin-top:6px">${arch.map(i => `<button class="chip" data-act="item" data-id="${esc(i.id)}">${esc(i.nombre)}</button>`).join("")}</div>` : ""}</section>`;
  h += `<section class="card"><h2>Alertas y supuestos</h2><div class="two"><label class="f">Aviso al (%)<input class="inp" id="cfgAviso" inputmode="numeric" value="${cfg.aviso}"></label><label class="f">Límite al (%)<input class="inp" id="cfgLimite" inputmode="numeric" value="${cfg.limite}"></label></div>
  <div class="two" style="margin-top:10px"><label class="f">Valor UF<input class="inp" id="cfgUf" inputmode="decimal" value="${String(cfg.uf || "").replace(".", ",")}"></label><label class="f">Colchón mínimo<input class="inp" id="cfgColchon" inputmode="numeric" value="${cfg.colchon ? F.clp(cfg.colchon) : ""}" placeholder="$0"></label></div>
  <label class="row small" style="margin-top:12px"><input type="checkbox" id="cfgNotif" ${cfg.notif ? "checked" : ""}> <span>Notificación del teléfono al cruzar un umbral</span></label>
  <div class="note" style="margin-top:6px">El colchón es el saldo mínimo bajo el cual la proyección te avisa. La UF se actualiza a mano${cfg.ufFecha ? " (última: " + esc(cfg.ufFecha) + ")" : ""}. Cada ítem puede tener sus propios umbrales.</div><button class="btn primary block" style="margin-top:10px" data-act="guardarCfg">Guardar</button></section>`;
  h += `<section class="card"><h2>Respaldo</h2><div class="gap8"><button class="btn block" data-act="backup">Guardar respaldo (JSON)</button>${navigator.canShare ? `<button class="btn block" data-act="backupShare">Enviar respaldo a Drive, correo…</button>` : ""}<button class="btn block" data-act="excel">Exportar a Excel</button><label class="btn block">Restaurar desde respaldo<input type="file" id="fileRestore" accept="application/json,.json" hidden></label></div><div class="note" style="margin-top:8px">Tus datos están solo en este teléfono. ${cfg.ultimoRespaldo ? "Último respaldo: " + esc(cfg.ultimoRespaldo.slice(0, 10)) + "." : "Aún no hay respaldos."} Respalda al menos una vez al mes.</div></section>`;
  h += `<p class="note" style="text-align:center">Caja Familiar ${APP_VERSION} · ${standalone ? "instalada" : "en el navegador"} · ${S.movs.length} movimientos · almacenamiento ${S.persistido ? "protegido" : "normal"}</p>`;
  return h;
}
function vMetas() {
  const r = F.resumen(S.cuentas, S.movs), filas = planActivo() ? F.proyeccion(stCalc(), planActivo(), mesHoy()).filas : [];
  return `<section class="card"><div class="row"><h2 class="grow" style="margin:0">Metas de ahorro</h2><button class="link" data-act="meta">Agregar</button></div>${S.metas.length ? S.metas.map(m => {
    const c = ctaById(m.cuenta), act = c ? (r.det.find(d => d.id === c.id)?.actual ?? 0) : (m.ahorrado || 0), falta = Math.max(0, m.objetivo - act);
    const meses = Math.max(1, F.rango(mesHoy(), m.fecha ? F.mk(m.fecha) : mesHoy()).length - 1), pc = m.objetivo ? Math.min(100, act / m.objetivo * 100) : 0, llega = filas.find(f => f.saldo >= m.objetivo);
    return `<button class="item block" data-act="meta" data-id="${esc(m.id)}"><div class="row"><span class="grow t">${esc(m.nombre)}</span><span class="amt">${F.clp(act)} / ${F.clp(m.objetivo)}</span></div><div class="bar"><i style="width:${pc}%"></i></div><span class="d">${falta ? (m.fecha ? `Necesitas ${F.clp(falta / meses)}/mes hasta ${F.mesLbl(F.mk(m.fecha), true)}` : "Sin fecha") + (llega ? ` · el plan acumula ese monto en ${F.mesLbl(llega.mes, true)}` : "") : "Meta cumplida"}</span></button>`;
  }).join("") : `<div class="note" style="margin-top:6px">Ej.: fondo de emergencia, vacaciones. Vincula una cuenta de ahorro para seguir el avance solo.</div>`}</section>`;
}

/* =====================  HOJAS (formularios)  ===================== */
function openSheet(html) { $("#sheetRoot").innerHTML = `<div class="scrim" data-act="cerrarFondo"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`; document.body.style.overflow = "hidden"; }
function closeSheet() { $("#sheetRoot").innerHTML = ""; document.body.style.overflow = ""; IT = null; MF = null; }
function redrawSheet(html) { const sc = $(".sheet")?.scrollTop || 0; openSheet(html); const sh = $(".sheet"); if (sh) { sh.scrollTop = sc; sh.style.animation = "none"; } }
const fmtMonto = el => { const n = F.num(el.value); el.value = isNaN(n) ? "" : "$" + Math.round(n).toLocaleString("es-CL"); };

/* ---------- Movimiento ---------- */
let MF = null;
function sheetMov(m, pre) {
  const ult = localStorage.getItem("cf.cuenta");
  MF = m ? { ...m } : { id: uid(), tipo: "gasto", monto: null, item: null, cuenta: ctaById(ult) ? ult : (S.cuentas.find(c => c.tipo === "liquida") || S.cuentas[0])?.id, fecha: F.mk(F.hoy()) === S.mes || S.tab === "inicio" ? F.hoy() : S.mes + "-01", nota: "", nuevo: true, ...(pre || {}) };
  drawMov();
}
function drawMov() {
  const m = MF, its = itemsActivos().filter(i => (m.tipo === "ingreso") === (i.tipo === "ingreso"));
  const uso = {}; for (const x of S.movs) uso[x.item] = (uso[x.item] || 0) + 1; its.sort((a, b) => (uso[b.id] || 0) - (uso[a.id] || 0));
  const ctas = [...S.cuentas].sort((a, b) => (a.orden ?? 9) - (b.orden ?? 9));
  const verTodos = m.verTodos || its.length <= 14, lista = verTodos ? its : its.slice(0, 12);
  if (m.item && !lista.find(i => i.id === m.item)) { const sel = its.find(i => i.id === m.item); if (sel) lista.unshift(sel); }
  let h = `<h3>${m.nuevo ? "Nuevo movimiento" : "Editar movimiento"}</h3>
  <div class="seg" role="group">${[["gasto", "Gasto"], ["ingreso", "Ingreso"], ["transferencia", "Transferencia"]].map(([k, l]) => `<button data-act="mtipo" data-v="${k}" aria-pressed="${m.tipo === k}">${l}</button>`).join("")}</div>
  <input class="inp amount" id="mMonto" inputmode="numeric" placeholder="$0" value="${m.monto ? F.clp(m.monto) : ""}" aria-label="Monto" autocomplete="off">`;
  if (m.tipo !== "transferencia") h += `<div><div class="note" style="margin-bottom:6px">Ítem del plan</div><div class="chips">${lista.map(i => `<button class="chip" data-act="mitem" data-v="${esc(i.id)}" aria-pressed="${m.item === i.id}">${esc(i.nombre)}</button>`).join("")}${verTodos ? "" : `<button class="chip" data-act="mver">Ver los ${its.length}</button>`}<button class="chip add" data-act="nuevoItemDesdeMov">+ Nuevo ítem</button></div></div>`;
  if (ctas.length) h += `<div class="two"><label class="f">${m.tipo === "transferencia" ? "Desde" : "Pagado con"}<select class="inp" id="mCuenta">${ctas.map(c => opt(c.id, c.nombre, m.cuenta)).join("")}</select></label>` + (m.tipo === "transferencia" ? `<label class="f">Hacia<select class="inp" id="mDestino">${ctas.map(c => opt(c.id, c.nombre, m.destino || ctas.find(x => x.id !== m.cuenta)?.id)).join("")}</select></label>` : `<label class="f">Fecha<input class="inp" type="date" id="mFecha" value="${esc(m.fecha)}"></label>`) + `</div>`;
  else h += `<label class="f">Fecha<input class="inp" type="date" id="mFecha" value="${esc(m.fecha)}"></label>`;
  if (m.tipo === "transferencia" && ctas.length) h += `<label class="f">Fecha<input class="inp" type="date" id="mFecha" value="${esc(m.fecha)}"></label><div class="note">Pagar la tarjeta es una transferencia de tu cuenta a la tarjeta: no cuenta como gasto, porque el gasto ya se registró al comprar.</div>`;
  if (m.tipo === "gasto" && S.deudas.length) h += `<label class="f">Abona a deuda (opcional)<select class="inp" id="mDeuda">${opt("", "Ninguna", m.deudaId || "")}${S.deudas.map(d => opt(d.id, d.nombre, m.deudaId)).join("")}</select></label>`;
  h += `<label class="f">Nota<input class="inp" id="mNota" value="${esc(m.nota || "")}" placeholder="Opcional" maxlength="120"></label><div id="mMsg">${m.dupMsg ? `<div class="alert cerca">${m.dupMsg}</div>` : ""}${m.err ? `<div class="alert excedido">${esc(m.err)}</div>` : ""}</div>
  <button class="btn primary block" data-act="guardarMov">${m.confirmDup ? "Guardar de todas formas" : "Guardar"}</button>`;
  if (!m.nuevo) h += `<button class="btn danger block" data-act="borrarMov">${m.confirmDel ? "Toca otra vez para borrar" : "Borrar movimiento"}</button>`;
  h += `<button class="btn block" data-act="cerrar">Cancelar</button>`;
  m.drawn ? redrawSheet(h) : openSheet(h);
  const inp = $("#mMonto"); inp.addEventListener("blur", () => fmtMonto(inp));
  if (m.nuevo && !m.drawn && !m.monto) setTimeout(() => inp.focus(), 60);
  m.drawn = true;
}
function leerMov() { const m = MF; m.monto = Math.round(F.num($("#mMonto").value)); m.cuenta = $("#mCuenta")?.value || null; m.fecha = $("#mFecha").value; m.nota = $("#mNota").value.trim(); m.destino = $("#mDestino")?.value; m.deudaId = $("#mDeuda")?.value || ""; }
async function guardarMov() {
  leerMov(); const m = MF; m.err = null;
  if (!(m.monto > 0)) m.err = "Ingresa un monto mayor que cero.";
  else if (m.tipo !== "transferencia" && !m.item) m.err = "Elige un ítem.";
  else if (m.tipo === "transferencia" && (!m.cuenta || m.cuenta === m.destino)) m.err = "Elige dos cuentas distintas.";
  else if (!/^\d{4}-\d\d-\d\d$/.test(m.fecha || "")) m.err = "Revisa la fecha.";
  if (m.err) { drawMov(); return; }
  const doc = { id: m.id, fecha: m.fecha, tipo: m.tipo, monto: m.monto, cuenta: m.cuenta, nota: m.nota, ts: m.ts || Date.now() };
  if (m.tipo === "transferencia") doc.destino = m.destino; else doc.item = m.item;
  if (m.tipo === "gasto" && m.deudaId) doc.deudaId = m.deudaId;
  const dup = F.duplicado(S.movs, doc);
  if (dup && !m.confirmDup) { m.confirmDup = true; m.dupMsg = `Ya tienes un movimiento igual ese día (${F.clp(dup.monto)}${dup.nota ? " · " + esc(dup.nota) : ""}). ¿Es otro distinto?`; drawMov(); return; }
  // umbral antes/después (solo gastos)
  let cruce = null, it = itemById(doc.item);
  if (doc.tipo === "gasto" && it && it.alertas !== false) {
    const mes = F.mk(doc.fecha), p = planActivo(), pv = F.efectivo(p, it, mes, S.movs, S.cfg.uf, mesHoy());
    const antes = S.movs.filter(x => x.id !== doc.id && x.item === it.id && x.tipo === "gasto" && F.mk(x.fecha) === mes).reduce((a, x) => a + x.monto, 0);
    const c = F.cruce(pv, antes, antes + doc.monto, F.umbrales(it, S.cfg)); if (c) cruce = { c, pct: Math.round((antes + doc.monto) / pv * 100), pv };
  }
  const nuevo = m.nuevo;
  if (await save("movs", doc)) {
    if (doc.cuenta) localStorage.setItem("cf.cuenta", doc.cuenta);
    closeSheet();
    if (cruce) { const msg = `${it.nombre}: llevas ${cruce.pct}% del presupuesto de ${F.mesLbl(F.mk(doc.fecha))} (${F.clp(cruce.pv)}).`; toast(msg, 4500); notificar(cruce.c === "limite" ? "Presupuesto superado" : "Cerca del límite", msg); }
    else toast(nuevo ? "Movimiento guardado" : "Cambios guardados");
  }
}
async function notificar(titulo, cuerpo) {
  if (!S.cfg.notif || !("Notification" in window) || Notification.permission !== "granted") return;
  try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) reg.showNotification(titulo, { body: cuerpo, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "umbral" }); } catch (e) {}
}

/* ---------- Ítem: presupuesto mes a mes ---------- */
let IT = null;
function sheetItem(id, mes) {
  const it = itemById(id); if (!it) return;
  const p = planActivo(), pres = p?.presupuesto?.[id];
  const m0 = mes || S.mes;
  IT = { id, mes: m0, inicio: F.addM(m0, -2), modo: "fijo", unidad: pres?.unidad || "CLP", f: { desde: m0, hasta: p?.hasta && p.hasta >= m0 ? p.hasta : F.addM(m0, 11), n: 12, cada: 12 }, ajustes: false, confirmOcultar: false };
  drawItem();
}
function leerItemForm() {
  const v = id => $("#" + id)?.value;
  if ($("#tMonto")) IT.f.monto = v("tMonto"); if ($("#tDesde")) IT.f.desde = v("tDesde"); if ($("#tHasta")) IT.f.hasta = v("tHasta");
  if ($("#tN")) IT.f.n = v("tN"); if ($("#tCada")) IT.f.cada = v("tCada"); if ($("#tUnidad")) IT.unidad = v("tUnidad");
  if ($("#tPuntual")) IT.puntual = v("tPuntual");
}
function drawItem() {
  const it = itemById(IT.id), p = planActivo(), cfg = S.cfg, act = mesHoy(), u = F.umbrales(it, cfg), pres = p?.presupuesto?.[it.id], esUF = (pres?.unidad || "CLP") === "UF";
  const meses = F.rango(IT.inicio, F.addM(IT.inicio, 11));
  const strip = meses.map(m => { const pv = F.ppto(p, it.id, m, cfg.uf), rv = F.realMes(S.movs, m).by[it.id] || 0, st = it.tipo === "ingreso" ? "ok" : F.estado(F.efectivo(p, it, m, S.movs, cfg.uf, act), rv, u);
    return `<button data-act="tMes" data-v="${m}" aria-pressed="${m === IT.mes}"><span class="note">${F.mesLbl(m)}${m === act ? " •" : ""}</span><b>${pv ? F.clpK(pv) : "—"}</b><span class="r ${m <= act && rv ? st : ""}">${m <= act ? (rv ? F.clpK(rv) : "$0") : "&nbsp;"}</span></button>`; }).join("");
  const pv = F.ppto(p, it.id, IT.mes, cfg.uf), ef = F.efectivo(p, it, IT.mes, S.movs, cfg.uf, act), rv = F.realMes(S.movs, IT.mes).by[it.id] || 0, raw = pres?.montos?.[IT.mes];
  const movsMes = S.movs.filter(x => x.item === it.id && F.mk(x.fecha) === IT.mes).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const g = grupos().find(x => x.id === it.grupo);
  let h = `<div class="row"><h3 class="grow">${esc(it.nombre)}</h3><button class="btn sm" data-act="registrarItem">+ Registrar</button></div><div class="note">${it.tipo === "ingreso" ? "Ingreso" : "Gasto"} · ${esc(g?.nombre || "Otros")} · plan ${esc(p?.nombre || "—")}${it.archivado ? " · oculto" : ""}</div>`;
  if (!p) return openSheet(h + `<div class="alert info">Primero crea un plan en Más → Planes.</div><button class="btn block" data-act="cerrar">Cerrar</button>`);
  h += `<div class="row"><span class="grow h2" style="margin:0">Presupuesto y ${it.tipo === "ingreso" ? "recibido" : "gastado"}</span><button class="link" data-act="tStrip" data-n="-6" aria-label="Meses anteriores">‹</button><button class="link" data-act="tStrip" data-n="6" aria-label="Meses siguientes">›</button></div><div class="strip">${strip}</div>`;
  h += `<section class="card" style="background:var(--bg)"><div class="row"><b class="grow">${F.mesLbl(IT.mes, true)}</b>${it.tipo !== "ingreso" && ef > 0 ? `<span class="pill ${F.estado(ef, rv, u) === "ok" ? "neutral" : F.estado(ef, rv, u)}">${Math.round(rv / ef * 100)}%</span>` : ""}</div>
    <div class="kv"><span>Presupuesto</span><span class="amt">${F.clp(pv)}${esUF && raw ? ` <span class="note">(${String(raw).replace(".", ",")} UF)</span>` : ""}</span></div>
    ${ef !== pv ? `<div class="kv"><span>${ef > pv ? "Sobrante de meses anteriores" : "Exceso de meses anteriores"}</span><span class="amt">${F.clp(ef - pv)}</span></div>` : ""}
    <div class="kv"><span>${it.tipo === "ingreso" ? "Recibido" : "Gastado"}</span><span class="amt">${F.clp(rv)}</span></div>
    ${it.tipo !== "ingreso" ? `<div class="kv"><span>${ef - rv >= 0 ? "Disponible" : "Excedido"}</span><span class="amt ${ef - rv < 0 ? "neg" : ""}">${F.clp(Math.abs(ef - rv))}</span></div>` : ""}
    <div class="row" style="margin-top:8px"><input class="inp grow" id="tPuntual" inputmode="decimal" placeholder="${esUF ? "UF" : "$"} solo este mes" value="${esc(IT.puntual ?? "")}" aria-label="Presupuesto solo para ${F.mesLbl(IT.mes, true)}"><button class="btn" data-act="tGuardarPuntual">Guardar</button></div></section>`;
  // herramientas
  const f = IT.f;
  h += `<h4>Definir presupuesto para varios meses</h4><div class="seg" role="group">${[["fijo", "Fijo"], ["cuotas", "Cuotas"], ["periodico", "Periódico"], ["limpiar", "Borrar"]].map(([k, l]) => `<button data-act="tModo" data-v="${k}" aria-pressed="${IT.modo === k}">${l}</button>`).join("")}</div>`;
  const ayuda = { fijo: "El mismo monto todos los meses del rango.", cuotas: "Un monto durante N meses seguidos, desde el mes indicado.", periodico: "Un monto cada N meses (ej.: patente o seguro anual: cada 12).", limpiar: "Deja en cero los meses del rango." }[IT.modo];
  h += `<div class="note">${ayuda}</div>`;
  if (IT.modo !== "limpiar") h += `<div class="two"><label class="f">Monto<input class="inp" id="tMonto" inputmode="decimal" value="${esc(f.monto ?? "")}" placeholder="${IT.unidad === "UF" ? "Ej: 14,75" : "Ej: $200.000"}"></label><label class="f">Unidad<select class="inp" id="tUnidad">${opt("CLP", "Pesos", IT.unidad)}${opt("UF", "UF", IT.unidad)}</select></label></div>`;
  h += `<div class="two"><label class="f">${IT.modo === "cuotas" ? "Primera cuota" : "Desde"}<input class="inp" type="month" id="tDesde" value="${esc(f.desde)}"></label>`;
  h += IT.modo === "cuotas" ? `<label class="f">N° de cuotas<input class="inp" id="tN" inputmode="numeric" value="${esc(f.n)}"></label></div>` : `<label class="f">Hasta<input class="inp" type="month" id="tHasta" value="${esc(f.hasta)}"></label></div>`;
  if (IT.modo === "periodico") h += `<label class="f">Cada cuántos meses<input class="inp" id="tCada" inputmode="numeric" value="${esc(f.cada)}"></label>`;
  if (IT.modo !== "cuotas") h += `<div class="chips"><button class="chip" data-act="tFin">Hasta el final del plan (${F.mesLbl(p.hasta)})</button></div>`;
  h += `<div id="tMsg">${IT.msg ? `<div class="alert ${IT.msgTipo || "info"}">${esc(IT.msg)}</div>` : ""}</div><button class="btn primary block" data-act="tAplicar">${IT.modo === "limpiar" ? "Borrar presupuesto del rango" : "Aplicar al plan"}</button>`;
  // movimientos del mes
  h += `<h4>Movimientos de ${F.mesLbl(IT.mes, true)}</h4>${movsMes.length ? `<div class="list">${movsMes.map(movItem).join("")}</div>` : `<div class="note">Sin movimientos este mes.</div>`}`;
  // ajustes del ítem
  h += `<details ${IT.ajustes ? "open" : ""} id="tAjustes"><summary class="btn block">Ajustes del ítem</summary><div class="gap8" style="margin-top:10px">
    <label class="f">Nombre<input class="inp" id="aNombre" value="${esc(it.nombre)}"></label>
    <div class="two"><label class="f">Tipo<select class="inp" id="aTipo">${opt("gasto", "Gasto", it.tipo)}${opt("ingreso", "Ingreso", it.tipo)}</select></label><label class="f">Grupo<select class="inp" id="aGrupo">${grupos().map(x => opt(x.id, x.nombre, it.grupo)).join("")}</select></label></div>
    <div class="two"><label class="f">Aviso propio (%)<input class="inp" id="aAviso" inputmode="numeric" value="${it.aviso || ""}" placeholder="${cfg.aviso} (general)"></label><label class="f">Límite propio (%)<input class="inp" id="aLimite" inputmode="numeric" value="${it.limite || ""}" placeholder="${cfg.limite} (general)"></label></div>
    <label class="f">Día de pago (opcional)<input class="inp" id="aDia" inputmode="numeric" value="${it.dia || ""}" placeholder="1–31"></label>
    <label class="row small"><input type="checkbox" id="aAlertas" ${it.alertas !== false ? "checked" : ""}> <span>Avisarme cuando me acerque al presupuesto</span></label>
    <label class="row small"><input type="checkbox" id="aArrastre" ${it.arrastre ? "checked" : ""}> <span>Pasar lo que sobre (o falte) al mes siguiente</span></label>
    ${it.id === "tarjeta" ? `<div class="note">Si registras tus compras con tarjeta en su ítem (Comida, Bencina…), usa este ítem solo para cuotas de compras anteriores, para no contar dos veces.</div>` : ""}
    <button class="btn primary block" data-act="aGuardar">Guardar ajustes</button>
    <button class="btn block" data-act="aOcultar">${it.archivado ? "Volver a mostrar ítem" : IT.confirmOcultar ? "Toca otra vez: se oculta (sus datos se conservan)" : "Ocultar ítem"}</button></div></details>
    <button class="btn block" data-act="cerrar">Cerrar</button>`;
  IT.drawn ? redrawSheet(h) : openSheet(h); IT.drawn = true;
  const sp = $(".strip [aria-pressed=true]"); if (sp) sp.scrollIntoView({ block: "nearest", inline: "center" });
}
async function guardarPresupuesto(fn) {
  const p = JSON.parse(JSON.stringify(planActivo())); p.presupuesto = p.presupuesto || {};
  const cur = p.presupuesto[IT.id] || { unidad: IT.unidad, montos: {} };
  // cambio de unidad: convierte lo existente con la UF vigente
  if ((cur.unidad || "CLP") !== IT.unidad) {
    if (!S.cfg.uf) { IT.msg = "Ingresa el valor de la UF en Más → Alertas y supuestos."; IT.msgTipo = "excedido"; drawItem(); return; }
    for (const k in cur.montos) cur.montos[k] = IT.unidad === "UF" ? Math.round(cur.montos[k] / S.cfg.uf * 100) / 100 : Math.round(cur.montos[k] * S.cfg.uf);
    cur.unidad = IT.unidad;
  }
  const r = fn(cur); if (!r) return;
  cur.montos = r.montos; p.presupuesto[IT.id] = cur;
  for (const m of r.meses) { if (m < p.desde) p.desde = m; if (m > p.hasta) p.hasta = m; }
  if (await save("planes", p)) { IT.msg = r.msg; IT.msgTipo = "info"; drawItem(); }
}
function montoUnidad(s) { const v = F.num(s); if (isNaN(v) || v < 0) return NaN; return IT.unidad === "UF" ? Math.round(v * 100) / 100 : Math.round(v); }

/* ---------- Nuevo ítem ---------- */
let NI = null;
function sheetNuevoItem(desdeMov) {
  NI = NI || { nombre: "", tipo: "gasto", grupo: "hogar", desdeMov };
  const existentes = new Set(S.items.map(i => i.nombre.toLowerCase()));
  const sug = SUGERIDOS.filter(([n]) => !existentes.has(n.toLowerCase()) && (NI.tipo === "ingreso") === (n === "Honorarios" || n === "Reembolsos"));
  openSheet(`<h3>Nuevo ítem</h3><div class="seg" role="group">${[["gasto", "Gasto"], ["ingreso", "Ingreso"]].map(([k, l]) => `<button data-act="niTipo" data-v="${k}" aria-pressed="${NI.tipo === k}">${l}</button>`).join("")}</div>
  <label class="f">Nombre<input class="inp" id="niNombre" value="${esc(NI.nombre)}" placeholder="Ej: Supermercado" maxlength="40"></label>
  ${sug.length ? `<div><div class="note" style="margin-bottom:6px">Sugerencias</div><div class="chips">${sug.map(([n, g]) => `<button class="chip" data-act="niSug" data-n="${esc(n)}" data-g="${g}">${esc(n)}</button>`).join("")}</div></div>` : ""}
  <label class="f">Grupo<select class="inp" id="niGrupo">${grupos().map(g => opt(g.id, g.nombre, NI.tipo === "ingreso" ? "ingreso" : NI.grupo)).join("")}</select></label>
  <div id="niMsg"></div><button class="btn primary block" data-act="niCrear">Crear y definir presupuesto</button><button class="btn block" data-act="cerrar">Cancelar</button>`);
  setTimeout(() => $("#niNombre")?.focus(), 60);
}
async function crearItem() {
  const nombre = $("#niNombre").value.trim(), grupo = $("#niGrupo").value;
  if (!nombre) { $("#niMsg").innerHTML = `<div class="alert excedido">Ponle un nombre.</div>`; return; }
  if (S.items.some(i => i.nombre.toLowerCase() === nombre.toLowerCase() && !i.archivado)) { $("#niMsg").innerHTML = `<div class="alert excedido">Ya tienes un ítem con ese nombre.</div>`; return; }
  let id = slug(nombre); if (itemById(id)) id += "-" + uid().slice(0, 4);
  const it = { id, nombre, tipo: NI.tipo, grupo, orden: S.items.length, alertas: NI.tipo === "gasto", arrastre: false, dia: null };
  const vuelveMov = NI.desdeMov && MF0; NI = null;
  if (await save("items", it)) {
    if (vuelveMov) { MF = { ...MF0, item: id, drawn: false, tipo: it.tipo === "ingreso" ? "ingreso" : MF0.tipo === "ingreso" ? "gasto" : MF0.tipo }; MF0 = null; drawMov(); toast("Ítem creado. Define su presupuesto después en Plan."); }
    else { closeSheet(); sheetItem(id, S.tab === "plan" ? S.mes : mesHoy()); }
  }
}
let MF0 = null;

/* ---------- Cuentas, deudas, metas, planes, grupos ---------- */
function sheetCuenta(id) {
  const c = id ? ctaById(id) : null, actual = c ? F.saldoCuenta(c, S.movs) : null, esTC = c?.tipo === "credito";
  openSheet(`<h3>${c ? esc(c.nombre) : "Nueva cuenta"}</h3><label class="f">Nombre<input class="inp" id="cNombre" value="${esc(c?.nombre || "")}"></label>
  <label class="f">Tipo<select class="inp" id="cTipo">${Object.entries(TIPOS_CTA).map(([k, l]) => opt(k, l, c?.tipo || "liquida")).join("")}</select></label>
  <label class="f"><span id="cSaldoLbl">${esTC ? "Deuda actual de la tarjeta (según el banco)" : "Saldo actual (según el banco)"}</span><input class="inp" id="cSaldo" inputmode="numeric" value="${actual == null ? "" : F.clp(esTC ? Math.max(0, -actual) : actual)}" placeholder="Ej: $1.250.000"></label>
  <label class="f">Cupo total (solo tarjetas)<input class="inp" id="cCupo" inputmode="numeric" value="${c?.cupo ? F.clp(c.cupo) : ""}"></label>
  <div class="note">Al cambiar el saldo, queda como punto de partida con fecha de hoy: solo los movimientos que registres desde ahora lo modifican.</div>
  <button class="btn primary block" data-act="guardarCuenta" data-id="${esc(id || "")}">Guardar</button>${c ? `<button class="btn danger block" data-act="borrarCuenta" data-id="${esc(id)}">Eliminar cuenta</button>` : ""}<button class="btn block" data-act="cerrar">Cancelar</button>`);
}
async function guardarCuenta(id) {
  const c = id ? { ...ctaById(id) } : { id: uid(), orden: S.cuentas.length };
  const nombre = $("#cNombre").value.trim(), tipo = $("#cTipo").value, s = F.num($("#cSaldo").value), cupo = F.num($("#cCupo").value);
  if (!nombre) { toast("Ponle un nombre."); return; }
  const prev = id ? F.saldoCuenta(ctaById(id), S.movs) : null;
  Object.assign(c, { nombre, tipo, cupo: isNaN(cupo) ? null : cupo });
  if (!isNaN(s)) { const nuevo = tipo === "credito" ? -Math.abs(s) : s; if (nuevo !== prev || !c.fechaSaldo) Object.assign(c, { saldo: nuevo, fechaSaldo: F.hoy(), anclaTs: Date.now() }); }
  if (await save("cuentas", c)) { closeSheet(); toast("Cuenta guardada"); }
}
function sheetDeuda(id) {
  const d = id ? S.deudas.find(x => x.id === id) : null, saldo = d ? F.deudaSaldo(d, S.movs) : null;
  openSheet(`<h3>${d ? esc(d.nombre) : "Nueva deuda"}</h3><label class="f">Nombre<input class="inp" id="dNombre" value="${esc(d?.nombre || "")}" placeholder="Ej: Crédito de consumo"></label>
  <label class="f">Monto que queda por pagar hoy<input class="inp" id="dPor" inputmode="numeric" value="${saldo != null ? F.clp(saldo) : ""}"></label>
  <div class="two"><label class="f">Cuota mensual<input class="inp" id="dCuota" inputmode="numeric" value="${d?.cuota ? F.clp(d.cuota) : ""}"></label><label class="f">Día de pago<input class="inp" id="dDia" inputmode="numeric" value="${d?.dia || ""}"></label></div>
  <div class="note">Para un crédito bancario usa cuota × cuotas que faltan. Cada gasto marcado “abona a esta deuda” reduce el saldo.</div>
  <button class="btn primary block" data-act="guardarDeuda" data-id="${esc(id || "")}">Guardar</button>${d ? `<button class="btn danger block" data-act="borrarDeuda" data-id="${esc(id)}">Eliminar deuda</button>` : ""}<button class="btn block" data-act="cerrar">Cancelar</button>`);
}
async function guardarDeuda(id) {
  const nombre = $("#dNombre").value.trim(), por = F.num($("#dPor").value), cuota = F.num($("#dCuota").value), dia = parseInt($("#dDia").value, 10);
  if (!nombre || isNaN(por)) { toast("Completa nombre y monto por pagar."); return; }
  const d = id ? S.deudas.find(x => x.id === id) : null, doc = { id: id || uid(), nombre, cuota: isNaN(cuota) ? null : Math.round(cuota), dia: dia >= 1 && dia <= 31 ? dia : null };
  if (!d || Math.round(por) !== Math.round(F.deudaSaldo(d, S.movs))) Object.assign(doc, { porPagar: Math.round(por), fecha: F.hoy(), ts: Date.now() }); else Object.assign(doc, { porPagar: d.porPagar, fecha: d.fecha, ts: d.ts });
  if (await save("deudas", doc)) { closeSheet(); toast("Deuda guardada"); }
}
function sheetMeta(id) {
  const m = id ? S.metas.find(x => x.id === id) : null;
  openSheet(`<h3>${m ? esc(m.nombre) : "Nueva meta"}</h3><label class="f">Nombre<input class="inp" id="gNombre" value="${esc(m?.nombre || "")}" placeholder="Ej: Fondo de emergencia"></label>
  <div class="two"><label class="f">Monto objetivo<input class="inp" id="gObj" inputmode="numeric" value="${m?.objetivo ? F.clp(m.objetivo) : ""}"></label><label class="f">Fecha meta<input class="inp" type="month" id="gFecha" value="${esc(m?.fecha ? F.mk(m.fecha) : "")}"></label></div>
  <label class="f">Seguir el avance con<select class="inp" id="gCuenta">${opt("", "Monto que ingreso a mano", m?.cuenta || "")}${S.cuentas.filter(c => c.tipo !== "credito").map(c => opt(c.id, "Saldo de " + c.nombre, m?.cuenta)).join("")}</select></label>
  <label class="f">Ahorrado hasta hoy (si es a mano)<input class="inp" id="gAh" inputmode="numeric" value="${m?.ahorrado ? F.clp(m.ahorrado) : ""}"></label>
  <button class="btn primary block" data-act="guardarMeta" data-id="${esc(id || "")}">Guardar</button>${m ? `<button class="btn danger block" data-act="borrarMeta" data-id="${esc(id)}">Eliminar meta</button>` : ""}<button class="btn block" data-act="cerrar">Cancelar</button>`);
}
async function guardarMeta(id) {
  const nombre = $("#gNombre").value.trim(), obj = F.num($("#gObj").value), f = $("#gFecha").value, ah = F.num($("#gAh").value);
  if (!nombre || !(obj > 0)) { toast("Completa nombre y monto objetivo."); return; }
  if (await save("metas", { id: id || uid(), nombre, objetivo: Math.round(obj), fecha: f ? f + "-01" : null, cuenta: $("#gCuenta").value || null, ahorrado: isNaN(ah) ? 0 : Math.round(ah) })) { closeSheet(); toast("Meta guardada"); }
}
let PL = null;
function sheetPlan(id) {
  const p = id ? S.planes.find(x => x.id === id) : null; PL = { id, confirmDel: false };
  const m = mesHoy();
  openSheet(`<h3>${p ? "Plan " + esc(p.nombre) : "Nuevo plan"}</h3><label class="f">Nombre<input class="inp" id="plNombre" value="${esc(p?.nombre || "")}" placeholder="Ej: 2027"></label>
  ${p ? `<div class="note">${F.mesLbl(p.desde, true)} – ${F.mesLbl(p.hasta, true)} · ${Object.keys(p.presupuesto || {}).length} ítems con presupuesto</div>` : `<div class="two"><label class="f">Desde<input class="inp" type="month" id="plDesde" value="${m}"></label><label class="f">Hasta<input class="inp" type="month" id="plHasta" value="${F.addM(m, 11)}"></label></div>
  <label class="f">Empezar con<select class="inp" id="plBase">${opt("", "Plan vacío")}${S.planes.map(x => opt(x.id, "Copia de " + x.nombre)).join("")}</select></label>`}
  <button class="btn primary block" data-act="plGuardar">${p ? "Guardar nombre" : "Crear plan"}</button>
  ${p ? `${p.id !== S.cfg.planActivo ? `<button class="btn block" data-act="activarPlan" data-id="${esc(p.id)}">Usar como plan activo</button>` : ""}<button class="btn block" data-act="plDuplicar">Duplicar (para probar cambios sin tocar este)</button>${S.planes.length > 1 ? `<button class="btn danger block" data-act="plBorrar" id="plBorrarBtn">Eliminar plan</button>` : ""}` : ""}
  <button class="btn block" data-act="cerrar">Cancelar</button>`);
}
async function guardarPlan() {
  const nombre = $("#plNombre").value.trim(); if (!nombre) { toast("Ponle un nombre."); return; }
  if (PL.id) { const p = { ...S.planes.find(x => x.id === PL.id), nombre }; if (await save("planes", p)) { closeSheet(); toast("Plan guardado"); } return; }
  const desde = $("#plDesde").value, hasta = $("#plHasta").value, base = $("#plBase").value; if (!desde || !hasta || hasta < desde) { toast("Revisa los meses."); return; }
  const src = base ? S.planes.find(x => x.id === base) : null;
  const p = { id: slug(nombre) + "-" + uid().slice(0, 4), nombre, desde, hasta, presupuesto: src ? JSON.parse(JSON.stringify(src.presupuesto)) : {}, notas: [], supuestos: src?.supuestos || [], origen: src ? "Copia de " + src.nombre : "Creado en la app" };
  if (await save("planes", p)) { await save("config", { ...S.cfg, planActivo: p.id }); closeSheet(); toast("Plan creado y activado"); }
}
function sheetGrupo(id) {
  const g = id ? grupos().find(x => x.id === id) : null, n = id ? S.items.filter(i => i.grupo === id).length : 0;
  openSheet(`<h3>${g ? "Grupo" : "Nuevo grupo"}</h3><label class="f">Nombre<input class="inp" id="grNombre" value="${esc(g?.nombre || "")}"></label>
  <button class="btn primary block" data-act="grGuardar" data-id="${esc(id || "")}">Guardar</button>${g && !n && id !== "ingreso" ? `<button class="btn danger block" data-act="grBorrar" data-id="${esc(id)}">Eliminar grupo</button>` : g ? `<div class="note">${n ? `Tiene ${n} ítem(s); muévelos a otro grupo para poder eliminarlo.` : ""}</div>` : ""}<button class="btn block" data-act="cerrar">Cancelar</button>`);
}

/* =====================  ARCHIVOS  ===================== */
function bajar(blob, nombre) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
function respaldoJSON() { return { app: "caja-familiar", version: 2, exportado: new Date().toISOString(), config: S.cfg, items: S.items, planes: S.planes, movs: S.movs, cuentas: S.cuentas, deudas: S.deudas, metas: S.metas }; }
async function backup(compartir) {
  const nombre = "caja-familiar-respaldo-" + F.hoy() + ".json", blob = new Blob([JSON.stringify(respaldoJSON())], { type: "application/json" });
  if (compartir) { const file = new File([blob], nombre, { type: "application/json" }); try { await navigator.share({ files: [file], title: "Respaldo Caja Familiar" }); } catch (e) { if (e.name !== "AbortError") toast("No se pudo compartir; usa Guardar respaldo."); return; } }
  else bajar(blob, nombre);
  await save("config", { ...S.cfg, ultimoRespaldo: new Date().toISOString() }); toast(compartir ? "Respaldo enviado" : "Respaldo guardado en Descargas");
}
function cargarXLSX() { return window.XLSX ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/xlsx.mini.min.js"; s.onload = res; s.onerror = () => rej(new Error("no se pudo cargar")); document.head.appendChild(s); }); }
async function exportarExcel() {
  try { await cargarXLSX(); } catch (e) { toast("No se pudo preparar el Excel."); return; }
  const p = planActivo(), items = itemsActivos(), meses = p ? F.rango(p.desde, p.hasta) : [], act = mesHoy();
  const gname = id => grupos().find(g => g.id === id)?.nombre || "";
  const plan = [["Ítem", "Grupo", "Tipo", ...meses.map(m => F.mesLbl(m, true))]].concat(items.map(i => [i.nombre, gname(i.grupo), i.tipo, ...meses.map(m => F.ppto(p, i.id, m, S.cfg.uf))]));
  const mr = [...new Set(S.movs.map(m => F.mk(m.fecha)))].sort();
  const real = [["Ítem", "Grupo", "Tipo", ...mr.map(m => F.mesLbl(m, true))]].concat(items.map(i => [i.nombre, gname(i.grupo), i.tipo, ...mr.map(m => F.realMes(S.movs, m).by[i.id] || 0)]));
  const movs = [["Fecha", "Tipo", "Ítem", "Cuenta", "Destino", "Monto", "Nota"]].concat([...S.movs].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(m => [m.fecha, m.tipo, itemById(m.item)?.nombre || "", ctaById(m.cuenta)?.nombre || "", ctaById(m.destino)?.nombre || "", m.monto, m.nota || ""]));
  const proy = p ? [["Mes", "Ingresos", "Gastos", "Neto", "Saldo proyectado"]].concat(F.proyeccion(stCalc(), p, act).filas.map(f => [F.mesLbl(f.mes, true), f.ing, f.gas, f.neto, f.saldo])) : [["Sin plan"]];
  const wb = XLSX.utils.book_new();
  for (const [n, a] of [["Plan " + (p?.nombre || ""), plan], ["Real", real], ["Movimientos", movs], ["Proyección", proy]]) { const ws = XLSX.utils.aoa_to_sheet(a); ws["!cols"] = [{ wch: 22 }]; XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31)); }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  bajar(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "caja-familiar-" + F.hoy() + ".xlsx"); toast("Excel guardado en Descargas");
}
let RESTORE = null;
async function restaurar(file) {
  try {
    let j = JSON.parse(await file.text()); if (j.app !== "caja-familiar") throw 0;
    if ((j.version || 1) < 2) j = F.desdeV1(j);
    RESTORE = j;
    openSheet(`<h3>Restaurar respaldo</h3><div class="alert cerca">Se cargarán ${j.movs.length} movimientos, ${j.items.length} ítems y ${j.planes.length} plan(es)${j.exportado ? " del " + esc(String(j.exportado).slice(0, 10)) : ""}. ${S.cfg ? "<b>Reemplaza todo lo que hay ahora en este teléfono.</b>" : ""}</div><button class="btn primary block" data-act="restaurarOk">Restaurar</button><button class="btn block" data-act="cerrar">Cancelar</button>`);
  } catch (e) { toast("Ese archivo no es un respaldo de Caja Familiar."); }
}
async function importar(data, msg) {
  try { await Store.replaceAll(data); await cargar(); closeSheet(); S.tab = "inicio"; render(); toast(msg); S.persistido = await Store.persist(); }
  catch (e) { toast("No se pudo cargar: " + (e.message || e)); }
}
async function empezarOrigen() {
  try { const r = await fetch("data/plan-origen.json"); const j = await r.json(); await importar({ ...j, movs: [], deudas: [], metas: [] }, "Plan Origen cargado"); }
  catch (e) { toast("No se pudo leer el plan Origen."); }
}
async function empezarBlanco() {
  const m = mesHoy(), items = [["sueldo", "Sueldo", "ingreso", "ingreso"], ["dividendo", "Dividendo o arriendo", "gasto", "vivienda"], ["cuentas-basicas", "Cuentas básicas", "gasto", "hogar"], ["supermercado", "Supermercado", "gasto", "hogar"], ["bencina", "Bencina", "gasto", "auto"], ["otros", "Otros", "gasto", "otros"]]
    .map(([id, nombre, tipo, grupo], i) => ({ id, nombre, tipo, grupo, orden: i, alertas: tipo === "gasto", arrastre: false, dia: null }));
  await importar({ config: { uf: 0, aviso: 80, limite: 100, colchon: 0, planActivo: "mi-plan", grupos: GRUPOS_DEF }, items, planes: [{ id: "mi-plan", nombre: "Mi plan", desde: m, hasta: F.addM(m, 11), presupuesto: {}, notas: [], supuestos: [], origen: "Creado en la app" }],
    cuentas: [{ id: "corriente", nombre: "Cuenta corriente", tipo: "liquida", saldo: null, fechaSaldo: null, orden: 0 }], movs: [], deudas: [], metas: [] }, "Plan creado. Toca cada ítem para definir su presupuesto.");
  S.tab = "plan"; render();
}

/* =====================  EVENTOS  ===================== */
document.addEventListener("click", async ev => {
  const tabBtn = ev.target.closest("[data-tab]");
  if (tabBtn && !ev.target.closest(".sheet")) { S.tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const t = ev.target.closest("[data-act]"); if (!t) return;
  const a = t.dataset.act, id = t.dataset.id;
  if (a === "cerrarFondo") { if (ev.target === t) closeSheet(); return; }
  switch (a) {
    case "mes": S.mes = F.addM(S.mes, +t.dataset.n); render(); break;
    case "vista": S.vista = t.dataset.v; render(); break;
    case "filtro": S.filtro = t.dataset.v; render(); break;
    case "compara": S.compara = !S.compara; render(); break;
    case "nuevo": sheetMov(null, S.tab === "plan" && S.mes !== mesHoy() ? { fecha: S.mes + "-01" } : null); break;
    case "editarMov": { const mv = S.movs.find(m => m.id === id); if (mv) { closeSheet(); sheetMov(mv); } break; }
    case "pagar": sheetMov(null, { item: id, monto: +t.dataset.monto, fecha: F.hoy() }); break;
    case "mtipo": leerMov(); if (MF.tipo !== t.dataset.v) Object.assign(MF, { tipo: t.dataset.v, item: null, confirmDup: false, dupMsg: null, err: null }); drawMov(); break;
    case "mitem": leerMov(); MF.item = t.dataset.v; MF.err = null; MF.confirmDup = false; MF.dupMsg = null; drawMov(); break;
    case "mver": leerMov(); MF.verTodos = true; drawMov(); break;
    case "nuevoItemDesdeMov": leerMov(); MF0 = { ...MF }; NI = { nombre: "", tipo: MF.tipo === "ingreso" ? "ingreso" : "gasto", grupo: "hogar", desdeMov: true }; sheetNuevoItem(true); break;
    case "guardarMov": await guardarMov(); break;
    case "borrarMov": if (!MF.confirmDel) { leerMov(); MF.confirmDel = true; drawMov(); break; } if (await remove("movs", MF.id)) { closeSheet(); toast("Movimiento borrado"); } break;
    case "cerrar": closeSheet(); NI = null; MF0 = null; break;
    case "irCuentas": S.tab = "mas"; render(); window.scrollTo(0, 0); break;
    // ítem
    case "item": closeSheet(); sheetItem(id, t.dataset.mes); break;
    case "nuevoItem": NI = null; sheetNuevoItem(false); break;
    case "niTipo": NI.nombre = $("#niNombre").value; NI.tipo = t.dataset.v; sheetNuevoItem(NI.desdeMov); break;
    case "niSug": $("#niNombre").value = t.dataset.n; $("#niGrupo").value = t.dataset.g; break;
    case "niCrear": await crearItem(); break;
    case "registrarItem": { const it = itemById(IT.id), mes = IT.mes; closeSheet(); sheetMov(null, { item: it.id, tipo: it.tipo === "ingreso" ? "ingreso" : "gasto", fecha: mes === mesHoy() ? F.hoy() : mes + "-01" }); break; }
    case "tMes": leerItemForm(); IT.mes = t.dataset.v; IT.puntual = ""; IT.msg = null; drawItem(); break;
    case "tStrip": leerItemForm(); IT.inicio = F.addM(IT.inicio, +t.dataset.n); drawItem(); break;
    case "tModo": leerItemForm(); IT.modo = t.dataset.v; IT.msg = null; drawItem(); break;
    case "tFin": $("#tHasta").value = planActivo().hasta; break;
    case "tGuardarPuntual": { leerItemForm(); const v = IT.puntual === "" ? 0 : montoUnidad(IT.puntual); if (isNaN(v)) { IT.msg = "Revisa el monto."; IT.msgTipo = "excedido"; drawItem(); break; } const mes = IT.mes; IT.puntual = "";
      await guardarPresupuesto(cur => ({ ...F.aplicar(cur.montos, "puntual", { mes, monto: v }), msg: `Presupuesto de ${F.mesLbl(mes, true)} actualizado.` })); break; }
    case "tAplicar": { leerItemForm(); const f = IT.f, modo = IT.modo; const monto = modo === "limpiar" ? 0 : montoUnidad(f.monto);
      const err = modo !== "limpiar" && (isNaN(monto) || !(monto > 0)) ? "Ingresa un monto mayor que cero." : !f.desde ? "Elige el mes de inicio." : modo !== "cuotas" && (!f.hasta || f.hasta < f.desde) ? "El mes final debe ser igual o posterior al inicial." : modo === "cuotas" && !(+f.n >= 1 && +f.n <= 360) ? "Indica entre 1 y 360 cuotas." : modo === "periodico" && !(+f.cada >= 1 && +f.cada <= 60) ? "Indica cada cuántos meses (1 a 60)." : null;
      if (err) { IT.msg = err; IT.msgTipo = "excedido"; drawItem(); break; }
      await guardarPresupuesto(cur => { const r = F.aplicar(cur.montos, modo, { monto, desde: f.desde, hasta: f.hasta, n: +f.n, cada: +f.cada });
        return { ...r, msg: modo === "limpiar" ? `Se borró el presupuesto de ${r.meses.length} mes(es).` : `Listo: ${r.meses.length} mes(es), de ${F.mesLbl(r.meses[0])} a ${F.mesLbl(r.meses.at(-1))}.` }; }); break; }
    case "aGuardar": { const it = { ...itemById(IT.id) }; const nombre = $("#aNombre").value.trim(); if (!nombre) { toast("El ítem necesita un nombre."); break; }
      const av = parseInt($("#aAviso").value, 10), li = parseInt($("#aLimite").value, 10), dia = parseInt($("#aDia").value, 10);
      const avOk = av > 0 ? av : null, liOk = li > 0 ? li : null; if ((avOk || S.cfg.aviso) >= (liOk || S.cfg.limite)) { toast("El aviso debe ser menor que el límite."); break; }
      Object.assign(it, { nombre, tipo: $("#aTipo").value, grupo: $("#aGrupo").value, aviso: avOk, limite: liOk, dia: dia >= 1 && dia <= 31 ? dia : null, alertas: $("#aAlertas").checked, arrastre: $("#aArrastre").checked });
      leerItemForm(); IT.ajustes = true; if (await save("items", it)) { IT.msg = null; drawItem(); toast("Ajustes guardados"); } break; }
    case "aOcultar": { const it = { ...itemById(IT.id) }; if (!it.archivado && !IT.confirmOcultar) { leerItemForm(); IT.confirmOcultar = true; IT.ajustes = true; drawItem(); break; }
      it.archivado = !it.archivado; if (await save("items", it)) { closeSheet(); toast(it.archivado ? "Ítem oculto. Puedes recuperarlo en Más → Grupos." : "Ítem visible otra vez"); } break; }
    // config
    case "guardarCfg": { const av = parseInt($("#cfgAviso").value, 10), li = parseInt($("#cfgLimite").value, 10), uf = F.num($("#cfgUf").value), co = F.num($("#cfgColchon").value), notif = $("#cfgNotif").checked;
      if (!(av > 0 && li > 0 && av < li)) { toast("El aviso debe ser menor que el límite."); break; }
      if (notif && "Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch (e) {} }
      const c = { ...S.cfg, aviso: av, limite: li, colchon: isNaN(co) ? 0 : Math.round(co), notif: notif && "Notification" in window && Notification.permission === "granted" };
      if (!isNaN(uf) && uf !== S.cfg.uf) Object.assign(c, { uf, ufFecha: F.hoy() });
      if (await save("config", c)) toast(notif && !c.notif ? "Ajustes guardados (el teléfono no dio permiso para notificaciones)" : "Ajustes guardados"); break; }
    case "activarPlan": if (await save("config", { ...S.cfg, planActivo: id })) { closeSheet(); toast("Plan activo cambiado"); } break;
    case "plan": sheetPlan(id); break;
    case "plGuardar": await guardarPlan(); break;
    case "plDuplicar": { const src = S.planes.find(x => x.id === PL.id); const p = { ...JSON.parse(JSON.stringify(src)), id: slug(src.nombre) + "-" + uid().slice(0, 4), nombre: src.nombre + " (copia)", origen: "Copia de " + src.nombre, notas: [] };
      if (await save("planes", p)) { await save("config", { ...S.cfg, planActivo: p.id }); closeSheet(); toast("Copia creada y activada"); } break; }
    case "plBorrar": if (!PL.confirmDel) { PL.confirmDel = true; t.textContent = "Toca otra vez para eliminar el plan"; break; }
      if (await remove("planes", PL.id)) { if (S.cfg.planActivo === PL.id) await save("config", { ...S.cfg, planActivo: S.planes[0]?.id || null }); closeSheet(); toast("Plan eliminado"); } break;
    case "grupo": sheetGrupo(id); break;
    case "grGuardar": { const nombre = $("#grNombre").value.trim(); if (!nombre) break; const gs = grupos().map(g => ({ ...g })); if (id) gs.find(g => g.id === id).nombre = nombre; else gs.push({ id: slug(nombre) + "-" + uid().slice(0, 3), nombre });
      if (await save("config", { ...S.cfg, grupos: gs })) { closeSheet(); toast("Grupo guardado"); } break; }
    case "grBorrar": if (await save("config", { ...S.cfg, grupos: grupos().filter(g => g.id !== id) })) { closeSheet(); toast("Grupo eliminado"); } break;
    case "cuenta": sheetCuenta(id); break;
    case "guardarCuenta": await guardarCuenta(id); break;
    case "borrarCuenta": if (S.movs.some(m => m.cuenta === id || m.destino === id)) { toast("Tiene movimientos: no se puede eliminar."); break; } if (await remove("cuentas", id)) { closeSheet(); toast("Cuenta eliminada"); } break;
    case "deuda": sheetDeuda(id); break;
    case "guardarDeuda": await guardarDeuda(id); break;
    case "borrarDeuda": if (await remove("deudas", id)) { closeSheet(); toast("Deuda eliminada"); } break;
    case "meta": sheetMeta(id); break;
    case "guardarMeta": await guardarMeta(id); break;
    case "borrarMeta": if (await remove("metas", id)) { closeSheet(); toast("Meta eliminada"); } break;
    // archivos
    case "backup": await backup(false); break;
    case "backupShare": await backup(true); break;
    case "excel": await exportarExcel(); break;
    case "restaurarOk": await importar(RESTORE, "Respaldo restaurado"); break;
    case "empOrigen": await empezarOrigen(); break;
    case "empBlanco": await empezarBlanco(); break;
    case "instalar": if (S.installEvt) { S.installEvt.prompt(); const r = await S.installEvt.userChoice; S.installEvt = null; render(); if (r.outcome === "accepted") toast("App instalada"); } break;
    case "actualizarApp": S.swWaiting?.postMessage("skipWaiting"); break;
  }
});
document.addEventListener("change", ev => {
  if (ev.target.id === "fileRestore" && ev.target.files[0]) { restaurar(ev.target.files[0]); ev.target.value = ""; }
  if (ev.target.id === "cTipo") $("#cSaldoLbl").textContent = ev.target.value === "credito" ? "Deuda actual de la tarjeta (según el banco)" : "Saldo actual (según el banco)";
  if (ev.target.id === "tUnidad") { leerItemForm(); drawItem(); }
});
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && $("#sheetRoot").innerHTML) closeSheet(); });
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); S.installEvt = e; render(); });
window.addEventListener("appinstalled", () => { S.installEvt = null; render(); });

/* ---------- arranque ---------- */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").then(reg => {
    const marcar = w => { if (w && navigator.serviceWorker.controller) { S.swWaiting = w; render(); } };
    marcar(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; w?.addEventListener("statechange", () => { if (w.state === "installed") marcar(w); }); });
  }).catch(() => {});
  // recarga solo cuando una versión nueva reemplaza a otra (no en la primera instalación)
  let recargado = false; const habiaControl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (habiaControl && !recargado) { recargado = true; location.reload(); } });
}
cargar().then(async () => { if (S.cfg) S.persistido = await Store.persist(); render(); }).catch(e => { $("#view").innerHTML = `<div class="card empty"><b>No se pudieron abrir tus datos</b>${esc(e.message || e)}</div>`; });
