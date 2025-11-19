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
            ✅ Dispute Resolved — Payment Completed
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          {recipientRole === 'reporter' && (
            <>
              <Text style={text}>
                Great news! The dispute regarding Report <strong>#{reportId}</strong> has been resolved. Payment has been confirmed and your report has been marked as <strong>PAID</strong>.
              </Text>
              
              <Section style={successBox}>
                <Text style={successText}>
                  ✅ <strong>Payment Confirmed</strong><br />
                  Your invoice has been paid in full.
                </Text>
              </Section>
            </>
          )}

          {recipientRole === 'producer' && (
            <>
              <Text style={text}>
                The dispute regarding Report <strong>#{reportId}</strong> has been resolved following payment confirmation. Your record has been updated to reflect this payment.
              </Text>
              
              <Section style={successBox}>
                <Text style={successText}>
                  ✅ <strong>Dispute Closed</strong><br />
                  This report is now marked as PAID and will no longer affect your PSCS score negatively.
                </Text>
              </Section>
            </>
          )}

          {recipientRole === 'admin' && (
            <>
              <Text style={text}>
                Dispute for Report <strong>#{reportId}</strong> has been resolved via payment confirmation.
              </Text>
            </>
          )}

          <Section style={infoBox}>
            <Text style={infoLabel}>Resolution Details</Text>
            <Text style={infoText}>
              <strong>Report:</strong> #{reportId}<br />
              <strong>Producer:</strong> {producerName}<br />
              <strong>Project:</strong> {projectName}<br />
              <strong>Amount Paid:</strong> ${amountPaid.toLocaleString()}<br />
              <strong>Payment Date:</strong> {paymentDate}
            </Text>
          </Section>

          {recipientRole === 'reporter' && (
            <>
              <Heading style={h2}>What Happens Next:</Heading>
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
              <Heading style={h2}>Impact on Your Record:</Heading>
              <Text style={text}>
                • This payment improves your PSCS score<br />
                • Your leaderboard standing has been updated<br />
                • Paid reports demonstrate your payment reliability<br />
                • This dispute is now permanently closed
              </Text>
            </>
          )}

          {recipientRole !== 'admin' && (
            <Text style={footer}>
              Thank you for resolving this matter through the LL™ dispute system. Fair and transparent resolution benefits the entire production community.
            </Text>
          )}

          <Text style={footer}>
            <Link href="https://leakedliability.com" style={link}>
              Leaked Liability™
            </Link>
            <br />
            Building Trust Through Transparency
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeResolvedPaid;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0 20px",
  padding: "0 40px",
};

const h2 = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "30px 40px 10px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 40px",
};

const successBox = {
  backgroundColor: "#d4edda",
  border: "2px solid #28a745",
  borderRadius: "5px",
  padding: "20px",
  margin: "20px 40px",
};

const successText = {
  color: "#155724",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
};

const infoBox = {
  backgroundColor: "#f0f0f0",
  borderRadius: "5px",
  padding: "20px",
  margin: "20px 40px",
};

const infoLabel = {
  color: "#666",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  margin: "0 0 10px 0",
};

const infoText = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const link = {
  color: "#000000",
  textDecoration: "underline",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "20px 40px",
};