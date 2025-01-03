import * as React from 'react';
import * as ReactDOM from "react-dom";
import { VSCodeButton, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import { Messenger } from "vscode-messenger-webview";
import { CreateFolder, GetOptions, OptionsUpdated, SelectFile, SetMixedOptions } from '../common/messages';
import { Button } from './components/button';
import { Layout } from './components/layout';
import { Label } from './components/label';
import { optionsEffect, useDelayedEffect } from './components/effect';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

function OutputView(): React.JSX.Element {
    const [filePath, setFilePath] = React.useState('');

    useDelayedEffect(() => {
        messenger.sendNotification(SetMixedOptions, { type: 'extension' }, {
            name: 'outputsDir',
            params: filePath.length > 0 ? [filePath] : undefined
        });
    }, [filePath]);

    optionsEffect(messenger, options => {
        setFilePath(options?.outputsDir ?? '');
    });

    return <Layout direction='vertical'>
        <Label>Outputs Folder</Label>
        <Layout direction='horizontal'>
            <VSCodeTextField
                className='grow'
                placeholder='default: outputs'
                value={filePath}
                onChange={(e: any) => setFilePath(e.target.value)}
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
            <Button className='grow-0 ml-1' onClick={() => {
                messenger.sendNotification(CreateFolder, { type: 'extension' }, filePath);
            }}>New</Button>
        </Layout>
    </Layout>;
}

const main = document.getElementById('main')!;
ReactDOM.render(<OutputView />, main);
