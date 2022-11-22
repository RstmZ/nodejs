const express = require('express');
const { invitationTokenMiddleware } = require('../middlewares/invitationTokenMiddleware');
const { getProfile, updateProfile, createProfile, saveEmailTrial, getEmailTrial, getAllProfilies, deleteAccounts } = require('../services/profileService');
const { getUser, updateUser } = require('../services/userService');
const stripeService = require('../services/stripeService');
const { getMembers } = require('../services/authService');
const { getFilesSize } = require('../services/fileService');
const { getPaymentLimit } = require('../services/paymentService');
const { sendEmailStartFreeTrial } = require('../services/mailService');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { asyncWrapper } = require('../utils/apiUtils');
const { getPaymentLimitByOwnerId } = require('../services/paymentService');
const { isTestEmailSignIn } = require('../utils/checkEmailTest');
const profileRouter = express.Router();


profileRouter.get('/', invitationTokenMiddleware, async (req, res) => {
    const ownerId = req.invitationUserId;

    const { id, email, customerId, firstName, lastName, organization, profileId } = await getUser(ownerId);

    const {
        type, darkMode, timeZone, language, country, paymentReminders, productUpdates, tipsInspiration,
        countEmails, countCampaigns, countDocuments, countSizes, createdAt
    } = await getProfile(id, profileId)

    const members = await getMembers(ownerId, email, firstName)

    const sizeInGB = await getFilesSize(ownerId);

    let currentCampaigns = 0
    let currentDocuments = 0
    let currentEmails = 0
    let invoices = []

    let billing = {
        method: 'Credit card',
        current_period_start: createdAt,
        current_period_end: createdAt,
    }

    if (type == 'Trial') {
        billing.current_period_end.setDate(billing.current_period_end.getDate() + 14);

        const payment = await getPaymentLimitByOwnerId(ownerId);
        currentCampaigns = payment.currentCampaigns;
        currentDocuments = payment.currentDocuments;
        currentEmails = payment.currentEmails;

    } else {
        if (!await isTestEmailSignIn(email)) {
            const payment = await getPaymentLimit(billing?.paymentId);
            currentCampaigns = payment.currentCampaigns
            currentDocuments = payment.currentDocuments
            currentEmails = payment.currentEmails

            const sub = await stripeService.getByUserIdSubscription(ownerId)
            billing = await stripeService.getLastInfoPayment(ownerId, sub?.items?.data[0]?.price?.id)

            invoices = await stripeService.getInvoicesByCustumer(customerId, 10)
        }
    }

    const profile = {
        id,
        email,
        firstName,
        lastName,
        company: organization,
        plan: type,
        darkMode,
        timeZone,
        language,
        country,
        paymentReminders,
        productUpdates,
        tipsInspiration,
        ...billing,
        maxEmails: countEmails,
        currentEmails,
        maxCampaigns: countCampaigns,
        currentCampaigns,
        maxDocuments: countDocuments,
        currentDocuments,
        maxSize: countSizes,
        currentSize: sizeInGB,
    }

    res.json({
        profile,
        invoices,
        members
    });
});

profileRouter.put('/', invitationTokenMiddleware, async (req, res) => {
    const ownerId = req.invitationUserId;

    const { darkMode, timeZone, country, language, paymentReminders,
        productUpdates, tipsInspiration, firstName, lastName, company,
        showDocument, showCampaign } = req.body;

    const user = await updateUser(ownerId, firstName, lastName, company, showDocument, showCampaign)

    const profileNew = await updateProfile(ownerId, darkMode, timeZone, country, language, paymentReminders, productUpdates, tipsInspiration)
    const profile = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.organization,
        showDocument: user.showDocument,
        showCampaign: user.showCampaign,
        plan: profileNew.type,
        darkMode: profileNew.darkMode,
        timeZone: profileNew.timeZone,
        language: profileNew.language,
        country: profileNew.country,
        paymentReminders: profileNew.paymentReminders,
        productUpdates: profileNew.productUpdates,
        tipsInspiration: profileNew.tipsInspiration
    }

    res.json({ profile });
});

profileRouter.post('/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const {
        ownerId,
        priceId,
        type,
    } = req.body;

    const user = await getUser(ownerId);

    if (type == 'Trial' && await getEmailTrial(user.email)) return res.status(400).json({ code: "You have already used the trial period" })

    if (type == 'Trial' && user.isTrial) return res.status(400).json({ code: "You have already used the trial period" })

    const domain = user.email.split('@').pop();
    const edu = domain.split('.').pop();

    if (type == "Student" && edu != 'edu') {
        return res.status(400).json({
            code: 'Unfortunately, the e-mail you entered doesn`t have .edu domain'
        })
    }

    req.session.user = user;

    let invervalProfile = ''

    if (type != 'Trial' && priceId) {
        // creation customer
        const customer = await stripeService.createCustomer(user.id, user.email);
        // creation subscription
        await stripeService.createSubscription(user.id, customer.customerId, priceId);
        // creation profile
        const { recurring: interval } = await stripeService.getPriceById(priceId)

        invervalProfile = interval.interval
    }

    const profile = await createProfile(user.id, type, invervalProfile);

    if (user && profile && type == 'Trial') {
        await user.update({ isTrial: true, success: true, profileId: profile.id })

        await saveEmailTrial(user.email)

        await sendEmailStartFreeTrial(user.email, user.firstName);
    }

    res.json({
        message: 'Profile created successfully!',
        user,
        profile,
    });
}))

profileRouter.post('/all', userSessionMiddleware, async (req, res) => {
    const {
        status
    } = req.body;
    const profiles = await getAllProfilies(status)

    res.json(profiles);
});

profileRouter.post('/deleted', userSessionMiddleware, async (req, res) => {
    const {
        listAccounts
    } = req.body;

    await deleteAccounts(listAccounts)

    res.json({ message: 'Ok' });
});

module.exports = {
    profileRouter,
};
