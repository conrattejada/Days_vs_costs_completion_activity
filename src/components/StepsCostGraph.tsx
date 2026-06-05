import { useMemo } from 'react';
import { Text } from '@corva/ui/componentsV2';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import useCompletionWorksteps from '../hooks/useCompletionWorksteps';
import styles from './StepsCostGraph.scss';

const STAGE_SIZE = 10;
const INITIAL_STEP = 1040;

interface WorkStepCostItem {
	_id: string;
	data: {
		step?: number;
		step_no: number;
		planned_cost: number | null;
		planned_duration: number | null;
		actual_cost: number | null;
		actual_duration: number | null;
		time_from: number;
		time_to: number;
	};
}

interface StageGroup {
	stage: number;
	totalCost: number;
	totalDuration: number;
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
	if (stepNo < INITIAL_STEP) {
		return 1;
	}

	return Math.floor((stepNo - INITIAL_STEP) / STAGE_SIZE) + 1;
};

interface StepsCostGraphProps {
	assetId?: number;
	companyId?: number;
}

const StepsCostGraph = ({ assetId, companyId }: StepsCostGraphProps) => {
	const { workSteps, loading, error } = useCompletionWorksteps({
		asset_id: assetId,
		company_id: companyId,
		enabled: Boolean(assetId),
	});

	const normalizedWorkSteps = useMemo<WorkStepCostItem[]>(
		() =>
			workSteps
				.map(item => ({
					_id: item._id,
					data: {
						step: getStageFromStep(Number(item.data.step_no)) || 0,
						step_no: Number(item.data.step_no),
						planned_cost: item.data.planned_cost || 0,
						planned_duration: item.data.planned_duration || 0,
						actual_cost: (item.data.planned_cost || 0) + 5000,
						actual_duration: item.data.actual_duration || 0,
						time_from: item.data.time_from,
						time_to: item.data.time_to,
					},
				}))
				.filter(
					item =>
						Number.isFinite(item.data.step_no) &&
						Number.isFinite(item.data.time_from) &&
						Number.isFinite(item.data.time_to)
				),
		[workSteps]
	);


	const groupedData = useMemo<StageGroup[]>(() => {
		const groupedMap = normalizedWorkSteps.reduce<Map<number, StageGroup>>((acc, item) => {
			const stage = item.data.step;

			if (!stage || !Number.isFinite(stage) || stage < 1) {
				return acc;
			}

			const existingGroup = acc.get(stage);
			const itemCost = Number(item.data.actual_cost || 0);
			const itemDuration = Number(item.data.actual_duration || 0);

			if (!existingGroup) {
				acc.set(stage, {
					stage,
					totalCost: itemCost,
					totalDuration: itemDuration,
				});
				return acc;
			}

			existingGroup.totalCost += itemCost;
			existingGroup.totalDuration += itemDuration;

			return acc;
		}, new Map<number, StageGroup>());

		return Array.from(groupedMap.values()).sort((a, b) => a.stage - b.stage);
	}, [normalizedWorkSteps]);

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
				text: 'Stages x Cost (Step)',
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
						text: 'Stage',
					},
					reversed: true,
					allowDecimals: false,
					tickInterval: 1,
					min: 1,
					max: groupedData.length || undefined,
					gridLineWidth: 0,
				},
				{
					title: {
						text: 'Actual Cost',
					},
					opposite: true,
					gridLineWidth: 1,
					min: 0,
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
						? `Stage ${currentInterval.stage} | Duration ${Highcharts.numberFormat(currentInterval.totalDuration, 2)} | Cumulative Cost $${Highcharts.numberFormat(currentInterval.cumulativeCost, 0)}`
						: 'Out of range';
					const pointsHtml = (this.points || [])
						.map(point => {
							const value =
								point.series.name.includes('Cost')
									? `$${Highcharts.numberFormat(Number(point.y), 0)}`
									: Highcharts.numberFormat(Number(point.y), 0);
							return `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${value}</b>`;
						})
						.join('<br/>');

					return `<b>${intervalLabel}</b><br/>X: ${Highcharts.numberFormat(xValue, 2)}<br/>${pointsHtml}`;
				},
			},
			plotOptions: {
				series: {
					stickyTracking: false,
					findNearestPointBy: 'xy',
				},
			},
			series: [
				{
					type: 'line',
					name: 'Actual Cost',
					data: costHorizontalSeriesData,
					color: 'var(--palette-warning-main)',
					yAxis: 1,
					lineWidth: 3,
					marker: { enabled: false },
				},
				{
					type: 'line',
					name: 'Actual Cost transitions',
					data: costVerticalSeriesData,
					color: 'var(--palette-warning-main)',
					yAxis: 1,
					lineWidth: 3,
					dashStyle: 'ShortDot',
					marker: { enabled: false },
					showInLegend: false,
					enableMouseTracking: false,
				},
				{
					type: 'line',
					name: 'Stage',
					data: stageHorizontalSeriesData,
					color: 'var(--palette-info-main)',
					yAxis: 0,
					lineWidth: 2,
					marker: { enabled: false },
				},
				{
					type: 'line',
					name: 'Stage transitions',
					data: stageVerticalSeriesData,
					color: 'var(--palette-info-main)',
					yAxis: 0,
					lineWidth: 2,
					dashStyle: 'ShortDot',
					marker: { enabled: false },
					showInLegend: false,
					enableMouseTracking: false,
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

	if (!normalizedWorkSteps.length) {
		return (
			<div className={styles.stepsCostGraph}>
				<Text>{assetId ? 'No worksteps data found for this asset.' : 'Select a well to load data.'}</Text>
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
