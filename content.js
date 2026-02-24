let lastMessageId = null;
let debounceTimer = null;

// Get the currently expanded email message
function getCurrentMessage() {
  const containers = document.querySelectorAll("div[data-message-id]");
  if (!containers.length) return null;

  // Use last visible expanded message (Gmail stacks them in threads)
  let target = null;
  for (const container of containers) {
    const body = container.querySelector("div.a3s.aiL, div.a3s");
    if (body && body.innerText.trim().length > 0) {
      target = { container, body };
    }
  }

  if (!target) return null;

  return {
    id: target.container.getAttribute("data-message-id"),
    text: target.body.innerText
  };
}

function checkForKeywords(text) {
  chrome.storage.local.get(["keywords"], (result) => {
    const keywords = result.keywords || [];

    for (const keywordObj of keywords) {
      const { word, sounds } = keywordObj;
      if (!sounds || sounds.length === 0) continue;

      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");

      if (regex.test(text)) {
        const random = sounds[Math.floor(Math.random() * sounds.length)];
        // Support both old format (plain base64 string) and new format ({data, name})
        const soundData = typeof random === "string" ? random : random.data;
        playSound(soundData);
        break;
      }
    }
  });
}

function playSound(soundDataUrl) {
  const audio = new Audio(soundDataUrl);
  audio.volume = 1.0;
  audio.play().catch(err => console.warn("Mail Fart: Playback blocked:", err));
}

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const message = getCurrentMessage();
    if (!message) return;

    if (message.id !== lastMessageId) {
      lastMessageId = message.id;
      checkForKeywords(message.text);
    }
  }, 300);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
