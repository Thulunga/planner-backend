import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Income } from '../../models/budget/income.model';

export const addIncome = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, source, incomeDate, note } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const income = await Income.create({
      userId: req.user!.userId,
      amount,
      source,
      note,
      incomeDate: incomeDate ? new Date(incomeDate) : new Date(),
    });

    return res.status(201).json({
      message: 'Income added successfully',
      income,
    });
  } catch (error) {
    console.error('Add income error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
