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
import { DisputeEvidenceRoundStarted } from "../../../supabase/functions/send-email/_templates/dispute-evidence-round-started";
import { DisputeAdditionalInfoRequired } from "../../../supabase/functions/send-email/_templates/dispute-additional-info-required";
import { DisputeResolvedPaid } from "../../../supabase/functions/send-email/_templates/dispute-resolved-paid";
import { DisputeResolvedMutual } from "../../../supabase/functions/send-email/_templates/dispute-resolved-mutual";
import { DisputeClosedUnresolved } from "../../../supabase/functions/send-email/_templates/dispute-closed-unresolved";
import { SubscriptionPaymentFailed } from "../../../supabase/functions/send-email/_templates/subscription-payment-failed";
import { SubscriptionCanceled } from "../../../supabase/functions/send-email/_templates/subscription-canceled";

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
  "email-verification.tsx": {
    userName: "Alex Chen",
    verificationUrl: "https://leakedliability.com/auth/verify?token=abc123xyz",
    verificationCode: "847291"
  },
  "password-reset.tsx": {
    userName: "Jordan Williams",
    resetUrl: "https://leakedliability.com/auth/reset-password?token=def456uvw",
    expiresIn: "60 minutes"
  },
  "liability-accepted.tsx": {
    recipientType: 'acceptor',
    acceptorName: 'ACME Productions',
    acceptorEmail: 'ceo@acme.com',
    reportId: 'CR-20251118-12345',
    amountOwed: 2500,
    projectName: 'Music Video Shoot',
    invoiceDate: '2025-10-15',
    daysOverdue: 34,
    chainLength: 3,
    paymentInstructions: 'Upload proof of payment or pay via LL Anonymous Escrow.',
    recipientName: 'Jordan Smith'
  },
  "dispute-evidence-round-started.tsx": {
    recipientName: 'Sarah Johnson',
    recipientRole: 'reporter',
    reportId: 'CR-20251115-67890',
    round: 1,
    amountOwed: 4200,
    projectName: 'Commercial Production',
    deadline: '72 hours from now',
    disputeId: 'dispute-uuid-123'
  },
  "dispute-additional-info-required.tsx": {
    recipientName: 'Mike Williams',
    reportId: 'CR-20251110-11223',
    round: 2,
    adminRequest: 'Please provide additional documentation showing the agreed-upon payment terms and any written communication about the invoice date. Contracts or email threads would be helpful.',
    deadline: '48 hours from now',
    disputeId: 'dispute-uuid-456'
  },
  "dispute-resolved-paid.tsx": {
    recipientName: 'Alex Chen',
    recipientRole: 'reporter',
    reportId: 'CR-20251105-33445',
    amountPaid: 6800,
    projectName: 'Documentary Series',
    producerName: 'Visionary Films LLC',
    paymentDate: 'December 18, 2025'
  },
  "dispute-resolved-mutual.tsx": {
    recipientName: 'Taylor Martinez',
    recipientRole: 'producer',
    reportId: 'CR-20251120-55667',
    amountOwed: 3200,
    projectName: 'Short Film "Echoes"',
    producerName: 'Indie Studios Co.',
    resolutionDate: 'December 19, 2025'
  },
  "dispute-closed-unresolved.tsx": {
    recipientName: 'Jamie Lee',
    recipientRole: 'reporter',
    reportId: 'CR-20251101-77889',
    amountOwed: 9500,
    projectName: 'Feature Film "Horizon"',
    producerName: 'Sunset Productions',
    closureDate: 'December 20, 2025',
    rounds: 2
  },
  "subscription-payment-failed.tsx": {
    userName: 'Alex Thompson',
    gracePeriodEnd: '2025-12-25T00:00:00.000Z',
    billingPortalUrl: 'https://leakedliability.com/subscribe',
    failedAttempts: 1
  },
  "subscription-canceled.tsx": {
    userName: 'Jordan Smith',
    subscriptionTier: 'producer_t1',
    resubscribeUrl: 'https://leakedliability.com/subscribe',
    reason: 'grace_period_expired'
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
  "email-verification.tsx": "Verify Your Email Address",
  "password-reset.tsx": "Reset Your Password",
  "liability-accepted.tsx": "Liability Accepted - Next Steps",
  "dispute-evidence-round-started.tsx": "Dispute Evidence Required",
  "dispute-additional-info-required.tsx": "Additional Information Required",
  "dispute-resolved-paid.tsx": "Dispute Resolved: Payment Confirmed",
  "dispute-resolved-mutual.tsx": "Dispute Resolved: Mutual Agreement",
  "dispute-closed-unresolved.tsx": "Dispute Closed: Unresolved",
  "subscription-payment-failed.tsx": "Payment Failed - Action Required",
  "subscription-canceled.tsx": "Subscription Canceled - Resubscribe Anytime",
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
      case "email-verification.tsx":
        return (
          <div className="email-body bg-white p-8 rounded-lg" style={{ fontFamily: '"IBM Plex Mono", "Courier New", monospace' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
              Verify Your Email Address
            </h1>
            <p style={{ marginBottom: '16px', color: '#333', fontSize: '14px', lineHeight: '24px' }}>
              Hi {mockData.userName},
            </p>
            <p style={{ marginBottom: '16px', color: '#333', fontSize: '14px', lineHeight: '24px' }}>
              Please verify your email address to complete your Leaked Liability™ account setup. 
              This ensures the security of your account and enables all platform features.
            </p>
            <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '5px', margin: '20px 0', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Verification Code:
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px', color: '#000' }}>
                {mockData.verificationCode}
              </p>
            </div>
            <div style={{ margin: '32px 0', textAlign: 'center' }}>
              <a
                href={mockData.verificationUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#000',
                  color: '#fff',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Verify Email Address
              </a>
            </div>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '32px', lineHeight: '20px' }}>
              If you didn't create this account, you can safely ignore this email.
            </p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '32px', lineHeight: '20px' }}>
              Best regards,<br />
              The PSCS Team<br />
              <a href="https://leakedliability.com" style={{ color: '#000', textDecoration: 'underline' }}>
                leakedliability.com
              </a>
            </p>
          </div>
        );
      case "password-reset.tsx":
        return (
          <div className="email-body bg-white p-8 rounded-lg" style={{ fontFamily: '"IBM Plex Mono", "Courier New", monospace' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
              Reset Your Password
            </h1>
            <p style={{ marginBottom: '16px', color: '#333', fontSize: '14px', lineHeight: '24px' }}>
              Hi {mockData.userName},
            </p>
            <p style={{ marginBottom: '16px', color: '#333', fontSize: '14px', lineHeight: '24px' }}>
              We received a request to reset your password for your Leaked Liability™ account. 
              Click the button below to create a new password.
            </p>
            <div style={{ margin: '32px 0', textAlign: 'center' }}>
              <a
                href={mockData.resetUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#000',
                  color: '#fff',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Reset Password
              </a>
            </div>
            <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ff6b6b', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#721c24', lineHeight: '20px' }}>
                <strong>⚠️ Security Notice:</strong> This link expires in {mockData.expiresIn}. 
                If you didn't request this reset, your account may be compromised. Contact support immediately.
              </p>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '32px', lineHeight: '20px' }}>
              Best regards,<br />
              The PSCS Team<br />
              <a href="https://leakedliability.com" style={{ color: '#000', textDecoration: 'underline' }}>
                leakedliability.com
              </a>
            </p>
          </div>
        );
      case "liability-accepted.tsx":
        const recipientType = mockData.recipientType || 'acceptor';
        
        if (recipientType === 'acceptor') {
          return (
            <div className="email-body bg-[#0D0D0D] p-8 rounded-lg" style={{ fontFamily: '"IBM Plex Mono", "Courier New", monospace' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#FFFFFF' }}>
                ✅ Liability Accepted — Next Steps
              </h1>
              <p style={{ marginBottom: '16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>
                Hi {mockData.acceptorName},
              </p>
              <p style={{ marginBottom: '16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>
                You have accepted full financial responsibility for Report #{mockData.reportId}.
              </p>
              <div style={{ backgroundColor: '#262626', padding: '20px', borderRadius: '5px', margin: '20px 0', border: '1px solid #333333' }}>
                <p style={{ margin: '8px 0', color: '#E0E0E0', fontSize: '14px' }}><strong>Amount Owed:</strong> ${mockData.amountOwed.toLocaleString()}</p>
                <p style={{ margin: '8px 0', color: '#E0E0E0', fontSize: '14px' }}><strong>Project:</strong> {mockData.projectName}</p>
                <p style={{ margin: '8px 0', color: '#E0E0E0', fontSize: '14px' }}><strong>Invoice Date:</strong> {mockData.invoiceDate}</p>
                <p style={{ margin: '8px 0', color: '#E0E0E0', fontSize: '14px' }}><strong>Days Overdue:</strong> {mockData.daysOverdue} days</p>
              </div>
              <h2 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>Payment Options:</h2>
              <p style={{ color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>1. Upload proof of direct payment to crew/vendor</p>
              <p style={{ color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>2. Pay securely via LL™ Anonymous Escrow</p>
              <a
                href="#"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  marginTop: '20px'
                }}
              >
                Complete Payment
              </a>
              <p style={{ color: '#999999', fontSize: '12px', marginTop: '20px', fontStyle: 'italic' }}>
                ⚖️ This acceptance has been timestamped and logged for legal purposes.
              </p>
            </div>
          );
        } else if (recipientType === 'chain_member') {
          return (
            <div className="email-body bg-[#0D0D0D] p-8 rounded-lg" style={{ fontFamily: '"IBM Plex Mono", "Courier New", monospace' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#FFFFFF' }}>
                ✅ Liability Resolution — You Are Cleared
              </h1>
              <p style={{ marginBottom: '16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>
                Hi {mockData.recipientName},
              </p>
              <p style={{ marginBottom: '16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>
                <strong>{mockData.acceptorName}</strong> has accepted full responsibility for Report #{mockData.reportId}.
              </p>
              <div style={{ backgroundColor: '#0A3D0A', border: '1px solid #00B14F', padding: '15px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px' }}>
                <p style={{ margin: 0, color: '#00FF66', fontSize: '14px', lineHeight: '24px' }}>
                  ✅ <strong>You are no longer considered liable for this debt.</strong>
                </p>
              </div>
              <h2 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>Report Summary:</h2>
              <ul style={{ color: '#E0E0E0', fontSize: '14px', lineHeight: '24px', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>Amount: ${mockData.amountOwed.toLocaleString()}</li>
                <li style={{ marginBottom: '8px' }}>Project: {mockData.projectName}</li>
                <li style={{ marginBottom: '8px' }}>Days Overdue: {mockData.daysOverdue}</li>
              </ul>
            </div>
          );
        } else if (recipientType === 'reporter') {
          return (
            <div className="email-body bg-[#0D0D0D] p-8 rounded-lg" style={{ fontFamily: '"IBM Plex Mono", "Courier New", monospace' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#FFFFFF' }}>
                ✅ Liability Accepted — Next Steps
              </h1>
              <p style={{ marginBottom: '16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>
                Hi {mockData.recipientName},
              </p>
              <p style={{ marginBottom: '16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>
                <strong>{mockData.acceptorName}</strong> has accepted responsibility for your report #{mockData.reportId}.
              </p>
              <h2 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>What Happens Next:</h2>
              <ul style={{ color: '#E0E0E0', fontSize: '14px', lineHeight: '24px', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>Payment is expected within 30 days</li>
                <li style={{ marginBottom: '8px' }}>You'll receive confirmation when payment is completed</li>
                <li style={{ marginBottom: '8px' }}>If payment isn't made, the report remains on the leaderboard</li>
              </ul>
              <a
                href="#"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  marginTop: '20px'
                }}
              >
                View Report Status
              </a>
            </div>
          );
        } else {
          return (
            <div className="email-body bg-[#0D0D0D] p-8 rounded-lg" style={{ fontFamily: '"IBM Plex Mono", "Courier New", monospace' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#FFFFFF' }}>
                ⚖️ Liability Accepted — Admin Notification
              </h1>
              <p style={{ marginBottom: '16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '24px' }}>
                Report #{mockData.reportId} has reached resolution.
              </p>
              <div style={{ backgroundColor: '#262626', padding: '20px', borderRadius: '5px', margin: '20px 0', border: '1px solid #333333' }}>
                <p style={{ margin: '8px 0', color: '#E0E0E0', fontSize: '14px' }}><strong>Acceptor:</strong> {mockData.acceptorName} ({mockData.acceptorEmail})</p>
                <p style={{ margin: '8px 0', color: '#E0E0E0', fontSize: '14px' }}><strong>Amount:</strong> ${mockData.amountOwed.toLocaleString()}</p>
                <p style={{ margin: '8px 0', color: '#E0E0E0', fontSize: '14px' }}><strong>Chain Length:</strong> {mockData.chainLength || 1} parties involved</p>
              </div>
              <div style={{ backgroundColor: '#3D1A0A', border: '1px solid #FF6B1E', padding: '15px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px' }}>
                <p style={{ margin: 0, color: '#FF9966', fontSize: '13px', lineHeight: '20px' }}>
                  ⚠️ <strong>Action Required:</strong> Monitor for payment completion within 30 days.
                </p>
              </div>
              <a
                href="#"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  marginTop: '20px'
                }}
              >
                View in Admin Dashboard
              </a>
            </div>
          );
        }
      
      case 'dispute-evidence-round-started.tsx':
        return <DisputeEvidenceRoundStarted {...mockData} />;
      case 'dispute-additional-info-required.tsx':
        return <DisputeAdditionalInfoRequired {...mockData} />;
      case 'dispute-resolved-paid.tsx':
        return <DisputeResolvedPaid {...mockData} />;
      case 'dispute-resolved-mutual.tsx':
        return <DisputeResolvedMutual {...mockData} />;
      case 'dispute-closed-unresolved.tsx':
        return <DisputeClosedUnresolved {...mockData} />;
      case 'subscription-payment-failed.tsx':
        return <SubscriptionPaymentFailed {...mockData} />;
      case 'subscription-canceled.tsx':
        return <SubscriptionCanceled {...mockData} />;
      
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
