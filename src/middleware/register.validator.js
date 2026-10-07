const ApiError = require('../utils/ApiError')
const validator = require('validator')
async function validatorMiddleware(req, res, next) {
    const { fullname, username, email, password, role = "user" } = req.body
    // check for empty fields

    if ([fullname, username, email, password].some(
        (field) => !field || field?.trim() === ""
    )) {
        throw new ApiError(400, "all fileds are require")
    }
    //EMAIL->
    // validation -check fromat of email
    if (!validator.isEmail(email)) {
        throw new ApiError(400, "invalid email format")
    }
    //normalise the email 
    // (incase a user use capital
    // alphabate while giving email  )
    const validEmail = validator.normalizeEmail(email)

    //USER NAME->   
    const validUsername = username.trim().toLowerCase().normalize('NFKC')
    if (validUsername.includes(' ')) {
        throw new ApiError(400, `user name can not
            contain spaces `)
    }

    //FULLNAME->
    const validFullname = fullname.trim().toLowerCase().replace(/\s+/g, ' ')
    //ensure strong password
    if (!validator.isStrongPassword(password)) {
        throw new ApiError(409, `Password is too weak,
            It must be at least 8 characters long
            and contain at least one uppercase
            letter, one lowercase letter,
            one number, and one special character.`
        )
    }
    //length check
    if (validFullname.length < 3 || validFullname.length > 80) {
        throw ApiError(400, `user fullname must be between
                  3 and 80 characters`)
    }
    if (validUsername.length < 3 || validUsername.length > 30) {
        throw new ApiError(400, `user name must be between
            3 and 30 characters`)
    }
    req.validEmail = validEmail
    req.validFullname = validFullname
    req.validUsername = validUsername
    next()

}
module.exports = { validatorMiddleware }