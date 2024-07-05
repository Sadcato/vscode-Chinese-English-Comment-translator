import * as vscode from "vscode";
import axios from "axios";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const appKey = "5bf1f8398154ec92";
const appSecret = "do0LcGOkgxcfcwNnCV2H6d38gVdDyOak";

export function activate(context: vscode.ExtensionContext) {
  // Register command for translating Chinese to English
  let disposableTranslateToEnglish = vscode.commands.registerCommand(
    "extension.translateToEnglish",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      const language = detectLanguage(text);

      if (language === "zh-CHS") {
        const translatedText = await translateText(text, language, "en");
        editor.edit((editBuilder) => {
          const insertPosition = new vscode.Position(selection.end.line + 1, 0);
          editBuilder.insert(insertPosition, `// ${translatedText}\n`);
        });
      }
    }
  );

  // Register command for translating English to Chinese with hover
  let disposableTranslateToChinese = vscode.commands.registerCommand(
    "extension.translateToChinese",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      const language = detectLanguage(text);

      if (language === "en") {
        const translatedText = await translateText(text, language, "zh-CHS");
        const hoverProvider = vscode.languages.registerHoverProvider(
          { scheme: 'file', language: '*' }, {
            provideHover(document, position, token) {
              if (selection.contains(position)) {
                return new vscode.Hover(`Translation: ${translatedText}`);
              }
              return undefined;
            }
          }
        );
        context.subscriptions.push(hoverProvider);
      }
    }
  );

  context.subscriptions.push(disposableTranslateToEnglish, disposableTranslateToChinese);
}

function detectLanguage(text: string): string {
  return /[\u4e00-\u9fa5]/.test(text) ? "zh-CHS" : "en";
}

async function translateText(text: string, from: string, to: string): Promise<string> {
  const salt = uuidv4();
  const curtime = Math.floor(Date.now() / 1000).toString();
  const sign = crypto
    .createHash("sha256")
    .update(appKey + truncate(text) + salt + curtime + appSecret)
    .digest("hex");

  try {
    const response = await axios.post("http://openapi.youdao.com/api", null, {
      params: {
        q: text,
        from,
        to,
        appKey,
        salt,
        sign,
        signType: "v3",
        curtime,
      },
    });

    if (response.data && response.data.translation && response.data.translation[0]) {
      return response.data.translation[0];
    } else {
      throw new Error("Translation not found in response");
    }
  } catch (error) {
    console.error("Error during translation:", error);
    return "Translation error";
  }
}

function truncate(text: string): string {
  if (text.length <= 20) return text;
  return text.substring(0, 10) + text.length + text.substring(text.length - 10, text.length);
}

export function deactivate() {}