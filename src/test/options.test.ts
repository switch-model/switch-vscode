import { describe, expect, test } from 'vitest';
import { Options, getOptions } from '../common/options';

describe('Parsing of `options.txt`', () => {

    test('should parse `options.txt` correctly', async () => {
		const filePath = './src/test/resources/options.txt';
		expect(getOptions(filePath)).toStrictEqual(<Options>{
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
		});
	});
});
