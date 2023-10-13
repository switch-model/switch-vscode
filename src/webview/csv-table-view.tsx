import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Messenger } from "vscode-messenger-webview";
import { GetTable } from '../csv-viewer/messages';
import { TableData } from '../csv-viewer/table-provider';
import { VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow, VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

const documentUri = (window as any).documentUri as string;

function CsvTableView() {
    const [tableData, setTableData] = React.useState<TableData | undefined>();
    React.useEffect(() => {
        messenger.sendRequest(GetTable, { type: 'extension'}, documentUri).then(setTableData);
    }, []);
    console.log(tableData);
    return tableData ? <div style={{overflow: 'auto', minWidth: 'max-content'}}>
        <VSCodeDataGrid>
            <VSCodeDataGridRow rowType='header'>
                {tableData.headers.map((value, i) => <VSCodeDataGridCell cellType='columnheader' gridColumn={(i + 1).toString()}>
                        {value}
                    </VSCodeDataGridCell>)}
            </VSCodeDataGridRow>
            {tableData.rows.map(row => 
                <VSCodeDataGridRow>
                    {row.map((value, i) => <VSCodeDataGridCell contentEditable={tableData.editable ? 'true' : 'false'} gridColumn={(i + 1).toString().toString()}>{value}</VSCodeDataGridCell>)}
                </VSCodeDataGridRow>)
            }
        </VSCodeDataGrid>
    </div> : <VSCodeProgressRing></VSCodeProgressRing>;
}

const main = document.getElementById('main')!;
ReactDOM.render(<CsvTableView></CsvTableView>, main);
