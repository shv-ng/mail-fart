const keywordInput = document.getElementById("keywordInput");
const soundUpload  = document.getElementById("soundUpload");
const dropZone     = document.getElementById("dropZone");
const dropText     = document.getElementById("dropText");
const saveBtn      = document.getElementById("saveBtn");
const keywordList  = document.getElementById("keywordList");
const toast        = document.getElementById("toast");

let uploadedSound    = null;
let uploadedFileName = "";

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 2400);
}

// ── Save button state ─────────────────────────────────────
function updateSaveBtn() {
  saveBtn.disabled = !(keywordInput.value.trim() && uploadedSound);
}
keywordInput.addEventListener("input", updateSaveBtn);

// ── File handling ─────────────────────────────────────────
function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith("audio/")) {
    showToast("Please select an audio file.");
    return;
  }

  uploadedFileName = file.name;
  const reader = new FileReader();

  reader.onload = () => {
    uploadedSound = reader.result;
    dropZone.classList.add("has-file");
    dropText.innerHTML = `🎧 <span class="highlight">${escHtml(file.name)}</span>`;
    updateSaveBtn();
  };

  reader.onerror = () => showToast("Could not read file.");
  reader.readAsDataURL(file);
}

// Click on drop zone → open hidden file picker
// This is safe in an options page (full tab) — no popup-close issue
dropZone.addEventListener("click", () => soundUpload.click());
soundUpload.addEventListener("change", () => handleFile(soundUpload.files[0]));

// Drag & drop
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFile(e.dataTransfer.files[0]);
});

// ── Save keyword ──────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const word = keywordInput.value.trim();
  if (!word || !uploadedSound) return;

  chrome.storage.local.get(["keywords"], result => {
    let keywords = result.keywords || [];

    const existing = keywords.find(k => k.word.toLowerCase() === word.toLowerCase());

    if (existing) {
      existing.sounds.push({ data: uploadedSound, name: uploadedFileName });
      showToast(`Sound added to "${existing.word}"`);
    } else {
      keywords.push({ word, sounds: [{ data: uploadedSound, name: uploadedFileName }] });
      showToast(`Keyword "${word}" saved!`);
    }

    chrome.storage.local.set({ keywords }, () => {
      resetForm();
      renderKeywords();
    });
  });
});

function resetForm() {
  keywordInput.value = "";
  soundUpload.value  = "";
  uploadedSound      = null;
  uploadedFileName   = "";
  dropZone.classList.remove("has-file");
  dropText.innerHTML = `<span class="highlight">Click to choose</span> or drag & drop<br>Any audio format · Any size`;
  updateSaveBtn();
}

// ── Render ────────────────────────────────────────────────
function renderKeywords() {
  chrome.storage.local.get(["keywords"], result => {
    keywordList.innerHTML = "";
    const keywords = result.keywords || [];

    if (keywords.length === 0) {
      keywordList.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🔇</div>
          No keywords yet.<br>Add one using the panel on the left.
        </div>`;
      return;
    }

    keywords.forEach((k, kIdx) => {
      const item = document.createElement("div");
      item.className = "keyword-item";

      // Header row
      const header = document.createElement("div");
      header.className = "kw-header";
      header.innerHTML = `
        <div class="kw-word">${escHtml(k.word)}</div>
        <div class="kw-actions">
          <button class="btn-sm btn-del" data-kidx="${kIdx}">✕ Delete</button>
        </div>`;

      header.querySelector(".btn-del").addEventListener("click", () => {
        keywords.splice(kIdx, 1);
        chrome.storage.local.set({ keywords }, () => {
          showToast(`"${k.word}" removed.`);
          renderKeywords();
        });
      });

      // Sound chips
      const chips = document.createElement("div");
      chips.className = "sound-chips";

      if (k.sounds.length === 0) {
        chips.innerHTML = `<span style="font-size:11px;color:var(--muted)">No sounds</span>`;
      } else {
        k.sounds.forEach((s, sIdx) => {
          const soundData = typeof s === "string" ? s : s.data;
          const soundName = typeof s === "string" ? `Sound ${sIdx + 1}` : s.name;

          const chip = document.createElement("div");
          chip.className = "chip";
          chip.innerHTML = `
            <button class="chip-play" title="Preview">▶</button>
            <span class="chip-name" title="${escHtml(soundName)}">${escHtml(soundName)}</span>
            <button class="chip-del" title="Remove sound">✕</button>`;

          // Preview
          chip.querySelector(".chip-play").addEventListener("click", () => {
            const audio = new Audio(soundData);
            chip.classList.add("playing");
            audio.play().catch(() => showToast("Playback blocked."));
            audio.onended = () => chip.classList.remove("playing");
          });

          // Remove this sound
          chip.querySelector(".chip-del").addEventListener("click", () => {
            k.sounds.splice(sIdx, 1);
            // If no sounds left, remove the whole keyword
            if (k.sounds.length === 0) {
              keywords.splice(kIdx, 1);
              showToast(`"${k.word}" removed (no sounds left).`);
            } else {
              showToast("Sound removed.");
            }
            chrome.storage.local.set({ keywords }, renderKeywords);
          });

          chips.appendChild(chip);
        });
      }

      item.appendChild(header);
      item.appendChild(chips);
      keywordList.appendChild(item);
    });
  });
}

// ── Helpers ───────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Init ──────────────────────────────────────────────────
renderKeywords();
