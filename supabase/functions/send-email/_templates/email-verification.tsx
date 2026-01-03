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
          <Section style={detailsBox}>
            <Text style={detailsText}><strong>Verification Code:</strong> {verificationCode}</Text>
          </Section>
        )}

        <Section style={buttonContainer}>
          <Button href={verificationUrl} style={button}>
            Verify Email Address
          </Button>
        </Section>

        <Text style={text}>
          If you didn't create this account, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailVerification;
