import { EmbeddedActionsParser, Lexer, createToken } from 'chevrotain';
import { Options } from '../common/options';
import { Scenario, isScenario } from '../common/scenarios';
import _ from 'lodash';

type OptionParser = {
    canHandle: string[] | ((option: string) => boolean);
    parse: (options: Options, name: string, params: string[]) => void;
};

const optionTypes = <OptionParser[]>[
    { canHandle: ['verbose', 'streamSolver', 'sortedOutput', 'unitContingency'], parse: (options, name) => options[name] = true }, // true
    { canHandle: ['forceLngTier'], parse: (options, name) => options[name] = false }, // false 
    { canHandle: ['demandResponseShare'], parse: (options, name, params) => options[name] = +params[0] }, // number
    { canHandle: ['solverOptionsString'], parse: (options, name, params) => parseQuotedOptionsString(params, options) }, // solverOptionsString
    { canHandle: ['moduleList', 'includeModules', 'excludeModules', 'moduleSearchPath'], parse: (options, name, params) => options[name] = params }, // list of strings 
    { canHandle: () => true, parse: (options, name, params) => options[name] = params[0] }, // string. default option type
];

function parseQuotedOptionsString(params: string[], options: Options) {
    let solverOptionsString: any = {};
    const nameToParam = params.map(param => param.replace(`'`, '').split('='));
    for (const [paramName, value] of nameToParam) {
        const normParamName = _.lowerCase(paramName).split(' ').join('');
        solverOptionsString[normParamName] = (normParamName !== 'primalopt' ? +value : value);
    }
    Object.assign(options, { solverOptionsString });
}

export function getOptions(content: string, offset?: number): Options {
    const optionsInStr = parseOptions(content, offset);

    let resOptions: Options = {};
    for (const option of optionsInStr.options) {
        const name = _.camelCase(option.name.substring(2)) as keyof Options;
        const params = option.values;
        optionTypes.find(optionType => typeof optionType.canHandle === 'function' ?
            optionType.canHandle(name) :
            optionType.canHandle.includes(name)
        )?.parse(resOptions, name, params.map(e => e.value));
    }
    return resOptions;
}

export function getScenarios(content: string): Scenario[] {
    const lines = content.split('\n');
    let offset = 0;
    const scenarios: Scenario[] = [];
    for (const line of lines) {
        const scenarioOptions = getOptions(line, offset);
        if (isScenario(scenarioOptions)) {
            scenarios.push(scenarioOptions);
        }
        offset += line.length + 1;
    }
    return scenarios;
}

export function setScenarioOption(content: string, scenarioName: string, optionName: string, params?: string[]): string {
    const lines = content.split('\n');
    let offset = 0;
    for (const line of lines) {
        const scenarioOptions = parseOptions(line, offset);
        if (scenarioOptions.options.find(e => e.name === '--scenario-name' && e.values[0]?.value === scenarioName)) {
            return setOptionInternal(scenarioOptions, content, optionName, params, { newline: false, offset: offset + line.trimEnd().length });
        }
        offset += line.length + 1;
    }
    return content;
}

interface SetOptionsConfig {
    newline?: boolean
    offset?: number
}

export function setOption(content: string, name: string, params?: string[]): string {
    const options = parseOptions(content);
    return setOptionInternal(options, content, name, params, { newline: true });
}

export function setOptionInternal(options: InternalOptions, content: string, name: string, params: string[] | undefined, config: SetOptionsConfig): string {
    const optionName = '--' + _.kebabCase(name);
    let append = true;
    const contentOffset = config.offset === undefined ? content.length : config.offset;
    let start = contentOffset;
    let end = contentOffset;
    for (const option of options.options) {
        if (option.name === optionName) {
            start = option.offset;
            end = option.end;
            append = false;
            break;
        }
    }
    const escapedParameters = params?.map(e => escapeOptionsValue(e)) || [];
    const optionContent = params ? [optionName, ...escapedParameters].join(' ') : '';
    let insert = '';
    if (append && optionContent) {
        if (config?.newline) {
            if (content.charAt(contentOffset - 1) !== '\n') {
                insert = (content.includes('\r\n') ? '\r\n' : '\n');
            } else {
                start += 1;
                end += 1;
            }
        } else {
            if (content.charAt(contentOffset) !== ' ') {
                insert = ' ';
            } else {
                start += 1;
                end += 1;
            }
        }
    }
    const startContent = content.substring(0, start);
    const endContent = content.substring(end);
    content = startContent + insert + optionContent + endContent;
    return content;
}

export function escapeOptionsValue(value: string): string {
    const delimiter = '"';
    // Escape the parameter if it contains a whitespace character
    if (value.includes(' ') || value.length === 0) {
        return `${delimiter}${value}${delimiter}`;
    } else {
        return value;
    }
}

export function parseOptions(text: string, offset?: number): InternalOptions {
    const lexerResult = optionsLexer.tokenize(text);
    parser.input = lexerResult.tokens;
    parser.offset = offset ?? 0;
    const parseResult = parser.options();
    return parseResult;
}

interface InternalOptions {
    options: OptionEntry[]
}

interface OptionEntry {
    offset: number
    end: number
    name: string
    values: OptionEntryValue[]
}

interface OptionEntryValue {
    value: string
    escaped: 0 | 1 | 2
}

const commentToken = createToken({
    name: 'COMMENT',
    group: Lexer.SKIPPED,
    pattern: /#[^\r\n]*/
});

const optionNameToken = createToken({
    name: 'OptionName',
    pattern: /--[\w-]*/
});

const stringToken = createToken({
    name: 'String',
    pattern: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/
});

const idToken = createToken({
    name: 'ID',
    pattern: /[^\s]+/
});

const WS = createToken({
    name: 'WS',
    group: Lexer.SKIPPED,
    pattern: /\s+/
});

const tokens = [WS, commentToken, optionNameToken, idToken, stringToken];

const optionsLexer = new Lexer(tokens, {
    positionTracking: 'full',
    recoveryEnabled: true
});

class OptionsParser extends EmbeddedActionsParser {

    offset = 0;

    constructor() {
        super(tokens, {
            recoveryEnabled: true
        });
        this.performSelfAnalysis();
    }

    options = this.RULE('options', () => {
        const options: OptionEntry[] = [];

        this.MANY(() => {
            const entry = this.SUBRULE(this.optionEntry);
            options.push(entry);
        });

        return {
            options
        } as InternalOptions;
    });

    optionEntry = this.RULE('optionEntry', () => {
        const name = this.CONSUME(optionNameToken);
        let end = name.endOffset!;
        const values: OptionEntryValue[] = [];
        this.MANY(() => {
            let escaped: 0 | 1 | 2 = 0;
            const value = this.OR([
                {
                    ALT: () => {
                        const stringText = this.CONSUME(stringToken);
                        end = stringText.endOffset!;
                        if (stringText.image) {
                            escaped = stringText.image.startsWith('"') ? 2 : 1;
                            return stringText.image.substring(1, stringText.image.length - 1);
                        } else {
                            return '';
                        }
                    }
                },
                {
                    ALT: () => {
                        const id = this.CONSUME(idToken);
                        end = id.endOffset!;
                        return id.image;
                    }
                }
            ]);
            values.push({
                escaped,
                value
            });
        });
        return {
            offset: name.startOffset + this.offset,
            end: end + 1 + this.offset,
            name: name.image,
            values
        } as OptionEntry;
    });

}

const parser = new OptionsParser();

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
