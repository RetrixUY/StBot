<div align="right">
  <a href="README.md">🇪🇸 Español</a> | <a href="README.en.md">🇬🇧 English</a>
</div>

---

# StBot - Streaming Overlays and Alerts

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

This project is a Node.js backend designed to supercharge your streams. It connects with **Streamer.bot**, **Spotify**, and **Kick** to capture real-time events and display them on a set of customizable web overlays, ready to be added to OBS or any broadcasting software.

![Screenshot of the overlays in action](Screenshot.png)

---

## ✨ Features

* **Streamer.bot Integration**: Capture and process Kick events in real-time.
* **Customizable Alerts**: Visual notifications for follows, raids, subscriptions, gifted subs, and Kicks.
* **Chat Overlay**: Display the Kick chat directly on your stream with a modern design.
* **Spotify Integration**:
    * Display the currently playing song with album art, artist, and a progress bar.
    * **Song Request** system redeemable via channel rewards.
* **Polls & Predictions Overlays**: Visualize real-time polls and predictions from Streamer.bot.
* **Thermal Printer Integration**: Generate and print personalized tickets upon receiving new followers or other events.
* **Robust Backend**: Built with TypeScript, modern, and featuring automatic reconnection to services.
* **Easy to Configure**: Everything is managed through a simple environment file.

---

## 🚀 Installation and Setup

Follow these steps to get the project up and running.

### 1. Prerequisites

* **Node.js**: v18 or higher.
* **Streamer.bot**: With the [Kick extension configured](https://github.com/Sehelitar/Kick.bot).
* **Spotify Developer Account**: You'll need to create an application on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) to get your credentials.
* **Thermal Printer (Optional)**: A Bluetooth ESC/POS printer (like the [YHK-02BD](https://share.temu.com/5Jy0Dr0jJyA) or similar) if you want to use the printing feature.

### 2. Installation

1.  **Clone the repository**.
2.  **Open a terminal** in the project folder.
3.  **Install the dependencies**:
    ```bash
    npm install
    ```

### 3. Streamer.bot Actions

This project requires a set of actions to function. You will find them in the `Actions.txt` file.

1.  **Import Actions**: In Streamer.bot, go to the `Actions` tab. In the left panel, right-click and select `Import`. Find and select the `Actions.txt` file from this project.
2.  **Copy the IDs**: Once imported, several actions will be created. Right-click on each of them, select **`Copy Action ID`**, and paste the ID into the `.env` file you will create in the next step.

### 4. Environment Configuration

1.  Create a file named `.env` in the root of the project.
2.  Copy and paste the following content, filling in the values with your credentials and the IDs of the actions you just imported.

    ```env
    # LOCAL SERVER PORT
    PORT=4000

    # -- STREAMER.BOT --
    SB_HOST=127.0.0.1
    SB_PORT=8080
    SB_PASSWORD=

    # -- SPOTIFY --
    SPOTIFY_CLIENT_ID=YOUR_SPOTIFY_CLIENT_ID
    SPOTIFY_CLIENT_SECRET=YOUR_SPOTIFY_CLIENT_SECRET
    SPOTIFY_REDIRECT_URI=http://localhost:4000/callback

    # Channel reward ID for the Song Request
    REDEMPTION_ID=YOUR_STREAMERBOT_REWARD_ID

    # IDs of the imported Streamer.bot Actions
    ACTION_GET_REDEEMS=ID_OF_THE_GET_REDEMPTIONS_ACTION
    ACTION_SEND_MESSAGE=ID_OF_THE_SEND_CHAT_MESSAGE_ACTION
    ACTION_REJECT_REDEMPTION=ID_OF_THE_REJECT_REDEMPTION_ACTION
    ACTION_ACEPT_REDEMPTION=ID_OF_THE_ACCEPT_REDEMPTION_ACTION

    # -- THERMAL PRINTER (Optional) --
    PRINTER_ENABLED=false                 # true to enable printing
    PRINTER_PORT=COM4                     # Serial or COM Port (e.g., COM4 or /dev/rfcomm0)
    PRINTER_FONT_REGULAR=C:/path/to/regular_font.ttf
    PRINTER_FONT_BOLD=C:/path/to/bold_font.ttf
    PRINTER_BT_MAC=AA:BB:CC:DD:EE:FF      # Bluetooth MAC of the printer (required on Windows/Linux)
    PRINTER_BT_CHANNEL=2                  # RFCOMM Channel (usually 1, 2, or 11, required for binding on Linux)
    ```

### 5. Spotify Authorization (One-time only)

1.  Open your browser and go to `http://localhost:4000/auth`.
2.  Log in and authorize the application.

---

### 6. Thermal Printer Integration 🖨️

This integration automatically prints a personalized ticket (with the Kick avatar, if available) **every time a new user follows the channel**.

The printing function is automatically activated upon receiving the `kickFollow` event from Streamer.bot. No additional Streamer.bot action needs to be configured for this event.

#### 6.1. Requirements and Hardware Configuration

1.  **Enable the Feature**: Set `PRINTER_ENABLED=true` in your `.env` file.
2.  **Port Configuration**:
    * **Windows**: Ensure the Bluetooth printer is paired and the system has assigned a COM port (e.g., `COM4`). The application will use `PRINTER_PORT` and `PRINTER_BT_MAC` to attempt to establish the correct serial connection.
    * **Linux**: You must configure the Bluetooth connection for the RFCOMM serial port. The `PRINTER_PORT` value should match the created device (e.g., `/dev/rfcomm0`).
3.  **Fonts**: The `PRINTER_FONT_REGULAR` and `PRINTER_FONT_BOLD` variables must point to accessible TrueType font (`.ttf`) files for vector text generation.

---

## 🏃‍♂️ Running the Application

* **Development Mode**:
    ```bash
    npm run dev
    ```

* **Production Mode**:
    ```bash
    npm run build
    npm start
    ```

---

## 🖥️ Adding Overlays to OBS

Create a new **Browser Source** for each of the following URLs:

* **Alerts**: `http://localhost:4000/overlay/alerts.html`
* **Chat**: `http://localhost:4000/overlay/chat.html`
* **Now Playing (Spotify)**: `http://localhost:4000/overlay/nowplaying.html`
* **Polls / Predictions**: `http://localhost:4000/overlay/polls.html`

---

## ⚖️ License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** license.

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)