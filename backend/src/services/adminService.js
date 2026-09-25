const prisma = require('../config/db');

async function getDashboardStats() {
  const [
    totalIssues,
    openCount,
    underReviewCount,
    inProgressCount,
    resolvedCount,
    rejectedCount,
    totalUsers,
    categories,
    issues,
  ] = await Promise.all([
    prisma.issue.count(),
    prisma.issue.count({ where: { status: 'OPEN' } }),
    prisma.issue.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.issue.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.issue.count({ where: { status: 'RESOLVED' } }),
    prisma.issue.count({ where: { status: 'REJECTED' } }),
    prisma.user.count(),
    prisma.category.findMany(),
    prisma.issue.findMany({
      select: { categoryId: true, status: true, priorityScore: true, id: true, title: true, severity: true, createdAt: true },
    }),
  ]);

  // Category distribution
  const categoryDistribution = categories.map((cat) => ({
    name: cat.name,
    count: issues.filter((i) => i.categoryId === cat.id).length,
  }));

  // Trend data mock generator
  const trendData = [
    { month: 'Apr', Open: 12, Resolved: 10 },
    { month: 'May', Open: 18, Resolved: 15 },
    { month: 'Jun', Open: 24, Resolved: 20 },
    { month: 'Jul', Open: 30, Resolved: 25 },
    { month: 'Aug', Open: 28, Resolved: 24 },
    { month: 'Sep', Open: issues.length, Resolved: resolvedCount },
  ];

  const priorityQueue = issues
    .filter((i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    totalIssues,
    openCount,
    underReviewCount,
    inProgressCount,
    resolvedCount,
    rejectedCount,
    totalUsers,
    avgResolutionHours: 36,
    categoryDistribution,
    trendData,
    priorityQueue,
  };
}

async function updateIssueStatus(issueId, newStatus, note = '', adminUser) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { user: true },
  });

  if (!issue) {
    const error = new Error('Issue not found');
    error.statusCode = 404;
    throw error;
  }

  const oldStatus = issue.status;

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.issue.update({
      where: { id: issueId },
      data: {
        status: newStatus.toUpperCase(),
        resolvedAt: newStatus.toUpperCase() === 'RESOLVED' ? new Date() : issue.resolvedAt,
        statusHistory: {
          create: {
            oldStatus,
            newStatus: newStatus.toUpperCase(),
            changedBy: adminUser?.name || 'City Admin',
            note: note || `Status updated to ${newStatus}`,
          },
        },
      },
      include: {
        category: true,
        images: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Write audit log
    await tx.auditLog.create({
      data: {
        actorUserId: adminUser.id,
        action: 'UPDATE_ISSUE_STATUS',
        entityType: 'ISSUE',
        entityId: issueId,
        metadataJson: { oldStatus, newStatus, note },
      },
    });

    // Create notification for issue owner
    await tx.notification.create({
      data: {
        userId: issue.userId,
        issueId: issue.id,
        type: 'STATUS_CHANGE',
        title: 'Status Update Notification',
        message: `Your reported issue "${issue.title.slice(0, 40)}..." status changed to ${newStatus}.`,
      },
    });

    return res;
  });

  return updated;
}

async function updateIssuePriority(issueId, newScore, note = '', adminUser) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) {
    const error = new Error('Issue not found');
    error.statusCode = 404;
    throw error;
  }

  const oldScore = issue.priorityScore;

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.issue.update({
      where: { id: issueId },
      data: { priorityScore: Number(newScore) },
      include: { category: true, images: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: adminUser.id,
        action: 'UPDATE_ISSUE_PRIORITY',
        entityType: 'ISSUE',
        entityId: issueId,
        metadataJson: { oldScore, newScore, note },
      },
    });

    return res;
  });

  return updated;
}

async function mergeDuplicateIssues(primaryIssueId, duplicateIssueId, note = '', adminUser) {
  const primary = await prisma.issue.findUnique({ where: { id: primaryIssueId } });
  const duplicate = await prisma.issue.findUnique({ where: { id: duplicateIssueId } });

  if (!primary || !duplicate) {
    const error = new Error('Primary or duplicate issue report not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Mark duplicate as REJECTED
    const updatedDuplicate = await tx.issue.update({
      where: { id: duplicateIssueId },
      data: {
        status: 'REJECTED',
        statusHistory: {
          create: {
            oldStatus: duplicate.status,
            newStatus: 'REJECTED',
            changedBy: adminUser.name || 'City Admin',
            note: `Merged into primary issue #${primaryIssueId}. ${note}`,
          },
        },
      },
    });

    // Transfer confirmations
    const updatedPrimary = await tx.issue.update({
      where: { id: primaryIssueId },
      data: {
        confirmationsCount: primary.confirmationsCount + duplicate.confirmationsCount,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: adminUser.id,
        action: 'MERGE_DUPLICATE_ISSUE',
        entityType: 'ISSUE',
        entityId: primaryIssueId,
        metadataJson: { primaryIssueId, duplicateIssueId, note },
      },
    });

    return { primary: updatedPrimary, duplicate: updatedDuplicate };
  });

  return result;
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

async function createCategory(data) {
  const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');
  return prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      icon: data.icon || 'HelpCircle',
      priorityWeight: Number(data.priorityWeight) || 1.0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
}

async function updateCategory(id, updates) {
  return prisma.category.update({
    where: { id },
    data: updates,
  });
}

async function getUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function updateUserRole(userId, newRole) {
  return prisma.user.update({
    where: { id: userId },
    data: { role: newRole.toUpperCase() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });
}

async function deleteCategory(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  const issueCount = await prisma.issue.count({ where: { categoryId: id } });
  if (issueCount > 0) {
    return prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  return prisma.category.delete({ where: { id } });
}

async function getAdminAnalytics() {
  const [
    totalIssues,
    totalUsers,
    totalCategories,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    rejectedIssues,
    categories,
    issues,
  ] = await Promise.all([
    prisma.issue.count(),
    prisma.user.count(),
    prisma.category.count(),
    prisma.issue.count({ where: { status: 'OPEN' } }),
    prisma.issue.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.issue.count({ where: { status: 'RESOLVED' } }),
    prisma.issue.count({ where: { status: 'REJECTED' } }),
    prisma.category.findMany(),
    prisma.issue.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        priorityScore: true,
        categoryId: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
  ]);

  const severityBreakdown = {
    LOW: issues.filter((i) => i.severity === 'LOW').length,
    MEDIUM: issues.filter((i) => i.severity === 'MEDIUM').length,
    HIGH: issues.filter((i) => i.severity === 'HIGH').length,
    CRITICAL: issues.filter((i) => i.severity === 'CRITICAL').length,
  };

  const categoryAnalytics = categories.map((cat) => {
    const catIssues = issues.filter((i) => i.categoryId === cat.id);
    return {
      id: cat.id,
      name: cat.name,
      total: catIssues.length,
      open: catIssues.filter((i) => i.status === 'OPEN').length,
      resolved: catIssues.filter((i) => i.status === 'RESOLVED').length,
    };
  });

  const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100;

  return {
    kpis: {
      totalIssues,
      totalUsers,
      totalCategories,
      openIssues,
      inProgressIssues,
      resolvedIssues,
      rejectedIssues,
      resolutionRate: `${resolutionRate}%`,
      avgResolutionHours: 24,
    },
    severityBreakdown,
    categoryAnalytics,
    monthlyTrends: [
      { month: 'Apr', Reported: 14, Resolved: 12 },
      { month: 'May', Reported: 22, Resolved: 18 },
      { month: 'Jun', Reported: 31, Resolved: 26 },
      { month: 'Jul', Reported: 38, Resolved: 32 },
      { month: 'Aug', Reported: 45, Resolved: 40 },
      { month: 'Sep', Reported: totalIssues, Resolved: resolvedIssues },
    ],
  };
}

module.exports = {
  getDashboardStats,
  updateIssueStatus,
  updateIssuePriority,
  mergeDuplicateIssues,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getUsers,
  updateUserRole,
  getAdminAnalytics,
};

