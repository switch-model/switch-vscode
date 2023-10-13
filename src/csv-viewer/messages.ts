import { NotificationType, RequestType } from "vscode-messenger-common";
import { TableData } from "./table-provider";

export const GetTable: NotificationType<TableData> = {
    method: 'GetTable'
};
