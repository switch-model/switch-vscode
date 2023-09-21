import * as React from 'react';
import * as ReactDOM from "react-dom";
import { VSCodeButton, VSCodeCheckbox, VSCodeDropdown, VSCodeOption, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import { Messenger } from "vscode-messenger-webview";
import { CreateFile, GetScenarios, OptionsSetter, SelectFile, SelectScenario, SetOptions, SetScenarioOptions, SetScenariosPath } from '../common/messages';
import { Button } from './components/button';
import { Layout } from './components/layout';
import { Scenario } from '../common/scenarios';
import { optionsEffect, useDelayedEffect } from './components/effect';
import { Options } from '../common/options';
import { NotificationType } from 'vscode-messenger-common';
import { Label } from './components/label';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

function ScenarioView(): React.JSX.Element {
    const [filePath, setFilePath] = React.useState('');
    const [options, setOptions] = React.useState<Options | undefined>(undefined);
    const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = React.useState<string | undefined>(undefined);

    function getSelectedScenario(): Scenario | undefined {
        return scenarios.find(e => e.scenarioName === selectedScenario);
    }

    useDelayedEffect(() => {
        messenger.sendRequest(SetScenariosPath, { type: 'extension' }, filePath).then(scenarios => {
            setScenarios(scenarios ?? []);
        });
    }, [filePath]);

    React.useEffect(() => {
        messenger.sendNotification(SelectScenario, { type: 'extension' }, selectedScenario);
    }, [selectedScenario]);

    optionsEffect(messenger, (options) => {
        setOptions(options);
        setFilePath(options?.scenarioList ?? '');
        messenger.sendRequest(GetScenarios, { type: 'extension' }, options?.scenarioList).then(scenarios => {
            setScenarios(scenarios ?? []);
        });
    }, false);

    return <Layout direction='vertical'>
        <Layout direction='horizontal'>
            <VSCodeTextField
                className='grow m-1'
                placeholder='default: scenarios.txt'
                value={filePath}
                onChange={(e: any) => setFilePath(e.target.value)}
            >
                <div slot="end" className='flex align-items-center'>
                    <VSCodeButton appearance="icon" title="Choose File" onClick={async () => {
                        const selection = await messenger.sendRequest(SelectFile, {
                            type: 'extension'
                        }, {
                            canSelectFiles: true,
                            canSelectFolders: false,
                            canSelectMany: false
                        });
                        const value = selection[0];
                        if (value) {
                            setFilePath(value);
                        }
                    }}>
                        <span className="codicon codicon-folder-opened"></span>
                    </VSCodeButton>
                    <VSCodeButton appearance="icon" title="Clear Selection" onClick={() => setFilePath('')}>
                        <span className="codicon codicon-clear-all"></span>
                    </VSCodeButton>
                </div>
            </VSCodeTextField>
            <Button className='grow-0' onClick={() => {
                messenger.sendNotification(CreateFile, { type: 'extension' }, filePath);
            }}>New</Button>
        </Layout>
        <VSCodeDropdown
            className='grow m-1 mt-2'
            onChange={(event) => setSelectedScenario(event.target.value === '(base)' ? undefined : event.target.value)}
        >
            <VSCodeOption key='(base)'>(base)</VSCodeOption>
            {scenarios.map((scenario) => (
                <VSCodeOption
                    key={scenario.scenarioName}
                    value={scenario.scenarioName}
                >
                    {scenario.scenarioName}
                </VSCodeOption>
            ))}
        </VSCodeDropdown>
        <div className='flex justify-center'>
            {
                selectedScenario === undefined
                    ? "Options chosen below will be applied to all scenarios."
                    : "Options chosen below will be added to the base settings when running scenario."
            }
        </div>
        <OptionsPanel options={options} scenario={getSelectedScenario()} />
    </Layout>;
}

let optionsChangeEnabled = false;

function OptionsPanel({ scenario, options }: { scenario?: Scenario, options?: Options }): React.JSX.Element {
    const actualOptions = scenario ?? options;
    function setValue(name: string, params?: string[]) {
        if (optionsChangeEnabled) {
            let method: NotificationType<OptionsSetter> | undefined;
            if (scenario) {
                method = SetScenarioOptions;
            } else if (options) {
                method = SetOptions;
            }
            if (method) {
                messenger.sendNotification(method, { type: 'extension' }, {
                    name,
                    params
                });
            }
        }
    }
    optionsChangeEnabled = false;
    setTimeout(() => {
        optionsChangeEnabled = true;
    }, 30);
    return <Layout direction='vertical'>
        <Label>Inputs Directory</Label>
        <VSCodeTextField className='m-1' value={actualOptions?.inputsDir ?? ''} onChange={e => setValue('inputsDir', e.target.value)}></VSCodeTextField>
        <Label>Outputs Directory</Label>
        <VSCodeTextField className='m-1' value={actualOptions?.outputsDir ?? ''} onChange={e => setValue('outputsDir', e.target.value)}></VSCodeTextField>
        <VSCodeCheckbox className='mx-1' checked={actualOptions?.verbose ?? false} onChange={e => setValue('verbose', e.target.checked ? [] : undefined)}>Verbose</VSCodeCheckbox>
        <VSCodeCheckbox className='mx-1' checked={actualOptions?.streamSolver ?? false} onChange={e => setValue('streamSolver', e.target.checked ? [] : undefined)}>Stream Solver</VSCodeCheckbox>
        <VSCodeCheckbox className='mx-1' checked={actualOptions?.sortedOutput ?? false} onChange={e => setValue('sortedOutput', e.target.checked ? [] : undefined)}>Sorted Output</VSCodeCheckbox>
        <VSCodeCheckbox className='mx-1' checked={actualOptions?.forceLngTier ?? true} onChange={e => setValue('forceLngTier', e.target.checked ? undefined : ['none'])}>Force LNG Tier</VSCodeCheckbox>
        <VSCodeCheckbox className='mx-1' checked={actualOptions?.unitContingency ?? false} onChange={e => setValue('unitContingency', e.target.checked ? [] : undefined)}>Unit Contigency</VSCodeCheckbox>
        <Label>Solver</Label>
        <VSCodeTextField className='m-1' value={actualOptions?.solver ?? ''} onChange={e => setValue('solver', e.target.value)}></VSCodeTextField>
        <Label>RPS Allocation</Label>
        <VSCodeTextField className='m-1' value={actualOptions?.rpsAllocation ?? ''} onChange={e => setValue('rpsAllocation', e.target.value)}></VSCodeTextField>
        <Label>Spinning Requirement Rule</Label>
        <VSCodeTextField className='m-1' value={actualOptions?.spinningRequirementRule ?? ''} onChange={e => setValue('spinningRequirementRule', e.target.value)}></VSCodeTextField>
        <Label>EV Timing</Label>
        <VSCodeTextField className='m-1' value={actualOptions?.evTiming ?? ''} onChange={e => setValue('evTiming', e.target.value)}></VSCodeTextField>
    </Layout>;
}

const main = document.getElementById('main')!;
ReactDOM.render(<ScenarioView />, main);
