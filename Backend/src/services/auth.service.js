import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { ENV } from '../config/env.config.js';

export const authService = {
  /**
   * Register a new client user
   */
  async register({ name, company_name = null, email, password }) {
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const displayName = (name || normalizedEmail.split('@')[0]).trim();

    // Check if user already exists
    const existingUser = await userModel.findByEmail(normalizedEmail);
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in MySQL
    const newUser = await userModel.create({
      name: displayName,
      company_name: company_name ? company_name.trim() : null,
      email: normalizedEmail,
      password: hashedPassword,
      plan: 'free',
      role: 'client',
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      ENV.JWT.SECRET,
      { expiresIn: ENV.JWT.EXPIRES_IN }
    );

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        company_name: newUser.company_name,
        email: newUser.email,
        plan: newUser.plan,
        role: newUser.role,
        wallet_balance: newUser.wallet_balance,
        onboarded: newUser.onboarded,
      },
      token,
    };
  },

  /**
   * Login an existing user
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await userModel.findByEmail(normalizedEmail);

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ENV.JWT.SECRET,
      { expiresIn: ENV.JWT.EXPIRES_IN }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        company_name: user.company_name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        wallet_balance: user.wallet_balance,
        onboarded: Boolean(user.onboarded),
      },
      token,
    };
  },

  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      company_name: user.company_name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      wallet_balance: user.wallet_balance,
      onboarded: Boolean(user.onboarded),
      created_at: user.created_at,
    };
  },

  /**
   * Update client profile (company, plan, onboarding)
   */
  async updateProfile(userId, { display_name, company_name, plan }) {
    const updated = await userModel.updateProfile(userId, {
      name: display_name,
      company_name,
      plan,
      onboarded: true,
    });
    return updated;
  },
};

export default authService;
