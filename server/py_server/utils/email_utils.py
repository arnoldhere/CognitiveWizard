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


def send_subscription_expiry_email(email: str, full_name: str, plan: str, days_left: int, expires_at: str):
    """
    Send a styled subscription expiry reminder email.

    Called when a user's subscription has fewer than 5 days remaining.
    The expires_at string should be an ISO-format datetime.
    """

    if not settings.SMTP_HOST or not settings.SMTP_PORT or not settings.SMTP_FROM_EMAIL:
        raise RuntimeError("SMTP settings are not configured")

    subject = f"CognitiveWizard \u2022 Your {plan.capitalize()} Plan Expires in {days_left} Day{'s' if days_left != 1 else ''}"

    # Urgency colour: red <=1 day, orange 2-3 days, yellow 4-5 days
    if days_left <= 1:
        urgency_color = "#ef4444"
        urgency_label = "Urgent"
    elif days_left <= 3:
        urgency_color = "#f97316"
        urgency_label = "Action Required"
    else:
        urgency_color = "#eab308"
        urgency_label = "Reminder"

    text_content = (
        f"Hello {full_name},\n\n"
        f"Your CognitiveWizard {plan.capitalize()} subscription expires in "
        f"{days_left} day{'s' if days_left != 1 else ''} (on {expires_at}).\n\n"
        "To continue enjoying enhanced daily chat limits, please renew your subscription "
        "from your Profile page.\n\n"
        "Visit: https://cognitivewizard.ai/profile\n\n"
        "Regards,\nCognitiveWizard Team"
    )

    html_content = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Subscription Expiry Reminder</title></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fb;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0"
           style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.08);">
      <tr><td align="center"
              style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:35px 20px;color:#fff;">
        <h1 style="margin:0;font-size:28px;font-weight:bold;">CognitiveWizard</h1>
        <p style="margin-top:10px;font-size:15px;opacity:.9;">Subscription Expiry Reminder</p>
      </td></tr>
      <tr><td align="center"
              style="background:{urgency_color};padding:12px 20px;color:#fff;font-size:14px;font-weight:bold;letter-spacing:1px;">
        \u26a0 {urgency_label} \u2014 {days_left} Day{'s' if days_left != 1 else ''} Remaining
      </td></tr>
      <tr><td style="padding:40px 35px;color:#333;">
        <h2 style="margin-top:0;font-size:22px;color:#1e293b;">Hello, {full_name}!</h2>
        <p style="font-size:16px;line-height:1.7;color:#475569;">
          Your <strong>{plan.capitalize()} Plan</strong> subscription is expiring soon.
        </p>
        <div style="background:#fef3c7;border-left:4px solid {urgency_color};padding:16px 20px;border-radius:8px;margin:24px 0;">
          <p style="margin:0;font-size:15px;color:#92400e;">
            <strong>Plan:</strong> {plan.capitalize()}<br>
            <strong>Days Left:</strong> {days_left} day{'s' if days_left != 1 else ''}<br>
            <strong>Expires On:</strong> {expires_at}
          </p>
        </div>
        <p style="font-size:15px;line-height:1.7;color:#475569;">
          Renew before it expires to keep your premium daily chat limits.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://cognitivewizard.ai/profile"
             style="background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;
                    padding:14px 32px;border-radius:8px;text-decoration:none;
                    font-size:16px;font-weight:bold;display:inline-block;">
            Renew Subscription
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
        <p style="font-size:13px;color:#94a3b8;">
          If you have already renewed or cancelled, please disregard this message.
        </p>
      </td></tr>
      <tr><td align="center" style="background:#f9fafb;padding:20px;font-size:13px;color:#9ca3af;">
        \u00a9 2026 CognitiveWizard. All rights reserved.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = email
    message.set_content(text_content)
    message.add_alternative(html_content, subtype="html")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)
