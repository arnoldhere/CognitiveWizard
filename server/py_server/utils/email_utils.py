import smtplib
from email.message import EmailMessage
from config.settings import settings


def send_password_reset_email(email: str, otp: str):
    """Send a styled password reset OTP email."""

    if not settings.SMTP_HOST or not settings.SMTP_PORT or not settings.SMTP_FROM_EMAIL:
        raise RuntimeError("SMTP settings are not configured")

    subject = "CognitiveWizard • Password Reset Verification Code"

    # ===== Plain-text fallback
    text_content = f"""
Hello,

We received a request to reset your CognitiveWizard account password.

Your verification code is:

{otp}

This OTP will expire shortly for security reasons.

If you did not request this password reset, please ignore this email.

Regards,
CognitiveWizard Team
"""

    # ===== HTML Email Template
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset OTP</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7fb; font-family:Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fb; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center"
                style="background:linear-gradient(135deg, #4f46e5, #7c3aed); padding:35px 20px; color:#ffffff;">
              <h1 style="margin:0; font-size:28px; font-weight:bold;">
                CognitiveWizard
              </h1>
              <p style="margin-top:10px; font-size:15px; opacity:0.9;">
                Secure Password Reset Verification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 35px; color:#333333;">

              <h2 style="margin-top:0; font-size:24px;">
                Password Reset Request
              </h2>

              <p style="font-size:16px; line-height:1.7;">
                We received a request to reset the password for your
                <strong>CognitiveWizard</strong> account.
              </p>

              <p style="font-size:16px; line-height:1.7;">
                Please use the following verification code:
              </p>

              <!-- OTP Box -->
              <div style="text-align:center; margin:35px 0;">
                <div style="
                    display:inline-block;
                    background:#eef2ff;
                    color:#4338ca;
                    padding:18px 36px;
                    font-size:34px;
                    font-weight:bold;
                    letter-spacing:10px;
                    border-radius:10px;
                    border:2px dashed #6366f1;
                ">
                  {otp}
                </div>
              </div>

              <p style="font-size:15px; line-height:1.7; color:#555;">
                This code will expire shortly for security reasons.
              </p>

              <p style="font-size:15px; line-height:1.7; color:#555;">
                If you did not request a password reset, you can safely ignore this email.
              </p>

              <!-- Divider -->
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:30px 0;">

              <p style="font-size:14px; color:#888888;">
                Need help? Contact the CognitiveWizard support team.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                style="background:#f9fafb; padding:20px; font-size:13px; color:#9ca3af;">
              © 2026 CognitiveWizard. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
"""

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = email

    # Plain text fallback
    message.set_content(text_content)

    # HTML version
    message.add_alternative(html_content, subtype="html")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        smtp.send_message(message)
