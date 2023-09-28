import * as vscode from "vscode";

export namespace WorkspaceUtils {
    export async function getUri(path: string, stat = true): Promise<vscode.Uri | undefined> {
        const workspaces = vscode.workspace.workspaceFolders || [];
        for (const workspace of workspaces) {
            const uri = vscode.Uri.joinPath(workspace.uri, path);
            try {
                if (stat) {
                    await vscode.workspace.fs.stat(uri);
                }
                return uri;
            } catch {
                // This is fine
            }
        }
        return undefined;
    }
}