const MENU_ID = "copy-for-typora";
const SUPPORTED_URL_PATTERNS = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://chat.deepseek.com/*",
  "https://gemini.google.com/*",
  "https://grok.com/*",
  "https://x.com/*",
  "https://twitter.com/*",
  "https://claude.com/*",
  "https://claude.ai/*",
  "https://www.perplexity.ai/*",
  "https://perplexity.ai/*",
  "https://poe.com/*",
  "https://copilot.microsoft.com/*",
  "https://chat.mistral.ai/*",
  "https://huggingface.co/chat/*",
  "https://www.meta.ai/*",
  "https://meta.ai/*",
  "https://you.com/*",
  "https://www.doubao.com/*",
  "https://doubao.com/*",
  "https://www.kimi.com/*",
  "https://kimi.com/*",
  "https://www.moonshot.cn/*",
  "https://moonshot.cn/*",
  "https://kimi.moonshot.cn/*",
  "https://ai.tencent.com/*",
  "https://yuanbao.tencent.com/*",
  "https://www.qianwen.com/*",
  "https://qianwen.com/*",
  "https://chat.qwen.ai/*",
  "https://yiyan.baidu.com/*",
  "https://chatglm.cn/*",
  "https://z.ai/*",
  "https://www.z.ai/*",
  "https://xinghuo.xfyun.cn/*",
  "https://metaso.cn/*",
  "https://www.metaso.cn/*",
  "https://www.n.cn/*",
  "https://n.cn/*",
  "https://www.tiangong.cn/*",
  "https://tiangong.cn/*",
  "https://m.tiangong.cn/*",
  "https://agent.minimax.io/*",
  "https://www.minimax.io/*",
  "https://minimax.io/*"
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "复制为 Typora Markdown",
    contexts: ["selection"],
    documentUrlPatterns: SUPPORTED_URL_PATTERNS
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  sendCopyRequest(tab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== MENU_ID) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) sendCopyRequest(tab.id);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "popup-copy-for-typora" || !sender.tab?.id) return;
  sendCopyRequest(sender.tab.id);
});

async function sendCopyRequest(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "copy-for-typora" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    await chrome.tabs.sendMessage(tabId, { type: "copy-for-typora" });
  }
}
