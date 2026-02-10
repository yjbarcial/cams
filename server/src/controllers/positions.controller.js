import PositionModel from '../models/position.model.js';

export const getAllPositions = async (req, res, next) => {
  try {
    const positions = await PositionModel.findAll();
    res.json({ success: true, data: positions });
  } catch (error) {
    next(error);
  }
};

export const getPositionById = async (req, res, next) => {
  try {
    const position = await PositionModel.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ success: false, error: { message: 'Position not found' } });
    }
    res.json({ success: true, data: position });
  } catch (error) {
    next(error);
  }
};

export const getPositionsByDepartment = async (req, res, next) => {
  try {
    const positions = await PositionModel.findByDepartment(req.params.departmentId);
    res.json({ success: true, data: positions });
  } catch (error) {
    next(error);
  }
};

export const createPosition = async (req, res, next) => {
  try {
    const position = await PositionModel.create(req.body);
    res.status(201).json({ success: true, data: position });
  } catch (error) {
    next(error);
  }
};

export const updatePosition = async (req, res, next) => {
  try {
    const position = await PositionModel.update(req.params.id, req.body);
    if (!position) {
      return res.status(404).json({ success: false, error: { message: 'Position not found' } });
    }
    res.json({ success: true, data: position });
  } catch (error) {
    next(error);
  }
};

export const deletePosition = async (req, res, next) => {
  try {
    const position = await PositionModel.delete(req.params.id);
    if (!position) {
      return res.status(404).json({ success: false, error: { message: 'Position not found' } });
    }
    res.json({ success: true, data: position });
  } catch (error) {
    next(error);
  }
};
