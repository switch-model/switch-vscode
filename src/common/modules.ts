export interface ModuleOption {
    name: string
    action: 'Store' | 'StoreTrue' | 'StoreFalse' | 'StoreConst' | 'Extend';
    choices?: string[];
    default?: boolean | string | number | string[];
    value: boolean | string | string[] | undefined;
    help: string;
    nargs?: number | '+' | '*';
    dest: string;
} 

export interface Module {
    name: string;
    active: boolean;
    description: string;
}