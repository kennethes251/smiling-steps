import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  Chip,
  Button
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  Psychology as PsychologyIcon,
  Phone as PhoneIcon,
  Group as GroupIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const ComprehensiveFAQ = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqCategories = [
    {
      id: 'online-therapy',
      title: 'Online Therapy & Sessions',
      icon: <PsychologyIcon />,
      color: '#663399',
      faqs: [
        {
          question: 'How effective is online therapy compared to in-person sessions?',
          answer: 'Research shows that online therapy can be just as effective as in-person therapy for many mental health conditions, including depression, anxiety, and addiction recovery. Our platform uses evidence-based approaches and maintains the same therapeutic relationship quality through secure video sessions.'
        },
        {
          question: 'What types of therapy do you offer online?',
          answer: 'We offer individual addiction counseling, trauma-informed therapy, Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), art therapy, music therapy, and group support sessions. Our therapists are trained in multiple modalities to meet your specific needs.'
        },
        {
          question: 'How do I know if online therapy is right for me?',
          answer: 'Online therapy works well for most people, especially those who value convenience, have transportation challenges, or prefer the comfort of their own space. During your intake assessment, we\'ll help determine if online therapy meets your specific needs or if additional support is recommended.'
        },
        {
          question: 'What happens if I have a crisis during or between sessions?',
          answer: 'We have 24/7 crisis support protocols in place. Your therapist will provide you with emergency contact information, and our platform includes direct links to Kenya\'s mental health crisis hotlines. For immediate emergencies, always contact local emergency services first.'
        }
      ]
    },
    {
      id: 'pricing-payments',
      title: 'Pricing & Payments',
      icon: <PaymentIcon />,
      color: '#2E7D32',
      faqs: [
        {
          question: 'How much do therapy sessions cost?',
          answer: 'Individual therapy sessions start from KES 2,000 per session. Group therapy sessions are KES 1,000 per session. We also offer package deals: 4-session packages at 10% discount, and 8-session packages at 15% discount. Pricing varies based on therapist experience and session type.'
        },
        {
          question: 'Do you accept M-Pesa payments?',
          answer: 'Yes! We have full M-Pesa integration for all major Kenyan networks (Safaricom, Airtel, Telkom). You can pay instantly using your mobile money account. We also accept bank transfers and mobile banking payments.'
        },
        {
          question: 'Are there any hidden fees or charges?',
          answer: 'No hidden fees. Our pricing is transparent and includes all platform access, session recordings (if requested), and between-session messaging. The only additional costs might be for specialized assessments or extended session times, which are always discussed in advance.'
        },
        {
          question: 'Do you offer payment plans or sliding scale fees?',
          answer: 'Yes, we understand that mental health care should be accessible. We offer flexible payment plans and have a limited number of sliding scale spots available based on financial need. Contact our support team to discuss options that work for your budget.'
        },
        {
          question: 'Can I get a refund if I need to cancel?',
          answer: 'We offer full refunds for cancellations made at least 24 hours before your session. Cancellations with less than 24 hours notice receive a 50% refund. Emergency cancellations are handled case-by-case with full consideration for your circumstances.'
        }
      ]
    },
    {
      id: 'platform-access',
      title: 'Platform Access & Technology',
      icon: <PhoneIcon />,
      color: '#1976D2',
      faqs: [
        {
          question: 'What devices can I use to access the platform?',
          answer: 'Our platform works on any device with internet access: smartphones, tablets, laptops, and desktop computers. We\'re optimized for mobile devices and work well even on older Android phones. No app download required - everything works through your web browser.'
        },
        {
          question: 'What internet speed do I need for video sessions?',
          answer: 'You need at least 1 Mbps for video calls, but we recommend 2-3 Mbps for the best experience. Our platform automatically adjusts video quality based on your connection. If video isn\'t working well, sessions can continue with audio only.'
        },
        {
          question: 'Is my information secure and private?',
          answer: 'Absolutely. We use bank-level encryption (AES-256), end-to-end encrypted video calls, and comply with international privacy standards including HIPAA. Your data is stored in secure servers within Kenya, and we never share your information without your explicit consent.'
        },
        {
          question: 'What if I have technical problems during a session?',
          answer: 'We have 24/7 technical support available via chat or phone. Most issues can be resolved quickly by refreshing your browser or switching to audio-only mode. If technical problems persist, we\'ll reschedule your session at no charge.'
        },
        {
          question: 'Can I access my session recordings and notes?',
          answer: 'Yes, with your consent, sessions can be recorded for your review. You have full access to your session notes, progress tracking, and any resources shared by your therapist through your secure dashboard.'
        }
      ]
    },
    {
      id: 'kenya-specific',
      title: 'Kenya-Specific Considerations',
      icon: <LocationOnIcon />,
      color: '#F57C00',
      faqs: [
        {
          question: 'Do your therapists understand Kenyan culture and context?',
          answer: 'Yes, our founder and many of our therapists are Kenyan and deeply understand local cultural contexts, family dynamics, and the unique challenges of mental health stigma in Kenya. We provide culturally sensitive care that respects traditional values while offering modern therapeutic approaches.'
        },
        {
          question: 'Can I receive therapy in Swahili or other local languages?',
          answer: 'We have therapists who speak English, Swahili, and Kikuyu. During registration, you can specify your language preference, and we\'ll match you with a therapist who can provide services in your preferred language.'
        },
        {
          question: 'How do you address mental health stigma in the Kenyan context?',
          answer: 'We understand that mental health stigma is a significant barrier in Kenya. Our approach emphasizes confidentiality, dignity, and empowerment. We also provide family education resources and community workshops to help reduce stigma and increase understanding of mental health as part of overall wellness.'
        },
        {
          question: 'Do you work with families and communities?',
          answer: 'Yes, we offer family therapy sessions, educational workshops for families and communities, and resources specifically designed to help Kenyan families understand and support loved ones with mental health challenges or addiction recovery needs.'
        },
        {
          question: 'Are your services available throughout Kenya?',
          answer: 'Yes, our online platform is available anywhere in Kenya with internet access. We have therapists familiar with different regions and can provide culturally appropriate care whether you\'re in Nairobi, Mombasa, Kisumu, or rural areas.'
        }
      ]
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <GroupIcon />,
      color: '#7B1FA2',
      faqs: [
        {
          question: 'How do I get started with Smiling Steps?',
          answer: 'Simply click "Get Support" to register, complete a brief intake assessment, and we\'ll match you with an appropriate therapist. You can usually have your first session within 2-3 days of registration.'
        },
        {
          question: 'How are therapists matched to clients?',
          answer: 'We match based on your specific needs, preferences (language, gender, specialization), availability, and therapeutic approach. Our intake assessment helps us understand your goals and match you with the most suitable therapist from our network.'
        },
        {
          question: 'Can I switch therapists if needed?',
          answer: 'Absolutely. Therapeutic fit is crucial for success. You can request a different therapist at any time through your dashboard or by contacting support. We\'ll help you transition smoothly to ensure continuity of care.'
        },
        {
          question: 'What should I expect in my first session?',
          answer: 'Your first session focuses on getting to know you, understanding your goals, and developing a treatment plan together. Your therapist will explain their approach, answer questions, and help you feel comfortable with the online format.'
        },
        {
          question: 'How often should I have therapy sessions?',
          answer: 'This depends on your individual needs and goals. Most clients start with weekly sessions, but frequency can be adjusted based on your progress, availability, and therapeutic goals. Your therapist will work with you to determine the best schedule.'
        }
      ]
    }
  ];

  const handleFAQToggle = (categoryId, faqIndex) => {
    const faqId = `${categoryId}-${faqIndex}`;
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#FAFAFA' }}>
      <Container maxWidth="lg">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              mb: 2,
              fontWeight: 'bold',
              color: '#663399'
            }}
          >
            Frequently Asked Questions
          </Typography>
          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Get answers to common questions about online therapy, our platform, and mental health care in Kenya.
          </Typography>
        </motion.div>

        {/* FAQ Categories */}
        <Grid container spacing={4}>
          {faqCategories.map((category, categoryIndex) => (
            <Grid item xs={12} key={category.id}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                viewport={{ once: true }}
              >
                <Paper
                  elevation={2}
                  sx={{
                    borderRadius: '15px',
                    overflow: 'hidden',
                    border: `2px solid ${category.color}20`
                  }}
                >
                  {/* Category Header */}
                  <Box
                    sx={{
                      p: 3,
                      backgroundColor: `${category.color}10`,
                      borderBottom: `1px solid ${category.color}30`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ color: category.color }}>
                        {React.cloneElement(category.icon, { sx: { fontSize: '2rem' } })}
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: category.color }}>
                        {category.title}
                      </Typography>
                      <Chip
                        label={`${category.faqs.length} Questions`}
                        size="small"
                        sx={{
                          backgroundColor: category.color,
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Box>

                  {/* FAQ Items */}
                  <Box sx={{ p: 2 }}>
                    {category.faqs.map((faq, faqIndex) => {
                      const faqId = `${category.id}-${faqIndex}`;
                      const isExpanded = expandedFAQ === faqId;

                      return (
                        <Accordion
                          key={faqIndex}
                          expanded={isExpanded}
                          onChange={() => handleFAQToggle(category.id, faqIndex)}
                          sx={{
                            mb: 1,
                            '&:before': { display: 'none' },
                            boxShadow: 'none',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px !important',
                            '&.Mui-expanded': {
                              boxShadow: `0 2px 8px ${category.color}20`,
                              border: `1px solid ${category.color}40`
                            }
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ color: category.color }} />}
                            sx={{
                              backgroundColor: isExpanded ? `${category.color}05` : 'white',
                              borderRadius: '8px',
                              '&.Mui-expanded': {
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0
                              },
                              '& .MuiAccordionSummary-content': {
                                my: 1
                              }
                            }}
                          >
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 'bold', 
                                color: isExpanded ? category.color : 'text.primary',
                                fontSize: '1.1rem'
                              }}
                            >
                              {faq.question}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails 
                            sx={{ 
                              backgroundColor: 'white', 
                              borderRadius: '0 0 8px 8px',
                              pt: 0,
                              pb: 2
                            }}
                          >
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                lineHeight: 1.7, 
                                color: 'text.secondary',
                                fontSize: '1rem'
                              }}
                            >
                              {faq.answer}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Still Have Questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Box
            sx={{
              textAlign: 'center',
              mt: 8,
              p: 6,
              background: 'linear-gradient(135deg, #663399, #9C27B0)',
              borderRadius: '20px',
              color: 'white'
            }}
          >
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
              Still Have Questions?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Our support team is here to help you understand how Smiling Steps can support your mental health journey.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="contained"
                size="large"
                href="mailto:smilingstep254@gmail.com"
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1.1rem',
                  borderRadius: '50px',
                  backgroundColor: 'white',
                  color: '#663399',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Email Us
              </Button>
              <Button
                variant="outlined"
                size="large"
                href="tel:0118832083"
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1.1rem',
                  borderRadius: '50px',
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Call Us
              </Button>
              <Button
                variant="outlined"
                size="large"
                href="https://wa.me/254118832083"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1.1rem',
                  borderRadius: '50px',
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                WhatsApp Us
              </Button>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ComprehensiveFAQ;