import * as vscode from 'vscode';

import { inject, injectable } from "inversify";
import { Module } from "../common/modules";
import { OptionsFileHandler } from "./options";


@injectable()
export class ModulesHandler {

    @inject(OptionsFileHandler)
    private optionsHandler: OptionsFileHandler;


    // TODO replace with getting the actual options
    private readonly testOptions = [
        {name: 'testString', value: 'test', description: 'string test option'},
        {name: 'testBool', value: false, description: 'boolean test option'},
        {name: 'testList', value: ['testv1', 'testv2'], description: 'string list test option'}
    ];

    async loadModules(): Promise<Module[]> {
        const uri = await this.getModuleFilePath();
        if(uri) {
            const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
            return content
                .split(new RegExp('\n'))
                .map(line => line.trim())
                .filter(line => !line.startsWith('#') && line !== '')
                // TODO get the actual description and options
                .map(line => (<Module>{active: true, name: line, description: 'test Description' , options: this.testOptions}));     
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

    // TODO this can probably be extended with an install function so each type can have its own installation method
    private readonly boxConfigurationsByType: {[key: string]: vscode.InputBoxOptions} = {
        'URL' : {title: 'URL', placeHolder: 'URL'},
        'PyPI' : {title: 'PyPi Package Name', placeHolder: 'Package Name'},
        'Conda' : {title: 'Conda Package Name', placeHolder: 'Package Name'},
        'Github' : {title: 'Github Url', placeHolder: 'URL'},
        'create New' : {title: 'Module Name', placeHolder: 'Name'}
    };

    async installNewModule() {
        const type = await vscode.window.showQuickPick(['URL', 'PyPI', 'Conda', 'Github', 'create New'], {title: 'Select Source', placeHolder: 'Source'});
        if(!type) {return;}
        const UrlOrName = await vscode.window.showInputBox(this.boxConfigurationsByType[type]);
        if(!UrlOrName) {return;}
        const destination = (await vscode.window.showOpenDialog({title: 'Destination', canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: 'Install Here'}))?.[0].fsPath;
        if(!destination) {return;}

        // TODO do the actual installation

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