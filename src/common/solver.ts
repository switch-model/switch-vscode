import exp from "constants";

export enum SolverUpdateType {
    Started,
    Finished,
    Error,
    Progress,
    Scenario // for 'solve all' when scenario changes 
}

export interface SolverStarted {
    type: SolverUpdateType.Started;
    id: string;
    scenarios?: string[];
}

export interface SolverProgress {
    type: SolverUpdateType.Progress;
    id: string;
    progress: ProgressState;
}

export enum ScenarioState {
    Scheduled,
    Running,
    Finished,
    Skipped,
}

export interface ScenarioStatus {
    scenario: string;
    state: ScenarioState;
}

export interface ScenarioUpdate {
    type: SolverUpdateType.Scenario;
    id: string;
    status: ScenarioStatus
}

export interface SolverFinished {
    type: SolverUpdateType.Finished;
    id: string;
}

export interface SolverError {
    type: SolverUpdateType.Error;
    id: string;
    error: string;
}

export type SolverUpdateData = SolverStarted | SolverFinished | SolverError | SolverProgress | ScenarioUpdate;

export interface SolverProcess {
    id: string;
    state: SwitchApplcationState;
    error?: string;
    progress?: ProgressState;
    scenarioStatus?: ScenarioStatus[];
}

export interface ProgressState {
    progress: number;// progress 0-100
    step: string; // current step like "Constructing Components", "Solving"
}

export interface SolverOutputUpdateData {
    id: string;
    data: string;
}

export interface KillSolverMessage {
    id: string;
    dispose: boolean; // delete this solver from the list of solvers
}

export enum SwitchApplcationState {
    Running,
    Finished,
    Error
}