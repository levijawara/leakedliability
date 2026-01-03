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

interface AdminCreatedAccountProps {
  name: string;
  email: string;
  tempPassword: string;
  accountType: string;
  reportId: string;
}

export const AdminCreatedAccount = ({
  name,
  email,
  tempPassword,
  accountType,
  reportId
}: AdminCreatedAccountProps) => (
  <Html>
    <Head />
    <Preview>Your Leaked Liability account has been created</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Account Created</Heading>
        <Text style={text}>Hi {name},</Text>
        <Text style={text}>
          An administrator has created a Leaked Liability account for you and submitted a report on your behalf.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailsText}><strong>Email:</strong> {email}</Text>
          <Text style={detailsText}><strong>Temporary Password:</strong> {tempPassword}</Text>
          <Text style={detailsText}><strong>Report ID:</strong> {reportId}</Text>
          <Text style={detailsText}><strong>Account Type:</strong> {accountType === 'crew' ? 'Crew Member' : accountType === 'vendor' ? 'Vendor / Service Provider' : accountType}</Text>
        </Section>
        <Text style={text}>
          <Link href="https://leakedliability.com/auth" style={link}>
            Click here to log in
          </Link> and change your password immediately.
        </Text>
        <Text style={text}>
          If you have any questions, please contact us at{' '}
          <Link href="mailto:leakedliability@gmail.com" style={link}>
            leakedliability@gmail.com
          </Link>
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The PSCS Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default AdminCreatedAccount;
