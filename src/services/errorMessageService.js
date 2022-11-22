const { ErrorMessage } = require("../models/errorModel")


const createErrorMessage = async (user, message) => {
    await ErrorMessage.create({ user, message })
}

module.exports = {
    createErrorMessage
}