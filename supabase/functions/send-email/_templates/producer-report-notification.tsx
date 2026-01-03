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

interface ProducerReportNotificationProps {
  reportId: string;
  amountOwed: number;
  daysOverdue: number;
  oldestDebtDays: number;
  projectName: string;
  responseUrl: string;
}

export const ProducerReportNotification = ({
  reportId,
  amountOwed,
  daysOverdue,
  oldestDebtDays,
  projectName,
  responseUrl,
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

        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={detailsText}><strong>Project Name:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Amount Claimed:</strong> ${amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={detailsText}><strong>Days Since Invoice:</strong> {daysOverdue} days</Text>
          <Text style={detailsText}><strong>Your Oldest Debt (Leaderboard):</strong> {oldestDebtDays} days</Text>
        </Section>

        <Text style={text}>
          <strong>What's next?</strong>
        </Text>
        <Text style={text}>
          • You can respond to this report by logging into your Leaked Liability™ account<br />
          • Submit payment documentation, acknowledge the debt, or dispute the report<br />
          • All actions are logged and timestamped for transparency
        </Text>

        <Section style={buttonContainer}>
          <Link href={responseUrl} style={button}>
            Respond to Report
          </Link>
        </Section>

        <Text style={text}>
          <strong>Privacy Notice:</strong> Crew member names are kept confidential throughout the process. 
          All reports are reviewed by our verification team before becoming public.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ProducerReportNotification;
