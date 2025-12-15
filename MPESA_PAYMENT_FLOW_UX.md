# 📱 M-Pesa Payment Flow - User Experience Guide
## Smiling Steps Teletherapy Platform

---

## Overview

This document outlines the complete payment experience for clients and therapists using M-Pesa on the Smiling Steps platform. The flow is designed to be intuitive, secure, and compliant with data protection regulations.

---

## 🎯 User Roles

**Client**: Person seeking therapy services who needs to pay for sessions  
**Therapist**: Mental health professional providing services and receiving payments  
**System**: Automated platform managing the payment process

---

## 💳 Complete Payment Journey

### Phase 1: Session Booking (Client Side)

#### Step 1: Browse & Select Therapist
**What Happens:**
- Client logs into their account
- Browses available therapists by specialization
- Views therapist profiles, ratings, and session rates

**User Sees:**
- Clear pricing for each session type (Individual, Couples, Family, Group)
- Therapist availability calendar
- Session duration information

**Security Note:** All browsing is done over secure HTTPS connection

---

#### Step 2: Choose Session Details
**What Happens:**
- Client selects preferred therapist
- Chooses session type (Individual: KSh 2,000 | Couples: KSh 3,500 | Family: KSh 4,500)
- Picks date and time from available slots

**User Sees:**
- Visual calendar with available time slots
- Clear pricing breakdown
- Session duration (60-90 minutes depending on type)

**User Action:** Click "Book Session" button

---

#### Step 3: Review Booking Summary
**What Happens:**
- System displays complete booking details
- Shows total amount to be paid
- Explains next steps clearly

**User Sees:**
```
Booking Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Therapist: Dr. Jane Smith
Session Type: Individual Therapy
Date & Time: Monday, Dec 4, 2024 at 2:00 PM
Duration: 60 minutes
Amount: KSh 2,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
1. Your request will be sent to the therapist
2. Once approved, you'll receive payment instructions
3. Complete payment to confirm your session
```

**User Action:** Click "Submit Booking Request"

**System Action:** 
- Creates session record with status "Pending Approval"
- Sends notification to therapist
- Shows success message to client

---

### Phase 2: Therapist Approval

#### Step 4: Therapist Reviews Request
**What Happens:**
- Therapist receives notification of new booking
- Reviews client request in their dashboard
- Checks schedule availability

**Therapist Sees:**
- Client name and session details
- Requested date and time
- Session type and fee

**Therapist Actions:**
- **Approve**: Proceeds to payment phase
- **Decline**: Sends polite message to client with reason

**System Action (if approved):**
- Updates session status to "Approved"
- Triggers payment notification to client
- Generates payment instructions

---

### Phase 3: Payment Process (Client Side)

#### Step 5: Payment Notification
**What Happens:**
- Client receives notification (email/SMS/in-app)
- Client logs in to view approved session

**Client Sees:**
```
✅ Good News! Your Session is Approved

Dr. Jane Smith has approved your session request.

Session Details:
Individual Therapy
Monday, Dec 4, 2024 at 2:00 PM

Amount to Pay: KSh 2,000

[Proceed to Payment]
```

**User Action:** Clicks "Proceed to Payment"

---

#### Step 6: Payment Page
**What Happens:**
- Client is directed to secure payment page
- System displays payment options
- M-Pesa is prominently featured

**Client Sees:**
- Session summary (therapist, date, amount)
- Payment method options
- M-Pesa logo and "Pay with M-Pesa" button
- Security badges (🔒 Secure Payment)

**User Action:** Clicks "Pay with M-Pesa"

**Privacy Note:** No payment card details are stored on the platform

---

#### Step 7: Enter M-Pesa Phone Number
**What Happens:**
- M-Pesa payment form appears
- Client enters their M-Pesa registered phone number
- System validates phone number format

**Client Sees:**
```
Pay with M-Pesa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Amount: KSh 2,000

📱 M-Pesa Phone Number
[0712345678]

Enter the phone number registered with M-Pesa

🔒 Secure payment via Safaricom M-Pesa

[Pay KSh 2,000]
```

**User Input:** 
- Phone number (format: 0712345678 or 254712345678)
- System auto-formats as user types

**Validation:**
- Must be valid Kenyan phone number
- Must be Safaricom number
- Real-time format checking

**User Action:** Clicks "Pay KSh 2,000"

---

#### Step 8: STK Push Initiated
**What Happens:**
- System sends payment request to M-Pesa
- M-Pesa sends STK Push prompt to client's phone
- Payment page shows waiting status

**Client Sees (on web):**
```
Check Your Phone
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Processing...

An M-Pesa payment prompt has been sent to 
0712345678

Next Steps:
1. Check your phone for M-Pesa prompt
2. Enter your M-Pesa PIN
3. Confirm the payment
4. Wait for confirmation (this page updates automatically)

[Cancel & Try Again]
```

**Client Sees (on phone):**
```
M-Pesa Payment Request

Smiling Steps Therapy
Amount: KSh 2,000

Enter M-Pesa PIN:
[____]

[OK] [Cancel]
```

**User Action (on phone):** 
- Enters M-Pesa PIN
- Confirms payment

**Security Features:**
- PIN is entered on Safaricom's secure system
- Platform never sees or stores PIN
- 2-minute timeout if no action taken

---

#### Step 9: Payment Processing
**What Happens:**
- M-Pesa processes the transaction
- Deducts amount from client's M-Pesa account
- Sends confirmation to Smiling Steps system
- System updates session status

**Client Sees (on web):**
```
⏳ Processing Payment...

Please wait while we confirm your payment.
This usually takes a few seconds.
```

**Behind the Scenes:**
- M-Pesa sends callback to platform
- System verifies transaction details
- Database updated with payment confirmation
- Session status changes to "Confirmed"

**Time:** Usually 5-15 seconds

---

#### Step 10: Payment Confirmation
**What Happens:**
- System receives payment confirmation
- Updates session to "Confirmed" status
- Sends confirmations to both client and therapist
- Generates meeting link

**Client Sees:**
```
✅ Payment Successful!

Your therapy session has been confirmed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Transaction Details:
M-Pesa Code: QA12BC34DE
Amount Paid: KSh 2,000
Date: Dec 3, 2024 at 3:45 PM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session Details:
Therapist: Dr. Jane Smith
Date: Monday, Dec 4, 2024
Time: 2:00 PM
Duration: 60 minutes

Meeting Link: [Join Video Call]

You will receive:
✉️ Email confirmation
📱 SMS reminder 24 hours before
📱 SMS reminder 1 hour before

[Go to Dashboard] [View Session Details]
```

**Client Receives:**
- M-Pesa SMS confirmation from Safaricom
- Email confirmation from Smiling Steps
- Calendar invite (optional)

**Therapist Receives:**
- Notification of confirmed payment
- Updated calendar with confirmed session
- Client contact information

---

### Phase 4: Error Handling

#### Scenario A: Payment Cancelled by User
**What Happens:**
- User cancels M-Pesa prompt on phone
- System receives cancellation notification

**Client Sees:**
```
❌ Payment Cancelled

You cancelled the M-Pesa payment.

Your session is still approved and waiting for payment.

Would you like to try again?

[Try Again] [Back to Dashboard]
```

**User Options:**
- Try payment again immediately
- Return to dashboard and pay later
- Contact support if having issues

---

#### Scenario B: Insufficient Funds
**What Happens:**
- M-Pesa declines due to low balance
- System receives failure notification

**Client Sees:**
```
⚠️ Payment Failed

The payment could not be completed.

Reason: Insufficient M-Pesa balance

Your session is still approved. Please:
1. Add funds to your M-Pesa account
2. Try the payment again

Need help? [Contact Support]

[Try Again] [Back to Dashboard]
```

---

#### Scenario C: Wrong PIN Entered
**What Happens:**
- User enters incorrect M-Pesa PIN
- M-Pesa rejects transaction

**Client Sees:**
```
⚠️ Payment Failed

The payment was not completed.

Reason: Incorrect PIN entered

Please try again and enter the correct M-Pesa PIN.

[Try Again] [Back to Dashboard]
```

**Security Note:** After 3 failed PIN attempts, M-Pesa may temporarily lock the account (Safaricom security feature)

---

#### Scenario D: Network/Technical Error
**What Happens:**
- Network timeout or technical issue
- Payment status unclear

**Client Sees:**
```
⚠️ Payment Status Unclear

We're having trouble confirming your payment.

What to do:
1. Check your M-Pesa messages for confirmation
2. If payment went through, your session will be confirmed shortly
3. If not, you can try again

Status: Checking... (auto-updates)

[Contact Support] [Try Again]
```

**System Action:**
- Automatically queries M-Pesa for status
- Updates client when status is confirmed
- Support team notified for manual review if needed

---

### Phase 5: Post-Payment Experience

#### Step 11: Session Preparation
**What Happens (24 hours before):**
- System sends reminder to client
- Provides session preparation tips
- Confirms meeting link

**Client Receives:**
```
📱 SMS Reminder

Hi! Your therapy session with Dr. Jane Smith 
is tomorrow at 2:00 PM.

Meeting link: https://smilingsteps.com/session/abc123

Tips: Find a quiet, private space. Test your 
camera and microphone beforehand.

Reply CANCEL to reschedule.
```

---

#### Step 12: Session Day
**What Happens (1 hour before):**
- Final reminder sent
- Meeting link activated
- Both parties can join

**Client Sees (in dashboard):**
```
Upcoming Session - Today!

Dr. Jane Smith
Individual Therapy
2:00 PM - 3:00 PM

[Join Video Call] (available 10 min before)

Preparation Checklist:
✓ Quiet, private space
✓ Good internet connection
✓ Camera and microphone working
✓ Any notes or topics to discuss
```

---

#### Step 13: Session Completion
**What Happens (after session):**
- Therapist marks session as complete
- System records session duration
- Requests feedback from client

**Client Sees:**
```
Session Completed

Thank you for your session with Dr. Jane Smith!

How was your experience?
[Rate Your Session: ⭐⭐⭐⭐⭐]

Would you like to:
[Book Another Session] [View Session Notes]
```

---

## 🔒 Security & Privacy Measures

### Data Protection
✅ All payment data encrypted in transit (TLS/SSL)  
✅ No M-Pesa PINs stored on platform  
✅ Payment processed through Safaricom's secure system  
✅ PCI DSS compliance for payment handling  
✅ GDPR-compliant data storage

### User Privacy
✅ Client-therapist confidentiality maintained  
✅ Payment details only visible to authorized parties  
✅ Session details encrypted in database  
✅ Automatic data retention policies  
✅ Right to data deletion upon request

### Transaction Security
✅ Unique transaction IDs for tracking  
✅ Duplicate payment prevention  
✅ Automatic reconciliation with M-Pesa  
✅ Fraud detection monitoring  
✅ Secure webhook verification

---

## 📊 User Notifications Summary

| Event | Client Notification | Therapist Notification |
|-------|-------------------|----------------------|
| Booking Request | ✅ Confirmation | ✅ New request alert |
| Session Approved | ✅ Payment instructions | ✅ Approval confirmation |
| Payment Initiated | ✅ Check phone prompt | - |
| Payment Success | ✅ Confirmation + receipt | ✅ Payment received |
| Payment Failed | ✅ Error + retry option | - |
| 24hr Reminder | ✅ Session reminder | ✅ Session reminder |
| 1hr Reminder | ✅ Join link | ✅ Join link |
| Session Complete | ✅ Feedback request | ✅ Completion confirmation |

---

## 🎯 Key UX Principles

### Clarity
- Clear pricing displayed upfront
- Step-by-step progress indicators
- Plain language (no technical jargon)
- Visual feedback at every stage

### Trust
- Security badges and SSL indicators
- Transparent pricing (no hidden fees)
- Clear refund/cancellation policy
- Professional design and branding

### Simplicity
- Minimal steps to complete payment
- Auto-fill and format assistance
- One-click retry on errors
- Mobile-optimized interface

### Support
- Help text at each step
- Contact support always visible
- FAQ section for common issues
- Live chat for urgent problems

---

## ⚖️ Compliance & Regulations

### Kenya Data Protection Act (2019)
✅ User consent obtained for data processing  
✅ Clear privacy policy provided  
✅ Data minimization practiced  
✅ Secure data storage and transmission  
✅ User rights respected (access, deletion, portability)

### Healthcare Privacy
✅ HIPAA-equivalent standards for health data  
✅ Client-therapist privilege maintained  
✅ Session content never shared  
✅ Payment separate from health records  
✅ Encrypted communications

### Financial Regulations
✅ Safaricom M-Pesa terms compliance  
✅ Transaction records maintained  
✅ Anti-money laundering checks  
✅ Transparent fee structure  
✅ Proper invoicing and receipts

---

## 📱 Mobile Experience

The entire flow is optimized for mobile devices:
- Responsive design adapts to screen size
- Touch-friendly buttons and inputs
- Simplified navigation
- Fast loading times
- Works on 3G/4G connections

---

## 🆘 Support & Help

### For Clients
**Payment Issues:**
- Check M-Pesa balance
- Verify phone number is correct
- Ensure phone has network signal
- Contact: support@smilingsteps.com

**Session Issues:**
- Check email for meeting link
- Test video/audio before session
- Contact therapist directly if needed

### For Therapists
**Payment Tracking:**
- View all payments in dashboard
- Download payment reports
- Track pending payments
- Reconciliation support available

---

## ✅ Success Metrics

**User Experience Goals:**
- Payment completion rate: >95%
- Average payment time: <60 seconds
- Error rate: <2%
- User satisfaction: >4.5/5 stars
- Support tickets: <1% of transactions

---

## 🎉 Benefits of This Flow

**For Clients:**
- Fast, familiar payment method (M-Pesa)
- No need for credit/debit cards
- Instant confirmation
- Secure and private
- Easy to track payments

**For Therapists:**
- Automatic payment verification
- No manual reconciliation needed
- Faster payment processing
- Reduced no-shows (prepaid)
- Professional payment system

**For Platform:**
- Automated workflow
- Reduced support burden
- Better conversion rates
- Compliance with regulations
- Scalable solution

---

*This payment flow is designed to provide a seamless, secure, and user-friendly experience while maintaining the highest standards of privacy and compliance for healthcare services.*
