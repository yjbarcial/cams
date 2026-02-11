import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import ProfileModel from '../models/profile.model.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Check if user exists
    const existingUser = await ProfileModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email already registered' }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create profile
    const profile = await ProfileModel.create({
      email,
      first_name,
      last_name,
      phone,
      role: 'member',
      status: 'active'
    });

    // Generate token
    const token = jwt.sign(
      { userId: profile.id, email: profile.email, role: profile.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: profile,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ⭐ Admin emails - automatically get Admin role
    const ADMIN_EMAILS = [
      'lovellhudson.clavel@carsu.edu.ph',
      'yssahjulianah.barcial@carsu.edu.ph',
      'altheaguila.gorres@carsu.edu.ph',
      'paduga@carsu.edu.ph',
    ];

    // ⭐ Check if email is from CARSU domain
    if (!email.endsWith('@carsu.edu.ph')) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only CARSU email addresses are allowed' }
      });
    }

    // Find user
    let user = await ProfileModel.findByEmail(email);

    // ⭐ If user doesn't exist, auto-create them (auto-signup)
    if (!user) {
      console.log('🆕 New user detected, auto-creating profile for:', email);

      // Determine role based on email
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      const userRole = isAdmin ? 'admin' : 'member';

      // Create new profile
      user = await ProfileModel.create({
        email,
        role: userRole,  // Use 'role' not 'user_role'
        status: 'active',
      });

      console.log(`✅ Auto-created user with role: ${userRole}`);
    }

    // Check status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { message: 'Account is not active' }
      });
    }

    // ⭐ For CARSU emails, we don't verify password - it's SSO-like behavior
    // In production, you'd integrate with actual CARSU SSO or use Supabase auth

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last active/login
    await ProfileModel.updateLastActive(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: user.phone,
          position: user.position,
          department: user.department,
          avatar_url: user.avatar_url,
          status: user.status,
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyToken = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    next(error);
  }
};
