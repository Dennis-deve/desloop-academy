import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address');
export const passwordSchema = z.string().min(8, 'Use at least 8 characters');
export const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: emailSchema,
  password: passwordSchema,
  agree: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the demo terms' }) }),
});
export const teacherApplicationSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: emailSchema,
  background: z.string().trim().min(20, 'Please add at least 20 characters about your experience'),
  expertise: z.string().trim().min(3, 'Tell us your subject areas'),
  audience: z.string().min(1, 'Select an audience'),
  agree: z.literal(true, {
    errorMap: () => ({ message: 'Please acknowledge the programme terms' }),
  }),
});
export const schoolApplicationSchema = z.object({
  schoolName: z.string().trim().min(2, 'Enter your school name'),
  schoolType: z.string().min(1, 'Select a school type'),
  location: z.string().trim().min(2, 'Enter a general location'),
  contactName: z.string().trim().min(2, 'Enter the representative’s name'),
  email: emailSchema,
  learners: z.coerce.number().min(1, 'Enter at least one learner'),
  teachers: z.coerce.number().min(1, 'Enter at least one teacher'),
  programmes: z.string().trim().min(5, 'Tell us which programmes interest you'),
  connectivity: z.string().min(1, 'Select a connectivity option'),
  agree: z.literal(true, {
    errorMap: () => ({ message: 'Please acknowledge the privacy information' }),
  }),
});
export const facilitatorApplicationSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: emailSchema,
  expertise: z.string().trim().min(3, 'Enter your subject area'),
  experience: z.string().trim().min(20, 'Please describe your experience'),
  agree: z.literal(true, {
    errorMap: () => ({ message: 'Please acknowledge the review process' }),
  }),
});
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: emailSchema,
  topic: z.string().min(1, 'Choose a topic'),
  message: z.string().trim().min(10, 'Please add more detail'),
});
export const courseDraftSchema = z.object({
  title: z.string().trim().min(4, 'Add a descriptive title'),
  subject: z.string().trim().min(3, 'Enter a subject'),
  audience: z.enum(['Children', 'Teenagers', 'Adults', 'All ages']),
  objectives: z
    .string()
    .trim()
    .min(20, 'Describe the learning objectives in at least 20 characters'),
  duration: z.string().trim().min(2, 'Add an estimated duration'),
  language: z.string().trim().min(2, 'Choose a language'),
  teachingStyle: z.string().trim().min(2, 'Describe the teaching style'),
  projectOutcome: z.string().trim().min(8, 'Describe a practical project outcome'),
});
