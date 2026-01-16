import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { addExpense } from '../controllers/budget/expense.controller';
import { addIncome } from '../controllers/budget/income.controller';
import { getMonthlyBudgetSummary } from '../controllers/budget/budget-summary.controller';
import { getBudgetCalendarEvents } from '../controllers/budget/budget-calendar.controller';
import { createExpenseCategory, deleteExpenseCategory, getExpenseCategories, renameExpenseCategory } from '../controllers/budget/expense-category.controller';
import { removeMonthlyBudget, upsertMonthlyBudget } from '../controllers/budget/monthly-budget.controller';
import { removeCategoryBudget, upsertCategoryBudget } from '../controllers/budget/category-budget.controller';
import { getCategoryBudgetSummary } from '../controllers/budget/category-summary.controller';
import { getBudgetInsights } from '../controllers/budget/budget-insights.controller';

const router = Router();

/* EXPENSE & INCOME */
router.post('/expense', authMiddleware, addExpense);
router.post('/income', authMiddleware, addIncome);

/* CATEGORIES */
router.get('/categories', authMiddleware, getExpenseCategories);
router.post('/categories', authMiddleware, createExpenseCategory);
router.delete('/categories/:id', authMiddleware, deleteExpenseCategory);
router.put('/categories/:id', authMiddleware, renameExpenseCategory);

/* MONTHLY BUDGET */
router.post('/monthly', authMiddleware, upsertMonthlyBudget);
router.delete('/monthly', authMiddleware, removeMonthlyBudget);

/* CATEGORY BUDGET */
router.post('/category-budget', authMiddleware, upsertCategoryBudget);
router.delete('/category-budget', authMiddleware, removeCategoryBudget);

/* ANALYTICS */
router.get('/summary', authMiddleware, getMonthlyBudgetSummary);
router.get('/calendar', authMiddleware, getBudgetCalendarEvents);
router.get('/category-summary', authMiddleware, getCategoryBudgetSummary);
router.get('/insights', authMiddleware, getBudgetInsights);

export default router;
