import { Schema, model } from 'mongoose';

const incomeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: String,
    amount: { type: Number, required: true },
    incomeDate: { type: Date, required: true },
    note: String,
  },
  { timestamps: true }
);

export const Income = model('Income', incomeSchema);
