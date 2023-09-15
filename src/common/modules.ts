export interface ModuleOption {
    name: string;
    value: boolean | string | string[];
    description: string;
} 

export interface Module {
    name: string;
    active: boolean;
    description: string;
    options: ModuleOption[];
}