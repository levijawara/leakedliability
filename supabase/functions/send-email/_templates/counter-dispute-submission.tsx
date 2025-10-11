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

const main = { backgroundColor: '#f6f9fc', fontFamily: 'IBM Plex Mono, monospace' };
const container = { paddingLeft: '12px', paddingRight: '12px', margin: '0 auto', paddingTop: '40px', paddingBottom: '40px' };
const h1 = { color: '#333', fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px', fontFamily: 'IBM Plex Mono, monospace' };
const text = { color: '#333', fontSize: '14px', lineHeight: '24px', fontFamily: 'IBM Plex Mono, monospace' };
const detailsBox = { backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px' };
const detailsText = { color: '#333', fontSize: '14px', lineHeight: '24px', margin: '8px 0', fontFamily: 'IBM Plex Mono, monospace' };
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '30px', fontFamily: 'IBM Plex Mono, monospace' };

export default CounterDisputeSubmission;
