const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const router = express.Router();

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

router.get('/token', (req, res) => {
  const { channelName, uid } = req.query;

  if (!channelName || !uid) {
    return res.status(400).json({ error: 'channelName and uid are required' });
  }

  if (!APP_ID || !APP_CERTIFICATE) {
    console.error('Agora App ID or Certificate is not set in .env file');
    return res.status(500).json({ error: 'Video call service is not configured.' });
  }

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, Number(uid), role, privilegeExpiredTs);

  res.json({ token });
});

module.exports = router;
