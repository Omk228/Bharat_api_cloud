import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { ENV } from '../config/env.config.js';

export const authService = {
  /**
   * Register a new user
   */
  async register({ name, email, password }) {
    if (!name || !email || !password) {
      throw ApiError.badRequest('Name, email, and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await userModel.findByEmail(normalizedEmail);
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await userModel.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      ENV.JWT.SECRET,
      { expiresIn: ENV.JWT.EXPIRES_IN }
    );

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
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
        email: user.email,
        role: user.role,
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
    return user;
  },
};

export default authService;
