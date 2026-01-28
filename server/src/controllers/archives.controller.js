import ArchiveModel from '../models/archive.model.js';

export const getAllArchives = async (req, res, next) => {
  try {
    const { category, search, limit, offset } = req.query;
    const archives = await ArchiveModel.findAll({ category, search, limit, offset });
    res.json({ success: true, data: archives, count: archives.length });
  } catch (error) {
    next(error);
  }
};

export const getArchiveById = async (req, res, next) => {
  try {
    const archive = await ArchiveModel.findById(req.params.id);
    if (!archive) {
      return res.status(404).json({ success: false, error: { message: 'Archive not found' } });
    }
    res.json({ success: true, data: archive });
  } catch (error) {
    next(error);
  }
};

export const createArchive = async (req, res, next) => {
  try {
    const archiveData = {
      ...req.body,
      uploaded_by: req.user.id
    };
    const archive = await ArchiveModel.create(archiveData);
    res.status(201).json({ success: true, data: archive });
  } catch (error) {
    next(error);
  }
};

export const updateArchive = async (req, res, next) => {
  try {
    const archive = await ArchiveModel.update(req.params.id, req.body);
    if (!archive) {
      return res.status(404).json({ success: false, error: { message: 'Archive not found' } });
    }
    res.json({ success: true, data: archive });
  } catch (error) {
    next(error);
  }
};

export const deleteArchive = async (req, res, next) => {
  try {
    const archive = await ArchiveModel.delete(req.params.id);
    if (!archive) {
      return res.status(404).json({ success: false, error: { message: 'Archive not found' } });
    }
    res.json({ success: true, data: archive });
  } catch (error) {
    next(error);
  }
};
