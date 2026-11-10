// Rate Limiter - Redis-based
// Empêche le spam

export class RateLimiter {
  private redis: any; // TODO: inject Redis client

  async checkLimit(userId: string, action: 'campaign' | 'submission') {
    if (action === 'campaign') {
      return this.checkCampaignLimit(userId);
    } else {
      return this.checkSubmissionLimit(userId);
    }
  }

  private async checkCampaignLimit(userId: string) {
    const key = `campaign:${userId}:week`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days
    
    if (count > 10) {
      return {
        allowed: false,
        message: 'Max 10 campaigns per week',
        limit: 10,
        current: count
      };
    }
    
    return { allowed: true };
  }

  private async checkSubmissionLimit(userId: string) {
    const dayKey = `submission:${userId}:day`;
    const weekKey = `submission:${userId}:week`;
    
    const dayCount = await this.redis.incr(dayKey);
    const weekCount = await this.redis.incr(weekKey);
    
    await this.redis.expire(dayKey, 24 * 60 * 60);
    await this.redis.expire(weekKey, 7 * 24 * 60 * 60);
    
    if (dayCount > 5) {
      return {
        allowed: false,
        message: 'Max 5 submissions per day',
        limit: 5,
        current: dayCount,
        retryAfter: '24h'
      };
    }
    
    if (weekCount > 50) {
      return {
        allowed: false,
        message: 'Max 50 submissions per week',
        limit: 50,
        current: weekCount,
        retryAfter: '7d'
      };
    }
    
    return { allowed: true };
  }
}
