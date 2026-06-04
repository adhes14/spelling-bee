# Product Requirement Document (PRD)

## 1. Executive Summary & Objective

El objetivo de este producto es desarrollar una Progressive Web App (PWA) *mobile-first* enfocada en el aprendizaje y práctica de la ortografía en inglés (*spelling*) para niños. A través de una experiencia gamificada y un enfoque fonético puro (sin soporte de imágenes), la aplicación operará de manera 100% local y offline, permitiendo además a padres y profesores expandir el catálogo de palabras con una clasificación inteligente automática en el dispositivo.

---

## 2. Core Game Loop & Experience Design

El sistema se basa en un enfoque de **andamiaje decreciente** y un entorno **Sandbox** (sin penalizaciones destructivas como el *Game Over* o pérdida de vidas) para mitigar la frustración infantil. Cada categoría de palabras cuenta con tres subniveles de dificultad que el usuario puede elegir libremente.

### 2.1 Subniveles de Dificultad por Palabra

| Subnivel | Nombre | Mecánica Táctil | Entrada de Datos | Lógica de Guía (Andamiaje) |
| --- | --- | --- | --- | --- |
| **Subnivel 1** | Fácil | *Drag and Drop* (Arrastrar) | Bloques flotantes de letras en pantalla | Muestra espacios vacíos exactos (`_ _ _`). Solo se proveen las letras exactas que componen la palabra de forma revuelta. Las letras incorrectas rebotan si se intentan colocar en una casilla equivocada. |
| **Subnivel 2** | Medio | *Drag and Drop* (Arrastrar) | Bloques flotantes de letras + Distractores | Muestra espacios vacíos exactos. Se proveen las letras de la palabra mezcladas con letras distractoras aleatorias para elevar el reto de discriminación auditiva. |
| **Subnivel 3** | Avanzado | *Tap* (Presionar) | Teclado Virtual Completo en pantalla | No hay pistas de letras. La pantalla solo muestra una línea base. El niño debe escribir libremente la palabra escuchada utilizando el teclado personalizado de la app. |

### 2.2 Sistema de Recompensas y Gamificación

* **Álbum de Estampitas Evolutivas:** El incentivo principal es coleccionar estampitas virtuales por cada palabra o categoría completada.
* **Medallas de Calidad (Estrellas):**
* Completar un subnivel sin errores otorga **3 Estrellas** y la **Estampita de Oro**.
* Completar con 1-2 errores otorga **2 Estrellas** y la **Estampita de Plata**.
* Completar con más errores otorga **1 Estrella** y la **Estampita de Bronce**.


* **Rejugabilidad:** El niño siempre es recompensado con la versión de bronce/plata por terminar, lo que desbloquea el coleccionable pero lo incentiva a rejugar el nivel para "evolucionar" su estampita a Oro.

---

## 3. Technical Architecture & Data Strategy

La aplicación está diseñada bajo la premisa de **Cero Servidor (Serverless Client-Side MVP)** para el despliegue del juego, priorizando la privacidad infantil, la velocidad y la autonomía offline total.

### 3.1 Infraestructura de Almacenamiento Local

* **Cache Storage API (Service Worker):** Almacena el núcleo de la aplicación (HTML, CSS, JS), los componentes de la interfaz de usuario, los sonidos de sistema (éxito, error sutil) y los 26 archivos de audio pregrabados correspondientes a los nombres de las letras del alfabeto inglés.
* **IndexedDB:** Base de datos relacional local que guardará:
1. El estado del juego (Progreso, estrellas obtenidas, estampitas desbloqueadas).
2. El diccionario de palabras nativas y personalizadas.
3. Los archivos de audio dinámicos en formato binario (`Blobs`).


* **Persistencia de Datos:** Invocación explícita de `navigator.storage.persist()` durante el ciclo de inicialización para evitar que los sistemas operativos móviles purguen la `IndexedDB` por inactividad.

### 3.2 Manejo de Audio y Teclado UI

* **Feedback del Teclado:** El teclado en pantalla personalizado reproducirá el sonido del nombre de la letra en inglés de manera tradicional (ej. presionar la tecla 'A' reproduce el audio corto `/ei/`) utilizando el banco de 26 audios fijos del caché.
* **Teclado Custom vs Nativo:** Se prohíbe el uso del teclado nativo del sistema operativo en el Subnivel 3 para neutralizar los motores de autocorrección y texto predictivo que arruinarían la mecánica de evaluación.

---

## 4. User Roles & Management (Zona de Padres)

La aplicación arranca por defecto en **Modo Invitado**, permitiendo al niño jugar inmediatamente. No existen flujos de inicio de sesión ni contraseñas.

### 4.1 Acceso Seguro a la Configuración

* Un botón discreto en la UI principal da acceso a la "Zona de Padres/Profesores".
* El acceso está protegido por una barrera de seguridad analógica para niños pequeños (Gating Parental mediante un reto aritmético aleatorio en formato de texto, ej: *"Nueve por siete es igual a..."*).

### 4.2 Carga de Palabras y Clasificación Inteligente Local

Al ingresar en la Zona de Padres, el usuario administrador cuenta con un campo de texto abierto para añadir palabras nuevas (individuales o separadas por comas). Al procesarlas, ocurre el siguiente flujo técnico:

```
[Ingreso de Palabra] 
       │
       ▼
[Conexión Activa?] ──(No)──► Bloquear Carga (Requiere Internet Temporal)
       │ (Sí)
       ▼
[Petición HTTP a API TTS Externa (ej. Google Cloud TTS)] 
       │
       ▼
[Descarga de Audio de Alta Calidad] ──► Conversión a Blob ──► Guardado en IndexedDB
       │
       ▼
[Ejecución de Algoritmo de Clasificación Local (RegEx)]
       ├─► Cuenta longitud de caracteres.
       └─► Escanea patrones complejos (th, ch, sh, ph, gh, kn-, -gh, ou, ea, ie).
       │
       ▼
[UI: Muestra Sugerencia de Dificultad al Padre]
       │
       ├─► Opción A: El padre acepta la clasificación automática.
       └─► Opción B: El padre anula el algoritmo con un selector manual (Fácil/Medio/Difícil).
       │
       ▼
[Guardado Final en la Base de Datos Local del Dispositivo]

```

---

## 5. PWA Deployment & Mobile-First Requirements

* **Web App Manifest:** Configuración de visualización en modo `standalone` con orientación vertical bloqueada (`portrait`) para emular una aplicación nativa. Ocultamiento total de la barra de navegación URL del navegador.
* **Estrategia de Service Worker:** Implementación de una estrategia de almacenamiento en caché de tipo *Cache-First* para asegurar que la aplicación cargue de manera instantánea en aperturas subsecuentes, independientemente de la calidad de la red de datos del usuario móvil.

---

# Plan de implementación por Fases

## Fase 1: El Corazón del Juego (Core Frontend & Teclado)

*Objetivo: Tener un prototipo web funcional donde se pueda escuchar una palabra y deletrearla con el teclado personalizado, sin persistencia ni instalabilidad aún.*

* **Paso 1.1: Diseño de Interfaz Básica (Layout Mobile-First):** Crear la estructura visual adaptada a pantallas móviles (lienzo de juego superior y área de controles inferior).
* **Paso 1.2: Desarrollo del Teclado Virtual Personalizado:** Programar el componente del teclado en pantalla. Vincular las teclas para que, al tocarlas, reproduzcan el sonido de la letra (usando temporalmente los 26 archivos de audio locales en formato `.mp3`/`.webm`).
* **Paso 1.3: Lógica de los 3 Subniveles de Juego:**
* *Subnivel 1:* Programar el sistema de arrastrar (*Drag and Drop* nativo de HTML5 o una librería ligera como *SortableJS*) con el validador que hace rebotar las letras incorrectas.
* *Subnivel 2:* Añadir la lógica para inyectar letras distractoras aleatorias en el set flotante.
* *Subnivel 3:* Conectar el teclado virtual a la línea de escritura libre.

---

## Fase 2: El Cerebro Local (IndexedDB & Algoritmo RegEx)

*Objetivo: Dotar a la aplicación de memoria interna y la capacidad de procesar y clasificar palabras en el dispositivo.*

* **Paso 2.1: Configuración de IndexedDB:** Implementar la base de datos local (se recomienda usar una librería *wrapper* como `Dexie.js` para simplificar la sintaxis de IndexedDB). Crear los almacenes (*stores*) para: `progreso_usuario`, `diccionario_palabras` y `audios_blob`.
* **Paso 2.2: Carga Inicial de Datos (Seed Data):** Precargar un diccionario base de 50 a 100 palabras esenciales en el almacenamiento local para que la app no arranque vacía.
* **Paso 2.3: El Algoritmo Clasificador (RegEx):** Escribir las expresiones regulares en JavaScript que analicen el string de la palabra.
* *Ejemplo:* Una regla que busque `/th|ch|sh|ph|gh|kn|ou|ea|ie/i`. Si da positivo, altera la dificultad sugerida.


* **Paso 2.4: Pantalla de "Zona de Padres":** Desarrollar el formulario simple de entrada de texto protegido por el reto matemático y la interfaz donde el padre aprueba o cambia manualmente la dificultad sugerida por el algoritmo.

---

## Fase 3: Automatización de Audios y Capa PWA (Offline Completo)

*Objetivo: Conectar la API de voz externa en caliente y transformar el sitio web en una PWA instalable e indestructible.*

* **Paso 3.1: Integración con la API de TTS (Texto a Voz):** Configurar el servicio (ej. Google Cloud TTS o un servicio similar). Programar la función en la Zona de Padres que se dispara al guardar: toma la palabra, hace el fetch a la API (requiere internet), recibe el archivo de audio, lo convierte en un `Blob` y lo inyecta en `IndexedDB`.
* **Paso 3.2: Service Worker & Web App Manifest:** * Crear el archivo `manifest.json` configurando el modo `standalone` y los iconos de la app.
* Escribir el `service-worker.js` con una estrategia *Cache-First* para congelar los estilos, fuentes, lógica del teclado y los 26 audios del alfabeto en el `Cache Storage`.


* **Paso 3.3: Blindaje de Persistencia:** Implementar la validación de `navigator.storage.persist()` en el script de arranque para asegurar que el navegador otorgue el permiso de almacenamiento persistente a la `IndexedDB`.

---

## Fase 4: Gamificación, Pulido Visual y Pruebas

*Objetivo: Volver la aplicación irresistible para los niños y asegurar que no tenga fricciones en dispositivos reales.*

* **Paso 4.1: Interfaz del Álbum de Estampitas:** Diseñar la pantalla del álbum. Programar la lógica de medallas que evalúa los errores del niño al terminar un nivel para decidir si pinta la estampita de Bronce, Plata u Oro en la `IndexedDB`.
* **Paso 4.2: Animaciones y Sonidos de Feedback:** Añadir transiciones divertidas cuando una letra se coloca bien, pantallas de felicitación coloridas al terminar la palabra y sonidos lúdicos de celebración (¡aplausos, campanas!) precargados en el caché.
* **Paso 4.3: Pruebas en Dispositivos Reales (QA):** Probar intensivamente la PWA en:
* Un teléfono Android de gama baja/media (Chrome).
* Un iPad o iPhone (Safari), verificando especialmente que el comportamiento del *Drag and Drop* táctil y el almacenamiento persistente funcionen perfectamente en iOS.
* **Prueba reina:** Poner el dispositivo en *Modo Avión* y verificar que se pueda jugar el diccionario base y las palabras añadidas previamente por el padre sin un solo fallo.
