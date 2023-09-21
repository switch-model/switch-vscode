
export enum SolverUpdateType {
    Started,
    Finished,
    Error,
    Progress
}

export interface SolverStarted {
    type: SolverUpdateType.Started;
    id: string;
}

export interface SolverProgress {
    type: SolverUpdateType.Progress;
    id: string;
    progress: ProgressState;
}

export interface SolverFinished {
    type: SolverUpdateType.Finished;
    id: string;
    results: any;
}

export interface SolverError {
    type: SolverUpdateType.Error;
    id: string;
    error: string;
}

export type SolverUpdateData = SolverStarted | SolverFinished | SolverError | SolverProgress;

export interface SolverProcess {
    id: string;
    state: SwitchApplcationState;
    error?: string;
    progress?: ProgressState;
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