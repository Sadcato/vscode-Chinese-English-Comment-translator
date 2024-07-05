"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const uuid_1 = require("uuid");
const appKey = "5bf1f8398154ec92";
const appSecret = "do0LcGOkgxcfcwNnCV2H6d38gVdDyOak";
function activate(context) {
    // Register command for translating Chinese to English
    let disposableTranslateToEnglish = vscode.commands.registerCommand("extension.translateToEnglish", () => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        const language = detectLanguage(text);
        if (language === "zh-CHS") {
            const translatedText = yield translateText(text, language, "en");
            editor.edit((editBuilder) => {
                const insertPosition = new vscode.Position(selection.end.line + 1, 0);
                editBuilder.insert(insertPosition, `// ${translatedText}\n`);
            });
        }
    }));
    // Register command for translating English to Chinese with hover
    let disposableTranslateToChinese = vscode.commands.registerCommand("extension.translateToChinese", () => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        const language = detectLanguage(text);
        if (language === "en") {
            const translatedText = yield translateText(text, language, "zh-CHS");
            const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file', language: '*' }, {
                provideHover(document, position, token) {
                    if (selection.contains(position)) {
                        return new vscode.Hover(`Translation: ${translatedText}`);
                    }
                    return undefined;
                }
            });
            context.subscriptions.push(hoverProvider);
        }
    }));
    context.subscriptions.push(disposableTranslateToEnglish, disposableTranslateToChinese);
}
function detectLanguage(text) {
    return /[\u4e00-\u9fa5]/.test(text) ? "zh-CHS" : "en";
}
function translateText(text, from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = (0, uuid_1.v4)();
        const curtime = Math.floor(Date.now() / 1000).toString();
        const sign = crypto
            .createHash("sha256")
            .update(appKey + truncate(text) + salt + curtime + appSecret)
            .digest("hex");
        try {
            const response = yield axios_1.default.post("http://openapi.youdao.com/api", null, {
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
            }
            else {
                throw new Error("Translation not found in response");
            }
        }
        catch (error) {
            console.error("Error during translation:", error);
            return "Translation error";
        }
    });
}
function truncate(text) {
    if (text.length <= 20)
        return text;
    return text.substring(0, 10) + text.length + text.substring(text.length - 10, text.length);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map