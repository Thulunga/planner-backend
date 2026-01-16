import { ExpenseCategory } from "../models/budget/expense-category.model";

export const seedExpenseCategories = async () => {
  const systemCategories = ['Rent', 'Needs', 'Wants', 'Others'];

  for (const name of systemCategories) {
    const exists = await ExpenseCategory.findOne({
      name,
      type: 'SYSTEM',
    });

    if (!exists) {
      await ExpenseCategory.create({
        name,
        type: 'SYSTEM',
        isDeletable: false,
      });
    }
  }

  console.log('✅ Expense categories seeded');
};
