import * as React from "react";
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

export interface ButtonProps extends React.PropsWithChildren {
    disabled?: boolean;
    title?: string;
    className?: string;
    onClick?: () => void;
}

export function Button(props: ButtonProps): React.JSX.Element {
    return <VSCodeButton {...props} className={'grow m-1 ' + (props.className ?? '')}></VSCodeButton>;
}
