import { useMemo } from 'react';
import { Text } from '@corva/ui/componentsV2';
import { useAppCommons } from '@corva/ui/effects';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import useCompletionWorksteps from '../hooks/useCompletionWorksteps';
import styles from './StepsCostGraph.scss';

const INITIAL_STEP = 1040;
const STAGE_SIZE = 10;

interface WorkStepCostItem {
	_id: string;
	data: {
		step_no: number;
		cost: number | null;
		duration: number | null;
	};
}

interface StageGroup {
	stage: number;
	stageStart: number;
	stageEnd: number;
	totalCost: number;
	totalDuration: number;
	items: WorkStepCostItem[];
}

interface StageInterval {
	stage: number;
	start: number;
	end: number;
	totalCost: number;
	cumulativeCost: number;
	totalDuration: number;
}

const getStageFromStep = (stepNo: number): number => {
	return Math.floor((stepNo - INITIAL_STEP) / STAGE_SIZE) + 1;
};

const groupByStage = (items: WorkStepCostItem[]): StageGroup[] => {
	const groupedMap = items.reduce<Map<number, StageGroup>>((acc, item) => {
		const stepNo = item.data.step_no;
		const itemCost = item.data.cost ?? 0;
		const itemDuration = item.data.duration ?? 0;

		if (stepNo < INITIAL_STEP) {
			return acc;
		}

		const stage = getStageFromStep(stepNo);
		const existingGroup = acc.get(stage);

		if (!existingGroup) {
			const stageStart = INITIAL_STEP + (stage - 1) * STAGE_SIZE;
			const stageEnd = stageStart + STAGE_SIZE - 1;

			acc.set(stage, {
				stage,
				stageStart,
				stageEnd,
				totalCost: itemCost,
				totalDuration: itemDuration,
				items: [item],
			});

			return acc;
		}

		existingGroup.totalCost += itemCost;
		existingGroup.totalDuration += itemDuration;
		existingGroup.items.push(item);

		return acc;
	}, new Map<number, StageGroup>());

	return Array.from(groupedMap.values()).sort((a, b) => a.stage - b.stage);
};

const StepsCostGraph = () => {
	const { well } = useAppCommons();
	const asset_id = well?.asset_id;
	const { workSteps, loading, error } = useCompletionWorksteps({
		asset_id: 71448108,
		company_id: 375
	});
	console.log(workSteps)
	const normalizedWorkSteps = useMemo<WorkStepCostItem[]>(
		() =>
			workSteps
				.map(item => ({
					_id: item._id,
					data: {
						step_no: Number(item.data.step_no),
						cost: item.data.planned_cost,
						duration: item.data.planned_duration,
					},
				}))
				.filter(item => Number.isFinite(item.data.step_no)),
		[workSteps]
	);

	const groupedData = useMemo(() => groupByStage(normalizedWorkSteps), [normalizedWorkSteps]);

	const chartOptions = useMemo<Highcharts.Options>(() => {
		const stageHorizontalSeriesData: ([number, number] | null)[] = [];
		const stageVerticalSeriesData: ([number, number] | null)[] = [];
		const costHorizontalSeriesData: ([number, number] | null)[] = [];
		const costVerticalSeriesData: ([number, number] | null)[] = [];
		const intervals: StageInterval[] = [];
		let cumulativeDuration = 0;
		let cumulativeCost = 0;

		groupedData.forEach((item, index) => {
			const start = cumulativeDuration;
			const end = cumulativeDuration + item.totalDuration;
			const stageCumulativeCost = cumulativeCost + item.totalCost;
			const nextItem = groupedData[index + 1];

			stageHorizontalSeriesData.push([start, item.stage], [end, item.stage], null);
			costHorizontalSeriesData.push([start, stageCumulativeCost], [end, stageCumulativeCost], null);

			if (nextItem) {
				const nextStageCumulativeCost = stageCumulativeCost + nextItem.totalCost;
				stageVerticalSeriesData.push([end, item.stage], [end, nextItem.stage], null);
				costVerticalSeriesData.push([end, stageCumulativeCost], [end, nextStageCumulativeCost], null);
			}

			intervals.push({
				stage: item.stage,
				start,
				end,
				totalCost: item.totalCost,
				cumulativeCost: stageCumulativeCost,
				totalDuration: item.totalDuration,
			});

			cumulativeDuration = end;
			cumulativeCost = stageCumulativeCost;
		});

		return {
			chart: {
				type: 'line',
				height: null,
				zoomType: 'x',
				backgroundColor: 'var(--palette-background-b-6)',
			},
			title: {
				text: 'Steps x Cost (Step)',
			},
			xAxis: {
				title: {
					text: 'Duration (cumulative)',
				},
				min: 0,
				max: cumulativeDuration,
			},
			yAxis: [
				{
					title: {
						text: 'Step',
					},
					reversed: true,
					allowDecimals: false,
					tickInterval: 1,
					min: 1,
					gridLineWidth: 0,
				},
				{
					title: {
						text: 'Total Cost',
					},
					opposite: true,
					gridLineWidth: 1,
					labels: {
						formatter() {
							return `$${Highcharts.numberFormat(Number(this.value), 0)}`;
						},
					},
				},
			],
			tooltip: {
				shared: true,
				formatter() {
					const xValue = Number(this.x);
					const currentInterval = intervals.find(
						interval => xValue >= interval.start && xValue <= interval.end
					);
					const intervalLabel = currentInterval
						? `Step ${currentInterval.stage} | Duration ${Highcharts.numberFormat(currentInterval.totalDuration, 2)} | Cumulative Cost $${Highcharts.numberFormat(currentInterval.cumulativeCost, 0)}`
						: 'Out of range';
					const pointsHtml = (this.points || [])
						.map(point => {
							const value =
								point.series.name === 'Total Cost'
									? `$${Highcharts.numberFormat(Number(point.y), 0)}`
									: Highcharts.numberFormat(Number(point.y), 0);
							return `<span style=\"color:${point.color}\">●</span> ${point.series.name}: <b>${value}</b>`;
						})
						.join('<br/>');

					return `<b>${intervalLabel}</b><br/>X: ${Highcharts.numberFormat(xValue, 2)}<br/>${pointsHtml}`;
				},
			},
			series: [
				{
					type: 'line',
					name: 'Total Cost',
					data: costHorizontalSeriesData,
					color: 'var(--palette-warning-main)',
					yAxis: 1,
					lineWidth: 3,
					marker: {
						enabled: false,
					},
				},
				{
					type: 'line',
					name: 'Total Cost transitions',
					data: costVerticalSeriesData,
					color: 'var(--palette-warning-main)',
					yAxis: 1,
					lineWidth: 3,
					dashStyle: 'ShortDot',
					showInLegend: false,
					enableMouseTracking: false,
					marker: {
						enabled: false,
					},
				},
				{
					type: 'line',
					name: 'Step',
					data: stageHorizontalSeriesData,
					color: 'var(--palette-info-main)',
					yAxis: 0,
					lineWidth: 2,
					marker: {
						enabled: false,
					},
				},
				{
					type: 'line',
					name: 'Step transitions',
					data: stageVerticalSeriesData,
					color: 'var(--palette-info-main)',
					yAxis: 0,
					lineWidth: 2,
					dashStyle: 'ShortDot',
					showInLegend: false,
					enableMouseTracking: false,
					marker: {
						enabled: false,
					},
				},
			],
			legend: {
				enabled: true,
			},
			credits: {
				enabled: false,
			},
		};
	}, [groupedData]);

	if (loading) {
		return (
			<div className={styles.stepsCostGraph}>
				<Text>Loading worksteps...</Text>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.stepsCostGraph}>
				<Text>Failed to load worksteps data.</Text>
			</div>
		);
	}

	if (!groupedData.length) {
		return (
			<div className={styles.stepsCostGraph}>
				<Text>No worksteps data found for this asset.</Text>
			</div>
		);
	}

	return (
		<div className={styles.stepsCostGraph}>
			<div className={styles.chartWrapper}>
				<HighchartsReact
					highcharts={Highcharts}
					options={chartOptions}
					containerProps={{ className: styles.chartContainer }}
				/>
			</div>
		</div>
	);
};

export default StepsCostGraph;
