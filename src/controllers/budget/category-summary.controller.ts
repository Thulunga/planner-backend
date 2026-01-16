import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { ExpenseCategory } from '../../models/budget/expense-category.model';
import { Expense } from '../../models/budget/expense.model';
import { CategoryBudget } from '../../models/budget/category-budget.model';

export const getCategoryBudgetSummary = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        const userId = req.user!.userId;

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);

        /* 1️⃣ Get all categories (system + user) */
        const categories = await ExpenseCategory.find({
            $or: [{ type: 'SYSTEM' }, { type: 'USER', userId }],
        });

        /* 2️⃣ Aggregate expenses per category */
        const expenseAgg = await Expense.aggregate([
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
            expenseAgg.map((e) => [e._id.toString(), e.spent])
        );

        /* 3️⃣ Fetch category budgets */
        const categoryBudgets = await CategoryBudget.find({
            userId,
            month,
            year,
        });

        const budgetMap = new Map(
            categoryBudgets.map((b) => [
                b.categoryId.toString(),
                b.budget,
            ])
        );

        /* 4️⃣ Build response */
        const summary = categories.map((cat) => {
            const spent = spentMap.get(cat.id) || 0;

            const rawBudget = budgetMap.get(cat.id);
            const budget: number | null =
                rawBudget === undefined ? null : rawBudget;

            const isUnlimited = budget === null || budget <= 0;

            let percentageUsed = 0;
            let remaining: number | null = null;
            let overBudget = false;

            if (!isUnlimited) {
                percentageUsed = Math.min((spent / budget) * 100, 100);
                remaining = Math.max(budget - spent, 0);
                overBudget = spent > budget;
            }

            return {
                categoryId: cat.id,
                categoryName: cat.name,
                type: cat.type,
                spent,
                budget,
                isUnlimited,
                percentageUsed,
                remaining,
                overBudget,
            };
        });

        return res.json(summary);

    } catch (error) {
        console.error('Category summary error:', error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
};
