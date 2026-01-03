// @ts-nocheck
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
  hr,
} from './_shared/styles.ts';

interface LiabilityNotificationProps {
  reportId: string;
  amountOwed: number;
  projectName: string;
  invoiceDate: string;
  daysOverdue: number;
  claimUrl: string;
  expirationDate: string;
  accusedName: string;
  paymentUrl?: string;
  paymentCode?: string;
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
  paymentUrl,
  paymentCode,
}: LiabilityNotificationProps) => (
  <Html>
    <Head />
    <Preview>You've Been Named as Responsible Party - Leaked Liability™</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've Been Named as Responsible Party</Heading>
        
        <Text style={text}>
          Dear {accusedName},
        </Text>
        
        <Text style={text}>
          You have been identified as the responsible party for an outstanding payment 
          on the Leaked Liability™ platform.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={detailsText}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Invoice Date:</strong> {invoiceDate}</Text>
          <Text style={detailsText}><strong>Days Overdue:</strong> {daysOverdue} days</Text>
        </Section>
        
        <Hr style={hr} />
        
        <Section style={detailsBox}>
          <Text style={detailsText}>
            <strong>Legal Notice:</strong> This report is now live on the Leaked Liability™ public leaderboard. All actions 
            are logged and timestamped for legal purposes. You can respond at any time to 
            resolve or dispute this claim.
          </Text>
        </Section>
        
        {paymentUrl && paymentCode && (
          <Section style={detailsBox}>
            <Text style={detailsText}><strong>Escrow Code:</strong> {paymentCode}</Text>
            <Text style={detailsText}>
              Pay through our secure escrow to clear your name immediately. Funds are held securely until crew confirms payment.
            </Text>
            <Section style={buttonContainer}>
              <Button href={paymentUrl} style={button}>
                Pay via Leaked Liability Escrow
              </Button>
            </Section>
          </Section>
        )}
        
        <Text style={text}>
          <strong>What's next?</strong>
        </Text>
        <Text style={text}>
          • <strong>Accept Responsibility:</strong> Confirm you will handle this payment and upload proof of payment<br />
          • <strong>Redirect Liability:</strong> If this debt is not your responsibility, you can name the actual responsible party<br />
          • <strong>Dispute the Report:</strong> Submit a formal dispute with supporting evidence
        </Text>
        
        <Section style={buttonContainer}>
          <Button href={claimUrl} style={button}>
            Respond to This Claim
          </Button>
        </Section>
        
        <Text style={text}>
          Don't have an account yet? Register using this email address to manage your producer profile and respond to reports.{' '}
          <Link href="https://leakedliability.com/auth?mode=signup" style={link}>
            Create Account
          </Link> or{' '}
          <Link href="https://leakedliability.com/auth" style={link}>
            Login here
          </Link>
        </Text>
        
        <Text style={text}>
          If you do not respond, this debt will remain attributed to you on the 
          Leaked Liability™ public leaderboard.
        </Text>
        
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default LiabilityNotification;
