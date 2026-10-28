"""Genera pwa/data/plan-origen.json (modelo v2: ítems + plan) desde seed.json (verificado contra Excel)."""
import json, sys
src, out, esc_id = sys.argv[1], sys.argv[2], sys.argv[3]
s = json.load(open(src))
e = next(x for x in s["escenarios"] if x["id"] == esc_id)
grupos = [{"id": "ingreso", "nombre": "Ingresos"}, {"id": "vivienda", "nombre": "Vivienda"}, {"id": "hogar", "nombre": "Hogar y comida"},
          {"id": "auto", "nombre": "Auto"}, {"id": "deudas", "nombre": "Deudas y cuotas"}, {"id": "otros", "nombre": "Otros"}]
items = [{"id": c["id"], "nombre": c["nombre"], "tipo": c["tipo"], "grupo": c["grupo"], "orden": c["orden"],
          "alertas": c["alertas"], "arrastre": False, "dia": None} for c in s["categorias"]]
plan = {"id": e["id"], "nombre": e["nombre"], "desde": e["desde"], "hasta": e["hasta"],
        "presupuesto": {i["cat"]: {"unidad": i["unidad"], "montos": i["montos"]} for i in e["items"]},
        "notas": e["notas"], "supuestos": e["supuestos"], "origen": e["origen"]}
cfg = {**s["config"], "planActivo": e["id"], "grupos": grupos}
cfg.pop("escenario", None)
json.dump({"app": "caja-familiar", "version": 2, "config": cfg, "items": items, "planes": [plan], "cuentas": s["cuentas"]},
          open(out, "w"), ensure_ascii=False)
print("ok", len(items), "ítems", plan["desde"], "→", plan["hasta"])
