require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('./models/Blog');
const User = require('./models/User');

const recoveryGuideBlogs = [
  {
    title: 'Complete Guide to Understanding Addiction and Starting Recovery',
    excerpt: 'A comprehensive guide to understanding addiction, recognizing the signs, and taking the first steps toward lasting recovery. Learn about the science of addiction, treatment options, and building a support system.',
    content: `
<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1200&h=600&fit=crop" alt="Person on recovery journey" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<h2>Understanding Addiction: The Foundation of Recovery</h2>

<p>Addiction is a complex brain disorder characterized by compulsive substance use or behavior despite harmful consequences. It's not a moral failing or a lack of willpower—it's a medical condition that changes the brain's structure and function.</p>

<div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #663399; margin: 20px 0;">
  <h3 style="margin-top: 0;">Key Facts About Addiction</h3>
  <ul>
    <li><strong>Brain Disease:</strong> Addiction affects the brain's reward, motivation, and memory circuits</li>
    <li><strong>Treatable:</strong> With proper treatment and support, recovery is possible</li>
    <li><strong>Chronic Condition:</strong> Like diabetes or heart disease, it requires ongoing management</li>
    <li><strong>Not a Choice:</strong> While the first use may be voluntary, addiction changes the brain</li>
  </ul>
</div>

<h2>Recognizing the Signs of Addiction</h2>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=400&fit=crop" alt="Warning signs" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<p>Early recognition is crucial for successful intervention. Here are the warning signs:</p>

<h3>Physical Signs</h3>
<ul>
  <li>Changes in appetite or sleep patterns</li>
  <li>Sudden weight loss or gain</li>
  <li>Deterioration of physical appearance</li>
  <li>Unusual smells on breath, body, or clothing</li>
  <li>Tremors, slurred speech, or impaired coordination</li>
</ul>

<h3>Behavioral Signs</h3>
<ul>
  <li>Increased secrecy or lying</li>
  <li>Neglecting responsibilities at work, school, or home</li>
  <li>Loss of interest in activities once enjoyed</li>
  <li>Financial problems or unexplained need for money</li>
  <li>Changes in social circles or relationships</li>
</ul>

<h3>Psychological Signs</h3>
<ul>
  <li>Mood swings or personality changes</li>
  <li>Increased anxiety, depression, or irritability</li>
  <li>Lack of motivation or energy</li>
  <li>Paranoia or fearfulness</li>
  <li>Inability to stop despite wanting to</li>
</ul>

<h2>The Recovery Journey: A Step-by-Step Guide</h2>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&h=600&fit=crop" alt="Path to recovery" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<h3>Step 1: Acknowledgment and Acceptance</h3>
<p>The first and often most difficult step is acknowledging that there's a problem. This requires honest self-reflection and the courage to face reality. Remember: seeking help is a sign of strength, not weakness.</p>

<div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p><strong>💡 Reflection Exercise:</strong> Write down how substance use has affected your life, relationships, health, and goals. Be honest with yourself.</p>
</div>

<h3>Step 2: Seek Professional Help</h3>
<p>Recovery is challenging, and professional support significantly increases success rates. Options include:</p>

<ul>
  <li><strong>Detoxification Programs:</strong> Medically supervised withdrawal management</li>
  <li><strong>Inpatient Treatment:</strong> 24/7 care in a residential facility (30-90 days)</li>
  <li><strong>Outpatient Programs:</strong> Treatment while living at home</li>
  <li><strong>Therapy:</strong> Individual, group, or family counseling</li>
  <li><strong>Medication-Assisted Treatment (MAT):</strong> Medications to reduce cravings and withdrawal symptoms</li>
</ul>

<h3>Step 3: Build Your Support Network</h3>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=400&fit=crop" alt="Support group" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<p>Recovery is not a solo journey. Surround yourself with people who support your sobriety:</p>

<ul>
  <li><strong>Support Groups:</strong> AA, NA, SMART Recovery, Celebrate Recovery</li>
  <li><strong>Sober Friends:</strong> Build relationships with people in recovery</li>
  <li><strong>Family Support:</strong> Involve loved ones in your recovery process</li>
  <li><strong>Sponsor/Mentor:</strong> Someone who has been through recovery</li>
  <li><strong>Professional Team:</strong> Therapist, doctor, case manager</li>
</ul>

<h3>Step 4: Develop Healthy Coping Strategies</h3>
<p>Replace destructive habits with positive ones:</p>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">
  <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
    <h4>🧘 Mindfulness & Meditation</h4>
    <p>Practice staying present and managing stress through meditation, deep breathing, and yoga.</p>
  </div>
  <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
    <h4>🏃 Physical Exercise</h4>
    <p>Regular exercise releases endorphins, reduces stress, and improves overall health.</p>
  </div>
  <div style="background: #f3e5f5; padding: 15px; border-radius: 8px;">
    <h4>🎨 Creative Expression</h4>
    <p>Art, music, writing, or other creative outlets provide healthy emotional release.</p>
  </div>
  <div style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
    <h4>📚 Education & Growth</h4>
    <p>Learn new skills, pursue hobbies, or continue your education to build self-esteem.</p>
  </div>
</div>

<h3>Step 5: Create a Relapse Prevention Plan</h3>

<p>Relapse is common but preventable. A solid plan includes:</p>

<ol>
  <li><strong>Identify Triggers:</strong> People, places, emotions, or situations that increase cravings</li>
  <li><strong>Develop Coping Strategies:</strong> Specific actions to take when triggered</li>
  <li><strong>Emergency Contacts:</strong> List of people to call when struggling</li>
  <li><strong>Warning Signs:</strong> Recognize early signs of potential relapse</li>
  <li><strong>Action Steps:</strong> Clear plan of what to do if you slip</li>
</ol>

<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h4>⚠️ Remember: Relapse Doesn't Mean Failure</h4>
  <p>If you relapse, it doesn't erase your progress. It's an opportunity to learn, adjust your plan, and recommit to recovery. Reach out for help immediately.</p>
</div>

<h2>Treatment Options in Kenya</h2>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=400&fit=crop" alt="Healthcare in Kenya" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<h3>Rehabilitation Centers</h3>
<ul>
  <li>Chiromo Lane Medical Centre - Nairobi</li>
  <li>Oasis Africa - Mombasa</li>
  <li>Serenity Springs - Nairobi</li>
  <li>Asumbi Rehabilitation Centre - Kisumu</li>
</ul>

<h3>Support Groups</h3>
<ul>
  <li><strong>Alcoholics Anonymous (AA):</strong> Meetings across major cities</li>
  <li><strong>Narcotics Anonymous (NA):</strong> Support for drug addiction</li>
  <li><strong>Al-Anon:</strong> For families and friends of addicts</li>
</ul>

<h3>Crisis Helplines</h3>
<ul>
  <li><strong>Kenya Red Cross:</strong> 1199</li>
  <li><strong>Befrienders Kenya:</strong> 0722 178 177</li>
  <li><strong>NACADA Toll-Free:</strong> 1192</li>
</ul>

<h2>Life in Recovery: What to Expect</h2>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop" alt="New life in recovery" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<p>Recovery is a lifelong journey with challenges and rewards:</p>

<h3>Early Recovery (0-90 days)</h3>
<ul>
  <li>Physical and emotional withdrawal symptoms</li>
  <li>Intense cravings and mood swings</li>
  <li>Learning new coping skills</li>
  <li>Building new routines</li>
</ul>

<h3>Ongoing Recovery (3 months - 1 year)</h3>
<ul>
  <li>Rebuilding relationships and trust</li>
  <li>Developing new interests and hobbies</li>
  <li>Addressing underlying mental health issues</li>
  <li>Finding purpose and meaning</li>
</ul>

<h3>Long-Term Recovery (1+ years)</h3>
<ul>
  <li>Sustained sobriety and personal growth</li>
  <li>Helping others in their recovery journey</li>
  <li>Achieving personal and professional goals</li>
  <li>Living a fulfilling, authentic life</li>
</ul>

<div style="background: #663399; color: white; padding: 30px; border-radius: 10px; margin: 30px 0; text-align: center;">
  <h2 style="color: white; margin-top: 0;">You Are Not Alone</h2>
  <p style="font-size: 18px;">Millions of people worldwide are in recovery and living fulfilling lives. Your journey starts with a single step. Reach out for help today.</p>
  <p style="font-size: 16px; margin-bottom: 0;"><strong>Crisis Helpline: 1199 (Kenya Red Cross) | 0722 178 177 (Befrienders Kenya)</strong></p>
</div>

<h2>Additional Resources</h2>
<ul>
  <li><a href="/resources">Download Recovery Worksheets</a></li>
  <li><a href="/therapists">Find a Therapist</a></li>
  <li><a href="/blog">Read More Recovery Stories</a></li>
  <li><a href="/bookings">Book a Session</a></li>
</ul>
`,
    category: 'Recovery Guide',
    tags: ['recovery', 'addiction', 'treatment', 'support', 'guide', 'comprehensive'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800',
    readTime: 15
  },
  {
    title: 'Family Support Guide: Helping a Loved One Through Addiction Recovery',
    excerpt: 'A comprehensive guide for families supporting someone through addiction recovery. Learn how to help effectively, set healthy boundaries, and take care of yourself while supporting your loved one.',
    content: `
<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&h=600&fit=crop" alt="Family support" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<h2>Understanding Your Role as a Family Member</h2>

<p>When someone you love struggles with addiction, it affects the entire family. You may feel helpless, angry, scared, or guilty. These feelings are normal. This guide will help you understand how to support your loved one while also taking care of yourself.</p>

<div style="background: #e3f2fd; padding: 20px; border-left: 4px solid #2196f3; margin: 20px 0;">
  <h3 style="margin-top: 0;">Important Truths for Families</h3>
  <ul>
    <li>You didn't cause the addiction</li>
    <li>You can't control it</li>
    <li>You can't cure it</li>
    <li>But you CAN support recovery in healthy ways</li>
  </ul>
</div>

<h2>How to Help Effectively</h2>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=400&fit=crop" alt="Helping hand" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<h3>1. Educate Yourself About Addiction</h3>
<p>Understanding addiction as a brain disease, not a moral failing, helps you respond with compassion rather than judgment.</p>

<h3>2. Communicate with Love and Honesty</h3>
<ul>
  <li>Express concern without blame</li>
  <li>Use "I" statements: "I'm worried about you" instead of "You're ruining everything"</li>
  <li>Choose the right time (when they're sober and calm)</li>
  <li>Listen without interrupting or lecturing</li>
</ul>

<h3>3. Encourage Professional Help</h3>
<p>Offer to help find treatment options, make appointments, or accompany them to their first session.</p>

<h3>4. Set Healthy Boundaries</h3>

<div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h4>What Are Boundaries?</h4>
  <p>Boundaries are limits you set to protect your own well-being. They're not punishments—they're acts of self-care.</p>
  
  <h4>Examples of Healthy Boundaries:</h4>
  <ul>
    <li>"I won't give you money that might be used for substances"</li>
    <li>"I won't lie or cover for you"</li>
    <li>"I won't allow substance use in my home"</li>
    <li>"I will support your recovery, but I won't enable your addiction"</li>
  </ul>
</div>

<h2>What NOT to Do</h2>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?w=1200&h=400&fit=crop" alt="Stop sign" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<h3>Avoid Enabling Behaviors</h3>
<ul>
  <li>❌ Making excuses for their behavior</li>
  <li>❌ Giving money without accountability</li>
  <li>❌ Bailing them out of consequences</li>
  <li>❌ Ignoring the problem hoping it will go away</li>
  <li>❌ Taking over their responsibilities</li>
</ul>

<h3>Don't Try to Control Their Recovery</h3>
<p>You can't force someone to get sober. They must want it for themselves. Your role is to support, not control.</p>

<h2>Taking Care of Yourself</h2>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop" alt="Self-care" style="width: 100%; max-width: 800px; border-radius: 10px;" />
</div>

<p>You can't pour from an empty cup. Taking care of yourself isn't selfish—it's necessary.</p>

<h3>Self-Care Strategies</h3>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">
  <div style="background: #f3e5f5; padding: 15px; border-radius: 8px;">
    <h4>🧘 Practice Self-Compassion</h4>
    <p>Be kind to yourself. You're doing your best in a difficult situation.</p>
  </div>
  <div style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
    <h4>👥 Join a Support Group</h4>
    <p>Al-Anon, Nar-Anon, or family therapy can provide invaluable support.</p>
  </div>
  <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
    <h4>🎯 Maintain Your Routine</h4>
    <p>Continue your hobbies, work, and social activities.</p>
  </div>
  <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
    <h4>💆 Seek Professional Help</h4>
    <p>Consider therapy for yourself to process your emotions.</p>
  </div>
</div>

<h2>Supporting Different Stages of Recovery</h2>

<h3>Pre-Treatment: Denial Stage</h3>
<ul>
  <li>Express concern without judgment</li>
  <li>Provide information about treatment options</li>
  <li>Set and maintain boundaries</li>
  <li>Don't enable or make excuses</li>
</ul>

<h3>During Treatment</h3>
<ul>
  <li>Participate in family therapy if offered</li>
  <li>Learn about addiction and recovery</li>
  <li>Prepare your home for their return</li>
  <li>Address your own healing needs</li>
</ul>

<h3>Early Recovery</h3>
<ul>
  <li>Be patient with mood swings and changes</li>
  <li>Celebrate small victories</li>
  <li>Remove triggers from the home</li>
  <li>Support their new routines and boundaries</li>
</ul>

<h3>Long-Term Recovery</h3>
<ul>
  <li>Continue supporting their recovery activities</li>
  <li>Rebuild trust gradually</li>
  <li>Work on healing family relationships</li>
  <li>Maintain your own support system</li>
</ul>

<div style="background: #663399; color: white; padding: 30px; border-radius: 10px; margin: 30px 0;">
  <h2 style="color: white; margin-top: 0;">Remember</h2>
  <p style="font-size: 18px;">Recovery is possible. With the right support, treatment, and commitment, your loved one can build a fulfilling life in sobriety. And you can heal too.</p>
</div>

<h2>Resources for Families</h2>
<ul>
  <li><strong>Al-Anon Kenya:</strong> Support groups for families of alcoholics</li>
  <li><strong>Nar-Anon:</strong> Support for families of drug addicts</li>
  <li><strong>Family Therapy:</strong> Available at most treatment centers</li>
  <li><strong>Crisis Helpline:</strong> 1199 (Kenya Red Cross)</li>
</ul>
`,
    category: 'Recovery Guide',
    tags: ['family', 'support', 'boundaries', 'caregiving', 'guide'],
    published: true,
    featuredImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
    readTime: 12
  }
];

async function createRecoveryGuides() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ No admin user found!');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found admin: ${admin.name}\n`);
    console.log('📝 Creating recovery guide blogs...\n');

    for (const guideData of recoveryGuideBlogs) {
      const guide = await Blog.create({
        ...guideData,
        author: admin._id
      });

      console.log(`✅ Created: "${guide.title}"`);
      console.log(`   Slug: ${guide.slug}`);
      console.log(`   Category: ${guide.category}`);
      console.log(`   Published: ${guide.published ? 'Yes' : 'No'}`);
      console.log('');
    }

    console.log('🎉 Recovery guide blogs created successfully!\n');
    console.log(`📊 Total guides: ${recoveryGuideBlogs.length}\n`);
    console.log('💡 You can now view them at:');
    console.log('   - http://localhost:3000/blog?category=Recovery%20Guide');
    console.log('   - http://localhost:3000/blog\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createRecoveryGuides();
