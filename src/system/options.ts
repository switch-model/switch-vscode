import * as vscode from 'vscode';
import { Options } from '../common/options';
import _ from 'lodash';
import { injectable } from 'inversify';
import { getOptions, getScenarios, setOption, setScenarioOption } from './options-parser';
import { Mutex } from 'async-mutex';
import { Scenario } from '../common/scenarios';

@injectable()
export class OptionsFileHandler {

    private mutex = new Mutex();
    private onDidUpdateEmitter = new vscode.EventEmitter<void>();
    private lastOptionsWrite = 0;
    private lastOptions?: Options;
    private lastScenarios?: Scenario[];

    private _selectedScenario?: string;
    private scenarioWatcher?: vscode.FileSystemWatcher;

    get selectedScenario(): string | undefined {
        return this._selectedScenario;
    }

    set selectedScenario(value: string | undefined) {
        this._selectedScenario = value;
        this.lastOptions = undefined;
        this.lastScenarios = undefined;
    }

    onDidUpdate = this.onDidUpdateEmitter.event;

    /**
     * Returns the full set of options. This includes the base options + any options selected from scenarios
     */
    async getFullOptions(): Promise<Options | undefined> {
        const options = await this.getOptions();
        const selectedScenario = await this.getCurrentScenario();
        return {
            ...(options ?? {}),
            ...(selectedScenario ?? {})
        };
    }

    getOptions(): Promise<Options | undefined> {
        return this.mutex.runExclusive(() => this.doGetOptions());
    }

    private async doGetOptions(): Promise<Options | undefined> {
        if (this.lastOptions) {
            return this.lastOptions;
        }
        try {
            const uri = await this.getUri('options.txt');
            if (uri) {
                const byteContent = await vscode.workspace.fs.readFile(uri);
                const content = byteContent.toString();
                const options = getOptions(content);
                this.lastOptions = options;
                this.startScenarioUpdate(uri, this.getScenariosPath(options.scenarioList));
                return options;
            }
        } catch {
            return undefined;
        }
        return undefined;
    }

    async setScenarios(filePath: string): Promise<Scenario[] | undefined> {
        return this.mutex.runExclusive(async () => {
            await this.doSetOption('scenarioList', filePath?.length ? [filePath] : undefined);
            return await this.doGetScenarios(filePath);
        });
    }

    async getScenarios(filePath: string): Promise<Scenario[] | undefined> {
        return this.mutex.runExclusive(() => this.doGetScenarios(filePath));
    }

    getScenarioOptions(scenario?: string): Scenario | undefined {
        return scenario ? this.lastScenarios?.find(e => e.scenarioName === scenario): undefined;
    }

    private async doGetScenarios(filePath: string): Promise<Scenario[] | undefined> {
        try {
            const uri = await this.getUri(this.getScenariosPath(filePath));
            if (uri) {
                const byteContent = await vscode.workspace.fs.readFile(uri);
                const content = byteContent.toString();
                const scenarios = getScenarios(content);
                this.lastScenarios = scenarios;
                return scenarios;
            }
        } catch {
            return undefined;
        }
        return undefined;
    }

    setOption(name: string, params?: string[]): Promise<void> {
        return this.mutex.runExclusive(() => this.doSetOption(name, params));
    }

    setMixedOption(name: string, params?: string[]): Promise<void> {
        return this.mutex.runExclusive(() => this.doSetMixedOption(name, params));
    }

    private async doSetMixedOption(name: string, params?: string[]): Promise<void> {
        try {
            const currentScenario = await this.getCurrentScenario();
            if (currentScenario && name in currentScenario) {
                await this.doSetScenarioOption(name, params);
            } else {
                await this.doSetOption(name, params);
            }
        } catch {
        }
    }

    private async doSetOption(name: string, params?: string[]): Promise<void> {
        try {
            let uri = await this.getUri('options.txt');
            let content = '';
            if (uri) {
                const byteContent = await vscode.workspace.fs.readFile(uri);
                content = byteContent.toString();
            } else if (vscode.workspace.workspaceFolders?.[0]) {
                uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'options.txt');
            }
            if (uri) {
                this.lastOptions = undefined;
                const updatedContent = setOption(content, name, params);
                const encoder = new TextEncoder();
                await vscode.workspace.fs.writeFile(uri, encoder.encode(updatedContent));
                this.lastOptionsWrite = Date.now();
            }
        } catch {
        }
    }

    async setScenarioOption(name: string, params?: string[]): Promise<void> {
        return this.mutex.runExclusive(() => this.doSetScenarioOption(name, params));
    }

    private async doSetScenarioOption(name: string, params?: string[]): Promise<void> {
        try {
            if (!this.selectedScenario) {
                return;
            }
            const options = await this.doGetOptions();
            const scenarioPath = this.getScenariosPath(options?.scenarioList);
            const uri = await this.getUri(scenarioPath);
            if (uri) {
                this.lastScenarios = undefined;
                const byteContent = await vscode.workspace.fs.readFile(uri);
                const content = byteContent.toString();
                const updatedContent = setScenarioOption(content, this.selectedScenario, name, params);
                const encoder = new TextEncoder();
                await vscode.workspace.fs.writeFile(uri, encoder.encode(updatedContent));
                this.lastOptionsWrite = Date.now();
            }
        } catch (e) {
            console.log(e);
        }
    }

    watch(): vscode.Disposable {
        const watcher = vscode.workspace.createFileSystemWatcher('**/options.txt');
        watcher.onDidChange(e => this.emitUpdate(e));
        watcher.onDidCreate(e => this.emitUpdate(e));
        watcher.onDidDelete(e => this.emitUpdate(e));
        return watcher;
    }

    private async getCurrentScenario(): Promise<Scenario | undefined> {
        if (!this._selectedScenario) {
            return undefined;
        }
        if (!this.lastScenarios) {
            const options = await this.doGetOptions();
            const scenarioPath = this.getScenariosPath(options?.scenarioList);
            if (scenarioPath) {
                await this.doGetScenarios(scenarioPath);
            }
        }
        if (this.lastScenarios) {
            const selectedScenario = this.lastScenarios.find(e => e.scenarioName === this._selectedScenario);
            return selectedScenario;
        }
        return undefined;
    }

    private async emitUpdate(uri: vscode.Uri) {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.mtime > this.lastOptionsWrite) {
                this.lastOptions = undefined;
                this.lastScenarios = undefined;
                this.onDidUpdateEmitter.fire();
            }
        } catch {
            // I.e. the file has been deleted
            this.lastOptions = undefined;
            this.lastScenarios = undefined;
            this.onDidUpdateEmitter.fire();
        }
    }

    private startScenarioUpdate(uri: vscode.Uri, pattern: string) {
        if (this.scenarioWatcher) {
            this.scenarioWatcher.dispose();
        }
        uri = vscode.Uri.joinPath(uri, '..');
        const relativePattern = new vscode.RelativePattern(uri, pattern);
        this.scenarioWatcher = vscode.workspace.createFileSystemWatcher(relativePattern);
        this.scenarioWatcher.onDidChange(e => this.emitUpdate(e));
        this.scenarioWatcher.onDidCreate(e => this.emitUpdate(e));
        this.scenarioWatcher.onDidDelete(e => this.emitUpdate(e));
    }

    private async getUri(path: string, stat = true): Promise<vscode.Uri | undefined> {
        const workspaces = vscode.workspace.workspaceFolders || [];
        for (const workspace of workspaces) {
            const uri = vscode.Uri.joinPath(workspace.uri, path);
            try {
                if (stat) {
                    await vscode.workspace.fs.stat(uri);
                }
                return uri;
            } catch {
                // This is fine
            }
        }
        return undefined;
    }

    private getScenariosPath(filePath?: string): string {
        return filePath || 'scenarios.txt';
    }

}
