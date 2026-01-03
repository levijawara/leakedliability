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

interface ProducerSubmissionProps {
  userName: string;
  submissionType: string;
}

export const ProducerSubmission = ({
  userName,
  submissionType,
}: ProducerSubmissionProps) => (
  <Html>
    <Head />
    <Preview>Your submission has been received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Submission Received</Heading>
        <Text style={text}>Hi {userName},</Text>
        <Text style={text}>
          Thank you for your submission:
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Type:</strong> {submissionType}</Text>
        </Section>
        <Text style={text}>
          Your submission is now under review by our team. We'll verify the information provided
          and take appropriate action.
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


export default ProducerSubmission;
