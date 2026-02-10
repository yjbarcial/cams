import AuditLogModel from '../models/auditLog.model.js';

export const auditLog = (action, tableName) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      try {
        if (req.user && data.data) {
          await AuditLogModel.create({
            user_id: req.user.id,
            action,
            table_name: tableName,
            record_id: data.data.id || null,
            old_values: req.body._oldValues || null,
            new_values: data.data,
            ip_address: req.ip,
            user_agent: req.get('user-agent')
          });
        }
      } catch (error) {
        console.error('Audit log error:', error);
      }

      return originalJson(data);
    };

    next();
  };
};
