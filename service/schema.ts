import { pgSchema, varchar, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

const APP_ID = 'reelcruit2025mspbots01';
const appSchema = pgSchema(APP_ID);

// --- Jobs ---
export const jobs = appSchema.table('jobs', {
  id:          varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:       text('title').notNull(),
  description: text('description').notNull(),
  questions:   jsonb('questions').notNull().default([]),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});

// --- Candidates ---
export const candidates = appSchema.table('candidates', {
  id:         varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId:      varchar('job_id', { length: 255 }).notNull(),
  name:       text('name').notNull(),
  email:      text('email').notNull(),
  linkToken:  varchar('link_token', { length: 255 }).notNull().unique(),
  status:     varchar('status', { length: 50 }).notNull().default('pending'), // pending | in_progress | completed
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});

// --- Interviews ---
export const interviews = appSchema.table('interviews', {
  id:          varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  candidateId: varchar('candidate_id', { length: 255 }).notNull(),
  startedAt:   timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// --- Responses ---
export const responses = appSchema.table('responses', {
  id:             varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  interviewId:    varchar('interview_id', { length: 255 }).notNull(),
  questionIndex:  integer('question_index').notNull(),
  questionText:   text('question_text').notNull(),
  videoBlob:      text('video_blob'),      // base64 encoded for pilot — migrate to R2 later
  transcript:     text('transcript'),
  aiScore:        integer('ai_score'),     // 1–10
  aiSummary:      text('ai_summary'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
});

// --- Hiring Manager Reviews ---
export const reviews = appSchema.table('reviews', {
  id:                varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId:             varchar('job_id', { length: 255 }).notNull(),
  candidateId:       varchar('candidate_id', { length: 255 }).notNull(),
  reviewedAt:        timestamp('reviewed_at').notNull().defaultNow(),
  satisfactionScore: integer('satisfaction_score'), // 1–5 post-review rating of AI accuracy
  notes:             text('notes'),
});

// --- Inferred Types ---
export type Job          = typeof jobs.$inferSelect;
export type NewJob       = typeof jobs.$inferInsert;
export type Candidate    = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type Interview    = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type Response     = typeof responses.$inferSelect;
export type NewResponse  = typeof responses.$inferInsert;
export type Review       = typeof reviews.$inferSelect;
export type NewReview    = typeof reviews.$inferInsert;
