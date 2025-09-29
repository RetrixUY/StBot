<div align="right">
  <a href="README.md">🇪🇸 Español</a> | <a href="README.en.md">🇬🇧 English</a>
</div>

# StBot - Streaming Overlays and Alerts

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

This project is a Node.js backend designed to supercharge your streams. It connects with **Streamer.bot**, **Spotify**, and **Kick** to capture real-time events and display them on a set of customizable web overlays, ready to be added to OBS or any broadcasting software.

![Screenshot of the overlays in action](Screenshot.png)

---

## ✨ Features

* **Streamer.bot Integration**: Capture and process Kick events in real-time.
* **Customizable Alerts**: Visual notifications for follows, raids, subscriptions, gift subs, and Kicks.
* **Chat Overlay**: Display the Kick chat directly on your stream with a modern design.
* **Spotify Integration**:
    * Display the currently playing song with album art, artist, and a progress bar.
    * **Song Request** system redeemable via channel rewards.
* **Polls & Predictions Overlays**: Visualize real-time polls and predictions from Streamer.bot.
* **Robust Backend**: Built with modern TypeScript, featuring automatic reconnection to services.
* **Easy to Configure**: Everything is managed through a simple environment file.

---

## 🚀 Installation and Setup

Follow these steps to get the project up and running.

### 1. Prerequisites

* **Node.js**: v18 or higher.
* **Streamer.bot**: With the [Kick extension configured](https://github.com/Sehelitar/Kick.bot).
* **Spotify Developer Account**: You will need to create an application on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) to get your credentials.

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
2.  **Copy the IDs**: Once imported, 4 new actions will be created. Right-click on each of them, select **`Copy Action ID`**, and paste the ID into the `.env` file you will create in the next step.

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
    ```

### 5. Spotify Authorization (One-time only)

1.  Start the project.
2.  Open your browser and go to `http://localhost:4000/auth`.
3.  Log in and authorize the application.

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