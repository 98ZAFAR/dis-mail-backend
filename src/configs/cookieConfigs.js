const setCookies = (res, name, value, options = {}) => {
    const defaultOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    };

    const cookieOptions = { ...defaultOptions, ...options };
    res.cookie(name, value, cookieOptions);
}

const clearCookies = (res, name) => {
    res.clearCookie(name, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
    });
}

module.exports = {
    setCookies,
    clearCookies,
};