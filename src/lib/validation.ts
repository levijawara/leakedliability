import { z } from "zod";

export const crewReportSchema = z.object({
  reportingType: z.enum(["producer", "production_company", "both"]),
  producerFirstName: z.string().trim().min(1, "First name is required").max(100),
  producerLastName: z.string().trim().max(100),
  producerEmail: z.string().trim().email("Invalid email address").max(255),
  producerCompany: z.string().trim().max(200).optional(),
  producerAliases: z.string().trim().max(500).optional(),
  amountOwed: z.number().positive("Amount must be positive").max(10000000, "Amount too large"),
  invoiceDate: z.date({ required_error: "Invoice date is required" }),
  projectName: z.string().trim().min(1, "Project name is required").max(200),
  city: z.string().trim().max(100).optional(),
}).refine((data) => {
  // Only require last name if reporting producer or both
  if (data.reportingType === "production_company") {
    return true;
  }
  return data.producerLastName.length > 0;
}, {
  message: "Last name is required when reporting a producer",
  path: ["producerLastName"]
});

export const paymentDocumentationSchema = z.object({
  crewMemberName: z.string().trim().min(1, "Crew member name is required").max(100),
  explanation: z.string().trim().max(5000).optional(),
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

export const suggestionSchema = z.object({
  suggestion: z.string().trim().min(5, "Suggestion must be at least 5 characters").max(4000, "Suggestion must be less than 4000 characters"),
  meta: z.record(z.unknown()).optional(),
});

export const vendorReportSchema = z.object({
  reportingType: z.enum(["producer", "production_company", "both"]),
  vendorCompany: z.string().trim().min(1, "Company name is required").max(200),
  vendorDBA: z.string().trim().max(200).optional(),
  vendorWebsite: z.string().trim().url("Invalid URL").max(500).optional().or(z.literal("")),
  contactName: z.string().trim().min(1, "Contact name is required").max(100),
  contactEmail: z.string().trim().email("Invalid email address").max(255),
  contactPhone: z.string().trim().max(50).optional(),
  vendorType: z.string().min(1, "Vendor type is required"),
  vendorTypeOther: z.string().trim().max(100).optional(),
  producerFirstName: z.string().trim().min(1, "Producer first name is required").max(100),
  producerLastName: z.string().trim().max(100),
  producerEmail: z.string().trim().email("Invalid email address").max(255),
  producerAliases: z.string().trim().max(500).optional(),
  invoiceNumber: z.string().trim().min(1, "Invoice number is required").max(100),
  invoiceDate: z.date({ required_error: "Invoice date is required" }),
  amountOwed: z.number().positive("Amount must be positive").max(10000000, "Amount too large"),
  projectName: z.string().trim().min(1, "Project name is required").max(200),
  serviceDescription: z.string().trim().min(10, "Description must be at least 10 characters").max(500),
  purchaseOrderNumber: z.string().trim().max(100).optional(),
  netTerms: z.string().optional(),
  dueDate: z.date().optional(),
  depositAmount: z.number().nonnegative().max(10000000).optional(),
  deliveryStartDate: z.date().optional(),
  deliveryEndDate: z.date().optional(),
  city: z.string().trim().max(100).optional(),
  bookingMethod: z.string().max(100).optional(),
}).refine((data) => {
  if (data.reportingType === "production_company") {
    return true;
  }
  return data.producerLastName.length > 0;
}, {
  message: "Producer last name is required when reporting a producer",
  path: ["producerLastName"]
}).refine((data) => {
  if (data.vendorType === "Other") {
    return data.vendorTypeOther && data.vendorTypeOther.length > 0;
  }
  return true;
}, {
  message: "Please specify vendor type",
  path: ["vendorTypeOther"]
}).refine((data) => {
  if (data.deliveryStartDate && data.deliveryEndDate) {
    return data.deliveryEndDate >= data.deliveryStartDate;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["deliveryEndDate"]
});
