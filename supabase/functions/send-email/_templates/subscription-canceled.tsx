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

interface SubscriptionCanceledProps {
  userName: string;
  subscriptionTier: string;
  resubscribeUrl: string;
  reason: 'grace_period_expired' | 'manual_cancellation';
}

export const SubscriptionCanceled = ({
  userName,
  subscriptionTier,
  resubscribeUrl,
  reason,
}: SubscriptionCanceledProps) => {
  const tierDisplay = subscriptionTier === 'crew_t1' ? 'Crew/Vendor Tier 1' 
    : subscriptionTier === 'producer_t1' ? 'Producer Tier 1'
    : subscriptionTier === 'producer_t2' ? 'Producer Tier 2'
    : 'Leaderboard Access';

  return (
    <Html>
      <Head />
      <Preview>Subscription Canceled - Resubscribe Anytime</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Subscription Canceled</Heading>
          
          <Text style={text}>Hi {userName},</Text>
          
          {reason === 'grace_period_expired' ? (
            <>
              <Text style={text}>
                Your <strong>{tierDisplay}</strong> subscription has been canceled because the grace period expired without successful payment.
              </Text>

              <Section style={alertBox}>
                <Text style={alertText}>
                  ⛔ Your leaderboard access has been suspended
                </Text>
              </Section>

              <Text style={text}>
                We attempted to process your payment multiple times and provided a 5-business-day grace period, but we were unable to complete the transaction.
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Your <strong>{tierDisplay}</strong> subscription has been successfully canceled as requested.
              </Text>

              <Section style={alertBox}>
                <Text style={alertText}>
                  Your leaderboard access has ended
                </Text>
              </Section>

              <Text style={text}>
                Thank you for being a subscriber. We hope you found value in Leaked Liability™'s transparency platform.
              </Text>
            </>
          )}

          <Hr style={hr} />

          <Text style={text}>
            <strong>Want to restore access?</strong>
          </Text>
          
          <Text style={text}>
            You can resubscribe at any time to regain full access to the leaderboard, producer profiles, PSCS scores, and payment histories.
          </Text>

          <Section style={buttonContainer}>
            <Link href={resubscribeUrl} style={button}>
              Resubscribe Now
            </Link>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>What you'll regain with a subscription:</strong>
          </Text>
          <Text style={footer}>
            ✓ Full leaderboard access<br />
            ✓ Producer Social Credit Scores (PSCS)<br />
            ✓ Detailed payment histories<br />
            ✓ Producer profiles and analytics<br />
            {subscriptionTier === 'producer_t2' && '✓ Instant PSCS updates (Tier 2 only)'}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>No hard feelings.</strong> We don't believe in long-term contracts or hidden fees. If you ever want to come back, we'll be here.
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
};

export default SubscriptionCanceled;

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
  border: "2px solid #999999",
  borderRadius: "6px",
  padding: "20px",
  marginBottom: "24px",
  marginTop: "24px",
};

const alertText = {
  color: "#FFFFFF",
  fontSize: "18px",
  fontWeight: "bold",
  lineHeight: "24px",
  textAlign: "center" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
  marginBottom: "32px",
};

const button = {
  backgroundColor: "#00B14F",
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
