// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ScenarioViewProvider } from './providers/scenario';
import { InputsViewProvider } from './providers/inputs';
import { SolverViewProvider } from './providers/solver';
import { OutputsViewProvider } from './providers/outputs';
import { ModulesViewProvider } from './providers/modules';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
    
    const scenarioViewProvider = new ScenarioViewProvider(context.extensionUri);
    const inputsViewProvider = new InputsViewProvider(context.extensionUri);
    const modulesViewProvider = new ModulesViewProvider(context.extensionUri);
    const outputsViewProvider = new OutputsViewProvider(context.extensionUri);
    const solverViewProvider = new SolverViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ScenarioViewProvider.viewType, scenarioViewProvider),
        vscode.window.registerWebviewViewProvider(InputsViewProvider.viewType, inputsViewProvider),
        vscode.window.registerWebviewViewProvider(ModulesViewProvider.viewType, modulesViewProvider),
        vscode.window.registerWebviewViewProvider(OutputsViewProvider.viewType, outputsViewProvider),
        vscode.window.registerWebviewViewProvider(SolverViewProvider.viewType, solverViewProvider)
    );
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
