
    document.getElementById("openSettings").addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    });

    chrome.storage.local.get(["keywords"], (result) => {
      const keywords = result.keywords || [];
      const total = keywords.reduce((sum, k) => sum + k.sounds.length, 0);
      const el = document.getElementById("statusLine");
      if (keywords.length === 0) {
        el.innerHTML = "No keywords set up yet.";
      } else {
        el.innerHTML = `<span>${keywords.length}</span> keyword${keywords.length !== 1 ? "s" : ""}, <span>${total}</span> sound${total !== 1 ? "s" : ""} loaded`;
      }
    });
