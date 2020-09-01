import nodemailer from "nodemailer";

export const sendMail = async (to: string, html: string) => {
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    })

    const info = await transporter.sendMail({
        from: "Eventor <mailserverloeka@gmail.com",
        to: to,
        subject: "Change password",
        html
    });

    console.log("Nodemailer mail sent.")
}