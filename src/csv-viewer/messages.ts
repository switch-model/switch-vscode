import { NotificationType, RequestType } from "vscode-messenger-common";
import { TableData } from "./table-provider";

export const GetTable: NotificationType<TableData> = {
    method: 'GetTable'
};


export interface CellChangedData {
    uri: string;
    row: number;
    column: number;
    value: string;
}

export const CellChanged: NotificationType<CellChangedData> = {
    method: 'CellChanged'
};
