# 🚀 Quick Test Guide - Session Booking Flow

## ⚡ 5-Minute Test

### Setup (One Time)
```bash
# Terminal 1 - Start Server
cd server
npm start

# Terminal 2 - Start Client  
cd client
npm start
```

### Test Flow

#### 1️⃣ CLIENT: Create Booking (2 min)
1. Open http://localhost:3000
2. Login as client (amos@gmail.com / password123)
3. Click "New Session" button
4. Select psychologist (Leon or Nancy)
5. Choose date/time (tomorrow, 2 PM)
6. Submit booking
7. ✅ See booking in **"Pending Approval"** section (orange)

#### 2️⃣ PSYCHOLOGIST: Approve (1 min)
1. Open **new incognito window**: http://localhost:3000
2. Login as psychologist (leon@gmail.com / password123)
3. See request in **"Pending Approval"** section (orange badge)
4. Click **"Approve"** button
5. ✅ Success message appears

#### 3️⃣ CLIENT: Submit Payment (1 min)
1. Back to client window
2. Wait 30 seconds OR refresh page
3. See session in **"Approved - Payment Required"** (blue)
4. Click **"Submit Payment"** button
5. Enter transaction code: TEST-12345
6. Submit
7. ✅ See in **"Payment Submitted"** section (purple)

#### 4️⃣ PSYCHOLOGIST: Verify (1 min)
1. Back to psychologist window
2. Wait 30 seconds OR refresh
3. See payment in **"Verify Payment"** section (blue badge)
4. Click **"Verify"** button
5. ✅ Success message appears

#### 5️⃣ BOTH: See Confirmed (30 sec)
1. Both windows refresh (auto or manual)
2. ✅ Client sees in **"Confirmed Sessions"** (green)
3. ✅ Psychologist sees in **"Confirmed Upcoming Sessions"** (green)

## ✅ Success Checklist

After testing, you should see:
- [ ] Client dashboard shows 4 workflow sections
- [ ] Psychologist dashboard shows 3 action sections
- [ ] Colored borders on active sections
- [ ] Badge counts update correctly
- [ ] Auto-refresh works (30 seconds)
- [ ] Status changes sync between dashboards
- [ ] No console errors

## 🎨 What to Look For

### Visual Indicators
- **Orange borders** = Needs approval
- **Blue borders** = Payment processing
- **Green borders** = Confirmed
- **Badges** = Item counts
- **Chips** = Status labels

### Real-Time Sync
- Changes appear within 30 seconds
- No manual refresh needed
- Both dashboards show same data

## 🐛 Quick Fixes

### Can't login?
- Use: amos@gmail.com / password123 (client)
- Use: leon@gmail.com / password123 (psychologist)

### Session not appearing?
- Wait 30 seconds for auto-refresh
- Or refresh page manually
- Check browser console for errors

### Payment button missing?
- Verify session was approved
- Check if price/sessionRate is set
- Refresh the page

## 📊 Expected Flow

```
CLIENT                          PSYCHOLOGIST
  |                                  |
  | 1. Create Booking                |
  |--------------------------------->|
  | (Pending Approval - Orange)      |
  |                                  |
  |                    2. Approve    |
  |<---------------------------------|
  | (Approved - Blue)                |
  |                                  |
  | 3. Submit Payment                |
  |--------------------------------->|
  | (Payment Submitted - Purple)     |
  |                                  |
  |                    4. Verify     |
  |<---------------------------------|
  | (Confirmed - Green)              |
  |                                  |
  | Both see confirmed session       |
```

## 🎯 Test Accounts

### Clients
- amos@gmail.com / password123
- peter@gmail.com / password123
- esther@gmail.com / password123

### Psychologists
- leon@gmail.com / password123
- nancy@gmail.com / password123

## 💡 Pro Tips

1. **Use two browsers**: Regular + Incognito for simultaneous testing
2. **Watch the badges**: They show pending item counts
3. **Look for borders**: Colored borders highlight active sections
4. **Wait 30 seconds**: Auto-refresh happens every 30 seconds
5. **Check colors**: Orange → Blue → Purple → Green

## 🎊 Done!

If all steps work, your booking flow is **fully functional** and **synchronized**! 🚀

For detailed testing, see: **BOOKING_FLOW_VERIFICATION.md**
