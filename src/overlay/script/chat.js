// --- Configuración ---
const MAX_MESSAGES = 30;

// --- Elementos del DOM ---
const container = document.getElementById("chat-container");

// --- Almacén para los SVGs de los Badges ---
const BADGE_SVGS = {
  broadcaster: null,
  moderator: null,
  vip: null,
  og: null,
};

/**
 * Carga los archivos SVG de los badges de forma asíncrona.
 */
async function loadBadges() {
  try {
    const responses = await Promise.all([
      fetch('./assets/broadcaster.svg'),
      fetch('./assets/moderator.svg'),
      fetch('./assets/vip.svg'),
      fetch('./assets/og.svg')
    ]);

    const svgs = await Promise.all(responses.map(res => res.text()));
    
    BADGE_SVGS.broadcaster = svgs[0];
    BADGE_SVGS.moderator = svgs[1];
    BADGE_SVGS.vip = svgs[2];
    BADGE_SVGS.og = svgs[3];
    
    console.log("Badges SVG cargados correctamente.");
  } catch (error) {
    console.error("Error al cargar los archivos SVG de los badges:", error);
  }
}

/**
 * Escapa caracteres HTML para prevenir inyecciones de código.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Parsea el mensaje y reemplaza los emotes de Kick con imágenes.
 */
function parseKickMessage(message) {
  const emoteRegex = /\[emote:(\d+):(.+?)\]/g;
  return message.replace(emoteRegex, (match, emoteId, emoteName) => {
    const imageUrl = `https://files.kick.com/emotes/${escapeHtml(emoteId)}/fullsize`;
    return `<img src="${imageUrl}" alt="${escapeHtml(emoteName)}" class="emote">`;
  });
}

/**
 * Añade una nueva línea de chat al contenedor.
 */
function addChatMessage(msgData) {
  const lineEl = document.createElement("div");
  lineEl.className = "chat-line";
  lineEl.setAttribute('data-msg-id', msgData.msgId);

  const metaEl = document.createElement("span");
  metaEl.className = "meta";

  // Lógica de Badges usando pinnableMessage
  try {
    const pinnable = JSON.parse(msgData.pinnableMessage);
    const badges = pinnable?.sender?.identity?.badges || [];
    
    if (badges.length > 0) {
      badges.forEach(badge => {
        const svg = BADGE_SVGS[badge.type];
        if (svg) {
          const badgeSpan = document.createElement('span');
          badgeSpan.className = 'badge';
          badgeSpan.innerHTML = svg;
          metaEl.appendChild(badgeSpan);
        }
      });
    }
  } catch (e) {
    console.error("Error al parsear pinnableMessage:", e);
  }

  // Nombre de Usuario
  const usernameEl = document.createElement("span");
  usernameEl.className = "username";
  usernameEl.textContent = msgData.user;
  usernameEl.style.color = msgData.color || '#FFFFFF';
  metaEl.appendChild(usernameEl);
  
  metaEl.append(': ');

  // Mensaje con Emotes
  const messageEl = document.createElement("span");
  messageEl.className = "message";
  messageEl.innerHTML = parseKickMessage(msgData.message);

  lineEl.appendChild(metaEl);
  lineEl.appendChild(messageEl);
  
  // Añadir el mensaje al final del contenedor
  container.appendChild(lineEl);

  // Lógica de borrado de mensajes viejos
  while (container.children.length > MAX_MESSAGES) {
    // Borrar el primer hijo (el de más arriba)
    container.removeChild(container.children[0]);
  }
}

function deleteOneMessage(msgId) {
    const messageEl = container.querySelector(`[data-msg-id="${msgId}"]`);
    if (messageEl) {
        messageEl.classList.add('deleted');
        setTimeout(() => messageEl.remove(), 500);
    }
}

function clearAllMessages() {
    container.innerHTML = '';
}

/**
 * Inicia la conexión con el backend para recibir eventos de chat.
 */
function connect() {
  const events = new EventSource("/api/chat/events");

  events.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      switch (payload.type) {
        case 'new_message':
          addChatMessage(payload.data);
          break;
        case 'delete_one':
          deleteOneMessage(payload.data.msgId);
          break;
        case 'clear':
          clearAllMessages();
          break;
      }
    } catch (e) {
      console.error("Error al procesar evento de chat:", e);
    }
  };

  events.onerror = () => {
    events.close();
    setTimeout(connect, 5000);
  };
}

// Iniciar todo: Cargar los SVGs primero, y luego conectar.
(async () => {
  await loadBadges();
  connect();
})();