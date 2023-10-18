import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Messenger } from "vscode-messenger-webview";
import { CellChanged, DocumentChanged, GetTable } from '../csv-viewer/messages';
import { TableData } from '../csv-viewer/table-data-provider';
import { VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow, VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react';
import { DataGridCell } from '@vscode/webview-ui-toolkit';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

const documentUri = (window as any).documentUri as string;

function CsvTableView() {
    const [tableData, setTableData] = React.useState<TableData | undefined>();
    React.useEffect(() => {
        messenger.sendRequest(GetTable, { type: 'extension'}, documentUri).then(setTableData);
        messenger.onNotification(DocumentChanged, e => {
            if(e.uri === documentUri) {
                // out of some weird reason the rerendering does not work correctly if we dont set this to undefined first
                // no idea what problem react has here
                setTableData(undefined); 
                setTableData(e.data);
            }
        });
    }, []);
    const grid = React.useRef<any>(undefined);
    const setRef = React.useCallback(node => { 
        if(node) {
            node.addEventListener('cell-focused', e => cellFocused(e, tableData!));
        }
        grid.current = node;    
    }, [tableData]);
    return tableData ? <div style={{overflow: 'auto', minWidth: 'max-content'}}>
        <VSCodeDataGrid ref={setRef}>
            <VSCodeDataGridRow rowType='header'>
                {tableData.headers.map((value, i) => <VSCodeDataGridCell key={i} cellType='columnheader' gridColumn={(i + 1).toString()}>
                        {value}
                    </VSCodeDataGridCell>)}
            </VSCodeDataGridRow>
            {tableData.rows.map((row, rowIndex) => 
                <VSCodeDataGridRow key={rowIndex}>
                    {row.map((value, i) => 
                    <VSCodeDataGridCell aria-rowindex={rowIndex} aria-colindex={i} key={i} gridColumn={(i + 1).toString()}>
                        {value}
                    </VSCodeDataGridCell>)}
                </VSCodeDataGridRow>)
            }
        </VSCodeDataGrid>
    </div> : <VSCodeProgressRing></VSCodeProgressRing>;
}

// code taken from https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/editable-data-grid/README.md
function cellFocused(e: Event, tableData: TableData) {
    const cell = e.target as DataGridCell;
    // Do not continue if `cell` is undefined/null or is not a grid cell
    if (!cell || cell.role !== "gridcell") {
        return;
    }
    // Do not allow data grid header cells to be editable
    if (cell.className === "column-header") {
        return;
    }

    // Note: Need named closures in order to later use removeEventListener
    // in the handleBlurClosure function
    const handleKeydownClosure = (e: KeyboardEvent) => {
        handleKeydown(e, cell, tableData);
    };
    const handleClickClosure = () => {
        setCellEditable(cell);
    };
    const handleBlurClosure = () => {
        syncCellChanges(cell, tableData);
        unsetCellEditable(cell);
        // Remove the blur, keydown, and click event listener _only after_
        // the cell is no longer focused
        cell.removeEventListener("blur", handleBlurClosure);
        cell.removeEventListener("keydown", handleKeydownClosure);
        cell.removeEventListener("mousedown", handleClickClosure);
    };
    cell.addEventListener("keydown", handleKeydownClosure);
    // Run the click listener once so that if a cell's text is clicked a
    // second time the cursor will move to the given position in the string
    // (versus reselecting the cell text again)
    cell.addEventListener("mousedown", handleClickClosure, { once: true });
    cell.addEventListener("blur", handleBlurClosure);
}

// Make a given cell editable
function setCellEditable(cell: DataGridCell) {
    console.log('set editable');
    cell.setAttribute("contenteditable", "true");
    // selectCellText(cell);
  }
  
// Handle keyboard events on a given cell
function handleKeydown(e: KeyboardEvent, cell: DataGridCell, tableData: TableData) {
    if (!cell.hasAttribute("contenteditable") || cell.getAttribute("contenteditable") === "false") {
        if (e.key === "Enter") {
            e.preventDefault();
            setCellEditable(cell);
        }
    } else {
        e.stopPropagation();
        if (e.key === "Enter" || e.key === "Escape") {
            syncCellChanges(cell, tableData);
            unsetCellEditable(cell);
        }
    }
}

// Make a given cell non-editable
function unsetCellEditable(cell: DataGridCell) {
    cell.setAttribute("contenteditable", "false");
    // deselectCellText();
}

function syncCellChanges(cell: DataGridCell, tableData: TableData) {
    const row = parseInt(cell.ariaRowIndex!);
    const column = parseInt(cell.ariaColIndex!);

    const originalValue = tableData.rows[row][column];
    const newValue = cell.innerText;

    if (originalValue.toString() !== newValue) {
        tableData.rows[row][column] = newValue;
        messenger.sendNotification(CellChanged, { type: 'extension'}, {
            uri: documentUri,
            row: tableData.headers ?  row + 1 : row,
            column,
            value: cell.innerText
        });
    }
  }


const main = document.getElementById('main')!;
ReactDOM.render(<CsvTableView></CsvTableView>, main);
