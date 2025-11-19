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

interface DisputeClosedUnresolvedProps {
  recipientName: string;
  recipientRole: 'reporter' | 'producer' | 'admin';
  reportId: string;
  amountOwed: number;
  projectName: string;
  producerName: string;
  closureDate: string;
  rounds: number;
}

export const DisputeClosedUnresolved = ({
  recipientName,
  recipientRole,
  reportId,
  amountOwed,
  projectName,
  producerName,
  closureDate,
  rounds,
}: DisputeClosedUnresolvedProps) => {
  return (
    <Html>
      <Head />
      <Preview>Dispute closed - Status: Unresolved</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            ⚖️ Dispute Closed — Status: Unresolved
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          {recipientRole === 'reporter' && (
            <>
              <Text style={text}>
                After {rounds} round{rounds > 1 ? 's' : ''} of evidence submission and review, the dispute regarding Report <strong>#{reportId}</strong> has been closed without reaching a mutual resolution or payment confirmation.
              </Text>
              
              <Section style={unresolvedBox}>
                <Text style={unresolvedText}>
                  ⚖️ <strong>Dispute Closed: Unresolved</strong><br />
                  The debt remains unpaid and will continue to appear on the leaderboard.
                </Text>
              </Section>

              <Heading style={h2}>What This Means for You:</Heading>
              <Text style={text}>
                • Your original report remains valid and verified<br />
                • The debt will continue to appear on the producer's leaderboard<br />
                • The producer's PSCS score reflects this unresolved payment<br />
                • You may still receive payment directly from the producer<br />
                • If payment is received, you can confirm it through your dashboard
              </Text>
            </>
          )}

          {recipientRole === 'producer' && (
            <>
              <Text style={text}>
                After {rounds} round{rounds > 1 ? 's' : ''} of evidence submission and review, the dispute regarding Report <strong>#{reportId}</strong> has been closed. The report remains on your record as an unresolved payment dispute.
              </Text>
              
              <Section style={unresolvedBox}>
                <Text style={unresolvedText}>
                  ⚖️ <strong>Dispute Closed: Debt Still Unpaid</strong><br />
                  This report will continue to appear on the leaderboard until payment is confirmed.
                </Text>
              </Section>

              <Heading style={h2}>Impact on Your Record:</Heading>
              <Text style={text}>
                • This unpaid debt remains on the LL™ leaderboard<br />
                • Your PSCS score is negatively affected by this unresolved payment<br />
                • The report continues to age, increasing its score impact<br />
                • You can still resolve this by making payment and providing proof<br />
                • Payment confirmation will immediately update your record
              </Text>

              <Heading style={h2}>How to Resolve:</Heading>
              <Text style={text}>
                1. Make payment directly to the crew/vendor<br />
                2. Upload payment proof through your producer dashboard<br />
                <strong>OR</strong><br />
                3. Pay via LL™ Anonymous Escrow (protects your identity)
              </Text>

              <Link href="https://leakedliability.com/producer-dashboard" style={button}>
                Resolve Payment
              </Link>
            </>
          )}

          {recipientRole === 'admin' && (
            <>
              <Text style={text}>
                Dispute for Report <strong>#{reportId}</strong> has been closed after {rounds} round{rounds > 1 ? 's' : ''} without resolution. Evidence review complete. Report remains as "unresolved dispute" in the system.
              </Text>

              <Section style={adminBox}>
                <Text style={adminText}>
                  <strong>Admin Action Required:</strong> None. System automatically maintains this report on leaderboard with "unresolved dispute" status.
                </Text>
              </Section>
            </>
          )}

          <Section style={infoBox}>
            <Text style={infoLabel}>Dispute Details</Text>
            <Text style={infoText}>
              <strong>Report:</strong> #{reportId}<br />
              <strong>Producer:</strong> {producerName}<br />
              <strong>Project:</strong> {projectName}<br />
              <strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}<br />
              <strong>Rounds Completed:</strong> {rounds}<br />
              <strong>Closure Date:</strong> {closureDate}<br />
              <strong>Final Status:</strong> Unresolved
            </Text>
          </Section>

          {recipientRole !== 'admin' && (
            <Section style={noteBox}>
              <Text style={noteText}>
                ℹ️ <strong>Important:</strong> LL™ does not determine guilt or innocence. We provide a neutral platform for recording payment disputes. The leaderboard is a public registry of unpaid invoices, not a legal judgment.
              </Text>
            </Section>
          )}

          {recipientRole === 'reporter' && (
            <Text style={footer}>
              If you receive payment in the future, please confirm it through your dashboard. This will immediately update the producer's record and may award you Confirmation Cash.
            </Text>
          )}

          <Text style={footer}>
            <Link href="https://leakedliability.com" style={link}>
              Leaked Liability™
            </Link>
            <br />
            Transparency Without Judgment
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeClosedUnresolved;

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

const unresolvedBox = {
  backgroundColor: "#fff3cd",
  border: "2px solid #ffc107",
  borderRadius: "5px",
  padding: "20px",
  margin: "20px 40px",
};

const unresolvedText = {
  color: "#856404",
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

const noteBox = {
  backgroundColor: "#e3f2fd",
  border: "1px solid #90caf9",
  borderRadius: "5px",
  padding: "15px",
  margin: "20px 40px",
};

const noteText = {
  color: "#0d47a1",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

const adminBox = {
  backgroundColor: "#f3e5f5",
  border: "1px solid #ba68c8",
  borderRadius: "5px",
  padding: "15px",
  margin: "20px 40px",
};

const adminText = {
  color: "#4a148c",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "5px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 40px",
  margin: "20px 40px",
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