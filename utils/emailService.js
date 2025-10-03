const nodemailer = require('nodemailer');

// Create reusable transporter object using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generic send email function
const sendEmail = async (to, subject, text, html = null) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured in environment variables');
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text,
      html: html || text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};

// Specific function for sending announcement notifications
const sendAnnouncementNotification = async (students, announcementData) => {
  try {
    const { courseTitle, content, lecturerName, timestamp } = announcementData;
    
    // Format timestamp
    const announcementDate = new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `New Announcement: ${courseTitle}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: #333; text-align: center; border-bottom: 3px solid #4CAF50; padding-bottom: 10px;">
            📢 New Course Announcement
          </h1>
        </div>
        
        <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          <h2 style="color: #4CAF50; margin-bottom: 15px;">${courseTitle}</h2>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">${content}</p>
          </div>
          
          <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
            <p style="margin: 5px 0; color: #666;">
              <strong>👨‍🏫 Lecturer:</strong> ${lecturerName}
            </p>
            <p style="margin: 5px 0; color: #666;">
              <strong>📅 Posted:</strong> ${announcementDate}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #e8f5e8; border-radius: 8px;">
          <p style="color: #333; margin: 0;">
            Stay updated with your courses! Check the EduBridge platform for more details.
          </p>
        </div>
      </div>
    `;

    const text = `
New Course Announcement: ${courseTitle}

Content: ${content}

Lecturer: ${lecturerName}
Posted: ${announcementDate}

Best regards,
EduBridge Platform
    `.trim();

    // Send emails to all students
    const emailPromises = students.map(student => 
      sendEmail(student.email, subject, text, html)
    );

    const results = await Promise.allSettled(emailPromises);
    
    // Log results
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    console.log(`📧 Announcement emails sent: ${successful} successful, ${failed} failed`);
    
    if (failed > 0) {
      const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
      console.error('❌ Failed email deliveries:', errors);
    }
    
    return { successful, failed, results };
  } catch (error) {
    console.error('❌ Error sending announcement notification emails:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendAnnouncementNotification
};
