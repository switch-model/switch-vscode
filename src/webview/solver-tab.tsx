import { VSCodeButton, VSCodePanelTab, VSCodePanelView, VSCodePanels, VSCodeProgressRing, VSCodeTextArea } from '@vscode/webview-ui-toolkit/react';
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Messenger } from "vscode-messenger-webview";
import { GetSolverOutput, GetSolvers, KillSolver, SolverOutputUpdate, SolverUpdate } from '../common/messages';
import { SolverUpdateData, SolverUpdateType, SwitchApplcationState, SolverProcess, SolverOutputUpdateData } from '../common/solver';
import { Layout } from './components/layout';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

class RunningSolvers extends React.Component<{}, { solvers: SolverProcess[], activeSolverId?: string }> {

    private activeIndicatorStyle = new CSSStyleSheet();

    constructor(props: {}) {
        super(props);
        this.state = { solvers: [], activeSolverId: undefined };
        this.activeIndicatorStyle.replaceSync( `.activeIndicator { display: none }`);

    };

    async componentDidMount(): Promise<void> {
        messenger.sendRequest(GetSolvers, { type: 'extension' })
            .then((solvers: SolverProcess[]) => this.setState({ ...this.state, solvers }));

        // update tabs on solver start or updates
        messenger.onNotification(SolverUpdate, (data: SolverUpdateData) => {
            console.log('solver update ', data);
            const solvers = this.state.solvers;
            let activeSolverId = this.state.activeSolverId;
            const solverIndex = solvers.findIndex(solver => solver.id === data.id);
            switch (data.type) {
                case SolverUpdateType.Started:
                    activeSolverId = data.id;
                    solvers.push({ id: data.id, state: SwitchApplcationState.Running });
                    break;
                case SolverUpdateType.Progress:
                    solvers[solverIndex].progress = data.progress;
                    break;
                case SolverUpdateType.Finished:
                    solvers[solverIndex].state = SwitchApplcationState.Finished;
                    break;
                case SolverUpdateType.Error:
                    solvers[solverIndex].error = data.error;
                    solvers[solverIndex].state = SwitchApplcationState.Error;
                    break;
            }
            this.setState({ activeSolverId, solvers });
        });
    }

    componentDidUpdate(): void {
        // There is a bug in vscodePanels when dynamicly adding tabs that the active indicator is shown on the wrong tab
        // so we have to implement it our selfs
        (ReactDOM.findDOMNode(this) as HTMLElement).shadowRoot?.adoptedStyleSheets.push(this.activeIndicatorStyle);
    }

    render(): React.ReactNode {
        const { solvers, activeSolverId } = this.state;
        console.log('active Tab ' + activeSolverId ?? solvers[0].id);
        return solvers.length === 0 ?
            <div>No Current Solvers</div> :
            <VSCodePanels className='h-full' activeid={`tab-${activeSolverId ?? solvers[0].id}`}>
                {solvers.map((solver: SolverProcess, i) =>
                    <VSCodePanelTab id={'tab-' + solver.id} key={'tab-' + i} className={`border-b-2 ${activeSolverId === solver.id ? 'border-[var(--panel-tab-active-foreground)]' : 'border-[transparent]'}`}
                        onClick={() => this.setState({ ...this.state, activeSolverId: solver.id })}>
                        {solver.id}
                        <StatusIcon solver={solver} />
                        <VSCodeButton appearance='icon' title={solver.state === SwitchApplcationState.Running ? 'Kill' : 'Close'} onClick={() => {
                            // if its already killed this will only delete the solver
                            messenger.sendNotification(KillSolver, { type: 'extension' }, { id: solver.id, dispose: true });
                            solvers.splice(i, 1);
                            this.setState({ ...this.state, solvers });
                        }
                        }>
                            <span className="codicon codicon-close"></span>
                        </VSCodeButton>
                    </VSCodePanelTab>
                )}
                {solvers.map((solver: SolverProcess, i) =>
                    <VSCodePanelView id={'view-' + solver.id} key={'view-' + i} className='h-full'>
                        <Content solver={solver} />
                    </VSCodePanelView>
                )}
            </VSCodePanels>;
    }


}


interface ContentParams {
    solver: SolverProcess;
}

function Content(params: ContentParams) {
    switch (params.solver.state) {
        case SwitchApplcationState.Running: return <RunningContent {...params} />;
        case SwitchApplcationState.Finished: return <SuccessContent {...params} />;
        case SwitchApplcationState.Error: return <ErrorContent {...params} />;
    }
}

function RunningContent({ solver }: ContentParams) {
    return <Layout direction='vertical' className='w-full items-start'>
        <Layout direction='horizontal' className='gap-2 items-center grow-0'>
            <div className='w-[200px] h-[30px] border-2 border-[var(--vscode-input-border)]'>
                <div className='bg-[var(--button-primary-background)] h-full' style={{ width: `${(solver.progress ? solver.progress.progress : 0) * 2}px` }}></div>
            </div>
            <span>{solver.progress?.progress ?? 0}%</span>
            <VSCodeButton appearance='primary' title={'Kill'} onClick={() => messenger.sendNotification(KillSolver, { type: 'extension' }, { id: solver.id, dispose: false })}>
                <span>Kill</span>
            </VSCodeButton>
        </Layout>
        <span>{solver.progress?.step ?? 'Starting...'}</span>
        <hr className='opacity-25 my-2 w-full'></hr>
        <SolverOutput solver={solver} />
    </Layout>;
}

function SolverOutput({ solver }: ContentParams) {
    const [expanded, setExpanded] = React.useState<boolean>(false);
    const [output, setOutput] = React.useState<string>('');
    const consoleRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useEffect(() => {
        if (expanded) {
            messenger.sendRequest(GetSolverOutput, { type: 'extension' }, solver.id)
                .then((output: string) => setOutput(output));
        }
    }, [expanded]);
    React.useEffect(() => {
        messenger.onNotification(SolverOutputUpdate, (update: SolverOutputUpdateData) => {
            if (expanded && update.id === solver.id) {
                setOutput(output + '\n' + update.data);
            }
        });
    });
    React.useEffect(() => consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight));
    return <Layout direction='vertical' className='grow w-full'>
        <VSCodeButton appearance='icon' className='mb-4' onClick={() => setExpanded(!expanded)}>
            <div className='flex items-end gap-2'>
                <span>output</span>
                <span className={`codicon codicon-${expanded ? 'chevron-up' : 'chevron-down'}`}></span>
            </div>
        </VSCodeButton>
        {expanded && <textarea ref={consoleRef}
            className='h-full grow text-[var(--input-foreground)] bg-[var(--input-background)] p-2 resize-none'
            readOnly={true} value={output} rows={0}></textarea>}
    </Layout>;
}

function ErrorContent({ solver }: ContentParams) {
    return <div>
        <p className='text-error'>{solver.error}</p>
    </div>;
}

function SuccessContent({ solver }: ContentParams) {
    return <span>Solver finished successfully. See outputs folder for results</span>;
}

function StatusIcon({ solver }: { solver: SolverProcess }) {
    switch (solver.state) {
        case SwitchApplcationState.Running: return <VSCodeProgressRing className='ml-2 w-4' />;
        case SwitchApplcationState.Finished: return <span className="codicon codicon-check ml-2"></span>;
        case SwitchApplcationState.Error: return <span className="codicon codicon-error ml-2 text-error"></span>;
    }
}

document.body.parentElement!.style.height = '100%';
document.body.style.height = '100%';
const main = document.getElementById('main')!;
main.style.height = '100%';
ReactDOM.render(<RunningSolvers />, main);