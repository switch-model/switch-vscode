import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Messenger } from "vscode-messenger-webview";
import { GetModules, GetSearchPaths, SelectFile, UpdateModule } from '../common/messages';
import { Module, ModuleOption } from '../common/modules';
import { Layout } from './components/layout';
import { Label } from './components/label';
import { VSCodeButton, VSCodeCheckbox, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

function ModulesView() {
    const [searchPaths, setSearchPaths] = React.useState(['', 'C:\\Users\\johndoe\\Documents\\GitHub\\switch\\inputs', 'C:\\Users\\johndoe\\Documents\\GitHub\\switch\\modules']);
    const [modules, setModules] = React.useState([]);
    React.useEffect(() => {
        messenger.sendRequest(GetModules, {type: 'extension'}).then(setModules);
        messenger.sendRequest(GetSearchPaths, {type: 'extension'}).then(setSearchPaths);
    }, []);

    return <Layout direction='vertical'>
        <Label>Search Paths</Label>
        {searchPaths.map((path, i) => <SearchPath key={i} path={path}  index={i}
        onChange={(path) => {
            searchPaths[i] = path;
            setSearchPaths([...searchPaths]);
        }} 
        onDelete={() => {
            searchPaths.splice(i, 1);
            setSearchPaths([...searchPaths]);
        }}
        onMove={(from, to) => {
            searchPaths.splice(from < to ? to - 1 : to, 0, searchPaths.splice(from, 1)[0]);
            setSearchPaths([...searchPaths]);
        }}
        />)}
        <VSCodeButton className='w-fit self-end my-1' onClick={() => setSearchPaths([...searchPaths, ''])}>Add</VSCodeButton>

        <Label className='mt-[20px]'>Options</Label>
        {modules
            .filter(module => module.active && module.options)
            .flatMap(module => module.options)
            // TODO filter out shared options (duplicate names)
            .map((option, i) => <Option option={option} key={i}/>)}


        <Label className='mt-[20px]'>Found Modules</Label>
        {modules.map((module, i) => <FoundModule module={module} key={i}/>)}

        <hr className='opacity-25 my-2'></hr>
        <VSCodeButton onClick={() => {}}>Install Module...</VSCodeButton>

    </Layout>;
}

type SearchPathProps = {
    index: number;
    path: string;
    onDelete: () => void;
    onChange: (path: string) => void;
    onMove: (from: number, to: number) => void;
};

enum DragOverState {
    NONE,
    TOP,
    BOTTOM
}

const dragDropType = 'switch/searchpathindex';
function SearchPath({path, index, onDelete, onChange, onMove}: SearchPathProps) {
    const [dragOver, setDragOver] = React.useState<DragOverState>(DragOverState.NONE);
    return <>
    {dragOver === DragOverState.TOP && <div className='h-[2px] bg-blue-500 w-full'></div>}
    <div className='flex flex-row grow items-center'
        onDragOver={e => {
            if(e.dataTransfer.types.includes(dragDropType)) {
                e.preventDefault();
                setDragOver(e.nativeEvent.offsetY < e.currentTarget.clientHeight / 2 ? DragOverState.TOP : DragOverState.BOTTOM);
            }
        }}
        onDragLeave={e => setDragOver(DragOverState.NONE)}
        onDrop={e => {
            if(e.dataTransfer.types.includes(dragDropType)) {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData(dragDropType));
                const to = index + (dragOver === DragOverState.TOP ? 0 : 1);
                setDragOver(DragOverState.NONE);
                if(from !== to) {
                    onMove(from, to);
                }
            }
        }}>
        <span draggable className='codicon codicon-gripper py-1 cursor-move' 
            onDragStart={e => {
                e.dataTransfer.setData(dragDropType, index.toString());
                e.dataTransfer.setDragImage(e.currentTarget.parentElement!, 0, 0);
            }}
        ></span>
        <VSCodeTextField
            className='grow py-1'
            placeholder='default: inputs'
            value={path}
            onChange={(e: any) => ''}
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
                    onChange(selection[0]);
                }}>
                    <span className="codicon codicon-folder-opened"></span>
                </VSCodeButton>
                <VSCodeButton appearance="icon" title="Delete" onClick={() => onDelete()}>
                    <span className="codicon codicon-close"></span>
                </VSCodeButton>
            </div>
        </VSCodeTextField>
    </div>
    {dragOver === DragOverState.BOTTOM && <div className='h-[2px] bg-blue-500 w-full'></div>}
    </>;

}

type FoundModuleProps = {
    module: Module;
};

function FoundModule({module}: FoundModuleProps) { 
    const [expanded, setExpanded] = React.useState(false);
    return <Layout direction='vertical'>
        <Layout direction='horizontal'>
            <VSCodeButton appearance="icon" title="Expand" onClick={() => setExpanded(!expanded)}>
                <span className={`codicon codicon-${expanded ? 'chevron-down' : 'chevron-right'}`}></span>
            </VSCodeButton>
            <Label className=' grow'>{module.name}</Label>
            <VSCodeCheckbox checked={module.active} onChange={e => messenger.sendNotification(UpdateModule, {type: 'extension'})}></VSCodeCheckbox>
        </Layout>
        {expanded && <Label>{module.description}</Label>}
    </Layout>;
}

type OptionProps = {
    option: ModuleOption;
};

function Option({option}: OptionProps) {
    switch (typeof option.value) {
        case 'boolean':
            return <BooleanOption option={option}/>;
        case 'string':
            return <FilePathOption option={option}/>;
        case 'object':
            return <ComplexOption option={option}/>;
    }
}

function BooleanOption({option}: OptionProps) {
    return <Layout direction='horizontal'>
        <Label className='grow pr-1'>{option.name}</Label>
        <VSCodeCheckbox aria-describedby={`${option.name}-tooltip`}  checked={option.value as boolean}></VSCodeCheckbox>
        <span role='tooltip' id={`${option.name}-tooltip`}></span>
    </Layout>;
}

function FilePathOption({option}: OptionProps) {
    return <Layout direction='horizontal'>
        <Label className='grow pr-1'>{option.name}</Label>
        <VSCodeTextField value={option.value as string}>
            <div slot="end" className='flex align-items-center'>
                <VSCodeButton appearance="icon" title="Choose Folder" onClick={async () => {
                    option.value = await messenger.sendRequest(SelectFile, {
                            type: 'extension'
                        }, {
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false
                        })[0] ?? option.value;
                    }}>
                        <span className="codicon codicon-folder-opened"></span>
                </VSCodeButton>
            </div>
        </VSCodeTextField>
    </Layout>;
}

function ComplexOption({option}: OptionProps) {
    const entries = option.value as string[]; 
    return <Layout direction='vertical'>
        <Label className='grow pr-1'>{option.name}</Label>
        {entries.map((entry, i) => <Layout direction='horizontal'>
                <VSCodeTextField key={i} value={entry}></VSCodeTextField>
                <VSCodeButton appearance="icon" title="Delete" onClick={() => entries.splice(i, 1)}>
                    <span className="codicon codicon-close"></span>
                </VSCodeButton>
            </Layout>)}
    </Layout>;
}

const main = document.getElementById('main')!;
ReactDOM.render(<ModulesView/>, main);