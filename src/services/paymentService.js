const { PaymentLimit } = require("../models/paymentLimitCheckModel")
const { createErrorMessage } = require("./errorMessageService")


const createPaymentLimit = async (ownerId, paymentResultId, endPeriod) => {
    try {
        return await PaymentLimit.create({ ownerId, paymentResultId, endPeriod })
    } catch (error) {
        await createErrorMessage(ownerId, error[0].message)
        return error
    }
}

const updateCurrentCamapaign = async (paymentLastId) => {
    const paymentLast = await PaymentLimit.findOne({ where: { paymentResultId: paymentLastId } })
    if (!paymentLast) {
        return {
            status: 400
        }
    }
    return paymentLast.update({ currentCampaigns: paymentLast.currentCampaigns + 1 })
}

const updateCurrentEmails = async (paymentLastId) => {
    const paymentLast = await PaymentLimit.findOne({ where: { paymentResultId: paymentLastId } })
    if (!paymentLast) {
        return {
            status: 400
        }
    }
    return paymentLast.update({ currentEmails: paymentLast.currentEmails + 1 })
}

const updateCurrentDocuments = async (paymentLastId) => {
    const paymentLast = await PaymentLimit.findOne({ where: { paymentResultId: paymentLastId } })
    if (!paymentLast) {
        return {
            status: 400
        }
    }
    return paymentLast.update({ currentDocuments: paymentLast.currentDocuments + 1 })
}

const getPaymentLimit = async (paymentLastId) => {
    if (!paymentLastId) {
        return {
            currentCampaigns: 0,
            currentDocuments: 0,
            currentEmails: 0
        }
    }
    const paymentLast = await PaymentLimit.findOne({ where: { paymentResultId: paymentLastId } })
    if (!paymentLast) {
        return {
            status: 400
        }
    }
    return paymentLast
}

const getPaymentLimitByOwnerId = async (ownerId) => {
    const record = await PaymentLimit.findOne({ where: { ownerId }, order: [['createdAt', 'DESC']] })
    if (!record) {
        return await PaymentLimit.create({ ownerId })
    }
    return record
}

const updateCurrentDocumentsByOwnerId = async (ownerId) => {
    const current = await PaymentLimit.findOne({ where: { ownerId }, order: [['createdAt', 'DESC']] })
    if (!current) {
        return {
            status: 400
        }
    }
    return current.update({ currentDocuments: current.currentDocuments + 1 })
}

const updateCurrentEmailsByOwnerId = async (ownerId) => {
    const current = await PaymentLimit.findOne({ where: { ownerId }, order: [['createdAt', 'DESC']] })
    if (!current) {
        return {
            status: 400
        }
    }
    return current.update({ currentEmails: current.currentEmails + 1 })
}

const updateCurrentCamapaignByOwnerId = async (ownerId) => {
    const current = await PaymentLimit.findOne({ where: { ownerId }, order: [['createdAt', 'DESC']] })
    if (!current) {
        return {
            status: 400
        }
    }
    return current.update({ currentCampaigns: current.currentCampaigns + 1 })
}


module.exports = {
    createPaymentLimit,
    updateCurrentCamapaign,
    updateCurrentEmails,
    getPaymentLimit,
    updateCurrentDocuments,
    getPaymentLimitByOwnerId,
    updateCurrentDocumentsByOwnerId,
    updateCurrentEmailsByOwnerId,
    updateCurrentCamapaignByOwnerId
}