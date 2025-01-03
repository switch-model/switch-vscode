import 'reflect-metadata';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ScenarioViewProvider } from './providers/scenario';
import { InputsViewProvider } from './providers/inputs';
import { SolverViewProvider } from './providers/solver';
import { OutputsViewProvider } from './providers/outputs';
import { ModulesViewProvider } from './providers/modules';
import { Container } from 'inversify';
import containerModule from './container-module';
import { ExtensionContext } from './constants';
import { SolverTabViewProvider } from './providers/solver-tab';
import { OptionsFileHandler } from './system/options';
import { CsvViewProvider } from './csv-viewer/csv-view-provider';
import { ModulesHandler } from './system/modules';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {

    const container = new Container({
        autoBindInjectable: true,
        defaultScope: 'Singleton'
    });
    container.load(containerModule);
    container.bind(ExtensionContext).toConstantValue(context);
    
    const scenarioViewProvider = container.get(ScenarioViewProvider);
    const inputsViewProvider = container.get(InputsViewProvider);
    const modulesViewProvider = container.get(ModulesViewProvider);
    const outputsViewProvider = container.get(OutputsViewProvider);
    const solverViewProvider = container.get(SolverViewProvider);
    const solverTabViewProvider = container.get(SolverTabViewProvider);
    const csvViewProvider = container.get(CsvViewProvider);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ScenarioViewProvider.viewType, scenarioViewProvider),
        vscode.window.registerWebviewViewProvider(InputsViewProvider.viewType, inputsViewProvider),
        vscode.window.registerWebviewViewProvider(ModulesViewProvider.viewType, modulesViewProvider),
        vscode.window.registerWebviewViewProvider(OutputsViewProvider.viewType, outputsViewProvider),
        vscode.window.registerWebviewViewProvider(SolverViewProvider.viewType, solverViewProvider),
        vscode.window.registerWebviewViewProvider(SolverTabViewProvider.viewType, solverTabViewProvider),
        vscode.window.registerCustomEditorProvider(CsvViewProvider.viewType, csvViewProvider)
    );

    const optionsFileHandler = container.get(OptionsFileHandler);
    context.subscriptions.push(optionsFileHandler.watch());

    const modulesHandler = container.get(ModulesHandler);
    context.subscriptions.push(modulesHandler.watch());
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
