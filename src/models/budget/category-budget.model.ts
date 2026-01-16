import { Schema, model } from 'mongoose';

const categoryBudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },

    // null = unlimited
    budget: { type: Number, default: null },
  },
  { timestamps: true }
);

categoryBudgetSchema.index(
  { userId: 1, categoryId: 1, month: 1, year: 1 },
  { unique: true }
);

export const CategoryBudget = model(
  'CategoryBudget',
  categoryBudgetSchema
);
