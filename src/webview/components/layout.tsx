import * as React from "react";

export interface LayoutProps extends React.PropsWithChildren {
    direction: 'vertical' | 'horizontal';
    className?: string;
}

export function Layout(props: LayoutProps): React.JSX.Element {
    return <div className={`${props.direction === 'vertical' ? 'flex flex-col' : 'flex flex-row grow'} ${props.className ?? ''}`}>{props.children}</div>;
}
