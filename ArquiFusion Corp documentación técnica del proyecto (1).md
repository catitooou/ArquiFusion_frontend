# ArquiFusion Corp: documentación técnica del proyecto

**Hackathon Codingbees**** · Equipo: Keyra y Cath · Entrega: domingo 15 de noviembre de 2026, 9:00 pm · Versión 1.0 (sábado 14 de noviembre)**

> Este documento es la fuente de verdad del equipo. Si cambian una decisión, edítenla aquí para que las dos sigan alineadas. Lo marcado como **\[POR VERIFICAR\]** depende de lo que permita la cuenta AWS Academy Learner Lab y se confirma en la sección 13.

## 0. Guía de lectura

| Sección | Contenido | Quién la lee |
| --- | --- | --- |
| 1 | Resumen del proyecto | Las dos |
| 2 | Problemas, soluciones y rúbrica | Las dos |
| 3 | Arquitectura y nubes | Las dos |
| 4 | Flujos de extremo a extremo | Las dos |
| 5 | Contratos compartidos (API, eventos, enums) | Las dos, es lo primero que se fija |
| 6 | Modelo de datos | Las dos |
| 7 | Backend y AWS | Keyra |
| 8 | Frontend | Cath |
| 9 | GCP (Firebase) y Azure | Cath |
| 10 | Simulador y datos semilla | Cath y Keyra |
| 11 | Reparto de trabajo e interfaces | Las dos |
| 12 | Cronograma hasta el domingo 9 pm | Las dos |
| 13 | Verificaciones iniciales y plan B | Las dos |
| 14 | Riesgos | Las dos |
| 15 | Guion del pitch y mapa de la rúbrica | Las dos |
| 16 | Decisiones pendientes | Las dos |

## 1. Resumen del proyecto

### 1.1 El reto

ArquiFusion Corp fabrica maquinaria y equipos para construcción, minería, infraestructura, agricultura y energía. Sus clientes operan flotas de decenas o cientos de máquinas en jornadas largas y exigentes, y una máquina detenida puede frenar una cadena completa de actividades.

Sus dolores principales son:

- Fallas inesperadas, aunque a veces las variables ya mostraban señales (temperatura, vibración, combustible) antes del fallo.
- Mantenimiento preventivo sin criterio: dos máquinas iguales necesitan atención en momentos distintos según su uso.
- Repuestos que faltan cuando varias máquinas fallan, o que sobran sin rotar.
- Poca visibilidad de dónde está cada máquina, cuál está operativa, detenida o requiere intervención.
- Técnicos asignados sin considerar gravedad, distancia, especialidad ni disponibilidad.
- Mala comunicación: cada rol (operador, técnico, gerente) necesita información distinta y con distinta urgencia.
- Sin historial confiable de incidentes ni detección de causas comunes cuando fallan varias máquinas en una misma zona.

Piden una solución que no sea solo un dashboard, que convierta datos operativos en decisiones, que crezca de decenas a miles de máquinas, con costo razonable y sin infraestructura permanentemente encendida.

### 1.2 Nuestra solución

**ArquiGuard** (nombre provisional, cámbienlo si quieren) es una plataforma serverless y multinube que:

1. Recibe telemetría de las máquinas (simulada en el hackathon).
2. Detecta anomalías multivariables comparando cada máquina contra su propio historial, contra su tendencia y contra otras máquinas del mismo modelo.
3. Ante un riesgo alto, dispara automáticamente un flujo de incidente con AWS Step Functions: diagnóstico con IA generativa, asignación del mejor técnico, verificación de repuestos y notificaciones personalizadas por rol.
4. Mantiene el historial del incidente hasta que el técnico lo resuelve, y deja a la gerencia una vista en vivo para visualizar el estado y reasignar técnicos.

**Frase de pitch:** una máquina parada cuesta horas. ArquiGuard la detecta antes de que falle, decide quién la atiende y avisa a cada persona exactamente lo que necesita saber.

### 1.3 Del objetivo de la empresa a nuestros resultados

| Objetivo de ArquiFusion | Cómo lo logramos |
| --- | --- |
| Menos tiempo de inactividad | Detección temprana de anomalías y flujo de atención automático |
| Mantenimiento en el momento justo | Horas restantes de mantenimiento según uso real y riesgo |
| Repuestos correctos en el lugar correcto | Verificación de stock por falla y detección de consumo irregular |
| Respuesta técnica rápida | Asignación por cercanía, especialidad, carga y experiencia |
| Visibilidad de la operación | Mapa en vivo con estado, riesgo y productividad |
| Información útil, no solo gráficos | Mensajes por rol generados por IA y flujo automatizado |
| Escalar a miles de máquinas con bajo costo | 100% serverless, pago por uso, nada encendido sin demanda |

### 1.4 Restricciones del proyecto

- Cuentas **AWS Academy Learner Lab**: rol único `LabRole`, servicios limitados, crédito de 100 dólares por estudiante, sesión que se reinicia.
- Plazo: **domingo 15 de noviembre, 9:00 pm**. Meta interna: congelar código a las 6:00 pm y entregar como tarde a las 8:00 pm.
- Equipo de 2 personas. Backend en **Node.js 20**.
- Obligatorio por la rúbrica: Step Functions, 2 o más nubes (usamos 3), solución completamente serverless, IA, persistencia con alta disponibilidad y pitch de 5 minutos.
- Variables globales en **AWS Secrets Manager**.

## 2. Problemas, soluciones y rúbrica

### 2.1 Problemas que resolvemos

Cubrimos 9 problemas del contexto, más 2 que salen casi gratis del motor de anomalías. La rúbrica pide resolver la mayor cantidad posible y nuestra meta mínima interna es **8 con pantalla o endpoint demostrable**.

| # | Problema del contexto | Solución | Dónde vive | Pantalla | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 1 | Fallas inesperadas y anomalías multivariables | `riskScore` 0 a 100 por máquina | `detect-anomaly` | Mapa y detalle de máquina | Imprescindible |
| 4 | Ubicación y estado | Mapa en vivo con color por estado | `fleet-api` + Leaflet | Vista Gerente | Imprescindible |
| 5 | Asignación de técnicos | Algoritmo de puntaje, con reasignación manual | `assign-technician` + `incidents-api` | Panel de la vista Gerente | Imprescindible |
| 9 | Comunicación por rol | Tres mensajes de la IA, SNS por email y Azure Function para push | `generate-diagnosis` + `dispatch-notification` | Toasts por rol | Imprescindible |
| 10 | Historial de incidentes | Línea de tiempo por incidente y por máquina | Tabla `Incidents` | Detalle de máquina | Imprescindible |
| 11 | Incidente multi-máquina | Causa común por zona y ventana de tiempo | Dentro de `detect-anomaly` | Banner en el mapa | Alta |
| 3 | Repuestos | Stock por falla y consumo irregular | `check-parts` + `parts-api` | Página Repuestos | Media |
| 7 | Productividad de la flota | Utilización con contadores en línea | `ingest` + `fleet-api` | Página Productividad | Media |
| 2 | Mantenimiento preventivo | Horas restantes según uso y riesgo | `detect-anomaly` | Badge en la máquina | Media |
| 6 | Consumo de combustible (extra) | Comparación contra pares del mismo modelo | `detect-anomaly` | Alerta en el detalle | Regalo |
| 8 | Comportamiento inusual (extra) | Comparación contra sí misma y contra pares | `detect-anomaly` | Idem | Regalo |
| 12 y 13 | Patrones previos a fallas y escalabilidad | Escalabilidad por arquitectura serverless; patrones quedan como roadmap | Arquitectura | Diapositiva | Pitch |

**Orden de recorte si falta tiempo** (de lo primero que se sacrifica a lo último): productividad (7), demanda de repuestos del problema 3 (queda solo la verificación dentro del flujo), mantenimiento (2). Aun así quedan 1, 4, 5, 9, 10, 11 más 6 y 8, es decir, 8 problemas.

**Regla del pitch:** no marquen un problema como resuelto si no tiene pantalla o endpoint que se pueda mostrar.

### 2.2 Cómo cubrimos cada criterio de la rúbrica

| Criterio | Puntos | Qué hacemos | Evidencia para el jurado |
| --- | --- | --- | --- |
| Mayor cantidad de problemas | 0 a 3 | 9 problemas más 2 extra, integrados en una cadena (anomalía, técnico, repuesto, notificación) | Tabla problema a módulo y demo del flujo |
| Persistencia y alta disponibilidad | 0 a 2 | DynamoDB on-demand (multi-AZ) con recuperación a un punto en el tiempo, S3 con versionado, DLQ en SQS, respaldo en Azure Blob | Diapositiva: si un servicio falla, los datos siguen |
| Step Functions | 0 a 2 | Workflow de incidentes con Choice, Parallel, Retry, Catch y waitForTaskToken | Ejecución visual en la consola durante la demo |
| 2 o más nubes | 0 a 3 | AWS (backend), GCP (frontend, autenticación, tiempo real), Azure (notificaciones y respaldo) | Diagrama con una función real por nube |
| Arquitectura | 0 a 3 | Diagrama por capas, decisiones justificadas, costos, Secrets Manager | Diagrama limpio y una diapositiva de costos |
| Pitch de 5 minutos | 0 a 2 | Demo en vivo del flujo completo y video de respaldo | Guion de la sección 15 |
| Completamente serverless | 0 a 2 | Solo Lambda, API Gateway, DynamoDB, S3, Step Functions, EventBridge, SNS, SQS, Firebase y Azure Functions | Cero EC2, RDS o contenedores |
| Uso de IA | 0 a 3 | Analítica (detección multivariable) y generativa dentro del Step Function, más asistente del gerente opcional | Diagnóstico generado por IA visible en el incidente |

## 3. Arquitectura

### 3.1 Diagrama general

```
 SIMULADOR (script Node, laptop)
      | POST /ingest (x-api-key)
      v
 [AWS] API Gateway (HTTP API)
      |
      v
 Lambda ingest ---> DynamoDB Telemetry (TTL) + Machines + FleetKPI
      |
      | invoca asincrona (DLQ en SQS si falla)
      v
 Lambda detect-anomaly --(riesgo >= 60)--> EventBridge bus arquifusion
      |  (tambien detecta causa comun por zona)        |
      |                                                v
      |                                  STEP FUNCTIONS (ms-incidentes)
      |                                   1 CreateIncident
      |                                   2 CheckRecurrence
      |                                   3 GenerateDiagnosis --> Bedrock / Gemini / reglas
      |                                   4 Parallel: AssignTechnician || CheckParts
      |                                   5 Parallel: notificar operador, tecnico, gerente
      |                                   6 UpdateIncident
      |                                   7 WaitForResolution (taskToken)
      |                                   8 CloseIncident
      |                                          |
      |                                          v
      |                          dispatch-notification --> SNS (email por rol)
      |                                          |
      |                                          +--> HTTPS --> [AZURE] Function send-notification --> push
      |
 DynamoDB Streams (Machines, Incidents) --> Lambda sync-to-firestore --> [GCP] Firestore
                                                                              |
 EventBridge cada hora --> Lambda backup-snapshot --> S3 versionado           v
                                      |                           [GCP] Firebase Hosting (React)
                                      +--> PUT HTTPS --> [AZURE] Blob Storage      + Firebase Auth

 [AWS] Secrets Manager: un secreto con las variables globales de las 3 nubes
```

### 3.2 Capas

| Capa | Componentes |
| --- | --- |
| Ingesta | Simulador, API Gateway, Lambda `ingest` |
| Procesamiento | `detect-anomaly`, EventBridge, Step Functions, Lambdas de apoyo |
| Almacenamiento | DynamoDB, S3, Azure Blob (réplica) |
| IA | Detección estadística multivariable y LLM (Bedrock, Gemini o reglas) |
| Notificación | SNS, Azure Function, Firestore (tiempo real) |
| Presentación | React en Firebase Hosting, Firebase Auth, Leaflet |

### 3.3 Rol de cada nube

| Nube | Rol | Servicios |
| --- | --- | --- |
| **AWS** | Backend, datos, automatización e IA | API Gateway, Lambda, DynamoDB, S3, EventBridge, Step Functions, SNS, SQS, Secrets Manager, Bedrock |
| **GCP** | Frontend, autenticación y tiempo real | Firebase Hosting, Firebase Auth, Firestore |
| **Azure** | Notificaciones y respaldo | Azure Function (HTTP trigger, Node) y Blob Storage |

### 3.4 Decisiones tomadas

| Tema | Decisión | Razón |
| --- | --- | --- |
| Ingesta | API Gateway, Lambda y DynamoDB directo | Simple y barato |
| Disparo de anomalías | `ingest` invoca `detect-anomaly` de forma asíncrona | Sin Streams extra, con DLQ para no perder eventos |
| Detección | Estadística multivariable en JavaScript puro | Isolation Forest necesita Python y scikit-learn, no es viable con Node y el límite del Layer |
| IA generativa | Bedrock (Amazon Nova) con proveedor intercambiable | Si Bedrock no funciona en el lab, se cambia una variable por Gemini o por reglas |
| Tiempo real | DynamoDB Streams, Lambda y Firestore | Listeners en el front, sin polling pesado |
| Notificaciones | SNS por email y Azure Function para push | SMS probablemente no funcione en el lab |
| Lenguaje | Node.js 20 con AWS SDK v3 | Ya incluido en el runtime de Lambda |
| Despliegue | AWS SAM con `LabRole` en todos los recursos | IAM está muy limitado en Learner Lab |
| Microservicios | Una Lambda con router interno por microservicio, más Lambdas independientes para Step Functions y eventos | Pasa de unas 35 funciones a unas 14 |

### 3.5 Restricciones de Learner Lab que afectan el diseño

- Todos los recursos usan `LabRole`. En el SAM va en `Globals` y en la State Machine y los targets de EventBridge.
- Nada externo usa claves de AWS, porque las credenciales del lab rotan. El front solo llama a API Gateway y la Azure Function solo recibe llamadas, nunca llama a AWS.
- No usar Cognito, VPC, NAT Gateway, Kinesis, Athena ni X-Ray.
- La sesión del lab suele durar unas horas y se reinicia: revisen que todo responda después de reiniciarla, y tengan un video de respaldo de la demo.
- Vigilen el saldo de crédito en el panel del lab.

## 4. Flujos de extremo a extremo

### 4.1 Flujo principal: de la lectura al incidente resuelto

1. El simulador envía una lectura cada 10 a 30 segundos con `POST /ingest`.
2. `ingest` valida, guarda en `Telemetry` y actualiza `Machines` y los contadores de `FleetKPI`.
3. `ingest` invoca de forma asíncrona a `detect-anomaly`.
4. `detect-anomaly` calcula el `riskScore`, el tipo de falla probable, las horas restantes de mantenimiento y revisa la causa común por zona. Actualiza `Machines`.
5. Si el riesgo es 60 o más y la máquina no tiene incidente abierto, publica `AnomaliaDetectada` en EventBridge.
6. Una regla de EventBridge inicia el Step Function.
7. El Step Function crea el incidente, revisa reincidencia, pide el diagnóstico a la IA, asigna técnico y revisa repuestos en paralelo, notifica por rol, marca la máquina como `requiere_intervencion` y se queda esperando.
8. El técnico presiona **Resolver** en el front. `POST /incidents/{id}/resolve` envía el token al Step Function, que cierra el incidente, calcula la parada, libera al técnico y devuelve la máquina a `operativa`.

### 4.2 Tiempo real hacia el front

DynamoDB Streams en `Machines` e `Incidents` dispara `sync-to-firestore`. Esta Lambda solo escribe en Firestore cuando cambia el estado, el nivel de riesgo o un incidente, **nunca cada lectura**, para respetar la cuota gratuita de Firestore. El front escucha Firestore con listeners para el mapa y los avisos.

### 4.3 Reasignación manual

El gerente abre un incidente, ve al técnico asignado y las 2 alternativas con su ETA, y llama `PATCH /incidents/{id}/assign`. Se actualiza el técnico, se libera el anterior y se notifica al nuevo.

### 4.4 Respaldo

Cada hora, EventBridge ejecuta `backup-snapshot`: exporta `Incidents`, `Machines` y `FleetKPI` a JSON, lo guarda en S3 versionado y lo copia con un PUT HTTPS al Blob de Azure usando una SAS URL.

## 5. Contratos compartidos

Estos contratos son lo **primero que fijan juntas**. Después se guardan como archivos JSON en la carpeta `contracts/` del repositorio.

### 5.1 Lectura de telemetría (simulador a `POST /ingest`)

| Campo | Tipo | Ejemplo | Notas |
| --- | --- | --- | --- |
| `machineId` | texto | EXC-014 | Clave |
| `model` | texto | EX-320 | Para comparar contra pares |
| `zone` | texto | ZONA-NORTE | Para causa común |
| `ts` | texto ISO 8601 | 2026-11-14T15:04:05Z | UTC |
| `lat`, `lng` | número | -12.0464, -77.0428 | Grados decimales |
| `hours` | número | 4521.3 | Horas acumuladas del motor |
| `temp` | número | 96.4 | Grados Celsius |
| `vibration` | número | 7.8 | mm/s |
| `pressure` | número | 182 | bar |
| `fuel_lph` | número | 38.2 | Litros por hora |
| `load_kg` | número | 12400 | Carga transportada |
| `speed_kmh` | número | 8.1 | Velocidad |
| `rpm` | número | 1850 | Revoluciones |
| `status` | texto | operativa | Ver enums |

### 5.2 Enums

| Enum | Valores |
| --- | --- |
| `status` de máquina | `operativa`, `detenida`, `requiere_intervencion`, `mantenimiento` |
| `severity` | `baja` (40 a 59, vigilancia, no crea incidente), `media` (60 a 74), `alta` (75 a 89), `critica` (90 o más) |
| `status` de incidente | `abierto`, `en_atencion`, `resuelto`, `error_flujo` |
| `faultType` | `motor`, `hidraulico`, `combustible`, `electrico`, `general` |
| `role` | `operador`, `tecnico`, `gerente` |
| `type` de incidente | `individual`, `grupal` |

Umbral de incidente: `riskScore` de 60 o más. Esta definición reemplaza cualquier versión anterior de la conversación.

### 5.3 Evento de EventBridge

| Propiedad | Valor |
| --- | --- |
| Bus | `arquifusion` |
| `source` | `arquifusion.analitica` |
| `detail-type` | `AnomaliaDetectada` |
| `detail` | `machineIds[]` (uno si es individual), `zone`, `riskScore`, `severity`, `faultType`, `variables[]` (las variables más desviadas), `groupId` (solo si es grupal) |

### 5.4 Respuesta estándar de la API

Toda respuesta tiene la forma `{ ok, data, error }`. Con éxito: `ok` es true, `data` trae el resultado y `error` es null. Con fallo: `ok` es false, `data` es null y `error` trae `{ code, message }`. Todas las respuestas llevan cabeceras CORS y las solicitudes OPTIONS responden 200.

### 5.5 Endpoints

| Servicio | Método y ruta | Quién la consume |
| --- | --- | --- |
| Ingesta | `POST /ingest` (clave de ingesta) | Simulador |
| Flota | `GET /machines`, `GET /machines/{id}`, `GET /fleet/productivity`, `GET /dashboard/summary` | Front |
| Analítica | `GET /machines/{id}/risk`, `GET /maintenance/forecast`, `GET /common-causes` | Front |
| Incidentes | `GET /incidents`, `GET /incidents/{id}`, `GET /machines/{id}/incidents`, `POST /incidents/{id}/resolve`, `PATCH /incidents/{id}/assign`, `GET /incidents/{id}/suggestions` | Front |
| Técnicos | `GET /technicians`, `PATCH /technicians/{id}` | Front |
| Repuestos | `GET /parts`, `GET /parts/demand`, `POST /parts/{id}/restock` | Front |
| IA | `POST /ai/ask` (opcional) | Front |

**Autenticación para el hackathon:** dos claves en el header `x-api-key`: `INGEST_API_KEY` (solo para el simulador) y `FRONT_API_KEY` (para el front). Se validan dentro de la Lambda con un helper compartido. El inicio de sesión de las personas va con Firebase Auth en el front.

### 5.6 Convenciones

- Tablas en PascalCase (`Machines`, `Incidents`). Lambdas con el nombre `arquifusion-{servicio}-{accion}`.
- Variables de entorno en mayúsculas: `TABLE_MACHINES`, `TABLE_INCIDENTS`, `TABLE_TELEMETRY`, `TABLE_TECHNICIANS`, `TABLE_PARTS`, `TABLE_PARTS_CONSUMPTION`, `TABLE_COMMON_CAUSES`, `TABLE_FLEET_KPI`, `TABLE_NOTIF_LOG`, `SECRET_NAME`, `EVENT_BUS_NAME`, `STATE_MACHINE_ARN`, `LLM_PROVIDER`.
- Fechas siempre en ISO 8601 UTC. Distancias en kilómetros.
- Identificador de incidente: `INC-AAAAMMDD-XXXX`.

### 5.7 Secreto global en Secrets Manager

Un solo secreto llamado `arquifusion/global`, en formato JSON, con estas claves. Las Lambdas lo leen una vez y lo guardan en caché del módulo.

| Clave | Uso |
| --- | --- |
| `INGEST_API_KEY` | Clave del simulador |
| `FRONT_API_KEY` | Clave del front |
| `AZURE_FUNCTION_URL` y `AZURE_FUNCTION_KEY` | Llamar a la Azure Function |
| `AZURE_BLOB_SAS_URL` | Copiar el respaldo al Blob |
| `FIREBASE_SERVICE_ACCOUNT` | Escribir en Firestore |
| `GEMINI_API_KEY` | Solo si usamos Gemini como plan B de la IA |

## 6. Modelo de datos (DynamoDB on-demand)

Todas las tablas son on-demand con recuperación a un punto en el tiempo activada.

| Tabla | Clave | Índices | Atributos principales |
| --- | --- | --- | --- |
| `Machines` | `machineId` | `zone-index` (zone, riskUpdatedAt), `model-index` (model) | model, zone, lat, lng, status, hours, `last` (última lectura), riskScore, severity, faultType, riskUpdatedAt, lastReadingAt, lastMaintHours, maintIntervalH, hoursToMaint, openIncidentId |
| `Telemetry` | `machineId` y `ts` | ninguno | temp, vibration, pressure, fuel\_lph, load\_kg, speed\_kmh, rpm, `expiresAt` (TTL de 2 días) |
| `FleetKPI` | `machineId` y `date` | ninguno | readings, activeReadings, fuelSum (contadores incrementales) |
| `Incidents` | `incidentId` | `machine-index` (machineId, createdAt), `status-index` (status, createdAt) | type, machineIds, zone, severity, status, riskScore, faultType, variables, createdAt, resolvedAt, downtimeMin, technicianId, etaMin, partsUsed, partsMissing, aiDiagnosis, messages (operador, tecnico, gerente), timeline, isRecurrence, commonCauseId, executionArn, taskToken (interno, nunca se devuelve por la API) |
| `Technicians` | `techId` | `zone-index` | name, specialty\[\], lat, lng, available, activeIncidents, experienceYears |
| `SpareParts` | `partId` y `locationId` | ninguno | name, stock, minStock, unitCost, consumption7d, irregular |
| `PartsConsumption` | `partId` y `ts` | ninguno | qty, machineId, incidentId |
| `CommonCauses` | `groupId` | ninguno | zone, machineIds, windowStart, createdAt, suspectedCause |
| `NotificationsLog` | `notifId` | `incident-index` | incidentId, role, channel, status, createdAt |

**S3:** bucket `arquifusion-backups` con versionado, que guarda los respaldos horarios. No guardamos una lectura por objeto, porque son miles de operaciones sin valor.

**Cómo se calcula la productividad sin escanear:** en cada lectura, `ingest` hace un `UpdateItem` con `ADD` sobre `FleetKPI` (machineId y fecha de hoy): suma 1 a `readings`, suma 1 a `activeReadings` si la máquina trabaja (`status` operativa y `rpm` mayor a 600) y suma los litros a `fuelSum`. La utilización es `activeReadings / readings`.

## 7. Backend y AWS (Keyra)

### 7.1 Responsabilidades

Keyra es dueña de **todo lo que se despliega en AWS**: infraestructura con SAM, tablas, API, Lambdas, EventBridge, Step Functions, SNS, Secrets Manager, IA y respaldo. Como las dos cuentas de Learner Lab son independientes, **todo el backend vive en una sola cuenta AWS (la de Keyra)**. Cath no necesita desplegar en AWS: entrega lógica pura en JavaScript que Keyra conecta, y se encarga de GCP y Azure (secciones 9 y 11).

**Principios:**

- Cada handler es delgado: valida la entrada, llama a una función pura de `logic.js` y responde con `response.js`. La lógica se prueba sin AWS.
- Un microservicio es una Lambda con router interno (`switch` sobre `event.routeKey`) para sus endpoints REST. Solo son Lambdas independientes las que invocan Step Functions, EventBridge, Streams o los schedules.
- Ninguna Lambda guarda secretos en variables de entorno: todo sale de Secrets Manager con caché.
- Una Lambda nunca llama a otra Lambda de forma síncrona, salvo `ingest` que invoca `detect-anomaly` de forma asíncrona.

### 7.2 Estructura de carpetas

```
arquifusion/
├── README.md
├── contracts/                 # JSON de ejemplo de cada contrato (fuente de verdad)
│   ├── telemetry.json  incident.json  event-anomalia.json  notification.json
├── infra/
│   ├── template.yaml          # SAM: tablas, Lambdas, API, EventBridge, SNS, S3, State Machine
│   ├── statemachine.asl.json  # definición del Step Function
│   └── samconfig.toml
├── shared/nodejs/common/      # Lambda Layer compartido
│   ├── db.js                  # clientes DynamoDB y helpers get, put, update, query
│   ├── response.js            # respuesta estándar y CORS
│   ├── auth.js                # validación de x-api-key
│   ├── secrets.js             # lectura de Secrets Manager con caché
│   ├── models.js              # enums, umbrales, FAULT_RULES, PARTS_BY_FAULT
│   ├── stats.js               # mediana, MAD, z-score robusto, regresión, Mahalanobis
│   ├── geo.js                 # distancia Haversine
│   ├── llm.js                 # proveedor intercambiable: bedrock, gemini, rules
│   └── logger.js              # logs en JSON
├── services/
│   ├── ingesta/       ingest.js                logic.js
│   ├── flota/         api.js                   logic.js        # GET /machines, /fleet/productivity, /dashboard/summary
│   ├── analitica/     detectAnomaly.js  api.js logic.js        # incluye causa común y mantenimiento
│   ├── incidentes/    api.js createIncident.js checkRecurrence.js saveTaskToken.js closeIncident.js logic.js
│   ├── tecnicos/      assign.js  api.js        logic.js
│   ├── repuestos/     checkParts.js  api.js    logic.js
│   ├── ia/            generateDiagnosis.js     askManager.js
│   ├── notificaciones/ dispatch.js
│   └── respaldo/      backupSnapshot.js  syncToFirestore.js
├── scripts/           seed.js                  # técnicos, repuestos y máquinas iniciales
├── tests/events/      # un JSON de ejemplo por Lambda
└── docs/
```

El frontend, el simulador y la Azure Function viven en el mismo repositorio, en las carpetas `frontend/`, `simulator/` y `azure/send-notification/` (ver secciones 8, 9 y 10).

### 7.3 Microservicios y Lambdas

| Microservicio | Lambdas | Tablas que usa | Disparador |
| --- | --- | --- | --- |
| ms-ingesta | `ingest` | `Telemetry`, `Machines`, `FleetKPI` | `POST /ingest` |
| ms-flota | `fleet-api` | `Machines`, `FleetKPI` | API Gateway |
| ms-analitica | `detect-anomaly`, `analytics-api` | `Telemetry`, `Machines`, `CommonCauses` | Invocación asíncrona desde `ingest`, API Gateway |
| ms-incidentes | `incidents-api`, `create-incident`, `check-recurrence`, `save-task-token`, `close-incident` y la **State Machine** | `Incidents`, `Machines`, `Technicians` | EventBridge (evento de anomalía) y API Gateway |
| ms-tecnicos | `assign-technician`, `technicians-api` | `Technicians`, `Incidents` | Step Functions y API Gateway |
| ms-repuestos | `check-parts`, `parts-api` | `SpareParts`, `PartsConsumption` | Step Functions y API Gateway |
| ms-ia | `generate-diagnosis`, `ask-manager` | `Incidents`, `Machines` | Step Functions y API Gateway |
| ms-notificaciones | `dispatch-notification` | `NotificationsLog`, `Incidents` | Step Functions |
| respaldo y sync | `backup-snapshot`, `sync-to-firestore` | todas (lectura) | EventBridge cada hora y DynamoDB Streams |

### 7.4 Notas por componente

#### ingest

1. Valida `x-api-key` contra `INGEST_API_KEY` y el esquema de la sección 5.1 (campos presentes y numéricos). Si falla, responde 400.
2. Guarda en `Telemetry` con `expiresAt` igual a `ts` más 2 días.
3. Hace `UpdateItem` sobre `Machines` (estado, ubicación, horas, `last`, `lastReadingAt`). Si la máquina no existe, la crea.
4. Hace `UpdateItem` con `ADD` sobre `FleetKPI` (readings, activeReadings, fuelSum).
5. Invoca `detect-anomaly` con `InvocationType: Event` y responde 202 sin esperar. En el SAM, configura `EventInvokeConfig` con destino `OnFailure` hacia una cola SQS (DLQ).

#### detect-anomaly (el motor principal)

Entrada: `machineId`. Pasos:

1. Consulta las últimas 60 lecturas de `Telemetry` (orden descendente, límite 60). Si hay menos de 15, no calcula y sale (calentamiento).
2. Por cada variable (`temp`, `vibration`, `pressure`, `fuel_lph`), usa las lecturas 2 a 60 como línea base y calcula la **mediana** y el **MAD**.
3. **Z-score robusto** de la lectura actual: `z = 0.6745 * (x - mediana) / MAD`. Si el MAD es 0, usa una desviación mínima razonable por variable para no dividir entre cero.
4. **Puntaje por variable:** `varScore = min(100, abs(z) / 4 * 100)`.
5. **Tendencia:** regresión lineal sobre las últimas 20 lecturas. Si la pendiente acumulada supera el 10 por ciento de la mediana, suma hasta 15 puntos.
6. **Pares del mismo modelo:** con `model-index`, calcula el promedio de la última lectura de las demás máquinas del modelo. Si hay al menos 3 pares y la máquina se desvía más de 2 desviaciones, marca la variable como desvío contra pares. Esto da los problemas 6 y 8.
7. **Combinación (Mahalanobis):** con las 4 variables y la covarianza de las 60 lecturas (con una pequeña constante en la diagonal para que se pueda invertir), calcula D². Si D² supera 13.28 (percentil 99 con 4 grados de libertad), suma hasta 20 puntos. Si la matriz falla, usa el plan simple: 10 puntos por cada variable adicional con z mayor a 2, hasta 30.
8. **Riesgo final:** `riskScore = min(100, 0.6 * max(varScore) + bonoCombinación + bonoTendencia)`. Esta fórmula es un punto de partida: **calíbrenla con el simulador** hasta que la falla estrella de la demo cruce 60 en unos 3 minutos y las máquinas sanas se queden por debajo de 30.
9. **Tipo de falla** (`faultType`) con `FAULT_RULES` de `models.js`: temperatura y vibración altas, `motor`; presión fuera de rango, `hidraulico`; combustible alto sin aumento de carga, `combustible`; rpm inestable, `electrico`; en otro caso, `general`.
10. **Mantenimiento (problema 2):** `hoursToMaint = maintIntervalH - (hours - lastMaintHours) * factorDesgaste`, con `factorDesgaste = 1 + riesgoPromedioReciente / 100`. Se guarda en `Machines`. Menos de 50 horas es próximo; negativo es vencido.
11. **Causa común (problema 11):** consulta `zone-index` por las máquinas de la zona con `riskScore` de 60 o más y `riskUpdatedAt` en los últimos 30 minutos. Si son 3 o más y no hay un `CommonCause` de esa zona en la última hora (escritura condicional con `groupId` igual a zona más hora), crea el registro y publica un evento grupal con `machineIds[]` y `groupId`.
12. **Evento individual:** si `riskScore` es 60 o más y la máquina no tiene `openIncidentId`, publica `AnomaliaDetectada`. La marca de incidente abierto se hace en `create-incident` con una escritura condicional para evitar duplicados si llegan dos eventos casi a la vez.
13. Actualiza `Machines` con riskScore, severity, faultType, hoursToMaint y `riskUpdatedAt`.

#### assign-technician

Entrada: incidente con `faultType`, `severity` y la ubicación de la máquina. Para cada técnico con `available` verdadero:

`score = 0.35 * cercanía + 0.30 * especialidad + 0.20 * bajaCarga + 0.15 * experiencia`

- `cercanía = 1 - min(distanciaKm / 30, 1)` con Haversine.
- `especialidad = 1` si el técnico tiene la especialidad igual a `faultType`, y `0.2` si no.
- `bajaCarga = 1 / (1 + activeIncidents)`.
- `experiencia = min(experienceYears / 10, 1)`.
- `ETA en minutos = distanciaKm / 30 * 60 + 10`.

Devuelve el ganador con su ETA y 2 alternativas. Si no hay técnicos disponibles, elige el de menor carga y marca `sinDisponibles: true`. Actualiza `Technicians` (suma 1 a `activeIncidents`). La lógica pura la entrega Cath en `services/tecnicos/logic.js`.

#### check-parts

Con `PARTS_BY_FAULT` obtiene los repuestos del tipo de falla. Para cada uno, busca el stock en `SpareParts`. Si hay stock, descuenta 1 y registra en `PartsConsumption`. Si no hay o queda bajo `minStock`, lo agrega a `partsMissing` y marca `alertaReposicion`. `parts-api` calcula la demanda de 7 días sumando `PartsConsumption` y marca como irregular el consumo mayor a la media más 2 desviaciones (reusa `stats.js`). La lógica pura la entrega Cath en `services/repuestos/logic.js`.

#### generate-diagnosis e `llm.js`

- `llm.js` expone una sola función `generateJSON(system, user)` que lee `LLM_PROVIDER` (`bedrock`, `gemini` o `rules`).
- **Bedrock:** API Converse con `amazon.nova-lite-v1:0` (o su perfil de inferencia `us.amazon.nova-lite-v1:0`) en us-east-1, con `maxTokens` cercano a 700 y temperatura baja. Pruébenlo primero con Nova Lite.
- **Gemini:** llamada HTTPS con `GEMINI_API_KEY`.
- **Reglas:** plantillas por `faultType` que llenan los mismos campos. Es el plan B final y también el destino del `Catch` del Step Function.
- **Entrada al LLM:** modelo, zona, `faultType`, variables desviadas con su valor y su línea base, `riskScore`, reincidencia y las últimas 3 intervenciones de la máquina.
- **Salida obligatoria:** solo JSON con las claves `diagnostico_probable`, `acciones_recomendadas` (lista), `repuestos_sugeridos` (lista), `mensaje_operador` (máximo 2 líneas), `mensaje_tecnico` (diagnóstico, repuestos y ubicación) y `mensaje_gerente` (impacto y urgencia). El código quita posibles bloques de markdown y usa `try/catch`; si el JSON no es válido, usa reglas.
- Los tres mensajes se guardan en `Incidents.messages`. Una sola llamada alimenta a los 3 roles.
- `ask-manager` (opcional): arma un resumen compacto (10 máquinas de mayor riesgo y los incidentes abiertos) y lo envía al LLM junto con la pregunta del gerente.

#### dispatch-notification

Entrada: `incidentId` y `role`. Lee el mensaje del rol desde `Incidents.messages`, publica en el topic SNS de ese rol (`SNS_TOPIC_OPERADOR`, `SNS_TOPIC_TECNICO`, `SNS_TOPIC_GERENTE`), llama por HTTPS a la Azure Function con la clave guardada en Secrets Manager y escribe en `NotificationsLog`. **Un fallo de Azure no debe tumbar el flujo:** se captura dentro de la Lambda y se registra con estado `fallido`.

#### sync-to-firestore

Se activa con los Streams de `Machines` e `Incidents`. Compara `OldImage` y `NewImage` y solo escribe si cambió `status`, `severity`, `openIncidentId`, el decil del `riskScore` o el `status` del incidente. Escribe en estas colecciones de Firestore:

| Colección | Documento | Campos |
| --- | --- | --- |
| `machines` | `machineId` | status, severity, riskScore, lat, lng, zone, model, hoursToMaint, openIncidentId, updatedAt |
| `incidents` | `incidentId` | resumen: machineIds, severity, status, faultType, technicianId, createdAt |
| `alerts` | identificador automático | incidentId, machineIds, severity, mensajes por rol, createdAt (se crea cuando se inserta un incidente) |

#### incidents-api

- `GET /incidents` con filtros por `status` y `severity`, usando `status-index`.
- `GET /incidents/{id}` devuelve el incidente completo **sin** `taskToken`.
- `GET /machines/{id}/incidents` usa `machine-index`.
- `POST /incidents/{id}/resolve` lee el `taskToken` de la tabla y llama `SendTaskSuccess`. Responde 409 si ya estaba resuelto.
- `PATCH /incidents/{id}/assign` con el `techId`: libera al anterior, asigna al nuevo, agrega un evento a la línea de tiempo y notifica.
- `GET /incidents/{id}/suggestions` devuelve los 3 mejores técnicos con su puntaje y ETA.

**Línea de tiempo (`timeline`):** lista de eventos con `ts`, `type` y `text`. Tipos: `creado`, `diagnostico`, `tecnico_asignado`, `repuestos`, `notificado`, `reasignado`, `resuelto`, `error`.

### 7.5 Step Function (ms-incidentes)

**Tipo: Standard**, porque espera la resolución del técnico. Rol: `LabRole`.

| # | Estado | Tipo | Detalle |
| --- | --- | --- | --- |
| 1 | CreateIncident | Task (Lambda) | Crea el incidente y marca `openIncidentId` con escritura condicional |
| 2 | CheckRecurrence | Task (Lambda) | Busca en 30 días una falla similar de la misma máquina |
| 3 | GenerateDiagnosis | Task (Lambda) | `Retry` 2 veces con espera creciente. `Catch` va a RulesDiagnosis |
| 3b | RulesDiagnosis | Task (Lambda) | La misma Lambda con proveedor `rules` |
| 4 | Parallel: AssignAndParts | Parallel | Rama A: `assign-technician`. Rama B: `check-parts` |
| 5 | Parallel: NotifyRoles | Parallel | Tres ramas: operador, técnico y gerente. La del gerente va detrás de un `Choice` y solo corre si la severidad es alta o crítica |
| 6 | UpdateIncident | Task (Lambda) | Estado `en_atencion` y máquina a `requiere_intervencion` |
| 7 | WaitForResolution | Task con `waitForTaskToken` | `save-task-token` guarda el token en `Incidents`. `TimeoutSeconds` de 86400 |
| 8 | CloseIncident | Task (Lambda) | Calcula `downtimeMin`, libera al técnico, devuelve la máquina a `operativa`, limpia `openIncidentId` y marca `resuelto` |
| E | Catch global | Task + Fail | `NotifyError`, marca el incidente `error_flujo` |

Si la prueba 3 de la sección 13 falla con `waitForTaskToken`, se reemplaza el paso 7 por un estado `Wait` y un endpoint de cierre manual, sin cambiar el resto.

**Regla de EventBridge:** bus `arquifusion`, `source` igual a `arquifusion.analitica` y `detail-type` igual a `AnomaliaDetectada`. Target: la State Machine, con `RoleArn` de `LabRole`, pasando `detail` como entrada.

### 7.6 Notas del SAM

- `Globals.Function`: `Runtime: nodejs20.x`, `Role` con el ARN de `LabRole`, `Timeout` de 15 segundos (30 para `generate-diagnosis`), `MemorySize` de 256 (512 para `detect-anomaly`).
- Compilar con esbuild (`Metadata: BuildMethod: esbuild`) y marcar como externos los paquetes `@aws-sdk/*`, que ya vienen en el runtime. La única dependencia real es `firebase-admin` en `sync-to-firestore`.
- **Tablas:** `BillingMode: PAY_PER_REQUEST`, `PointInTimeRecoverySpecification` activado, y `StreamSpecification` con `NEW_AND_OLD_IMAGES` en `Machines` e `Incidents`. TTL sobre `expiresAt` en `Telemetry`.
- **API Gateway:** HTTP API con CORS abierto para el origen del front y los headers `x-api-key` y `content-type`.
- **Cola DLQ en SQS** como destino de fallos de `detect-anomaly`.
- **3 topics SNS** (operador, técnico, gerente). Suscriban los emails y **confirmen las suscripciones desde la bandeja** antes de probar.
- **S3** con versionado.
- **Secrets Manager:** el secreto `arquifusion/global` se crea a mano en la consola y **nunca** se guarda en el repositorio.
- **Schedule:** una regla cada hora para `backup-snapshot`.
- La State Machine se define con `DefinitionUri` y `DefinitionSubstitutions` para los ARN de las Lambdas.

### 7.7 Orden de implementación sugerido

1. Hola mundo con `sam deploy` usando `LabRole` (prueba 1 de la sección 13).
2. Tablas, Layer base (`db`, `response`, `auth`, `secrets`, `models`) y secreto.
3. `ingest` y `scripts/seed.js`. Probar con el simulador de Cath.
4. `stats.js` y `detect-anomaly`. Calibrar el riesgo con el simulador.
5. Step Function v1: CreateIncident, UpdateIncident y notificación simple.
6. Integrar `assign-technician` y `check-parts` (lógica de Cath).
7. `llm.js` y `generate-diagnosis` con Retry y Catch.
8. `dispatch-notification` con SNS y la Azure Function de Cath.
9. Routers de API (`fleet-api`, `incidents-api`, `technicians-api`, `parts-api`, `analytics-api`).
10. `waitForTaskToken` y `POST /resolve`.
11. Streams y `sync-to-firestore`.
12. Causa común, mantenimiento y productividad.
13. `backup-snapshot` y la réplica en Azure Blob.
14. Alarmas de CloudWatch y revisión de la DLQ.

### 7.8 Pruebas

- Pruebas unitarias de `logic.js` y `stats.js` con el ejecutor integrado de Node (`node --test`), sin dependencias extra.
- Un JSON de ejemplo por Lambda en `tests/events/`, para probar con `sam local invoke` o desde la consola.
- Prueba de humo del flujo completo: simulador en modo `falla_motor`, ver el incidente creado, ver la ejecución del Step Function, resolver, ver el cierre.

## 8. Frontend (Cath)

### 8.1 Responsabilidades

Cath es dueña de la aplicación web, de Firebase (GCP), de la Azure Function y del respaldo en Blob. Además entrega la lógica pura de tres módulos del backend (`tecnicos`, `repuestos` y `flota`) y el simulador. El frontend **no espera al backend**: se construye primero con datos mock que respetan los contratos de la sección 5.

### 8.2 Stack

React con Vite, React Router, TanStack Query (con `refetchInterval` como plan B si el tiempo real falla), Tailwind CSS, Leaflet con react-leaflet (mapa gratis y sin clave), Recharts para gráficos, Firebase SDK (Auth y Firestore), Axios y Firebase Hosting.

### 8.3 Estructura de carpetas

```
frontend/
├── .env.example               # VITE_API_URL, VITE_API_KEY, VITE_USE_MOCK, VITE_FIREBASE_*
├── index.html  vite.config.js  tailwind.config.js  firebase.json
└── src/
    ├── main.jsx  App.jsx  routes.jsx
    ├── config/        env.js  firebase.js
    ├── mocks/         machines.json  incidents.json  technicians.json  parts.json  productivity.json
    ├── services/      api.js            # axios con x-api-key; si VITE_USE_MOCK es true, lee de mocks/
    │                  machines.js  incidents.js  technicians.js  parts.js  analytics.js  ai.js
    ├── context/       AuthContext.jsx   # usuario de Firebase y rol (lee users/{uid}.role)
    ├── hooks/         useMachines  useIncidents  useRealtimeMachines  useRealtimeAlerts
    ├── components/    Layout  ProtectedRoute  MapView  MachineMarker  MachineCard  RiskBadge
    │                  SeverityBadge  StatCard  IncidentList  IncidentDetail  TechnicianPicker
    │                  IncidentTimeline  AlertToast  CommonCauseBanner  AskAI
    └── pages/
        ├── Login.jsx
        ├── Manager.jsx          # vista principal del gerente (ver 8.5)
        ├── FleetMap.jsx         # mapa a pantalla completa (operador)
        ├── MachineDetail.jsx    # lecturas, riesgo, mantenimiento, historial
        ├── Incidents.jsx        # lista y detalle con diagnóstico de IA
        ├── MyTasks.jsx          # técnico: sus incidentes y botón Resolver
        ├── Parts.jsx            # stock, demanda, irregulares
        ├── Productivity.jsx     # ranking de utilización
        └── CommonCauses.jsx
```

### 8.4 Pantallas por rol

| Rol | Entra a | Ve |
| --- | --- | --- |
| `operador` | FleetMap | Mapa y estado de sus máquinas, alertas simples |
| `tecnico` | MyTasks | Sus incidentes asignados, detalle de máquina, repuestos y botón **Resolver** |
| `gerente` | Manager | Todo, más KPIs, productividad, repuestos, causas comunes y asistente de IA |

### 8.5 Vista del gerente (referencia: el panel de emergencias en vivo de Bomberos)

No pudimos abrir la página de referencia desde el equipo de trabajo (bloquea accesos automatizados). Si tienen una captura, súbanla al proyecto y se ajusta. Mientras tanto, este es el diseño propuesto, que resuelve visualizar el estado y asignar técnico en una sola pantalla:

```
┌────────────────────────────────────────────────────────────────┐
│ KPIs: Operativas | Detenidas | Requieren intervención | Riesgo │
├───────────────┬──────────────────────────────┬─────────────────┤
│ INCIDENTES    │      MAPA (Leaflet)          │ DETALLE         │
│ EN VIVO       │  marcador por estado         │ Máquina y riesgo│
│ filtros:      │  banner de causa común       │ Diagnóstico IA  │
│ estado y      │                              │ Repuestos       │
│ severidad     │                              │ Técnico asignado│
│ tiempo        │                              │ [Reasignar]     │
│ transcurrido  │                              │ top 3 con ETA   │
└───────────────┴──────────────────────────────┴─────────────────┘
```

Al hacer clic en un incidente, el mapa centra la máquina y el panel derecho muestra el técnico asignado y las alternativas de `GET /incidents/{id}/suggestions`. El botón de reasignar llama `PATCH /incidents/{id}/assign`.

**Colores de estado:** operativa, verde; detenida, gris; requiere intervención, rojo; mantenimiento, azul. **Severidad:** media, amarillo; alta, naranja; crítica, rojo oscuro.

### 8.6 Tiempo real y datos

- El mapa y los avisos escuchan Firestore con `onSnapshot`: colección `machines` para marcadores, y `alerts` para los toasts, filtrando el mensaje según el rol.
- Las listas y los detalles usan la API REST con TanStack Query, con `refetchInterval` de 5 a 10 segundos como respaldo.
- Cada llamada REST lleva el header `x-api-key` con `VITE_API_KEY`.
- El idioma de la interfaz es español. La vista del técnico debe verse bien en el celular.

### 8.7 Autenticación y roles

Firebase Auth con correo y contraseña. El rol se guarda en el documento `users/{uid}` de Firestore (campo `role`) y `AuthContext` lo lee al iniciar sesión. Creen 3 usuarios demo (uno por rol) con la consola de Firebase, para no depender de scripts con el SDK de administrador. `ProtectedRoute` redirige según el rol.

### 8.8 Orden de implementación sugerido

1. Proyecto Vite, Tailwind, Router y Layout. Mocks a partir de `contracts/`.
2. Firebase: Auth, Hosting y Firestore. Login con roles.
3. `MapView` con marcadores por estado (mock) y `StatCard` de KPIs.
4. `Manager.jsx` con lista de incidentes, detalle y panel de técnico.
5. `MachineDetail` con riesgo e historial (`IncidentTimeline`).
6. `MyTasks` con el botón **Resolver**.
7. Conectar al backend real cuando Keyra tenga la API (cambiar `VITE_USE_MOCK` a false).
8. Listeners de Firestore y toasts por rol.
9. `Parts`, `Productivity` y `CommonCauses`.
10. `AskAI` (opcional) y despliegue final en Firebase Hosting.

## 9. GCP (Firebase) y Azure (Cath)

### 9.1 Firebase

- Proyecto en el plan gratuito **Spark**. Activar Hosting, Authentication (correo y contraseña) y Firestore en modo producción.
- **Reglas de Firestore:** lectura solo para usuarios autenticados; sin escrituras desde el cliente, salvo que cada usuario pueda escribir su propio documento `users/{uid}` sin cambiar el campo `role`.
- **Cuenta de servicio:** en la consola de Firebase, generar una clave privada (JSON). **Se entrega a Keyra por un canal privado, nunca al repositorio**, y Keyra la guarda en Secrets Manager como `FIREBASE_SERVICE_ACCOUNT`.
- **Cuota:** la capa gratuita limita las escrituras diarias de Firestore. Por eso el backend solo sincroniza cambios de estado, riesgo e incidentes.
- Despliegue: `firebase deploy --only hosting` desde `frontend/` después de `npm run build`.

### 9.2 Azure: Function de notificaciones

Creación: una cuenta de Azure for Students (100 dólares de crédito, sin tarjeta, con correo académico). Un Function App con runtime Node 20 en plan Consumption o Flex Consumption, ambos con cuota gratuita mensual de ejecuciones. **Desactiven Application Insights** o configuren muestreo, porque puede generar costos.

**Función `send-notification`:** HTTP trigger con nivel de autorización `function` (se llama con el header `x-functions-key`).

| Entrada (POST, JSON) | Descripción |
| --- | --- |
| `incidentId` | Identificador del incidente |
| `role` | `operador`, `tecnico` o `gerente` |
| `severity` | Severidad del incidente |
| `machineId` | Máquina afectada |
| `title` | Título corto |
| `message` | Mensaje ya adaptado al rol |

**Respuesta:** `{ ok: true, channel, deliveredAt }`.

**Qué hace (por niveles):**

1. **MVP:** valida la clave, arma el payload según el rol (el operador recibe una alerta de 2 líneas, el técnico el diagnóstico con repuestos y ubicación, el gerente impacto y urgencia), lo registra y guarda una copia JSON en un contenedor `notificaciones` del Blob. Con esto la nube Azure ya cumple una función real y demostrable.
2. **Extra:** enviar un push web con Firebase Cloud Messaging usando `firebase-admin` y los tokens guardados en `users/{uid}.fcmToken` (requiere un service worker en el front, unas 1.5 horas adicionales).

Los toasts en tiempo real por Firestore ya funcionan como push dentro de la app, así que el extra de FCM es opcional.

### 9.3 Azure: respaldo en Blob

En la misma cuenta de almacenamiento, crear un contenedor `arquifusion-backup` y generar una **SAS URL** con permisos de escritura y creación, con expiración posterior al 20 de noviembre. Se entrega a Keyra por canal privado (`AZURE_BLOB_SAS_URL`). `backup-snapshot` hace un `PUT` con el header `x-ms-blob-type: BlockBlob` y no necesita SDK de Azure.

### 9.4 Qué recibe Keyra de Cath

`AZURE_FUNCTION_URL`, `AZURE_FUNCTION_KEY`, `AZURE_BLOB_SAS_URL` y `FIREBASE_SERVICE_ACCOUNT`. Todo va al secreto `arquifusion/global`.

## 10. Simulador y datos semilla

### 10.1 Simulador (Cath, carpeta `simulator/`)

Script de Node que se ejecuta desde la laptop: `node simulator.js --machines 15 --interval 10 --scenario normal`.

- **Flota:** 15 máquinas en `fleet.json`, repartidas en 3 zonas con modelos `EX-320` (excavadora), `CT-740` (camión) y `CG-210` (cargador). Cada máquina tiene su posición base y se mueve con pequeñas variaciones.
- **Zonas (centro aproximado):** ZONA-NORTE (-11.98, -77.05), ZONA-SUR (-12.12, -77.03), ZONA-ESTE (-12.05, -76.95).
- **Línea base por modelo (valor medio):**

| Variable | EX-320 | CT-740 | CG-210 |
| --- | --- | --- | --- |
| temp (grados C) | 85 | 88 | 82 |
| vibration (mm/s) | 3.5 | 4.0 | 3.0 |
| pressure (bar) | 180 | 160 | 170 |
| fuel\_lph | 28 | 55 | 22 |
| rpm | 1800 | 1900 | 1700 |
| load\_kg | 9000 | 40000 | 6000 |
| speed\_kmh | 6 | 25 | 10 |

Cada lectura es la media más ruido gaussiano pequeño (por ejemplo 3 por ciento).

- **Escenarios** (`scenarios.json`):
  - `normal`: todas sanas.
  - `falla_motor`: la máquina estrella EXC-014 deriva de forma progresiva: temperatura +0.8 por minuto, vibración +0.12 por minuto y combustible +0.15 por minuto, sin cambio de carga.
  - `falla_zona_norte`: tres máquinas de ZONA-NORTE derivan a la vez (para la causa común).
  - `falla_hidraulica`: la presión baja de forma progresiva (para variar la demo).
- **Aceleración:** la opción `--speed 5` multiplica la deriva para que el incidente aparezca en 3 a 4 minutos en la demo.
- **Costo:** use un intervalo de 10 a 30 segundos y córranlo solo durante pruebas y demo.
- El simulador lee `INGEST_API_KEY` y `API_URL` de un archivo `.env` que no se sube al repositorio.

### 10.2 Datos semilla (Keyra, `scripts/seed.js`)

| Datos | Contenido |
| --- | --- |
| `Technicians` | 6 técnicos con coordenadas en las 3 zonas, especialidades (`motor`, `hidraulico`, `combustible`, `electrico`) y años de experiencia distintos. Uno ocupado para que la asignación tenga sentido |
| `SpareParts` | Repuestos de `PARTS_BY_FAULT` con stock variado. Dejen 2 con stock bajo `minStock` para mostrar la alerta de reposición |
| `Machines` | Las 15 máquinas con `lastMaintHours` y `maintIntervalH`. Dejen una cerca de su mantenimiento para mostrar el problema 2 |
| `PartsConsumption` | Unos 30 registros de los últimos 7 días, con un repuesto de consumo irregular |

**Repuestos por tipo de falla (`PARTS_BY_FAULT`):**

| faultType | Repuestos |
| --- | --- |
| `motor` | filtro de aceite, rodamiento de motor, sensor de temperatura |
| `hidraulico` | manguera hidráulica, sello hidráulico, bomba hidráulica |
| `combustible` | inyector, filtro de combustible |
| `electrico` | sensor de rpm, alternador |
| `general` | kit de inspección |

## 11. Reparto de trabajo e interfaces

### 11.1 División

Se mantiene la idea inicial (Keyra backend, Cath frontend) con dos ajustes: **la ingesta y la base de AWS no van después, van en el primer bloque**, porque desbloquean a las dos; y Cath toma GCP, Azure, el simulador y la lógica pura de tres módulos para equilibrar la carga, ya que el backend completo vive en una sola cuenta AWS.

|  | **Keyra** | **Cath** |
| --- | --- | --- |
| AWS | Todo: SAM, tablas, API, EventBridge, Step Functions, SNS, S3, Secrets Manager, seed | Nada que desplegar |
| Servicios | ingesta, analítica, incidentes (Step Functions), IA, notificaciones, respaldo, sync, routers de API, repuestos (conexión) | Lógica pura de `tecnicos`, `repuestos` y `flota` (`logic.js` con pruebas) |
| GCP | Escribe en Firestore desde `sync-to-firestore` | Firebase Hosting, Auth, Firestore, reglas |
| Azure | Llama a la Function y copia el respaldo | Function `send-notification`, Blob y SAS URL |
| Datos | `seed.js` | Simulador y escenarios |
| Front | Ninguno | Toda la aplicación |
| Entregables | Diagrama de arquitectura, definición del Step Function | Guion de demo, material visual del pitch |

### 11.2 Qué se entregan entre ellas

| De | Para | Qué | Cuándo |
| --- | --- | --- | --- |
| Las dos | Las dos | Contratos de la sección 5 en `contracts/` | Bloque 0 (hoy) |
| Cath | Keyra | Simulador funcionando | Hoy por la noche |
| Keyra | Cath | URL de la API, `FRONT_API_KEY` y la clave de ingesta | Cuando exista `POST /ingest` |
| Cath | Keyra | `AZURE_FUNCTION_URL`, `AZURE_FUNCTION_KEY`, SAS URL y cuenta de servicio de Firebase | Antes de integrar notificaciones |
| Cath | Keyra | `logic.js` de `tecnicos` y `repuestos`, con pruebas | Domingo por la mañana |
| Keyra | Cath | Datos reales en la API (para dejar los mocks) | Domingo al mediodía |

### 11.3 Reglas de trabajo

- Repositorio de GitHub con ramas `backend/*` y `frontend/*`. Se integra a `main` con pull requests cortos y frecuentes.
- **Nunca** suban claves, el archivo `.env`, la cuenta de servicio de Firebase ni la SAS URL. Se comparten por un canal privado.
- Si cambia un contrato, se edita la sección 5 de este documento **y** `contracts/`, y se avisa a la otra persona.
- Una función está terminada cuando: tiene prueba (unitaria o evento de ejemplo), está desplegada y se vio funcionando de punta a punta.
- Puntos de sincronización de 10 minutos a las 8:00 am, 1:00 pm y 5:00 pm del domingo.
- Si Cath va atrasada a la 1:00 pm, Keyra toma `sync-to-firestore`. Si Keyra va atrasada, Cath toma la Azure Function y el diagrama.

## 12. Cronograma hasta el domingo 9:00 pm

Ajusten las horas a la hora real en que empiecen.

| Bloque | Keyra | Cath |
| --- | --- | --- |
| **Hoy, 1 hora juntas** | Verificaciones de la sección 13, repositorio, contratos en `contracts/` | Igual |
| **Hoy por la noche** | SAM base con `LabRole`, tablas, Layer base, secreto, `ingest`, `seed.js` | Simulador con escenarios, proyecto Vite y Firebase Auth, mocks |
| **Domingo 8 a 13 h** | `stats.js`, `detect-anomaly` y calibración, Step Function v1, `llm.js` y `generate-diagnosis` | Mapa, vista Gerente, lista y detalle de incidentes, `logic.js` de técnicos y repuestos |
| **Domingo 13 a 17 h** | `waitForTaskToken`, notificaciones con SNS y Azure, routers de API, `sync-to-firestore`, `backup-snapshot` | Conexión a la API real, listeners y toasts, historial, `MyTasks`, Azure Function y Blob |
| **Domingo 17 a 18 h** | Integración de punta a punta. **Congelar código a las 18:00** | Igual |
| **Domingo 18 a 21 h** | Diagrama final, ensayo del pitch con cronómetro, video de respaldo. **Entregar a más tardar a las 20:00** | Igual |

## 13. Verificaciones iniciales y plan B

Háganlas hoy, en los primeros 30 a 60 minutos. Cada una indica qué hacer si falla.

| # | Prueba | Si falla (plan B) |
| --- | --- | --- |
| 1 | `sam deploy` de una Lambda hola mundo con `Role` igual a `LabRole` | Desplegar con la consola o con AWS CLI y un script |
| 2 | **Bedrock:** invocar `amazon.nova-lite-v1:0` con la API Converse desde una Lambda en us-east-1. No se pudo confirmar de antemano si el rol del laboratorio lo permite | Cambiar `LLM_PROVIDER` a `gemini` (clave gratuita de Google AI Studio). Último recurso: `rules` |
| 3 | Step Functions: un workflow con un Task y `waitForTaskToken`, y completarlo con `SendTaskSuccess` | Reemplazar la espera por un estado `Wait` y un endpoint de cierre manual |
| 4 | SNS: crear 3 topics, suscribir emails y confirmar las suscripciones desde la bandeja | No usar SMS. Si SNS falla, enviar solo por la Azure Function |
| 5 | DynamoDB Streams a Lambda | Invocar `sync-to-firestore` directamente desde el Step Function |
| 6 | Azure: crear la Function HTTP y llamarla con curl | Cuenta gratuita normal de Azure |
| 7 | Firebase (plan Spark): Hosting, Auth y Firestore | — |
| 8 | Reiniciar el laboratorio y comprobar que Lambdas, tablas y API siguen respondiendo | Documentarlo y tener el video de respaldo |

## 14. Riesgos

| Riesgo | Efecto | Mitigación |
| --- | --- | --- |
| El rol del laboratorio no permite Bedrock | Sin IA generativa | `llm.js` intercambiable y reglas como último recurso |
| `waitForTaskToken` falla | Flujo no se cierra | Plan B de la sección 13 |
| La sesión del laboratorio se reinicia durante la demo | Pérdida de tiempo | Video de respaldo y comprobación a las 18:00 |
| Costo de Firestore, Azure o Bedrock | Gastos o bloqueo de cuota | Sincronizar solo cambios, desactivar Application Insights, mensajes de IA cortos |
| El riesgo no cruza el umbral en la demo | Demo sin incidentes | Calibrar con el simulador y usar `--speed` |
| Sobrealcance | Entregar a medias | Orden de recorte de la sección 2.1 |
| Dos cuentas AWS separadas | Despliegue bloqueado | Todo el backend en la cuenta de Keyra, como se definió |

## 15. Pitch y rúbrica

### 15.1 Guion de 5 minutos

| Tiempo | Contenido |
| --- | --- |
| 0:00 a 0:45 | El dolor: una máquina parada frena toda la cadena. Tres frases del contexto de ArquiFusion |
| 0:45 a 1:30 | La solución en una frase y la tabla problema a módulo (9 problemas) |
| 1:30 a 3:30 | **Demo en vivo:** el simulador inyecta la falla, aparece el riesgo en el mapa, se crea el incidente, el diagnóstico de IA, el técnico asignado, la notificación por rol, la reasignación del gerente y el botón Resolver |
| 3:30 a 4:30 | Arquitectura: 3 nubes con función real, Step Functions, 100% serverless, IA en dos niveles, costos |
| 4:30 a 5:00 | Escalabilidad a miles de máquinas, roadmap (patrones previos a fallas, Isolation Forest con más datos) y cierre |

### 15.2 Lista antes de la demo

- Laboratorio AWS iniciado y API respondiendo. Emails de SNS confirmados.
- Simulador listo con el escenario `falla_motor` y `--speed` calibrado.
- Consola de Step Functions abierta en una pestaña.
- Front con la sesión del gerente abierta y otra sesión de técnico en el celular.
- Video de respaldo de la demo completa en el escritorio.

### 15.3 Cómo contarlo de forma honesta

- Digan **detección estadística multivariable**, no Isolation Forest.
- Digan que la telemetría es simulada, y que la arquitectura está lista para miles de máquinas por ser serverless y por usar DynamoDB on-demand.
- Marquen como roadmap lo que no esté implementado (problemas 12, patrones previos a fallas).

## 16. Decisiones pendientes

| # | Pendiente | Responsable |
| --- | --- | --- |
| 1 | Confirmar que usan **una sola cuenta AWS** (la de Keyra) para todo el backend | Las dos |
| 2 | Resultados de las verificaciones 1, 2 y 3 de la sección 13 | Keyra |
| 3 | Captura de la página de referencia de Bomberos, para ajustar la vista Gerente | Las dos |
| 4 | Nombre final del proyecto (ahora, ArquiGuard) | Las dos |
| 5 | Si harán el extra de push web con FCM (1.5 horas) | Cath |
| 6 | Correos que recibirán las notificaciones de SNS durante la demo | Las dos |
| 7 | Confirmar el modelo de IA que funcionó (Nova Lite, Gemini o reglas) | Keyra |
