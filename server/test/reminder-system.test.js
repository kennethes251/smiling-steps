/**
 * Reminder System Tests
 * ery
 * 
 * s the Test
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

const {
  hasOptedOutOfReminders,
  isWithinQuietHours,
  generate24HourReminderEmail,
  generate1HourReminderEmail,
  generate24HourReminderSMS,
  generate1HourReminderSMS,
  REMINDER_CONFIG
} = require('../services/reminderSchedulerService');

describe('Reminder Scheduler Service', () => {
  
  describe('hasOptedOutOfReminders', () => {
    it('should return true for null user', () => {
      expect(hasOptedOutOfReminders(null)).toBe(true);
    });

    it('should return true for undefined user', () => {
      expect(hasOptedOutOfReminders(undefined)).toBe(true);
    });

    it('should return false for user with default preferences', () => {
      const user = { name: 'Test User' };
      expect(hasOptedOutOfReminders(user)).toBe(false);
    });

    it('should return true when notifications.sessionReminders is false', () => {
      const user = {
        name: 'Test User',
        notifications: { sessionReminders: false }
      };
      expect(hasOptedOutOfReminders(user)).toBe(true);
    });

    it('should return true when legacy reminderNotifications is false', () => {
      const user = {
        name: 'Test User',
        reminderNotifications: false
      };
      expect(hasOptedOutOfReminders(user)).toBe(true);
    });

    it('should return false when sessionReminders is true', () => {
      const user = {
        name: 'Test User',
        notifications: { sessionReminders: true }
      };
      expect(hasOptedOutOfReminders(user)).toBe(false);
    });
  });

  describe('isWithinQuietHours', () => {
    it('should return false for null user', () => {
      expect(isWithinQuietHours(null)).toBe(false);
    });

    it('should return false when no quiet hours set', () => {
      const user = { notifications: {} };
      expect(isWithinQuietHours(user)).toBe(false);
    });

    it('should return false when only start time is set', () => {
      const user = {
        notifications: { quietHoursStart: '22:00' }
      };
      expect(isWithinQuietHours(user)).toBe(false);
    });

    it('should return false when only end time is set', () => {
      const user = {
        notifications: { quietHoursEnd: '08:00' }
      };
      expect(isWithinQuietHours(user)).toBe(false);
    });
  });

  describe('generate24HourReminderEmail', () => {
    const mockSession = {
      sessionDate: new Date('2025-01-15T10:00:00'),
      sessionType: 'Individual',
      client: { name: 'John Doe' },
      psychologist: { name: 'Jane Smith' }
    };

    const mockUser = { name: 'John Doe' };

    it('should generate email for client', () => {
      const result = generate24HourReminderEmail(mockSession, mockUser, false);
      
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result.subject).toContain('Reminder');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Dr. Jane Smith');
      expect(result.html).toContain('Individual');
    });

    it('should generate email for therapist', () => {
      const therapistUser = { name: 'Jane Smith' };
      const result = generate24HourReminderEmail(mockSession, therapistUser, true);
      
      expect(result.html).toContain('Dr. Jane Smith');
      expect(result.html).toContain('John Doe');
    });
  });

  describe('generate1HourReminderEmail', () => {
    const mockSession = {
      sessionDate: new Date('2025-01-15T10:00:00'),
      sessionType: 'Individual',
      client: { name: 'John Doe' },
      psychologist: { name: 'Jane Smith' },
      meetingLink: 'abc123xyz',
      getDecryptedMeetingLink: () => 'abc123xyz'
    };

    const mockUser = { name: 'John Doe' };

    it('should generate email with meeting link for client', () => {
      const result = generate1HourReminderEmail(mockSession, mockUser, false);
      
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result.subject).toContain('Starting Soon');
      expect(result.html).toContain('Join Video Call');
      expect(result.html).toContain('abc123xyz');
    });

    it('should include meeting link in email', () => {
      const result = generate1HourReminderEmail(mockSession, mockUser, false);
      expect(result.html).toContain('video-call');
    });
  });

  describe('generate24HourReminderSMS', () => {
    const mockSession = {
      sessionDate: new Date('2025-01-15T10:00:00'),
      sessionType: 'Individual',
      client: { name: 'John Doe' },
      psychologist: { name: 'Jane Smith' }
    };

    const mockUser = { name: 'John Doe' };

    it('should generate SMS for client', () => {
      const result = generate24HourReminderSMS(mockSession, mockUser, false);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Smiling Steps');
      expect(result).toContain('Dr. Jane Smith');
      expect(result).toContain('Individual');
    });

    it('should generate SMS for therapist', () => {
      const therapistUser = { name: 'Jane Smith' };
      const result = generate24HourReminderSMS(mockSession, therapistUser, true);
      
      expect(result).toContain('John Doe');
    });

    it('should be under 160 characters for SMS limit', () => {
      const result = generate24HourReminderSMS(mockSession, mockUser, false);
      // SMS should be reasonably short
      expect(result.length).toBeLessThan(200);
    });
  });

  describe('generate1HourReminderSMS', () => {
    const mockSession = {
      sessionDate: new Date('2025-01-15T10:00:00'),
      sessionType: 'Individual',
      meetingLink: 'abc123xyz',
      getDecryptedMeetingLink: () => 'abc123xyz'
    };

    const mockUser = { name: 'John Doe' };

    it('should generate SMS with meeting link', () => {
      const result = generate1HourReminderSMS(mockSession, mockUser, false);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Smiling Steps');
      expect(result).toContain('1 HOUR');
    });

    it('should include shortened meeting link', () => {
      const result = generate1HourReminderSMS(mockSession, mockUser, false);
      expect(result).toContain('/vc/');
    });
  });

  describe('REMINDER_CONFIG', () => {
    it('should have correct retry configuration', () => {
      expect(REMINDER_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(REMINDER_CONFIG.RETRY_DELAYS).toHaveLength(3);
      expect(REMINDER_CONFIG.RETRY_DELAYS[0]).toBe(60000); // 1 min
      expect(REMINDER_CONFIG.RETRY_DELAYS[1]).toBe(300000); // 5 min
      expect(REMINDER_CONFIG.RETRY_DELAYS[2]).toBe(900000); // 15 min
    });

    it('should have correct time windows', () => {
      expect(REMINDER_CONFIG.REMINDER_24H_WINDOW_START).toBe(23);
      expect(REMINDER_CONFIG.REMINDER_24H_WINDOW_END).toBe(25);
      expect(REMINDER_CONFIG.REMINDER_1H_WINDOW_START).toBe(0.75);
      expect(REMINDER_CONFIG.REMINDER_1H_WINDOW_END).toBe(1.25);
    });

    it('should have timezone set to Africa/Nairobi', () => {
      expect(REMINDER_CONFIG.TIMEZONE).toBe('Africa/Nairobi');
    });
  });
});
