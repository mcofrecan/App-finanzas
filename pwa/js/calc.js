/* Caja Familiar — cálculos puros (sin DOM ni almacenamiento). Se prueban en tests/. */
(function (g) {
  "use strict";
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const pad = n => String(n).padStart(2, "0");
  const F = {
    MES, pad,
    hoy(d = new Date()) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); },
    mk: f => String(f).slice(0, 7),
    addM(m, n) { let [y, mo] = m.split("-").map(Number); mo += n; y += Math.floor((mo - 1) / 12); mo = ((mo - 1) % 12 + 12) % 12 + 1; return y + "-" + pad(mo); },
    rango(a, b) { const r = []; if (!a || !b) return r; for (let m = a; m <= b && r.length < 600; m = F.addM(m, 1)) r.push(m); return r; },
    mesLbl(m, largo) { const [y, mo] = m.split("-"); return MES[+mo - 1] + (largo ? " " + y : " " + y.slice(2)); },
    clp(n) { if (n == null || isNaN(n)) return "—"; n = Math.round(n); return (n < 0 ? "−" : "") + "$" + Math.abs(n).toLocaleString("es-CL"); },
    clpK(n) { const a = Math.abs(n), s = n < 0 ? "−" : ""; if (a >= 1e6) return s + "$" + (a / 1e6).toLocaleString("es-CL", { maximumFractionDigits: 1 }) + "M"; if (a >= 1e3) return s + "$" + Math.round(a / 1e3) + "k"; return s + "$" + Math.round(a); },
    /** Lee montos escritos al estilo chileno: "$1.234.567", "41.205,5", "1,5" */
    num(s) {
      if (typeof s === "number") return s; s = String(s || "").replace(/[^\d,.-]/g, ""); if (!s) return NaN;
      if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, "");
      return Number(s);
    },

    /* ---------- Plan / presupuesto ---------- */
    /** Presupuesto en CLP de un ítem en un mes. */
    ppto(plan, itemId, mes, uf) {
      const p = plan && plan.presupuesto && plan.presupuesto[itemId]; if (!p) return 0;
      const v = (p.montos || {})[mes] || 0; return p.unidad === "UF" ? Math.round(v * (uf || 0)) : v;
    },
    pptoMes(plan, items, mes, uf) {
      const by = {}; let ing = 0, gas = 0;
      for (const it of items) { const v = F.ppto(plan, it.id, mes, uf); if (!v) continue; by[it.id] = v; if (it.tipo === "ingreso") ing += v; else gas += v; }
      return { ing, gas, neto: ing - gas, by };
    },
    realMes(movs, mes) {
      const by = {}; let ing = 0, gas = 0;
      for (const m of movs) { if (F.mk(m.fecha) !== mes || m.tipo === "transferencia") continue; by[m.item] = (by[m.item] || 0) + m.monto; if (m.tipo === "ingreso") ing += m.monto; else gas += m.monto; }
      return { ing, gas, neto: ing - gas, by };
    },
    /** Sobrante (o exceso) que llega a `mes` desde meses ya cerrados, si el ítem arrastra. */
    arrastre(plan, item, mes, movs, uf, mesActual) {
      if (!item || !item.arrastre || item.tipo === "ingreso" || !plan || !plan.desde) return 0;
      let c = 0;
      for (const k of F.rango(plan.desde, F.addM(mes, -1))) {
        if (k >= mesActual) break;
        c += F.ppto(plan, item.id, k, uf) - (F.realMes(movs, k).by[item.id] || 0);
      }
      return c;
    },
    /** Presupuesto disponible del ítem en el mes = plan + arrastre. */
    efectivo(plan, item, mes, movs, uf, mesActual) { return F.ppto(plan, item.id, mes, uf) + F.arrastre(plan, item, mes, movs, uf, mesActual); },
    umbrales(item, cfg) { return { aviso: (item && item.aviso) || cfg.aviso, limite: (item && item.limite) || cfg.limite }; },
    estado(ppto, real, u) { if (ppto <= 0) return real > 0 ? "sinppto" : "ok"; const p = real / ppto * 100; if (p >= u.limite) return "excedido"; if (p >= u.aviso) return "cerca"; return "ok"; },
    /** ¿Este gasto hace cruzar un umbral? Devuelve "aviso" | "limite" | null */
    cruce(ppto, antes, despues, u) {
      if (ppto <= 0) return null; const a = antes / ppto * 100, d = despues / ppto * 100;
      if (a < u.limite && d >= u.limite) return "limite"; if (a < u.aviso && d >= u.aviso) return "aviso"; return null;
    },
    /** Aplica una herramienta de presupuesto. Devuelve {montos, meses} sin mutar la entrada. */
    aplicar(montos, modo, p) {
      const out = { ...(montos || {}) }; let meses = [];
      if (modo === "fijo") meses = F.rango(p.desde, p.hasta);
      else if (modo === "cuotas") meses = F.rango(p.desde, F.addM(p.desde, Math.max(1, p.n | 0) - 1));
      else if (modo === "periodico") { for (let m = p.desde; m <= p.hasta; m = F.addM(m, Math.max(1, p.cada | 0))) meses.push(m); }
      else if (modo === "limpiar") meses = F.rango(p.desde, p.hasta);
      else if (modo === "puntual") meses = [p.mes];
      for (const m of meses) { if (modo === "limpiar" || !p.monto) delete out[m]; else out[m] = p.monto; }
      return { montos: out, meses };
    },

    /* ---------- Cuentas y disponible ---------- */
    despues(m, fecha, ts) { return m.fecha > fecha || (m.fecha === fecha && (m.ts || 0) > (ts || 0)); },
    saldoCuenta(c, movs) {
      if (c.saldo == null || !c.fechaSaldo) return null; let s = c.saldo;
      for (const m of movs) {
        if (!F.despues(m, c.fechaSaldo, c.anclaTs)) continue;
        if (m.tipo === "gasto" && m.cuenta === c.id) s -= m.monto;
        else if (m.tipo === "ingreso" && m.cuenta === c.id) s += m.monto;
        else if (m.tipo === "transferencia") { if (m.cuenta === c.id) s -= m.monto; if (m.destino === c.id) s += m.monto; }
      }
      return s;
    },
    resumen(ctas, movs) {
      let liquido = 0, ahorro = 0, deudaTC = 0, cupo = 0, con = 0, sin = 0; const det = [];
      for (const c of ctas) {
        const s = F.saldoCuenta(c, movs); det.push({ ...c, actual: s }); if (s == null) { sin++; continue; } con++;
        if (c.tipo === "liquida") liquido += s; else if (c.tipo === "ahorro") ahorro += s;
        else if (c.tipo === "credito") { deudaTC += Math.max(0, -s); cupo += Math.max(0, (c.cupo || 0) - Math.max(0, -s)); }
      }
      return { liquido, ahorro, deudaTC, cupoDisp: cupo, disponible: liquido - deudaTC, tieneSaldos: con > 0, faltan: sin, det };
    },
    /** Lo que falta del mes según plan: por ítem, presupuesto disponible − real (nunca negativo). */
    pendiente(plan, items, movs, mes, uf, mesActual) {
      const r = F.realMes(movs, mes); let pi = 0, pg = 0, pp = 0; const det = [];
      for (const it of items) {
        const pv = F.efectivo(plan, it, mes, movs, uf, mesActual), rv = r.by[it.id] || 0, d = Math.max(0, pv - rv);
        if (it.tipo !== "ingreso") pp += Math.max(0, pv);
        if (!d) continue; if (it.tipo === "ingreso") pi += d; else { pg += d; det.push({ item: it, plan: pv, real: rv, falta: d }); }
      }
      return { pendIng: pi, pendGas: pg, pptoGas: pp, det, real: r };
    },
    /** Proyección: parte del disponible real (o de 0 si no hay saldos, igual que la planilla). */
    proyeccion(st, plan, mesActual, hasta) {
      const res = F.resumen(st.ctas, st.movs), pe = F.pendiente(plan, st.items, st.movs, mesActual, st.cfg.uf, mesActual);
      let saldo = (res.tieneSaldos ? res.disponible : pe.real.neto) + pe.pendIng - pe.pendGas;
      const filas = [{ mes: mesActual, actual: true, ing: pe.real.ing + pe.pendIng, gas: pe.real.gas + pe.pendGas, neto: pe.real.neto + pe.pendIng - pe.pendGas, saldo }];
      const fin = hasta || (plan && plan.hasta) || F.addM(mesActual, 12);
      for (let m = F.addM(mesActual, 1); m <= fin; m = F.addM(m, 1)) { const p = F.pptoMes(plan, st.items, m, st.cfg.uf); saldo += p.neto; filas.push({ mes: m, ing: p.ing, gas: p.gas, neto: p.neto, saldo }); }
      return { filas, base: res.tieneSaldos ? "saldos" : "cero" };
    },
    deudaSaldo(d, movs) { let s = d.porPagar || 0; for (const m of movs) if (m.deudaId === d.id && m.tipo === "gasto" && F.despues(m, d.fecha, d.ts)) s -= m.monto; return s; },
    duplicado(movs, m) { return movs.find(x => x.id !== m.id && x.fecha === m.fecha && x.monto === m.monto && x.tipo === m.tipo && (x.item || "") === (m.item || "") && x.cuenta === m.cuenta); },

    /* ---------- Respaldo de la versión anterior (artefacto) ---------- */
    desdeV1(j) {
      const planes = (j.escenarios || []).map(e => ({ id: e.id, nombre: e.nombre, desde: e.desde, hasta: e.hasta, notas: e.notas || [], supuestos: e.supuestos || [], origen: e.origen || "",
        presupuesto: Object.fromEntries((e.items || []).map(i => [i.cat, { unidad: i.unidad || "CLP", montos: i.montos || {} }])) }));
      const items = (j.categorias || []).map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, grupo: c.grupo || "otros", orden: c.orden ?? 99, alertas: c.alertas !== false, arrastre: false, dia: c.dia || null, archivado: !!c.archivada }));
      const movs = (j.movs || []).map(({ cat, ...m }) => (cat ? { ...m, item: cat } : m));
      const { escenario, ...cfg } = j.config || {};
      return { app: "caja-familiar", version: 2, config: { ...cfg, planActivo: escenario || (planes[0] && planes[0].id) }, items, planes, movs, cuentas: j.cuentas || [], deudas: j.deudas || [], metas: j.metas || [] };
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = F; else g.F = F;
})(this);
