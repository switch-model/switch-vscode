import type * as vscode from 'vscode';
import { RequestType } from "vscode-messenger-common";

export const SelectFile: RequestType<vscode.OpenDialogOptions, string[]> = {
    method: 'SelectFile'
};
