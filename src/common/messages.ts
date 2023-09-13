import type * as vscode from 'vscode';
import { RequestType, NotificationType } from "vscode-messenger-common";
import { Options } from './options';
import { Module } from './modules';

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


// modules webview
export const GetModules: RequestType<void, Module[]> = {
    method: 'GetModules'
};

export const UpdateModule: NotificationType<Module> = {
    method: 'UpdateModule'
};

export const GetSearchPaths: RequestType<void, string[]> = {
    method: 'GetSearchPaths'
};
export const SetSearchPaths: RequestType<string[], void> = {
    method: 'SetSearchPaths'
};
