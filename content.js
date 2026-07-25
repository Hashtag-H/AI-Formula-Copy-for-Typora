(() => {
  if (window.__typoraFormulaCopyLoaded) return;
  window.__typoraFormulaCopyLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "copy-for-typora") return;

    copySelectionForTypora()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("[Copy for Typora]", error);
        showToast("Copy failed. Select text and try again.");
        sendResponse({ ok: false, error: String(error) });
      });

    return true;
  });

  document.addEventListener(
    "copy",
    (event) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || isSelectionInEditable(selection)) return;
      if (!event.clipboardData) return;

      const markdown = getSelectionAsTyporaMarkdown();
      if (!markdown.trim()) return;

      event.clipboardData.setData("text/plain", markdown);
      event.clipboardData.setData("text/markdown", markdown);
      event.preventDefault();
      showToast("Copied for Typora");
    },
    true
  );

  async function copySelectionForTypora() {
    const markdown = getSelectionAsTyporaMarkdown();

    if (!markdown.trim()) {
      showToast("Select an AI answer first.");
      return { ok: false, error: "empty-selection" };
    }

    await writeClipboardText(markdown);
    showToast("Copied for Typora");
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
      parts.push(rangeToMarkdownText(range));
    }

    return normalizeTyporaMath(parts.join("\n"));
  }

  function rangeToMarkdownText(range) {
    const commonNode = range.commonAncestorContainer;
    const commonElement = commonNode.nodeType === Node.ELEMENT_NODE ? commonNode : commonNode.parentElement;
    const mathRoot = closestMathRoot(commonElement);
    const root = mathRoot && nodeIntersectsRange(mathRoot, range) ? mathRoot : commonElement;

    if (!root) return range.toString();

    const chunks = [];
    walkSelected(root, range, chunks, { inPre: false });
    return cleanupSpacing(chunks.join(""));
  }

  function normalizeMathNodes(root) {
    const displayMathNodes = [...root.querySelectorAll(".katex-display")];
    for (const node of displayMathNodes) {
      const tex = getTexFromMathNode(node);
      if (!tex) continue;
      replaceWithMathText(node, tex, true);
    }

    const inlineMathNodes = [...root.querySelectorAll(".katex")].filter(
      (node) => !node.closest(".katex-display")
    );
    for (const node of inlineMathNodes) {
      const tex = getTexFromMathNode(node);
      if (!tex) continue;
      replaceWithMathText(node, tex, false);
    }

    const mathJaxNodes = [...root.querySelectorAll("mjx-container, .MathJax")];
    for (const node of mathJaxNodes) {
      const tex = getTexFromMathNode(node);
      if (!tex) continue;
      const isBlock = isDisplayMathNode(node);
      replaceWithMathText(node, tex, isBlock);
    }

    const mathTexScripts = [...root.querySelectorAll("script[type^='math/tex']")];
    for (const node of mathTexScripts) {
      const type = node.getAttribute("type") || "";
      const isBlock = /mode=display|; *mode=display/i.test(type);
      replaceWithMathText(node, node.textContent || "", isBlock);
    }
  }

  function walkSelected(node, range, chunks, context) {
    if (!nodeIntersectsRange(node, range)) return;

    if (node.nodeType === Node.TEXT_NODE) {
      chunks.push(getSelectedTextFromTextNode(node, range));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName.toLowerCase();
    if (["script", "style", "button", "svg"].includes(tagName) && !isMathTexScript(node)) return;
    if (!context.inPre && isHidden(node) && !closestMathRoot(node)) return;

    const selectedMathRoot = getMathRootForCurrentElement(node);
    if (selectedMathRoot === node) {
      const tex = getTexFromMathNode(node);
      if (tex) {
        chunks.push(formatMathText(tex, isDisplayMathNode(node)));
        return;
      }
    }

    const nextContext = { ...context, inPre: context.inPre || tagName === "pre" };

    if (tagName === "br") {
      chunks.push("\n");
      return;
    }

    if (tagName === "pre") {
      const code = node.querySelector("code");
      const language = getCodeLanguage(code || node);
      chunks.push(`\n\n\`\`\`${language}\n${(code || node).textContent.trimEnd()}\n\`\`\`\n\n`);
      return;
    }

    if (tagName === "li") chunks.push("- ");

    for (const child of node.childNodes) {
      walkSelected(child, range, chunks, nextContext);
    }

    if (["p", "div", "section", "article", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr"].includes(tagName)) {
      chunks.push(context.inPre ? "" : "\n");
    }
  }

  function replaceWithMathText(node, tex, isBlock) {
    const trimmed = tex.trim();
    if (!trimmed) return;
    node.replaceWith(document.createTextNode(formatMathText(trimmed, isBlock)));
  }

  function formatMathText(tex, isBlock) {
    const trimmed = tex.trim();
    return isBlock ? `\n\n$$\n${trimmed}\n$$\n\n` : `$${trimmed}$`;
  }

  function getTexFromMathNode(node) {
    if (isMathTexScript(node)) return node.textContent || "";

    const annotation = node.querySelector("annotation[encoding='application/x-tex']");
    if (annotation?.textContent) return annotation.textContent;

    const math = node.querySelector("math[alttext], math[altText]");
    if (math) return math.getAttribute("alttext") || math.getAttribute("altText");

    return (
      node.getAttribute("data-original-tex") ||
      node.getAttribute("data-tex") ||
      node.getAttribute("aria-label") ||
      node.getAttribute("alttext") ||
      node.getAttribute("altText") ||
      ""
    );
  }

  function getMathRootForCurrentElement(node) {
    if (isMathTexScript(node)) return node;
    if (node.matches?.(".katex-display")) return node;
    if (node.matches?.(".katex") && !node.closest(".katex-display")) return node;
    if (node.matches?.("mjx-container, .MathJax")) return node;
    return null;
  }

  function closestMathRoot(node) {
    if (!node?.closest) return null;
    return node.closest(".katex-display, .katex, mjx-container, .MathJax, script[type^='math/tex']");
  }

  function isMathTexScript(node) {
    return node?.matches?.("script[type^='math/tex']");
  }

  function isDisplayMathNode(node) {
    if (isMathTexScript(node)) {
      const type = node.getAttribute("type") || "";
      return /mode=display|; *mode=display/i.test(type);
    }

    return (
      node.classList?.contains("katex-display") ||
      Boolean(node.closest?.(".katex-display")) ||
      node.getAttribute("display") === "true" ||
      node.getAttribute("data-display") === "true" ||
      node.closest?.(".katex-display, [display='true'], [data-display='true']")
    );
  }

  function nodeIntersectsRange(node, range) {
    try {
      return range.intersectsNode(node);
    } catch {
      return true;
    }
  }

  function getSelectedTextFromTextNode(node, range) {
    const text = node.nodeValue || "";
    let start = 0;
    let end = text.length;

    if (node === range.startContainer) start = range.startOffset;
    if (node === range.endContainer) end = range.endOffset;

    if (start < 0) start = 0;
    if (end > text.length) end = text.length;
    if (end < start) return "";

    return text.slice(start, end);
  }

  function domToMarkdownText(root) {
    const chunks = [];

    walk(root, { inPre: false });

    return cleanupSpacing(chunks.join(""));

    function walk(node, context) {
      if (node.nodeType === Node.TEXT_NODE) {
        chunks.push(node.nodeValue || "");
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tagName = node.tagName.toLowerCase();
      if (["script", "style", "button", "svg"].includes(tagName)) return;
      if (!context.inPre && isHidden(node)) return;

      const nextContext = { ...context, inPre: context.inPre || tagName === "pre" };

      if (tagName === "br") {
        chunks.push("\n");
        return;
      }

      if (tagName === "pre") {
        const code = node.querySelector("code");
        const language = getCodeLanguage(code || node);
        chunks.push(`\n\n\`\`\`${language}\n${(code || node).textContent.trimEnd()}\n\`\`\`\n\n`);
        return;
      }

      if (tagName === "li") chunks.push("- ");

      for (const child of node.childNodes) walk(child, nextContext);

      if (["p", "div", "section", "article", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr"].includes(tagName)) {
        chunks.push(context.inPre ? "" : "\n");
      }
    }
  }

  function isHidden(node) {
    const ariaHidden = node.getAttribute("aria-hidden");
    if (ariaHidden === "true") return true;

    const hidden = node.hidden || node.getAttribute("hidden") !== null;
    if (hidden) return true;

    const style = node.getAttribute("style") || "";
    return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style);
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

  async function writeClipboardText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      fallbackCopyText(text);
    }
  }

  function fallbackCopyText(text) {
    const selection = window.getSelection();
    const ranges = [];
    if (selection) {
      for (let index = 0; index < selection.rangeCount; index += 1) {
        ranges.push(selection.getRangeAt(index).cloneRange());
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    Object.assign(textarea.style, {
      position: "fixed",
      left: "-9999px",
      top: "0",
      opacity: "0"
    });
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();

    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
  }

  function isSelectionInEditable(selection) {
    const node = selection.anchorNode;
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest("input, textarea, [contenteditable='true'], [contenteditable='plaintext-only']"));
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
