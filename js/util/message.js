const nodemailer = require("nodemailer");

const EMAIL_FROM = "485aa0cc-6d50-4208-be22-981271727e55@mailslurp.mx"

const transporter = nodemailer.createTransport({
	host: "mailslurp.mx",
    port: 2587,
    auth: {
        user: "kzMxScUcWEM2AdPFVIKNB71Fdql3wht6",
        pass: "Lu1pfCDQKYyrKkr8603DBc61xWKWRkWF"
    }
});

async function sendAccountCreationEmail(email, url) {
	let mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: "Account Creation",
		html: "Click the following link to complete the account creation process:<br/>" +
		`<a href=${url}>Finish Account Creation</a><br/><br/>` + 
		"Please do not reply to this email."
	};

	await transporter.sendMail(mailOptions);

	return true;
}

async function sendPasswordResetEmail(email, url) {
	let mailOptions = {
		from: EMAIL_FROM,
		to: email,
		subject: "Password Reset",
		html: "Click the following link to complete the password reset process:<br/>" +
		`<a href=${url}>Finish Password Reset</a><br/><br/>` + 
		"Please do not reply to this email."
	};

	await transporter.sendMail(mailOptions);

	return true;
}

module.exports.sendAccountCreationEmail = sendAccountCreationEmail;
module.exports.sendPasswordResetEmail = sendPasswordResetEmail;