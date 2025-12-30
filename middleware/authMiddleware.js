const isAdmin = (req, res, next) => {
    // Get the role from headers
    // Note: Headers are usually lowercased by Express, but 'role' works if sent exactly like that.
    const role = req.headers['role']; 

    if (role === 'admin') {
        next(); // Authorization successful
    } else {
        // Return 403 Forbidden
        res.status(403).json({ message: "Access Denied: Admins Only" });
    }
};

module.exports = { isAdmin };