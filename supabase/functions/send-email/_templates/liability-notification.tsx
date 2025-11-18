import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';

interface LiabilityNotificationProps {
  reportId: string;
  amountOwed: number;
  projectName: string;
  invoiceDate: string;
  daysOverdue: number;
  claimUrl: string;
  expirationDate: string;
  accusedName: string;
}

export const LiabilityNotification = ({
  reportId,
  amountOwed,
  projectName,
  invoiceDate,
  daysOverdue,
  claimUrl,
  expirationDate,
  accusedName,
}: LiabilityNotificationProps) => (
  <Html>
    <Head />
    <Preview>You've Been Named as Responsible Party - Leaked Liability™</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ You've Been Named as Responsible Party</Heading>
        
        <Text style={text}>
          Dear {accusedName},
        </Text>
        
        <Text style={text}>
          You have been identified as the responsible party for an outstanding payment 
          on the Leaked Liability™ platform.
        </Text>
        
        <Section style={reportDetailsBox}>
          <Text style={reportDetailLabel}>Report Details</Text>
          <Text style={reportDetail}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={reportDetail}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
          <Text style={reportDetail}><strong>Project:</strong> {projectName}</Text>
          <Text style={reportDetail}><strong>Invoice Date:</strong> {invoiceDate}</Text>
          <Text style={reportDetail}><strong>Days Overdue:</strong> {daysOverdue} days</Text>
        </Section>
        
        <Hr style={hr} />
        
        <Section style={warningBox}>
          <Text style={warningHeading}>⚠️ LEGAL NOTICE</Text>
          <Text style={warningText}>
            You must respond within 7 days (by {expirationDate}). All actions are logged 
            and timestamped for legal purposes. Failure to respond will result in this 
            debt remaining attributed to you on the Leaked Liability™ leaderboard.
          </Text>
        </Section>
        
        <Section style={ctaSection}>
          <Text style={text}>
            You have three options to respond to this claim:
          </Text>
          
          <Button href={claimUrl} style={primaryButton}>
            Respond to This Claim
          </Button>
        </Section>
        
        <Hr style={hr} />
        
        <Section style={optionsSection}>
          <Text style={optionHeading}>Your Response Options:</Text>
          
          <Text style={optionText}>
            <strong>1. Accept Responsibility:</strong> Confirm you will handle this payment 
            and upload proof of payment.
          </Text>
          
          <Text style={optionText}>
            <strong>2. Redirect Liability:</strong> If this debt is not your responsibility, 
            you can name the actual responsible party. You must affirm under penalty of 
            perjury that your claim is accurate.
          </Text>
          
          <Text style={optionText}>
            <strong>3. Dispute the Report:</strong> Submit a formal dispute with supporting 
            evidence if you believe this report is false or inaccurate.
          </Text>
        </Section>
        
        <Hr style={hr} />
        
        <Text style={footerText}>
          This link expires on {expirationDate}. If you do not respond, this debt 
          will remain attributed to you on the Leaked Liability™ public leaderboard.
        </Text>
        
        <Text style={footer}>
          <Link
            href="https://leakedliability.com"
            target="_blank"
            style={footerLink}
          >
            Leaked Liability™
          </Link>
          <br />
          Transparency in Film & TV Production Payments
        </Text>
      </Container>
    </Body>
  </Html>
);

export default LiabilityNotification;

const main = {
  backgroundColor: '#f6f6f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
};

const reportDetailsBox = {
  backgroundColor: '#f9f9f9',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
};

const reportDetailLabel = {
  color: '#666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const reportDetail = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '32px 40px',
};

const warningBox = {
  backgroundColor: '#fff3cd',
  border: '2px solid #ff4444',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '24px',
};

const warningHeading = {
  color: '#ff4444',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const warningText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const ctaSection = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const primaryButton = {
  backgroundColor: '#ff4444',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
  margin: '16px 0',
};

const optionsSection = {
  margin: '24px 40px',
};

const optionHeading = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const optionText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0',
};

const footerText = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '24px 40px',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#ff4444',
  textDecoration: 'underline',
};
