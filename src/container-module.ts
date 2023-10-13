import { ContainerModule } from "inversify";
import { SwitchMessenger } from "./providers/messenger";
import { InputsViewProvider } from './providers/inputs';
import { ModulesViewProvider } from './providers/modules';
import { OutputsViewProvider } from './providers/outputs';
import { ScenarioViewProvider } from './providers/scenario';
import { SolverViewProvider } from './providers/solver';
import { OptionsFileHandler } from "./system/options";
import { SolverTabViewProvider } from "./providers/solver-tab";
import { Solvers } from "./system/solvers";
import { CsvViewProvider } from "./csv-viewer/csv-view-provider";

export default new ContainerModule(bind => {
    bind(SwitchMessenger).toSelf();
    bind(InputsViewProvider).toSelf();
    bind(ModulesViewProvider).toSelf();
    bind(OutputsViewProvider).toSelf();
    bind(ScenarioViewProvider).toSelf();
    bind(SolverViewProvider).toSelf();
    bind(SolverTabViewProvider).toSelf();
    bind(CsvViewProvider).toSelf();
    bind(OptionsFileHandler).toSelf();
});
