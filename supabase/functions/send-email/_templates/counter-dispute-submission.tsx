// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
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

interface CounterDisputeSubmissionProps {
  userName: string;
  originalReportRef: string;
}

export const CounterDisputeSubmission = ({
  userName,
  originalReportRef,
}: CounterDisputeSubmissionProps) => (
  <Html>
    <Head />
    <Preview>Your counter-dispute has been submitted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Counter-Dispute Submitted</Heading>
        <Text style={text}>Hi {userName},</Text>
        <Text style={text}>
          We've received your counter-dispute submission:
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Original Report Reference:</strong> {originalReportRef}</Text>
        </Section>
        <Text style={text}>
          Your counter-dispute is now under review. We'll examine all evidence from both parties
          and make a fair determination.
        </Text>
        <Text style={text}>
          You'll receive a notification once the review is complete.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);


export default CounterDisputeSubmission;
