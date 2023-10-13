import type * as vscode from 'vscode';
import { RequestType, NotificationType } from "vscode-messenger-common";
import { Options } from './options';
import { Module, ModuleOption } from './modules';
import { Scenario } from './scenarios';
import { KillSolverMessage, SolverOutputUpdateData, SolverProcess, SolverUpdateData } from './solver';

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
export const GetModules: RequestType<void | boolean, Module[]> = {
    method: 'GetModules'
};

export const GetModuleOptions: RequestType</* modules */ string[], ModuleOption[]> = {
    method: 'GetModuleOptions'
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

export const GetScenarios: RequestType<string, Scenario[] | undefined> = {
    method: 'GetScenarios'
};

export const SelectScenario: NotificationType<string> = {
    method: 'SelectScenario'
};

// Solver messages
export const Solve: NotificationType<void> = {
    method: 'Solve'
};

export const SolveAll: NotificationType<void> = {
    method: 'SolveAll'
};

export const CleanScenarioQueue: NotificationType<void> = {
    method: 'CleanScenarioQueue'
};

// Solver-Tab Messages
export const GetSolvers: RequestType<void, SolverProcess[]> = {
    method: 'GetSolvers'
};

export const KillSolver: NotificationType<KillSolverMessage> = {
    method: 'KillSolver'
};

export const SolverUpdate: NotificationType<SolverUpdateData> = {
    method: 'SolverUpdate'
};

export const RevealOutputs: NotificationType<string> = {
    method: 'RevealOutputs'
};

// solver id -> solver output
export const GetSolverOutput: RequestType<string, string> = {
    method: 'GetSolverOutput'
};

export const SolverOutputUpdate: NotificationType<SolverOutputUpdateData> = {
    method: 'SolverOutputUpdate'
};