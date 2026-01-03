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

interface LiabilityLoopDetectedProps {
  reportId: string;
  originalName: string;
  amountOwed: number;
  projectName: string;
}

export const LiabilityLoopDetected = ({
  reportId,
  originalName,
  amountOwed,
  projectName,
}: LiabilityLoopDetectedProps) => (
  <Html>
    <Head />
    <Preview>Liability Loop Detected - Report Reverted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Liability Loop Detected</Heading>
        
        <Text style={text}>
          A liability loop has been detected in Report #{reportId}.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
          <Text style={detailsText}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
        </Section>
        
        <Text style={text}>
          <strong>What happened?</strong>
        </Text>
        <Text style={text}>
          The accused parties in this payment report have pointed liability to each other, 
          creating a circular chain. This indicates disputed responsibility for the outstanding payment.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Resolution:</strong></Text>
          <Text style={detailsText}>
            The debt has been <strong>reverted to the original accused party:</strong>
          </Text>
          <Text style={detailsText}>
            <strong>{originalName}</strong>
          </Text>
          <Text style={detailsText}>
            All parties involved have been notified. The report will remain attributed 
            to the original party until payment is made or a formal dispute is resolved.
          </Text>
        </Section>
        
        <Text style={text}>
          If you believe this determination is incorrect, you may file a formal dispute 
          with supporting documentation.
        </Text>
        
        <Section style={buttonContainer}>
          <Button href="https://leakedliability.com/submit" style={button}>
            Contact Support
          </Button>
        </Section>
        
        <Section style={detailsBox}>
          <Text style={detailsText}>
            <strong>Important notice:</strong> All liability redirects are sworn statements with the same legal 
            weight as original reports. Leaked Liability™ maintains a complete audit trail of all 
            liability redirects, including timestamps, affirmations, and IP addresses. Making false 
            claims may expose you to legal action and account suspension.
          </Text>
        </Section>
        
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default LiabilityLoopDetected;
