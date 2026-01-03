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
} from './_shared/styles.ts';

interface DisputeResolvedPaidProps {
  recipientName: string;
  recipientRole: 'reporter' | 'producer' | 'admin';
  reportId: string;
  amountPaid: number;
  projectName: string;
  producerName: string;
  paymentDate: string;
}

export const DisputeResolvedPaid = ({
  recipientName,
  recipientRole,
  reportId,
  amountPaid,
  projectName,
  producerName,
  paymentDate,
}: DisputeResolvedPaidProps) => {
  return (
    <Html>
      <Head />
      <Preview>Dispute resolved - Payment completed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            Dispute Resolved — Payment Completed
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          {recipientRole === 'reporter' && (
            <>
              <Text style={text}>
                Great news! The dispute regarding Report <strong>#{reportId}</strong> has been resolved. Payment has been confirmed and your report has been marked as <strong>PAID</strong>.
              </Text>
              
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Amount Paid:</strong> ${amountPaid.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Payment Date:</strong> {paymentDate}</Text>
              </Section>

              <Text style={text}>
                <strong>What's next?</strong>
              </Text>
              <Text style={text}>
                • The report status has been updated to "PAID"<br />
                • The producer's leaderboard record reflects this payment<br />
                • Your Confirmation Cash reward (if applicable) has been credited<br />
                • This case is now closed
              </Text>
            </>
          )}

          {recipientRole === 'producer' && (
            <>
              <Text style={text}>
                The dispute regarding Report <strong>#{reportId}</strong> has been resolved following payment confirmation. Your record has been updated to reflect this payment.
              </Text>
              
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Amount Paid:</strong> ${amountPaid.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Payment Date:</strong> {paymentDate}</Text>
              </Section>

              <Text style={text}>
                <strong>Impact on your record:</strong>
              </Text>
              <Text style={text}>
                • This payment improves your PSCS score<br />
                • Your leaderboard standing has been updated<br />
                • Paid reports demonstrate your payment reliability<br />
                • This dispute is now permanently closed
              </Text>
            </>
          )}

          {recipientRole === 'admin' && (
            <>
              <Text style={text}>
                Dispute for Report <strong>#{reportId}</strong> has been resolved via payment confirmation.
              </Text>
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Amount Paid:</strong> ${amountPaid.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Payment Date:</strong> {paymentDate}</Text>
              </Section>
            </>
          )}

          {recipientRole !== 'admin' && (
            <Text style={text}>
              Thank you for resolving this matter through the LL™ dispute system. Fair and transparent resolution benefits the entire production community.
            </Text>
          )}

          <Text style={footer}>
            Best regards,<br />
            The PSCS Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeResolvedPaid;
