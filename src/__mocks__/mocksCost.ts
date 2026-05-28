export const MockData = Array.from({ length: 30 }, (_, i) => {
  const stepNos = Array.from({ length: 30 }, (_, j) => 1040 + j)
    .sort(() => Math.random() - 0.5); // embaralha

  const step_no = stepNos[i];

  let cost = 100000;
  let duration = 0.25;

  if (step_no >= 1050 && step_no <= 1059) {
    cost = 200000;
    duration = 0.5;
  }

  if (step_no >= 1060) {
    cost = 300000;
    duration = 1;
  }

  return {
    _id: `mocked_${step_no}`,
    company_id: 375,
    asset_id: 54255447,
    version: 1,
    provider: "ypf",
    collection: "completion.plan.by.workstep",
    data: {
      well_name: "YPF.Nq.BdTN-74(h)",
      wellbore_id: "8otVcseeGd",
      well_id: "YBZaStmFy4",
      api_no: "AR0300040207",
      event_id: "8nK93",
      duration,
      cost,
      step_no,
    },
    timestamp: 1754620311,
    metadata: {
      source: {
        method: "mocked up data",
      },
    },
  };
});
