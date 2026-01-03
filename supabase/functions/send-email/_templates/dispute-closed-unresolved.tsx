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
  button,
  buttonContainer,
} from './_shared/styles.ts';

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
            Dispute Closed — Status: Unresolved
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          {recipientRole === 'reporter' && (
            <>
              <Text style={text}>
                After {rounds} round{rounds > 1 ? 's' : ''} of evidence submission and review, the dispute regarding Report <strong>#{reportId}</strong> has been closed without reaching a mutual resolution or payment confirmation.
              </Text>
              
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Rounds Completed:</strong> {rounds}</Text>
                <Text style={detailsText}><strong>Closure Date:</strong> {closureDate}</Text>
                <Text style={detailsText}><strong>Final Status:</strong> Unresolved</Text>
              </Section>

              <Text style={text}>
                <strong>What this means for you:</strong>
              </Text>
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
              
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Rounds Completed:</strong> {rounds}</Text>
                <Text style={detailsText}><strong>Closure Date:</strong> {closureDate}</Text>
                <Text style={detailsText}><strong>Final Status:</strong> Unresolved</Text>
              </Section>

              <Text style={text}>
                <strong>Impact on your record:</strong>
              </Text>
              <Text style={text}>
                • This unpaid debt remains on the LL™ leaderboard<br />
                • Your PSCS score is negatively affected by this unresolved payment<br />
                • The report continues to age, increasing its score impact<br />
                • You can still resolve this by making payment and providing proof<br />
                • Payment confirmation will immediately update your record
              </Text>

              <Text style={text}>
                <strong>How to resolve:</strong>
              </Text>
              <Text style={text}>
                1. Make payment directly to the crew/vendor<br />
                2. Upload payment proof through your producer dashboard<br />
                <strong>OR</strong><br />
                3. Pay via LL™ Anonymous Escrow (protects your identity)
              </Text>

              <Section style={buttonContainer}>
                <Button href="https://leakedliability.com/producer-dashboard" style={button}>
                  Resolve Payment
                </Button>
              </Section>
            </>
          )}

          {recipientRole === 'admin' && (
            <>
              <Text style={text}>
                Dispute for Report <strong>#{reportId}</strong> has been closed after {rounds} round{rounds > 1 ? 's' : ''} without resolution. Evidence review complete. Report remains as "unresolved dispute" in the system.
              </Text>
              <Section style={detailsBox}>
                <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
                <Text style={detailsText}><strong>Producer:</strong> {producerName}</Text>
                <Text style={detailsText}><strong>Project:</strong> {projectName}</Text>
                <Text style={detailsText}><strong>Amount Owed:</strong> ${amountOwed.toLocaleString()}</Text>
                <Text style={detailsText}><strong>Rounds Completed:</strong> {rounds}</Text>
                <Text style={detailsText}><strong>Closure Date:</strong> {closureDate}</Text>
                <Text style={detailsText}><strong>Final Status:</strong> Unresolved</Text>
                <Text style={detailsText}>
                  <strong>Admin Action Required:</strong> None. System automatically maintains this report on leaderboard with "unresolved dispute" status.
                </Text>
              </Section>
            </>
          )}

          {recipientRole !== 'admin' && (
            <Text style={text}>
              <strong>Important:</strong> LL™ does not determine guilt or innocence. We provide a neutral platform for recording payment disputes. The leaderboard is a public registry of unpaid invoices, not a legal judgment.
            </Text>
          )}

          {recipientRole === 'reporter' && (
            <Text style={text}>
              If you receive payment in the future, please confirm it through your dashboard. This will immediately update the producer's record and may award you Confirmation Cash.
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

export default DisputeClosedUnresolved;
