import _ from 'lodash';

export type Options = {
    verbose?: true,
    streamSolver?: true,
    sortedOutput?: true,
    solver?: string,
    solverOptionsString?: SolverOptionsString,
    inputsDir?: string,
    outputsDir?: string,
    forceLngTier?: false,
    rpsAllocation?: string,
    demandResponseShare?: number,
    contingencyReserveType?: ReserveTypes[],
    regulatingReserveType?: ReserveTypes[],
    demandResponseReserveTypes?: ReserveTypes[],
    evReserveTypes?: ReserveTypes[],
    unitContingency?: true,
    spinningRequirementRule?: string,

    moduleList?: string,
    includeModules?: string[],
    excludeModules?: string[],
    
    moduleSearchPath?: string[],
    scenarioList?: string,

    evTiming?: string,
};

export type SolverOptionsString = {
    mipgap?: number,
    threads?: number,
    primalopt?: string,
    advance?: number,
};

export type ReserveTypes = 'regulation' | 'contingency';
