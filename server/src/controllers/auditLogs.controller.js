import AuditLogModel from '../models/auditLog.model.js';

export const getAllAuditLogs = async (req, res, next) => {
  try {
    const { user_id, table_name, action, start_date, end_date, limit, offset } = req.query;
    const logs = await AuditLogModel.findAll({ 
      user_id, 
      table_name, 
      action, 
      start_date, 
      end_date, 
      limit, 
      offset 
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLogModel.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, error: { message: 'Audit log not found' } });
    }
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};
