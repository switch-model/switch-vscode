import type * as vscode from 'vscode';
import { RequestType, NotificationType } from "vscode-messenger-common";

export const SelectFile: RequestType<vscode.OpenDialogOptions, string[]> = {
    method: 'SelectFile'
};

export const CreateFolder: NotificationType<string> = {
    method: 'CreateFolder'
};

export const SetOutputDirectory: NotificationType<string> = {
    method: 'SetOutputDirectory'
};
