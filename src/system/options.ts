import * as vscode from 'vscode';
import { Options } from '../common/options';
import _ from 'lodash';
import { injectable } from 'inversify';
import { getOptions, setOption } from './options-parser';
import { Mutex } from 'async-mutex';

@injectable()
export class OptionsFileHandler {

    private mutex = new Mutex();

    async getOptions(): Promise<Options | undefined> {
        return this.mutex.runExclusive(async () => {
            try {
                const uri = await this.getOptionsUri();
                if (uri) {
                    const byteContent = await vscode.workspace.fs.readFile(uri);
                    const content = byteContent.toString();
                    const options = getOptions(content);
                    console.log('Options: ', options);
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
                const uri = await this.getOptionsUri();
                if (uri) {
                    const byteContent = await vscode.workspace.fs.readFile(uri);
                    const content = byteContent.toString();
                    const updatedContent = setOption(content, name, params);
                    const encoder = new TextEncoder();
                    await vscode.workspace.fs.writeFile(uri, encoder.encode(updatedContent));
                }
            } catch {
            } 
        });
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

