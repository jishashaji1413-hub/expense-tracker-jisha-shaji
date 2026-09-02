let chartInstance = null;

const CHART_COLORS = [
  "#6b3b4e",
  "#d9a441",
  "#4b6b4a",
  "#3d5a73",
  "#8a5a8f",
  "#a06a35",
  "#4f7d78",
  "#7a4a4a",
  "#5c6b4e",
];

export function getExpenseCategoryTotals(transactions) {
  const expenses = transactions.filter((entry) => entry.type === "expense");
  return expenses.reduce((totals, entry) => {
    totals[entry.category] = (totals[entry.category] || 0) + entry.amount;
    return totals;
  }, {});
}

export function renderCategoryChart(canvas, transactions) {
  const categoryTotals = getExpenseCategoryTotals(transactions);
  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (labels.length === 0) return false;

  chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderColor: "#fffdf8",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "Space Grotesk, sans-serif" }, padding: 14 },
        },
      },
    },
  });

  return true;
}