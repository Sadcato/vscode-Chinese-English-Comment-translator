import * as vscode from "vscode";
import axios from "axios";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";

// 定义 appKey 和 appSecret
const appKey = "";
const appSecret = "";

// 创建一个 Axios 实例，设置基础 URL 和超时时间
const axiosInstance = axios.create({
  baseURL: "http://openapi.youdao.com",
  timeout: 5000, // 5秒超时
});

export function activate(context: vscode.ExtensionContext) {
  // 注册命令，将中文翻译成英文
  const disposableTranslateToEnglish = vscode.commands.registerCommand(
    "extension.translateToEnglish",
    () => translateCommand("zh-CHS", "en") // 调用 translateCommand 函数处理翻译
  );

  // 注册命令，将英文翻译成中文，并显示悬停提示
  const disposableTranslateToChinese = vscode.commands.registerCommand(
    "extension.translateToChinese",
    () => translateCommand("en", "zh-CHS") // 调用 translateCommand 函数处理翻译
  );

  // 将命令注册到上下文中，以便在插件停用时释放资源
  context.subscriptions.push(
    disposableTranslateToEnglish,
    disposableTranslateToChinese
  );
}

// 通用翻译命令处理函数，根据源语言和目标语言进行翻译
async function translateCommand(from: string, to: string) {
  const editor = vscode.window.activeTextEditor; // 获取当前活动的文本编辑器
  if (!editor) {
    return; // 如果没有活动的编辑器，直接返回
  }

  const selection = editor.selection; // 获取当前选中的文本范围
  const text = editor.document.getText(selection); // 获取选中的文本内容

  if (detectLanguage(text) === from) {
    // 检测选中文本的语言，如果与源语言匹配
    try {
      const translatedText = await translateText(text, from, to); // 调用 translateText 函数进行翻译
      if (to === "en") {
        // 如果目标语言是英文
        editor.edit((editBuilder) => {
          // 编辑器中插入翻译后的文本
          const insertPosition = new vscode.Position(selection.end.line + 1, 0); // 计算插入位置
          editBuilder.insert(insertPosition, `// ${translatedText}\n`); // 在选中文本的下一行插入翻译结果
        });
      } else {
        // 如果目标语言是中文
        const hoverProvider = vscode.languages.registerHoverProvider(
          // 注册悬停提示提供程序
          { scheme: "file", language: "*" }, // 适用于所有文件类型
          {
            provideHover(document, position) {
              // 提供悬停提示
              if (selection.contains(position)) {
                // 如果悬停位置在选中范围内
                return new vscode.Hover(`Translation: ${translatedText}`); // 显示翻译结果
              }
              return undefined; // 否则不显示提示
            },
          }
        );
        vscode.workspace.onDidChangeTextDocument(() => hoverProvider.dispose()); // 文本变化时移除悬停提供程序
      }
    } catch (error) {
      const errorTyped = error as Error;
      vscode.window.showErrorMessage(
        "Translation error: " + errorTyped.message
      ); // 显示错误消息
    }
  }
}

// 检测文本语言，返回中文（zh-CHS）或英文（en）
function detectLanguage(text: string): string {
  return /[\u4e00-\u9fa5]/.test(text) ? "zh-CHS" : "en"; // 检查文本中是否包含中文字符
}

// 调用翻译 API 进行文本翻译
async function translateText(
  text: string,
  from: string,
  to: string
): Promise<string> {
  const salt = uuidv4(); // 生成随机数，用于签名
  const curtime = Math.floor(Date.now() / 1000).toString(); // 获取当前时间戳（秒级）
  const sign = createHash("sha256") // 生成 SHA256 签名
    .update(appKey + truncate(text) + salt + curtime + appSecret) // 根据要求拼接签名字符串
    .digest("hex"); // 计算哈希值

  try {
    const response = await axiosInstance.post("/api", null, {
      // 发送 POST 请求
      params: {
        q: text, // 原文
        from, // 源语言
        to, // 目标语言
        appKey, // 应用 ID
        salt, // 随机数
        sign, // 签名
        signType: "v3", // 签名类型
        curtime, // 当前时间戳
      },
    });

    if (response.data?.translation?.[0]) {
      // 检查响应数据中是否包含翻译结果
      return response.data.translation[0]; // 返回翻译结果
    } else {
      throw new Error("Translation not found in response"); // 抛出错误，提示未找到翻译结果
    }
  } catch (error) {
    console.error("Error during translation:", error); // 打印错误日志
    throw error; // 抛出错误
  }
}

// 截断长文本，适用于签名生成
function truncate(text: string): string {
  if (text.length <= 20) return text; // 如果文本长度小于等于20，直接返回
  return text.substring(0, 10) + text.length + text.substring(text.length - 10); // 截取文本前10个字符和后10个字符，中间用文本长度填充
}

// 插件停用时调用，清理资源
export function deactivate() {}
