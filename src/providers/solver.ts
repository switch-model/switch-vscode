import * as vscode from 'vscode';
import { generateHtml } from './utils';
import { inject, injectable } from 'inversify';
import { SwitchMessenger } from './messenger';
import { ExtensionContext } from '../constants';

@injectable()
export class SolverViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'switch.solver';

	private _view?: vscode.WebviewView;

	@inject(SwitchMessenger)
    private readonly messenger: SwitchMessenger;
    @inject(ExtensionContext)
    private readonly context: vscode.ExtensionContext;

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this.context.extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		return generateHtml(webview, this.context.extensionUri, ['solver.js'], ['main.css', 'codicon.css']);
	}
}
