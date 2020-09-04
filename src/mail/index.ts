import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import handlebars from "handlebars";

const TEMPLATES_PATH = path.join(process.cwd(), "mail-templates");
const PARTIALS_PATH = path.join(TEMPLATES_PATH, "partials");

const sendMail = async (to: string, html: string, subject: string) => {
	const transporter = nodemailer.createTransport({
		service: "Gmail",
		auth: {
			user: process.env.EMAIL,
			pass: process.env.EMAIL_PASSWORD,
		},
	});

	await transporter.sendMail({
		from: "Eventor <mailserverloeka@gmail.com",
		to: to,
		subject,
		html,
	});

	console.log(`Mail sent to ${to}`);
};

const readHTMLFile = async (path: string) => {
	return new Promise((resolve: (value: string | null) => void) => {
		fs.readFile(path, { encoding: "utf-8" }, (err, html) => {
			if (err) {
				resolve(null);
				throw err;
			} else {
				resolve(html);
			}
		});
	});
};

interface MailOptions {
	to: string;
	subject: string;
}

export const sendMailWithTemplate = async (
	{ to, subject }: MailOptions,
	template: string,
	replacements: object
) => {
	const html = await readHTMLFile(
		path.join(TEMPLATES_PATH, template + ".hbs")
	);
	if (!html) return;

	const templateHtml = handlebars.compile(html);
	const emailToSend = templateHtml(replacements);

	await sendMail(to, emailToSend, subject);
};

export const initializeHandlebars = async () => {
	const header = await readHTMLFile(path.join(PARTIALS_PATH, "header.hbs"));
	const footer = await readHTMLFile(path.join(PARTIALS_PATH, "footer.hbs"));

	// Header
	const templateHeader = handlebars.compile(header);
	handlebars.registerPartial("header", templateHeader);

	// Footer
	const templateFooter = handlebars.compile(footer);
	handlebars.registerPartial("footer", templateFooter);
};
