import type * as vscode from 'vscode';
import { RequestType, NotificationType } from "vscode-messenger-common";
import { Options } from './options';
import { Module } from './modules';
import { Scenario } from './scenarios';

export const SelectFile: RequestType<vscode.OpenDialogOptions, string[]> = {
    method: 'SelectFile'
};

export const CreateFolder: NotificationType<string> = {
    method: 'CreateFolder'
};

export const CreateFile: NotificationType<string> = {
    method: 'CreateFile'
};


export interface OptionsSetter {
    name: string
    params?: string[]
}

export const SetOptions: NotificationType<OptionsSetter> = {
    method: 'SetOptions'
};

export const SetMixedOptions: NotificationType<OptionsSetter> = {
    method: 'SetMixedOptions'
};

export const GetOptions: RequestType<void, Options | undefined> = {
    method: 'GetOptions'
};

export const GetFullOptions: RequestType<void, Options | undefined> = {
    method: 'GetFullOptions'
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


// scenario webview
export const SetScenariosPath: RequestType<string, Scenario[]> = {
    method: 'SetScenariosPath'
};

export const SetScenarioOptions: NotificationType<OptionsSetter> = {
    method: 'SetScenarioOptions'
};

export const GetScenarios: RequestType<string, Scenario[]> = {
    method: 'GetScenarios'
};

export const SelectScenario: NotificationType<string> = {
    method: 'SelectScenario'
};
