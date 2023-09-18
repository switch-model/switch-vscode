import * as React from 'react';
import * as ReactDOM from "react-dom";
import { VSCodeButton, VSCodeDropdown, VSCodeOption, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import { Messenger } from "vscode-messenger-webview";
import { GetOptions, SelectFile, SetOptions } from '../common/messages';
import { Button } from './components/button';
import { Layout } from './components/layout';
import { Label } from './components/label';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

function InputView(): React.JSX.Element {
    const [filePath, setFilePath] = React.useState('');
    const [create, setCreate] = React.useState(false);

    React.useEffect(() => {
        messenger.sendNotification(SetOptions, { type: 'extension' }, {
            name: 'inputsDir',
            params: filePath.length > 0 ? [filePath] : undefined
        });
    }, [filePath]);

    React.useEffect(() => {
        (async () => {
            const options = await messenger.sendRequest(GetOptions, { type: 'extension' });
            if (options?.inputsDir) {
                setFilePath(options.inputsDir);
            }
        })();
    }, []);

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
        <Button onClick={() => setCreate(true)}>Create</Button>
        {create && <Layout direction='vertical'>
            <hr className='opacity-25 my-2'></hr>
            <InputFolderPane close={() => setCreate(false)}/>
        </Layout>}
        <hr className='opacity-25 my-2'></hr>
        <Button>Validate</Button>
    </Layout>;
}

interface FolderPaneProps {
    close(): void;
}

const inputCreationOptions = [
    'PowerGenome',
    'PyPSA meets Earth',
    'Google Workbook',
    'Excel Workbook',
    'Python Script',
    'Switch Example'
];

function InputFolderPane(props: FolderPaneProps): React.JSX.Element {
    const [canClose, setCanClose] = React.useState(true);
    const [creationOption, setCreationOption] = React.useState(inputCreationOptions[0]);
    return <>
        <Label>Folder Location</Label>
        <VSCodeTextField
            className='grow m-1'
            placeholder='Select folder location'
        >
            <VSCodeButton slot="end" appearance="icon" title="Choose Folder" onClick={async () => {
                const selection = await messenger.sendRequest(SelectFile, {
                    type: 'extension'
                }, {
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false
                });
                const value = selection[0];
                if (value) {
                    console.log(value);
                }
            }}>
                <span className="codicon codicon-folder-opened"></span>
            </VSCodeButton>
        </VSCodeTextField>
        <Label>Create Using</Label>
        <Layout direction='horizontal'>
            <VSCodeDropdown className="grow m-1" value={creationOption} onChange={(e: any) => setCreationOption(e.target.value)}>
                {
                    inputCreationOptions.map(option => <VSCodeOption key={option}>{option}</VSCodeOption>)
                }
            </VSCodeDropdown>
            <Button className='grow-0'>Apply</Button>
        </Layout>
        <Button disabled={!canClose} onClick={() => props.close()}>Close</Button>
    </>;
}

const main = document.getElementById('main')!;
ReactDOM.render(<InputView />, main);
