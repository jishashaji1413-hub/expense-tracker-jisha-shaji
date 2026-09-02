export function filterTransactions(transactions, { type, category }) {
  return transactions.filter((entry) => {
    const matchesType = type === "all" || entry.type === type;
    const matchesCategory = category === "all" || entry.category === category;
    return matchesType && matchesCategory;
  });
}

export function sortByDateDesc(transactions) {
  return [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getAllCategories(incomeCategories, expenseCategories) {
  return [...new Set([...incomeCategories, ...expenseCategories])].sort((a, b) =>
    a.localeCompare(b)
  );
}