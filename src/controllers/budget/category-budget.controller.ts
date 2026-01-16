import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { MonthlyBudget } from '../../models/budget/monthly-budget.model';
import { CategoryBudget } from '../../models/budget/category-budget.model';

/**
 * SET or UPDATE category budget
 */
export const upsertCategoryBudget = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { categoryId, month, year, budget } = req.body;
    const userId = req.user!.userId;

    if (!categoryId || !month || !year) {
      return res.status(400).json({
        message: 'categoryId, month and year are required',
      });
    }

    // If budget is null → unlimited
    if (budget !== null) {
      const monthly = await MonthlyBudget.findOne({
        userId,
        month,
        year,
      });

      if (monthly?.totalBudget !== null && budget > monthly!.totalBudget) {
        return res.status(400).json({
          message: 'Category budget cannot exceed monthly budget',
        });
      }
    }

    const categoryBudget = await CategoryBudget.findOneAndUpdate(
      { userId, categoryId, month, year },
      { budget: budget ?? null },
      { upsert: true, new: true }
    );

    return res.json({
      message: 'Category budget saved',
      categoryBudget,
    });
  } catch (error) {
    console.error('Upsert category budget error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/**
 * REMOVE category budget (set to unlimited)
 */
export const removeCategoryBudget = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { categoryId, month, year } = req.query;
    const userId = req.user!.userId;

    await CategoryBudget.findOneAndUpdate(
      {
        userId,
        categoryId,
        month: Number(month),
        year: Number(year),
      },
      { budget: null }
    );

    return res.json({
      message: 'Category budget removed (set to unlimited)',
    });
  } catch (error) {
    console.error('Remove category budget error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
