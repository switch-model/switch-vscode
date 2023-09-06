import * as vscode from 'vscode';
import { Messenger } from "vscode-messenger";
import { SelectFile } from "../common/messages";

export class SwitchMessenger {

    private messenger: Messenger;

    constructor() {
        this.messenger = new Messenger();
        this.messenger.onRequest(SelectFile, async (options) => {
            const result = await vscode.window.showOpenDialog(options);
            return result?.map(e => e.fsPath) || [];
        });
    }

    registerWebview(view: vscode.WebviewView | vscode.WebviewPanel): void {
        if ('show' in view) {
            this.messenger.registerWebviewView(view);
        } else {
            this.messenger.registerWebviewPanel(view);
        }
    }

}

export const MessengerInstance = new SwitchMessenger();
