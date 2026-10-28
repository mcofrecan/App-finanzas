// Prueba la app instalable en un teléfono simulado (400px). Uso: node tests/pwa_e2e.js
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const path = require("path"), fs = require("fs");
const ROOT = path.join(__dirname, ".."), SHOTS = path.join(ROOT, "shots2"); fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], { cwd: path.join(ROOT, "pwa"), stdio: "ignore" });
  await sleep(800);
  const URL = "http://127.0.0.1:8765/";
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-CL", acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const shot = n => page.screenshot({ path: path.join(SHOTS, n + ".png"), fullPage: true });
  const click = async s => { await page.click(s); await sleep(120); };

  await page.goto(URL); await page.waitForSelector("[data-act=empOrigen]");
  await shot("01-bienvenida");
  // manifest y service worker
  const man = await page.evaluate(async () => (await fetch("manifest.webmanifest")).json());
  ok(man.display === "standalone" && man.icons.some(i => i.purpose === "maskable" && i.sizes === "512x512"), "manifest instalable (standalone, ícono 512 maskable)");
  await page.evaluate(() => navigator.serviceWorker.ready); await sleep(300);
  ok(await page.evaluate(() => !!navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(r => !!r.active)), "service worker activo");

  // onboarding con plan Origen
  await click("[data-act=empOrigen]"); await page.waitForSelector(".hero");
  const nItems = await page.evaluate(() => S.items.length);
  ok(nItems === 21 && (await page.evaluate(() => S.planes[0].hasta)) === "2029-06", "plan Origen cargado: 21 ítems hasta jun-2029");
  await shot("02-inicio");

  // Plan: noviembre
  await click("nav.tabs [data-tab=plan]"); await click("[data-act=mes][data-n='1']");
  ok((await page.textContent("main")).includes("Comida"), "vista mes del plan muestra ítems");
  await shot("03-plan-mes");

  // nuevo ítem con sugerencia + presupuesto fijo hasta fin del plan
  await click("[data-act=nuevoItem]"); await click("[data-act=niSug][data-n=Supermercado]"); await click("[data-act=niCrear]");
  ok(await page.$(".strip") !== null, "al crear ítem se abre su presupuesto mes a mes");
  await page.fill("#tMonto", "150.000"); await click("[data-act=tFin]"); await click("[data-act=tAplicar]");
  let pres = await page.evaluate(() => S.planes[0].presupuesto.supermercado.montos);
  ok(Object.keys(pres).length === 32 && pres["2029-06"] === 150000, "fijo nov-26 → jun-29 aplicado (32 meses)");
  await shot("04-item-sheet");
  // cuotas: compra en 6 cuotas
  await click("[data-act=tModo][data-v=cuotas]"); await page.fill("#tMonto", "40000"); await page.fill("#tN", "6"); await page.fill("#tDesde", "2027-01"); await click("[data-act=tAplicar]");
  pres = await page.evaluate(() => S.planes[0].presupuesto.supermercado.montos);
  ok(pres["2027-01"] === 40000 && pres["2027-06"] === 40000 && pres["2027-07"] === 150000, "cuotas reemplazan solo 6 meses");
  // puntual: diciembre más alto
  await click("[data-act=tMes][data-v='2026-12']"); await page.fill("#tPuntual", "220000"); await click("[data-act=tGuardarPuntual]");
  ok(await page.evaluate(() => S.planes[0].presupuesto.supermercado.montos["2026-12"]) === 220000, "edición de un mes puntual");
  // validación
  await click("[data-act=tModo][data-v=fijo]"); await page.fill("#tMonto", ""); await click("[data-act=tAplicar]");
  ok(/mayor que cero/.test(await page.textContent("#tMsg")), "valida monto vacío en herramientas");
  // ajustes del ítem: umbral propio 70% y arrastre
  await page.click("#tAjustes summary"); await page.fill("#aAviso", "70"); await page.check("#aArrastre"); await click("[data-act=aGuardar]");
  const itS = await page.evaluate(() => itemById("supermercado"));
  ok(itS.aviso === 70 && itS.arrastre === true, "ajustes del ítem guardados (aviso 70%, arrastre)");
  await click("[data-act=cerrar]");

  // dividendo en UF: convertir unidad
  await page.evaluate(() => sheetItem("dividendo", "2026-11")); await sleep(120); // está oculto en nov (sin presupuesto)
  await page.selectOption("#tUnidad", "UF"); await page.fill("#tMonto", "14,75"); await page.fill("#tDesde", "2027-04"); await click("[data-act=tFin]"); await click("[data-act=tAplicar]");
  const div = await page.evaluate(() => S.planes[0].presupuesto.dividendo);
  ok(div.unidad === "UF" && div.montos["2027-04"] === 14.75 && Math.abs(div.montos["2027-03"] - 921570 / 41205) < 0.01, "dividendo pasado a UF (marzo convertido, abril 14,75 UF)");
  await click("[data-act=cerrar]");

  // registrar gastos: cruza 70% del súper en noviembre → aviso
  const addGasto = async (monto, item, fecha) => { await click("#fab"); await page.fill("#mMonto", monto); if (!(await page.$(`[data-act=mitem][data-v=${item}]`))) await click("[data-act=mver]"); await click(`[data-act=mitem][data-v=${item}]`); await page.fill("#mFecha", fecha); await click("[data-act=guardarMov]"); await sleep(150); };
  await addGasto("100000", "supermercado", "2026-11-03");
  await addGasto("10000", "supermercado", "2026-11-04");
  const t1 = await page.textContent("#toastRoot");
  ok(/73%/.test(t1), "aviso al cruzar el umbral propio (70%): " + t1.trim());
  await addGasto("10000", "supermercado", "2026-11-04");
  ok(/igual/.test(await page.textContent("#mMsg")), "detecta gasto duplicado");
  await click("[data-act=cerrar]");
  await addGasto("50000", "supermercado", "2026-11-05");
  ok(/107%/.test(await page.textContent("#toastRoot")), "aviso al superar el 100%");
  // nuevo ítem desde el registro
  await click("#fab"); await page.fill("#mMonto", "25000"); await click("[data-act=nuevoItemDesdeMov]"); await page.fill("#niNombre", "Farmacia"); await click("[data-act=niCrear]");
  ok(await page.evaluate(() => MF && MF.item === "farmacia") && (await page.inputValue("#mMonto")).includes("25"), "ítem creado desde el registro vuelve al gasto con el monto");
  await page.fill("#mFecha", "2026-11-06"); await click("[data-act=guardarMov]");
  await page.waitForTimeout(100);
  await shot("05-plan-nov-con-gastos");
  const sup = await page.textContent("[data-act=item][data-id=supermercado]");
  ok(/107%/.test(sup) && /Te pasaste por \$10\.000/.test(sup), "ítem muestra 107% y exceso de $10.000");

  // grilla
  await click("[data-act=vista][data-v=grilla]"); await shot("06-grilla");
  ok(await page.$$eval("table.grid tbody tr", r => r.length) > 20, "grilla anual con ítems y totales");
  await click("table.grid td[data-id=comida][data-mes='2027-02']");
  ok((await page.textContent(".sheet h3")) === "Comida", "tocar celda abre el ítem en ese mes");
  await click("[data-act=cerrar]");

  // saldos → disponible
  await click("nav.tabs [data-tab=mas]"); await click("[data-act=cuenta][data-id=corriente]"); await page.fill("#cSaldo", "2.500.000"); await click("[data-act=guardarCuenta]");
  await click("nav.tabs [data-tab=inicio]");
  const disp = (await page.textContent(".hero .big")).replace(/\s/g, "");
  ok(disp === "$2.315.000", "disponible = saldo 2.500.000 − gastos registrados después (185.000): " + disp);
  await click("nav.tabs [data-tab=proy]"); await shot("07-proyeccion");

  // respaldo JSON + Excel
  await click("nav.tabs [data-tab=mas]");
  const [dl1] = await Promise.all([page.waitForEvent("download"), page.click("[data-act=backup]")]);
  const bpath = path.join(SHOTS, "respaldo.json"); await dl1.saveAs(bpath);
  const bj = JSON.parse(fs.readFileSync(bpath, "utf8"));
  ok(bj.version === 2 && bj.movs.length === 4 && bj.items.length === 23, "respaldo JSON completo (4 movs, 23 ítems)");
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.click("[data-act=excel]")]);
  const xpath = path.join(SHOTS, "export.xlsx"); await dl2.saveAs(xpath);
  const xl = execFileSync("python3", ["-c", `import openpyxl,sys;wb=openpyxl.load_workbook(sys.argv[1]);ws=wb.worksheets[0];print(wb.sheetnames, ws.max_row, ws.cell(1,4).value)`, xpath]).toString();
  ok(/Movimientos/.test(xl) && /Proyecci/.test(xl), "Excel exportado con hojas Plan/Real/Movimientos/Proyección: " + xl.trim());
  await shot("08-mas");

  // sin conexión: recargar y seguir funcionando con los datos
  await ctx.setOffline(true); await page.reload(); await page.waitForSelector(".hero", { timeout: 5000 }).catch(() => {});
  ok((await page.textContent(".hero .big").catch(() => "")).includes("2.315.000"), "funciona sin conexión tras recargar, con los datos guardados");
  await ctx.setOffline(false);

  // restaurar respaldo en un teléfono "nuevo" (contexto limpio) — incluido respaldo v1 del artefacto
  const ctx2 = await browser.newContext({ viewport: { width: 400, height: 860 }, isMobile: true, colorScheme: "dark" });
  const p2 = await ctx2.newPage(); p2.on("pageerror", e => errors.push(e.message));
  await p2.goto(URL); await p2.waitForSelector("#fileRestore", { state: "attached" });
  await p2.setInputFiles("#fileRestore", bpath); await p2.waitForSelector("[data-act=restaurarOk]"); await p2.click("[data-act=restaurarOk]"); await p2.waitForSelector("nav.tabs:not([hidden])");
  const rest = await p2.evaluate(() => [S.movs.length, S.planes.length, S.planes[0]?.presupuesto?.supermercado?.montos?.["2026-12"]]);
  ok(rest[0] === 4 && rest[2] === 220000, "restauración en dispositivo nuevo recupera todo " + JSON.stringify(rest));
  for (const t of ["inicio", "plan", "proy", "mas"]) { await p2.click(`nav.tabs [data-tab=${t}]`); await sleep(100); await p2.screenshot({ path: path.join(SHOTS, `dark-${t}.png`), fullPage: true }); }
  const v1 = path.join(SHOTS, "v1.json");
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, "seed.json"), "utf8"));
  fs.writeFileSync(v1, JSON.stringify({ app: "caja-familiar", version: 1, exportado: "2026-10-28T12:00:00Z", config: s.config, categorias: s.categorias, cuentas: s.cuentas, escenarios: s.escenarios, deudas: [], metas: [], movs: [{ id: "x1", fecha: "2026-11-02", tipo: "gasto", monto: 5000, cuenta: "corriente", cat: "comida", ts: 1 }] }));
  await p2.click("nav.tabs [data-tab=mas]"); await p2.setInputFiles("#fileRestore", v1); await p2.waitForSelector("[data-act=restaurarOk]"); await p2.click("[data-act=restaurarOk]"); await sleep(300);
  ok(await p2.evaluate(() => S.planes.length === 2 && S.movs[0].item === "comida"), "restaura respaldo de la versión anterior (artefacto)");
  const over = await p2.evaluate(() => document.documentElement.scrollWidth > innerWidth) || await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(!over, "sin scroll horizontal a 400px");
  ok(errors.length === 0, "sin errores de consola " + errors.join(" | "));
  await browser.close(); srv.kill();
  console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
