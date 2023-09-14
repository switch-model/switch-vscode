import * as vscode from 'vscode';

import { inject, injectable } from "inversify";
import { Module } from "../common/modules";
import { OptionsFileHandler } from "./options";

@injectable()
export class ModulesHandler {

    @inject(OptionsFileHandler)
    private optionsHandler: OptionsFileHandler;

    async loadModules(): Promise<Module[]> {
        const uri = await this.getModuleFilePath();
        if(uri) {
            const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
            return content
                .split(new RegExp('\n'))
                .map(line => line.trim())
                .filter(line => !line.startsWith('#') && line !== '')
                .map(line => (<Module>{active: true, name: line, description: '' , options: []}));     
        }

        return [];
    }

    async updateModule(module: Module) {
        // TODO using include/exclude module options if in a Scenario instead of modifying the modules.txt file

        const uri = await this.getModuleFilePath();
        const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
        const newContent = content
            .split(new RegExp('\n'))
            .map(line => line.replace('#', '').trim() === module.name ? `${module.active ? '' : '# '}${module.name}` : line)
            .join('\n');

        await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(newContent));
    }

    private async getModuleFilePath(): Promise<vscode.Uri | undefined> {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (workspace) {
            const options = await this.optionsHandler.getOptions();
            // TODO probably use inputsDir of the currently selected Scenario and only options.inputsDir if no Scenario is selected 
            return vscode.Uri.joinPath(workspace.uri, options.moduleList ?? options.inputsDir ? `${options.inputsDir}/modules.txt` : 'modules.txt');
        }
    }
}