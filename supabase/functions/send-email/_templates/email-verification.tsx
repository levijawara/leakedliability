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
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface EmailVerificationProps {
  userName: string;
  verificationUrl: string;
  verificationCode?: string;
}

export const EmailVerification = ({
  userName,
  verificationUrl,
  verificationCode,
}: EmailVerificationProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address to activate your Leaked Liability™ account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Verify Your Email Address</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          Please verify your email address to complete your Leaked Liability™ account setup. 
          This ensures the security of your account and enables all platform features.
        </Text>

        {verificationCode && (
          <Section style={codeContainer}>
            <Text style={codeLabel}>Verification Code:</Text>
            <Text style={code}>{verificationCode}</Text>
          </Section>
        )}

        <Section style={buttonContainer}>
          <Button href={verificationUrl} style={button}>
            Verify Email Address
          </Button>
        </Section>

        <Text style={disclaimer}>
          If you didn't create this account, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          Best regards,
          <br />
          The PSCS Team
          <br />
          <Link href="https://leakedliability.com" style={link}>
            leakedliability.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailVerification;

const main = {
  backgroundColor: '#f6f6f6',
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const h1 = {
  color: '#000000',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  padding: '0',
};

const text = {
  color: '#333333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const codeContainer = {
  backgroundColor: '#f0f0f0',
  padding: '20px',
  borderRadius: '5px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const codeLabel = {
  color: '#666666',
  fontSize: '12px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const code = {
  color: '#000000',
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  margin: '0',
};

const buttonContainer = {
  margin: '32px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: '5px',
};

const disclaimer = {
  color: '#999999',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '32px 0 16px',
};

const footer = {
  color: '#666666',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '32px 0 0',
};

const link = {
  color: '#000000',
  textDecoration: 'underline',
};
