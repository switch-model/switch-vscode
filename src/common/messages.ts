import type * as vscode from 'vscode';
import { RequestType, NotificationType } from "vscode-messenger-common";
import { Options } from './options';

export const SelectFile: RequestType<vscode.OpenDialogOptions, string[]> = {
    method: 'SelectFile'
};

export const CreateFolder: NotificationType<string> = {
    method: 'CreateFolder'
};

export const SetOptions: NotificationType<Partial<Options>> = {
    method: 'SetOptions'
};

export const GetOptions: RequestType<void, Options | undefined> = {
    method: 'GetOptions'
};
