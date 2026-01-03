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


export default WelcomeEmail;
