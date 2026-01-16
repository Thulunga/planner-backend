import { CategoryBudget } from "../models/budget/category-budget.model";
import { ExpenseCategory } from "../models/budget/expense-category.model";
import { Expense } from "../models/budget/expense.model";
import { Income } from "../models/budget/income.model";
import { MonthlyBudget } from "../models/budget/monthly-budget.model";
import { User } from "../models/user.model";

export const seedBudgetDevData = async () => {
    if (process.env.NODE_ENV !== 'development') return;

    const devEmail = process.env.DEV_SEED_EMAIL;
    if (!devEmail) {
        console.warn('⚠️ DEV_SEED_EMAIL not set. Skipping budget seeding.');
        return;
    }

    const user = await User.findOne({ email: devEmail });
    if (!user) {
        console.warn(`⚠️ Dev user not found: ${devEmail}`);
        return;
    }

    const userId = user._id;
    const month = 1;
    const year = 2026;

    // 2️⃣ Ensure monthly budget
    await MonthlyBudget.findOneAndUpdate(
        { userId, month, year },
        { totalBudget: 50000 },
        { upsert: true }
    );

    // 3️⃣ Fetch categories
    const categories = await ExpenseCategory.find({
        $or: [{ type: 'SYSTEM' }, { userId }],
    });

    const rent = categories.find((c) => c.name === 'Rent');
    const wants = categories.find((c) => c.name === 'Wants');
    const needs = categories.find((c) => c.name === 'Needs');
    const others = categories.find((c) => c.name === 'Others');

    // 4️⃣ Category budgets
    const categoryBudgets = [
        { category: rent, budget: 15000 },
        { category: wants, budget: 10000 },
        { category: needs, budget: 20000 },
        { category: others, budget: null }, // unlimited
    ];

    for (const item of categoryBudgets) {
        if (!item.category) continue;

        await CategoryBudget.findOneAndUpdate(
            {
                userId,
                categoryId: item.category._id,
                month,
                year,
            },
            { budget: item.budget },
            { upsert: true }
        );
    }

    // 5️⃣ Clear old dev data (expenses + income)
    await Expense.deleteMany({
        userId,
        expenseDate: {
            $gte: new Date(year, month - 1, 1),
            $lt: new Date(year, month, 1),
        },
    });

    await Income.deleteMany({
        userId,
        incomeDate: {
            $gte: new Date(year, month - 1, 1),
            $lt: new Date(year, month, 1),
        },
    });

    // 6️⃣ Seed income
    await Income.create([
        {
            userId,
            source: 'Salary',
            amount: 80000,
            incomeDate: new Date(year, month - 1, 1),
        },
    ]);

    // 7️⃣ Seed expenses (fixed & UI-friendly)
    await Expense.create([
        {
            userId,
            categoryId: rent?._id,
            amount: 15000,
            note: 'House rent',
            expenseDate: new Date(year, month - 1, 2),
        },
        {
            userId,
            categoryId: wants?._id,
            amount: 4500,
            note: 'Shopping',
            expenseDate: new Date(year, month - 1, 5),
        },
        {
            userId,
            categoryId: wants?._id,
            amount: 3500,
            note: 'Dining out',
            expenseDate: new Date(year, month - 1, 8),
        },
        {
            userId,
            categoryId: needs?._id,
            amount: 6200,
            note: 'Groceries',
            expenseDate: new Date(year, month - 1, 10),
        },
        {
            userId,
            categoryId: others?._id,
            amount: 1800,
            note: 'Misc expenses',
            expenseDate: new Date(year, month - 1, 12),
        },
    ]);

    console.log('✅ Budget DEV data seeded');
};
