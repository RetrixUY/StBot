<div align="right">
  <a href="README.md">🇪🇸 Español</a> | <a href="README.en.md">🇬🇧 English</a>
</div>

---

# StBot - Overlays y Alertas para Streaming

[![Licencia: CC BY-NC-SA 4.0](https://img.shields.io/badge/Licencia-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

Este proyecto es un backend de Node.js diseñado para potenciar tus streams. Se conecta con **Streamer.bot**, **Spotify** y **Kick** para capturar eventos en tiempo real y mostrarlos en un conjunto de overlays web personalizables, listos para añadir a OBS o cualquier software de transmisión.

![Captura de pantalla de los overlays en acción](Screenshot.png)

---

## ✨ Características

* **Integración con Streamer.bot**: Captura y procesa eventos de Kick en tiempo real.
* **Alertas personalizables**: Notificaciones visuales para follows, raids, suscripciones, regalos de subs y Kicks.
* **Chat en Overlay**: Muestra el chat de Kick directamente en tu stream con un diseño moderno.
* **Integración con Spotify**:
    * Muestra la canción que está sonando con carátula, artista y barra de progreso.
    * Sistema de **Song Request** canjeable a través de recompensas de canal.
* **Overlays de Encuestas y Predicciones**: Visualiza en tiempo real las encuestas y predicciones de Streamer.bot.
* **Integración con Impresora Térmica**: Genera e imprime tickets personalizados al recibir nuevos seguidores u otros eventos.
* **Backend Robusto**: Construido con TypeScript, moderno y con reconexión automática a los servicios.
* **Fácil de Configurar**: Todo se gestiona a través de un simple archivo de entorno.

---

## 🚀 Instalación y Configuración

Sigue estos pasos para poner en marcha el proyecto.

### 1. Prerrequisitos

* **Node.js**: v18 o superior.
* **Streamer.bot**: Con la [extensión de Kick configurada](https://github.com/Sehelitar/Kick.bot).
* **Cuenta de Desarrollador de Spotify**: Necesitarás crear una aplicación en el [Dashboard de Desarrolladores de Spotify](https://developer.spotify.com/dashboard) para obtener tus credenciales.
* **Impresora Térmica (Opcional)**: Una impresora Bluetooth ESC/POS (como la [YHK-02BD](https://share.temu.com/5Jy0Dr0jJyA) o similar) si deseas usar la función de impresión.

### 2. Instalación

1.  **Clona el repositorio**.
2.  **Abre una terminal** en la carpeta del proyecto.
3.  **Instala las dependencias**:
    ```bash
    npm install
    ```

### 3. Acciones de Streamer.bot

Este proyecto necesita un conjunto de acciones para funcionar. Las encontrarás en el archivo `Actions.txt`.

1.  **Importa las Acciones**: En Streamer.bot, ve a la pestaña `Actions`. En el panel superior, haz clic derecho y selecciona `Import`. Busca y selecciona el archivo `Actions.txt` de este proyecto.
2.  **Copia los IDs**: Una vez importadas, se crearán varias acciones. Haz clic derecho sobre cada una de ellas, selecciona **`Copy Action ID`** y pega el ID en el archivo `.env` que crearás en el siguiente paso.

### 4. Configuración del Entorno

1.  Crea un archivo llamado `.env` en la raíz del proyecto.
2.  Copia y pega el siguiente contenido, rellenando los valores con tus credenciales y los IDs de las acciones que acabas de importar.

    ```env
    # PUERTO DEL SERVIDOR LOCAL
    PORT=4000

    # -- STREAMER.BOT --
    SB_HOST=127.0.0.1
    SB_PORT=8080
    SB_PASSWORD=

    # -- SPOTIFY --
    SPOTIFY_CLIENT_ID=TU_CLIENT_ID_DE_SPOTIFY
    SPOTIFY_CLIENT_SECRET=TU_CLIENT_SECRET_DE_SPOTIFY
    SPOTIFY_REDIRECT_URI=http://localhost:4000/callback

    # ID de la recompensa de canal para el Song Request
    REDEMPTION_ID=ID_DE_LA_RECOMPENSA_DE_STREAMERBOT

    # IDs de las Acciones importadas de Streamer.bot
    ACTION_GET_REDEEMS=ID_DE_LA_ACCION_PARA_OBTENER_RECOMPENSAS
    ACTION_SEND_MESSAGE=ID_DE_LA_ACCION_PARA_ENVIAR_MENSAJE_AL_CHAT
    ACTION_REJECT_REDEMPTION=ID_DE_LA_ACCION_PARA_RECHAZAR_RECOMPENSA
    ACTION_ACEPT_REDEMPTION=ID_DE_LA_ACCION_PARA_ACEPTAR_RECOMPENSA

    # -- IMPRESORA TÉRMICA (Opcional) --
    PRINTER_ENABLED=false                 # true para habilitar la impresión
    PRINTER_PORT=COM4                     # Puerto Serial o COM (ej: COM4 o /dev/rfcomm0)
    PRINTER_FONT_REGULAR=C:/path/to/regular_font.ttf
    PRINTER_FONT_BOLD=C:/path/to/bold_font.ttf
    PRINTER_BT_MAC=AA:BB:CC:DD:EE:FF      # MAC de la impresora Bluetooth (necesario en Windows/Linux)
    PRINTER_BT_CHANNEL=2                  # Canal RFCOMM (usualmente 1, 2 o 11, necesario para el binding en Linux)
    ```

### 5. Autorización de Spotify (Solo una vez)

1.  Abre tu navegador y ve a `http://localhost:4000/auth`.
2.  Inicia sesión y autoriza la aplicación.

---

### 6. Integración con Impresora Térmica 🖨️

Esta integración permite imprimir automáticamente un ticket personalizado (con el avatar de Kick, si está disponible) **cada vez que un nuevo usuario sigue el canal**.

La función de impresión se activa automáticamente al recibir el evento `kickFollow` de Streamer.bot. No es necesario configurar ninguna acción de Streamer.bot adicional para este evento.

#### 6.1. Requisitos y Configuración de Hardware

1.  **Habilita la función**: Configura `PRINTER_ENABLED=true` en el archivo `.env`.
2.  **Configuración de Puertos**:
    * **Windows**: Asegúrate de que la impresora Bluetooth esté emparejada y el sistema le haya asignado un puerto COM (p. ej., `COM4`). La aplicación usará la `PRINTER_PORT` y la `PRINTER_BT_MAC` para intentar establecer la conexión serial.
    * **Linux**: Debes configurar la conexión Bluetooth para el puerto serial RFCOMM. El valor de `PRINTER_PORT` debe coincidir con el dispositivo creado (ej: `/dev/rfcomm0`).
3.  **Fuentes**: Las variables `PRINTER_FONT_REGULAR` y `PRINTER_FONT_BOLD` deben apuntar a archivos de fuente TrueType (`.ttf`) accesibles por el sistema para la generación de texto vectorial.

---

## 🏃‍♂️ Ejecutar la Aplicación

* **Modo Desarrollo**:
    ```bash
    npm run dev
    ```

* **Modo Producción**:
    ```bash
    npm run build
    npm start
    ```

---

## 🖥️ Añadir Overlays a OBS

Crea una nueva **Fuente de Navegador** (Browser Source) para cada uno con las siguientes URLs:

* **Alertas**: `http://localhost:4000/overlay/alerts.html`
* **Chat**: `http://localhost:4000/overlay/chat.html`
* **Now Playing (Spotify)**: `http://localhost:4000/overlay/nowplaying.html`
* **Encuestas / Predicciones**: `http://localhost:4000/overlay/polls.html`

---

## ⚖️ Licencia

Este proyecto está bajo la licencia **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International**.

[![Licencia: CC BY-NC-SA 4.0](https://img.shields.io/badge/Licencia-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)