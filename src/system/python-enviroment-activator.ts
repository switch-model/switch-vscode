import * as vscode from 'vscode';
import os from 'os';
import { injectable } from 'inversify';

@injectable()
export class PythonEnvironmentHelper {

    async getActivationCommands(): Promise<string[]> {
        const pythonExtension = await vscode.extensions.getExtension('ms-python.python')?.exports;
        const pythonEnvironment = await pythonExtension?.environments.resolveEnvironment(pythonExtension.environments.getActiveEnvironmentPath());
        let activateCommands: string[] = [];
        if (pythonEnvironment?.environment?.type === 'Conda') {
            activateCommands = [
                `${pythonEnvironment.environment.folderUri.fsPath}/../../${os.platform() === 'win32' ? 'Scripts' : 'bin'}/activate`,
                `conda activate ${pythonEnvironment.environment.name}`,    
            ];
        }

        return activateCommands;
    }

}