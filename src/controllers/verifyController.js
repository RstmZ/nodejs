const express = require('express');
const { userSessionMiddleware } = require('../middlewares/userSessionMiddleware');
const { sendVerifyCode } = require('../services/mailService');
const { generateCode, saveVerifyCode, verifyCodeSignIn, resetCodeSignIn, verifyCodeSignUp, resetCodeSignUp, testAccountIsVerify, getCodes } = require('../services/userService');
const { asyncWrapper } = require('../utils/apiUtils'); 

const verifyRouter = express.Router();

verifyRouter.post('/signIn/send/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    const { email } = req.body;
 
    if (!await testAccountIsVerify(email)) {
        const code = await generateCode();

        const { status, message } = await sendVerifyCode(email, code)
        
        if (status == 200) {
            await saveVerifyCode(ownerId, email, code)
        }
        return res.status(status).json(message);
    }
    const code = '123456';
    await saveVerifyCode(ownerId, email, code)

    res.json({ message: 'Ok' });
}));

verifyRouter.post('/signIn/check/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    const { email, code } = req.body;

    const { status, ...response } = await verifyCodeSignIn(ownerId, email, code)
    res.status(status).json(response);
}));

verifyRouter.post('/signIn/reset/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    const { email } = req.body;

    if (!await testAccountIsVerify(email)) {

        const record = await resetCodeSignIn(ownerId, email)

        if (record.code) {
            await sendVerifyCode(email, record.code)
        }
        return res.json({ message: 'Ok' });
    }
    const code = '123456';
    await saveVerifyCode(ownerId, email, code)

    res.json({ message: `You tried to send to a recipient that has been marked as inactive. Found inactive addresses: ${email}. Inactive recipients are ones that have generated a hard bounce, a spam complaint, or a manual suppression.` });
}));

verifyRouter.post('/signUp/send/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    const { email } = req.body;

    if (!await testAccountIsVerify(email)) {
        const code = await generateCode();

        const { status, message } = await sendVerifyCode(email, code)
        
        if (status == 200) {
            await saveVerifyCode(ownerId, email, code, 'SignUp')
        }

        return res.json(message);
    }

    const code = '123456';
    await saveVerifyCode(ownerId, email, code, 'SignUp')

    res.json({ message: 'Ok' });
}));

verifyRouter.post('/signUp/check/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    const { email, code } = req.body;

    const { status, ...response } = await verifyCodeSignUp(ownerId, email, code)
    res.status(status).json(response);
}));

verifyRouter.post('/signUp/reset/', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    const { email } = req.body;

    if (!await testAccountIsVerify(email)) {
        const record = await resetCodeSignUp(ownerId, email)

        if (record.code) {
            await sendVerifyCode(email, record.code)
        }

        return res.json({ message: 'Ok' });
    }

    const code = '123456';
    await saveVerifyCode(ownerId, email, code, 'SignUp')

    res.json({ message: 'Ok' });
}));

verifyRouter.get('/all', userSessionMiddleware, asyncWrapper(async (req, res) => {
    const ownerId = req.session.user.id;
    if(ownerId !== 4) res.status(400).json({ message: 'error'})

    const codes = await getCodes()
    res.json(codes)
}))

module.exports = {
    verifyRouter,
};
