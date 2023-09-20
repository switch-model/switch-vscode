import * as vscode from 'vscode';
import { Options } from '../common/options';
import _ from 'lodash';
import { injectable } from 'inversify';
import { getOptions, setOption } from './options-parser';
import { Mutex } from 'async-mutex';

@injectable()
export class OptionsFileHandler {

    private mutex = new Mutex();
    private onDidUpdateEmitter = new vscode.EventEmitter<void>();
    private lastWrite = 0;

    onDidUpdate = this.onDidUpdateEmitter.event;

    async getOptions(): Promise<Options | undefined> {
        return this.mutex.runExclusive(async () => {
            try {
                const uri = await this.getOptionsUri();
                if (uri) {
                    const byteContent = await vscode.workspace.fs.readFile(uri);
                    const content = byteContent.toString();
                    const options = getOptions(content);
                    return options;
                }
            } catch {
                return undefined;
            }
            return undefined;
        });
    }

    async setOption(name: string, params?: string[]): Promise<void> {
        return this.mutex.runExclusive(async () => {
            try {
                let uri = await this.getOptionsUri();
                let content = '';
                if (uri) {
                    const byteContent = await vscode.workspace.fs.readFile(uri);
                    content = byteContent.toString();
                } else if (vscode.workspace.workspaceFolders[0]) {
                    uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'options.txt');
                }
                if (uri) {
                    const updatedContent = setOption(content, name, params);
                    const encoder = new TextEncoder();
                    await vscode.workspace.fs.writeFile(uri, encoder.encode(updatedContent));
                    this.lastWrite = Date.now();
                }
            } catch {
            }
        });
    }
    
    watch(): vscode.Disposable {
        const watcher = vscode.workspace.createFileSystemWatcher('**/options.txt');
        watcher.onDidChange(e => this.emitUpdate(e));
        watcher.onDidCreate(e => this.emitUpdate(e));
        watcher.onDidDelete(e => this.emitUpdate(e));
        return watcher;
    }

    private async emitUpdate(uri: vscode.Uri) {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.mtime > this.lastWrite) {
                this.onDidUpdateEmitter.fire();
            }
        } catch {
            // I.e. the file has been deleted
            this.onDidUpdateEmitter.fire();
        }
    }

    private async getOptionsUri(): Promise<vscode.Uri | undefined> {
        const workspaces = vscode.workspace.workspaceFolders;
        for (const workspace of workspaces) {
            const uri = vscode.Uri.joinPath(workspace.uri, 'options.txt');
            try {
                await vscode.workspace.fs.stat(uri);
                return uri;
            } catch {
                // This is fine
            }
        }
        return undefined;
    }
}

