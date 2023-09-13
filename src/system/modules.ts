import * as vscode from 'vscode';

import { inject, injectable } from "inversify";
import { Module } from "../common/modules";
import { OptionsFileHandler } from "./options";

@injectable()
export class ModulesHandler {

    @inject(OptionsFileHandler)
    private optionsHandler: OptionsFileHandler;

    async loadModules(): Promise<Module[]> {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (workspace) {
            const options = await this.optionsHandler.getOptions();

            const uri = vscode.Uri.joinPath(workspace.uri, options.moduleList ?? options.inputsDir ? `${options.inputsDir}/modules.txt` : 'modules.txt');
            const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
            return content
                .split(new RegExp('\n'))
                .map(line => line.trim())
                .filter(line => !line.startsWith('#') && line !== '')
                .map(line => (<Module>{active: true, name: line, description: '' , options: []})); 
        }

        return [];
    }
}