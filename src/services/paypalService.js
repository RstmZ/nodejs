const paypal = require('paypal-rest-sdk');
const { PaymentInfo } = require('../models/paymentInfoModel');
const { PaymentResult } = require('../models/paymentResultModel');
const Stripe = require('stripe');
const { Op } = require('sequelize');
const { sequelize } = require('../databaseConnection');
const { createPaymentLimit } = require('./paymentService');
const { getProfile } = require('./profileService');
const { Profile } = require('../models/profileModel');
const stripeService = require('./stripeService');
const { getUser } = require('./userService');
const { sendEmailRegister } = require('./mailService');
const { UsePromoCode } = require('../models/usePromoCodeModel');

const { PAYPAL_CLIENT, PAYPAL_SECRET, PAYPAL_URL, STRIPE_SECRET } = process.env;

paypal.configure({
    mode: 'sandbox', //sandbox or live
    client_id: PAYPAL_CLIENT,
    client_secret: PAYPAL_SECRET
});

const stripe = Stripe(STRIPE_SECRET);

const getPrice = async (priceId) => {
    const price = await stripe.prices.retrieve(priceId,
        {
            expand: ['product']
        })
    return price
}

/**
 * Create payment in PayPal
 * @param {number} ownerId 
 * @returns 
 */
const createPayment = async (ownerId, promoCode, profileId) => {
    if (!PAYPAL_CLIENT || !PAYPAL_SECRET || !PAYPAL_URL) {
        return {
            code: 1001
        }
    }
    const method = await PaymentInfo.findOne({
        where: { ownerId },
        order: [['createdAt', 'DESC']]
    })
    if (!method) {
        return {
            message: 'Not found method payment'
        }
    }

    let price = await getPrice(method.priceId)
    if (!price) {
        return {
            message: `Not found price id: ${method.priceId}`
        }
    }
    // const type = price.product.name;

    let priceProduct = (price.unit_amount / 100).toFixed(2);
    let discount = ''

    const interval = price.recurring.interval
    // const profile = await getProfile(ownerId, profileId)

    if (promoCode) {

        const resp = await stripeService.isValidPromoCode(ownerId, promoCode, interval)

        if (resp?.code) return resp

        priceProduct = resp?.price;

        discount = promoCode
    }

    const lastPayment = await getLastPayment(ownerId)

    const currentDate = new Date();
    const createDate = new Date()
    if (lastPayment?.createdAt) {
        createDate.setDate(lastPayment?.createdAt)
    }

    const days = parseInt((currentDate - createDate) / (1000 * 60 * 60 * 24)) || 0;

    const dateNow = new Date()

    if (interval == 'year') {
        dateNow.setDate(dateNow.getDate() + 364);
    } else if (interval == 'month') {
        dateNow.setDate(dateNow.getDate() + 30);
    }

    dateNow.setDate(dateNow.getDate() + days)

    return new Promise(async function (resolve, reject) {

        const data = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": `${PAYPAL_URL}/success`,
                "cancel_url": `${PAYPAL_URL}/cancel`
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "Payment subscriptions",
                        "price": priceProduct,
                        "currency": price.currency.toUpperCase(),
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": price.currency.toUpperCase(),
                    "total": priceProduct
                },
                "description": "Payment subscriptions"
            }]
        }
        paypal.payment.create(data, async function (error, payment) {
            if (error) {
                return reject(error);
            }
            const result = payment.links.find(el => el.rel === "approval_url")

            await PaymentResult.create({
                ownerId,
                paymentMethodId: method.id,
                intent: payment.intent,
                state: payment.state,
                success: false,
                paymentId: payment.id,
                total: priceProduct,
                current_period_end: dateNow,
                discount,
                profileId
            })
            resolve(result);
        })
    })
}
/**
 * Execute payment
 * @param {number} paymentId 
 * @param {number} payerId 
 * @returns 
 */
const executePayment = (paymentId, payerId) => {
    return new Promise(function (resolve, reject) {
        paypal.payment.execute(paymentId, payerId, async function (error, payment) {
            if (error) {
                reject(error);
            }

            const result = await PaymentResult.findOne({ where: { paymentId: paymentId } })

            await result.update({ state: payment.state, success: payment.state == 'approved' })

            if (result.discount && payment.state == 'approved') {
                await stripeService.checkUsePromoCode(ownerId, result.discount);
            }
            const user = await getUser(result.ownerId);

            if (result.profileId) {
                user.update({ profileId: result.profileId })
            }

            if (user.success == false) {

                const resp = await sendEmailRegister(user.email, user.firstName)
                if (resp.status == 200) {
                    await user.update({ success: true })
                }
            }

            await createPaymentLimit(result.ownerId, result.id, result.current_period_end)

            resolve({
                success: true
            });
        });
    })
}

const getLastPayment = async (ownerId) => {
    const lastPayment = await PaymentResult.findOne({
        where: {
            ownerId,
            success: true,
        },
        order: [['createdAt', 'DESC']]
    })
    return lastPayment
}

const getMoneyBeenPaidSinceRegister = async (ownerId, createdAt) => {
    const { count, rows } = await PaymentResult.findAndCountAll({
        attributes: [
            [sequelize.fn("SUM", sequelize.cast(sequelize.col("total"), 'float')), "total"]
        ],
        where: {
            ownerId,
            createdAt: {
                [Op.gte]: createdAt
            },
            success: true
        }
    })
    return count > 0 ? rows[0].total : 0
}

module.exports = {
    createPayment,
    executePayment,
    getLastPayment,
    getMoneyBeenPaidSinceRegister
}