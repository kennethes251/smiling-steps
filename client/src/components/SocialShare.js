import { Box, IconButton, Tooltip } from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  WhatsApp as WhatsAppIcon,
  Link as LinkIcon,
  Email as EmailIcon
} from '@mui/icons-material';

const SocialShare = ({ url, title, description }) => {
  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);
  const shareText = encodeURIComponent(description || title);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    whatsapp: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
    email: `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${shareUrl}`
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Tooltip title="Share on Facebook">
        <IconButton
          size="small"
          onClick={() => window.open(shareLinks.facebook, '_blank')}
          sx={{ color: '#1877F2' }}
        >
          <FacebookIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Share on Twitter">
        <IconButton
          size="small"
          onClick={() => window.open(shareLinks.twitter, '_blank')}
          sx={{ color: '#1DA1F2' }}
        >
          <TwitterIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Share on LinkedIn">
        <IconButton
          size="small"
          onClick={() => window.open(shareLinks.linkedin, '_blank')}
          sx={{ color: '#0A66C2' }}
        >
          <LinkedInIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Share on WhatsApp">
        <IconButton
          size="small"
          onClick={() => window.open(shareLinks.whatsapp, '_blank')}
          sx={{ color: '#25D366' }}
        >
          <WhatsAppIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Copy link">
        <IconButton size="small" onClick={handleCopyLink}>
          <LinkIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Share via email">
        <IconButton
          size="small"
          onClick={() => window.location.href = shareLinks.email}
        >
          <EmailIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default SocialShare;
