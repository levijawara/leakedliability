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
  Hr,
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

interface CrewReportRejectedProps {
  reportId: string;
  producerName: string;
  amount: number;
  projectName: string;
  rejectionReason: string;
}

export const CrewReportRejected = ({
  reportId,
  producerName,
  amount,
  projectName,
  rejectionReason,
}: CrewReportRejectedProps) => (
  <Html>
    <Head />
    <Preview>Your payment report needs additional information</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Report Requires More Information</Heading>
        
        <Text style={text}>
          Thank you for submitting your payment report. Unfortunately, we need additional information or clarification before we can verify it.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={detailsText}><strong>Producer/Company:</strong> {producerName}</Text>
          <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
          <Text style={detailsText}><strong>Amount:</strong> ${(typeof amount === 'number' && isFinite(amount) ? amount : 0).toLocaleString()}</Text>
        </Section>

        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Reason for Additional Review:</strong></Text>
          <Text style={detailsText}>{rejectionReason}</Text>
        </Section>

        <Text style={text}>
          Please review the reason above and consider resubmitting your report with the necessary corrections or additional documentation.
        </Text>

        <Text style={text}>
          We appreciate your patience and your commitment to creating a more transparent industry. If you have any questions, please don't hesitate to reach out.
        </Text>

        <Text style={footer}>
          Thank you for helping build a better industry for everyone.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CrewReportRejected;
