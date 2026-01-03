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
  link,
  button,
  buttonContainer,
} from './_shared/styles.ts';

interface PasswordResetProps {
  userName?: string;
  resetUrl: string;
  expiresIn?: string;
  email?: string;
}

export const PasswordReset = ({
  userName,
  resetUrl,
  expiresIn = '60 minutes',
  email,
}: PasswordResetProps) => (
  <Html>
    <Head />
    <Preview>Reset your password for your Leaked Liability™ account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password</Heading>
        
        <Text style={text}>Hi {userName || email || 'there'},</Text>
        
        <Text style={text}>
          We received a request to reset your password for your Leaked Liability™ account. 
          Click the button below to create a new password.
        </Text>

        <Section style={buttonContainer}>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Section>

        <Section style={detailsBox}>
          <Text style={detailsText}>
            <strong>Security Notice:</strong> This link expires in {expiresIn}. 
            If you didn't request this reset, your account may be compromised. Contact support immediately at{' '}
            <Link href="mailto:leakedliability@gmail.com" style={link}>
              leakedliability@gmail.com
            </Link>
          </Text>
        </Section>

        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PasswordReset;
