import { z } from "zod";

export const crewReportSchema = z.object({
  reportingType: z.enum(["individual", "on_behalf"]),
  producerFirstName: z.string().trim().min(1, "First name is required").max(100),
  producerLastName: z.string().trim().min(1, "Last name is required").max(100),
  producerEmail: z.string().trim().email("Invalid email address").max(255),
  producerCompany: z.string().trim().max(200).optional(),
  producerAliases: z.string().trim().max(500).optional(),
  amountOwed: z.number().positive("Amount must be positive").max(10000000, "Amount too large"),
});

export const producerSubmissionSchema = z.object({
  crewMemberName: z.string().trim().min(1, "Crew member name is required").max(100),
  explanation: z.string().trim().min(10, "Explanation must be at least 10 characters").max(5000),
});

export const paymentConfirmationSchema = z.object({
  producerName: z.string().trim().min(1, "Producer name is required").max(100),
  amountPaid: z.number().positive("Amount must be positive").max(10000000, "Amount too large"),
});

export const counterDisputeSchema = z.object({
  originalReportRef: z.string().trim().min(1, "Report reference is required").max(100),
  explanation: z.string().trim().min(10, "Explanation must be at least 10 characters").max(5000),
});

export const adminNotesSchema = z.object({
  adminNotes: z.string().trim().max(2000).optional(),
});
