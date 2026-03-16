const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure Graph API credentials not configured");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const token = await getAccessToken();
  const senderEmail = process.env.AZURE_SENDER_EMAIL;

  if (!senderEmail) {
    throw new Error("AZURE_SENDER_EMAIL not configured");
  }

  const response = await fetch(
    `${GRAPH_API_URL}/users/${senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: htmlBody },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: false,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail(
    email,
    "Verify your email - Enterprise",
    `<h2>Verify your email</h2>
    <p>Click the link below to verify your email address:</p>
    <p><a href="${verifyUrl}">Verify Email</a></p>
    <p>This link expires in 24 hours.</p>`
  );
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendEmail(
    email,
    "Reset your password - Enterprise",
    `<h2>Reset your password</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link expires in 1 hour.</p>`
  );
}

export async function sendInvitationEmail(
  email: string,
  orgName: string,
  inviterName: string,
  inviteToken: string
): Promise<void> {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?invitation=${inviteToken}`;
  await sendEmail(
    email,
    `You've been invited to ${orgName} - Enterprise`,
    `<h2>You've been invited</h2>
    <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Enterprise.</p>
    <p><a href="${acceptUrl}">Accept Invitation</a></p>
    <p>This invitation expires in 7 days.</p>`
  );
}
