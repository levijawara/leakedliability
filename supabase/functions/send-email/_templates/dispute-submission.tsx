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

const main = { backgroundColor: '#f6f9fc', fontFamily: 'IBM Plex Mono, monospace' };
const container = { paddingLeft: '12px', paddingRight: '12px', margin: '0 auto', paddingTop: '40px', paddingBottom: '40px' };
const h1 = { color: '#333', fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px', fontFamily: 'IBM Plex Mono, monospace' };
const text = { color: '#333', fontSize: '14px', lineHeight: '24px', fontFamily: 'IBM Plex Mono, monospace' };
const detailsBox = { backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px' };
const detailsText = { color: '#333', fontSize: '14px', lineHeight: '24px', margin: '8px 0', fontFamily: 'IBM Plex Mono, monospace' };
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '30px', fontFamily: 'IBM Plex Mono, monospace' };

export default DisputeSubmission;
