import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Messenger } from "vscode-messenger-webview";
import { GetModules, GetOptions, InstallModule, SelectFile, SetOptions, UpdateModule } from '../common/messages';
import { Module, ModuleOption } from '../common/modules';
import { Layout } from './components/layout';
import { Label } from './components/label';
import { VSCodeButton, VSCodeCheckbox, VSCodeProgressRing, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';

const vscode = acquireVsCodeApi();

const messenger = new Messenger(vscode, { debugLog: true });
messenger.start();

function ModulesView() {
    const [searchPaths, setSearchPaths] = React.useState<string[] | undefined>(undefined);
    const [modules, setModules] = React.useState<Module[] | undefined>(undefined);
    React.useEffect(() => {
        messenger.sendRequest(GetModules, { type: 'extension' }).then(setModules);
        messenger.sendRequest(GetOptions, { type: 'extension' }).then(options => setSearchPaths(options?.moduleSearchPath?.length ? options.moduleSearchPath : ['']));
    }, []);

    return <Layout direction='vertical'>
        <Label className='font-bold'>Search Paths</Label>
        {searchPaths ? searchPaths.map((path, i) => <SearchPath key={i} path={path} index={i}
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
        />) : <VSCodeProgressRing />}
        <VSCodeButton className='w-fit self-end my-1' onClick={() => setSearchPaths([...searchPaths || [], ''])}>Add</VSCodeButton>

        <Label className='mt-[20px] font-bold'>Options</Label>
        <table>
            {modules ? modules
                .filter(module => module.active && module.options)
                .flatMap(module => module.options)
                .filter((option, i, options) => options.findIndex(o => o.name === option.name) === i)
                .map((option, i) => <tr className='my-1' key={i}>
                    <td className={typeof option.value === 'object' ? 'align-top pt-[6px]' : ''}><Label className='grow'>{option.name.replace(/^-+/, '')}</Label></td>
                    <td><Option option={option} key={i} /></td>
                </tr>
                ) : <VSCodeProgressRing />}
        </table>


        <Label className='mt-[20px] font-bold'>Found Modules</Label>
        {modules ? modules.map((module, i) => <FoundModule module={module} key={i} />) : <VSCodeProgressRing />}

        <hr className='opacity-25 my-2'></hr>
        <VSCodeButton onClick={async () => {
            await messenger.sendRequest(InstallModule, { type: 'extension' });
            messenger.sendRequest(GetModules, { type: 'extension' }).then(setModules);
        }}>Install Module...</VSCodeButton>

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
function SearchPath({ path, index, onDelete, onChange, onMove }: SearchPathProps) {
    const [dragOver, setDragOver] = React.useState<DragOverState>(DragOverState.NONE);
    return <>
        {dragOver === DragOverState.TOP && <div className='h-[2px] bg-blue-500 w-full'></div>}
        <div className='flex flex-row grow items-center'
            onDragOver={e => {
                if (e.dataTransfer.types.includes(dragDropType)) {
                    e.preventDefault();
                    setDragOver(e.nativeEvent.offsetY < e.currentTarget.clientHeight / 2 ? DragOverState.TOP : DragOverState.BOTTOM);
                }
            }}
            onDragLeave={e => setDragOver(DragOverState.NONE)}
            onDrop={e => {
                if (e.dataTransfer.types.includes(dragDropType)) {
                    e.preventDefault();
                    const from = parseInt(e.dataTransfer.getData(dragDropType));
                    const to = index + (dragOver === DragOverState.TOP ? 0 : 1);
                    setDragOver(DragOverState.NONE);
                    if (from !== to) {
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
                className='grow py-1 mt-1'
                placeholder='Path'
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

function FoundModule({ module }: FoundModuleProps) {
    const [expanded, setExpanded] = React.useState(false);
    return <Layout direction='vertical'>
        <Layout direction='horizontal'>
            <VSCodeButton appearance="icon" title="Expand" onClick={() => setExpanded(!expanded)}>
                <span className={`codicon codicon-${expanded ? 'chevron-down' : 'chevron-right'}`}></span>
            </VSCodeButton>
            <Label className=' grow'>{module.name}</Label>
            <VSCodeCheckbox checked={module.active} onChange={e => messenger.sendNotification(UpdateModule, { type: 'extension' }, { ...module, active: e.target.checked })}></VSCodeCheckbox>
        </Layout>
        {expanded && <Label>{module.description}</Label>}
    </Layout>;
}

type OptionProps = {
    option: ModuleOption;
};

function Option({ option }: OptionProps) {
    if(!option.nargs || option.nargs === 0) {
        return <BooleanOption option={option} />;
    } else if(option.nargs === 1) {
        return <StringOption option={option} />;
    } else {
        return <ComplexOption option={option} />;
    }
}

function BooleanOption({ option }: OptionProps) {
    return <VSCodeCheckbox checked={(option.value ?? option.default ?? false) as boolean} onChange={e => onOptionChange(option, e.target.checked)}></VSCodeCheckbox>;
}

function StringOption({ option }: OptionProps) {
    return <VSCodeTextField className='w-full' value={(option.value ?? option.default ?? '') as string} onChange={e => onOptionChange(option, e.target.value)}>
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
    </VSCodeTextField>;
}

function ComplexOption({ option }: OptionProps) {
    const [entries, setEntries] = React.useState((option.value ?? option.default ?? []) as string[]);
    return <>
        {entries.map((entry, i) => <Layout direction='horizontal'>
            <VSCodeTextField className='grow' key={i} value={entry} onChange={e => {
                entries[i] = e.target.value;
                setEntries([...entries]);
                onOptionChange(option, entries);
            }} ></VSCodeTextField>
            <VSCodeButton appearance="icon" title="Delete" onClick={() => {
                entries.splice(i, 1);
                setEntries([...entries]);
                onOptionChange(option, entries);
            }}>
                <span className="codicon codicon-close"></span>
            </VSCodeButton>
        </Layout>)}
        <VSCodeButton appearance="icon" title="Add item" onClick={async () => {
            entries.push('');
            setEntries([...entries]);
            onOptionChange(option, entries);
        }}>
            <span className="codicon codicon-plus"></span>
        </VSCodeButton>

    </>;
}

function onOptionChange(option: ModuleOption, newValue: any) {
    option.value = newValue;
    messenger.sendNotification(SetOptions, { type: 'extension' }, { name: option.name, params: Array.isArray(newValue) ? newValue : [newValue.toString()] });
}

const main = document.getElementById('main')!;
ReactDOM.render(<ModulesView />, main);
