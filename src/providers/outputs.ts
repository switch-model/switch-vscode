import * as vscode from 'vscode';
import { generateHtml } from './utils';
import { MessengerInstance } from './messenger';

export class OutputsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'switch.outputs';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;
        MessengerInstance.registerWebview(webviewView);

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		return generateHtml(webview, this._extensionUri, ['outputs.js'], ['main.css', 'codicon.css']);
	}
}
