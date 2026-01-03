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

              <Section style={detailsBox}>
                <Text style={detailsText}>
                  <strong>Status:</strong> Your leaderboard access has been suspended
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

              <Section style={detailsBox}>
                <Text style={detailsText}>
                  <strong>Status:</strong> Your leaderboard access has ended
                </Text>
              </Section>

              <Text style={text}>
                Thank you for being a subscriber. We hope you found value in Leaked Liability™'s transparency platform.
              </Text>
            </>
          )}

          <Text style={text}>
            <strong>Want to restore access?</strong>
          </Text>
          
          <Text style={text}>
            You can resubscribe at any time to regain full access to the leaderboard, producer profiles, PSCS scores, and payment histories.
          </Text>

          <Section style={buttonContainer}>
            <Button href={resubscribeUrl} style={button}>
              Resubscribe Now
            </Button>
          </Section>

          <Text style={text}>
            <strong>What you'll regain with a subscription:</strong>
          </Text>
          <Text style={text}>
            • Full leaderboard access<br />
            • Producing Social Credit Scores (PSCS)<br />
            • Detailed payment histories<br />
            • Producer profiles and analytics<br />
            {subscriptionTier === 'producer_t2' && '• Instant PSCS updates (Tier 2 only)'}
          </Text>

          <Text style={text}>
            <strong>No hard feelings.</strong> We don't believe in long-term contracts or hidden fees. If you ever want to come back, we'll be here.
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
};

export default SubscriptionCanceled;
