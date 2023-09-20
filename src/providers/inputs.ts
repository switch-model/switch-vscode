import * as vscode from 'vscode';
import { generateHtml } from './utils';
import { inject, injectable } from 'inversify';
import { SwitchMessenger } from './messenger';
import { ExtensionContext } from '../constants';
import { OptionsUpdated } from '../common/messages';

@injectable()
export class InputsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'switch.inputs';

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
        this.messenger.registerWebview(webviewView, {
            broadcastMethods: [OptionsUpdated.method]
        });

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
		return generateHtml(webview, this.context.extensionUri, ['inputs.js'], ['main.css', 'codicon.css']);
	}
}
