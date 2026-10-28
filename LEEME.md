# Caja Familiar: app instalable

App de finanzas personales para Android que se instala desde Chrome (PWA). Funciona sin internet y guarda los datos **solo en tu teléfono**. Ningún servidor recibe tu información.

## 1. Publicar la app (una sola vez)
Android solo instala apps web desde una dirección HTTPS. Esa dirección entrega únicamente el código: tus datos nunca pasan por ella.

**Opción A: Netlify (sin GitHub, unos 3 minutos)**
1. Descomprime `caja-familiar-app.zip`. Queda una carpeta `caja-familiar`.
2. En el computador, entra a https://app.netlify.com/drop y crea una cuenta gratis (puedes usar Google).
3. Arrastra la carpeta `caja-familiar` a la página. En segundos te entrega una dirección como `https://nombre-al-azar.netlify.app`.
4. Opcional: en *Site configuration → Change site name* puedes ponerle un nombre más fácil de recordar.

**Opción B: GitHub Pages.** Si conectas tu cuenta de GitHub en la sesión con Claude, Claude crea el repositorio y publica la app por ti.

## 2. Instalar en el teléfono
1. Abre la dirección en **Chrome** en tu Android.
2. Toca **Instalar** (aparece en un aviso de la app o en el menú ⋮ → *Instalar app*).
3. Desde entonces se abre desde su ícono, a pantalla completa y sin necesitar internet.
4. Al abrirla por primera vez, elige **Empezar con mi plan Origen**.

## 3. Uso
- **Plan → Mes:** muestra cada ítem con lo presupuestado, lo gastado y lo que te queda. Al tocar un ítem se abre su presupuesto mes a mes.
- **Herramientas de presupuesto:**
  - *Fijo:* el mismo monto en un rango de meses.
  - *Cuotas:* un monto por N meses seguidos.
  - *Periódico:* un monto cada N meses, por ejemplo anual.
  - *Borrar:* deja en cero un rango.
  - También puedes cambiar un solo mes, y cada ítem puede estar en pesos o en UF.
- **Plan → Grilla anual:** todos los ítems por 12 meses, con totales. Tocar una celda abre ese ítem en ese mes.
- **+ Agregar ítem:** puedes elegir de una lista de sugerencias o crear uno propio. También se crea desde el registro de un gasto.
- **Botón +:** registra un gasto, un ingreso o una transferencia contra un ítem. La app avisa si estás por guardar un registro repetido y cuando un ítem cruza su umbral.
- **Ajustes del ítem:**
  - umbral de aviso y de límite propios,
  - día de pago (aparece en "Pagos pendientes"),
  - *pasar lo que sobre al mes siguiente*: el sobrante o el exceso de un mes ya cerrado se suma o resta al siguiente,
  - ocultar el ítem.
- **Tarjeta de crédito:** cada compra se registra como gasto en su ítem, pagada con la tarjeta. El pago de la tarjeta se registra como *Transferencia* de la cuenta a la tarjeta, así no cuenta como gasto dos veces.
- **Proyección:** saldo mes a mes, meses con déficit, aviso de colchón mínimo y comparación entre planes.
- **Más:** cuentas y saldos (opcional), deudas, metas, planes (crear, duplicar, activar), grupos, umbrales generales, UF y notificaciones.

## 4. Respaldo (importante)
Los datos viven solo en el teléfono. Si lo pierdes o borras los datos de Chrome, se pierden.
- **Más → Guardar respaldo** descarga un archivo JSON. Con **Enviar respaldo** lo puedes mandar a Drive o al correo.
- La app te recuerda respaldar cuando pasan 30 días sin hacerlo.
- **Restaurar desde respaldo** carga ese archivo en cualquier teléfono. También acepta el respaldo de la versión anterior (el artefacto en Claude).
- **Exportar a Excel** genera un archivo con cuatro hojas: Plan, Real, Movimientos y Proyección.

## 5. Mantención
| Archivo | Qué contiene |
|---|---|
| `js/calc.js` | Todos los cálculos: presupuesto, sobrantes, umbrales, disponible y proyección. No depende de la pantalla y tiene pruebas. |
| `js/store.js` | Base de datos local (IndexedDB). |
| `js/app.js` | Pantallas y formularios. |
| `sw.js` | Funcionamiento sin conexión. |
| `data/plan-origen.json` | Plan inicial, generado desde `calculos.xlsx`. |

- **Publicar una versión nueva:** sube `VERSION` en `sw.js` y vuelve a arrastrar la carpeta a Netlify. La app muestra "Hay una versión nueva → Actualizar" y tus datos no se tocan.
- **Pruebas:** `node tests/pwa_unit.js` (cálculos, incluida la comparación con el Excel) y `node tests/pwa_e2e.js` (la app completa en tamaño de teléfono, sin conexión, respaldo y restauración).
- **Regenerar el plan desde el Excel:** `python3 tools/build_seed.py` y luego `tools/build_seed_v2.py`.

## 6. Límites conocidos
- Las notificaciones aparecen al registrar un gasto que cruza un umbral. Los recordatorios programados con la app cerrada ("mañana vence el dividendo") requieren un servidor y quedan para una fase 2.
- La UF se actualiza a mano en Más.
- No hay sincronización entre dispositivos: para cambiar de teléfono se usa el respaldo.
