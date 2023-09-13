export interface Option {
    name: string;
    value: boolean | string | string[];
} 

export interface Module {
    name: string;
    active: boolean;
    description: string;
}