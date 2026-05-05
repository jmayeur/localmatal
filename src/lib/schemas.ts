import { z } from 'zod';

export const submissionSchema = z.object({
  place_name: z.string().min(1).max(100),
  contributor_name: z.string().min(1).max(80),
  sentence: z.string().min(1).max(250),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Bot traps
  website: z.string().max(0, 'Bot detected'),
  time_on_form: z.coerce.number().min(3000, 'Submission too fast'),
  // Turnstile token (validated separately in middleware)
  'cf-turnstile-response': z.string().min(1),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const reportSchema = z.object({
  reason: z.enum(['inappropriate', 'spam', 'privacy', 'other']),
  'cf-turnstile-response': z.string().min(1),
});

export type ReportInput = z.infer<typeof reportSchema>;
