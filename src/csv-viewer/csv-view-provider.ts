import * as vscode from 'vscode';
import { inject, injectable } from "inversify";
import { SwitchMessenger } from '../providers/messenger';
import { ExtensionContext } from '../constants';
import { generateHtml } from '../providers/utils';
import { TableDataProvider as TableDataProvider, WorkbookDocument } from './table-provider';
import { GetTable } from './messages';


@injectable()
export class CsvViewProvider implements vscode.CustomEditorProvider<WorkbookDocument> {

	public static readonly viewType = 'switch.csv-viewer';

	private _view?: vscode.WebviewPanel;

    private didChangeCustomDocumentEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<WorkbookDocument> | vscode.CustomDocumentContentChangeEvent<WorkbookDocument>>();
    readonly onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<WorkbookDocument> | vscode.CustomDocumentContentChangeEvent<WorkbookDocument>>;

	@inject(SwitchMessenger)
    private readonly messenger: SwitchMessenger;

    @inject(ExtensionContext)
    private readonly context: vscode.ExtensionContext;

    @inject(TableDataProvider)
    private readonly dataProvider: TableDataProvider;


    saveCustomDocument(document: WorkbookDocument, cancellation: vscode.CancellationToken): Thenable<void> {
        throw new Error('Method not implemented.');
    }

    saveCustomDocumentAs(document: WorkbookDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
        throw new Error('Method not implemented.');
    }

    revertCustomDocument(document: WorkbookDocument, cancellation: vscode.CancellationToken): Thenable<void> {
        throw new Error('Method not implemented.');
    }

    backupCustomDocument(document: WorkbookDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
        throw new Error('Method not implemented.');
    }

    async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<WorkbookDocument> {
        return this.dataProvider.resolveDocument(uri); //await this.messenger.messenger.sendRequest(GetWorkbook, {type: 'extension'}, uri.toString()); 
    }

    resolveCustomEditor(document: WorkbookDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        this._view = webviewPanel;
        const id = this.messenger.registerWebview(webviewPanel);

		webviewPanel.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this.context.extensionUri
			]
		};

		webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview, document.uri);

    }

    private _getHtmlForWebview(webview: vscode.Webview, uri: vscode.Uri): string {
		return generateHtml(webview, this.context.extensionUri, ['csv-table-view.js'], ['main.css', 'codicon.css'], [`window.documentUri = "${uri.toString()}";`]);
	}


}
