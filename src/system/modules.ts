import * as vscode from 'vscode';
import _ from 'lodash';

import { inject, injectable, postConstruct } from "inversify";
import { Module, ModuleOption } from "../common/modules";
import { OptionsFileHandler } from "./options";
import { SwitchApplicationRunner } from './switch-application-runner';
import { WorkspaceUtils } from './workspace-utils';


@injectable()
export class ModulesHandler {

    @inject(OptionsFileHandler)
    private optionsHandler: OptionsFileHandler;

    @inject(SwitchApplicationRunner)
    private switchApplicationRunner: SwitchApplicationRunner;

    private moduleOptionsCache: Map<string, ModuleOption[]> = new Map();
    private moduleListCache: string[] | undefined = undefined;

    private lastModulesWrite = 0;

    private onDidUpdateModuleListEmitter = new vscode.EventEmitter<void>();
    onDidUpdateModuleList = this.onDidUpdateModuleListEmitter.event;

    private searchPathWatchers: Map<string,vscode.FileSystemWatcher> = new Map();

    @postConstruct()
    init() {
        this.watchModuleSearchPaths();
        this.optionsHandler.onDidUpdate(() => {
            this.watchModuleSearchPaths();
        });
    }

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
            this.lastModulesWrite = Date.now();
        }
    }

    async getModuleOptions(module: string): Promise<ModuleOption[]> {
        if(this.moduleOptionsCache.has(module)) {
            return this.moduleOptionsCache.get(module)!;
        }
        const options = await this.optionsHandler.getOptions();
        const outputs = await this.switchApplicationRunner.execute('info', ['--module-arguments', module, '--json']);
        const moduleOptions = outputs
            .map(output => JSON.parse(output))
            .flatMap(output => 
                Object.entries(output).map(([key, value]: [string, Partial<ModuleOption>]) => {
                    const name = key.replace(/^-+/, '');
                    return (<ModuleOption>{ name: name, value: options?.[_.camelCase(name)], ...value})
                }));

        this.moduleOptionsCache.set(module, moduleOptions);
        return moduleOptions;
    }

    invalidateModuleListCache() {
        this.moduleListCache = undefined;
    }

    private async watchModuleSearchPaths() {
        const searchPaths = (await this.optionsHandler.getOptions())?.moduleSearchPath ?? [];
        // newly added paths
        _.difference(searchPaths, Array.from(this.searchPathWatchers.keys())).forEach(path => {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path, '**.py'));
            watcher.onDidChange(async uri => {
                const modulename = uri.path.split('/').pop()?.replace('.py', '');
                if(modulename) {
                    this.moduleOptionsCache.delete(modulename!);
                    this.onDidUpdateModuleListEmitter.fire();
                }
            });
            watcher.onDidCreate(async uri => {
                this.onDidUpdateModuleListEmitter.fire();
            });
            watcher.onDidDelete(async uri => {
                this.onDidUpdateModuleListEmitter.fire();
            });
            this.searchPathWatchers.set(path, watcher);

        });
        // removed paths
        _.difference(Array.from(this.searchPathWatchers.keys()), searchPaths).forEach(path => {
            this.searchPathWatchers.get(path)?.dispose();
            this.searchPathWatchers.delete(path);
        });
    }

    watch(): vscode.Disposable {
        const watcher = vscode.workspace.createFileSystemWatcher('**/modules.txt');
        watcher.onDidChange(async uri => {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.mtime > this.lastModulesWrite) {
                this.onDidUpdateModuleListEmitter.fire();
            }

        });
        return watcher;
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
        this.moduleListCache = JSON.parse(moduleListJson);
        return this.moduleListCache!;
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
        const scenarioOptions = await this.optionsHandler.getScenarioOptions(this.optionsHandler.selectedScenario);
        const options = await this.optionsHandler.getOptions();

        const moduleTxtLocations: (string | undefined)[] = [
            scenarioOptions?.moduleList, // scenario module list
            scenarioOptions?.inputsDir ? `${scenarioOptions!.inputsDir}/modules.txt` : undefined,  // scenario inputs dir
            options?.moduleList ?? // global module list
            options?.inputsDir ? `${options.inputsDir}/modules.txt` :  // global inputs dir
            'modules.txt' // dafault modules.txt in root directory
        ];

        for(let location of moduleTxtLocations) {
            if(location) {
                const uri = WorkspaceUtils.getUri(location, true);
                if(uri) {
                    return uri;
                }
            }
        }

        return undefined;
    }
}
