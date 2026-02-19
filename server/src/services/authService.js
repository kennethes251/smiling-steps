/**
 * Auth Service - Core Authentication Business Logic
 * 
 * @stable
 * @verified 2024-12-27
 * @module services/authService
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { eventBus, AUTH_EVENTS, USER_EVENTS } = require('../events/eventBus');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

/** @stable - User registration */
async function register(userData, UserModel) {
  const { email, password, firstName, lastName, role = 'client', phone } = userData;

  try {
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      eventBus.emitEvent(AUTH_EVENTS.REGISTER_FAILURE, { email, reason: 'email_exists' });
      return { success: false, error: 'User with this email already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = new UserModel({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      phone,
      emailVerificationToken,
      emailVerificationExpires,
      isEmailVerified: false,
      loginAttempts: 0,
      isLocked: false
    });

    await user.save();

    eventBus.emitEvent(AUTH_EVENTS.REGISTER_SUCCESS, { userId: user._id, email: user.email, role: user.role });
    eventBus.emitEvent(USER_EVENTS.CREATED, { userId: user._id, email: user.email, role: user.role });
    eventBus.emitEvent(AUTH_EVENTS.EMAIL_VERIFICATION_SENT, { userId: user._id, email: user.email, token: emailVerificationToken });

    return { success: true, user: sanitizeUser(user), emailVerificationToken };
  } catch (error) {
    eventBus.emitEvent(AUTH_EVENTS.REGISTER_FAILURE, { email, reason: 'internal_error', error: error.message });
    throw error;
  }
}

/** @stable - User login */
async function login(credentials, UserModel) {
  const { email, password } = credentials;

  try {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      eventBus.emitEvent(AUTH_EVENTS.LOGIN_FAILURE, { email, reason: 'user_not_found' });
      return { success: false, error: 'Invalid email or password' };
    }

    if (user.isLocked && user.lockUntil > Date.now()) {
      eventBus.emitEvent(AUTH_EVENTS.LOGIN_FAILURE, { email, reason: 'account_locked', userId: user._id });
      return { success: false, error: 'Account is temporarily locked. Please try again later.' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      await handleFailedLogin(user);
      eventBus.emitEvent(AUTH_EVENTS.LOGIN_FAILURE, { email, reason: 'invalid_password', userId: user._id });
      return { success: false, error: 'Invalid email or password' };
    }

    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.isLocked = false;
      user.lockUntil = null;
      await user.save();
    }

    const token = generateToken(user);
    eventBus.emitEvent(AUTH_EVENTS.LOGIN_SUCCESS, { userId: user._id, email: user.email, role: user.role });

    return { success: true, token, user: sanitizeUser(user) };
  } catch (error) {
    eventBus.emitEvent(AUTH_EVENTS.LOGIN_FAILURE, { email, reason: 'internal_error', error: error.message });
    throw error;
  }
}

/** @stable - Email verification */
async function verifyEmail(token, UserModel) {
  try {
    const user = await UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return { success: false, error: 'Invalid or expired verification token' };
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    eventBus.emitEvent(AUTH_EVENTS.EMAIL_VERIFICATION_SUCCESS, { userId: user._id, email: user.email });
    return { success: true, user: sanitizeUser(user) };
  } catch (error) {
    throw error;
  }
}

async function handleFailedLogin(user) {
  user.loginAttempts = (user.loginAttempts || 0) + 1;
  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.isLocked = true;
    user.lockUntil = new Date(Date.now() + LOCK_TIME);
    eventBus.emitEvent(AUTH_EVENTS.ACCOUNT_LOCKED, { userId: user._id, email: user.email });
  }
  await user.save();
}

function generateToken(user) {
  return jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function sanitizeUser(user) {
  const userObj = user.toObject ? user.toObject() : user;
  const { password, emailVerificationToken, ...sanitized } = userObj;
  return sanitized;
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = { register, login, verifyEmail, generateToken, verifyToken, sanitizeUser };
