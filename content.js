(() => {
  if (window.__typoraFormulaCopyLoaded) return;
  window.__typoraFormulaCopyLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "copy-for-typora") return;

    copySelectionForTypora()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("[Copy for Typora]", error);
        showToast("复制失败，请重新选中内容后再试");
        sendResponse({ ok: false, error: String(error) });
      });

    return true;
  });

  async function copySelectionForTypora() {
    const markdown = getSelectionAsTyporaMarkdown();

    if (!markdown.trim()) {
      showToast("请先选中 ChatGPT 回复内容");
      return { ok: false, error: "empty-selection" };
    }

    await navigator.clipboard.writeText(markdown);
    showToast("已复制为 Typora Markdown");
    return { ok: true, text: markdown };
  }

  function getSelectionAsTyporaMarkdown() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return "";
    }

    const parts = [];
    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      normalizeMathNodes(container);
      parts.push(domToMarkdownText(container));
    }

    return normalizeTyporaMath(parts.join("\n"));
  }

  function normalizeMathNodes(root) {
    const displayMathNodes = [...root.querySelectorAll(".katex-display")];
    for (const node of displayMathNodes) {
      const tex = getTexFromMathNode(node);
      if (!tex) continue;
      node.replaceWith(document.createTextNode(`\n\n$$\n${tex.trim()}\n$$\n\n`));
    }

    const inlineMathNodes = [...root.querySelectorAll(".katex")].filter(
      (node) => !node.closest(".katex-display")
    );
    for (const node of inlineMathNodes) {
      const tex = getTexFromMathNode(node);
      if (!tex) continue;
      node.replaceWith(document.createTextNode(`$${tex.trim()}$`));
    }

    const mathJaxNodes = [...root.querySelectorAll("mjx-container")];
    for (const node of mathJaxNodes) {
      const tex = node.getAttribute("data-original-tex") || node.getAttribute("aria-label");
      if (!tex) continue;
      const isBlock = node.getAttribute("display") === "true" || node.closest("[display='true']");
      node.replaceWith(
        document.createTextNode(isBlock ? `\n\n$$\n${tex.trim()}\n$$\n\n` : `$${tex.trim()}$`)
      );
    }
  }

  function getTexFromMathNode(node) {
    const annotation = node.querySelector("annotation[encoding='application/x-tex']");
    if (annotation?.textContent) return annotation.textContent;

    const math = node.querySelector("math[alttext], math[altText]");
    if (math) return math.getAttribute("alttext") || math.getAttribute("altText");

    return node.getAttribute("data-tex") || node.getAttribute("aria-label") || "";
  }

  function domToMarkdownText(root) {
    const lines = [];

    walk(root, { inPre: false });

    return cleanupSpacing(lines.join(""));

    function walk(node, context) {
      if (node.nodeType === Node.TEXT_NODE) {
        lines.push(node.nodeValue || "");
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tagName = node.tagName.toLowerCase();
      const nextContext = { ...context, inPre: context.inPre || tagName === "pre" };

      if (tagName === "br") {
        lines.push("\n");
        return;
      }

      if (tagName === "pre") {
        const code = node.querySelector("code");
        const language = getCodeLanguage(code || node);
        lines.push(`\n\n\`\`\`${language}\n${(code || node).textContent.trimEnd()}\n\`\`\`\n\n`);
        return;
      }

      if (tagName === "li") lines.push("- ");

      for (const child of node.childNodes) walk(child, nextContext);

      if (["p", "div", "section", "article", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
        lines.push(context.inPre ? "" : "\n");
      }
    }
  }

  function getCodeLanguage(node) {
    const className = node?.className || "";
    const match = String(className).match(/language-([a-z0-9_+-]+)/i);
    return match ? match[1] : "";
  }

  function normalizeTyporaMath(text) {
    let output = text
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[\u200b-\u200f\u202a-\u202e\u2060]/g, "");

    output = output.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_match, tex) => {
      return `\n\n$$\n${tex.trim()}\n$$\n\n`;
    });

    output = output.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_match, tex) => {
      return `$${tex.trim()}$`;
    });

    output = output.replace(/\$\$\s*\n?([\s\S]*?)\n?\s*\$\$/g, (_match, tex) => {
      return `\n\n$$\n${tex.trim()}\n$$\n\n`;
    });

    return cleanupSpacing(output).trim();
  }

  function cleanupSpacing(text) {
    return text
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  function showToast(message) {
    const oldToast = document.getElementById("typora-formula-copy-toast");
    oldToast?.remove();

    const toast = document.createElement("div");
    toast.id = "typora-formula-copy-toast";
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      zIndex: "2147483647",
      padding: "10px 14px",
      borderRadius: "8px",
      background: "#111827",
      color: "#fff",
      font: "14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.24)"
    });

    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }
})();
