
const isTestEmailSignIn = async (email) => {
    const testEmails = ['test@gmail.com', 'test1@gmail.com', 'test2@gmail.com',
        'test3@gmail.com', 'test4@gmail.com', 'test5@gmail.com'];
    return testEmails.includes(email)
}

module.exports = {
    isTestEmailSignIn
};
