import * as vscode from "vscode";
import { injectable } from "inversify";
import { read, WorkBook, utils } from "xlsx";
import { DocumentChangedEvent } from "./messages";

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

    private onDidChangeDocumentEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<WorkbookDocument>>();
    readonly onDidChangeDocument: vscode.Event<vscode.CustomDocumentEditEvent<WorkbookDocument>> = this.onDidChangeDocumentEmitter.event;
    
    private onDidChangeDocumentInternalEmitter = new vscode.EventEmitter<DocumentChangedEvent>();
    readonly onDidChangeDocumentInternal: vscode.Event<DocumentChangedEvent> = this.onDidChangeDocumentInternalEmitter.event;

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

    async revertDocument(document: WorkbookDocument): Promise<void> {
        this.documents.delete(document.uri.toString());
         await this.resolveDocument(document.uri);
        this.onDidChangeDocumentInternalEmitter.fire({uri: document.uri.toString(), data: await this.getTable(document.uri)});
    }

    updateCell(uri: string, row: number, column: number, value: string) {
        const workbook = this.documents.get(uri);
        if(!workbook) {
            throw new Error(`Workbook with uri: ${uri} not found while trying to update cell`);
        }
        const sheetData = workbook.workbook.Sheets[workbook.workbook.SheetNames[0]]["!data"]!;
        const oldValue = sheetData[row][column].v;
        sheetData[row][column].v = value;
        this.onDidChangeDocumentEmitter.fire({
            document: workbook, 
            undo: async () => {
                sheetData[row][column].v = oldValue;
                this.onDidChangeDocumentInternalEmitter.fire({uri, data: await this.getTable(workbook.uri)});
            },
            redo: async () => {
                sheetData[row][column].v = value;
                this.onDidChangeDocumentInternalEmitter.fire({uri, data: await this.getTable(workbook.uri)});
            }
        });
    }
}