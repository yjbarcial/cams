import jwt from 'jsonwebtoken';
import ProfileModel from '../models/profile.model.js';
import { supabaseAdmin } from '../config/supabase.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'No token provided' } 
      });
    }

    const token = authHeader.substring(7);

    try {
      // Try to verify with Supabase first
      if (supabaseAdmin) {
        const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
        
        if (!error && supabaseUser) {
          // Get or create user profile
          let user = await ProfileModel.findByEmail(supabaseUser.email);
          
          if (!user) {
            // Auto-create profile for Supabase user
            user = await ProfileModel.create({
              email: supabaseUser.email,
              role: 'contributor',
              status: 'active'
            });
          }

          if (user.status !== 'active') {
            return res.status(403).json({ 
              success: false, 
              error: { message: 'Account is not active' } 
            });
          }

          // Attach user to request
          req.user = user;
          
          // Update last active
          await ProfileModel.updateLastActive(user.id);

          return next();
        }
      }

      // Fallback: try local JWT verification
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user profile
      const user = await ProfileModel.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: { message: 'User not found' } 
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ 
          success: false, 
          error: { message: 'Account is not active' } 
        });
      }

      // Attach user to request
      req.user = user;
      
      // Update last active
      await ProfileModel.updateLastActive(user.id);

      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Invalid or expired token' } 
      });
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Not authenticated' } 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Insufficient permissions' } 
      });
    }

    next();
  };
};
