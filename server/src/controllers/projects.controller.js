import ProjectModel from '../models/project.model.js';

export const getAllProjects = async (req, res, next) => {
  try {
    const { status, project_type, priority, search } = req.query;
    const projects = await ProjectModel.findAll({ status, project_type, priority, search });
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      created_by: req.user.id
    };
    const project = await ProjectModel.create(projectData);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await ProjectModel.update(req.params.id, req.body);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const project = await ProjectModel.delete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

export const addProjectMember = async (req, res, next) => {
  try {
    const { user_id, role } = req.body;
    const member = await ProjectModel.addMember(req.params.id, user_id, role);
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (req, res, next) => {
  try {
    const member = await ProjectModel.removeMember(req.params.id, req.params.userId);
    if (!member) {
      return res.status(404).json({ success: false, error: { message: 'Member not found' } });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};
