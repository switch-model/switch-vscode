import * as vscode from 'vscode';
import { Messenger } from "vscode-messenger";
import { CreateFolder, SelectFile, SetOutputDirectory } from "../common/messages";

export class SwitchMessenger {

    private messenger: Messenger;

    constructor() {
        this.messenger = new Messenger();
        this.messenger.onRequest(SelectFile, async (options) => {
            const result = await vscode.window.showOpenDialog(options);
            return result?.map(e => {
                if (vscode.workspace.workspaceFolders?.length === 1) {
                    const workspaceUri = vscode.workspace.getWorkspaceFolder(e);
                    const path = workspaceUri ? e.fsPath.substring(workspaceUri.uri.fsPath.length + 1) : e.fsPath;
                    return path;
                }
            }) || [];
        });
        this.messenger.onNotification(CreateFolder, async (folder) => {
            try {
                const uri = this.getUri(folder);
                await vscode.workspace.fs.createDirectory(uri);
            } catch (err: any) {
                vscode.window.showErrorMessage('Failed to create folder: ' + err.message);
            }
        });
        this.messenger.onNotification(SetOutputDirectory, folder => {
            console.log('Set output folder: ' + (folder || 'outputs'));
        });
    }

    private getUri(folder: string): vscode.Uri {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        let uri: vscode.Uri;
        if (vscode.workspace.workspaceFolders?.length === 1 && folder.charAt(0) !== '/' && folder.charAt(1) !== ':') {
            uri = vscode.Uri.joinPath(workspaceFolder!.uri, folder);
        } else {
            uri = vscode.Uri.file(folder);
        }
        return uri;
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
