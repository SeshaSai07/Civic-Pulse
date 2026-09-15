const { z } = require('zod');

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
  note: z.string().optional().default(''),
});

const updatePrioritySchema = z.object({
  priorityScore: z.number().min(1).max(100),
  note: z.string().optional().default(''),
});

const mergeIssueSchema = z.object({
  duplicateIssueId: z.string().min(1, 'Duplicate issue ID is required'),
  note: z.string().optional().default(''),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['CITIZEN', 'ADMIN', 'GUEST']),
});

module.exports = {
  updateStatusSchema,
  updatePrioritySchema,
  mergeIssueSchema,
  updateUserRoleSchema,
};
