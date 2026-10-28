// Pruebas de cálculo (Node). Uso: node tests/pwa_unit.js
const F = require("../pwa/js/calc.js");
const fs = require("fs"), path = require("path");
const R = p => JSON.parse(fs.readFileSync(path.join(__dirname, "..", p), "utf8"));
const seed = R("pwa/data/plan-origen.json"), excel = R("tests/excel_acumulado.json"), v1seed = R("seed.json");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };

// 1) Plan Origen importado reproduce el Ahorro acumulado del Excel
const st = { cfg: seed.config, items: seed.items, movs: [], ctas: [] };
const filas = F.proyeccion(st, seed.planes[0], "2026-10", "2029-06").filas;
const diff = Object.entries(excel.origen).filter(([m, v]) => Math.round(filas.find(f => f.mes === m).saldo) !== v);
ok(diff.length === 0, `Origen v2 = Excel en ${Object.keys(excel.origen).length} meses ${JSON.stringify(diff.slice(0, 2))}`);

// 2) Herramientas de presupuesto
let r = F.aplicar({}, "fijo", { monto: 100, desde: "2026-11", hasta: "2027-02" });
ok(JSON.stringify(Object.keys(r.montos)) === '["2026-11","2026-12","2027-01","2027-02"]', "fijo: rango que cruza el año");
r = F.aplicar({ "2026-11": 5 }, "cuotas", { monto: 332000, n: 24, desde: "2026-11" });
ok(r.meses.length === 24 && r.meses.at(-1) === "2028-10" && r.montos["2026-11"] === 332000, "cuotas: 24 desde nov-26 terminan oct-28");
r = F.aplicar({}, "periodico", { monto: 100000, cada: 12, desde: "2027-03", hasta: "2029-12" });
ok(JSON.stringify(r.meses) === '["2027-03","2028-03","2029-03"]', "periódico anual");
r = F.aplicar({ a: 1, "2027-01": 9, "2027-02": 9 }, "limpiar", { desde: "2027-01", hasta: "2027-01" });
ok(!("2027-01" in r.montos) && r.montos["2027-02"] === 9, "borrar rango no toca otros meses");
const orig = { "2027-01": 1 }; F.aplicar(orig, "puntual", { mes: "2027-01", monto: 0 }); ok(orig["2027-01"] === 1, "aplicar no muta la entrada");
ok(!("2027-01" in F.aplicar(orig, "puntual", { mes: "2027-01", monto: 0 }).montos), "puntual en 0 elimina el mes");

// 3) UF
const pUF = { presupuesto: { div: { unidad: "UF", montos: { "2027-03": 14.75 } } } };
ok(F.ppto(pUF, "div", "2027-03", 41205) === Math.round(14.75 * 41205), "presupuesto en UF convertido a pesos");

// 4) Arrastre (sobrante al mes siguiente) solo desde meses cerrados
const it = { id: "com", tipo: "gasto", arrastre: true };
const plan = { desde: "2026-11", hasta: "2027-03", presupuesto: { com: { unidad: "CLP", montos: { "2026-11": 200000, "2026-12": 200000, "2027-01": 200000 } } } };
const movs = [{ fecha: "2026-11-05", tipo: "gasto", item: "com", monto: 150000 }, { fecha: "2026-12-05", tipo: "gasto", item: "com", monto: 230000 }];
ok(F.efectivo(plan, it, "2026-12", movs, 0, "2026-12") === 250000, "dic recibe 50.000 que sobraron en nov");
ok(F.efectivo(plan, it, "2027-01", movs, 0, "2027-01") === 220000, "ene: +50.000 −30.000 = 220.000");
ok(F.efectivo(plan, it, "2027-01", movs, 0, "2026-12") === 250000, "mes en curso (dic) no arrastra todavía");
ok(F.efectivo(plan, { ...it, arrastre: false }, "2027-01", movs, 0, "2027-01") === 200000, "sin arrastre: solo presupuesto");

// 5) Umbrales y cruce
const u = F.umbrales({ aviso: 70 }, { aviso: 80, limite: 100 });
ok(u.aviso === 70 && u.limite === 100, "umbral propio del ítem sobre el general");
ok(F.cruce(200000, 150000, 170000, { aviso: 80, limite: 100 }) === "aviso", "cruce 80%");
ok(F.cruce(200000, 170000, 210000, { aviso: 80, limite: 100 }) === "limite", "cruce 100%");
ok(F.cruce(200000, 170000, 180000, { aviso: 80, limite: 100 }) === null, "sin cruce si ya estaba sobre el aviso");

// 6) Disponible, tarjeta y transferencias (sin doble conteo)
const ctas = [{ id: "a", tipo: "liquida", saldo: 1000000, fechaSaldo: "2026-10-20", anclaTs: 100 }, { id: "tc", tipo: "credito", saldo: -200000, fechaSaldo: "2026-10-20", anclaTs: 100, cupo: 1000000 }];
const mv = [{ id: "1", fecha: "2026-10-19", tipo: "gasto", monto: 50000, cuenta: "a", item: "x", ts: 1 }, { id: "3", fecha: "2026-10-20", tipo: "gasto", monto: 10000, cuenta: "a", item: "x", ts: 200 },
  { id: "4", fecha: "2026-10-21", tipo: "gasto", monto: 80000, cuenta: "tc", item: "x", ts: 300 }, { id: "5", fecha: "2026-10-22", tipo: "transferencia", monto: 200000, cuenta: "a", destino: "tc", ts: 400 }];
const res = F.resumen(ctas, mv);
ok(res.liquido === 790000 && res.deudaTC === 80000 && res.disponible === 710000 && res.cupoDisp === 920000, "disponible = líquido − deuda tarjeta; cupo aparte");
ok(F.realMes(mv, "2026-10").gas === 140000, "transferencia no es gasto");

// 7) Conversión del respaldo de la versión anterior (artefacto)
const v1 = { app: "caja-familiar", version: 1, config: { ...v1seed.config }, categorias: v1seed.categorias, cuentas: v1seed.cuentas, escenarios: v1seed.escenarios, deudas: [], metas: [],
  movs: [{ id: "m1", fecha: "2026-11-03", tipo: "gasto", monto: 1000, cuenta: "corriente", cat: "comida", ts: 1 }] };
const v2 = F.desdeV1(v1);
ok(v2.version === 2 && v2.planes.length === 2 && v2.config.planActivo === "origen" && v2.movs[0].item === "comida" && !("cat" in v2.movs[0]), "respaldo v1 → v2");
const f2 = F.proyeccion({ cfg: v2.config, items: v2.items, movs: [], ctas: [] }, v2.planes.find(p => p.id === "la-rioja"), "2026-10").filas;
ok(Object.entries(excel["la-rioja"]).every(([m, v]) => Math.round(f2.find(f => f.mes === m).saldo) === v), "La Rioja convertido sigue cuadrando con Excel");

// 8) Meses / parseo
ok(F.addM("2026-12", 1) === "2027-01" && F.addM("2026-01", -1) === "2025-12", "aritmética de meses");
ok(JSON.stringify([F.num("$1.234.567"), F.num("14,75"), F.num("41.205,5")]) === "[1234567,14.75,41205.5]", "parseo es-CL");
console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK"); process.exit(fails ? 1 : 0);
