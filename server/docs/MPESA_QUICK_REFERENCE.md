# M-Pesa Integration Quick Reference

## Environment Variables

```env
MPESA_ENVIRONMENT=sandbox|production
MPESA_CONSUMER_KEY=<your-consumer-key>
MPESA_CONSUMER_SECRET=<your-consumer-secret>
MPESA_BUSINESS_SHORT_CODE=<shortcode>
MPESA_PASSKEY=<passkey>
MPESA_CALLBACK_URL=<callback-url>
```

## Sandbox Test Credentials

```
Business Short Code: 174379
Passkey: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
Test Phone: 254708374149
Test PIN: Any 4-digit number
```

## NPM Scripts

```bash
# Validate M-Pesa credentials
npm run mpesa:validate

# Test M-Pesa API connection
npm run mpesa:test
```

## API Endpoints

### Sandbox
- Base URL: `https://sandbox.safaricom.co.ke`
- OAuth: `/oauth/v1/generate?grant_type=client_credentials`
- STK Push: `/mpesa/stkpush/v1/processrequest`
- Query: `/mpesa/stkpushquery/v1/query`

### Production
- Base URL: `https://api.safaricom.co.ke`
- Same endpoints as sandbox

## Common Commands

```bash
# Validate credentials
cd server
node scripts/validate-mpesa-credentials.js

# Test connection
node scripts/test-mpesa-connection.js

# Start server
npm start
```

## Phone Number Formats

```
Input: 0712345678  → Output: 254712345678
Input: 0112345678  → Output: 254112345678
Input: 254712345678 → Output: 254712345678
Input: +254712345678 → Output: 254712345678
```

## STK Push Request Format

```json
{
  "BusinessShortCode": "174379",
  "Password": "<base64_encoded_password>",
  "Timestamp": "20231203120000",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": "1000",
  "PartyA": "254712345678",
  "PartyB": "174379",
  "PhoneNumber": "254712345678",
  "CallBackURL": "https://yourdomain.com/api/mpesa/callback",
  "AccountReference": "SESSION123",
  "TransactionDesc": "Therapy Session Payment"
}
```

## Password Generation

```javascript
const password = Buffer.from(
  `${shortCode}${passkey}${timestamp}`
).toString('base64');
```

## Timestamp Format

```javascript
const timestamp = new Date()
  .toISOString()
  .replace(/[^0-9]/g, '')
  .slice(0, 14);
// Example: 20231203120000
```

## Result Codes

| Code | Description |
|------|-------------|
| 0    | Success |
| 1    | Insufficient Balance |
| 1032 | Request cancelled by user |
| 1037 | Timeout (user didn't enter PIN) |
| 2001 | Invalid initiator |

## Callback Response Structure

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1000 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20191219102115 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

## Security Checklist

- [ ] Never commit `.env` file
- [ ] Use HTTPS for callback URL (production)
- [ ] Verify webhook signatures
- [ ] Mask phone numbers in logs
- [ ] Never store M-Pesa PINs
- [ ] Rotate credentials regularly
- [ ] Monitor API usage
- [ ] Log all transactions

## Troubleshooting

### Invalid Credentials
- Check Consumer Key/Secret
- Verify no extra spaces in `.env`
- Confirm correct environment

### Callback Not Received
- Verify URL is publicly accessible
- Check firewall settings
- Use ngrok for local testing
- Ensure HTTPS (production)

### STK Push Not Delivered
- Verify phone number format
- Check phone has network
- Confirm shortcode is correct
- Verify passkey is valid

## Resources

- [Daraja Portal](https://developer.safaricom.co.ke/)
- [API Documentation](https://developer.safaricom.co.ke/Documentation)
- [Support Email](mailto:apisupport@safaricom.co.ke)
