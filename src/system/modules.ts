import * as vscode from 'vscode';

import { inject, injectable } from "inversify";
import { Module, ModuleOption } from "../common/modules";
import { OptionsFileHandler } from "./options";
import { SwitchApplicationRunner } from './switch-application-runner';


@injectable()
export class ModulesHandler {

    @inject(OptionsFileHandler)
    private optionsHandler: OptionsFileHandler;

    @inject(SwitchApplicationRunner)
    private switchApplicationRunner: SwitchApplicationRunner;

    private moduleOptionsCache: Map<string, ModuleOption[]> = new Map();
    private moduleListCache: string[] | undefined = undefined;

    async loadModules(useCache = true): Promise<Module[]> {
        const uri = await this.getModuleFilePath();
        let activatedModules: string[] = [];
        if (uri) {
            const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
            activatedModules = content
                .split(new RegExp('\n'))
                .map(line => line.trim())
                .filter(line => !line.startsWith('#') && line !== '');
        }

        const moduleList: string[] = await this.getModuleList(useCache);
        return await Promise.all(activatedModules
            .concat(moduleList.filter(module => !activatedModules.includes(module)))
            .map(async module => (<Module>{ 
            active: activatedModules.includes(module),
            name: module,
            description: ''
        })));
    }

    async updateModule(module: Module) {
        // TODO using include/exclude module options if in a Scenario instead of modifying the modules.txt file

        const uri = await this.getModuleFilePath();
        if (uri) {
            const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
            const newContent = content.split(new RegExp('\n'));

            const lineIndex = newContent.findIndex(line => line.replace('#', '').trim() === module.name); 
            if(lineIndex >= 0) {
                newContent[lineIndex] = `${module.active ? '' : '# '}${module.name}`;
            } else {
                const moduleList = await this.getModuleList();
                const moduleIndex = moduleList.findIndex(name => name === module.name);
                const insertIndex = newContent.findIndex(line => moduleList.findIndex(name => name === line.replace('#', '').trim()) > moduleIndex);
                newContent.splice(insertIndex < 0 ? newContent.length : insertIndex, 0, `${module.active ? '' : '# '}${module.name}`);
            }
            
            await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(newContent.join('\n')));
        }
    }

    async getModuleOptions(module: string): Promise<ModuleOption[]> {
        if(this.moduleOptionsCache.has(module)) {
            return this.moduleOptionsCache.get(module)!;
        }
        const outputs = await this.switchApplicationRunner.execute('info', ['--module-arguments', module, '--json']);
        const moduleOptions = outputs
            .map(output => JSON.parse(output))
            .flatMap(output => Object.entries(output).map(([key, value]: [string, Partial<ModuleOption>]) => (<ModuleOption>{ name: key.replace(/^-+/, ''), ...value})));

        this.moduleOptionsCache.set(module, moduleOptions);
        return moduleOptions;
    }

    invalidateModuleListCache() {
        this.moduleListCache = undefined;
    }

    private async getModuleList(useCache = true): Promise<string[]> {
        if(useCache && this.moduleListCache) {
            return this.moduleListCache;
        }
        const moduleListOutput = (await this.switchApplicationRunner.execute('info', ['--module-list', '--json']));
        // Todo this parsing prbsably needs to be improved. Currently matches anything inside of []. Best would of course be if the switch output was better
        const moduleListJson = moduleListOutput[moduleListOutput.length - 1].match(/\[(.|\r|\n)*\]/)?.[0];
        if(!moduleListJson) {
            throw new Error('Error: Could not load module list');
        }
        return JSON.parse(moduleListJson);
    }


    // TODO this can probably be extended with an install function so each type can have its own installation method
    private readonly boxConfigurationsByType: { [key: string]: vscode.InputBoxOptions } = {
        'URL': { title: 'URL', placeHolder: 'URL' },
        'PyPI': { title: 'PyPi Package Name', placeHolder: 'Package Name' },
        'Conda': { title: 'Conda Package Name', placeHolder: 'Package Name' },
        'Github': { title: 'Github Url', placeHolder: 'URL' },
        'create New': { title: 'Module Name', placeHolder: 'Name' }
    };

    async installNewModule() {
        const type = await vscode.window.showQuickPick(['URL', 'PyPI', 'Conda', 'Github', 'create New'], { title: 'Select Source', placeHolder: 'Source' });
        if (!type) { return; }
        const UrlOrName = await vscode.window.showInputBox(this.boxConfigurationsByType[type]);
        if (!UrlOrName) { return; }
        const destination = (await vscode.window.showOpenDialog({ title: 'Destination', canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: 'Install Here' }))?.[0].fsPath;
        if (!destination) { return; }

        // TODO do the actual installation
        this.invalidateModuleListCache();
    }

    private async getModuleFilePath(): Promise<vscode.Uri | undefined> {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (workspace) {
            const options = await this.optionsHandler.getOptions();
            // TODO probably use inputsDir of the currently selected Scenario and only options.inputsDir if no Scenario is selected 
            return vscode.Uri.joinPath(workspace.uri, options?.moduleList ?? options?.inputsDir ? `${options.inputsDir}/modules.txt` : 'modules.txt');
        }
    }
}
