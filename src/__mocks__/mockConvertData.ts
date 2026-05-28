import planOwData from './ejemplo_PLAN_OW.json';

interface PlanOwItem {
	well_id: string;
	event_id: string;
	wellbore_id: string;
	step_no: string | number;
	activity_duration?: number | null;
	target_duration?: number | null;
	costo?: number | null;
}

interface PlanOwResponse {
	items: PlanOwItem[];
}

export interface MockCostItem {
	_id: string;
	company_id: number;
	asset_id: number;
	version: number;
	provider: string;
	collection: string;
	data: {
		well_name: string;
		wellbore_id: string;
		well_id: string;
		api_no: string;
		event_id: string;
		duration: number;
		cost: number;
		step_no: number;
	};
	timestamp: number;
	metadata: {
		source: {
			method: string;
		};
	};
}

interface ConvertOptions {
	companyId?: number;
	assetId?: number;
	version?: number;
	provider?: string;
	collection?: string;
	wellName?: string;
	apiNo?: string;
	timestamp?: number;
}

const DEFAULT_OPTIONS: Required<ConvertOptions> = {
	companyId: 375,
	assetId: 54255447,
	version: 1,
	provider: 'ypf',
	collection: 'completion.plan.by.workstep',
	wellName: 'YPF.Nq.BdTN-74(h)',
	apiNo: 'AR0300040207',
	timestamp: 1754620311,
};

const toNumber = (value: unknown, fallback = 0): number => {
	const parsedValue = Number(value);

	return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export const convertPlanOwToMocksCost = (
	source: PlanOwResponse,
	options?: ConvertOptions
): MockCostItem[] => {
	const config = {
		...DEFAULT_OPTIONS,
		...options,
	};

	return (source.items || [])
		.filter(item => toNumber(item.step_no, 0) >= 1040)
		.map(item => ({
		_id: `mocked_${item.step_no}`,
		company_id: config.companyId,
		asset_id: config.assetId,
		version: config.version,
		provider: config.provider,
		collection: config.collection,
		data: {
			well_name: config.wellName,
			wellbore_id: item.wellbore_id,
			well_id: item.well_id,
			api_no: config.apiNo,
			event_id: item.event_id,
			duration: toNumber(item.activity_duration ?? item.target_duration, 0),
			cost: toNumber(item.costo, 0),
			step_no: toNumber(item.step_no, 0),
		},
		timestamp: config.timestamp,
		metadata: {
			source: {
				method: 'converted from plan_ow mock data',
			},
		},
		}));
};

export const MockDataFromPlanOw = convertPlanOwToMocksCost(planOwData as PlanOwResponse);

