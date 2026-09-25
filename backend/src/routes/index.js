const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const issueRoutes = require('./issueRoutes');
const commentRoutes = require('./commentRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');
const uploadRoutes = require('./uploadRoutes');

router.use('/auth', authRoutes);
router.use('/issues', issueRoutes);
router.use('/comments', commentRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
