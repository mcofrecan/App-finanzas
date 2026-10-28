"""Convierte la planilla calculos.xlsx en datos semilla para la app.

Uso: python3 -I build_seed.py <xlsx> <xlsx_recalculado> <salida.json>
No modifica la planilla. Verifica que el neto mensual calculado con los
datos importados coincide con la fila 'Ahorro acumulado' de Excel.
"""
import json, sys, datetime, openpyxl

SRC, RECALC, OUT = sys.argv[1:4]

# fila Excel -> categoría (id, nombre, tipo, grupo)
CATS = [
    ("sueldo", "Sueldo", "ingreso", "ingreso", 11),
    ("bonos", "Bonos", "ingreso", "ingreso", 12),
    ("aporte-papas", "Aporte papás", "ingreso", "ingreso", 20),
    ("aporte-cami", "Aporte Cami", "ingreso", "ingreso", 37),
    ("arriendo", "Arriendo", "gasto", "vivienda", 13),
    ("dividendo", "Dividendo", "gasto", "vivienda", 16),
    ("gastos-comunes", "Gastos comunes", "gasto", "vivienda", 17),
    ("fiu", "FIU", "gasto", "vivienda", 18),
    ("gastos-basicos", "Gastos básicos", "gasto", "hogar", 29),
    ("comida", "Comida", "gasto", "hogar", 30),
    ("comida-ninas", "Comida niñas", "gasto", "hogar", 33),
    ("otros", "Otros", "gasto", "hogar", 34),
    ("auto", "Cuota auto", "gasto", "auto", 14),
    ("patente", "Patente", "gasto", "auto", 15),
    ("seguro-auto", "Seguro auto", "gasto", "auto", 36),
    ("bencina", "Bencina", "gasto", "auto", 31),
    ("estacionamiento", "Estacionamiento SP", "gasto", "auto", 32),
    ("credito-consumo", "Crédito de consumo", "gasto", "deudas", 19),
    ("cuota-pie-coni", "Cuota pie Coni", "gasto", "deudas", 24),
    ("cuota-pie-cami", "Cuota pie Cami", "gasto", "deudas", 25),
    ("tarjeta", "Tarjeta de crédito", "gasto", "deudas", 35),
]

wb = openpyxl.load_workbook(SRC)
wv = openpyxl.load_workbook(RECALC, data_only=True)

def scenario(sheet, sid, nombre, notas):
    ws, wsv = wb[sheet], wv[sheet]
    months = []
    for c in range(2, ws.max_column + 1):
        v = ws.cell(10, c).value
        if isinstance(v, datetime.datetime):
            months.append((c, v.strftime("%Y-%m")))
    items = []
    for cid, _, _, _, row in CATS:
        assert ws.cell(row, 1).value is not None, (sheet, row)
        montos = {}
        for c, m in months:
            v = ws.cell(row, c).value
            if isinstance(v, (int, float)) and v:
                montos[m] = round(v)
        items.append({"cat": cid, "unidad": "CLP", "montos": montos})
    sup = [
        {"k": wsv.cell(r, 1).value, "uf": wsv.cell(r, 2).value, "clp": wsv.cell(r, 3).value}
        for r in range(1, 9) if wsv.cell(r, 1).value
    ]
    # verificación: neto calculado == fila 39 de Excel
    tipo = {c[0]: c[2] for c in CATS}
    for c, m in months:
        neto = sum((1 if tipo[i["cat"]] == "ingreso" else -1) * i["montos"].get(m, 0) for i in items)
        excel = round(wsv.cell(39, c).value)
        assert neto == excel, (sheet, m, neto, excel)
    return {
        "id": sid, "nombre": nombre, "desde": months[0][1], "hasta": months[-1][1],
        "items": items, "supuestos": sup, "notas": notas,
        "origen": f"calculos.xlsx, hoja '{sheet}'",
    }

esc = [
    scenario("Origen", "origen", "Origen", [
        "Crédito de consumo: 24 cuotas de $332.000 por $5.537.315 implican ~3,1% mensual. Confirmar cuota real.",
    ]),
    scenario("La Rioja", "la-rioja", "La Rioja", [
        "Pie total está fijo en $5.500.000 aunque la celda vecina dice 343 UF.",
        "Calcula un crédito de consumo de $1.404.000 pero la fila 'Crédito de consumo' está vacía: el ahorro queda sobrestimado.",
        "Las cuotas a Coni suman $2.950.000 vs $3.000.000 aportados.",
    ]),
]

uf = wb["Origen"]["B1"].value
seed = {
    "config": {
        "uf": uf, "ufFecha": None, "aviso": 80, "limite": 100,
        "escenario": "origen", "colchon": 0, "version": 1,
    },
    "categorias": [
        {"id": c[0], "nombre": c[1], "tipo": c[2], "grupo": c[3], "orden": i, "alertas": c[2] == "gasto"}
        for i, c in enumerate(CATS)
    ],
    "cuentas": [
        {"id": "corriente", "nombre": "Cuenta corriente", "tipo": "liquida", "saldo": None, "fechaSaldo": None, "orden": 0},
        {"id": "efectivo", "nombre": "Efectivo", "tipo": "liquida", "saldo": None, "fechaSaldo": None, "orden": 1},
        {"id": "tarjeta-credito", "nombre": "Tarjeta de crédito", "tipo": "credito", "saldo": None, "fechaSaldo": None, "cupo": None, "orden": 2},
    ],
    "escenarios": esc,
}
json.dump(seed, open(OUT, "w"), ensure_ascii=False, indent=1)
print("OK: netos verificados contra Excel;", {e["id"]: len(e["items"]) for e in esc}, "UF", uf)
