import { apiClient, mockDB } from './api';

export const adminService = {
  async getDashboardStats() {
    try {
      const response = await apiClient.get('/admin/dashboard');
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend /admin/dashboard unavailable, calculating from mockDB:', err.message);
    }

    const issues = mockDB.getIssues();
    const categories = mockDB.getCategories();
    const users = mockDB.getUsers();

    const openCount = issues.filter((i) => i.status === 'OPEN').length;
    const underReviewCount = issues.filter((i) => i.status === 'UNDER_REVIEW').length;
    const inProgressCount = issues.filter((i) => i.status === 'IN_PROGRESS').length;
    const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;
    const rejectedCount = issues.filter((i) => i.status === 'REJECTED').length;

    const categoryDistribution = categories.map((cat) => ({
      name: cat.name,
      count: issues.filter((i) => i.categoryId === cat.id).length,
    }));

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
      totalIssues: issues.length,
      openCount,
      underReviewCount,
      inProgressCount,
      resolvedCount,
      rejectedCount,
      totalUsers: users.length,
      avgResolutionHours: 36,
      categoryDistribution,
      trendData,
      priorityQueue,
    };
  },

  async updateIssueStatus(issueId, newStatus, note = '', adminUser) {
    try {
      const response = await apiClient.patch(`/admin/issues/${issueId}/status`, { status: newStatus, note });
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend updateStatus failed, using local mockDB:', err.message);
    }

    const issues = mockDB.getIssues();
    const index = issues.findIndex((i) => i.id === issueId);
    if (index === -1) throw new Error('Issue not found');

    const issue = issues[index];
    const oldStatus = issue.status;

    const historyItem = {
      id: `hist-${Date.now()}`,
      oldStatus,
      newStatus,
      changedBy: adminUser?.name || 'City Admin',
      note: note || `Status updated to ${newStatus}`,
      createdAt: new Date().toISOString(),
    };

    const updated = {
      ...issue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : issue.resolvedAt,
      statusHistory: [historyItem, ...(issue.statusHistory || [])],
    };

    issues[index] = updated;
    mockDB.setIssues(issues);

    const auditLogs = mockDB.getAuditLogs();
    mockDB.setAuditLogs([
      {
        id: `audit-${Date.now()}`,
        actorUserId: adminUser?.id || 'usr-2',
        actorName: adminUser?.name || 'City Admin',
        action: 'UPDATE_ISSUE_STATUS',
        entityType: 'ISSUE',
        entityId: issueId,
        metadata: { oldStatus, newStatus, note },
        createdAt: new Date().toISOString(),
      },
      ...auditLogs,
    ]);

    const notifications = mockDB.getNotifications();
    mockDB.setNotifications([
      {
        id: `notif-${Date.now()}`,
        userId: issue.userId,
        issueId: issue.id,
        type: 'STATUS_CHANGE',
        title: 'Status Update Notification',
        message: `Your reported issue "${issue.title.slice(0, 40)}..." status changed to ${newStatus}.`,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      ...notifications,
    ]);

    return updated;
  },

  async updateIssuePriority(issueId, newScore, note = '', adminUser) {
    try {
      const response = await apiClient.patch(`/admin/issues/${issueId}/priority`, { priorityScore: Number(newScore), note });
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend updatePriority failed, using local mockDB:', err.message);
    }

    const issues = mockDB.getIssues();
    const index = issues.findIndex((i) => i.id === issueId);
    if (index === -1) throw new Error('Issue not found');

    const issue = issues[index];
    const oldScore = issue.priorityScore;

    const updated = {
      ...issue,
      priorityScore: Number(newScore),
      updatedAt: new Date().toISOString(),
    };

    issues[index] = updated;
    mockDB.setIssues(issues);

    const auditLogs = mockDB.getAuditLogs();
    mockDB.setAuditLogs([
      {
        id: `audit-${Date.now()}`,
        actorUserId: adminUser?.id || 'usr-2',
        actorName: adminUser?.name || 'City Admin',
        action: 'UPDATE_ISSUE_PRIORITY',
        entityType: 'ISSUE',
        entityId: issueId,
        metadata: { oldScore, newScore, note },
        createdAt: new Date().toISOString(),
      },
      ...auditLogs,
    ]);

    return updated;
  },

  async mergeDuplicateIssues(primaryIssueId, duplicateIssueId, note = '', adminUser) {
    try {
      const response = await apiClient.post(`/admin/issues/${primaryIssueId}/merge`, { duplicateIssueId, note });
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend mergeDuplicateIssues failed, using local mockDB:', err.message);
    }

    const issues = mockDB.getIssues();
    const primary = issues.find((i) => i.id === primaryIssueId);
    const duplicate = issues.find((i) => i.id === duplicateIssueId);

    if (!primary || !duplicate) throw new Error('Selected primary or duplicate issue not found');

    const updatedDuplicate = {
      ...duplicate,
      status: 'REJECTED',
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          id: `hist-${Date.now()}`,
          oldStatus: duplicate.status,
          newStatus: 'REJECTED',
          changedBy: adminUser?.name || 'City Admin',
          note: `Merged into primary issue #${primaryIssueId}. ${note}`,
          createdAt: new Date().toISOString(),
        },
        ...(duplicate.statusHistory || []),
      ],
    };

    const updatedPrimary = {
      ...primary,
      confirmationsCount: primary.confirmationsCount + duplicate.confirmationsCount,
      updatedAt: new Date().toISOString(),
    };

    const nextIssues = issues.map((i) => {
      if (i.id === primaryIssueId) return updatedPrimary;
      if (i.id === duplicateIssueId) return updatedDuplicate;
      return i;
    });

    mockDB.setIssues(nextIssues);
    return { primary: updatedPrimary, duplicate: updatedDuplicate };
  },

  async getCategories() {
    try {
      const response = await apiClient.get('/admin/categories');
      if (Array.isArray(response.data)) return response.data;
    } catch (err) {
      console.warn('Backend getCategories failed, using mockDB:', err.message);
    }
    return mockDB.getCategories();
  },

  async addCategory(data) {
    try {
      const response = await apiClient.post('/admin/categories', data);
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend addCategory failed, using mockDB:', err.message);
    }

    const categories = mockDB.getCategories();
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      description: data.description,
      icon: data.icon || 'HelpCircle',
      priorityWeight: Number(data.priorityWeight) || 1.0,
      isActive: true,
    };
    mockDB.setCategories([...categories, newCategory]);
    return newCategory;
  },

  async updateCategory(id, updates) {
    try {
      const response = await apiClient.patch(`/admin/categories/${id}`, updates);
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend updateCategory failed, using mockDB:', err.message);
    }

    const categories = mockDB.getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Category not found');

    categories[index] = { ...categories[index], ...updates };
    mockDB.setCategories(categories);
    return categories[index];
  },

  async getUsers() {
    try {
      const response = await apiClient.get('/admin/users');
      if (Array.isArray(response.data)) return response.data;
    } catch (err) {
      console.warn('Backend getUsers failed, using mockDB:', err.message);
    }
    return mockDB.getUsers();
  },

  async updateUserRole(userId, newRole) {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (response.data) return response.data;
    } catch (err) {
      console.warn('Backend updateUserRole failed, using mockDB:', err.message);
    }

    const users = mockDB.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found');

    users[index] = { ...users[index], role: newRole };
    mockDB.setUsers(users);
    return users[index];
  }
};
