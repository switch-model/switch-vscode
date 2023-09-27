import * as vscode from 'vscode';
import { inject, injectable } from "inversify";
import { ProgressState, ScenarioState, SolverOutputUpdateData, SolverUpdateData, SolverUpdateType, SwitchApplcationState } from '../common/solver';
import { SwitchApplicationProcess, SwitchApplicationRunner } from './switch-application-runner';
import { OptionsFileHandler } from './options';
import path from 'node:path';

export interface Solver {
    id: string;
    scenario?: string;
    process: SwitchApplicationProcess;
}

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

    currentSolvers: Map<string, Solver> = new Map();

    async launchSolve() {
        const scenario = this.optionsFileHandler.selectedScenario;
        try {
            const solver = await this.switchApplication.launch(scenario ? 'solve-scenarios' : 'solve', scenario ? ['--scenario', scenario] : []);
            const solverId = `${scenario ?? 'default scenario'}-${this.solverIdCounter++}`;
            this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Started, id: solverId });
            this.watchSolver(solver, solverId);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }

    async solveAll() {
        const scenarios = await this.optionsFileHandler.getScenarios((await this.optionsFileHandler.getOptions())?.scenarioList!);
        const scenatioInfoPatter = new RegExp(/(running scenario|Skipping) (?<scenarioName>\S+)( because it was already run.)?/, 'g');

        const processId = `solve all-${this.solverIdCounter++}`;
        let runningScenario: string | undefined;
        const solver = await this.switchApplication.launch('solve-scenarios', []);
        this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Started, id:  processId, scenarios: scenarios?.map(s => s.scenarioName) });
        this.watchSolver(solver, processId);
        solver.onData(data => {
            const scenarioInfoMatches = data.matchAll(scenatioInfoPatter);
            for(const match of scenarioInfoMatches) {
                if(runningScenario) {
                    this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Scenario, id: processId, status: {scenario: runningScenario!, state: ScenarioState.Finished} });
                }
                if(match[0].startsWith('running')) {
                    runningScenario = match.groups?.scenarioName!;
                    this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Scenario, id: processId, status: {scenario: runningScenario!, state: ScenarioState.Running} });
                } else if (match[0].startsWith('Skipping')) {
                    runningScenario = undefined;
                    this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Scenario, id: processId, status: {scenario: match.groups?.scenarioName!, state: ScenarioState.Skipped} });
                }
            }
        });
        solver.onStateChange(() => {
            if(runningScenario) {
                this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Scenario, id: processId, status: {scenario: runningScenario!, state: ScenarioState.Finished} });
            }
        });
    }

    

    private async watchSolver(solver: SwitchApplicationProcess, solverId: string) {
        this.currentSolvers.set(solverId, solver);
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
                this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Finished, id: solverId }); // TODO results
            } else if (state === SwitchApplcationState.Error) {
                this.onSolveUpdateEmitter.fire({ type: SolverUpdateType.Error, id: solverId, error: solver.errors.join('\n') });
            }
        });

    }

    private readonly ComponentsContructedRegexp = /Constructed \d+ of \d+ components \(\d+%\)/;
    updateProgress(output: string, state: ProgressState): ProgressState {
        if (output.includes('Loading inputs...')) {
            return { progress: 1, step: output };
        } else if (output.includes('Constructing model instance from data and rules...')) {
            return { progress: 4, step: 'Constructing model...' };
        } else if (output.match(this.ComponentsContructedRegexp)) {
            return { progress: state.progress + 2, step: output.match(this.ComponentsContructedRegexp)?.[0] || '' };
        } else if (output.includes('Solving model...')) {
            return { progress: 25, step: 'Solving model...' };
        } else if (state.step === ('Solving model...')) {
            return { progress: Math.min(state.progress + 2, 95), step: 'Solving model...' };
        } else if (output.includes('Executing post-solve functions')) {
            return { progress: 96, step: output };
        };

        return state;
    }

    getSolvers() {
        return Array.from(this.currentSolvers.entries())
            .map(([id, solver]) => ({ id, state: solver.process.state, error: solver.process.errors.join('\n') }));
    }

    killSolver(id: string, dispose: boolean) {
        this.currentSolvers.get(id)?.process.kill();
        if (dispose) {
            this.currentSolvers.get(id)?.process.dispose();
            this.currentSolvers.delete(id);
        }
    }

    getSolverOuptut(id: string): string {
        return this.currentSolvers.get(id)?.process.output.join('\n') || '';
    }


    async cleanScenarioQueue(): Promise<void> {
        const scenarioQueuePath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'scenario_queue');
        try {
            await vscode.workspace.fs.delete(scenarioQueuePath, { recursive: true, useTrash: false });
            vscode.window.showInformationMessage(`Scenario queue cleaned`);
        } catch (e) {
            console.warn(`Could not delete scenario queue: ${e.message}`);
        }
    }
}
