const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { sendEmailEndFreeTrial, sendEmailStartFreeTrial, sendEmailFailPayment, sendEmailPayment, sendEmailResetPassword, sendEmailRemindPassword } = require('../services/mailService');
const mailService = require('../services/mailService');

const { getPriceById } = require('../services/stripeService');
const stripeService = require('../services/stripeService')

const { getUserByEmail } = require('../services/userService');
const { asyncWrapper } = require('../utils/apiUtils');

const mailRouter = express.Router(); 

// Send an email from contact@prai.co about an error in payment by card.
mailRouter.post('/failpayment', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const { firstName, email } = req.session.user;
    const { url_payment_settings } = req.body;
    if (!firstName) {
        return res.status(500).json({
            error: "First name in user not filled"
        })
    }
    const response = await sendEmailFailPayment(email, firstName, url_payment_settings);

    res.status(response.status).json({ "message": response.message });
}));

// Send a payment request email from contact@prai.co.
mailRouter.post('/payment', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const { id, firstName, email } = req.session.user;
    const { url_payment } = req.body;
    if (!firstName) {
        return res.status(500).json({
            error: "First name in user not filled"
        })
    }
    const subscription = await stripeService.getByUserIdSubscription(id)
    const price = await getPriceById(subscription.plan.id)
    const response = await sendEmailPayment(email, firstName, url_payment, price);

    res.status(response.status).json({ "message": response.message });
}));

// // Send an email from contact@prai.co with a payment receipt.
// mailRouter.post('/receipt', userSessionMiddleware, asyncWrapper(async (req, res) => {
//     const { email_recipient, first_name, url_download_receipt, price, plan, frequency, transaction_id, date, card, billing_url } = req.body;
//     const response = await sendEmailReceipt(email_recipient, first_name, url_download_receipt, price, plan, frequency, transaction_id, date, card, billing_url);

//     res.json(response);
// }));

//  Send a password recovery email from contact@prai.co.
mailRouter.post('/remindpassword', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const { email_recipient } = req.body;
    const { id, firstName } = await getUserByEmail(email_recipient)
    const response = await sendEmailRemindPassword(email_recipient, firstName, id);

    res.json(response);
}));

// Send an email from contact@prai.co about account activation.
mailRouter.post('/register', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const { email_recipient, first_name } = req.body;
    const response = await sendEmailRegister(email_recipient, first_name);

    res.json(response);
}));

//  Send a message from the sender's email containing information 
//  (pitch, contact, text, etc.) for the recipient.
mailRouter.post('/sharing', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const { email_recipient, first_name_sender, email_sender, company_sender, url_sharing } = req.body;
    const response = await mailService.sendEmailSharing(email_recipient, first_name_sender, email_sender, company_sender, url_sharing);

    res.json(response);
}));

module.exports = {
    mailRouter
};