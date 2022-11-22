const Stripe = require('stripe');
const { BalanceHistory } = require('../models/historyBalanceModel');
const { PaymentInfo } = require('../models/paymentInfoModel');
const { PaymentResult } = require('../models/paymentResultModel');
const { Profile } = require('../models/profileModel');
const { PromoCode } = require('../models/promoCodeModel');
const { UsePromoCode } = require('../models/usePromoCodeModel');
const { User } = require('../models/userModel');
const { AppError, NotFoundError, InvalidRequestError } = require('../utils/errors');
const { createErrorMessage } = require('./errorMessageService');
const { sendEmailReceipt, sendEmailRegister } = require('./mailService');
const { createPaymentLimit } = require('./paymentService');
const { getLastPayment } = require('./paypalService');
const { updateLimitProfile, getProfile } = require('./profileService');
const { getUser } = require('./userService');

const stripe = Stripe(process.env.STRIPE_SECRET);

const TRIAL_PERIOD_DAYS = 7;

const parceDate = (date) => {
  if (!date) return '';
  const newDate = new Date(date * 1000);
  return [newDate.getMonth() + 1, newDate.getDate(), newDate.getFullYear()].join('/');
};

/**
 * Get price by Stripe Api
 * @returns 
 */
const getPrice = async () => {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    limit: 50, 
  });

  const preparedObject = prices.data.filter((item) => 
        item.product.active === true && 
        !item.product.name.includes('discount')
        // !item.product.name.includes('for life')
      ).map((price) => {

    return {
      id: price.id,
      title: price.product.name,
      price: (price.unit_amount / 100).toFixed(2),
      currency: price.currency,
      trialPeriod: price.recurring?.trial_period_days,
      interval: price.recurring?.interval,
      metadata: price.product.metadata,
    }
  });

  return preparedObject;
};

const getPriceById = async (priceId) => {
  const price = await stripe.prices.retrieve(priceId,
    {
      expand: ['product']
    })
  return price
}

const isValidPromoCode = async (ownerId, promoCode, period) => {
  const { type } = await getProfile(ownerId)

  const findPromoCode = await PromoCode.findOne({
    where: {
      promoCode
    }
  })
  if(!findPromoCode) return  { code: 'Invalid promo code' }
 
  const usePromo = await UsePromoCode.findOne({
    where: {
      ownerId,
      promoCodeId: findPromoCode.id
    }
  })

  if(usePromo?.success) return {  code: 'You have already used a promo code' }

  if (type == 'Start') {
    
    if (!findPromoCode?.type.includes('Start')) return { code: 'Invalid promo code' }

    // if (findPromoCode.type == 'Start for life' && period == 'year') {
    //   return { code: 'Invalid period: Start for life with period month'}
    // }
    
    const { data } = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 50, 
      recurring: {
        interval: period
      }
    }); 
    
    if(!usePromo) {
      await UsePromoCode.create({
        ownerId,
        promoCodeId: findPromoCode.id,
        success: false
      })
    }

    if (findPromoCode.type == 'Start for life') {
      const price = data.filter((item) => item.product.name == `${findPromoCode.type}`)[0]

      return {
        id: price?.id,
        price: (price?.unit_amount / 100).toFixed(2),
        product: price.product
      }
    }

    if (findPromoCode.type == 'Start 1$') { 
      const price =  data.filter((item) => item.product.name == `${findPromoCode.type} discount`)[0]

      return {
        id: price?.id,
        price: (price?.unit_amount / 100).toFixed(2),
        product: price.product
      }
    }

    const price =  data.filter((item) => item.product.name == `${findPromoCode.type} discount`)[0]

    return {
      id: price?.id,
      price: (price?.unit_amount / 100).toFixed(2),
      product: price.product
    }

  } else if (type == 'Premium') {
 
    if (!findPromoCode || !findPromoCode?.type.includes('Premium')) return { code: 'Invalid promo code' }

    // if (findPromoCode.type == 'Premium for life' && period == 'year') {
    //   return { code: 'Invalid period: Premium for life with period month'}
    // }
    
    const { data } = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 50, 
      recurring: {
        interval: period
      }
    }); 

    if(!usePromo) {
      await UsePromoCode.create({
        ownerId,
        promoCodeId: findPromoCode.id,
        success: false
      })
    }

    if (findPromoCode.type == 'Premium for life') {
      const price = data.filter((item) => item.product.name == `${findPromoCode.type}`)[0]

      return {
        id: price?.id,
        price: (price?.unit_amount / 100).toFixed(2),
        product: price.product
      }
    }

    const price =  data.filter((item) => item.product.name == `${findPromoCode.type} discount`)[0]

    return {
      id: price?.id,
      price: (price?.unit_amount / 100).toFixed(2),
      product: price.product
    }
  }
  return {
    code: "Invalid type"
  }
}

const checkUsePromoCode = async(ownerId, promoCode) => {
  const findPromoCode = await PromoCode.findOne({
    where: {
      promoCode
    }
  })
  if(!findPromoCode) return false

  const usePromo = await UsePromoCode.findOne({
    where: {
      ownerId,
      promoCodeId: findPromoCode.id
    }
  })

  if(!usePromo) return false

  usePromo.update({ success: true })
  return true
}

/**
 * Get url invoice by subscription
 * @param {number} ownerId 
 * @param {number} subscriptionId  
 * @returns 
 */
const getUrlInvoice = async (ownerId, subscriptionId) => {
  try {
    const { latest_invoice } = await getByIdSubscription(subscriptionId)
    const { hosted_invoice_url } = await stripe.invoices.retrieve(latest_invoice);

    return {
      hosted_invoice_url,
    };
  } catch (error) {
    throw new NotFoundError(error.message, ownerId);
  }
};
/**
 * Creating a customer
 * @param {number} userId 
 * @param {string} email 
 * @returns {number} customer.id
 */
const createCustomer = async (userId, email) => {
  try {
    const customer = await stripe.customers.create({
      email,
    });
    await User.update({ customerId: customer.id }, { where: { id: userId } });
    return { customerId: customer.id };
  } catch (error) {
    await createErrorMessage(email, error.message)
    throw new AppError(error.message);
  }
};
/**
 * Creating a subscription to stripe: trial period 7 days
 * @param {number} ownerId 
 * @param {number} customerId 
 * @param {string} priceId 
 * @returns {} clientSecret from subscription
 */
const createSubscription = async (ownerId, customerId, priceId) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: priceId,
      }],
      // trial_period_days: TRIAL_PERIOD_DAYS,
      // cancel_at_period_end: true,
      // pending_invoice_item_interval: {
      //   interval: month,
      //   interval_count: 3
      // }, 
      payment_behavior: 'default_incomplete',
      // expand: ['pending_setup_intent'],
      expand: ['latest_invoice.payment_intent'],
      off_session: true,
    });
    await User.update({ subscriptionId: subscription.id }, { where: { id: ownerId } });
    // const invoice = await stripe.invoices.create({
    //   customer: customerId,
    //   subscription: subscription.id
    // })
    // const invoice = await stripe.invoices.retrieve(subscription.latest_invoice)
    // const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
    return {
      // paymentIntent: subscription.latest_invoice.payment_intent,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    };
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
};

/**
 * Delete subscriptions
 * @param {string} id 
 * @returns 
 */
const deleteSubscription = async (id) => {
  const deleted = await stripe.subscriptions.del(
    id
  );
  return deleted
}

/**
 * Delete a customer
 * @param {number} id 
 * @returns 
 */
const deleteCustomer = async (id) => {
  const deleted = await stripe.customers.del(id)
  return deleted
}

const getSubscriptions = async () => {
  try {
    const subscriptions = await stripe.subscriptions.list()
    return subscriptions
  } catch (error) {
    throw new AppError(error.message);
  }
}
/**
 * Find subscription by user ID
 * @param {number} ownerId 
 * @returns {} info subscriptions
 */
const getByUserIdSubscription = async (ownerId) => {
  try {
    const user = await getUser(ownerId)
    if (!user.subscriptionId) {
      await createErrorMessage(ownerId, 'Not subscriptionId in user')
      return {
        code: 1007
      }
    }
    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId,
      {
        expand: ['pending_setup_intent', 'latest_invoice.payment_intent']
      }
    ) 
    const { data } = await stripe.setupIntents.list({
      customer: subscription.customer
    });

    let status_invent = data[0]?.status || ""

    return {
      ...subscription,
      client_secret: subscription?.latest_invoice.pending_setup_intent?.client_secret,
      created: await getConvertTimeStamps(subscription.created),
      current_period_start: await getConvertTimeStamps(subscription.current_period_start),
      current_period_end: await getConvertTimeStamps(subscription.current_period_end),
      start_date: await getConvertTimeStamps(subscription.start_date),
      trial_start: await getConvertTimeStamps(subscription.trial_start),
      trial_end: await getConvertTimeStamps(subscription.trial_end),
      trial_end_convert: await getConvertTimeStamps(subscription.trial_end),
      status_invent: status_invent
    }
  } catch (error) { 
    await createErrorMessage(ownerId, error.message)
    throw new InvalidRequestError(error.message);
  }
}

/**
 * Find subscription by ID
 * @param {number} ownerId 
 * @returns {} info subscriptions
 */
const getByIdSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['pending_setup_intent']
    })
    const { data } = await stripe.setupIntents.list({
      customer: subscription.customer
    });
    return {
      ...subscription,
      created: await getConvertTimeStamps(subscription.created),
      current_period_start: await getConvertTimeStamps(subscription.current_period_start),
      current_period_end: await getConvertTimeStamps(subscription.current_period_end),
      start_date: await getConvertTimeStamps(subscription.start_date),
      trial_start: await getConvertTimeStamps(subscription.trial_start),
      trial_end_convert: await getConvertTimeStamps(subscription.trial_end),
      status_invent: data[0]?.status || ''
    }
  } catch (error) {
    // await createErrorMessage(ownerId, error.message)
    throw new AppError(error.message);
  }
}

/**
 * Create payment result Stripe
 * @param {number} ownerId 
 * @param {number} subscriptionId 
 * @param {string} email 
 * @param {string} first_name 
 * @param {string} paymentMethodId 
 * @param {string} status 
 * @param {string} paymentId 
 * @param {string} promoCode 
 * @returns 
 */
const createPaymentResult = async (ownerId, subscriptionId, email, first_name, paymentMethodId, status, paymentId, promoCode, profileId) => {
  const method = await PaymentInfo.findOne({
    where: { ownerId, id: paymentMethodId }
  })
  if (!method) {
    await createErrorMessage(ownerId, 'Not found method payment')
    return {
      message: 'Not found method payment'
    }
  }

  const price = await getPriceById(method.priceId)
  if (!price) {
    await createErrorMessage(ownerId, `Not found price id: ${method.priceId}`)
    return {
      message: `Not found price id: ${method.priceId}`
    }
  }
  let discount = ''
  let priceProduct = (price.unit_amount / 100).toFixed(2)

  const interval = price.recurring.interval

  if (promoCode) {
    const resp = await isValidPromoCode(ownerId, promoCode, interval)

    if (resp?.code) return resp

    priceProduct = (resp.unit_amount / 100).toFixed(2);

    discount = promoCode
  }

  const lastPayment = await getLastPayment(ownerId)

  const currentDate = new Date();
  const createDate = new Date(lastPayment?.createdAt)

  const days = parseInt((currentDate - createDate) / (1000 * 60 * 60 * 24)) || 0;

  const dateNow = new Date()
  if (interval == 'year') {
    dateNow.setDate(dateNow.getDate() + 364);
  } else if (interval == 'month') {
    dateNow.setDate(dateNow.getDate() + 30);
  }

  dateNow.setDate(dateNow.getDate() + days)

  const payment = await PaymentResult.create({
    ownerId,
    paymentMethodId,
    state: status,
    success: status == 'succeeded',
    paymentId,
    total: priceProduct,
    current_period_end: dateNow,
    discount,
    profileId
  })
  if (status == 'succeeded') {
    await createPaymentLimit(payment.ownerId, payment.id, payment.current_period_end)

    const { hosted_invoice_url } = await getUrlInvoice(ownerId, subscriptionId)

    await sendEmailReceipt(email, first_name, hosted_invoice_url)

    if(discount) {
      await checkUsePromoCode(ownerId, discount);
    } 

    const user = await getUser(payment.ownerId);

    if (payment.profileId) {
      user.update({ profileId: payment.profileId })
  }
    if (user.success == false) {
        const resp = await sendEmailRegister(user.email, user.firstName)
        if (resp.status == 200) {
            await user.update({ success: true })
        }
    }
  }

  return payment
}

const getPaymentIntents = async (ownerId) => {
  const { customerId } = await getUser(ownerId)
  const { data } = await stripe.paymentIntents.list({
    customer: customerId,
    // limit: 3,
  });
  return data
}

const getInvoicesByCustumer = async (customerId, limit) => {
  if (!customerId) return [];

  let invoicesList;
  try {
    invoicesList = await stripe.invoices.list({
      customer: customerId,
      limit: limit ? +limit : 4,
      // starting_after: nextAfterInvoiceId ? `${nextAfterInvoiceId}` : undefined,
    });
  } catch (error) {
    throw new NotFoundError(error.message);
  }

  const preparedInvoice = invoicesList.data.map((invoice) => ({
    id: invoice.id,
    number: +invoice.number?.split('-')[1],
    amount: (invoice.amount_due / 100).toFixed(2),
    currency: invoice.currency,
    status: invoice.status,
    creationDate: parceDate(invoice.created),
    paymentDate: parceDate(invoice.status_transitions.paid_at),
    subscription: invoice.subscription
  }));

  return preparedInvoice;
};

const getConvertTimeStamps = async (unix_timestamp) => {
  const date = new Date(unix_timestamp * 1000);
  return date// `${date.getDay()}/${date.getMonth()}/${date.getFullYear()}`
}

/**
 * Get balance transactions by owner id
 * @param {number} ownerId 
 * @returns 
 */
const getBalance = async (ownerId) => {
  try {
    const balanceTransactions = await BalanceHistory.findAndCountAll({
      where: {
        ownerId
      }
    })
    return balanceTransactions
  } catch (error) {
    throw new InvalidRequestError(error, ownerId)
  }
}

/**
 * Download balance transactions
 * @param {number} ownerId 
 * @returns 
 */
const downloadBalance = async (ownerId) => {
  try {
    const balanceTransactions = await stripe.balanceTransactions.list({
      // limit: 3,
    });
    const data = await balanceTransactions.data
    await Promise.all(data.map(async (balance) => {

      const find = await BalanceHistory.findOne({
        where: {
          historyId: balance.id,
          ownerId
        }
      })
      if (!find) {
        await BalanceHistory.create({
          historyId: balance.id,
          ownerId,
          amount: balance.amount,
          description: balance.description,
          source: balance.source,
          status: balance.status,
          createdAt: new Date(balance.created).getDate()
        })
      }
    }))
    return {
      msg: "update ok"
    }
  } catch (error) {
    throw new InvalidRequestError(error, ownerId)
  }
}


const getLastInfoPayment = async (ownerId, priceId) => {
  try {
    const info = await PaymentInfo.findOne({
      where: {
        ownerId,
        priceId
      },
      order: [['createdAt', 'DESC']]
    })
    if (info) {
      const getPayment = await PaymentResult.findOne({
        where: {
          ownerId,
          success: true,
          paymentMethodId: info.id
        },
        order: [['createdAt', 'DESC']]
      })

      return {
        method: info.methodPayment,
        current_period_start: getPayment?.createdAt,
        current_period_end: getPayment?.current_period_end,
        paymentId: getPayment?.id
      }

    }
    const getPayment = await PaymentResult.findOne({
      where: {
        ownerId,
        success: true,
      },
      order: [['createdAt', 'DESC']]
    })
    let method = 'Credit card'

    if (getPayment) {
      const res = await PaymentInfo.findOne({
        where: {
          id: getPayment.paymentMethodId
        }
      })
      if (res) {
        method = res.methodPayment
      }
    }
    return {
      method: method,
      current_period_start: getPayment?.createdAt,
      current_period_end: getPayment?.current_period_end,
      paymentId: getPayment?.id
    }
  } catch (error) {
    console.log('error', error);
  }
}

const updateSubscription = async (subscriptionId, priceId, ownerId, customerId) => {
  try {
    const { product, recurring: interval } = await getPriceById(priceId)
    try {
      await deleteSubscription(subscriptionId)
    } catch (error) { }

    const subscription = await createSubscription(ownerId, customerId, priceId)
    if (subscription) {
      await updateLimitProfile(ownerId, product.name, interval)
    }
    return {
      subscription
    }
  } catch (error) {
    await createErrorMessage(ownerId, error.message)
    return {
      msg: error.message
    }
  }

}

const webhook = async (req) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    throw new AppError('⚠️  Webhook signature verification failed.');
  }
  // Extract the object from the event.
  const dataObject = event.data.object;

  // Handle the event
  // Review important events for Billing webhooks
  // https://stripe.com/docs/billing/webhooks
  // Remove comment to see the various objects sent for this sample
  switch (event.type) {
    case 'invoice.paid':
      // console.log('invoice.paid');
      // Used to provision services after the trial has ended.
      // The status of the invoice will show up as paid. Store the status in your
      // database to reference when a user accesses your service to avoid hitting rate limits.
      break;
    case 'invoice.payment_failed':
      // console.log('invoice.payment_failed');
      // If the payment fails or the customer does not have a valid payment method,
      //  an invoice.payment_failed event is sent, the subscription becomes past_due.
      // Use this webhook to notify your user that their payment has
      // failed and to retrieve new card details.
      break;
    case 'customer.subscription.deleted':
      if (event.request != null) {
        // console.log('subscription cancelled by your request');
        // handle a subscription cancelled by your request
        // from above.
      } else {
        // console.log('subscription cancelled automatically based');
        // handle subscription cancelled automatically based
        // upon your subscription settings.
      }
      break;
    default:
    // Unexpected event type
  }
  return dataObject;
};

// module.exports.getPrice = getPrice;
// module.exports.createCustomer = createCustomer;
module.exports.createSubscription = createSubscription;
// module.exports.webhook = webhook;
// module.exports.getSubscriptions = getSubscriptions;
module.exports.getByUserIdSubscription = getByUserIdSubscription;
// module.exports.getBalance = getBalance;
// module.exports.downloadBalance = downloadBalance;
// module.exports.updateSubscription = updateSubscription;
// module.exports.getPaymentIntents = getPaymentIntents;

module.exports.getPriceById = getPriceById;
module.exports.isValidPromoCode = isValidPromoCode;
// module.exports.createPaymentResult = createPaymentResult;
module.exports.deleteSubsscription = deleteSubscription;
module.exports.getLastInfoPayment = getLastInfoPayment;
module.exports.getInvoicesByCustumer = getInvoicesByCustumer;


module.exports = {
  getPrice,
  createCustomer,
  createSubscription,
  webhook,
  getSubscriptions,
  getByUserIdSubscription,
  getBalance,
  downloadBalance,
  updateSubscription,
  getPaymentIntents,
  isValidPromoCode,
  getPriceById,
  createPaymentResult,
  deleteSubscription, 
  getInvoicesByCustumer,
  getConvertTimeStamps,
  getLastInfoPayment,
  getLastPayment,
  deleteCustomer,
  checkUsePromoCode
};
