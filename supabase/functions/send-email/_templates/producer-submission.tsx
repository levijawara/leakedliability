import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

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

const main = { backgroundColor: '#f6f9fc', fontFamily: 'IBM Plex Mono, monospace' };
const container = { paddingLeft: '12px', paddingRight: '12px', margin: '0 auto', paddingTop: '40px', paddingBottom: '40px' };
const h1 = { color: '#333', fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px', fontFamily: 'IBM Plex Mono, monospace' };
const text = { color: '#333', fontSize: '14px', lineHeight: '24px', fontFamily: 'IBM Plex Mono, monospace' };
const detailsBox = { backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px' };
const detailsText = { color: '#333', fontSize: '14px', lineHeight: '24px', margin: '8px 0', fontFamily: 'IBM Plex Mono, monospace' };
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '30px', fontFamily: 'IBM Plex Mono, monospace' };

export default ProducerSubmission;
