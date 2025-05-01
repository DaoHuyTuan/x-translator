// Hàm gửi yêu cầu dịch đến background script
async function translateText(text, targetLang = "vi") {
  return new Promise((resolve) => {
    console.log("Sending translation request for text:", text);
    chrome.runtime.sendMessage(
      { action: "translate", text: text, targetLang: targetLang },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          resolve(text);
          return;
        }
        if (response && response.translatedText) {
          console.log("Received translated text:", response.translatedText);
          resolve(response.translatedText);
        } else {
          console.error(
            "Translation failed:",
            response || "No response from background script"
          );
          if (response && response.error) {
            console.error("Error from background:", response.error);
          }
          resolve(text);
        }
      }
    );
  });
}

// Hàm kiểm tra xem một phần tử có nằm trong viewport không
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Hàm xử lý các tweet trong viewport
async function translateTweetsInViewport() {
  const tweets = document.querySelectorAll(
    "article > div > div > div > div > div:not([data-translated])"
  );

  for (const tweet of tweets) {
    // Kiểm tra xem tweet có nằm trong viewport không
    if (!isElementInViewport(tweet)) continue;

    // Kiểm tra xem tweet có nằm trong một tweet khác không (tweet nhúng)
    const isNestedTweet = tweet
      .closest("article")
      .parentElement.closest("article");
    if (isNestedTweet) continue;

    // Chỉ lấy nội dung chính của tweet (trong [data-testid="tweetText"])
    const tweetTextContainer = tweet.querySelector('[data-testid="tweetText"]');
    if (!tweetTextContainer) continue;

    // Lấy toàn bộ văn bản, bao gồm các đoạn cách nhau bởi <br>, dấu chấm, hoặc khoảng trắng
    const textNodes = [];
    const walk = document.createTreeWalker(
      tweetTextContainer,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    while ((node = walk.nextNode())) {
      const text = node.textContent.trim();
      if (text) textNodes.push(text);
    }

    const fullText = textNodes.join(" ");
    const segments = fullText
      .split(/(?<=\.)\s+|\n+/)
      .filter((segment) => segment.trim());
    if (!segments.length) continue;

    // Đánh dấu tweet đã được xử lý
    tweet.dataset.translated = "true";

    // Gộp tất cả đoạn văn bản thành một chuỗi lớn, phân tách bằng ký tự đặc biệt
    const combinedText = segments.join("|||");
    const translatedCombinedText = await translateText(combinedText);

    // Tách bản dịch dựa trên ký tự phân tách
    const translatedSegments = translatedCombinedText
      .split("|||")
      .map((segment) => segment.trim());

    // Hiển thị bản dịch cho từng đoạn
    segments.forEach((segment, index) => {
      const translatedText = translatedSegments[index] || segment;

      const translatedDiv = document.createElement("div");
      translatedDiv.style.color = "#666";
      translatedDiv.style.fontStyle = "italic";
      translatedDiv.style.fontSize = "0.9em";
      translatedDiv.style.marginTop = "5px";
      translatedDiv.textContent = translatedText;

      tweetTextContainer.appendChild(translatedDiv);
    });
  }
}

// Theo dõi sự kiện cuộn và tải trang
function handleScrollAndLoad() {
  translateTweetsInViewport();
}

// Gọi hàm dịch khi tải trang
document.addEventListener("DOMContentLoaded", handleScrollAndLoad);

// Gọi hàm dịch khi cuộn trang
window.addEventListener("scroll", handleScrollAndLoad);

// Theo dõi thay đổi trong DOM để dịch các tweet mới
const observer = new MutationObserver((mutations) => {
  let hasNewTweets = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.querySelector("article > div > div > div > div > div")
        ) {
          hasNewTweets = true;
          break;
        }
      }
      if (hasNewTweets) break;
    }
  }
  if (hasNewTweets) {
    translateTweetsInViewport();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

translateTweetsInViewport();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle") {
    if (request.enabled) {
      translateTweetsInViewport();
    } else {
      document
        .querySelectorAll(
          "article > div > div > div > div > div [data-translated] + div"
        )
        .forEach((div) => div.remove());
      document
        .querySelectorAll("article > div > div > div > div > div")
        .forEach((tweet) => delete tweet.dataset.translated);
    }
  }
});
