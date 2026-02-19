/**
 * Form Completion Flow Integration Tests
 * 
 * Task 25.1: Write integration tests
 * Tests form completion flow
 * 
 * Requirements: 5.1-5.5
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock external services
jest.mock('../../utils/notificationService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}));

const User = require('../../models/User');
const Session = require('../../models/Session');
const ConfidentialityAgreement = require('../../models/ConfidentialityAgreement');
const IntakeForm = require('../../models/IntakeForm');
const encryption = require('../../utils/encryption');

describe('Form Completion Flow Integration Tests', () => {
  let mongoServer;
  let clientUser, therapistUser;
  let testSession;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await ConfidentialityAgreement.deleteMany({});
    await IntakeForm.deleteMany({});

    clientUser = await User.create({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'TestPass123!',
      role: 'client',
      isVerified: true,
      phone: '+254712345678'
    });

    therapistUser = await User.create({
      name: 'Dr. Test Therapist',
      email: 'therapist@test.com',
      password: 'TestPass123!',
      role: 'psychologist',
      isVerified: true,
      approvalStatus: 'approved',
      phone: '+254712345679'
    });

    testSession = await Session.create({
      client: clientUser._id,
      psychologist: therapistUser._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: 'Confirmed',
      price: 5000,
      paymentStatus: 'Paid'
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 30000);

  describe('Confidentiality Agreement', () => {
    test('should create confidentiality agreement with digital signature', async () => {
      const agreement = await ConfidentialityAgreement.create({
        client: clientUser._id,
        session: testSession._id,
        version: '1.0',
        content: 'This is the confidentiality agreement content...',
        digitalSignature: 'Test Client',
        agreedToTerms: true,
        signedAt: new Date(),
        ipAddress: '127.0.0.1'
      });

      expect(agreement).toBeDefined();
      expect(agreement.digitalSignature).toBe('Test Client');
      expect(agreement.agreedToTerms).toBe(true);
      expect(agreement.signedAt).toBeDefined();
    });

    test('should track agreement version', async () => {
      const agreement = await ConfidentialityAgreement.create({
        client: clientUser._id,
        session: testSession._id,
        version: '2.0',
        content: 'Updated confidentiality agreement...',
        digitalSignature: 'Test Client',
        agreedToTerms: true,
        signedAt: new Date()
      });

      expect(agreement.version).toBe('2.0');
    });

    test('should record IP address for audit', async () => {
      const agreement = await ConfidentialityAgreement.create({
        client: clientUser._id,
        session: testSession._id,
        version: '1.0',
        content: 'Agreement content...',
        digitalSignature: 'Test Client',
        agreedToTerms: true,
        signedAt: new Date(),
        ipAddress: '192.168.1.100'
      });

      expect(agreement.ipAddress).toBe('192.168.1.100');
    });
  });

  describe('Intake Form', () => {
    test('should create intake form with encrypted PHI data', async () => {
      const intakeForm = await IntakeForm.create({
        client: clientUser._id,
        session: testSession._id,
        personalInfo: {
          age: 30,
          gender: 'female',
          occupation: 'Software Developer'
        },
        medicalHistory: {
          currentMedications: encryption.encrypt('Sertraline 50mg'),
          allergies: encryption.encrypt('Peanuts'),
          chronicConditions: encryption.encrypt('None')
        },
        mentalHealthHistory: {
          previousTherapy: true,
          currentSymptoms: encryption.encrypt('Anxiety, stress'),
          triggerEvents: encryption.encrypt('Work pressure')
        },
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Sister',
          phone: '+254712345680'
        },
        completedAt: new Date()
      });

      expect(intakeForm).toBeDefined();
      expect(intakeForm.personalInfo.age).toBe(30);
      expect(intakeForm.completedAt).toBeDefined();
      
      // Verify encrypted data is not plaintext
      expect(intakeForm.medicalHistory.currentMedications).not.toBe('Sertraline 50mg');
    });

    test('should decrypt PHI data correctly', async () => {
      const originalMedication = 'Sertraline 50mg';
      const encryptedMedication = encryption.encrypt(originalMedication);

      const intakeForm = await IntakeForm.create({
        client: clientUser._id,
        session: testSession._id,
        medicalHistory: {
          currentMedications: encryptedMedication
        }
      });

      // Decrypt and verify
      const decrypted = encryption.decrypt(intakeForm.medicalHistory.currentMedications);
      expect(decrypted).toBe(originalMedication);
    });

    test('should track form completion status', async () => {
      const intakeForm = await IntakeForm.create({
        client: clientUser._id,
        session: testSession._id,
        isComplete: false
      });

      expect(intakeForm.isComplete).toBe(false);

      // Complete the form
      intakeForm.isComplete = true;
      intakeForm.completedAt = new Date();
      await intakeForm.save();

      const updatedForm = await IntakeForm.findById(intakeForm._id);
      expect(updatedForm.isComplete).toBe(true);
      expect(updatedForm.completedAt).toBeDefined();
    });
  });

  describe('Session Form Status', () => {
    test('should track agreement completion on session', async () => {
      testSession.agreementCompleted = true;
      testSession.agreementCompletedAt = new Date();
      await testSession.save();

      const updatedSession = await Session.findById(testSession._id);
      expect(updatedSession.agreementCompleted).toBe(true);
    });

    test('should track intake form completion on session', async () => {
      testSession.intakeFormCompleted = true;
      testSession.intakeFormCompletedAt = new Date();
      await testSession.save();

      const updatedSession = await Session.findById(testSession._id);
      expect(updatedSession.intakeFormCompleted).toBe(true);
    });

    test('should mark session as Ready when all forms complete', async () => {
      testSession.agreementCompleted = true;
      testSession.intakeFormCompleted = true;
      testSession.formsCompletedAt = new Date();
      testSession.status = 'Ready';
      await testSession.save();

      const updatedSession = await Session.findById(testSession._id);
      expect(updatedSession.status).toBe('Ready');
      expect(updatedSession.formsCompletedAt).toBeDefined();
    });
  });

  describe('Form Reminder System', () => {
    test('should track form reminder sent status', async () => {
      testSession.formReminderSent = true;
      testSession.formReminderSentAt = new Date();
      await testSession.save();

      const updatedSession = await Session.findById(testSession._id);
      expect(updatedSession.formReminderSent).toBe(true);
      expect(updatedSession.formReminderSentAt).toBeDefined();
    });

    test('should identify sessions needing form reminders', async () => {
      // Session 24 hours away with incomplete forms
      const sessionNeedingReminder = await Session.create({
        client: clientUser._id,
        psychologist: therapistUser._id,
        sessionType: 'Individual',
        sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'Confirmed',
        paymentStatus: 'Paid',
        agreementCompleted: false,
        intakeFormCompleted: false,
        formReminderSent: false
      });

      // Query for sessions needing reminders
      const now = new Date();
      const reminderWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      
      const sessionsNeedingReminders = await Session.find({
        sessionDate: { $lte: reminderWindow, $gt: now },
        status: 'Confirmed',
        $or: [
          { agreementCompleted: false },
          { intakeFormCompleted: false }
        ],
        formReminderSent: { $ne: true }
      });

      expect(sessionsNeedingReminders.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Form Flow', () => {
    test('should complete full form workflow', async () => {
      // Step 1: Create session (already done in beforeEach)
      expect(testSession.status).toBe('Confirmed');

      // Step 2: Complete confidentiality agreement
      const agreement = await ConfidentialityAgreement.create({
        client: clientUser._id,
        session: testSession._id,
        version: '1.0',
        content: 'Agreement content...',
        digitalSignature: 'Test Client',
        agreedToTerms: true,
        signedAt: new Date()
      });

      testSession.agreementCompleted = true;
      testSession.agreementCompletedAt = new Date();
      await testSession.save();

      // Step 3: Complete intake form
      const intakeForm = await IntakeForm.create({
        client: clientUser._id,
        session: testSession._id,
        personalInfo: { age: 30 },
        isComplete: true,
        completedAt: new Date()
      });

      testSession.intakeFormCompleted = true;
      testSession.intakeFormCompletedAt = new Date();
      testSession.formsCompletedAt = new Date();
      testSession.status = 'Ready';
      await testSession.save();

      // Verify final state
      const finalSession = await Session.findById(testSession._id);
      expect(finalSession.agreementCompleted).toBe(true);
      expect(finalSession.intakeFormCompleted).toBe(true);
      expect(finalSession.status).toBe('Ready');
    });
  });
});
