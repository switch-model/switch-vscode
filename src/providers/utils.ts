import * as vscode from 'vscode';

export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function generateHtml(webview: vscode.Webview, extUri: vscode.Uri, title: string, js: string[], css: string[]): string {
    const nonce = getNonce();
    const jsUris = js.map(file => webview.asWebviewUri(vscode.Uri.joinPath(extUri, 'out', 'webview', file)));
    const cssUris = css.map(file => webview.asWebviewUri(vscode.Uri.joinPath(extUri, 'out', 'webview', file)));
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

                ${cssUris.map(uri => `<link href="${uri}" rel="stylesheet">`).join('\n')}

				<title>${title}</title>
			</head>
			<body>
                <div id="main"></div>
                ${jsUris.map(uri => `<script nonce="${nonce}" src="${uri}"></script>`).join('\n')}
			</body>
			</html>`;
}
