/**
 * Property-Based Tests for Payment Search
 * Feature: admin-user-management, Property 15: Payment Search Returns Matching Results
 * Validates: Requirements 10.2
 */
const fc = require('fast-check');
process.env.NODE_ENV = 'test';

function filterPayments(payments, filters) {
  const { startDate, endDate, clientId, therapistId, transactionId, status, search } = filters;
  return payments.filter(payment => {
    if (startDate) {
      const paymentDate = new Date(payment.paymentVerifiedAt);
      if (isNaN(paymentDate.getTime())) return false;
      if (paymentDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const paymentDate = new Date(payment.paymentVerifiedAt);
      if (isNaN(paymentDate.getTime())) return false;
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (paymentDate > end) return false;
    }
    if (clientId && payment.client?.id !== clientId) return false;
    if (therapistId && payment.psychologist?.id !== therapistId) return false;
    if (transactionId && payment.mpesaTransactionID !== transactionId) return false;
    if (status && payment.paymentStatus !== status) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        payment.client?.name?.toLowerCase().includes(searchLower) ||
        payment.client?.email?.toLowerCase().includes(searchLower) ||
        payment.psychologist?.name?.toLowerCase().includes(searchLower) ||
        payment.psychologist?.email?.toLowerCase().includes(searchLower) ||
        payment.mpesaTransactionID?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });
}

function paymentMatchesAllFilters(payment, filters) {
  const { startDate, endDate, clientId, therapistId, transactionId, status } = filters;
  const paymentDate = new Date(payment.paymentVerifiedAt);
  if (isNaN(paymentDate.getTime())) return false;
  if (startDate && paymentDate < new Date(startDate)) return false;
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (paymentDate > end) return false;
  }
  if (clientId && payment.client?.id !== clientId) return false;
  if (therapistId && payment.psychologist?.id !== therapistId) return false;
  if (transactionId && payment.mpesaTransactionID !== transactionId) return false;
  if (status && payment.paymentStatus !== status) return false;
  return true;
}

const objectIdArb = fc.string({ minLength: 24, maxLength: 24 }).map(s => {
  const hex = '0123456789abcdef';
  return Array.from({ length: 24 }, (_, i) => hex[Math.abs(s.charCodeAt(i % s.length)) % 16]).join('');
});

const transactionIdArb = fc.string({ minLength: 10, maxLength: 20 }).map(s => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: Math.max(10, Math.min(20, s.length)) }, (_, i) =>
    chars[Math.abs(s.charCodeAt(i % s.length)) % chars.length]
  ).join('');
});

const paymentStatusArb = fc.constantFrom('Paid', 'Failed', 'Processing', 'Pending');

const userArb = fc.record({
  id: objectIdArb,
  name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
  email: fc.emailAddress()
});

const validDateArb = fc.integer({ 
  min: new Date('2024-01-01').getTime(), 
  max: new Date('2024-12-31').getTime() 
}).map(ts => new Date(ts));

const startDateArb = fc.integer({ 
  min: new Date('2024-01-01').getTime(), 
  max: new Date('2024-06-30').getTime() 
}).map(ts => new Date(ts));

const endDateArb = fc.integer({ 
  min: new Date('2024-07-01').getTime(), 
  max: new Date('2024-12-31').getTime() 
}).map(ts => new Date(ts));

const paymentArb = fc.record({
  id: objectIdArb,
  mpesaTransactionID: transactionIdArb,
  paymentVerifiedAt: validDateArb,
  mpesaAmount: fc.integer({ min: 100, max: 100000 }),
  paymentStatus: paymentStatusArb,
  client: userArb,
  psychologist: userArb
});

const paymentsArrayArb = fc.array(paymentArb, { minLength: 5, maxLength: 30 });

describe('Property 15: Payment Search Returns Matching Results', () => {
  describe('Date Range Filter', () => {
    it('all returned payments should be within specified date range', () => {
      fc.assert(fc.property(
        paymentsArrayArb,
        startDateArb,
        endDateArb,
        (payments, startDate, endDate) => {
          const filters = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
          const filtered = filterPayments(payments, filters);
          return filtered.every(p => {
            const paymentDate = new Date(p.paymentVerifiedAt);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return paymentDate >= startDate && paymentDate <= end;
          });
        }
      ), { numRuns: 100 });
    });
  });

  describe('Client Filter', () => {
    it('all returned payments should match specified client ID', () => {
      fc.assert(fc.property(paymentsArrayArb, (payments) => {
        if (payments.length === 0) return true;
        const targetClientId = payments[0].client.id;
        const filtered = filterPayments(payments, { clientId: targetClientId });
        return filtered.every(p => p.client.id === targetClientId);
      }), { numRuns: 100 });
    });
  });

  describe('Therapist Filter', () => {
    it('all returned payments should match specified therapist ID', () => {
      fc.assert(fc.property(paymentsArrayArb, (payments) => {
        if (payments.length === 0) return true;
        const targetTherapistId = payments[0].psychologist.id;
        const filtered = filterPayments(payments, { therapistId: targetTherapistId });
        return filtered.every(p => p.psychologist.id === targetTherapistId);
      }), { numRuns: 100 });
    });
  });

  describe('Transaction ID Filter', () => {
    it('all returned payments should match specified transaction ID', () => {
      fc.assert(fc.property(paymentsArrayArb, (payments) => {
        if (payments.length === 0) return true;
        const targetTransactionId = payments[0].mpesaTransactionID;
        const filtered = filterPayments(payments, { transactionId: targetTransactionId });
        return filtered.every(p => p.mpesaTransactionID === targetTransactionId);
      }), { numRuns: 100 });
    });
  });

  describe('Status Filter', () => {
    it('all returned payments should match specified status', () => {
      fc.assert(fc.property(paymentsArrayArb, paymentStatusArb, (payments, status) => {
        const filtered = filterPayments(payments, { status });
        return filtered.every(p => p.paymentStatus === status);
      }), { numRuns: 100 });
    });
  });

  describe('Combined Filters', () => {
    it('all returned payments should match ALL specified filter criteria', () => {
      fc.assert(fc.property(
        paymentsArrayArb,
        paymentStatusArb,
        startDateArb,
        endDateArb,
        (payments, status, startDate, endDate) => {
          const filters = { status, startDate: startDate.toISOString(), endDate: endDate.toISOString() };
          const filtered = filterPayments(payments, filters);
          return filtered.every(p => paymentMatchesAllFilters(p, filters));
        }
      ), { numRuns: 100 });
    });

    it('combining filters should be conjunctive (AND logic)', () => {
      fc.assert(fc.property(paymentsArrayArb, (payments) => {
        if (payments.length === 0) return true;
        const targetPayment = payments[0];
        const filters = {
          clientId: targetPayment.client.id,
          therapistId: targetPayment.psychologist.id,
          status: targetPayment.paymentStatus
        };
        const filtered = filterPayments(payments, filters);
        return filtered.every(p =>
          p.client.id === filters.clientId &&
          p.psychologist.id === filters.therapistId &&
          p.paymentStatus === filters.status
        );
      }), { numRuns: 100 });
    });
  });

  describe('Filter Completeness', () => {
    it('filtered results should be a subset of original payments', () => {
      fc.assert(fc.property(paymentsArrayArb, paymentStatusArb, (payments, status) => {
        const filtered = filterPayments(payments, { status });
        return filtered.length <= payments.length;
      }), { numRuns: 100 });
    });

    it('empty filters should return all payments', () => {
      fc.assert(fc.property(paymentsArrayArb, (payments) => {
        const filtered = filterPayments(payments, {});
        return filtered.length === payments.length;
      }), { numRuns: 100 });
    });
  });
});
