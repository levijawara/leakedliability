// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
} from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1";
import * as React from "https://esm.sh/react@18.3.1";
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

interface SubscriptionPaymentFailedProps {
  userName: string;
  gracePeriodEnd: string;
  billingPortalUrl: string;
  failedAttempts: number;
}

export const SubscriptionPaymentFailed = ({
  userName,
  gracePeriodEnd,
  billingPortalUrl,
  failedAttempts,
}: SubscriptionPaymentFailedProps) => (
  <Html>
    <Head />
    <Preview>Payment Failed - Action Required</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Failed</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          We attempted to process your Leaked Liability™ Leaderboard subscription payment, but it failed.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Failed Attempts:</strong> {failedAttempts}/3</Text>
          <Text style={detailsText}>
            <strong>Your access remains active until:</strong> {new Date(gracePeriodEnd).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Text>
        </Section>
        
        <Text style={text}>
          You're currently in a <strong>5-business-day grace period</strong>. Your leaderboard access will remain active during this time, but we need you to update your payment method to avoid interruption.
        </Text>

        <Section style={buttonContainer}>
          <Button href={billingPortalUrl} style={button}>
            Update Payment Method
          </Button>
        </Section>

        <Text style={text}>
          <strong>What's next?</strong>
        </Text>
        <Text style={text}>
          • If you update your payment method, your subscription will continue without interruption<br />
          • If the grace period expires without payment, your access will be suspended<br />
          • You can resubscribe at any time to restore access
        </Text>

        <Text style={text}>
          Questions? Reply to this email or visit{' '}
          <Link href="https://leakedliability.com/faq" style={link}>
            our FAQ
          </Link>
          .
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionPaymentFailed;
