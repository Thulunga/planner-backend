import { Schema, model } from 'mongoose';

const monthlyBudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    totalBudget: { type: Number, required: true },
  },
  { timestamps: true }
);

monthlyBudgetSchema.index(
  { userId: 1, month: 1, year: 1 },
  { unique: true }
);

export const MonthlyBudget = model(
  'MonthlyBudget',
  monthlyBudgetSchema
);
