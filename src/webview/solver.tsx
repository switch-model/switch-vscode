import * as React from 'react';
import * as ReactDOM from "react-dom";

import { Messenger } from "vscode-messenger-webview";
import { VSCodeButton, VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react';
import { Layout } from './components/layout';
import { CleanScenarioQueue, Solve, SolveAll } from '../common/messages';


const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

function SolverView() {

    React.useEffect(() => {
        // get scenarios and default scenario
    }, []);
    return <Layout direction='vertical'>
        <VSCodeButton className='m-4' title="Solve" onClick={() => {
            messenger.sendNotification(Solve, {type: 'extension'});
        }}>Solve</VSCodeButton>

        <hr className='opacity-25 my-2'></hr>

        <VSCodeButton className='m-4' title="Solve All" onClick={() => {
            messenger.sendNotification(SolveAll, {type: 'extension'});
        }}>Solve All Scenarios</VSCodeButton>
        <VSCodeButton appearance='secondary' className='m-4' title="Clean Scenario Queue" onClick={() => {
            messenger.sendNotification(CleanScenarioQueue, {type: 'extension'});
        }}>Clean Scenario Queue</VSCodeButton>
    </Layout>;
}


const main = document.getElementById('main')!;
ReactDOM.render(<SolverView />, main);
