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

interface WelcomeEmailProps {
  userName: string;
  accountType: string;
}

export const WelcomeEmail = ({
  userName,
  accountType,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Leaked Liability - PSCS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Leaked Liability™</Heading>
        <Text style={text}>Hi {userName},</Text>
        <Text style={text}>
          Thank you for joining PSCS (Producer Safety Credit Score) - filmmaking's financial accountability platform.
          Your account has been created successfully.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Account Type:</strong> {accountType}</Text>
          <Text style={detailsText}><strong>Platform:</strong> Leaked Liability™</Text>
        </Section>
        <Text style={text}>
          <strong>What's next?</strong>
        </Text>
        <Text style={text}>
          • Crew members can submit payment reports about unpaid wages<br />
          • Producers can view their PSCS score and dispute reports<br />
          • Check the leaderboard to see which producers pay on time<br />
          • All crew identities remain anonymous, always
        </Text>
        <Text style={text}>
          If you have any questions or need assistance, don't hesitate to reach out to our support team.
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

export default WelcomeEmail;
