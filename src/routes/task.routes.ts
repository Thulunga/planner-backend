import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getTasks,
  getTodayTasks,
  reorderTasks,
  updateSubtask,
  updateTask,
} from '../controllers/task.controller';

const router = Router();

router.get('/', authMiddleware, getTasks);
router.get('/today', authMiddleware, getTodayTasks);

router.post('/', authMiddleware, createTask);
router.patch('/reorder', authMiddleware, reorderTasks);
router.patch('/:id', authMiddleware, updateTask);
router.delete('/:id', authMiddleware, deleteTask);

router.post('/:id/subtasks', authMiddleware, addSubtask);
router.patch('/:taskId/subtasks/:subtaskId', authMiddleware, updateSubtask);
router.delete('/:taskId/subtasks/:subtaskId', authMiddleware, deleteSubtask);

export default router;
