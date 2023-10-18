import * as vscode from 'vscode';
import { Messenger, ViewOptions } from "vscode-messenger";
import { CreateFile, CreateFolder, GetFullOptions, GetModules, GetOptions, 
    GetScenarios, InstallModule, OptionsUpdated, SelectFile, SelectScenario, 
    SetMixedOptions, SetOptions, SetScenarioOptions, SetScenariosPath, 
    UpdateModule, Solve, SolveAll, KillSolver, GetSolverOutput, GetSolvers, SolverUpdate,
    SolverOutputUpdate, CleanScenarioQueue, RevealOutputs, GetModuleOptions } from "../common/messages";
import { inject, injectable, postConstruct } from 'inversify';
import { OptionsFileHandler } from '../system/options';
import { Module } from '../common/modules';
import { ModulesHandler } from '../system/modules';
import { Solvers } from '../system/solvers';
import { NotificationType, WebviewIdMessageParticipant } from 'vscode-messenger-common';
import path from 'node:path';
import { WorkspaceUtils } from '../system/workspace-utils';
import { CellChanged, DocumentChanged, GetTable } from '../csv-viewer/messages';
import { TableDataProvider } from '../csv-viewer/table-data-provider';

@injectable()
export class SwitchMessenger {

    @inject(OptionsFileHandler)
    private optionsFileHandler: OptionsFileHandler;

    @inject(Solvers)
    private solver: Solvers;
    
    @inject(ModulesHandler)
    private modulesHandler: ModulesHandler;

    @inject(TableDataProvider)
    private readonly dataProvider: TableDataProvider;

    messenger: Messenger;

    private webViewsByType: Map<string, WebviewIdMessageParticipant> = new Map();

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
        this.messenger.onNotification(CreateFile, async (file) => {
            try {
                const uri = this.getUri(file);
                await vscode.workspace.fs.writeFile(uri, new Uint8Array());
            } catch (err: any) {
                vscode.window.showErrorMessage('Failed to create file: ' + err.message);
            }
        });
        this.messenger.onNotification(SetOptions, async options => {
            await this.optionsFileHandler.setOption(options.name, options.params);
            if(options.name === 'moduleSearchPath') {
                this.modulesHandler.invalidateModuleListCache();
            }
            this.optionsUpdated();
        });
        this.messenger.onNotification(SetMixedOptions, async options => {
            await this.optionsFileHandler.setMixedOption(options.name, options.params);
            this.optionsUpdated();
        });
        this.messenger.onNotification(SetScenarioOptions, async options => {
            await this.optionsFileHandler.setScenarioOption(options.name, options.params);
            this.optionsUpdated();
        });
        this.messenger.onRequest(GetOptions, async () => {
            const options = await this.optionsFileHandler.getOptions();
            return options;
        });
        this.messenger.onRequest(GetFullOptions, async () => {
            const options = await this.optionsFileHandler.getFullOptions();
            return options;
        });
        this.messenger.onRequest(GetModules, async (useCache) => {
            return await this.modulesHandler.loadModules(useCache ?? true);
        });
        this.messenger.onRequest(GetModuleOptions, async (modules: string[]) => {
            return (await Promise.all(modules.map(async module =>  this.modulesHandler.getModuleOptions(module)))).flatMap(options => options);
        });
        this.messenger.onNotification(UpdateModule, async (module: Module) => {
            this.modulesHandler.updateModule(module);
        });
        this.messenger.onRequest(InstallModule, async () => {
            this.modulesHandler.installNewModule();
        });
        
        this.messenger.onRequest(GetScenarios, async (filePath: string) => {
            return await this.optionsFileHandler.getScenarios(filePath);
        });
        this.messenger.onRequest(SetScenariosPath, async (filePath: string) => {
            return this.optionsFileHandler.setScenarios(filePath);
        });
        this.messenger.onNotification(SelectScenario, name => {
            this.optionsFileHandler.selectedScenario = name;
            this.optionsUpdated();
        });

        // Solver
        this.messenger.onNotification(Solve, async () => this.solver.launchSolve());
        this.messenger.onNotification(SolveAll, async () => this.solver.solveAll());
        this.messenger.onNotification(CleanScenarioQueue, async () => this.solver.cleanScenarioQueue());

        this.messenger.onNotification(KillSolver, async ({id, dispose}) => this.solver.killSolver(id, dispose));
        this.messenger.onRequest(GetSolvers, async () => this.solver.getSolvers());
        this.messenger.onRequest(GetSolverOutput, async (solverId: string) => this.solver.getSolverOuptut(solverId));

        this.messenger.onNotification(RevealOutputs, async (solverId: string) => {
            const scenario = this.solver.currentSolvers.get(solverId)?.scenario;
            const outputFolder = this.optionsFileHandler.getScenarioOptions(scenario)?.outputsDir ??
                (await this.optionsFileHandler.getOptions())?.outputsDir ??
                './outputs';
            // hacky workaround because there currently is a bug in vscode which does not reveal the correct resource when the explorer is not open see https://github.com/microsoft/vscode/issues/160504
            const uri = await WorkspaceUtils.getUri(outputFolder);
            await vscode.commands.executeCommand('revealInExplorer', uri);
            vscode.commands.executeCommand('revealInExplorer', uri);
        });

        // CSV viewer
        this.messenger.onRequest(GetTable, async (uri: string) => this.dataProvider.getTable(vscode.Uri.parse(uri)));
        this.messenger.onNotification(CellChanged, async (data) => { this.dataProvider.updateCell(data.uri, data.row, data.column, data.value); });
    }

    private sendWebviewNotification(notificationType: NotificationType<any>, notification: any, viewType: string) {
        const reciever = this.webViewsByType.get(viewType);
        if (reciever) {
            this.messenger.sendNotification(notificationType, reciever, notification);
        } else {
            console.warn(`No webview found for type ${viewType}`);
        }   
    }

    private optionsUpdated(): void {
        this.messenger.sendNotification(OptionsUpdated, {
            type: 'broadcast'
        });
    }

    @postConstruct()
    protected init() {
        this.optionsFileHandler.onDidUpdate(() => {
            this.optionsUpdated();
        });

        this.solver.onSolveUpdate(update => {
            this.sendWebviewNotification(SolverUpdate, update, 'switch.solver-tab');
        });
        this.solver.onSolveOutputUpdate(update => {
            this.sendWebviewNotification(SolverOutputUpdate, update, 'switch.solver-tab');
        });

        this.modulesHandler.onDidChangeSearchPath(() => {
            this.optionsUpdated();
        });

        this.dataProvider.onDidChangeDocumentInternal(e => {
            this.messenger.sendNotification(DocumentChanged , {type: 'webview', webviewType: 'switch.csv-viewer'}, e);
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

    registerWebview(view: vscode.WebviewView | vscode.WebviewPanel, options?: ViewOptions): void {
        if ('show' in view) {
            const id = this.messenger.registerWebviewView(view, options);
            this.webViewsByType.set(view.viewType, id);
        } else {
            this.messenger.registerWebviewPanel(view, options);
        }
    }

}
