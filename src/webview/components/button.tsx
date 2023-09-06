import * as React from "react";
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

export function Button(props: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>): React.JSX.Element {
    return <VSCodeButton {...props} className={'grow m-1 ' + (props.className ?? '')}></VSCodeButton>;
}
