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

interface DisputeSubmissionProps {
  userName: string;
  disputeType: string;
}

export const DisputeSubmission = ({
  userName,
  disputeType,
}: DisputeSubmissionProps) => (
  <Html>
    <Head />
    <Preview>Your dispute has been submitted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Dispute Submitted</Heading>
        <Text style={text}>Hi {userName},</Text>
        <Text style={text}>
          We've received your dispute submission:
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Type:</strong> {disputeType}</Text>
        </Section>
        <Text style={text}>
          Your dispute is now under review by our team. We take all disputes seriously and will
          investigate thoroughly.
        </Text>
        <Text style={text}>
          You'll receive updates as the dispute is processed. Thank you for your patience.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);


export default DisputeSubmission;
