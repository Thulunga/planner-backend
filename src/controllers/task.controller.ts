import { Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Task } from '../models/task.model';

const DEFAULT_PRIORITY = 'medium';
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

const taskProjection = {
  _id: 1,
  title: 1,
  listId: 1,
  dueDate: 1,
  priority: 1,
  completed: 1,
  order: 1,
  subtasks: 1,
  createdAt: 1,
  updatedAt: 1,
};

const serializeTask = (task: any) => ({
  id: task._id.toString(),
  title: task.title,
  listId: task.listId,
  dueDate: task.dueDate,
  priority: task.priority,
  completed: task.completed,
  order: task.order,
  subtasks: (task.subtasks ?? []).map((subtask: any) => ({
    id: subtask._id.toString(),
    title: subtask.title,
    completed: subtask.completed,
  })),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const getTodayBoundsUtc = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { listId, completed, dueDate } = req.query;

    const query: Record<string, unknown> = { userId };

    if (typeof listId === 'string' && listId.trim()) {
      query.listId = listId.trim();
    }

    if (typeof completed === 'string') {
      query.completed = completed === 'true';
    }

    if (typeof dueDate === 'string' && dueDate.toLowerCase() === 'today') {
      const { start, end } = getTodayBoundsUtc();
      query.dueDate = { $gte: start, $lt: end };
      query.completed = false;
    }

    const tasks = await Task.find(query, taskProjection).sort({ order: 1, createdAt: 1 });
    return res.json({ tasks: tasks.map(serializeTask) });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const getTodayTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { start, end } = getTodayBoundsUtc();

    const tasks = await Task.find(
      {
        userId,
        dueDate: { $gte: start, $lt: end },
        completed: false,
      },
      taskProjection
    ).sort({ order: 1, createdAt: 1 });

    return res.json({ tasks: tasks.map(serializeTask) });
  } catch (error) {
    console.error('Get today tasks error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { title, listId, priority, dueDate, completed } = req.body;

    if (!title?.trim() || !listId?.trim()) {
      return res.status(400).json({ message: 'title and listId are required' });
    }

    const chosenPriority = priority ?? DEFAULT_PRIORITY;
    if (!VALID_PRIORITIES.has(chosenPriority)) {
      return res.status(400).json({ message: 'priority must be one of low, medium, high' });
    }

    const lastTask = await Task.findOne({ userId, listId: listId.trim() }).sort({ order: -1 });

    const task = await Task.create({
      userId,
      title: title.trim(),
      listId: listId.trim(),
      priority: chosenPriority,
      dueDate: dueDate ? new Date(dueDate) : null,
      completed: Boolean(completed),
      order: lastTask ? lastTask.order + 1 : 0,
      subtasks: [],
    });

    return res.status(201).json({ task: serializeTask(task) });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const { title, listId, priority, dueDate, completed } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ message: 'title cannot be empty' });
      }
      updates.title = String(title).trim();
    }

    if (listId !== undefined) {
      if (!String(listId).trim()) {
        return res.status(400).json({ message: 'listId cannot be empty' });
      }
      updates.listId = String(listId).trim();
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.has(priority)) {
        return res.status(400).json({ message: 'priority must be one of low, medium, high' });
      }
      updates.priority = priority;
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (completed !== undefined) {
      updates.completed = Boolean(completed);
    }

    const task = await Task.findOneAndUpdate({ _id: id, userId }, updates, {
      new: true,
      runValidators: true,
      projection: taskProjection,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json({ task: serializeTask(task) });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const task = await Task.findOneAndDelete({ _id: id, userId });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const addSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'title is required' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      {
        $push: {
          subtasks: {
            title: title.trim(),
            completed: false,
          },
        },
      },
      {
        new: true,
        runValidators: true,
        projection: taskProjection,
      }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(201).json({ task: serializeTask(task) });
  } catch (error) {
    console.error('Add subtask error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const updateSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId, subtaskId } = req.params;
    const { title, completed } = req.body;

    const setObject: Record<string, unknown> = {};

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ message: 'title cannot be empty' });
      }

      setObject['subtasks.$.title'] = String(title).trim();
    }

    if (completed !== undefined) {
      setObject['subtasks.$.completed'] = Boolean(completed);
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        userId,
        'subtasks._id': subtaskId,
      },
      { $set: setObject },
      {
        new: true,
        runValidators: true,
        projection: taskProjection,
      }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task or subtask not found' });
    }

    return res.json({ task: serializeTask(task) });
  } catch (error) {
    console.error('Update subtask error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const deleteSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId, subtaskId } = req.params;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      {
        $pull: {
          subtasks: {
            _id: subtaskId,
          },
        },
      },
      {
        new: true,
        projection: taskProjection,
      }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json({ task: serializeTask(task) });
  } catch (error) {
    console.error('Delete subtask error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const reorderTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { listId, taskIds } = req.body;

    if (!listId?.trim()) {
      return res.status(400).json({ message: 'listId is required' });
    }

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds must be a non-empty array' });
    }

    const hasInvalidId = taskIds.some((taskId: string) => !isValidObjectId(taskId));
    if (hasInvalidId) {
      return res.status(400).json({ message: 'taskIds contains invalid ids' });
    }

    const tasksInList = await Task.find({ userId, listId: listId.trim() }, { _id: 1 });
    const taskIdSet = new Set(tasksInList.map((task) => task._id.toString()));

    if (taskIds.length !== taskIdSet.size || taskIds.some((taskId: string) => !taskIdSet.has(taskId))) {
      return res.status(400).json({
        message: 'taskIds must include every task in the list exactly once',
      });
    }

    const operations = taskIds.map((taskId: string, index: number) => ({
      updateOne: {
        filter: { _id: taskId, userId, listId: listId.trim() },
        update: { $set: { order: index } },
      },
    }));

    await Task.bulkWrite(operations);

    const tasks = await Task.find({ userId, listId: listId.trim() }, taskProjection).sort({ order: 1 });
    return res.json({ tasks: tasks.map(serializeTask) });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
