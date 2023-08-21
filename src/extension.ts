// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SwitchModelViewProvider } from './switch-model-view';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
    
    const provider = new SwitchModelViewProvider(context.extensionUri);

    context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SwitchModelViewProvider.viewType, provider));
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
