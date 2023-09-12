import * as vscode from 'vscode';
import { generateHtml } from './utils';
import { SwitchMessenger } from './messenger';
import { ExtensionContext } from '../constants';
import { inject, injectable } from 'inversify';

@injectable()
export class ScenarioViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'switch.scenario';

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
        return generateHtml(webview, this.context.extensionUri, ['scenario.js'], ['main.css', 'codicon.css']);
	}
}
