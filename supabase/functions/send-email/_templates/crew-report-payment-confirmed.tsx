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
        <Heading style={h1}>🎉 Payment Received!</Heading>
        
        <Text style={text}>
          Great news! We've confirmed that payment has been received for your crew member report.
        </Text>
        
        <Section style={codeBox}>
          <Text style={codeTitle}>Report Details:</Text>
          <Text style={codeText}>Report ID: {reportId}</Text>
          <Text style={codeText}>Producer: {producerName}</Text>
          <Text style={codeText}>Amount: ${amount.toFixed(2)}</Text>
          <Text style={codeText}>Payment Date: {paymentDate}</Text>
        </Section>
        
        <Text style={text}>
          The producer's PSCS score has been updated to reflect this payment.
        </Text>
        
        <Text style={text}>
          Thank you for using our platform to track payment issues!
        </Text>
        
        <Text style={footer}>
          <Link href="https://leakedliability.com" style={link}>
            PSCS - Producer/Production Company Credit System
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, sans-serif' };
const container = { margin: '0 auto', padding: '20px 0 48px', maxWidth: '560px' };
const h1 = { color: '#1a1a1a', fontSize: '24px', fontWeight: 'bold', margin: '40px 0', padding: '0' };
const text = { color: '#404040', fontSize: '14px', lineHeight: '24px', margin: '16px 0' };
const codeBox = { background: '#f4f4f4', borderRadius: '4px', padding: '16px 24px', margin: '16px 0' };
const codeTitle = { fontSize: '12px', fontWeight: 'bold', color: '#666', margin: '0 0 8px 0' };
const codeText = { fontSize: '14px', color: '#1a1a1a', margin: '4px 0' };
const footer = { color: '#8898aa', fontSize: '12px', lineHeight: '16px', marginTop: '32px' };
const link = { color: '#5469d4', textDecoration: 'underline' };

export default CrewReportPaymentConfirmed;
