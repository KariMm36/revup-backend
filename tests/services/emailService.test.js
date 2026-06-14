const emailService = require('../../src/services/emailService');
const transporter = require('../../src/config/mailer');

jest.mock('../../src/config/mailer', () => ({
  sendMail: jest.fn()
}));

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a Welcome Email', async () => {
    transporter.sendMail.mockResolvedValue(true);
    
    await emailService.sendWelcomeEmail({ to: 'test@test.com', name: 'John Doe' });
    
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        subject: expect.stringContaining('Welcome to RevUp!')
      })
    );
  });

  it('should send a Password Reset Email', async () => {
    transporter.sendMail.mockResolvedValue(true);
    
    await emailService.sendPasswordResetEmail({ to: 'test@test.com', name: 'John Doe', resetToken: 'abc' });
    
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        subject: expect.stringContaining('Password Reset Request')
      })
    );
    expect(transporter.sendMail.mock.calls[0][0].html).toContain('abc');
  });

  it('should send an Application Status Email', async () => {
    transporter.sendMail.mockResolvedValue(true);
    
    await emailService.sendApplicationStatusEmail({
      to: 'test@test.com',
      seekerName: 'John Doe',
      jobTitle: 'Developer',
      companyName: 'TechCorp',
      newStatus: 'hired'
    });
    
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        subject: expect.stringContaining('Application Update')
      })
    );
    expect(transporter.sendMail.mock.calls[0][0].html).toContain('Congratulations! You have been hired!');
  });

  it('should send an Interview Schedule Email', async () => {
    transporter.sendMail.mockResolvedValue(true);
    
    await emailService.sendInterviewScheduleEmail({
      to: 'test@test.com',
      seekerName: 'John',
      track: 'Technical',
      scheduledAt: '2025-01-01T10:00:00Z',
      location: 'Zoom Link',
      notes: 'Be prepared',
      recruiterName: 'Alice'
    });
    
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        subject: expect.stringContaining('Interview Has Been Scheduled')
      })
    );
    expect(transporter.sendMail.mock.calls[0][0].html).toContain('Technical');
  });

  it('should send an Interview Cancelled Email', async () => {
    transporter.sendMail.mockResolvedValue(true);
    
    await emailService.sendInterviewCancelledEmail({
      to: 'test@test.com',
      seekerName: 'John',
      track: 'Technical',
      scheduledAt: '2025-01-01T10:00:00Z',
      reason: 'Schedule conflict'
    });
    
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        subject: expect.stringContaining('Interview Cancelled')
      })
    );
  });

  it('should send an OTP Email', async () => {
    transporter.sendMail.mockResolvedValue(true);
    
    await emailService.sendOtpEmail({ to: 'test@test.com', name: 'John Doe', code: '123456' });
    
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        subject: expect.stringContaining('Verification Code: 123456')
      })
    );
    expect(transporter.sendMail.mock.calls[0][0].html).toContain('123456');
  });
});
