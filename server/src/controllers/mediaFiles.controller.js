import MediaFileModel from '../models/mediaFile.model.js'

export const getAllMediaFiles = async (req, res, next) => {
  try {
    const { project_id, task_id, category, uploaded_by } = req.query
    const files = await MediaFileModel.findAll({ project_id, task_id, category, uploaded_by })
    res.json({ success: true, data: files })
  } catch (error) {
    next(error)
  }
}

export const getMediaFileById = async (req, res, next) => {
  try {
    const file = await MediaFileModel.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ success: false, error: { message: 'File not found' } })
    }
    res.json({ success: true, data: file })
  } catch (error) {
    next(error)
  }
}

export const uploadMediaFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded' } })
    }

    const fileData = {
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      mime_type: req.file.mimetype,
      size: req.file.size,
      category: req.body.category,
      project_id: req.body.project_id,
      task_id: req.body.task_id,
      uploaded_by: req.user.id,
    }

    const file = await MediaFileModel.create(fileData)
    res.status(201).json({ success: true, data: file })
  } catch (error) {
    next(error)
  }
}

export const deleteMediaFile = async (req, res, next) => {
  try {
    const file = await MediaFileModel.delete(req.params.id)
    if (!file) {
      return res.status(404).json({ success: false, error: { message: 'File not found' } })
    }
    res.json({ success: true, data: file })
  } catch (error) {
    next(error)
  }
}
