import * as vscode from 'vscode';
import { Messenger } from "vscode-messenger";
import { CreateFolder, GetModules, GetOptions, GetSearchPaths, SelectFile, SetOptions } from "../common/messages";
import { inject, injectable } from 'inversify';
import { OptionsFileHandler } from '../system/options';
import { Module } from '../common/modules';
import { ModulesHandler } from '../system/modules';

@injectable()
export class SwitchMessenger {

    @inject(OptionsFileHandler)
    private optionsFileHandler: OptionsFileHandler;

    @inject(ModulesHandler)
    private modulesHandler: ModulesHandler;

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
        this.messenger.onNotification(SetOptions, options => {
            console.log('Set options: ', options);
        });
        this.messenger.onRequest(GetOptions, async () => {
            const options = await this.optionsFileHandler.getOptions();
            return options;
        });
        this.messenger.onRequest(GetModules, async () => {
            console.log('Get modules');
            return await this.modulesHandler.loadModules();
            // return hardcodede test modules for now
            // return <Module[]>[
            //     {
            //         active: true,
            //         description: 'Test module A',
            //         name: 'Module A',
            //         options: [{name: 'Option1', value: '', description: 'some description'}, {name: 'Option2', value: true}]
            //     },
            //     {
            //         active: false,
            //         description: 'Test module B',
            //         name: 'Module B',
            //         options: [{name: 'Option3', value: []}]
            //     }
            // ];
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
