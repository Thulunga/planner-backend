import { Schema, model } from 'mongoose';

const expenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: true,
    },
    amount: { type: Number, required: true },
    note: String,
    expenseDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Expense = model('Expense', expenseSchema);
