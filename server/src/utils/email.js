import { Resend } from 'resend';
import { query } from '../db/connection.js';

// Lazy init — Resend SDK throws if constructed without an API key,
// so we only create the instance when actually sending an email.
let _resend = null;
function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// ─── Helper: check user notification preference ────────
export async function shouldSendEmail(userId, category) {
  try {
    const result = await query(
      `SELECT ${category} FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return true; // default = send
    return result.rows[0][category] !== false;
  } catch {
    return true; // on error, default to sending
  }
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'LeadFlow AI <noreply@leadflow.dev>';
const APP_URL = process.env.APP_URL || 'https://leadflow-ai-production-11f3.up.railway.app';
const APP_NAME = 'LeadFlow AI';

// ─── Helper: log email to DB ────────────────────────────
async function logEmail(toEmail, template, subject, resendId, status = 'sent', error = null) {
  try {
    await query(
      `INSERT INTO email_logs (to_email, template, subject, resend_id, status, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [toEmail, template, subject, resendId || null, status, error]
    );
  } catch (err) {
    console.error('Email log failed:', err.message);
  }
}

// ─── Core send function ─────────────────────────────────
async function sendEmail(to, subject, html, template) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[Email] Skipping "${template}" to ${to} — RESEND_API_KEY not configured`);
    return { skipped: true };
  }

  try {
    const client = getResend();
    if (!client) {
      console.warn(`[Email] Skipping "${template}" — Resend client not available`);
      return { skipped: true };
    }
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    await logEmail(to, template, subject, result.data?.id, 'sent');
    console.log(`[Email] Sent "${template}" to ${to} (${result.data?.id})`);
    return result;
  } catch (err) {
    console.error(`[Email] Failed "${template}" to ${to}:`, err.message);
    await logEmail(to, template, subject, null, 'failed', err.message);
    throw err;
  }
}

// ─── Shared email wrapper/layout ────────────────────────
function emailLayout(title, bodyContent) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a365d,#2c5282); padding:24px 32px; border-radius:12px 12px 0 0; text-align:center;">
      <h1 style="margin:0; color:#fff; font-size:24px; font-weight:700;">${APP_NAME}</h1>
      <p style="margin:4px 0 0; color:#93c5fd; font-size:13px;">Lead Abatement Report Automation</p>
    </div>

    <!-- Body -->
    <div style="background:#fff; padding:32px; border-radius:0 0 12px 12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      ${bodyContent}
    </div>

    <!-- Footer -->
    <div style="text-align:center; padding:20px 0; color:#94a3b8; font-size:12px;">
      <p style="margin:0;">&copy; ${new Date().getFullYear()} ${APP_NAME} by Nexdyne. All rights reserved.</p>
      <p style="margin:4px 0 0;">This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;
}

function buttonHtml(text, url, color = '#2563eb') {
  return `<div style="text-align:center; margin:24px 0;">
    <a href="${url}" style="display:inline-block; padding:14px 32px; background:${color}; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px;">${text}</a>
  </div>`;
}


// ═══════════════════════════════════════════════════════════
//  1. EMAIL VERIFICATION
// ═══════════════════════════════════════════════════════════

export async function sendVerificationEmail(to, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  const subject = 'Verify your email address';
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Welcome to ${APP_NAME}!</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 8px;">
      Thanks for creating your account. Please verify your email address to get full access to all features.
    </p>
    ${buttonHtml('Verify Email Address', url)}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
  `);

  return sendEmail(to, subject, html, 'email_verification');
}


// ═══════════════════════════════════════════════════════════
//  2. PASSWORD RESET
// ═══════════════════════════════════════════════════════════

export async function sendPasswordResetEmail(to, token) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  const subject = 'Reset your password';
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Password Reset Request</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 8px;">
      We received a request to reset the password for your ${APP_NAME} account. Click the button below to set a new password.
    </p>
    ${buttonHtml('Reset Password', url, '#dc2626')}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
    </p>
  `);

  return sendEmail(to, subject, html, 'password_reset');
}


// ═══════════════════════════════════════════════════════════
//  3. TEAM INVITE
// ═══════════════════════════════════════════════════════════

export async function sendTeamInviteEmail(to, inviterName, teamName, inviteToken, role) {
  const url = `${APP_URL}/invite/${inviteToken}`;
  const subject = `You're invited to join ${teamName} on ${APP_NAME}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Team Invitation</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 8px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${role}</strong> on ${APP_NAME}.
    </p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#64748b; font-size:13px;">Team</div>
      <div style="color:#1e293b; font-size:16px; font-weight:600;">${teamName}</div>
      <div style="color:#64748b; font-size:13px; margin-top:8px;">Your Role</div>
      <div style="color:#1e293b; font-size:16px; font-weight:600; text-transform:capitalize;">${role}</div>
    </div>
    ${buttonHtml('Accept Invitation', url, '#059669')}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      This invitation expires in 7 days. If you don't have an account yet, you'll be able to create one when you accept.
    </p>
  `);

  return sendEmail(to, subject, html, 'team_invite');
}


// ═══════════════════════════════════════════════════════════
//  4. INSPECTION COMPLETION ALERT (to client)
// ═══════════════════════════════════════════════════════════

export async function sendInspectionCompleteEmail(to, clientName, projectName, inspectorName, inspectorCompany) {
  const url = `${APP_URL}/portal`;
  const subject = `Inspection Complete: ${projectName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Inspection Complete</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 8px;">
      Hi ${clientName || 'there'}, your inspection has been completed and the results are ready for review.
    </p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#166534; font-size:14px; font-weight:600; margin-bottom:8px;">Project Details</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Project:</strong> ${projectName}<br>
        <strong>Inspector:</strong> ${inspectorName}<br>
        <strong>Company:</strong> ${inspectorCompany || 'N/A'}
      </div>
    </div>
    ${buttonHtml('View Results in Client Portal', url)}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      Log into your Client Portal to view the full inspection details, reports, and any follow-up actions.
    </p>
  `);

  return sendEmail(to, subject, html, 'inspection_complete');
}


// ═══════════════════════════════════════════════════════════
//  5. REPORT DELIVERY (to client)
// ═══════════════════════════════════════════════════════════

export async function sendReportDeliveryEmail(to, clientName, projectName, reportType) {
  const url = `${APP_URL}/portal`;
  const subject = `Report Ready: ${projectName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Your Report is Ready</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 8px;">
      Hi ${clientName || 'there'}, a new report has been shared with you.
    </p>
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e40af; font-size:14px; font-weight:600; margin-bottom:4px;">${reportType || 'Inspection Report'}</div>
      <div style="color:#475569; font-size:13px;">${projectName}</div>
    </div>
    ${buttonHtml('View & Download Report', url)}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      You can view and download the report from your Client Portal at any time.
    </p>
  `);

  return sendEmail(to, subject, html, 'report_delivery');
}


// ═══════════════════════════════════════════════════════════
//  6. PLATFORM ADMIN ANNOUNCEMENT BROADCAST
// ═══════════════════════════════════════════════════════════

export async function sendAnnouncementEmail(to, title, body, type) {
  const typeColors = {
    info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'Info' },
    feature: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: 'New Feature' },
    warning: { bg: '#fefce8', border: '#fef08a', color: '#854d0e', icon: 'Warning' },
    critical: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: 'Critical' },
    maintenance: { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8', icon: 'Maintenance' },
  };
  const style = typeColors[type] || typeColors.info;

  const subject = `[${APP_NAME}] ${title}`;
  const html = emailLayout(subject, `
    <div style="background:${style.bg}; border:1px solid ${style.border}; border-radius:8px; padding:4px 12px; display:inline-block; margin-bottom:12px;">
      <span style="color:${style.color}; font-size:12px; font-weight:600; text-transform:uppercase;">${style.icon}</span>
    </div>
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">${title}</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px; white-space:pre-line;">${body}</p>
    ${buttonHtml('Open LeadFlow AI', APP_URL)}
  `);

  return sendEmail(to, subject, html, 'announcement');
}


// ═══════════════════════════════════════════════════════════
//  7. WELCOME EMAIL (after registration)
// ═══════════════════════════════════════════════════════════

export async function sendWelcomeEmail(to, fullName, role) {
  const portalUrl = role === 'client' ? `${APP_URL}/portal` : APP_URL;
  const subject = `Welcome to ${APP_NAME}!`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Welcome aboard, ${fullName || 'there'}!</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 8px;">
      Your ${APP_NAME} account has been created successfully. You're all set to ${role === 'client' ? 'track your inspection projects' : 'start managing your lead inspections'}.
    </p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e293b; font-size:14px; font-weight:600; margin-bottom:8px;">Quick Start</div>
      <ul style="color:#475569; font-size:13px; line-height:2; margin:0; padding-left:20px;">
        ${role === 'client' ? `
          <li>View shared inspection projects</li>
          <li>Download reports and documentation</li>
          <li>Message your inspector directly</li>
        ` : `
          <li>Create your first inspection project</li>
          <li>Set up your team and invite members</li>
          <li>Share reports with clients via the Client Portal</li>
        `}
      </ul>
    </div>
    ${buttonHtml('Get Started', portalUrl)}
  `);

  return sendEmail(to, subject, html, 'welcome');
}


// ═══════════════════════════════════════════════════════════
//  8. PASSWORD RESET CONFIRMATION
// ═══════════════════════════════════════════════════════════

export async function sendPasswordResetConfirmEmail(to, fullName) {
  const subject = 'Your password has been reset';
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Password Reset Confirmed</h2>
    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #dc2626;">
      <div style="color:#991b1b; font-size:14px; font-weight:600; margin-bottom:8px;">Security Alert</div>
      <p style="color:#7f1d1d; font-size:13px; line-height:1.6; margin:0;">
        Your password was successfully changed. If you didn't make this change, please contact support immediately to secure your account.
      </p>
    </div>
    ${buttonHtml("I Didn't Do This", `${APP_URL}/forgot-password`, '#dc2626')}
    <p style="color:#16a34a; font-size:13px; margin:16px 0 0; font-weight:600;">
      If this was you, no further action is needed. Your account is secure.
    </p>
  `);

  return sendEmail(to, subject, html, 'password_reset_confirm');
}


// ═══════════════════════════════════════════════════════════
//  9. PASSWORD CHANGED
// ═══════════════════════════════════════════════════════════

export async function sendPasswordChangedEmail(to, fullName) {
  const subject = 'Your password was updated';
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Password Updated</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Your ${APP_NAME} password was changed from your account settings. If this was you, no action is needed.
    </p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #16a34a;">
      <p style="color:#166534; font-size:13px; line-height:1.6; margin:0;">
        Your account is secure. If you didn't make this change, please reset your password immediately.
      </p>
    </div>
    ${buttonHtml("I Didn't Do This", `${APP_URL}/forgot-password`, '#dc2626')}
  `);

  return sendEmail(to, subject, html, 'password_changed');
}


// ═══════════════════════════════════════════════════════════
//  10. EMAIL VERIFIED CONFIRMATION
// ═══════════════════════════════════════════════════════════

export async function sendEmailVerifiedConfirmEmail(to, fullName) {
  const subject = "Email verified — you're all set!";
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Email Verified!</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 8px;">
      Your email has been verified. You now have full access to ${APP_NAME}.
    </p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#166534; font-size:14px; font-weight:600; margin-bottom:8px;">Here's what to do next:</div>
      <ul style="color:#475569; font-size:13px; line-height:2; margin:0; padding-left:20px;">
        <li>Create your team</li>
        <li>Add your first project</li>
        <li>Invite team members</li>
      </ul>
    </div>
    ${buttonHtml('Go to Dashboard', APP_URL, '#059669')}
  `);

  return sendEmail(to, subject, html, 'email_verified_confirm');
}


// ═══════════════════════════════════════════════════════════
//  11. INVITE ACCEPTED
// ═══════════════════════════════════════════════════════════

export async function sendInviteAcceptedEmail(to, inviterName, newMemberName, newMemberEmail, teamName, role) {
  const subject = `${newMemberName} joined ${teamName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Invitation Accepted!</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      <strong>${newMemberName}</strong> has accepted your invitation to join <strong>${teamName}</strong>.
    </p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#64748b; font-size:13px;">Member Name</div>
      <div style="color:#1e293b; font-size:16px; font-weight:600;">${newMemberName}</div>
      <div style="color:#64748b; font-size:13px; margin-top:12px;">Email</div>
      <div style="color:#1e293b; font-size:14px;">${newMemberEmail}</div>
      <div style="color:#64748b; font-size:13px; margin-top:12px;">Role</div>
      <div style="color:#1e293b; font-size:16px; font-weight:600; text-transform:capitalize;">${role}</div>
    </div>
    ${buttonHtml('Manage Team', `${APP_URL}/teams`, '#2563eb')}
  `);

  return sendEmail(to, subject, html, 'invite_accepted');
}


// ═══════════════════════════════════════════════════════════
//  12. MEMBER REMOVED
// ═══════════════════════════════════════════════════════════

export async function sendMemberRemovedEmail(to, memberName, teamName, removedBy) {
  const subject = `You've been removed from ${teamName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Team Access Revoked</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      You are no longer a member of <strong>${teamName}</strong>. Your access to this team has been revoked.
    </p>
    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#7f1d1d; font-size:13px; line-height:1.6; margin:0;">
        <strong>Removed by:</strong> ${removedBy}<br>
        <strong>Team:</strong> ${teamName}
      </div>
    </div>
    <p style="color:#475569; font-size:13px; line-height:1.6; margin:16px 0 0;">
      If you believe this was a mistake or have questions, please contact the team administrator.
    </p>
  `);

  return sendEmail(to, subject, html, 'member_removed');
}


// ═══════════════════════════════════════════════════════════
//  13. ACCOUNT SUSPENDED
// ═══════════════════════════════════════════════════════════

export async function sendAccountSuspendedEmail(to, fullName, reason) {
  const subject = 'Your LeadFlow AI account has been suspended';
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#dc2626; font-size:20px;">Account Suspended</h2>
    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #dc2626;">
      <div style="color:#991b1b; font-size:14px; font-weight:600; margin-bottom:8px;">What This Means</div>
      <ul style="color:#7f1d1d; font-size:13px; line-height:1.8; margin:0; padding-left:20px;">
        <li>You cannot log in to your account</li>
        <li>Your data is preserved and secure</li>
        <li>You can regain access by contacting support</li>
      </ul>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#64748b; font-size:13px; margin-bottom:8px;">Reason:</div>
      <div style="color:#1e293b; font-size:14px; line-height:1.6;">${reason}</div>
    </div>
    ${buttonHtml('Contact Support', 'mailto:admin@nexdynegroup.com', '#dc2626')}
  `);

  return sendEmail(to, subject, html, 'account_suspended');
}


// ═══════════════════════════════════════════════════════════
//  14. ACCOUNT REACTIVATED
// ═══════════════════════════════════════════════════════════

export async function sendAccountReactivatedEmail(to, fullName) {
  const subject = 'Your LeadFlow AI account has been reactivated';
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#059669; font-size:20px;">Welcome Back!</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Your ${APP_NAME} account has been reactivated and is ready to use. You can now log in and access all your projects and data.
    </p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #16a34a;">
      <div style="color:#166534; font-size:13px; line-height:1.6; margin:0;">
        Your account is fully restored with all your previous data intact.
      </div>
    </div>
    ${buttonHtml('Sign In', `${APP_URL}/login`, '#059669')}
  `);

  return sendEmail(to, subject, html, 'account_reactivated');
}


// ═══════════════════════════════════════════════════════════
//  15. ADMIN NEW USER ALERT
// ═══════════════════════════════════════════════════════════

export async function sendAdminNewUserAlert(to, newUserEmail, newUserName, newUserRole) {
  const subject = `New user registered: ${newUserEmail}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">New User Registration</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      A new user has registered on ${APP_NAME}. Review their details below.
    </p>
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e40af; font-size:14px; font-weight:600; margin-bottom:8px;">User Details</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Name:</strong> ${newUserName}<br>
        <strong>Email:</strong> ${newUserEmail}<br>
        <strong>Role:</strong> ${newUserRole}<br>
        <strong>Registered:</strong> ${new Date().toLocaleString()}
      </div>
    </div>
    ${buttonHtml('View in Admin Dashboard', `${APP_URL}/admin`, '#2563eb')}
  `);

  return sendEmail(to, subject, html, 'admin_new_user_alert');
}


// ═══════════════════════════════════════════════════════════
//  16. ROLE CHANGED
// ═══════════════════════════════════════════════════════════

export async function sendRoleChangedEmail(to, memberName, teamName, oldRole, newRole, changedBy) {
  const subject = `Your role in ${teamName} has been updated`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Role Updated</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Your role in <strong>${teamName}</strong> has been updated by <strong>${changedBy}</strong>.
    </p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#64748b; font-size:13px; margin-bottom:8px;">Previous Role</div>
      <div style="color:#1e293b; font-size:16px; font-weight:600; text-transform:capitalize; margin-bottom:12px;">${oldRole}</div>
      <div style="color:#64748b; font-size:13px; margin-bottom:8px;">New Role</div>
      <div style="color:#059669; font-size:16px; font-weight:600; text-transform:capitalize;">${newRole}</div>
    </div>
    <p style="color:#475569; font-size:13px; line-height:1.6; margin:16px 0 0;">
      Your access and permissions have been updated to reflect your new role. If you have questions about your permissions, please contact the team admin.
    </p>
    ${buttonHtml('View Team', `${APP_URL}/teams`, '#2563eb')}
  `);

  return sendEmail(to, subject, html, 'role_changed');
}


// ═══════════════════════════════════════════════════════════
//  17. TEAM CREATED
// ═══════════════════════════════════════════════════════════

export async function sendTeamCreatedEmail(to, fullName, teamName) {
  const subject = `Your team ${teamName} is ready!`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#059669; font-size:20px;">Congratulations!</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Your team <strong>${teamName}</strong> has been created successfully. You're ready to start collaborating.
    </p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#166534; font-size:14px; font-weight:600; margin-bottom:8px;">Next Steps</div>
      <ul style="color:#166534; font-size:13px; line-height:2; margin:0; padding-left:20px;">
        <li>Invite team members to collaborate</li>
        <li>Create your first project</li>
        <li>Set up client access</li>
      </ul>
    </div>
    ${buttonHtml('Set Up Your Team', `${APP_URL}/teams`, '#059669')}
  `);

  return sendEmail(to, subject, html, 'team_created');
}


// ═══════════════════════════════════════════════════════════
//  18. TIER CHANGED
// ═══════════════════════════════════════════════════════════

export async function sendTierChangedEmail(to, memberName, teamName, oldTier, newTier, newLimits) {
  const subject = `${teamName} plan updated to ${newTier}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Plan Updated</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      The ${APP_NAME} plan for <strong>${teamName}</strong> has been upgraded to <strong>${newTier}</strong>.
    </p>
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e40af; font-size:14px; font-weight:600; margin-bottom:8px;">Plan Details</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Previous Plan:</strong> ${oldTier}<br>
        <strong>New Plan:</strong> <span style="color:#059669; font-weight:600;">${newTier}</span>
      </div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e293b; font-size:14px; font-weight:600; margin-bottom:8px;">New Limits</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Max Members:</strong> ${newLimits?.max_members || 'Unlimited'}<br>
        <strong>Max Projects:</strong> ${newLimits?.max_projects || 'Unlimited'}
      </div>
    </div>
    ${buttonHtml('View Plan Details', `${APP_URL}/teams`, '#2563eb')}
  `);

  return sendEmail(to, subject, html, 'tier_changed');
}


// ═══════════════════════════════════════════════════════════
//  19. PROJECT ASSIGNED
// ═══════════════════════════════════════════════════════════

export async function sendProjectAssignedEmail(to, inspectorName, projectName, projectAddress, assignedBy) {
  const url = `${APP_URL}/projects`;
  const subject = `New assignment: ${projectName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Project Assignment</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      You've been assigned to a new inspection project by <strong>${assignedBy || 'your administrator'}</strong>.
    </p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #2563eb;">
      <div style="color:#64748b; font-size:13px; margin-bottom:8px;">Project Name</div>
      <div style="color:#1e293b; font-size:16px; font-weight:600; margin-bottom:12px;">${projectName}</div>
      <div style="color:#64748b; font-size:13px; margin-bottom:8px;">Address</div>
      <div style="color:#1e293b; font-size:14px; margin-bottom:12px;">${projectAddress}</div>
      <div style="color:#64748b; font-size:13px; margin-bottom:8px;">Assigned By</div>
      <div style="color:#1e293b; font-size:14px;">${assignedBy || 'N/A'}</div>
    </div>
    ${buttonHtml('View Project', url)}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      Log in to LeadFlow AI to view full project details, schedule inspections, and upload reports.
    </p>
  `);

  return sendEmail(to, subject, html, 'project_assigned');
}


// ═══════════════════════════════════════════════════════════
//  20. INSPECTION SCHEDULED
// ═══════════════════════════════════════════════════════════

export async function sendInspectionScheduledEmail(to, clientName, projectName, projectAddress, inspectorName, scheduledDate) {
  const url = `${APP_URL}/portal`;
  const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const subject = `Inspection scheduled: ${projectAddress}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Inspection Scheduled</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${clientName || 'there'}, your inspection has been scheduled. Below are the details.
    </p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #16a34a;">
      <div style="color:#166534; font-size:14px; font-weight:600; margin-bottom:12px;">Inspection Details</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Date:</strong> ${formattedDate}<br>
        <strong>Project:</strong> ${projectName}<br>
        <strong>Address:</strong> ${projectAddress}<br>
        <strong>Inspector:</strong> ${inspectorName}
      </div>
    </div>
    ${buttonHtml('View in Client Portal', url)}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      You can view more details and reschedule if needed through your Client Portal.
    </p>
  `);

  return sendEmail(to, subject, html, 'inspection_scheduled');
}


// ═══════════════════════════════════════════════════════════
//  21. CLIENT PORTAL ACCESS
// ═══════════════════════════════════════════════════════════

export async function sendClientPortalAccessEmail(to, clientName, projectName, accessUrl) {
  const portalUrl = accessUrl || `${APP_URL}/portal`;
  const subject = `Access your project: ${projectName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Project Portal Access</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${clientName || 'there'}, you've been given access to view your inspection project in our secure Client Portal.
    </p>
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #2563eb;">
      <div style="color:#1e40af; font-size:14px; font-weight:600; margin-bottom:12px;">What You Can Access</div>
      <ul style="color:#1e40af; font-size:13px; line-height:2; margin:0; padding-left:20px;">
        <li>Inspection reports and findings</li>
        <li>Project photos and documentation</li>
        <li>Real-time status updates</li>
        <li>Secure messaging with your inspector</li>
      </ul>
    </div>
    ${buttonHtml('Open Client Portal', portalUrl)}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      Your login credentials have been securely set up. Log in now to view your project details.
    </p>
  `);

  return sendEmail(to, subject, html, 'client_portal_access');
}


// ═══════════════════════════════════════════════════════════
//  22. LEAD DETECTED ALERT
// ═══════════════════════════════════════════════════════════

export async function sendLeadDetectedEmail(to, clientName, projectAddress, inspectorName, inspectorPhone, detectionDetails) {
  const url = `${APP_URL}/portal`;
  const subject = `URGENT: Lead-based paint detected at ${projectAddress}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#dc2626; font-size:20px;">URGENT: Lead-Based Paint Detected</h2>
    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #dc2626;">
      <div style="color:#991b1b; font-size:14px; font-weight:600; margin-bottom:12px;">Federal Notification Requirement</div>
      <p style="color:#7f1d1d; font-size:13px; line-height:1.6; margin:0;">
        <strong>Lead-based paint has been detected at your property.</strong> Under EPA 40 CFR Part 745, you are being notified immediately of this finding.
      </p>
    </div>
    <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#854d0e; font-size:14px; font-weight:600; margin-bottom:12px;">Detection Details</div>
      <div style="color:#78350f; font-size:13px; line-height:1.8;">
        <strong>Address:</strong> ${projectAddress}<br>
        <strong>Detection Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
        <strong>Details:</strong> ${detectionDetails || 'See full report for details'}
      </div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e293b; font-size:14px; font-weight:600; margin-bottom:12px;">Inspector Contact Information</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Inspector:</strong> ${inspectorName}<br>
        <strong>Phone:</strong> <a href="tel:${inspectorPhone}" style="color:#2563eb; text-decoration:none;">${inspectorPhone}</a>
      </div>
    </div>
    <p style="color:#7f1d1d; font-size:13px; line-height:1.6; margin:16px 0; font-weight:600;">
      Please contact your inspector immediately to discuss next steps and remediation options.
    </p>
    ${buttonHtml('View Full Report', url, '#dc2626')}
    <div style="background:#fef2f2; border-top:2px solid #fecaca; padding-top:16px; margin-top:16px; color:#7f1d1d; font-size:12px; line-height:1.6;">
      <p style="margin:0; font-weight:600;">Footer Notice:</p>
      <p style="margin:4px 0 0;">This notification is required under federal regulations (EPA 40 CFR Part 745). Please contact your inspector for next steps and to discuss remediation options for your property.
    </div>
  `);

  return sendEmail(to, subject, html, 'lead_detected_alert');
}


// ═══════════════════════════════════════════════════════════
//  23. INSPECTION REQUEST CONFIRMATION (to client)
// ═══════════════════════════════════════════════════════════

export async function sendInspectionRequestConfirmEmail(to, clientName, propertyAddress, inspectionType, preferredDate) {
  const formattedDate = preferredDate
    ? new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'To be scheduled';
  const subject = `Request received: ${propertyAddress}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Request Submitted</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${clientName || 'there'}, your inspection request has been received and is being reviewed by our team.
    </p>
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #2563eb;">
      <div style="color:#1e40af; font-size:14px; font-weight:600; margin-bottom:12px;">Request Details</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Address:</strong> ${propertyAddress}<br>
        <strong>Type:</strong> ${inspectionType || 'General Inspection'}<br>
        <strong>Preferred Date:</strong> ${formattedDate}
      </div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e293b; font-size:14px; font-weight:600; margin-bottom:8px;">What Happens Next?</div>
      <ul style="color:#475569; font-size:13px; line-height:2; margin:0; padding-left:20px;">
        <li>Our team will review your request within 1 business day</li>
        <li>You'll receive a notification once scheduled</li>
        <li>You can track status anytime in your Client Portal</li>
      </ul>
    </div>
    ${buttonHtml('Track Your Request', `${APP_URL}/portal`)}
  `);

  return sendEmail(to, subject, html, 'inspection_request_confirm');
}


// ═══════════════════════════════════════════════════════════
//  24. NEW INSPECTION REQUEST ALERT (to inspector/team)
// ═══════════════════════════════════════════════════════════

export async function sendNewInspectionRequestAlertEmail(to, inspectorName, clientName, clientEmail, propertyAddress, inspectionType, preferredDate) {
  const formattedDate = preferredDate
    ? new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Flexible';
  const subject = `New inspection request: ${propertyAddress}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">New Inspection Request</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      A client has submitted a new inspection request that needs your attention.
    </p>
    <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #eab308;">
      <div style="color:#854d0e; font-size:14px; font-weight:600; margin-bottom:12px;">Request Details</div>
      <div style="color:#78350f; font-size:13px; line-height:1.8;">
        <strong>Client:</strong> ${clientName} (${clientEmail})<br>
        <strong>Address:</strong> ${propertyAddress}<br>
        <strong>Type:</strong> ${inspectionType || 'General Inspection'}<br>
        <strong>Preferred Date:</strong> ${formattedDate}
      </div>
    </div>
    ${buttonHtml('Review Request', `${APP_URL}/requests`, '#eab308')}
    <p style="color:#94a3b8; font-size:13px; margin:16px 0 0;">
      Please review and respond to this request within 1 business day.
    </p>
  `);

  return sendEmail(to, subject, html, 'new_inspection_request_alert');
}


// ═══════════════════════════════════════════════════════════
//  25. NEW MESSAGE NOTIFICATION
// ═══════════════════════════════════════════════════════════

export async function sendNewMessageEmail(to, recipientName, senderName, senderRole, projectName, messagePreview) {
  const url = senderRole === 'client' ? `${APP_URL}/projects` : `${APP_URL}/portal`;
  const subject = `New message from ${senderName} on ${projectName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">New Message</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      You have a new message from <strong>${senderName}</strong> on the project <strong>${projectName}</strong>.
    </p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #6366f1;">
      <div style="color:#64748b; font-size:12px; margin-bottom:4px;">${senderName} · ${senderRole}</div>
      <div style="color:#1e293b; font-size:14px; line-height:1.6; font-style:italic;">"${messagePreview}..."</div>
    </div>
    ${buttonHtml('View & Reply', url, '#6366f1')}
  `);

  return sendEmail(to, subject, html, 'new_message');
}


// ═══════════════════════════════════════════════════════════
//  26. CLIENT ACCESS REVOKED
// ═══════════════════════════════════════════════════════════

export async function sendClientAccessRevokedEmail(to, clientName, projectName, revokedBy) {
  const subject = `Access removed: ${projectName}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Project Access Removed</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${clientName || 'there'}, your access to the project <strong>${projectName}</strong> has been revoked.
    </p>
    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#991b1b; font-size:13px; line-height:1.6;">
        You will no longer be able to view project details, reports, or messages for this project in your Client Portal.
      </div>
    </div>
    <p style="color:#475569; font-size:13px; line-height:1.6; margin:16px 0 0;">
      If you believe this was a mistake, please contact your inspector or our support team.
    </p>
    ${buttonHtml('Contact Support', 'mailto:admin@nexdynegroup.com')}
  `);

  return sendEmail(to, subject, html, 'client_access_revoked');
}


// ═══════════════════════════════════════════════════════════
//  27. REQUEST ACCEPTED
// ═══════════════════════════════════════════════════════════

export async function sendRequestAcceptedEmail(to, clientName, propertyAddress, inspectorName, responseNote) {
  const subject = `Request accepted: ${propertyAddress}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#059669; font-size:20px;">Request Accepted!</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${clientName || 'there'}, great news — your inspection request for <strong>${propertyAddress}</strong> has been accepted.
    </p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #16a34a;">
      <div style="color:#166534; font-size:14px; font-weight:600; margin-bottom:8px;">Details</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Address:</strong> ${propertyAddress}<br>
        <strong>Inspector:</strong> ${inspectorName}<br>
        ${responseNote ? `<strong>Note:</strong> ${responseNote}` : ''}
      </div>
    </div>
    <p style="color:#475569; font-size:13px; line-height:1.6; margin:16px 0 0;">
      Your inspector will reach out shortly to schedule the inspection. You can track progress in your Client Portal.
    </p>
    ${buttonHtml('View in Portal', `${APP_URL}/portal`, '#059669')}
  `);

  return sendEmail(to, subject, html, 'request_accepted');
}


// ═══════════════════════════════════════════════════════════
//  28. REQUEST DECLINED
// ═══════════════════════════════════════════════════════════

export async function sendRequestDeclinedEmail(to, clientName, propertyAddress, inspectorName, responseNote) {
  const subject = `Update on your request: ${propertyAddress}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Request Update</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${clientName || 'there'}, unfortunately your inspection request for <strong>${propertyAddress}</strong> could not be accepted at this time.
    </p>
    <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #eab308;">
      <div style="color:#854d0e; font-size:14px; font-weight:600; margin-bottom:8px;">Inspector's Note</div>
      <div style="color:#78350f; font-size:13px; line-height:1.6;">
        ${responseNote || 'No additional details provided. Please contact us for more information.'}
      </div>
    </div>
    <p style="color:#475569; font-size:13px; line-height:1.6; margin:16px 0 0;">
      You're welcome to submit a new request or contact the team for alternatives.
    </p>
    ${buttonHtml('Submit New Request', `${APP_URL}/portal`, '#2563eb')}
  `);

  return sendEmail(to, subject, html, 'request_declined');
}


// ═══════════════════════════════════════════════════════════
//  29. PROJECT STATUS UPDATE (generic — for in_progress, scheduled)
// ═══════════════════════════════════════════════════════════

export async function sendProjectStatusUpdateEmail(to, clientName, projectName, newStatus, statusNote) {
  const statusLabels = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    delivered: 'Delivered',
  };
  const statusColors = {
    draft: { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' },
    scheduled: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
    in_progress: { bg: '#fefce8', border: '#fef08a', color: '#854d0e' },
    completed: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
    delivered: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
  };
  const style = statusColors[newStatus] || statusColors.draft;
  const label = statusLabels[newStatus] || newStatus;

  const subject = `Project update: ${projectName} — ${label}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Project Status Update</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${clientName || 'there'}, the status of your project <strong>${projectName}</strong> has been updated.
    </p>
    <div style="background:${style.bg}; border:1px solid ${style.border}; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid ${style.color};">
      <div style="color:${style.color}; font-size:18px; font-weight:700;">${label}</div>
      ${statusNote ? `<div style="color:#475569; font-size:13px; margin-top:8px; line-height:1.6;">${statusNote}</div>` : ''}
    </div>
    ${buttonHtml('View Project', `${APP_URL}/portal`)}
  `);

  return sendEmail(to, subject, html, 'project_status_update');
}


// ═══════════════════════════════════════════════════════════
//  30. LOGIN ALERT (new device/location)
// ═══════════════════════════════════════════════════════════

export async function sendLoginAlertEmail(to, fullName, ipAddress, userAgent, loginTime) {
  const formattedTime = new Date(loginTime || Date.now()).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  const subject = `New sign-in to your ${APP_NAME} account`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">New Sign-In Detected</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      We detected a new sign-in to your ${APP_NAME} account. If this was you, no action is needed.
    </p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e293b; font-size:14px; font-weight:600; margin-bottom:12px;">Sign-In Details</div>
      <div style="color:#475569; font-size:13px; line-height:1.8;">
        <strong>Time:</strong> ${formattedTime}<br>
        <strong>IP Address:</strong> ${ipAddress || 'Unknown'}<br>
        <strong>Device:</strong> ${userAgent ? userAgent.substring(0, 80) : 'Unknown'}
      </div>
    </div>
    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #dc2626;">
      <div style="color:#991b1b; font-size:13px; line-height:1.6; margin:0;">
        <strong>Wasn't you?</strong> Change your password immediately to secure your account.
      </div>
    </div>
    ${buttonHtml('Change Password', `${APP_URL}/settings`, '#dc2626')}
  `);

  return sendEmail(to, subject, html, 'login_alert');
}


// ═══════════════════════════════════════════════════════════
//  31. DAILY DIGEST
// ═══════════════════════════════════════════════════════════

export async function sendDailyDigestEmail(to, fullName, digest) {
  const { newRequests, statusChanges, newMessages, completedInspections } = digest;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let summaryItems = '';
  if (newRequests > 0) summaryItems += `<li><strong>${newRequests}</strong> new inspection request${newRequests > 1 ? 's' : ''}</li>`;
  if (statusChanges > 0) summaryItems += `<li><strong>${statusChanges}</strong> project status update${statusChanges > 1 ? 's' : ''}</li>`;
  if (newMessages > 0) summaryItems += `<li><strong>${newMessages}</strong> unread message${newMessages > 1 ? 's' : ''}</li>`;
  if (completedInspections > 0) summaryItems += `<li><strong>${completedInspections}</strong> completed inspection${completedInspections > 1 ? 's' : ''}</li>`;

  if (!summaryItems) {
    return { skipped: true, reason: 'no_activity' };
  }

  const subject = `Your ${APP_NAME} Daily Summary — ${today}`;
  const html = emailLayout(subject, `
    <h2 style="margin:0 0 12px; color:#1e293b; font-size:20px;">Daily Summary</h2>
    <p style="color:#475569; line-height:1.6; margin:0 0 16px;">
      Hi ${fullName || 'there'}, here's what happened on ${APP_NAME} today:
    </p>
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin:16px 0;">
      <div style="color:#1e40af; font-size:14px; font-weight:600; margin-bottom:8px;">Activity Summary</div>
      <ul style="color:#475569; font-size:14px; line-height:2; margin:0; padding-left:20px;">
        ${summaryItems}
      </ul>
    </div>
    ${buttonHtml('Open Dashboard', APP_URL)}
    <p style="color:#94a3b8; font-size:12px; margin:16px 0 0; text-align:center;">
      You're receiving this because daily digests are enabled for your account.
    </p>
  `);

  return sendEmail(to, subject, html, 'daily_digest');
}
