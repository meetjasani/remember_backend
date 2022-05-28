import nodemailer from "nodemailer";
import EmailTemplates from "swig-email-templates";

const templates = new EmailTemplates({
  root: "src/templates",
});


export const sendEmailHelper = (email, subjectName, link) => {

  return new Promise(async (resolve, reject) => {
    templates.render("email.html", { email, link }, async (err, html, text, subject) => {
      try {
        let mailTransporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "raviraj.codexive@gmail.com",
            pass: "Rp@931010",
          },
        });

        let mailDetails = {
          from: "raviraj.codexive@gmail.com",
          to: email,
          subject: subjectName,
          html: html,
          text: text,
        };

        let info = await mailTransporter.sendMail(mailDetails);

        resolve(info);
      } catch (err) {
        reject(err);
      }
    });
  });
};
