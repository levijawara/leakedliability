// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1";
import * as React from "https://esm.sh/react@18.3.1";

interface ProducerReportNotificationProps {
  reportId: string;
  amountOwed: number;
  daysOverdue: number;
  oldestDebtDays: number;
  projectName: string;
}

export const ProducerReportNotification = ({
  reportId,
  amountOwed,
  daysOverdue,
  oldestDebtDays,
  projectName,
}: ProducerReportNotificationProps) => (
  <Html>
    <Head />
    <Preview>A report has been filed involving your company - Report ID: {reportId}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Report Filed on Leaked Liability™</Heading>
        
        <Text style={text}>
          A payment report has been filed involving your company on the Leaked Liability™ accountability system.
        </Text>

        <Section style={reportBox}>
          <Text style={reportLabel}>Report ID</Text>
          <Text style={reportValue}>{reportId}</Text>
          
          <Hr style={divider} />
          
          <Text style={reportLabel}>Project Name</Text>
          <Text style={reportValue}>{projectName}</Text>
          
          <Hr style={divider} />
          
          <Text style={reportLabel}>Amount Claimed</Text>
          <Text style={reportValue}>${amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          
          <Hr style={divider} />
          
          <Text style={reportLabel}>Days Since Invoice</Text>
          <Text style={reportValue}>{daysOverdue} days</Text>
          
          <Hr style={divider} />
          
          <Text style={reportLabel}>Your Oldest Debt (Leaderboard)</Text>
          <Text style={reportValue}>{oldestDebtDays} days</Text>
        </Section>

        <Section style={actionBox}>
          <Heading as="h2" style={h2}>Response Options</Heading>
          
          <Text style={text}>
            You can respond to this report by logging into your Leaked Liability™ account and submitting one of the following:
          </Text>

          <ul style={list}>
            <li style={listItem}>
              <strong>Payment Documentation 🧾</strong> - Submit receipts, bank statements, or payment confirmations
            </li>
            <li style={listItem}>
              <strong>Report Explanation ☮️</strong> - Acknowledge the debt and explain the delay or reason for non-payment
            </li>
            <li style={listItem}>
              <strong>Report Dispute ⁉️</strong> - Challenge the report with counter-evidence
            </li>
          </ul>

          <Link
            href={`${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovable.app') || 'https://leakedliability.lovable.app'}/submit`}
            style={button}
          >
            Respond to Report
          </Link>
        </Section>

        <Hr style={divider} />

        <Text style={footerText}>
          <strong>Privacy Notice:</strong> Crew member names are kept confidential throughout the process. 
          All reports are reviewed by our verification team before becoming public.
        </Text>

        <Text style={footer}>
          Leaked Liability™ Accountability System
          <br />
          This is an automated notification. Please do not reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ProducerReportNotification;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '30px 0 15px',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const reportBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 40px',
  border: '1px solid #e5e7eb',
};

const reportLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
};

const reportValue = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const actionBox = {
  padding: '0 40px',
  margin: '32px 0',
};

const list = {
  margin: '16px 0',
  paddingLeft: '20px',
};

const listItem = {
  color: '#484848',
  fontSize: '15px',
  lineHeight: '24px',
  marginBottom: '12px',
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  margin: '24px 0',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '0 40px',
  margin: '24px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 40px',
  margin: '32px 0',
};
