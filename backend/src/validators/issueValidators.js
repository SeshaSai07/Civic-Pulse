const { z } = require('zod');

const createIssueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  categoryId: z.string().min(1, 'Category selection is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  latitude: z.number({ required_error: 'Latitude is required' }),
  longitude: z.number({ required_error: 'Longitude is required' }),
  address: z.string().optional(),
  images: z.array(z.any()).optional().default([]),
});

const commentSchema = z.object({
  body: z.string().min(1, 'Comment body cannot be empty').max(1000),
});

module.exports = {
  createIssueSchema,
  commentSchema,
};
