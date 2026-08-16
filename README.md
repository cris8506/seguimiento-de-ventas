# Conversion Bridge — Hotmart → Meta Conversions API

**Conversion Bridge** es una aplicación web full-stack privada de uso personal, diseñada como una capa de control seguro entre las ventas de **Hotmart** y la **Meta Conversions API (CAPI)**.

---

## 1. Características Principales

- **Idempotencia Garantizada**: Cada transacción de Hotmart genera un identificador determinístico `HOTMART_<transaction_id>` que nunca cambia en reintentos, impidiendo envíos duplicados a Meta.
- **Ventas Manuales con Previsualización**: Registra ventas directas (WhatsApp, transferencia, llamadas, Instagram) generando un identificador permanente `MANUAL_<UUID>` con detector de posibles duplicados antes de enviar.
- **Doble Modo de Operación**:
  - **Modo Monitor (Predeterminado)**: Recibe, audita y valida las compras en la base de datos sin enviarlas automáticamente a Meta. Incluye botón para pruebas individuales.
  - **Modo Activo**: Valida las compras aprobadas de Hotmart y las envía automáticamente a Meta CAPI en tiempo real.
- **Acceso Exclusivo de Administrador**: Autenticación mediante Google Sign-In (Firebase Auth), restringida estrictamente al correo definido en `ADMIN_EMAIL`.
- **Privacidad y Seguridad Server-Side**: Los Access Tokens de Meta y credenciales de Hotmart residen exclusivamente en el backend y nunca son expuestos al navegador ni almacenados en localStorage.
- **Normalización y Hashing SHA-256**: Los datos del comprador (Email, Teléfono, Nombre) son normalizados y hasheados en SHA-256 siguiendo el estándar oficial de Meta Graph API.
- **Auditoría y Diagnóstico en Tiempo Real**: Registro cronológico de cada webhook, validación, respuesta de Meta (`fbtrace_id`) y reintentos con backoff seguro.

---

## 2. Variables de Entorno (Secrets)

Configura estas variables en el panel de **Settings / Secrets** de Google AI Studio:

| Variable | Descripción | Obligatorio |
| :--- | :--- | :--- |
| `ADMIN_EMAIL` | Correo electrónico de Google autorizado para acceder (ej: `mis.cursos.digitales1@gmail.com`) | Sí |
| `META_ACCESS_TOKEN` | Token de acceso del Sistema / Desarrollador de Meta Events Manager | Sí (Para envíos reales a Meta) |
| `META_DATASET_ID` | ID del Dataset o Píxel de Meta Events Manager | Sí (Para envíos reales a Meta) |
| `META_GRAPH_API_VERSION` | Versión centralizada de Graph API (Predeterminada: `v21.0`) | Opcional |
| `HOTMART_CLIENT_ID` | Client ID de Hotmart Developers API para validación y sincronización | Opcional |
| `HOTMART_CLIENT_SECRET` | Client Secret de Hotmart Developers API | Opcional |
| `DEV_USE_MOCK_DATA` | `true` o `false` para cargar datos de prueba iniciales | Opcional |

---

## 3. Configuración en Hotmart (Webhook)

1. Ingresa a tu cuenta de **Hotmart**.
2. Dirígete a **Herramientas** → **Webhook (API y notificaciones)**.
3. Haz clic en **Crear configuración**.
4. Pega la URL pública de tu webhook proporcionada en la pestaña **Configuración** de la app:
   ```text
   https://tu-dominio.run.app/api/webhooks/hotmart
   ```
5. En la sección de eventos, selecciona:
   - ✅ **Compra aprobada** (Genera evento Purchase en Meta)
   - ✅ **Compra reembolsada** (Actualiza estado a refunded sin borrar historial)
   - ✅ **Chargeback** (Actualiza estado a chargeback)
   - ✅ **Compra cancelada** (Actualiza estado a canceled)
6. Guarda y realiza un envío de prueba desde Hotmart.
7. Comprueba en la pestaña **Diagnóstico** y **Actividad** de Conversion Bridge la recepción del webhook.

---

## 4. Configuración en Meta Conversions API

1. Ingresa a [Meta Events Manager](https://business.facebook.com/events_manager2).
2. Selecciona tu **Dataset / Píxel**.
3. Ve a la pestaña **Configuración** → sección **API de Conversiones**.
4. En "Configurar manualmente", genera un **Token de Acceso**.
5. Copia el token y agrégalo en los Secrets de AI Studio como `META_ACCESS_TOKEN`.
6. Copia el ID de tu Dataset y agrégalo como `META_DATASET_ID`.
7. En la pestaña **Configuración** de Conversion Bridge, pulsa el botón **"Probar conexión con Meta (Sin costo)"** para verificar la comunicación.

---

## 5. Modos de Operación

### Modo Monitor
- Es el modo seguro inicial.
- Toda compra recibida se registra en el libro de ventas con estado `No enviada`.
- Puedes revisar los datos y presionar **"Enviar a Meta"** en la venta deseada.

### Modo Activo
- Toda compra aprobada verificada se despacha de inmediato a Meta CAPI.
- **Advertencia**: Antes de activarlo, confirma que no exista otra integración enviando simultáneamente las mismas compras con IDs distintos, para evitar duplicados en el Administrador de Anuncios.

---

## 6. Registro de Ventas Manuales

1. Haz clic en el botón **"+ Agregar venta manual"** en la barra lateral o dashboard.
2. Ingresa el monto, moneda, fecha/hora real de la compra, canal de origen (WhatsApp, transferencia, etc.) y al menos un dato de contacto (Email o Teléfono).
3. Si existe una venta similar en las últimas 24 horas, el sistema mostrará una advertencia de **Posible duplicado**.
4. Revisa la pantalla de confirmación con los datos enmascarados y el `event_id` asignado.
5. Selecciona **"Guardar sin enviar"** o **"Confirmar y Enviar a Meta"**.

---

## 7. Simulador de Pruebas

En la barra lateral, haz clic en **"Simulador Webhook"**:
- Te permite disparar compras aprobadas, reembolsos o chargebacks simulados hacia el endpoint `/api/webhooks/hotmart`.
- Permite verificar el comportamiento del sistema de deduplicación y el registro sin necesidad de procesar transacciones reales en Hotmart.

---

## 8. Seguridad y Privacidad

- Los emails y teléfonos se muestran parcialmente ocultos en tablas y resúmenes (`j***z@gmail.com`, `+57 *** *** 1234`).
- Al enviar a Meta, la normalización elimina espacios y signos, y aplica **SHA-256** estrictamente en el backend.
- Nunca se expone el Access Token en el cliente.
