import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Expense } from '../../models/budget/expense.model';
import { ExpenseCategory } from '../../models/budget/expense-category.model';

export const addExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, categoryId, note, expenseDate } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    let finalCategoryId = categoryId;

    if (!categoryId) {
      const others = await ExpenseCategory.findOne({
        name: 'Others',
        type: 'SYSTEM',
      });
      finalCategoryId = others?._id;
    }

    const expense = await Expense.create({
      userId: req.user!.userId,
      categoryId: finalCategoryId,
      amount,
      note,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
    });

    return res.status(201).json({
      message: 'Expense added successfully',
      expense,
    });
  } catch (error) {
    console.error('Add expense error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
