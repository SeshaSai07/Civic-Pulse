const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateBody } = require('../middleware/validate');
const { registerSchema, loginSchema, forgotPasswordSchema } = require('../validators/authValidators');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/logout', authController.logout);

module.exports = router;
