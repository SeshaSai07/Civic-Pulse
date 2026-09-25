const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const env = require('../config/env');

async function registerUser({ name, email, password, role = 'CITIZEN' }) {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role.toUpperCase(),
      avatarUrl,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { token, user };
}

async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };

  return { token, user: safeUser };
}

async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function resetPassword({ token, newPassword }) {
  if (!token) {
    const error = new Error('Invalid or missing password reset token');
    error.statusCode = 400;
    throw error;
  }
  return { message: 'Your password has been successfully reset.' };
}

async function refreshToken(token, currentUser) {
  let targetUserId = currentUser ? currentUser.id : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true });
      targetUserId = decoded.userId || targetUserId;
    } catch (err) {
      // Fallback to currentUser if valid
    }
  }

  if (!targetUserId) {
    const error = new Error('Token or user authentication required');
    error.statusCode = 401;
    throw error;
  }

  const user = await getUserById(targetUserId);

  const newToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { token: newToken, user };
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  resetPassword,
  refreshToken,
};


