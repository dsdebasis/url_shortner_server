
import {Resend} from 'resend';
import joi from "joi"

const emailSchema = joi.object({
    to: joi.string().email().required().min(6).max(32),
    subject: joi.string().required().max(128).min(3),
    html: joi.string().required().min(2),
})

//PROVIE API KEY IN ENV FILE (RESEND_API_KEY)
const resend = new Resend(process.env.RESEND_API_KEY);
const MAIL_SERVER_ID = process.env.MAIL_SERVER_ID
console.log(MAIL_SERVER_ID)
async function  sendEmail(emailData){
   
    const validate = emailSchema.validate(emailData)
    if (validate.error) {
        console.error("error while sending user register_email",validate.error)
        throw new Error(validate.error.details[0].message)
    } 
    
    try {
        const {data,error} = await resend.emails.send({
            from: process.env.MAIL_SERVER_ID,
            to: [emailData?.to],
            subject: emailData?.subject, 
            html: emailData?.html,
          });
          if (error) throw new Error(error.message);
          return data;
    } catch (error) {
        console.error("Error while sendig email",error)
        throw new Error(error.message) 
        
    }
}

export default sendEmail