import * as vscode from "vscode";
import { injectable } from "inversify";
import { read, WorkBook, utils } from "xlsx";

export interface WorkbookDocument extends vscode.CustomDocument {
    workbook: WorkBook;
}

export interface TableData {
    editable: boolean;
    headers: string[];
    rows: string[][];
} 

@injectable()
export class TableDataProvider {

    private documents: Map<string, WorkbookDocument> = new Map();

    async resolveDocument(uri: vscode.Uri): Promise<WorkbookDocument> {
        if(this.documents.has(uri.toString())) {
            return this.documents.get(uri.toString())!;
        }

        const buffer = await vscode.workspace.fs.readFile(uri);
        const workbook = read(buffer, {type: 'buffer', dense: true});
        const document = {
            dispose: () => {this.documents.delete(uri.toString())},
            workbook,
            uri
        };
        this.documents.set(uri.toString(), document);
        return document;
    }

    async getTable(uri: vscode.Uri): Promise<TableData> {
        const document = await this.resolveDocument(uri);
        const sheet = document.workbook.Sheets[document.workbook.SheetNames[0]];
        const json = utils.sheet_to_json(sheet, {header: 1});
        return {
            headers: json[0] as string[],
            rows: json.slice(1) as string[][],
            editable: uri.path.split('/').indexOf('inputs') !== -1,
        };
    }
}