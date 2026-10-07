// const brevo = require('@getbrevo/brevo');
// const apiInstance = new brevo.TransactionalEmailsApi();
// apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// async function sendEmail(to, subject, htmlContent) {
//     const email = new brevo.SendSmtpEmail();

//     //compose the email
//     email.sender = {
//         email: "kobitarcanvas3@gmail.com",
//         name: "Kobitar Canvas"
//     };
//     email.to = [{ email: to }];
//     email.subject = subject;
//     email.htmlContent = htmlContent

//     //finally send the email
//     try {
//         const response = await apiInstance.sendTransacEmail(email);

//         console.log('email response:', response)

//         return response
//     } catch (error) {
//         console.log('email error:', error)
//         throw error
//     }
// }

// module.exports = sendEmail