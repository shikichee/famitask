import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  time,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const familyMembers = pgTable('family_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  avatar: text('avatar').notNull(),
  color: text('color').notNull(),
  role: text('role').notNull(),
  totalPoints: integer('total_points').notNull().default(0),
  isAdmin: boolean('is_admin').notNull().default(false),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  lastSeenHistoryAt: timestamp('last_seen_history_at', { withTimezone: true }).notNull().defaultNow(),
});

export const taskCategories = pgTable('task_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
});

export const recurringTaskTemplates = pgTable('recurring_task_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  categoryId: uuid('category_id').notNull().references(() => taskCategories.id),
  points: integer('points').notNull().default(2),
  adultOnly: boolean('adult_only').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => familyMembers.id),
  recurrenceType: text('recurrence_type').notNull(),
  daysOfWeek: integer('days_of_week').array().notNull(),
  weeksOfMonth: integer('weeks_of_month').array(),
  generationTime: time('generation_time').notNull().default('18:00'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_recurring_templates_active').on(table.isActive),
]);

export const recurringTaskSkips = pgTable('recurring_task_skips', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => recurringTaskTemplates.id, { onDelete: 'cascade' }),
  taskDate: date('task_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique().on(table.templateId, table.taskDate),
]);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  categoryId: uuid('category_id').notNull().references(() => taskCategories.id),
  status: text('status').notNull().default('pending'),
  adultOnly: boolean('adult_only').notNull().default(false),
  points: integer('points').notNull().default(2),
  createdBy: uuid('created_by').notNull().references(() => familyMembers.id),
  completedBy: uuid('completed_by').references(() => familyMembers.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  assignedTo: uuid('assigned_to').references(() => familyMembers.id),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringTemplateId: uuid('recurring_template_id').references(() => recurringTaskTemplates.id, { onDelete: 'set null' }),
  taskDate: date('task_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  position: integer('position').notNull().default(0),
}, (table) => [
  index('idx_tasks_status').on(table.status),
  index('idx_tasks_category').on(table.categoryId),
  index('idx_tasks_assigned_to').on(table.assignedTo),
  index('idx_tasks_position').on(table.assignedTo, table.position),
  index('idx_tasks_recurring_template').on(table.recurringTemplateId, table.taskDate),
]);

export const completions = pgTable('completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskTitle: text('task_title').notNull(),
  categoryEmoji: text('category_emoji').notNull(),
  memberId: uuid('member_id').notNull().references(() => familyMembers.id),
  points: integer('points').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  taskId: uuid('task_id').references(() => tasks.id),
  reportedBy: uuid('reported_by').references(() => familyMembers.id),
  adultOnly: boolean('adult_only').notNull().default(false),
}, (table) => [
  index('idx_completions_member').on(table.memberId),
  index('idx_completions_completed_at').on(table.completedAt),
  index('idx_completions_task_id').on(table.taskId),
]);

export const thanks = pgTable('thanks', {
  id: uuid('id').primaryKey().defaultRandom(),
  completionId: uuid('completion_id').notNull().references(() => completions.id),
  fromMemberId: uuid('from_member_id').notNull().references(() => familyMembers.id),
  toMemberId: uuid('to_member_id').notNull().references(() => familyMembers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.completionId, table.fromMemberId),
  check('no_self_thanks', sql`${table.fromMemberId} != ${table.toMemberId}`),
  index('idx_thanks_completion').on(table.completionId),
  index('idx_thanks_to_member').on(table.toMemberId),
]);

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => familyMembers.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_push_subscriptions_member').on(table.memberId),
]);

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(),
  actorId: uuid('actor_id').notNull().references(() => familyMembers.id),
  targetMemberId: uuid('target_member_id').references(() => familyMembers.id),
  taskTitle: text('task_title').notNull(),
  categoryEmoji: text('category_emoji').notNull().default(''),
  points: integer('points'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_activity_logs_created_at').on(table.createdAt),
]);
