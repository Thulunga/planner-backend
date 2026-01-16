import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Expense } from '../../models/budget/expense.model';
import { Income } from '../../models/budget/income.model';

export const getBudgetCalendarEvents = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const userId = req.user!.userId;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const expenses = await Expense.find({
      userId,
      expenseDate: { $gte: start, $lt: end },
    }).populate('categoryId');

    const incomes = await Income.find({
      userId,
      incomeDate: { $gte: start, $lt: end },
    });

    return res.json({ expenses, incomes });
  } catch (error) {
    console.error('Calendar events error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
