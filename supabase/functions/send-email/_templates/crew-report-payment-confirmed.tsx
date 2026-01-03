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
} from './_shared/styles.ts';

interface CrewReportPaymentConfirmedProps {
  reportId: string;
  producerName: string;
  amount: number;
  paymentDate: string;
}

export const CrewReportPaymentConfirmed = ({
  reportId,
  producerName,
  amount,
  paymentDate,
}: CrewReportPaymentConfirmedProps) => (
  <Html>
    <Head />
    <Preview>Payment Received - Your report has been updated</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Received!</Heading>
        
        <Text style={text}>
          Great news! We've confirmed that payment has been received for your crew member report.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Amount:</strong> ${amount.toFixed(2)}</Text>
          <Text style={detailsText}><strong>Payment Date:</strong> {paymentDate}</Text>
        </Section>
        
        <Text style={text}>
          The producer's PSCS score has been updated to reflect this payment.
        </Text>
        
        <Text style={text}>
          Thank you for using our platform to track payment issues!
        </Text>
        
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CrewReportPaymentConfirmed;
