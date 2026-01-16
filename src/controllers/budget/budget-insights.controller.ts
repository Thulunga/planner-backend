import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Income } from '../../models/budget/income.model';
import { Expense } from '../../models/budget/expense.model';
import { MonthlyBudget } from '../../models/budget/monthly-budget.model';
import { ExpenseCategory } from '../../models/budget/expense-category.model';
import { CategoryBudget } from '../../models/budget/category-budget.model';
// import { Expense } from '../models/expense.model';
// import { Income } from '../models/income.model';
// import { MonthlyBudget } from '../models/monthly-budget.model';
// import { CategoryBudget } from '../models/category-budget.model';
// import { ExpenseCategory } from '../models/expense-category.model';

export const getBudgetInsights = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const userId = req.user!.userId;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const alerts: any[] = [];
    const insights: any[] = [];

    /* 1️⃣ TOTAL INCOME & EXPENSE */
    const [incomeAgg] = await Income.aggregate([
      { $match: { userId, incomeDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const [expenseAgg] = await Expense.aggregate([
      { $match: { userId, expenseDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalIncome = incomeAgg?.total || 0;
    const totalSpent = expenseAgg?.total || 0;

    /* 2️⃣ MONTHLY BUDGET ALERT */
    const monthlyBudget = await MonthlyBudget.findOne({
      userId,
      month,
      year,
    });

    if (
      monthlyBudget?.totalBudget !== null &&
      monthlyBudget?.totalBudget !== undefined
    ) {
      const budget = monthlyBudget.totalBudget;

      if (totalSpent > budget) {
        alerts.push({
          type: 'MONTHLY_OVERSPEND',
          severity: 'danger',
          message: `You exceeded your monthly budget by ₹${totalSpent - budget}`,
        });
      } else if (totalSpent >= budget * 0.8) {
        alerts.push({
          type: 'NEAR_LIMIT',
          severity: 'warning',
          message: `You’ve used ${Math.round(
            (totalSpent / budget) * 100
          )}% of your monthly budget`,
        });
      }
    }

    /* 3️⃣ CATEGORY LEVEL ALERTS */
    const categories = await ExpenseCategory.find({
      $or: [{ type: 'SYSTEM' }, { type: 'USER', userId }],
    });

    const categoryBudgets = await CategoryBudget.find({
      userId,
      month,
      year,
    });

    const budgetMap = new Map(
      categoryBudgets.map((b) => [b.categoryId.toString(), b.budget])
    );

    const expenseByCategory = await Expense.aggregate([
      {
        $match: {
          userId,
          expenseDate: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          spent: { $sum: '$amount' },
        },
      },
    ]);

    const spentMap = new Map(
      expenseByCategory.map((e) => [e._id.toString(), e.spent])
    );

    for (const cat of categories) {
      const spent = spentMap.get(cat.id) || 0;
      const budget = budgetMap.get(cat.id) ?? null;

      if (budget !== null) {
        if (spent > budget) {
          alerts.push({
            type: 'OVER_BUDGET',
            severity: 'danger',
            message: `${cat.name} exceeded budget by ₹${spent - budget}`,
          });
        } else if (spent >= budget * 0.8) {
          alerts.push({
            type: 'NEAR_LIMIT',
            severity: 'warning',
            message: `${cat.name} used ${Math.round(
              (spent / budget) * 100
            )}% of its budget`,
          });
        }
      }
    }

    /* 4️⃣ INSIGHTS */

    // Savings insight
    if (totalIncome > totalSpent) {
      insights.push({
        type: 'SAVINGS',
        message: `You saved ₹${totalIncome - totalSpent} this month`,
      });
    }

    // Top spending category
    if (expenseByCategory.length > 0) {
      const top = expenseByCategory.sort(
        (a, b) => b.spent - a.spent
      )[0];

      const topCategory = categories.find(
        (c) => c.id === top._id.toString()
      );

      if (topCategory) {
        insights.push({
          type: 'TOP_CATEGORY',
          message: `Your highest spending category is ${topCategory.name}`,
        });
      }
    }

    // Avg daily spend
    if (totalSpent > 0) {
      insights.push({
        type: 'AVG_DAILY_SPEND',
        message: `Your average daily spend is ₹${Math.round(
          totalSpent / daysInMonth
        )}`,
      });
    }

    return res.json({ alerts, insights });
  } catch (error) {
    console.error('Budget insights error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
