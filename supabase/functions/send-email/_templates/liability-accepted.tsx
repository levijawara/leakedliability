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
  Hr,
  Section,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';
import {
  main,
  container,
  h1,
  text,
  detailsBox,
  detailsText,
  footer,
  link,
  button,
  buttonContainer,
} from './_shared/styles.ts';

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
              <Heading style={h1}>Liability Accepted — Next Steps</Heading>
              <Text style={text}>Hi {acceptorName},</Text>
              <Text style={text}>
                You have accepted full financial responsibility for Report #{reportId}.
              </Text>
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Invoice Date:</strong> {invoiceDate}</Text>
                <Text style={detailsText}><strong>Days Overdue:</strong> {daysOverdue} days</Text>
              </Section>
              <Text style={text}>
                <strong>Payment options:</strong>
              </Text>
              <Text style={text}>
                • Upload proof of direct payment to crew/vendor<br />
                • Pay securely via LL™ Anonymous Escrow
              </Text>
              <Section style={buttonContainer}>
                <Button
                  href="https://leakedliability.com/pay-escrow"
                  style={button}
                >
                  Complete Payment
                </Button>
              </Section>
              <Text style={text}>
                <strong>Legal notice:</strong> This acceptance has been timestamped and logged for legal purposes.
              </Text>
            </>
          )}

          {recipientType === 'chain_member' && (
            <>
              <Heading style={h1}>Liability Resolution — You Are Cleared</Heading>
              <Text style={text}>Hi {recipientName},</Text>
              <Text style={text}>
                <strong>{acceptorName}</strong> has accepted full responsibility for Report #{reportId}.
              </Text>
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Days Overdue:</strong> {daysOverdue} days</Text>
              </Section>
              <Text style={text}>
                <strong>You are no longer considered liable for this debt.</strong>
              </Text>
              <Text style={text}>
                This resolution concludes your involvement in this liability chain.
              </Text>
            </>
          )}

          {recipientType === 'reporter' && (
            <>
              <Heading style={h1}>Liability Accepted — Next Steps</Heading>
              <Text style={text}>Hi {recipientName},</Text>
              <Text style={text}>
                <strong>{acceptorName}</strong> has accepted responsibility for your report #{reportId}.
              </Text>
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Liable Party:</strong> {acceptorName}</Text>
              </Section>
              <Text style={text}>
                <strong>What happens next:</strong>
              </Text>
              <Text style={text}>
                • Payment is expected within 30 days<br />
                • You'll receive confirmation when payment is completed<br />
                • If payment isn't made, the report remains on the leaderboard
              </Text>
              <Section style={buttonContainer}>
                <Button
                  href="https://leakedliability.com/profile"
                  style={button}
                >
                  View Report Status
                </Button>
              </Section>
            </>
          )}

          {recipientType === 'admin' && (
            <>
              <Heading style={h1}>Liability Accepted — Admin Notification</Heading>
              <Text style={text}>Report #{reportId} has reached resolution.</Text>
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Acceptor:</strong> {acceptorName} ({acceptorEmail})</Text>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Amount:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Days Overdue:</strong> {daysOverdue}</Text>
                <Text style={detailsText}><strong>Chain Length:</strong> {chainLength || 1} parties involved</Text>
              </Section>
              <Text style={text}>
                <strong>Action required:</strong> Monitor for payment completion within 30 days.
              </Text>
              <Section style={buttonContainer}>
                <Button
                  href="https://leakedliability.com/admin"
                  style={button}
                >
                  View in Admin Dashboard
                </Button>
              </Section>
            </>
          )}

          <Text style={footer}>
            Best regards,<br />
            The PSCS Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default LiabilityAccepted;
