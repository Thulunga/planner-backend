import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { MonthlyBudget } from '../../models/budget/monthly-budget.model';

/**
 * CREATE or UPDATE monthly budget
 */
export const upsertMonthlyBudget = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { month, year, totalBudget } = req.body;
    const userId = req.user!.userId;

    if (!month || !year) {
      return res.status(400).json({
        message: 'Month and year are required',
      });
    }

    // If totalBudget is null → unlimited
    const budget = await MonthlyBudget.findOneAndUpdate(
      { userId, month, year },
      { totalBudget: totalBudget ?? null },
      { upsert: true, new: true }
    );

    return res.json({
      message: 'Monthly budget saved',
      budget,
    });
  } catch (error) {
    console.error('Upsert monthly budget error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/**
 * DELETE monthly budget (set to unlimited)
 */
export const removeMonthlyBudget = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { month, year } = req.query;
    const userId = req.user!.userId;

    await MonthlyBudget.findOneAndUpdate(
      { userId, month: Number(month), year: Number(year) },
      { totalBudget: null }
    );

    return res.json({
      message: 'Monthly budget removed (set to unlimited)',
    });
  } catch (error) {
    console.error('Remove monthly budget error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
