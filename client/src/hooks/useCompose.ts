import { useComposeStore } from '@/store/composeStore';
import { Email } from '@/types/email';
import { useAuthStore } from '@/store/authStore';

export function useCompose() {
  const { openCompose, closeCompose, updateCompose, minimizeCompose, toggleFullscreen, windows } =
    useComposeStore();
  const { user } = useAuthStore();

  const newCompose = () => openCompose();

  const replyTo = (email: Email, replyAll = false) => {
    const signature = user?.preferences?.signature ? `<br><br>${user.preferences.signature}` : '';
    const quotedHtml = `
      <br><br>
      <div style="padding-left:12px;border-left:3px solid #ccc;color:#666">
        <p>On ${new Date(email.date).toLocaleString()}, ${email.from.name || email.from.email} wrote:</p>
        ${email.body_html}
      </div>
    `;

    const to = [email.from.email];
    const cc = replyAll
      ? email.to.map((a) => a.email).filter((e) => e !== user?.email)
      : [];

    return openCompose({
      to,
      cc,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body_html: `<p></p>${signature}${quotedHtml}`,
      reply_to: email.message_id,
    });
  };

  const forwardEmail = (email: Email) => {
    const signature = user?.preferences?.signature ? `<br><br>${user.preferences.signature}` : '';
    const quotedHtml = `
      <br><br>
      <div style="padding-left:12px;border-left:3px solid #ccc;color:#666">
        <p>---------- Forwarded message ----------</p>
        <p>From: ${email.from.name || email.from.email}</p>
        <p>Date: ${new Date(email.date).toLocaleString()}</p>
        <p>Subject: ${email.subject}</p>
        ${email.body_html}
      </div>
    `;

    return openCompose({
      subject: `Fwd: ${email.subject}`,
      body_html: `<p></p>${signature}${quotedHtml}`,
      forward_from: email.uid,
    });
  };

  return {
    windows,
    newCompose,
    replyTo,
    forwardEmail,
    closeCompose,
    updateCompose,
    minimizeCompose,
    toggleFullscreen,
  };
}
