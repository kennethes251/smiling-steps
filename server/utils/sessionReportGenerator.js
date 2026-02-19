const PDFDocument = require('pdfkit');
const encryption = require('./encryption');

/**
 * Session Report Generator
 * 
 * Generates HIPAA-compliant PDF reports for session data.
 * Supports encrypted export and proper formatting.
 * 
 * Requirements: 11.5 - HIPAA-compliant report in PDF format
 */

class SessionReportGenerator {
  constructor() {
    this.pageMargin = 50;
    this.lineHeight = 20;
  }

  /**
   * Generate a session report PDF
   * @param {Object} options - Report options
   * @param {Object} options.session - Session data
   * @param {Object} options.client - Client data
   * @param {Object} options.therapist - Therapist data
   * @param {Array} options.notes - Session notes
   * @param {Object} options.intakeForm - Intake form data (optional)
   * @param {boolean} options.includeNotes - Whether to include clinical notes
   * @param {boolean} options.isClientReport - Whether this is for client viewing
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateSessionReport(options) {
    const {
      session,
      client,
      therapist,
      notes = [],
      intakeForm = null,
      includeNotes = true,
      isClientReport = false
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: `Session Report - ${session.bookingReference || session._id}`,
            Author: 'Smiling Steps Teletherapy',
            Subject: 'Therapy Session Report',
            Keywords: 'therapy, session, report, HIPAA',
            CreationDate: new Date()
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate report content
        this._addHeader(doc);
        this._addConfidentialityNotice(doc);
        this._addSessionInfo(doc, session, client, therapist);
        
        if (intakeForm && !isClientReport) {
          this._addIntakeFormSummary(doc, intakeForm);
        }
        
        if (includeNotes && notes.length > 0) {
          this._addSessionNotes(doc, notes, isClientReport);
        }
        
        this._addFooter(doc);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }


  _addHeader(doc) {
    // Logo placeholder
    doc.fontSize(24)
       .fillColor('#663399')
       .text('Smiling Steps', this.pageMargin, this.pageMargin, { align: 'center' });
    
    doc.fontSize(12)
       .fillColor('#666666')
       .text('Teletherapy Services', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Report title
    doc.fontSize(18)
       .fillColor('#333333')
       .text('Session Report', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Generation timestamp
    doc.fontSize(10)
       .fillColor('#999999')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    
    doc.moveDown(2);
    
    // Horizontal line
    doc.strokeColor('#663399')
       .lineWidth(2)
       .moveTo(this.pageMargin, doc.y)
       .lineTo(doc.page.width - this.pageMargin, doc.y)
       .stroke();
    
    doc.moveDown(1);
  }

  _addConfidentialityNotice(doc) {
    doc.fontSize(9)
       .fillColor('#cc0000')
       .text('CONFIDENTIAL - PROTECTED HEALTH INFORMATION', { align: 'center' });
    
    doc.fontSize(8)
       .fillColor('#666666')
       .text(
         'This document contains Protected Health Information (PHI) as defined by HIPAA. ' +
         'Unauthorized disclosure is prohibited. This report is intended only for the ' +
         'authorized recipient and should be stored securely.',
         { align: 'center' }
       );
    
    doc.moveDown(1.5);
  }

  _addSessionInfo(doc, session, client, therapist) {
    doc.fontSize(14)
       .fillColor('#663399')
       .text('Session Information', { underline: true });
    
    doc.moveDown(0.5);
    
    const sessionInfo = [
      ['Booking Reference:', session.bookingReference || 'N/A'],
      ['Session Type:', session.sessionType || 'Individual'],
      ['Session Date:', this._formatDate(session.sessionDate)],
      ['Status:', session.status || 'N/A'],
      ['Duration:', session.callDuration ? `${session.callDuration} minutes` : 'N/A'],
      ['Payment Status:', session.paymentStatus || 'N/A'],
      ['Amount:', session.price ? `KES ${session.price.toLocaleString()}` : 'N/A']
    ];
    
    this._addTable(doc, sessionInfo);
    doc.moveDown(1);
    
    // Client Information
    doc.fontSize(14)
       .fillColor('#663399')
       .text('Client Information', { underline: true });
    
    doc.moveDown(0.5);
    
    const clientInfo = [
      ['Name:', client?.name || 'N/A'],
      ['Email:', client?.email || 'N/A'],
      ['Phone:', client?.phone || 'N/A']
    ];
    
    this._addTable(doc, clientInfo);
    doc.moveDown(1);
    
    // Therapist Information
    doc.fontSize(14)
       .fillColor('#663399')
       .text('Therapist Information', { underline: true });
    
    doc.moveDown(0.5);
    
    const therapistInfo = [
      ['Name:', therapist?.name || 'N/A'],
      ['Email:', therapist?.email || 'N/A'],
      ['Specializations:', therapist?.psychologistDetails?.specializations?.join(', ') || 'N/A']
    ];
    
    this._addTable(doc, therapistInfo);
    doc.moveDown(1);
  }


  _addIntakeFormSummary(doc, intakeForm) {
    // Check if we need a new page
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }
    
    doc.fontSize(14)
       .fillColor('#663399')
       .text('Intake Form Summary', { underline: true });
    
    doc.moveDown(0.5);
    
    const intakeInfo = [
      ['Reason for Therapy:', this._truncateText(intakeForm.reasonForTherapy, 100) || 'N/A'],
      ['Therapy Goals:', this._truncateText(intakeForm.therapyGoals, 100) || 'N/A'],
      ['Previous Therapy:', intakeForm.previousTherapyExperience || 'None reported'],
      ['Current Symptoms:', this._truncateText(intakeForm.currentSymptoms, 80) || 'N/A'],
      ['Symptom Severity:', intakeForm.symptomSeverity || 'N/A'],
      ['Current Medications:', intakeForm.currentMedications || 'None'],
      ['Medical Conditions:', intakeForm.medicalConditions || 'None'],
      ['Emergency Contact:', `${intakeForm.emergencyContactName || 'N/A'} (${intakeForm.emergencyContactRelationship || 'N/A'})`]
    ];
    
    this._addTable(doc, intakeInfo);
    doc.moveDown(1);
  }

  _addSessionNotes(doc, notes, isClientReport) {
    // Check if we need a new page
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }
    
    doc.fontSize(14)
       .fillColor('#663399')
       .text('Session Notes', { underline: true });
    
    doc.moveDown(0.5);
    
    // Filter notes for client reports
    const displayNotes = isClientReport 
      ? notes.filter(n => n.isClientVisible)
      : notes;
    
    if (displayNotes.length === 0) {
      doc.fontSize(10)
         .fillColor('#666666')
         .text(isClientReport 
           ? 'No notes have been shared for this session.'
           : 'No notes recorded for this session.'
         );
      return;
    }
    
    displayNotes.forEach((note, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }
      
      // Note header
      doc.fontSize(11)
         .fillColor('#333333')
         .text(`Note ${index + 1}: ${this._formatNoteType(note.noteType)}`, {
           continued: false
         });
      
      doc.fontSize(9)
         .fillColor('#999999')
         .text(`Version ${note.version} | ${this._formatDate(note.createdAt)} | By: ${note.author?.name || 'Unknown'}`);
      
      doc.moveDown(0.3);
      
      // Note content
      doc.fontSize(10)
         .fillColor('#333333')
         .text(note.content || '[No content]', {
           width: doc.page.width - (this.pageMargin * 2),
           align: 'left'
         });
      
      doc.moveDown(1);
      
      // Separator
      if (index < displayNotes.length - 1) {
        doc.strokeColor('#cccccc')
           .lineWidth(0.5)
           .moveTo(this.pageMargin, doc.y)
           .lineTo(doc.page.width - this.pageMargin, doc.y)
           .stroke();
        doc.moveDown(0.5);
      }
    });
  }

  _addFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor('#663399')
         .lineWidth(1)
         .moveTo(this.pageMargin, doc.page.height - 50)
         .lineTo(doc.page.width - this.pageMargin, doc.page.height - 50)
         .stroke();
      
      // Footer text
      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           'Smiling Steps Teletherapy | Confidential Medical Record',
           this.pageMargin,
           doc.page.height - 40,
           { align: 'left', width: 200 }
         );
      
      doc.text(
         `Page ${i + 1} of ${pageCount}`,
         doc.page.width - this.pageMargin - 100,
         doc.page.height - 40,
         { align: 'right', width: 100 }
       );
    }
  }


  _addTable(doc, data) {
    const labelWidth = 150;
    const valueWidth = doc.page.width - (this.pageMargin * 2) - labelWidth;
    
    data.forEach(([label, value]) => {
      const startY = doc.y;
      
      doc.fontSize(10)
         .fillColor('#666666')
         .text(label, this.pageMargin, startY, { width: labelWidth });
      
      doc.fontSize(10)
         .fillColor('#333333')
         .text(value || 'N/A', this.pageMargin + labelWidth, startY, { width: valueWidth });
      
      doc.moveDown(0.3);
    });
  }

  _formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  _formatNoteType(noteType) {
    const types = {
      'session_notes': 'Session Notes',
      'clinical_observation': 'Clinical Observation',
      'treatment_plan': 'Treatment Plan',
      'progress_note': 'Progress Note',
      'follow_up': 'Follow-up Notes'
    };
    return types[noteType] || noteType;
  }

  _truncateText(text, maxLength) {
    if (!text) return null;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Generate encrypted PDF report
   * @param {Object} options - Same as generateSessionReport
   * @returns {Promise<Object>} - { encryptedData, key }
   */
  async generateEncryptedReport(options) {
    const pdfBuffer = await this.generateSessionReport(options);
    const base64Pdf = pdfBuffer.toString('base64');
    
    // Encrypt the PDF data
    const encryptedData = encryption.encrypt(base64Pdf);
    
    return {
      encryptedData,
      contentType: 'application/pdf',
      filename: `session-report-${options.session.bookingReference || options.session._id}.pdf.encrypted`
    };
  }

  /**
   * Decrypt an encrypted report
   * @param {string} encryptedData - Encrypted PDF data
   * @returns {Buffer} - Decrypted PDF buffer
   */
  decryptReport(encryptedData) {
    const decryptedBase64 = encryption.decrypt(encryptedData);
    return Buffer.from(decryptedBase64, 'base64');
  }

  /**
   * Generate a client session history summary PDF
   * Requirements: 12.5 - Generate session history summary PDF
   * 
   * @param {Object} options - Report options
   * @param {Object} options.client - Client data
   * @param {Array} options.sessions - Array of session data
   * @param {Object} options.stats - Summary statistics
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateClientHistorySummary(options) {
    const { client, sessions, stats } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: `Session History Summary - ${client.name}`,
            Author: 'Smiling Steps Teletherapy',
            Subject: 'Client Session History Summary',
            Keywords: 'therapy, session, history, summary',
            CreationDate: new Date()
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate report content
        this._addHistoryHeader(doc, client);
        this._addHistoryConfidentialityNotice(doc);
        this._addHistorySummaryStats(doc, stats);
        this._addSessionsList(doc, sessions);
        this._addHistoryFooter(doc);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  _addHistoryHeader(doc, client) {
    // Logo placeholder
    doc.fontSize(24)
       .fillColor('#663399')
       .text('Smiling Steps', this.pageMargin, this.pageMargin, { align: 'center' });
    
    doc.fontSize(12)
       .fillColor('#666666')
       .text('Teletherapy Services', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Report title
    doc.fontSize(18)
       .fillColor('#333333')
       .text('Session History Summary', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Client name
    doc.fontSize(14)
       .fillColor('#663399')
       .text(`Prepared for: ${client.name}`, { align: 'center' });
    
    doc.moveDown(0.3);
    
    // Generation timestamp
    doc.fontSize(10)
       .fillColor('#999999')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    
    doc.moveDown(1.5);
    
    // Horizontal line
    doc.strokeColor('#663399')
       .lineWidth(2)
       .moveTo(this.pageMargin, doc.y)
       .lineTo(doc.page.width - this.pageMargin, doc.y)
       .stroke();
    
    doc.moveDown(1);
  }

  _addHistoryConfidentialityNotice(doc) {
    doc.fontSize(9)
       .fillColor('#cc0000')
       .text('CONFIDENTIAL - PERSONAL HEALTH RECORD', { align: 'center' });
    
    doc.fontSize(8)
       .fillColor('#666666')
       .text(
         'This document is a summary of your therapy sessions. It does not include ' +
         'confidential clinical notes or observations. For complete records, please ' +
         'contact your healthcare provider.',
         { align: 'center' }
       );
    
    doc.moveDown(1.5);
  }

  _addHistorySummaryStats(doc, stats) {
    doc.fontSize(14)
       .fillColor('#663399')
       .text('Summary Overview', { underline: true });
    
    doc.moveDown(0.5);
    
    const summaryData = [
      ['Total Sessions:', stats.totalSessions.toString()],
      ['Completed Sessions:', stats.completedSessions.toString()],
      ['Total Session Time:', `${stats.totalDuration} minutes`],
      ['Therapists Seen:', stats.therapists.join(', ') || 'N/A'],
      ['Date Range:', stats.dateRange.earliest && stats.dateRange.latest 
        ? `${this._formatDateShort(stats.dateRange.earliest)} to ${this._formatDateShort(stats.dateRange.latest)}`
        : 'N/A'
      ]
    ];
    
    this._addTable(doc, summaryData);
    doc.moveDown(0.5);
    
    // Session types breakdown
    if (Object.keys(stats.sessionTypes).length > 0) {
      doc.fontSize(12)
         .fillColor('#333333')
         .text('Sessions by Type:');
      
      doc.moveDown(0.3);
      
      Object.entries(stats.sessionTypes).forEach(([type, count]) => {
        doc.fontSize(10)
           .fillColor('#666666')
           .text(`  • ${type}: ${count} session${count > 1 ? 's' : ''}`, {
             indent: 20
           });
      });
    }
    
    doc.moveDown(1.5);
  }

  _addSessionsList(doc, sessions) {
    doc.fontSize(14)
       .fillColor('#663399')
       .text('Session History', { underline: true });
    
    doc.moveDown(0.5);
    
    if (sessions.length === 0) {
      doc.fontSize(10)
         .fillColor('#666666')
         .text('No sessions to display.');
      return;
    }
    
    sessions.forEach((session, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }
      
      // Session number and date
      doc.fontSize(11)
         .fillColor('#333333')
         .text(`${index + 1}. ${this._formatDateShort(session.sessionDate)}`, {
           continued: false
         });
      
      // Session details in a compact format
      const therapistName = session.psychologist?.name || 'Unknown Therapist';
      const sessionType = session.sessionType || 'Individual';
      const status = session.status || 'N/A';
      const duration = session.callDuration ? `${session.callDuration} min` : 'N/A';
      const reference = session.bookingReference || 'N/A';
      
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`   Therapist: ${therapistName}`, { indent: 15 })
         .text(`   Type: ${sessionType} | Status: ${status} | Duration: ${duration}`, { indent: 15 })
         .text(`   Reference: ${reference}`, { indent: 15 });
      
      doc.moveDown(0.5);
      
      // Light separator
      if (index < sessions.length - 1) {
        doc.strokeColor('#eeeeee')
           .lineWidth(0.5)
           .moveTo(this.pageMargin + 20, doc.y)
           .lineTo(doc.page.width - this.pageMargin - 20, doc.y)
           .stroke();
        doc.moveDown(0.5);
      }
    });
  }

  _addHistoryFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor('#663399')
         .lineWidth(1)
         .moveTo(this.pageMargin, doc.page.height - 50)
         .lineTo(doc.page.width - this.pageMargin, doc.page.height - 50)
         .stroke();
      
      // Footer text
      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           'Smiling Steps Teletherapy | Personal Health Record',
           this.pageMargin,
           doc.page.height - 40,
           { align: 'left', width: 200 }
         );
      
      doc.text(
         `Page ${i + 1} of ${pageCount}`,
         doc.page.width - this.pageMargin - 100,
         doc.page.height - 40,
         { align: 'right', width: 100 }
       );
    }
  }

  _formatDateShort(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

module.exports = new SessionReportGenerator();
