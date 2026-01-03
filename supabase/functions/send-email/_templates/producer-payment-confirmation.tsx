// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
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

interface ProducerPaymentConfirmationProps {
  userName: string;
  producerName: string;
  amountPaid: number;
}

export const ProducerPaymentConfirmation = ({
  userName,
  producerName,
  amountPaid,
}: ProducerPaymentConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Your payment confirmation has been submitted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Confirmation Received</Heading>
        <Text style={text}>Hi {userName},</Text>
        <Text style={text}>
          We've received your payment confirmation submission:
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Amount Paid:</strong> ${(typeof amountPaid === 'number' && isFinite(amountPaid) ? amountPaid : 0).toLocaleString()}</Text>
        </Section>
        <Text style={text}>
          Your payment confirmation is now under review. Once verified, it will be reflected in the PSCS score.
        </Text>
        <Text style={text}>
          You'll receive a notification once the review is complete.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);


export default ProducerPaymentConfirmation;
