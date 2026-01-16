import { Schema, model } from 'mongoose';

const expenseCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['SYSTEM', 'USER'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeletable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ExpenseCategory = model(
  'ExpenseCategory',
  expenseCategorySchema
);
