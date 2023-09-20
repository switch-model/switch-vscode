import * as React from 'react';
import { Options } from '../../common/options';
import { Messenger } from 'vscode-messenger-webview';
import { GetFullOptions, GetOptions, OptionsUpdated } from '../../common/messages';

export function useDelayedEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
    const isInitialMount = React.useRef(true);
    React.useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            return effect();
        }
    }, deps);
}

export function optionsEffect(messenger: Messenger, cb: (options: Options | undefined) => void, full = true) {
    React.useEffect(() => {
        updateOptions(messenger, cb, full);
        messenger.onNotification(OptionsUpdated, () => updateOptions(messenger, cb, full));
    }, []);
}

async function updateOptions(messenger: Messenger, cb: (options: Options | undefined) => void, full: boolean): Promise<void> {
    const options = await messenger.sendRequest(full ? GetFullOptions : GetOptions, { type: 'extension' });
    cb(options);
}
