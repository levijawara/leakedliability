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

interface VendorReportConfirmationProps {
  vendorCompany: string;
  contactName: string;
  producerName: string;
  amountOwed: number;
  projectName: string;
  invoiceNumber: string;
}

export const VendorReportConfirmation = ({
  vendorCompany,
  contactName,
  producerName,
  amountOwed,
  projectName,
  invoiceNumber,
}: VendorReportConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Your vendor report has been submitted successfully</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Vendor Report Submitted Successfully</Heading>
        <Text style={text}>Hi {contactName},</Text>
        <Text style={text}>
          Thank you for submitting your vendor report on behalf of {vendorCompany}. 
          We've received your complaint about:
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Producer/Company:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Invoice #:</strong> {invoiceNumber}</Text>
          <Text style={detailsText}><strong>Amount Owed:</strong> ${(typeof amountOwed === 'number' && isFinite(amountOwed) ? amountOwed : 0).toLocaleString()}</Text>
        </Section>
        <Text style={text}>
          <strong>What happens next?</strong>
        </Text>
        <Text style={text}>
          • Your report is now under review by our verification team<br />
          • We'll verify the documentation you provided (invoice, PO, contracts, etc.)<br />
          • Review typically takes 2-5 business days<br />
          • You'll receive a notification once the review is complete
        </Text>
        <Text style={text}>
          Once verified, the unpaid invoice will be reflected on the producer's PSCS score 
          on our public leaderboard, helping protect other vendors and crew from payment issues.
        </Text>
        <Text style={text}>
          If you have any questions or need to provide additional documentation, 
          please reply to this email.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The Leaked Liability™ Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VendorReportConfirmation;
