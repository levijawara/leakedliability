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
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface PasswordResetProps {
  userName: string;
  resetUrl: string;
  expiresIn?: string;
}

export const PasswordReset = ({
  userName,
  resetUrl,
  expiresIn = '60 minutes',
}: PasswordResetProps) => (
  <Html>
    <Head />
    <Preview>Reset your password for your Leaked Liability™ account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          We received a request to reset your password for your Leaked Liability™ account. 
          Click the button below to create a new password.
        </Text>

        <Section style={buttonContainer}>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Section>

        <Section style={warningBox}>
          <Text style={warningText}>
            <strong>⚠️ Security Notice:</strong> This link expires in {expiresIn}. 
            If you didn't request this reset, your account may be compromised. Contact support immediately.
          </Text>
        </Section>

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

export default PasswordReset;

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

const warningBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ff6b6b',
  padding: '15px',
  borderRadius: '5px',
  margin: '20px 0',
};

const warningText = {
  color: '#721c24',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
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
