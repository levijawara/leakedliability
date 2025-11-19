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
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';

interface VendorReportVerifiedProps {
  vendorCompany: string;
  contactName: string;
  producerName: string;
  amountOwed: number;
  projectName: string;
  invoiceNumber: string;
  verificationNotes?: string;
}

export const VendorReportVerified = ({
  vendorCompany,
  contactName,
  producerName,
  amountOwed,
  projectName,
  invoiceNumber,
  verificationNotes,
}: VendorReportVerifiedProps) => (
  <Html>
    <Head />
    <Preview>Your vendor report has been verified and is now live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✓ Vendor Report Verified</Heading>
        <Text style={text}>Hi {contactName},</Text>
        <Text style={text}>
          Great news! Your vendor report for {vendorCompany} has been verified 
          and is now live on our public leaderboard.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Producer/Company:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Invoice #:</strong> {invoiceNumber}</Text>
          <Text style={detailsText}><strong>Amount Owed:</strong> ${(typeof amountOwed === 'number' && isFinite(amountOwed) ? amountOwed : 0).toLocaleString()}</Text>
        </Section>
        {verificationNotes && (
          <Section style={notesBox}>
            <Text style={notesTitle}><strong>Verification Notes:</strong></Text>
            <Text style={text}>{verificationNotes}</Text>
          </Section>
        )}
        <Text style={text}>
          <strong>What this means:</strong>
        </Text>
        <Text style={text}>
          • The unpaid invoice is now reflected in {producerName}'s PSCS score<br />
          • Other vendors and crew members can see this payment issue on the public leaderboard<br />
          • The producer has been notified about the verified report<br />
          • If the producer pays you, please submit payment confirmation so we can update their score
        </Text>
        <Text style={text}>
          <Link href="https://leakedliability.com/leaderboard" style={link}>
            View the Leaderboard →
          </Link>
        </Text>
        <Text style={text}>
          Thank you for helping create transparency in the production industry. 
          Your report helps protect other vendors and crew members from payment issues.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The Leaked Liability™ Team
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: '#f6f9fc', fontFamily: 'IBM Plex Mono, monospace' };
const container = { paddingLeft: '12px', paddingRight: '12px', margin: '0 auto', paddingTop: '40px', paddingBottom: '40px' };
const h1 = { color: '#16a34a', fontSize: '24px', fontWeight: 'bold', margin: '40px 0 20px', fontFamily: 'IBM Plex Mono, monospace' };
const text = { color: '#333', fontSize: '14px', lineHeight: '24px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '12px' };
const detailsBox = { backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px', border: '2px solid #16a34a' };
const detailsText = { color: '#333', fontSize: '14px', lineHeight: '24px', margin: '8px 0', fontFamily: 'IBM Plex Mono, monospace' };
const notesBox = { backgroundColor: '#fef3c7', padding: '15px', borderRadius: '5px', marginTop: '15px', marginBottom: '15px' };
const notesTitle = { color: '#92400e', fontSize: '14px', marginBottom: '8px', fontFamily: 'IBM Plex Mono, monospace' };
const link = { color: '#2563eb', textDecoration: 'underline', fontFamily: 'IBM Plex Mono, monospace' };
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '30px', fontFamily: 'IBM Plex Mono, monospace' };

export default VendorReportVerified;
