// Abuse Handler - Gère les violations utilisateur

export class AbuseHandler {
  
  async recordViolation(
    userId: string,
    violationType: 'rejected_submission' | 'rejected_campaign',
    contentScore?: number
  ) {
    const userAbuse = await this.getUserAbuseData(userId);
    
    if (violationType === 'rejected_submission') {
      userAbuse.rejected_submissions += 1;
    } else {
      userAbuse.rejected_campaigns += 1;
    }
    
    // Determine action
    let action = await this.determineAction(userAbuse, contentScore);
    
    return await this.applyAction(userId, userAbuse, action);
  }

  private async determineAction(userAbuse: any, score?: number) {
    const rejections = userAbuse.rejected_submissions + userAbuse.rejected_campaigns;
    
    if (score !== undefined && score < 0.2 && rejections >= 3) {
      return 'BAN'; // Instant ban for very low scores
    }
    
    if (rejections >= 15) {
      return 'BAN';
    }
    
    if (rejections >= 7) {
      return 'SUSPEND_7D';
    }
    
    if (rejections >= 3) {
      return 'SUSPEND_24H';
    }
    
    return 'WARNING';
  }

  private async applyAction(userId: string, userAbuse: any, action: string) {
    const now = new Date();
    
    switch (action) {
      case 'WARNING':
        await this.sendEmail(userId, 'rejection_warning');
        return { action: 'WARNING', message: 'Warning email sent' };
      
      case 'SUSPEND_24H':
        await this.updateUserSuspension(userId, true, new Date(now.getTime() + 24*60*60*1000));
        await this.sendEmail(userId, 'suspended_24h');
        return { action: 'SUSPEND_24H', message: 'User suspended 24h' };
      
      case 'SUSPEND_7D':
        await this.updateUserSuspension(userId, true, new Date(now.getTime() + 7*24*60*60*1000));
        await this.sendEmail(userId, 'suspended_7d');
        await this.notifyAdmin(userId, 'SUSPENDED_7D');
        return { action: 'SUSPEND_7D', message: 'User suspended 7 days' };
      
      case 'BAN':
        await this.banUser(userId);
        await this.sendEmail(userId, 'account_banned');
        await this.notifyAdmin(userId, 'BANNED');
        return { action: 'BAN', message: 'User permanently banned' };
    }
  }

  private async getUserAbuseData(userId: string) {
    // TODO: Query database
    return {
      rejected_submissions: 0,
      rejected_campaigns: 0,
      is_suspended: false
    };
  }

  private async updateUserSuspension(userId: string, suspended: boolean, until: Date) {
    // TODO: Update database
  }

  private async banUser(userId: string) {
    // TODO: Update database - set status = 'banned'
  }

  private async sendEmail(userId: string, template: string) {
    // TODO: Send email
  }

  private async notifyAdmin(userId: string, action: string) {
    // TODO: Send admin notification
  }
}
