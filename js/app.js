import { loadTransactions, saveTransactions } from "./storage.js";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  findTransaction,
  calculateTotals,
  calculateMonthlyTotals,
} from "./transactions.js";
import { filterTransactions, sortByDateDesc, getAllCategories } from "./filters.js";
import { renderCategoryChart } from "./chart.js";

let transactions = loadTransactions();
let editingId = null;
let activeFilterType = "all";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const formatCurrency = (amount) => currencyFormatter.format(amount);
const todayISO = () => new Date().toISOString().slice(0, 10);
const currentYearMonth = () => new Date().toISOString().slice(0, 7);

const form = document.getElementById("entryForm");
const formTitle = document.getElementById("formTitle");
const editingIdInput = document.getElementById("editingId");
const entryTypeInput = document.getElementById("entryType");
const typeChips = document.querySelectorAll(".chip[data-type]");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const descriptionInput = document.getElementById("description");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const amountError = document.getElementById("amountError");
const categoryError = document.getElementById("categoryError");
const dateError = document.getElementById("dateError");
const descriptionError = document.getElementById("descriptionError");

const balanceAmountEl = document.getElementById("balanceAmount");
const incomeAmountEl = document.getElementById("incomeAmount");
const expenseAmountEl = document.getElementById("expenseAmount");

const filterChips = document.querySelectorAll(".chip[data-filter-type]");
const filterCategorySelect = document.getElementById("filterCategory");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");

const emptyStateEl = document.getElementById("emptyState");
const entriesList = document.getElementById("entriesList");

const monthPicker = document.getElementById("monthPicker");
const monthlyIncomeEl = document.getElementById("monthlyIncome");
const monthlyExpenseEl = document.getElementById("monthlyExpense");
const monthlyBalanceEl = document.getElementById("monthlyBalance");
const monthlyCountEl = document.getElementById("monthlyCount");

const categoryChartCanvas = document.getElementById("categoryChart");
const chartEmptyState = document.getElementById("chartEmptyState");

function populateCategoryOptions() {
  const categories = entryTypeInput.value === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const previousValue = categoryInput.value;

  categoryInput.innerHTML = '<option value="">Pick one</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  if (categories.includes(previousValue)) categoryInput.value = previousValue;
}

function populateFilterCategoryOptions() {
  const allCategories = getAllCategories(INCOME_CATEGORIES, EXPENSE_CATEGORIES);
  const previousValue = filterCategorySelect.value;

  filterCategorySelect.innerHTML = '<option value="all">Any category</option>';
  allCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    filterCategorySelect.appendChild(option);
  });

  filterCategorySelect.value = previousValue || "all";
}

function setEntryType(type) {
  entryTypeInput.value = type;
  typeChips.forEach((chip) => {
    const isActive = chip.dataset.type === type;
    chip.setAttribute("aria-pressed", String(isActive));
  });
  populateCategoryOptions();
}

typeChips.forEach((chip) => {
  chip.addEventListener("click", () => setEntryType(chip.dataset.type));
});

function validateForm({ amount, category, date, description }) {
  const errors = {};

  if (Number.isNaN(amount) || amount <= 0) {
    errors.amount = "Please enter an amount greater than 0.";
  }
  if (!category) {
    errors.category = "Please select a category.";
  }
  if (!date) {
    errors.date = "Please select a valid date.";
  }
  if (!description || description.trim().length === 0) {
    errors.description = "Please enter a description.";
  } else if (description.trim().length > 100) {
    errors.description = "Keep it under 100 characters.";
  }

  return errors;
}

function showErrors(errors) {
  amountError.textContent = errors.amount || "";
  categoryError.textContent = errors.category || "";
  dateError.textContent = errors.date || "";
  descriptionError.textContent = errors.description || "";

  amountInput.closest(".field").classList.toggle("has-error", Boolean(errors.amount));
  categoryInput.closest(".field").classList.toggle("has-error", Boolean(errors.category));
  dateInput.closest(".field").classList.toggle("has-error", Boolean(errors.date));
  descriptionInput.closest(".field").classList.toggle("has-error", Boolean(errors.description));
}

function clearFieldError(input, errorEl) {
  input.closest(".field").classList.remove("has-error");
  errorEl.textContent = "";
}

amountInput.addEventListener("input", () => clearFieldError(amountInput, amountError));
categoryInput.addEventListener("change", () => clearFieldError(categoryInput, categoryError));
dateInput.addEventListener("input", () => clearFieldError(dateInput, dateError));
descriptionInput.addEventListener("input", () => clearFieldError(descriptionInput, descriptionError));

function renderSummary() {
  const { income, expense, balance } = calculateTotals(transactions);
  balanceAmountEl.textContent = formatCurrency(balance);
  incomeAmountEl.textContent = formatCurrency(income);
  expenseAmountEl.textContent = formatCurrency(expense);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function buildEntryRow(entry) {
  const li = document.createElement("li");
  li.className = "entry";
  const sign = entry.type === "income" ? "+" : "-";
  const amountClass = entry.type === "income" ? "entry__amount--income" : "entry__amount--expense";

  li.innerHTML = `
    <span class="entry__date">${entry.date}</span>
    <span class="entry__body">
      <strong>${escapeHtml(entry.description)}</strong>
      <span class="entry__category">${escapeHtml(entry.category)}</span>
    </span>
    <span class="entry__amount ${amountClass}">${sign} ${formatCurrency(entry.amount)}</span>
    <span class="entry__actions">
      <button type="button" class="pencil-btn" data-action="edit" data-id="${entry.id}">Edit</button>
      <button type="button" class="pencil-btn pencil-btn--danger" data-action="delete" data-id="${entry.id}">Delete</button>
    </span>
  `;

  return li;
}

function renderEntries() {
  const filtered = sortByDateDesc(
    filterTransactions(transactions, { type: activeFilterType, category: filterCategorySelect.value })
  );

  entriesList.innerHTML = "";

  if (transactions.length === 0) {
    emptyStateEl.textContent = "No entries yet. Add your first one above.";
    emptyStateEl.hidden = false;
    return;
  }

  if (filtered.length === 0) {
    emptyStateEl.textContent = "Nothing matches those filters.";
    emptyStateEl.hidden = false;
    return;
  }

  emptyStateEl.hidden = true;
  filtered.forEach((entry) => entriesList.appendChild(buildEntryRow(entry)));
}

function renderMonthlySummary() {
  const yearMonth = monthPicker.value || currentYearMonth();
  const { income, expense, balance, count } = calculateMonthlyTotals(transactions, yearMonth);

  monthlyIncomeEl.textContent = formatCurrency(income);
  monthlyExpenseEl.textContent = formatCurrency(expense);
  monthlyBalanceEl.textContent = formatCurrency(balance);
  monthlyCountEl.textContent = String(count);
}

function renderChart() {
  const hasData = renderCategoryChart(categoryChartCanvas, transactions);
  categoryChartCanvas.hidden = !hasData;
  chartEmptyState.hidden = hasData;
}

function renderAll() {
  renderSummary();
  renderEntries();
  renderMonthlySummary();
  renderChart();
}

function resetForm() {
  form.reset();
  editingId = null;
  editingIdInput.value = "";
  dateInput.value = todayISO();
  setEntryType("expense");
  formTitle.textContent = "New entry";
  submitBtn.textContent = "Add entry";
  cancelEditBtn.hidden = true;
  showErrors({});
}

function enterEditMode(entry) {
  editingId = entry.id;
  editingIdInput.value = entry.id;
  setEntryType(entry.type);
  categoryInput.value = entry.category;
  amountInput.value = entry.amount;
  dateInput.value = entry.date;
  descriptionInput.value = entry.description;

  formTitle.textContent = "Edit entry";
  submitBtn.textContent = "Save changes";
  cancelEditBtn.hidden = false;
  showErrors({});

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formValues = {
    type: entryTypeInput.value,
    amount: parseFloat(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value,
    description: descriptionInput.value,
  };

  const errors = validateForm(formValues);
  showErrors(errors);
  if (Object.keys(errors).length > 0) return;

  const cleanValues = { ...formValues, description: formValues.description.trim() };

  transactions = editingId
    ? updateTransaction(transactions, editingId, cleanValues)
    : addTransaction(transactions, cleanValues);

  saveTransactions(transactions);
  resetForm();
  renderAll();
});

cancelEditBtn.addEventListener("click", resetForm);

entriesList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  const entry = findTransaction(transactions, id);
  if (!entry) return;

  if (action === "edit") {
    enterEditMode(entry);
  }

  if (action === "delete") {
    const confirmed = window.confirm("Are you sure you want to delete this entry?");
    if (!confirmed) return;

    transactions = deleteTransaction(transactions, id);
    saveTransactions(transactions);
    if (editingId === id) resetForm();
    renderAll();
  }
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilterType = chip.dataset.filterType;
    filterChips.forEach((c) => c.classList.toggle("is-active", c === chip));
    renderEntries();
  });
});

filterCategorySelect.addEventListener("change", renderEntries);

resetFiltersBtn.addEventListener("click", () => {
  activeFilterType = "all";
  filterChips.forEach((c) => c.classList.toggle("is-active", c.dataset.filterType === "all"));
  filterCategorySelect.value = "all";
  renderEntries();
});

monthPicker.addEventListener("change", renderMonthlySummary);

document.addEventListener("DOMContentLoaded", () => {
  dateInput.value = todayISO();
  monthPicker.value = currentYearMonth();

  populateCategoryOptions();
  populateFilterCategoryOptions();

  renderAll();
});