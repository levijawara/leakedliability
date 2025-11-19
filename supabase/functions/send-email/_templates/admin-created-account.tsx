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
        <Section style={codeBox}>
          <Text style={label}>Email:</Text>
          <Text style={value}>{email}</Text>
          <Text style={label}>Temporary Password:</Text>
          <Text style={value}>{tempPassword}</Text>
          <Text style={label}>Report ID:</Text>
          <Text style={value}>{reportId}</Text>
        </Section>
        <Text style={text}>
          <Link href="https://leakedliability.com/auth" style={link}>
            Click here to log in
          </Link> and change your password immediately.
        </Text>
        <Text style={text}>
          Your account type: <strong>{accountType === 'crew' ? 'Crew Member' : 'Vendor'}</strong>
        </Text>
        <Text style={footer}>
          If you have any questions, please contact us at{' '}
          <Link href="mailto:leakedliability@gmail.com" style={link}>
            leakedliability@gmail.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '10px',
};

const codeBox = {
  background: '#f4f4f4',
  borderRadius: '4px',
  padding: '24px',
  marginBottom: '24px',
  marginTop: '24px',
};

const label = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#666',
  marginBottom: '4px',
  marginTop: '0',
};

const value = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#000',
  marginBottom: '16px',
  marginTop: '4px',
};

const link = {
  color: '#2754C5',
  textDecoration: 'underline',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
};

export default AdminCreatedAccount;
