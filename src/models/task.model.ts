import { HydratedDocument, Schema, Types, model } from 'mongoose';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface SubTask {
  _id: Types.ObjectId;
  title: string;
  completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskData {
  userId: Types.ObjectId;
  title: string;
  listId: string;
  dueDate: Date | null;
  priority: TaskPriority;
  completed: boolean;
  order: number;
  subtasks: SubTask[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type TaskDocument = HydratedDocument<TaskData>;

const subTaskSchema = new Schema<SubTask>(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const taskSchema = new Schema<TaskData>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    listId: { type: String, required: true, trim: true, index: true },
    dueDate: { type: Date, default: null, index: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    completed: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true },
    subtasks: { type: [subTaskSchema], default: [] },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, listId: 1, order: 1 });

export const Task = model<TaskData>('Task', taskSchema);
