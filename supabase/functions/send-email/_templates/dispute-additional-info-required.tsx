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

interface DisputeAdditionalInfoRequiredProps {
  recipientName: string;
  reportId: string;
  round: number;
  adminRequest: string;
  deadline: string;
  disputeId: string;
}

export const DisputeAdditionalInfoRequired = ({
  recipientName,
  reportId,
  round,
  adminRequest,
  deadline,
  disputeId,
}: DisputeAdditionalInfoRequiredProps) => {
  return (
    <Html>
      <Head />
      <Preview>Additional information required for your dispute</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            Additional Information Required
          </Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          <Text style={text}>
            The LL™ admin team has reviewed your evidence for Report <strong>#{reportId}</strong> and requires additional information to proceed.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsText}><strong>Admin Request:</strong></Text>
            <Text style={detailsText}>{adminRequest}</Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailsText}><strong>Report ID:</strong> #{reportId}</Text>
            <Text style={detailsText}><strong>Current Round:</strong> {round}</Text>
            <Text style={detailsText}><strong>Deadline:</strong> {deadline}</Text>
          </Section>

          <Text style={text}>
            <strong>How to respond:</strong>
          </Text>
          <Text style={text}>
            • Review the admin's request carefully<br />
            • Gather the requested documentation or information<br />
            • Submit your response through the dispute portal<br />
            • Ensure all files are clear and legible
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsText}>
              <strong>Response Deadline:</strong> {deadline}<br />
              Failure to respond may result in your case being weakened or closed.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button href={`https://leakedliability.com/dispute/${disputeId}`} style={button}>
              Submit Additional Information
            </Button>
          </Section>

          <Text style={text}>
            All submissions are timestamped and immutable. This protects both parties and ensures a fair process.
          </Text>

          <Text style={footer}>
            Best regards,<br />
            The PSCS Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DisputeAdditionalInfoRequired;
