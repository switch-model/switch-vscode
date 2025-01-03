import * as vscode from 'vscode';
import _ from 'lodash';
import https from 'https';
import fs from 'fs';

import { inject, injectable, postConstruct } from "inversify";
import { Module, ModuleOption } from "../common/modules";
import { OptionsFileHandler } from "./options";
import { SwitchApplicationRunner } from './switch-application-runner';
import { WorkspaceUtils } from './workspace-utils';
import { exec } from 'child_process';
import { PythonEnvironmentHelper } from './python-enviroment-activator';

interface ModuleInstallOptions extends vscode.InputBoxOptions {
    install: (urlOrName: string, destination: string, context: ModulesHandler) => Promise<void>;
    getFileName?: (urlOrName: string) => string;
    needsDestination?: () => Promise<boolean>;
}

@injectable()
export class ModulesHandler {

    private onDidChangeSearchPathEmitter = new vscode.EventEmitter<void>();
    readonly onDidChangeSearchPath = this.onDidChangeSearchPathEmitter.event;

    @inject(OptionsFileHandler)
    private optionsHandler: OptionsFileHandler;

    @inject(SwitchApplicationRunner)
    private switchApplicationRunner: SwitchApplicationRunner;

    @inject(PythonEnvironmentHelper)
    private pythonEnvironmentHelper: PythonEnvironmentHelper;

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
            .filter(module => moduleList.includes(module))
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
        let outputs;
        try {
            outputs = await this.switchApplicationRunner.execute('info', ['--module-arguments', module, '--json']);
        } catch {
            return [];
        }
        const moduleOptions = outputs
            .map(output => JSON.parse(output))
            .flatMap(output => 
                Object.entries(output).map(([key, value]: [string, Partial<ModuleOption>]) => {
                    const name = key.replace(/^-+/, '');
                    return (<ModuleOption>{ name: name, value: options?.[_.camelCase(name)], ...value});
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
        let moduleListOutput;
        try {
            moduleListOutput = (await this.switchApplicationRunner.execute('info', ['--module-list', '--json']));
        } catch {
            return [];
        }
        // Todo this parsing prbsably needs to be improved. Currently matches anything inside of []. Best would of course be if the switch output was better
        const moduleListJson = moduleListOutput[moduleListOutput.length - 1].match(/\[(.|\r|\n)*\]/)?.[0];
        if(!moduleListJson) {
            throw new Error('Error: Could not load module list');
        }
        this.moduleListCache = JSON.parse(moduleListJson);
        return this.moduleListCache!;
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



    // TODO this can probably be extended with an install function so each type can have its own installation method
    private readonly boxConfigurationsByType: { [key: string]: ModuleInstallOptions } = {
        'URL': { title: 'URL', placeHolder: 'URL', 
            install: this.installFromUrl, 
            getFileName: (url) => url.split('/').pop()! },
        'PyPI': { title: 'PyPi Package Name', placeHolder: 'Package Name', 
            install: this.installFromPip },
        'Conda': { title: 'Conda Package Name', placeHolder: 'Package Name', 
            install: this.installFromConda,
            needsDestination: async () => (await this.pythonEnvironmentHelper.getActivationCommands()).length === 0
        },
        'Github': { title: 'Github Url', placeHolder: 'URL', 
            install: this.installFromGithub, 
            getFileName: (url) => url.split('/').pop()! },
        'Create New': { title: 'Module Name', placeHolder: 'Name', 
            install: this.createNewModule}
    };

    async installNewModule() {
        const type = await vscode.window.showQuickPick(Object.keys(this.boxConfigurationsByType), { title: 'Select Source', placeHolder: 'Source' });
        if (!type) { return; }
        const configuration = this.boxConfigurationsByType[type];
        const UrlOrName = await vscode.window.showInputBox(configuration);
        if (!UrlOrName) { return; }

        let destination;
        if(!configuration.needsDestination || await configuration.needsDestination()) {
            destination = (await vscode.window.showSaveDialog({ title: 'Destination', 
                saveLabel: 'Install Here', 
                defaultUri: vscode.Uri.file(`./${configuration.getFileName ? configuration.getFileName(UrlOrName) : UrlOrName}` ) }))?.fsPath;
            if (!destination) { return; }
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification, 
                title: 'Installing Module', cancellable: false}, 
                async () => {
                        await configuration.install(UrlOrName, destination, this);
                    
            });    
        } catch (error) {
            vscode.window.showErrorMessage(`Error installing module: ${error}`);
            return;
        }        

        const searchPaths = (await this.optionsHandler.getOptions())?.moduleSearchPath ?? [];
        if(destination && !searchPaths.includes(destination)) {
            searchPaths.push(destination);
            this.optionsHandler.setOption('moduleSearchPath', searchPaths);
            this.onDidChangeSearchPathEmitter.fire();
        }

        this.invalidateModuleListCache();
    }

    private installFromUrl(url: string, destination: string): Promise<void> {
        return new Promise<void>((res, rej) => {
            https.get(url, (response) => {
                response.pipe(fs.createWriteStream(destination))
                    .on('finish', res).on('error', rej);
            });
        });
    }

    private installFromPip(packageName: string, destination: string): Promise<void> {
        return new Promise<void>((res, rej) => {
            exec(`pip install ${packageName} -t ${destination} --no-deps`, (error, stdout, stderr) => {
                if (error) {
                    console.error(stderr);
                    rej(error);
                } else {
                    console.log(stdout);
                    res();
                }
            });
        });
    }

    private async installFromConda(packageName: string, destination: string, context: ModulesHandler): Promise<void> {
        const activationCommands = await context.pythonEnvironmentHelper.getActivationCommands();
        const commands = [
            ...activationCommands,
            // if environment install in environment else install globally
            `conda install ${packageName} ${destination ? `-p ${destination}` : ''} --no-deps -y`
        ];
        return new Promise<void>((res, rej) => {
            exec(commands.join(' & '), (error, stdout, stderr) => {
                if (error) {
                    console.error(stderr);
                    rej(error);
                } else {
                    console.log(stdout);
                    res();
                }
            });
        });
    }

    private installFromGithub(repositoryUrl: string, destination: string): Promise<void> {
        return new Promise<void>((res, rej) => {
            exec(`git clone ${repositoryUrl} ${destination}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(stderr);
                    rej(error);
                } else {
                    console.log(stdout);
                    res();
                }
            });
        });
    }

    private async createNewModule(_, destination: string): Promise<void> {
        await vscode.workspace.fs.writeFile(vscode.Uri.file(destination), new TextEncoder().encode(NEW_MODULE_TEMPLATE));
    }

}

const NEW_MODULE_TEMPLATE = `
def define_components(m):
    # Replace with your own code here
    m.BuildCogen = Var(
        m.FUEL_BASED_GENS, m.PERIODS,
        within=NonNegativeReals
        )

def load_inputs(m, switch_data, inputs_dir):
    # Replace with your own code here
    switch_data.load_aug(
        filename=os.path.join(inputs_dir, 'cogen.csv'),
        autoselect=True,
        param=(m.cogen_heat_rate, m.cogen_fixed_cost))
`;