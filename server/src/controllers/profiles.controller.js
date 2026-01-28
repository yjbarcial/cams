import ProfileModel from '../models/profile.model.js';

export const getAllProfiles = async (req, res, next) => {
  try {
    const { department_id, role, status, search } = req.query;
    const profiles = await ProfileModel.findAll({ department_id, role, status, search });
    res.json({ success: true, data: profiles });
  } catch (error) {
    next(error);
  }
};

export const getProfileById = async (req, res, next) => {
  try {
    const profile = await ProfileModel.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: { message: 'Profile not found' } });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const getCurrentProfile = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
};

export const createProfile = async (req, res, next) => {
  try {
    const profile = await ProfileModel.create(req.body);
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const profile = await ProfileModel.update(req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ success: false, error: { message: 'Profile not found' } });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const deleteProfile = async (req, res, next) => {
  try {
    const profile = await ProfileModel.delete(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: { message: 'Profile not found' } });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
