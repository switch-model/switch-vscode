import * as React from 'react';
import * as ReactDOM from "react-dom";
import { VSCodeButton, VSCodeDropdown, VSCodeOption, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import { Messenger } from "vscode-messenger-webview";
import { CreateFolder, SelectFile, SetMixedOptions } from '../common/messages';
import { Button } from './components/button';
import { Layout } from './components/layout';
import { Label } from './components/label';
import { optionsEffect, useDelayedEffect } from './components/effect';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

function InputView(): React.JSX.Element {
    const [filePath, setFilePath] = React.useState('');
    const [create, setCreate] = React.useState(false);
    const [creationOption, setCreationOption] = React.useState(inputCreationOptions[0]);

    useDelayedEffect(() => {
        messenger.sendNotification(SetMixedOptions, { type: 'extension' }, {
            name: 'inputsDir',
            params: filePath.length > 0 ? [filePath] : undefined
        });
    }, [filePath]);

    optionsEffect(messenger, options => {
        setFilePath(options?.inputsDir ?? '');
    });

    return <Layout direction='vertical'>
        <Label>Inputs Folder</Label>
        <Layout direction='horizontal'>
            <VSCodeTextField
                className='grow m-1'
                placeholder='default: inputs'
                value={filePath}
                onChange={(e: any) => {
                    setFilePath(e.target.value);
                }}
            >
                <div slot="end" className='flex align-items-center'>
                    <VSCodeButton appearance="icon" title="Choose Folder" onClick={async () => {
                        const selection = await messenger.sendRequest(SelectFile, {
                            type: 'extension'
                        }, {
                            canSelectFiles: false,
                            canSelectFolders: true,
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
        </Layout>
        <Button onClick={() => setCreate(!create)}>{create ? 'Close' : 'Create'}</Button>
        {create && <Layout direction='vertical'>
            <hr className='opacity-25 my-2'></hr>
            <Label>Create Using</Label>
            <Layout direction='horizontal'>
                <VSCodeDropdown className="grow m-1" value={creationOption} onChange={(e: any) => setCreationOption(e.target.value)}>
                    {
                        inputCreationOptions.map(option => <VSCodeOption key={option}>{option}</VSCodeOption>)
                    }
                </VSCodeDropdown>
                <Button className='grow-0' onClick={() => {
                    messenger.sendNotification(CreateFolder, { type: 'extension' }, filePath);
                }}>Create</Button>
            </Layout>
        </Layout>}
        <hr className='opacity-25 my-2'></hr>
        <Button>Validate</Button>
    </Layout>;
}

const inputCreationOptions = [
    'PowerGenome',
    'PyPSA meets Earth',
    'Google Workbook',
    'Excel Workbook',
    'Python Script',
    'Switch Example'
];

const main = document.getElementById('main')!;
ReactDOM.render(<InputView />, main);
