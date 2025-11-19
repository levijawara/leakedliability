import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, User, Calendar } from "lucide-react";
import { WelcomeEmail } from "../../../supabase/functions/send-email/_templates/welcome";
import { CrewReportConfirmation } from "../../../supabase/functions/send-email/_templates/crew-report-confirmation";
import { VendorReportConfirmation } from "../../../supabase/functions/send-email/_templates/vendor-report-confirmation";
import { CrewReportVerified } from "../../../supabase/functions/send-email/_templates/crew-report-verified";
import { VendorReportVerified } from "../../../supabase/functions/send-email/_templates/vendor-report-verified";
import { CrewReportRejected } from "../../../supabase/functions/send-email/_templates/crew-report-rejected";
import { VendorReportRejected } from "../../../supabase/functions/send-email/_templates/vendor-report-rejected";
import { ProducerReportNotification } from "../../../supabase/functions/send-email/_templates/producer-report-notification";
import { LiabilityNotification } from "../../../supabase/functions/send-email/_templates/liability-notification";
import { LiabilityLoopDetected } from "../../../supabase/functions/send-email/_templates/liability-loop-detected";
import { AdminNotification } from "../../../supabase/functions/send-email/_templates/admin-notification";
import { AdminCreatedAccount } from "../../../supabase/functions/send-email/_templates/admin-created-account";
import { CrewReportPaymentConfirmed } from "../../../supabase/functions/send-email/_templates/crew-report-payment-confirmed";
import { ProducerSubmission } from "../../../supabase/functions/send-email/_templates/producer-submission";
import { DisputeSubmission } from "../../../supabase/functions/send-email/_templates/dispute-submission";
import { CounterDisputeSubmission } from "../../../supabase/functions/send-email/_templates/counter-dispute-submission";
import { ProducerPaymentConfirmation } from "../../../supabase/functions/send-email/_templates/producer-payment-confirmation";

// Mock data for each email template
const MOCK_DATA: Record<string, any> = {
  "welcome.tsx": {
    userName: "John Doe",
    accountType: "Crew Member",
  },
  "crew-report-confirmation.tsx": {
    userName: "Jane Smith",
    producerName: "ACME Productions",
    amountOwed: 5000,
    projectName: "Film Project X",
  },
  "vendor-report-confirmation.tsx": {
    userName: "Mike Johnson",
    vendorName: "Equipment Rentals Inc.",
    producerName: "Big Film Studio",
    invoiceNumber: "INV-2024-001",
    amountOwed: 12500,
    projectName: "Feature Film Alpha",
  },
  "crew-report-verified.tsx": {
    reportId: "LL-2024-CR-001",
    producerName: "Studio XYZ",
    amount: 7500,
    projectName: "Documentary Series",
    verificationNotes: "All documentation verified. Report approved for leaderboard.",
  },
  "vendor-report-verified.tsx": {
    reportId: "LL-2024-VR-001",
    vendorName: "Catering Services Co.",
    producerName: "Indie Productions",
    amount: 3200,
    projectName: "Short Film Beta",
    verificationNotes: "Invoice and contract confirmed.",
  },
  "crew-report-rejected.tsx": {
    reportId: "LL-2024-CR-002",
    producerName: "Film Company ABC",
    amount: 4000,
    projectName: "TV Series Pilot",
    rejectionReason: "Documentation incomplete. Please provide signed contract and invoice.",
  },
  "vendor-report-rejected.tsx": {
    reportId: "LL-2024-VR-002",
    vendorName: "Lighting Equipment Inc.",
    producerName: "Production House XYZ",
    amount: 8500,
    projectName: "Commercial Shoot",
    rejectionReason: "Invoice date doesn't match project timeline. Please clarify.",
  },
  "producer-report-notification.tsx": {
    reportId: "LL-2024-001",
    amountOwed: 15000,
    daysOverdue: 45,
    oldestDebtDays: 45,
    projectName: "Feature Film Production",
  },
  "liability-notification.tsx": {
    reportId: "LL-2024-LN-001",
    accusedName: "John Producer",
    originalName: "Jane Crew Member",
    amountOwed: 6500,
    projectName: "Music Video Shoot",
    claimUrl: "https://leakedliability.com/liability/claim/abc123xyz",
  },
  "liability-loop-detected.tsx": {
    reportId: "LL-2024-LOOP-001",
    originalName: "Producer A",
    amountOwed: 9000,
    projectName: "Documentary Film",
  },
  "admin-notification.tsx": {
    submissionType: "Crew Payment Report",
    userName: "Sarah Johnson",
    userEmail: "sarah@example.com",
    details: "New crew report submitted for verification",
    adminDashboardUrl: "https://leakedliability.com/admin",
  },
  "admin-created-account.tsx": {
    userName: "Alex Thompson",
    userEmail: "alex@example.com",
    tempPassword: "TempPass123!",
    reportId: "LL-2024-NEW-001",
    accountType: "Crew Member",
    loginUrl: "https://leakedliability.com/auth",
  },
  "crew-report-payment-confirmed.tsx": {
    reportId: "LL-2024-PC-001",
    producerName: "Studio Productions",
    amount: 5500,
    paymentDate: "2024-01-15",
  },
  "producer-submission.tsx": {
    userName: "Producer Bob",
    submissionType: "Self-Report Payment Issue",
  },
  "dispute-submission.tsx": {
    userName: "Disputed Party",
    disputeType: "Report Inaccuracy",
  },
  "counter-dispute-submission.tsx": {
    userName: "Original Reporter",
    originalReportRef: "LL-2024-001",
  },
  "producer-payment-confirmation.tsx": {
    userName: "Producer Alice",
    producerName: "Creative Films LLC",
    amountPaid: 8000,
  },
};

// Email subject lines
const EMAIL_SUBJECTS: Record<string, string> = {
  "welcome.tsx": "Welcome to Leaked Liability™",
  "crew-report-confirmation.tsx": "Your Report Has Been Received",
  "vendor-report-confirmation.tsx": "Vendor Report Confirmation",
  "crew-report-verified.tsx": "Your Report Has Been Verified",
  "vendor-report-verified.tsx": "Vendor Report Verified",
  "crew-report-rejected.tsx": "Report Requires Additional Information",
  "vendor-report-rejected.tsx": "Vendor Report Requires Additional Information",
  "producer-report-notification.tsx": "Payment Report Filed Against You",
  "liability-notification.tsx": "ACTION REQUIRED: Payment Liability Claim",
  "liability-loop-detected.tsx": "NOTICE: Liability Loop Detected",
  "admin-notification.tsx": "New Submission Requires Review",
  "admin-created-account.tsx": "Your Leaked Liability Account",
  "crew-report-payment-confirmed.tsx": "Payment Confirmed",
  "producer-submission.tsx": "Your Submission Has Been Received",
  "dispute-submission.tsx": "Your Dispute Has Been Submitted",
  "counter-dispute-submission.tsx": "Your Counter-Dispute Has Been Submitted",
  "producer-payment-confirmation.tsx": "Payment Confirmation Received",
};

interface EmailPreviewProps {
  templateFile: string;
  emailName: string;
  status: "implemented" | "pending";
}

export function EmailPreview({ templateFile, emailName, status }: EmailPreviewProps) {
  const mockData = MOCK_DATA[templateFile];
  const subject = EMAIL_SUBJECTS[templateFile];

  if (status === "pending") {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed">
        <div className="text-center p-8">
          <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Template Not Yet Created</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This email template is planned but not yet implemented.
          </p>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
      </div>
    );
  }

  // Render the actual email component
  const renderEmailComponent = () => {
    switch (templateFile) {
      case "welcome.tsx":
        return <WelcomeEmail {...mockData} />;
      case "crew-report-confirmation.tsx":
        return <CrewReportConfirmation {...mockData} />;
      case "vendor-report-confirmation.tsx":
        return <VendorReportConfirmation {...mockData} />;
      case "crew-report-verified.tsx":
        return <CrewReportVerified {...mockData} />;
      case "vendor-report-verified.tsx":
        return <VendorReportVerified {...mockData} />;
      case "crew-report-rejected.tsx":
        return <CrewReportRejected {...mockData} />;
      case "vendor-report-rejected.tsx":
        return <VendorReportRejected {...mockData} />;
      case "producer-report-notification.tsx":
        return <ProducerReportNotification {...mockData} />;
      case "liability-notification.tsx":
        return <LiabilityNotification {...mockData} />;
      case "liability-loop-detected.tsx":
        return <LiabilityLoopDetected {...mockData} />;
      case "admin-notification.tsx":
        return <AdminNotification {...mockData} />;
      case "admin-created-account.tsx":
        return <AdminCreatedAccount {...mockData} />;
      case "crew-report-payment-confirmed.tsx":
        return <CrewReportPaymentConfirmed {...mockData} />;
      case "producer-submission.tsx":
        return <ProducerSubmission {...mockData} />;
      case "dispute-submission.tsx":
        return <DisputeSubmission {...mockData} />;
      case "counter-dispute-submission.tsx":
        return <CounterDisputeSubmission {...mockData} />;
      case "producer-payment-confirmation.tsx":
        return <ProducerPaymentConfirmation {...mockData} />;
      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            Preview not available for this template
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Email Header (fake inbox UI) */}
      <Card className="mb-4 p-4 bg-background">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">From:</span>
            <span>Leaked Liability &lt;noreply@leakedliability.com&gt;</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">To:</span>
            <span>recipient@example.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Subject:</span>
            <span className="font-semibold">{subject}</span>
          </div>
        </div>
      </Card>

      {/* Email Body Preview */}
      <div className="flex-1 overflow-auto bg-[#f6f9fc] rounded-lg border p-6">
        <div className="max-w-2xl mx-auto">
          {renderEmailComponent()}
        </div>
      </div>
    </div>
  );
}
