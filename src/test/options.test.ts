import "reflect-metadata";

import { describe, expect, test } from 'vitest';
import { Options } from '../common/options';
import { getOptions, getScenarios } from '../system/options-parser';
import fs from 'fs';
import { Scenario } from "../common/scenarios";

describe('Parsing of options`', () => {

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

	test('should parse `scenarios.txt` correctly', async () => {
		const filePath = './src/test/resources/scenarios.txt';
		const content = await fs.promises.readFile(filePath, 'utf-8');
		expect(getScenarios(content)).toStrictEqual([
			<Scenario>{
				"demandResponseReserveTypes": "none",
				"demandResponseShare": 0,
				"evReserveTypes": "none",
				"evTiming": "bau",
				"inputsDir": "inputs/none",
				"outputsDir": "outputs/battery_bulk",
				"scenarioName": "battery_bulk",
			},
			<Scenario>{
				"demandResponseReserveTypes": "none",
				"demandResponseShare": 0,
				"evReserveTypes": "none",
				"evTiming": "bau",
				"inputsDir": "inputs/contingency",
				"outputsDir": "outputs/battery_bulk_and_conting",
				"scenarioName": "battery_bulk_and_conting",
			},
			<Scenario>{
				"demandResponseReserveTypes": "none",
				"demandResponseShare": 0,
				"evReserveTypes": "none",
				"evTiming": "bau",
				"inputsDir": "inputs/regulation",
				"outputsDir": "outputs/battery_bulk_and_reg",
				"scenarioName": "battery_bulk_and_reg",
			},
			<Scenario>{
				"demandResponseReserveTypes": "none",
				"demandResponseShare": 0.1,
				"evReserveTypes": "none",
				"evTiming": "optimal",
				"inputsDir": "inputs/regulation",
				"outputsDir": "outputs/dr_bulk",
				"scenarioName": "dr_bulk",
			},
			<Scenario>{
				"demandResponseReserveTypes": "regulation",
				"demandResponseShare": 0.1,
				"evReserveTypes": "regulation",
				"evTiming": "optimal",
				"inputsDir": "inputs/regulation",
				"outputsDir": "outputs/dr_bulk_and_reserves",
				"scenarioName": "dr_bulk_and_reserves",
			},
		]);
	});
});
