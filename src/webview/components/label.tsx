import * as React from "react";

export interface LabelProps {
    children?: string;
    className?: string;
}

export function Label(props: LabelProps): React.JSX.Element {
    return <span className={'mt-1 opacity-75 ' + props.className} >{props.children}</span>;
}
