import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Income } from '../../models/budget/income.model';
import { Expense } from '../../models/budget/expense.model';
import { MonthlyBudget } from '../../models/budget/monthly-budget.model';

export const getMonthlyBudgetSummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const userId = req.user!.userId;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [incomeAgg] = await Income.aggregate([
      { $match: { userId, incomeDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const [expenseAgg] = await Expense.aggregate([
      { $match: { userId, expenseDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const budget = await MonthlyBudget.findOne({ userId, month, year });

    const totalIncome = incomeAgg?.total || 0;
    const totalSpent = expenseAgg?.total || 0;

    return res.json({
      totalIncome,
      plannedBudget: budget?.totalBudget || 0,
      totalSpent,
      remainingCash: totalIncome - totalSpent,
      saved: Math.max(totalIncome - totalSpent, 0),
    });
  } catch (error) {
    console.error('Budget summary error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
