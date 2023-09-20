import { Options } from "./options";

export type Scenario = Options & { scenarioName: string };

export function isScenario(options: Options): options is Scenario {
    return 'scenarioName' in options;
}
