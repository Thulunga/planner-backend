import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { ExpenseCategory } from '../../models/budget/expense-category.model';

/**
 * GET all categories (system + user)
 */
export const getExpenseCategories = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    const categories = await ExpenseCategory.find({
      $or: [
        { type: 'SYSTEM' },
        { type: 'USER', userId },
      ],
    }).sort({ createdAt: 1 });

    return res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/**
 * CREATE user category
 */
export const createExpenseCategory = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { name } = req.body;
    const userId = req.user!.userId;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await ExpenseCategory.findOne({
      name,
      userId,
      type: 'USER',
    });

    if (existing) {
      return res.status(409).json({
        message: 'Category already exists',
      });
    }

    const category = await ExpenseCategory.create({
      name,
      type: 'USER',
      userId,
      isDeletable: true,
    });

    return res.status(201).json({
      message: 'Category created',
      category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/**
 * RENAME user category
 */
export const renameExpenseCategory = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user!.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const category = await ExpenseCategory.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (category.type === 'SYSTEM') {
      return res
        .status(403)
        .json({ message: 'System categories cannot be renamed' });
    }

    if (category.userId?.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    category.name = name.trim();
    await category.save();

    return res.json({
      message: 'Category renamed',
      category,
    });
  } catch (error) {
    console.error('Rename category error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/**
 * DELETE user category
 */
export const deleteExpenseCategory = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const category = await ExpenseCategory.findOne({
      _id: id,
      userId,
      type: 'USER',
    });

    if (!category) {
      return res.status(404).json({
        message: 'Category not found or cannot be deleted',
      });
    }

    await category.deleteOne();

    return res.json({
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
