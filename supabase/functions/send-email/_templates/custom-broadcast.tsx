// @ts-nocheck
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Link,
  Preview,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1,react-dom@18.3.1';
import * as React from 'https://esm.sh/react@18.3.1';
import {
  main,
  container,
  h1,
  text,
  footer,
  hr,
} from './_shared/styles.ts';

interface CustomBroadcastProps {
  subject: string;
  bodyText: string;
  senderName?: string;
  footerText?: string;
  footerContactText?: string;
}

export const CustomBroadcastEmail = ({
  subject,
  bodyText,
  senderName = 'The Leaked Liability Team',
  footerText = "You're receiving this email because you have an account on Leaked Liability.",
  footerContactText = 'Questions? Visit leakedliability.com/faq or reply to this email.',
}: CustomBroadcastProps) => {
  // Convert newlines to <br /> tags for proper rendering
  const formattedBody = bodyText.split('\n').map((line, index, array) => (
    <React.Fragment key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{subject}</Heading>
          <Text style={text}>{formattedBody}</Text>
          <Text style={text}>
            Best regards,
            <br />
            {senderName}
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            {footerText}
            <br />
            {footerContactText}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default CustomBroadcastEmail;
