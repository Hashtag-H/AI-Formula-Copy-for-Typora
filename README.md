# AI Formula Copy for Typora

一个本地 Chrome / Edge 插件，用于把常见 AI 聊天网页里复制的公式转换成 Typora 更容易识别的 Markdown 数学格式。

## 功能

- 在常见 AI 聊天页面右键选区，选择 `复制为 Typora Markdown`。
- 快捷键：`Ctrl+Shift+Y`，macOS 为 `Command+Shift+Y`。
- 把 ChatGPT 常见的 LaTeX 分隔符转换为 Typora 常用格式：

```text
\( a+b \) -> $a+b$

\[
E = mc^2
\] -> $$
E = mc^2
$$
```

- 尽量从页面里的 KaTeX / MathJax 节点读取原始 TeX，减少复制渲染公式时出现乱码的概率。

## 支持站点

- ChatGPT: `chatgpt.com`, `chat.openai.com`
- DeepSeek: `chat.deepseek.com`
- Gemini: `gemini.google.com`
- Grok: `grok.com`, `x.com`
- Claude: `claude.com`, `claude.ai`
- Perplexity: `perplexity.ai`
- Poe: `poe.com`
- Microsoft Copilot: `copilot.microsoft.com`
- Mistral Vibe / Le Chat: `chat.mistral.ai`
- HuggingChat: `huggingface.co/chat`
- Meta AI: `meta.ai`
- You.com: `you.com`
- 豆包: `doubao.com`
- Kimi: `kimi.com`, `moonshot.cn`, `kimi.moonshot.cn`
- 腾讯元宝: `ai.tencent.com`, `yuanbao.tencent.com`
- 千问 / Qwen: `qianwen.com`, `chat.qwen.ai`
- 文心: `yiyan.baidu.com`
- 智谱清言 / Z.ai: `chatglm.cn`, `z.ai`
- 讯飞星火: `xinghuo.xfyun.cn`
- 秘塔 AI 搜索: `metaso.cn`
- 纳米 AI: `n.cn`
- 天工: `tiangong.cn`
- MiniMax: `agent.minimax.io`, `minimax.io`

## 安装

1. 打开 Chrome 或 Edge。
2. 进入扩展管理页面：
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. 打开右上角的 `开发者模式`。
4. 点击 `加载已解压的扩展程序`。
5. 选择本项目文件夹。

## 使用

1. 打开已支持的 AI 聊天网页。
2. 选中包含公式的回答内容。
3. 右键点击选区，选择 `复制为 Typora Markdown`。
4. 切换到 Typora，正常粘贴。

也可以选中内容后直接按 `Ctrl+Shift+Y`。

## Typora 设置建议

如果你的 Typora 版本支持 LaTeX delimiters，也建议在 Typora 里开启：

`Preferences` -> `Markdown` -> `Math`

至少确认 inline math / math block 相关选项已开启。
