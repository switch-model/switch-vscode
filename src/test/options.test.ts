import "reflect-metadata";

import { describe, expect, test } from 'vitest';
import { Options } from '../common/options';
import { getOptions } from '../system/options-parser';
import fs from 'fs';


describe('Parsing of `options.txt`', () => {

    test('should parse `options.txt` correctly', async () => {
        const filePath = './src/test/resources/options.txt';
        const content = await fs.promises.readFile(filePath, 'utf-8');
		expect(getOptions(content)).toStrictEqual(<Options>{
			"contingencyReserveType": "contingency",
			"demandResponseReserveTypes": "regulation",
			"demandResponseShare": 0.1,
			"evReserveTypes": "regulation",
			"forceLngTier": false,
			"inputsDir": "inputs/regulation",
			"regulatingReserveType": "regulation",
			"rpsAllocation": "fuel_switch_by_period",
			"solver": "gurobi",
			"solverOptionsString": {
				"mipgap": 0.01,
				"threads": 1,
			},
			"sortedOutput": true,
			"spinningRequirementRule": "Hawaii",
			"streamSolver": true,
			"unitContingency": true,
			"verbose": true,
			"includeModules": ["switch_model.hawaii.smooth_dispatch"],
			"moduleSearchPath": ["path1", "path2", "path3"]
		});
	});
});
