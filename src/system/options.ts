import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { Options, SolverOptionsString } from '../common/options';
import _ from 'lodash';
import { injectable } from 'inversify';

@injectable()
export class OptionsFileHandler {

    async getOptions(): Promise<Options | undefined> {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (workspace) {
            const uri = vscode.Uri.joinPath(workspace.uri, 'options.txt');
            try {
                return getOptions(uri.fsPath);
            } catch {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

}

export async function getOptions(filePath: string): Promise<Options> {
    const content = await fs.readFile(filePath, 'utf8');
    const optionsInStr = content
        .split(new RegExp('\n'))
        .filter(line => !line.startsWith('#'))
        .flatMap(line => line.split('--'))
        .filter(line => line !== '')
        .map(line => line.split(' '));
    
    let resOptions: Options = {};
    for (const option of optionsInStr) {
        const name = _.camelCase(option[0]) as keyof Options;
        const params = option.slice(1).filter(op => op !== '');
        if (isOption(name)) {
            if (isTrueOption(name)) {
                resOptions = {...resOptions, [name]: true };
            } else if (isFalseOption(name)) {
                resOptions = {...resOptions, [name]: false };
            } else if (isStringOption(name)) {
                resOptions = {...resOptions, [name]: params[0] };
            } else if (isNumberOption(name)) {
                resOptions = {...resOptions, [name]: +params[0] };
            } else if (name === 'solverOptionsString') {
                let solverOptionsString: SolverOptionsString = {};
                const nameToParam = params.map(param => param.replace(`'`, '').split('='));
                for (const [paramName, value] of nameToParam) {
                    const normParamName = _.lowerCase(paramName).split(' ').join('');
                    solverOptionsString = {...solverOptionsString,
                        [normParamName as keyof typeof solverOptionsString]: normParamName !== 'primalopt' ? +value : value
                    };
                }
                resOptions = {...resOptions, solverOptionsString };
            }
        } else {
            // We assume it's a string option
            resOptions = {...resOptions, [name]: params[0] };
        }
    }
    return resOptions;
}

function isOption(optionName: string): boolean {
    return isTrueOption(optionName)
        || isFalseOption(optionName)
        || isNumberOption(optionName)
        || isStringOption(optionName)
        || optionName === 'solverOptionsString';
}

function isTrueOption(optionName: string): boolean {
    return ['verbose', 'streamSolver', 'sortedOutput', 'unitContingency']
        .includes(optionName);
}

function isFalseOption(optionName: string): boolean {
    return ['forceLngTier']
        .includes(optionName);
}

function isNumberOption(optionName: string): boolean {
    return ['demandResponseShare']
        .includes(optionName);
}

function isStringOption(optionName: string): boolean {
    return ['solver', 'inputsDir', 'rpsAllocation', 'contingencyReserveType',
        'regulatingReserveType', 'demandResponseReserveTypes', 'evReserveTypes', 'spinningRequirementRule']
        .includes(optionName);
}


// -h, --help            show this help message and exit
// --skip-generic-output
//                       Skip exporting generic variable results
// --save-expressions SAVE_EXPRESSIONS [SAVE_EXPRESSIONS ...], --save-expression SAVE_EXPRESSIONS [SAVE_EXPRESSIONS ...]
//                       List of expressions to save in addition to variables;
//                       can also be 'all' or 'none'.
// --log-run             Log output to a file.
// --logs-dir LOGS_DIR   Directory containing log files (default is "logs"
// --log-level {error,warning,info,debug}
//                       Amount of detail to include in on-screen logging and
//                       log files. Default is "warning".
// --verbose             Equivalent to --log-level info
// --quiet               Equivalent to --log-level warning
// --debug               Automatically start pdb debugger when an error occurs
// --full-traceback      Show full Python traceback when an error occurs; can
//                       help to pinpoint the cause of errors.
// --module-list MODULE_LIST
//                       Text file with a list of modules to include in the
//                       model (default is "modules.txt")
// --include-modules INCLUDE_EXCLUDE_MODULES [INCLUDE_EXCLUDE_MODULES ...], --include-module INCLUDE_EXCLUDE_MODULES [INCLUDE_EXCLUDE_MODULES ...]
//                       Module(s) to add to the model in addition to any
//                       specified with --module-list file
// --exclude-modules INCLUDE_EXCLUDE_MODULES [INCLUDE_EXCLUDE_MODULES ...], --exclude-module INCLUDE_EXCLUDE_MODULES [INCLUDE_EXCLUDE_MODULES ...]
//                       Module(s) to remove from the model after processing
//                       --module-list file and prior --include-modules
//                       arguments
// --inputs-dir INPUTS_DIR
//                       Directory containing input files (default is "inputs")
// --iterate-list ITERATE_LIST
//                       Text file with a list of modules to iterate until
//                       converged (default is iterate.txt). Each row is one
//                       level of iteration, and there can be multiple modules
//                       on each row.
// --max-iter MAX_ITER   Maximum number of iterations to complete at each level
//                       for iterated models
// --scenario-name SCENARIO_NAME
//                       Name of research scenario represented by this model
// --sorted-output       Sort result files lexicographically. Otherwise results
//                       are written in the same order as the input data (with
//                       Pyomo 5.7+) or in random order (with earlier versions
//                       of Pyomo).
// --suffixes SUFFIXES [SUFFIXES ...], --suffix SUFFIXES [SUFFIXES ...]
//                       Extra suffixes to add to the model and exchange with
//                       the solver (e.g., iis, rc, dual, or slack)
// --solver SOLVER       Name of Pyomo solver to use for the model (default is
//                       "glpk")
// --solver-manager SOLVER_MANAGER
//                       Name of Pyomo solver manager to use for the model
//                       ("neos" to use remote NEOS server)
// --solver-io SOLVER_IO
//                       Method for Pyomo to use to communicate with solver
// --solver-options-string SOLVER_OPTIONS_STRING
//                       A quoted string of options to pass to the model
//                       solver. Each option must be of the form option=value.
//                       (e.g., --solver-options-string "mipgap=0.001
//                       primalopt='' advance=2 threads=1")
// --keepfiles           Keep temporary files produced by the solver (may be
//                       useful with --symbolic-solver-labels)
// --stream-output, --stream-solver
//                       Display information from the solver about its progress
//                       (usually combined with a suitable --solver-options-
//                       string)
// --no-stream-output, --no-stream-solver
//                       Don't display information from the solver about its
//                       progress
// --symbolic-solver-labels
//                       Use symbol names derived from the model when
//                       interfacing with the solver. See "pyomo solve
//                       --solver=x --help" for more details.
// --tempdir TEMPDIR     The name of a directory to hold temporary files
//                       produced by the solver. This is usually paired with
//                       --keepfiles and --symbolic-solver-labels.
// --retrieve-cplex-mip-duals
//                       Patch Pyomo's solver script for cplex to re-solve and
//                       retrieve dual values for mixed-integer programs.
// --input-alias INPUT_ALIASES [INPUT_ALIASES ...], --input-aliases INPUT_ALIASES [INPUT_ALIASES ...]
//                       List of input file substitutions, in form of
//                       standard_file.csv=alternative_file.csv, useful for
//                       sensitivity studies with alternative inputs.
// --outputs-dir OUTPUTS_DIR
//                       Directory to write output files (default is "outputs")
// --no-post-solve       Don't run post-solve code on the completed model
//                       (i.e., reporting functions).
// --reload-prior-solution
//                       Load a previously saved solution; useful for re-
//                       running post-solve code or interactively exploring the
//                       model (with --interact).
// --no-save-solution    Don't save solution after model is solved.
// --interact            Enter interactive shell after solving the instance to
//                       enable inspection of the solved model.
