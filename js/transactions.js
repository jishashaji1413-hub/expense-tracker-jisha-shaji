export const INCOME_CATEGORIES = ["Salary", "Freelance", "Bonus", "Investment", "Other"];

export const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Rent",
  "Entertainment",
  "Health",
  "Education",
  "Other",
];

export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addTransaction(transactions, data) {
  const entry = { id: generateId(), ...data };
  return [...transactions, entry];
}

export function updateTransaction(transactions, id, data) {
  return transactions.map((entry) => (entry.id === id ? { ...entry, ...data } : entry));
}

export function deleteTransaction(transactions, id) {
  return transactions.filter((entry) => entry.id !== id);
}

export function findTransaction(transactions, id) {
  return transactions.find((entry) => entry.id === id);
}

export function calculateTotals(transactions) {
  const totals = transactions.reduce(
    (acc, entry) => {
      if (entry.type === "income") acc.income += entry.amount;
      else acc.expense += entry.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
  return { ...totals, balance: totals.income - totals.expense };
}

export function calculateMonthlyTotals(transactions, yearMonth) {
  const monthEntries = transactions.filter((entry) => entry.date.startsWith(yearMonth));
  const totals = calculateTotals(monthEntries);
  return { ...totals, count: monthEntries.length };
}