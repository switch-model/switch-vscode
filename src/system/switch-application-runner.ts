import { injectable } from "inversify";
import { ChildProcess, spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { SwitchApplcationState } from "../common/solver";
import { error } from "node:console";
const terminate = require('terminate');


type switchCommand = 'solve' | 'solve-scenarios' | 'test' | 'upgrade' | '--version';

/**
 * this class is responsible for executing the switch application
 */
@injectable()
export class SwitchApplicationRunner {

    async execute(command: switchCommand, params: string[]): Promise<SwitchApplicationProcess> {
        const pythonExtension = await vscode.extensions.getExtension('ms-python.python')?.exports;
        const pythonEnvironment = await pythonExtension.environments.resolveEnvironment(pythonExtension.environments.getActiveEnvironmentPath());
        if (!pythonEnvironment?.environment) {
            throw new Error('No python environment found. Please select a python environment before executing switch.');
        }

        const commands = [
            `${pythonEnvironment.environment.folderUri.fsPath}/../../Scripts/activate`, // TODO no idea if this is the standard for conda or if we need some other way to find the activate script
            `conda activate ${pythonEnvironment.environment.name}`,
            `switch ${command} ${params.join(' ')}`
        ];

        return new SwitchApplicationProcess(spawn(commands.join('&'), { shell: true, cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath }));

    }


}

export class SwitchApplicationProcess implements vscode.Disposable {

    state: SwitchApplcationState = SwitchApplcationState.Running;

    private onDataEmitter = new vscode.EventEmitter<string>();
    readonly onData = this.onDataEmitter.event;

    private onStateChangeEmitter = new vscode.EventEmitter<SwitchApplcationState>();
    readonly onStateChange = this.onStateChangeEmitter.event;

    errors: string[] = [];

    output: string[] = [];

    constructor(private process: ChildProcess) {
        const that = this;
        process.stdout!.on('data', function (data) {
            data = new TextDecoder().decode(data);
            that.onDataEmitter.fire(data);
            that.output.push(data);
            console.log(data);
        });

        process.stderr!.on('data', function (data) {
            data = new TextDecoder().decode(data);
            that.onDataEmitter.fire(data);
            that.errors.push(data);
            that.output.push(data);
            console.log(data);
        });

        process.on('exit', function (code) {
            that.state = code === 0 ? SwitchApplcationState.Finished : SwitchApplcationState.Error;
            that.onStateChangeEmitter.fire(that.state);
            console.log('exit: ' + code);
        });
    }

    kill() {
        if (!this.process.exitCode) {
            this.errors.push('Process killed by user');
            terminate(this.process.pid, function (err: any, done: any) {
                if (err) { // you will get an error if you did not supply a valid process.pid 
                    console.log('Unable to kill process');
                } else {
                    console.log('Process killed');
                }
            });
        }
    }

    dispose() {
        this.kill();
        this.onDataEmitter.dispose();
        this.onStateChangeEmitter.dispose();
    }
}
