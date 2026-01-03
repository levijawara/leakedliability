// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
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
} from './_shared/styles.ts';

interface CrewReportConfirmationProps {
  userName: string;
  producerName: string;
  amountOwed: number;
  projectName: string;
}

export const CrewReportConfirmation = ({
  userName,
  producerName,
  amountOwed,
  projectName,
}: CrewReportConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Your payment report has been submitted successfully</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Report Submitted Successfully</Heading>
        <Text style={text}>Hi {userName},</Text>
        <Text style={text}>
          Thank you for submitting your payment report. We've received your complaint about:
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Amount Owed:</strong> ${(typeof amountOwed === 'number' && isFinite(amountOwed) ? amountOwed : 0).toLocaleString()}</Text>
        </Section>
        <Text style={text}>
          Your report is now under review. We'll verify the information and update the leaderboard accordingly.
          You'll receive a notification once the review is complete.
        </Text>
        <Text style={text}>
          If you have any questions, please don't hesitate to contact our support team.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

import {
  main,
  container,
  h1,
  text,
  detailsBox,
  detailsText,
  footer,
} from './_shared/styles.ts';

export default CrewReportConfirmation;
