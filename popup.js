document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("toggle");

  // Lấy trạng thái từ storage
  chrome.storage.local.get(["enabled"], (result) => {
    const isEnabled = result.enabled !== false;
    toggleButton.textContent = isEnabled ? "Tắt Dịch" : "Bật Dịch";
  });

  toggleButton.addEventListener("click", () => {
    chrome.storage.local.get(["enabled"], (result) => {
      const isEnabled = result.enabled !== false;
      const newState = !isEnabled;

      chrome.storage.local.set({ enabled: newState });
      toggleButton.textContent = newState ? "Tắt Dịch" : "Bật Dịch";

      // Gửi message đến content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "toggle",
          enabled: newState,
        });
      });
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle") {
    if (request.enabled) {
      translateTweets();
    } else {
      // Xóa các bản dịch
      document
        .querySelectorAll("article div[lang] div")
        .forEach((div) => div.remove());
      document
        .querySelectorAll("article div[lang]")
        .forEach((tweet) => delete tweet.dataset.translated);
    }
  }
});
