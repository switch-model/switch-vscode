export interface ModuleOption {
    name: string
    action: string;
    choices?: string[];
    default?: boolean | string | string[];
    value: boolean | string | string[];
    help: string;
    nargs?: number | '+';
} 

export interface Module {
    name: string;
    active: boolean;
    description: string;
    options: ModuleOption[];
}