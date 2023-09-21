import * as vscode from 'vscode';
import { inject, injectable } from "inversify";
import { ProgressState, SolverOutputUpdateData, SolverUpdateData, SolverUpdateType, SwitchApplcationState } from '../common/solver';
import { SwitchApplicationProcess, SwitchApplicationRunner } from './switch-application-runner';
import { OptionsFileHandler } from './options';

@injectable()
export class Solvers {

    @inject(SwitchApplicationRunner)
    private switchApplication: SwitchApplicationRunner;

    @inject(OptionsFileHandler)
    private optionsFileHandler: OptionsFileHandler;

    private onSolveUpdateEmitter = new vscode.EventEmitter<SolverUpdateData>();
    public onSolveUpdate = this.onSolveUpdateEmitter.event;

    private onSolveOutputUpdateEmitter = new vscode.EventEmitter<SolverOutputUpdateData>();
    public onSolveOutputUpdate = this.onSolveOutputUpdateEmitter.event;


    private solverIdCounter = 0;

    private currentSolvers: Map<string, SwitchApplicationProcess> = new Map();

    async launchSolve() {
        const scenario = this.optionsFileHandler.selectedScenario;
        try {
            const solver = await this.switchApplication.launch(scenario ? 'solve-scenarios' : 'solve', scenario ? ['--scenario', scenario] : []);
            const solverId = `${scenario ?? 'default scenario'} (${this.solverIdCounter++})`;
            this.currentSolvers.set(solverId, solver);
            this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Started, id: solverId });
            let progressState: ProgressState = { progress: 0, step: 'Starting' };
            solver.onData(data => {
                const newState = this.updateProgress(data, progressState);
                if (progressState !== newState) {
                    progressState = newState;
                    this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Progress, id: solverId, progress: progressState });
                }
                this.onSolveOutputUpdateEmitter.fire({ id: solverId, data });
            });
            solver.onStateChange(state => {
                if (state === SwitchApplcationState.Finished) {
                    this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Finished, id: solverId, results: {} }); // TODO results
                } else if (state === SwitchApplcationState.Error) {
                    this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Error, id: solverId, error: solver.errors.join('\n') });
                }
            });
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }
    private readonly ComponentsContructedRegexp = /Constructed \d+ of \d+ components \(\d+%\)/;

    updateProgress(output: string, state: ProgressState): ProgressState {
        if (output.startsWith('Loading inputs...')) {
            return { progress: 1, step: output };
        } else if (output.startsWith('Constructing model instance from data and rules...')) {
            return { progress: 4, step: 'Constructing model...' };
        } else if (output.match(this.ComponentsContructedRegexp)) {
            return { progress: state.progress + 2, step: output.match(this.ComponentsContructedRegexp)?.[0] || '' };
        } else if (output.includes('Solving model...')) {
            return { progress: 25, step: 'Solving model...' };
        } else if (state.step === ('Solving model...')) {
            return { progress: Math.min(state.progress + 2, 95), step: 'Solving model...' };
        } else if (output.startsWith('Executing post-solve functions')) {
            return { progress: 95, step: output };
        };

        return state;
    }

    getSolvers() {
        return Array.from(this.currentSolvers.entries())
            .map(([id, solver]) => ({ id, state: solver.state, error: solver.errors.join('\n') }));
    }

    killSolver(id: string, dispose: boolean) {
        this.currentSolvers.get(id)?.kill();
        if (dispose) {
            this.currentSolvers.get(id)?.dispose();
            this.currentSolvers.delete(id);
        }
    }

    solveAll() {
    }

    getSolverOuptut(id: string): string {
        return this.currentSolvers.get(id)?.output.join('\n') || '';
    }
}
