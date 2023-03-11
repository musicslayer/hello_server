const log = require("../util/log.js");
const nodemailer = require("nodemailer");
const secret = require("../security/secret.js");

const EMAIL_FROM = secret.getSecret("email_account");

const sendmail = require('sendmail')({
	logger: {
	  debug: console.log,
	  info: console.info,
	  warn: console.warn,
	  error: console.error
	},
	silent: false,
	rejectUnauthorized: false,
	smtpPort: 2525, // Default: 25
	smtpHost: 'localhost' // Default: -1 - extra smtp host after resolveMX
})



const transporter = nodemailer.createTransport({
	service: "gmail",
	host: "smtp.gmail.com",
    auth: {
        user: secret.getSecret("email_account"),
        pass: secret.getSecret("email_password")
    }
});

async function sendAccountCreationEmail(email, url) {
	sendmail({
		user: "mr_mr",
		pass: "xyxy",
		from: 'no-reply@musicslayer.com',
		to: 'musicslayerX@proton.me',
		subject: 'test sendmail',
		html: 'Mail of test sendmail ',
	  }, function(err, reply) {
		console.log(err && err.stack);
		console.dir(reply);
	});

	/*
	if(!(await isEmailValid(email))) {
		return false;
	}

	try {
		let mailOptions = {
			from: EMAIL_FROM,
			to: email,
			subject: "Account Creation",
			html: "Click the following link to complete the account creation process:<br/>" +
			`<a href=${url}>Finish Account Creation</a><br/><br/>` + 
			"Please do not reply to this email."
		};

		await transporter.sendMail(mailOptions);

		log.logEvent("SERVER", "main", "Server Email Success", "Account Creation", email);

		return true;
	}
	catch(err) {
		log.logError("SERVER", "main", "Server Email Failure", err, "Account Creation", email);

		return false;
	}
	*/
}

async function sendPasswordResetEmail(email, url) {
	if(!(await isEmailValid(email))) {
		return false;
	}

	try {
		let mailOptions = {
			from: EMAIL_FROM,
			to: email,
			subject: "Password Reset",
			html: "Click the following link to complete the password reset process:<br/>" +
			`<a href=${url}>Finish Password Reset</a><br/><br/>` + 
			"Please do not reply to this email."
		};

		await transporter.sendMail(mailOptions);

		log.logEvent("SERVER", "main", "Server Email Success", "Password Reset", email);

		return true;
	}
	catch(err) {
		log.logError("SERVER", "main", "Server Email Failure", err, "Password Reset", email);

		return false;
	}
}

async function sendEmailChangeEmail(email, url) {
	if(!(await isEmailValid(email))) {
		return false;
	}

	try {
		let mailOptions = {
			from: EMAIL_FROM,
			to: email,
			subject: "Email Change",
			html: "Click the following link to complete the email change process:<br/>" +
			`<a href=${url}>Finish Email Change</a><br/><br/>` + 
			"Please do not reply to this email.",
		};

		const sent = await transporter.sendMail(mailOptions);

		log.logEvent("SERVER", "main", "Server Email Success", "Change Email", email);

		return true;
	}
	catch(err) {
		log.logError("SERVER", "main", "Server Email Failure", err, "Change Email", email);

		return false;
	}
}

async function sendLogOutEmail(email, url) {
	if(!(await isEmailValid(email))) {
		return false;
	}

	try {
		let mailOptions = {
			from: EMAIL_FROM,
			to: email,
			subject: "Log Out",
			html: "Click the following link to log out of your account:<br/>" +
			`<a href=${url}>Finish Log Out</a><br/><br/>` + 
			"Please do not reply to this email."
		};

		await transporter.sendMail(mailOptions);

		log.logEvent("SERVER", "main", "Server Email Success", "Log Out", email);

		return true;
	}
	catch(err) {
		log.logError("SERVER", "main", "Server Email Failure", err, "Log Out", email);

		return false;
	}
}

async function sendResetAccountEmail(email, url) {
	if(!(await isEmailValid(email))) {
		return false;
	}

	try {
		let mailOptions = {
			from: EMAIL_FROM,
			to: email,
			subject: "Reset Account",
			html: "Click the following link to reset your account and erase all progress:<br/><br/>" +
			`<a href=${url}>Finish Resetting Account</a><br/>` + 
			"<p style='color: #B00000'>This cannot be reversed!</p><br/><br/>" +
			"Please do not reply to this email."
		};

		await transporter.sendMail(mailOptions);

		log.logEvent("SERVER", "main", "Server Email Success", "Reset Account", email);

		return true;
	}
	catch(err) {
		log.logError("SERVER", "main", "Server Email Failure", err, "Reset Account", email);

		return false;
	}
}

async function sendDeleteAccountEmail(email, url) {
	if(!(await isEmailValid(email))) {
		return false;
	}
	
	try {
		let mailOptions = {
			from: EMAIL_FROM,
			to: email,
			subject: "Delete Account",
			html: "Click the following link to delete your account:<br/><br/>" +
			`<a href=${url}>Finish Deleting Account</a><br/>` + 
			"<p style='color: #B00000'>This cannot be reversed!</p><br/><br/>" +
			"Please do not reply to this email."
		};

		await transporter.sendMail(mailOptions);

		log.logEvent("SERVER", "main", "Server Email Success", "Delete Account", email);

		return true;
	}
	catch(err) {
		log.logError("SERVER", "main", "Server Email Failure", err, "Delete Account", email);

		return false;
	}
}

async function isEmailValid(email) {
	return isEmailCorrectFormat(email) && await isEmailDNSActive(email);
}

function isEmailCorrectFormat(email) {
	var emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

    if (!email)
        return false;

    if(email.length>254)
        return false;

    var valid = emailRegex.test(email);
    if(!valid)
        return false;

    // Further checking of some things regex can't handle
    var parts = email.split("@");
    if(parts[0].length>64)
        return false;

    var domainParts = parts[1].split(".");
    if(domainParts.some(function(part) { return part.length>63; }))
        return false;

    return true;
}

async function isEmailDNSActive(email) {
	const parts = email.split("@");
	const domain = parts[1];

	const dnsPromises = require('dns').promises;
	try {
		const demo1 = await dnsPromises.resolveMx(domain);
		return demo1.length > 0;
	}
	catch(err) {
		return false;
	}
}

module.exports.sendAccountCreationEmail = sendAccountCreationEmail;
module.exports.sendPasswordResetEmail = sendPasswordResetEmail;
module.exports.sendEmailChangeEmail = sendEmailChangeEmail;
module.exports.sendLogOutEmail = sendLogOutEmail;
module.exports.sendResetAccountEmail = sendResetAccountEmail;
module.exports.sendDeleteAccountEmail = sendDeleteAccountEmail;