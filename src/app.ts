import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import budgeRoutes from './routes/budget.routes'
import taskRoutes from './routes/task.routes';
import { seedExpenseCategories } from './seed/expense-category.seed';
import { seedBudgetDevData } from './seed/budget-dev.seed';

const app = express();

app.use(cors());
app.use(express.json());
seedExpenseCategories();
seedBudgetDevData();
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'Planner backend is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/budjet', budgeRoutes)
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

export default app;
