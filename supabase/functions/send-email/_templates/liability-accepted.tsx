import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface LiabilityAcceptedProps {
  recipientType: 'acceptor' | 'chain_member' | 'reporter' | 'admin';
  acceptorName: string;
  acceptorEmail: string;
  reportId: string;
  amountOwed: number;
  projectName: string;
  invoiceDate: string;
  daysOverdue: number;
  recipientName?: string;
  chainLength?: number;
  paymentInstructions?: string;
}

export const LiabilityAccepted = ({
  recipientType,
  acceptorName,
  acceptorEmail,
  reportId,
  amountOwed,
  projectName,
  invoiceDate,
  daysOverdue,
  recipientName,
  chainLength,
  paymentInstructions,
}: LiabilityAcceptedProps) => {
  const previewText = recipientType === 'acceptor' 
    ? 'Liability Accepted — Next Steps for Payment'
    : recipientType === 'chain_member'
    ? 'You Are Cleared — Liability Resolved'
    : recipientType === 'reporter'
    ? 'Liability Accepted — Payment Expected'
    : 'Admin Notice — Liability Accepted';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {recipientType === 'acceptor' && (
            <>
              <Heading style={h1}>✅ Liability Accepted — Next Steps</Heading>
              <Text style={text}>Hi {acceptorName},</Text>
              <Text style={text}>
                You have accepted full financial responsibility for Report #{reportId}.
              </Text>
              <div style={infoBox}>
                <Text style={infoText}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={infoText}><strong>Project:</strong> {projectName}</Text>
                <Text style={infoText}><strong>Invoice Date:</strong> {invoiceDate}</Text>
                <Text style={infoText}><strong>Days Overdue:</strong> {daysOverdue} days</Text>
              </div>
              <Heading style={h2}>Payment Options:</Heading>
              <Text style={text}>1. Upload proof of direct payment to crew/vendor</Text>
              <Text style={text}>2. Pay securely via LL™ Anonymous Escrow</Text>
              <Link
                href="https://leakedliability.com/pay-escrow"
                style={button}
              >
                Complete Payment
              </Link>
              <Text style={legalNotice}>
                ⚖️ This acceptance has been timestamped and logged for legal purposes.
              </Text>
            </>
          )}

          {recipientType === 'chain_member' && (
            <>
              <Heading style={h1}>✅ Liability Resolution — You Are Cleared</Heading>
              <Text style={text}>Hi {recipientName},</Text>
              <Text style={text}>
                <strong>{acceptorName}</strong> has accepted full responsibility for Report #{reportId}.
              </Text>
              <div style={successBox}>
                <Text style={successText}>
                  ✅ <strong>You are no longer considered liable for this debt.</strong>
                </Text>
              </div>
              <Heading style={h2}>Report Summary:</Heading>
              <ul style={list}>
                <li style={listItem}>Amount: ${amountOwed.toLocaleString()}</li>
                <li style={listItem}>Project: {projectName}</li>
                <li style={listItem}>Days Overdue: {daysOverdue}</li>
              </ul>
              <Text style={text}>
                This resolution concludes your involvement in this liability chain.
              </Text>
            </>
          )}

          {recipientType === 'reporter' && (
            <>
              <Heading style={h1}>✅ Liability Accepted — Next Steps</Heading>
              <Text style={text}>Hi {recipientName},</Text>
              <Text style={text}>
                <strong>{acceptorName}</strong> has accepted responsibility for your report #{reportId}.
              </Text>
              <Heading style={h2}>What Happens Next:</Heading>
              <ul style={list}>
                <li style={listItem}>Payment is expected within 30 days</li>
                <li style={listItem}>You'll receive confirmation when payment is completed</li>
                <li style={listItem}>If payment isn't made, the report remains on the leaderboard</li>
              </ul>
              <div style={infoBox}>
                <Text style={infoText}><strong>Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={infoText}><strong>Project:</strong> {projectName}</Text>
                <Text style={infoText}><strong>Liable Party:</strong> {acceptorName}</Text>
              </div>
              <Link
                href="https://leakedliability.com/profile"
                style={button}
              >
                View Report Status
              </Link>
            </>
          )}

          {recipientType === 'admin' && (
            <>
              <Heading style={h1}>⚖️ Liability Accepted — Admin Notification</Heading>
              <Text style={text}>Report #{reportId} has reached resolution.</Text>
              <div style={infoBox}>
                <Text style={infoText}><strong>Acceptor:</strong> {acceptorName} ({acceptorEmail})</Text>
                <Text style={infoText}><strong>Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={infoText}><strong>Project:</strong> {projectName}</Text>
                <Text style={infoText}><strong>Days Overdue:</strong> {daysOverdue}</Text>
                <Text style={infoText}><strong>Chain Length:</strong> {chainLength || 1} parties involved</Text>
              </div>
              <div style={warningBox}>
                <Text style={warningText}>
                  ⚠️ <strong>Action Required:</strong> Monitor for payment completion within 30 days.
                </Text>
              </div>
              <Link
                href="https://leakedliability.com/admin"
                style={button}
              >
                View in Admin Dashboard
              </Link>
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            <strong>PSCS Team</strong><br />
            Leaked Liability™<br />
            <Link href="https://leakedliability.com" style={footerLink}>
              leakedliability.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default LiabilityAccepted;

const main = {
  backgroundColor: '#0D0D0D',
  fontFamily: '"IBM Plex Mono", Monaco, Courier, monospace',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  backgroundColor: '#1A1A1A',
};

const h1 = {
  color: '#FFFFFF',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  lineHeight: '1.3',
};

const h2 = {
  color: '#FFFFFF',
  fontSize: '18px',
  fontWeight: 'bold',
  marginTop: '24px',
  marginBottom: '12px',
};

const text = {
  color: '#E0E0E0',
  fontSize: '14px',
  lineHeight: '1.6',
  marginBottom: '16px',
};

const infoBox = {
  backgroundColor: '#262626',
  padding: '20px',
  borderRadius: '5px',
  marginTop: '20px',
  marginBottom: '20px',
  border: '1px solid #333333',
};

const infoText = {
  color: '#E0E0E0',
  fontSize: '14px',
  margin: '8px 0',
  lineHeight: '1.6',
};

const successBox = {
  backgroundColor: '#0A3D0A',
  border: '1px solid #00B14F',
  padding: '15px',
  borderRadius: '5px',
  marginTop: '20px',
  marginBottom: '20px',
};

const successText = {
  color: '#00FF66',
  fontSize: '14px',
  margin: 0,
  lineHeight: '1.6',
};

const warningBox = {
  backgroundColor: '#3D1A0A',
  border: '1px solid #FF6B1E',
  padding: '15px',
  borderRadius: '5px',
  marginTop: '20px',
  marginBottom: '20px',
};

const warningText = {
  color: '#FF9966',
  fontSize: '13px',
  margin: 0,
  lineHeight: '1.6',
};

const list = {
  color: '#E0E0E0',
  fontSize: '14px',
  lineHeight: '1.6',
  paddingLeft: '20px',
};

const listItem = {
  marginBottom: '8px',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '12px 24px',
  textDecoration: 'none',
  borderRadius: '5px',
  fontWeight: 'bold',
  marginTop: '20px',
  marginBottom: '20px',
};

const legalNotice = {
  color: '#999999',
  fontSize: '12px',
  marginTop: '20px',
  fontStyle: 'italic',
};

const hr = {
  borderColor: '#333333',
  marginTop: '32px',
  marginBottom: '32px',
};

const footer = {
  color: '#808080',
  fontSize: '12px',
  lineHeight: '1.6',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#CCCCCC',
  textDecoration: 'underline',
};
