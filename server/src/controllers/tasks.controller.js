import TaskModel from '../models/task.model.js';

export const getAllTasks = async (req, res, next) => {
  try {
    const { project_id, assigned_to, status, priority, parent_task_id } = req.query;
    const tasks = await TaskModel.findAll({ project_id, assigned_to, status, priority, parent_task_id });
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await TaskModel.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const taskData = {
      ...req.body,
      created_by: req.user.id
    };
    const task = await TaskModel.create(taskData);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await TaskModel.update(req.params.id, req.body);
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await TaskModel.delete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const addTaskComment = async (req, res, next) => {
  try {
    const { content, parent_comment_id } = req.body;
    const comment = await TaskModel.addComment(req.params.id, req.user.id, content, parent_comment_id);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};
