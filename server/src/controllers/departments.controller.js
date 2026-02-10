import DepartmentModel from '../models/department.model.js';

export const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await DepartmentModel.findAll();
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await DepartmentModel.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, error: { message: 'Department not found' } });
    }
    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const department = await DepartmentModel.create(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const department = await DepartmentModel.update(req.params.id, req.body);
    if (!department) {
      return res.status(404).json({ success: false, error: { message: 'Department not found' } });
    }
    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const department = await DepartmentModel.delete(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, error: { message: 'Department not found' } });
    }
    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};
