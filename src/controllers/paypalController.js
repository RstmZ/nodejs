const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { createPayment, executePayment } = require('../services/paypalService'); 
const { asyncWrapper } = require('../utils/apiUtils');
const { InvalidRequestError } = require('../utils/errors');

const paypalRouter = express.Router();

// Create payment in PayPal
paypalRouter.get('/pay', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const { id: ownerId } = req.session.user; 
    try {
        const promoCode = req.query.promoCode
        const profileId = req.query.profileId; 
        const result = await createPayment(ownerId, promoCode, profileId);
        if (result.code) throw new InvalidRequestError(result.code, ownerId)
        res.json(result);
    } catch (error) {
        throw new InvalidRequestError(error.message, ownerId)
    }
}));

// Execute payment
paypalRouter.get('/success', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    const paymentId = req.query.paymentId;
    const payerId = { 'payer_id': req.query.PayerID };
    try {
        const result = await executePayment(paymentId, payerId);
        if (result.success) {
            return res.redirect('https://app.prai.co/dashboard')
        }
        res.json(result);
    } catch (error) {
        throw new InvalidRequestError(error, ownerId)
    }
}));

// Cancel payment in PayPal
paypalRouter.get("/cancel", asyncWrapper(async (req, res) => {
    // get TOKEN 
    // TODO  
    res.json({
        msg: "Cancelled"
    })
}));

module.exports = {
    paypalRouter,
};