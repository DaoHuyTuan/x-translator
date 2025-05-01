const XAI_API_KEY = "";

async function translateWithXAI(text, targetLang = "vi") {
  try {
    console.log("Sending request to xAI API for text:", text);
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini-beta",
        stream: false,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are Grok, a helpful AI. Translate the following text into " +
              targetLang +
              ". If the text contains multiple segments separated by '|||', translate each segment separately and return the translations separated by '|||'. Do not add any extra text.",
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `xAI API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    console.log("xAI API response:", data);

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      throw new Error("Invalid response from xAI API: " + JSON.stringify(data));
    }
  } catch (error) {
    console.error("xAI translation error:", error.message);
    return text; // Trả về văn bản gốc nếu lỗi
  }
}

// Lắng nghe yêu cầu từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    console.log("Received translation request:", request);
    translateWithXAI(request.text, request.targetLang)
      .then((translatedText) => {
        console.log("Sending translated text:", translatedText);
        sendResponse({ translatedText });
      })
      .catch((error) => {
        console.error("Background script error:", error);
        sendResponse({ translatedText: request.text, error: error.message });
      });
    return true;
  }
  return false;
});
