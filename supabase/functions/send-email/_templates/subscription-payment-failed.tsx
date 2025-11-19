import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
  Section,
} from "https://esm.sh/@react-email/components@0.0.22";
import * as React from "https://esm.sh/react@18.3.1";

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
        <Heading style={h1}>⚠️ Payment Failed</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          We attempted to process your Leaked Liability™ Leaderboard subscription payment, but it failed.
        </Text>

        <Section style={alertBox}>
          <Text style={alertText}>
            <strong>Failed Attempts: {failedAttempts}/3</strong>
          </Text>
          <Text style={alertText}>
            Your access remains active until: <strong>{new Date(gracePeriodEnd).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}</strong>
          </Text>
        </Section>
        
        <Text style={text}>
          You're currently in a <strong>5-business-day grace period</strong>. Your leaderboard access will remain active during this time, but we need you to update your payment method to avoid interruption.
        </Text>

        <Section style={buttonContainer}>
          <Link href={billingPortalUrl} style={button}>
            Update Payment Method
          </Link>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          <strong>What happens next?</strong>
        </Text>
        <Text style={footer}>
          • If you update your payment method, your subscription will continue without interruption<br />
          • If the grace period expires without payment, your access will be suspended<br />
          • You can resubscribe at any time to restore access
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Questions? Reply to this email or visit{" "}
          <Link href="https://leakedliability.com/faq" style={link}>
            our FAQ
          </Link>
          .
        </Text>

        <Text style={footer}>
          <strong>Leaked Liability™</strong><br />
          Transparency in Film Production Payments
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionPaymentFailed;

const main = {
  backgroundColor: "#0D0D0D",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
  backgroundColor: "#1A1A1A",
  borderRadius: "8px",
};

const h1 = {
  color: "#FFFFFF",
  fontSize: "28px",
  fontWeight: "bold",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const text = {
  color: "#E5E5E5",
  fontSize: "16px",
  lineHeight: "24px",
  marginBottom: "16px",
};

const alertBox = {
  backgroundColor: "#2D1B1B",
  border: "2px solid #FF1E1E",
  borderRadius: "6px",
  padding: "20px",
  marginBottom: "24px",
  marginTop: "24px",
};

const alertText = {
  color: "#FFFFFF",
  fontSize: "16px",
  lineHeight: "24px",
  marginBottom: "8px",
  textAlign: "center" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
  marginBottom: "32px",
};

const button = {
  backgroundColor: "#FF1E1E",
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  padding: "14px 32px",
  borderRadius: "6px",
  display: "inline-block",
};

const hr = {
  borderColor: "#333333",
  marginTop: "24px",
  marginBottom: "24px",
};

const footer = {
  color: "#999999",
  fontSize: "14px",
  lineHeight: "20px",
  marginBottom: "12px",
};

const link = {
  color: "#00B14F",
  textDecoration: "underline",
};
