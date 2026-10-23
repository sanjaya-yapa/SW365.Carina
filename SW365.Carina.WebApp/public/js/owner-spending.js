let ownerChart = null;

function ownerColour(id) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${(hash * 137.508) % 360}, 65%, 43%)`;
}

function renderOwnerSpending(report) {
  if (ownerChart) {
    ownerChart.destroy();
    ownerChart = null;
  }
  const section = document.getElementById('ownerReport');
  const canvas = document.getElementById('ownerSpendingChart');
  const status = document.getElementById('ownerChartStatus');
  section.hidden = false;
  canvas.hidden = true;
  document.getElementById('ownerSummary').textContent =
    `Total spending ${reportMoney(report.grand_total)}`;
  // Zero-value expenses remain in the details but do not form pie slices.
  const owners = report.owners.filter((owner) => Number(owner.total) > 0);
  status.className = 'text-muted';
  status.textContent = owners.length ? '' : 'No spending to display in the pie chart.';
  if (!owners.length) return;
  canvas.hidden = false;
  try {
    ownerChart = new window.Chart(canvas, {
      type: 'pie',
      data: {
        labels: owners.map((owner) => owner.owner_name),
        datasets: [
          {
            data: owners.map((owner) => Number(owner.total)),
            backgroundColor: owners.map((owner) => ownerColour(owner.owner_id)),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label(context) {
                const owner = owners[context.dataIndex];
                const share = ((Number(owner.total) / Number(report.grand_total)) * 100).toFixed(1);
                return `${owner.owner_name}: ${reportMoney(owner.total)} (${share}%)`;
              },
            },
          },
        },
      },
    });
  } catch (error) {
    canvas.hidden = true;
    status.className = 'text-danger';
    status.textContent = 'The pie chart could not be loaded. Owner totals are available below.';
  }
}
