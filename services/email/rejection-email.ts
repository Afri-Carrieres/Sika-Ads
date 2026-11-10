// Email Service - Notifications
export class RejectionEmailService {
  
  async send(payload: any) {
    const templates = {
      warning: this.getWarningTemplate(payload),
      suspended_24h: this.getSuspended24hTemplate(payload),
      suspended_7d: this.getSuspended7dTemplate(payload),
      banned: this.getBannedTemplate(payload)
    };

    const emailContent = templates[payload.violationType];
    console.log(`Email would be sent to ${payload.to}: ${payload.violationType}`);
    // TODO: Send via Resend
  }

  private getWarningTemplate(p: any) {
    return {
      subject: 'Your proof submission was rejected',
      text: `Your submission was rejected. This is violation ${p.rejectionCount}/5. Please review guidelines.`
    };
  }

  private getSuspended24hTemplate(p: any) {
    return {
      subject: 'Account suspended 24 hours',
      text: `Your account has been suspended for 24 hours due to ${p.rejectionCount} rejections.`
    };
  }

  private getSuspended7dTemplate(p: any) {
    return {
      subject: 'Account suspended 7 days',
      text: `Your account has been suspended for 7 days. Contact support if needed.`
    };
  }

  private getBannedTemplate(p: any) {
    return {
      subject: 'Account permanently banned',
      text: `Your account has been permanently banned after ${p.rejectionCount} violations.`
    };
  }
}
