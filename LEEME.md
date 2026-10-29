# Fintias: cómo instalarla y usarla

Fintias es una app de finanzas personales que se instala en tu Android desde Chrome. Funciona sin internet y guarda tus datos **solo en tu teléfono**: no tiene servidores, cuentas ni costos.

## 1. Publicarla (una sola vez, ~3 minutos)
1. Descomprime `fintias-app.zip`. Queda una carpeta llamada `fintias`.
2. En el computador entra a **app.netlify.com/drop** y crea una cuenta gratis (puedes entrar con Google).
3. Arrastra la carpeta `fintias` a la página. Netlify te da una dirección, por ejemplo `https://algo.netlify.app`.
4. Opcional: en *Site configuration → Change site name* cámbiale el nombre a uno fácil, como `mis-fintias`.

**Importante:** usa siempre la misma dirección. Los datos quedan asociados a ella.

## 2. Instalarla en el teléfono
1. Abre la dirección en **Chrome** desde tu Android.
2. Toca **Instalar** (aparece un aviso en la app, o en el menú ⋮ → *Instalar app*).
3. Desde ahí se abre con su ícono, a pantalla completa y sin internet.

## 3. Primer uso
Puedes partir de tres formas:
- **Empezar:** eliges moneda (y UF si la usas), categorías y cuentas. Luego el **asistente** arma tu presupuesto en 4 pasos: ingresos, gastos mensuales, meses especiales (aguinaldo, vacaciones, permiso de circulación…) y un resumen con tu ahorro del año.
- **Explorar con datos de ejemplo:** 12 meses ficticios para ver cómo se ven los gráficos y las alertas. Se borran desde la etiqueta "Datos de ejemplo" o desde Ajustes.
- **Restaurar un respaldo:** si ya usabas Fintias en otro teléfono.

## 4. Uso diario
- **Registrar:** toca el botón **+** del centro, escribe el monto y toca la categoría. Se guarda al instante y aparece **Deshacer** por si te equivocaste.
  - El teclado suma y resta, por ejemplo `15000+3200`.
  - Las categorías que más usas aparecen primero.
  - Fecha, cuenta y nota solo se tocan si hace falta.
- **Compras en cuotas:** activa "En cuotas" antes de elegir la categoría. Cada cuota cuenta en el presupuesto de su mes.
- **Devoluciones:** activa "Devolución". El monto se descuenta de la categoría.
- **Pagar la tarjeta:** regístralo como *Transferencia* de tu cuenta a la tarjeta. No es un gasto nuevo, porque cada compra ya se registró al hacerla.
- **Pagos recurrentes** (Ajustes): arriendo, sueldo, suscripciones, créditos. Pueden registrarse solos o pedirte confirmación en Inicio.

## 5. Dónde ver cada cosa
| Pantalla | Qué muestra |
|---|---|
| **Inicio** | Cuánto puedes gastar hoy, gasto del mes contra presupuesto (la marca indica dónde deberías ir según el día), ritmo, cierre estimado, tasa de ahorro, alertas, pagos por confirmar y tus cuentas. |
| **Presupuesto → Mes** | Cada categoría con lo gastado, lo presupuestado y lo que queda. Tócala para ver su detalle. |
| **Presupuesto → Año** | Grilla de 12 meses: toca una celda para cambiar ese mes, desde ese mes a diciembre o todo el año. También tiene **Copiar al año siguiente** con reajuste. |
| **Análisis** | Observaciones automáticas (por ejemplo "Otros subió 52%"), evolución de cada categoría con minicurvas, gasto acumulado del mes contra el anterior, ingresos contra gastos, en qué se va tu plata, proyección de tu saldo, compromisos futuros y metas. |
| **Detalle de categoría** | Curva de 6, 12 o 24 meses con promedio móvil y presupuesto, variación contra tu promedio, tendencia mensual y su presupuesto del año. |

## 6. Alertas
- Avisa al llegar al 80% del presupuesto de una categoría y al superar el 100%. Los umbrales se cambian en Ajustes, y cada categoría puede tener los suyos.
- En los gastos fijos (arriendo, cuentas) pagar el 100% es lo normal: solo avisa si te pasas.
- Puedes activar notificaciones del teléfono en *Ajustes → Alertas y preferencias*.

## 7. Respaldo (importante)
Tus datos están solo en el teléfono: si lo pierdes o borras los datos de Chrome, se pierden.
- En *Ajustes → Respaldo*, usa **Enviar respaldo a Drive, correo…** una vez al mes. La app te lo recuerda cuando pasan 30 días.
- **Exportar a Excel** genera tus movimientos, el presupuesto del año y lo real por mes.
- Antes de restaurar o borrar, Fintias guarda una copia automática interna que puedes recuperar.

## 8. Actualizaciones
Cuando se publique una versión nueva (arrastrando la carpeta nueva a Netlify), la app mostrará "Hay una versión nueva → Actualizar". Tus datos no se tocan.

## 9. Límites conocidos
- La UF se ingresa a mano (Ajustes → Alertas y preferencias). Cada mes guarda su propio valor.
- No hay recordatorios con la app cerrada (por ejemplo "mañana vence el arriendo"), porque requieren un servidor.
- Sin sincronización entre teléfonos: para cambiar de teléfono se usa el respaldo. El respaldo automático en Google Drive quedó para una próxima etapa.

La documentación técnica para mantener la app está en `README.md`, dentro de `fintias-codigo.zip`.
