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

export interface OptionsSetter {
    name: string
    params?: string[]
}

export const SetOptions: NotificationType<OptionsSetter> = {
    method: 'SetOptions'
};

export const GetOptions: RequestType<void, Options | undefined> = {
    method: 'GetOptions'
};

export const OptionsUpdated: NotificationType<void> = {
    method: 'OptionsUpdated'
};


// modules webview
export const GetModules: RequestType<void, Module[]> = {
    method: 'GetModules'
};

export const UpdateModule: NotificationType<Module> = {
    method: 'UpdateModule'
};

export const InstallModule: RequestType<string, void> = {
    method: 'InstallModule'
};