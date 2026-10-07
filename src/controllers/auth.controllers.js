const jwt = require('jsonwebtoken')
const validator = require('validator')
const { pool } = require('../db/db')
const ApiError = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const bycript = require('bcryptjs')
const avatars =
    ['https://ik.imagekit.io/q7ryra9is/avaters/fox.png?updatedAt=1787060262902',
        'https://ik.imagekit.io/q7ryra9is/avaters/dinosaur.png?updatedAt=1787060251271',
        'https://ik.imagekit.io/q7ryra9is/avaters/lion.png?updatedAt=1787060234597',
        'https://ik.imagekit.io/q7ryra9is/avaters/cat.png?updatedAt=1787060234540',
        'https://ik.imagekit.io/q7ryra9is/avaters/panda.png?updatedAt=1787060234439',
        'https://ik.imagekit.io/q7ryra9is/avaters/tiger.png?updatedAt=1787060210236'
    ]
const generateAvater = () => {
    const roll = Math.floor(Math.random() * 6);

    return avatars[roll];
}
const options = {
    httpOnly: true,
    secure: false
}
const responseAuser = (user) => {
    return {
        id: user.id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role
    }
}
async function generateAccessTokenAndRefreshToken(user) {
    // console.log("accesstoken:--------", process.env.ACCESS_TOKEN_SECRET)
    // console.log(process.env.ACCESS_TOKEN_EXPIRY)
    if (!user) {
        throw new ApiError(500, `something went wrong
        while creating user,user not comming`)
    }
    try {
        //generate refreshtoken 
        const refreshToken = jwt.sign(
            {
                id: user.id,

            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRY
            }
        )
        //save referesh  token to databse 
        await pool.query(
            `update users 
        set refresh_token=$1
        where id=$2`,
            [refreshToken, user.id]
        )
        //generate access token

        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullname,
                role: user.role
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY
            }
        )
        return {
            accessToken,
            refreshToken
        }
    } catch (error) {
        const errorMessage = error.message || error;
        console.error("Token Generation Error:", error); // Log full stack trace in backend
        throw new ApiError(500, `Something went wrong while generating refresh and access token: ${errorMessage}`);
    }

}

async function registerUser(req, res, next) {

    const { validFullname, validUsername, validEmail } = req
    const { password, role = 'user' } = req.body

    //step1:check if user is exist
    try {
        const isUserAlreadyExist =
            await pool.query(
                `select * from users where
             email=$1 or username=$2`,
                [validEmail, validUsername]
            )

        if (isUserAlreadyExist.rows.length > 0) {
            throw new ApiError(409, `User with email or
                            username already exists`)
        }

        const avatarUrl = generateAvater();
        //hashed password
        const hashPassword = await bycript.hash(password, 10)
        //step 2:create new user
        const newUser = await pool.query(
            `insert into users
            (fullname,username,email,password,avatar_url,role)
            values ($1,$2,$3,$4,$5,$6) returning*
            `,
            [validFullname, validUsername, validEmail, hashPassword, avatarUrl, role]
        )
        if (newUser.rows.length === 0) {
            throw new ApiError(500, `something went wrong
            while creating user`)
        }
        //check if hew user is created

        const createdUser = newUser.rows[0]
        const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(createdUser)
        const responeseUser = responseAuser(createdUser)
        //set tokens to cookie

        console.log("user created successfully:", createdUser)
        return res.
            status(201).
            cookie("AccessToken", accessToken, options).
            cookie("RefreshToken", refreshToken, options).
            json(
                new ApiResponse(200,
                    responeseUser,
                    "User registered Successfully")
            )


    } catch (error) {
        console.error("registerUser error:", error)
        if (error instanceof ApiError) throw error
        if (error.code === '23505') {
            throw new ApiError(409, "User with email or username already exists")
        }

        throw new ApiError(500, "internal server error")
    }

}
async function loginUser(req, res, next) {
    //1.check if username,email,password is comming
    const { username, email, password } = req.body
    console.log("username:", username + "email:", email)
    try {
        const idenifier = username || email
        if (!idenifier || idenifier?.trim() === "") {
            throw new ApiError(400, "username or email missing")
        }

        if (!password || password?.trim() === "") {
            throw new ApiError(400, "password missing")
        }
        const cleanIdentifier = idenifier.trim().toLowerCase().replace(/\s+/g, '')
        const user = await pool.query(
            `select * from users
            where username=$1 or email=$2
            `, [cleanIdentifier, cleanIdentifier]
        )
        if (user.rows.length === 0) {
            throw new ApiError(400, `user did not exist in database`)
        }
        const savedPassword = user.rows[0].password
        console.log(`savedPassword:${savedPassword} and 
                        password:${password}`)
        //check if password is correct
        const isPasswordCorrect =
            await bycript.compare(password, savedPassword)

        if (!isPasswordCorrect) {
            throw new ApiError(400, `incorrect password`)
        }
        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken(user.rows[0])
        const loggedinUser = responseAuser(user.rows[0])
        return res.
            cookie("AccessToken", accessToken, options).
            cookie("RefreshToken", refreshToken, options).
            json(
                new ApiResponse(
                    200,

                    loggedinUser,

                    "User logged In Successfully"
                )
            )
    } catch (error) {
        if (error instanceof ApiError) throw error
        console.error("loginUser error:", error)
        throw new ApiError(500, "internal server error")
    }
}
async function logoutUser(req, res, next) {
    //fetch user from req.user set by
    //jwtverifyy middleware
    const user = req.user
    try {
        if (!user) {
            throw new ApiError(500, `internal server
         error:user not rechable`)
        }
        await pool.query(
            `update users
    set refresh_token=$1
    where id=$2`,
            [null, user.id]
        )
        res.status(200).
            clearCookie("AccessToken", options).
            clearCookie("RefreshToken", options).
            json(new ApiResponse(200,
                {},
                `user loggedout successfully`
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error
        console.error("logoutUser error:", error)
        throw new ApiError(500, "internal server error")
    }

}
async function refreshAccessToken(req, res) {
    ///step1- fetch refreshtoken and check its presence
    const incomeingRefreshToken =
        req.cookies?.RefreshToken || req.body?.refreshToken
    if (!incomeingRefreshToken) {
        throw new ApiError(401, "unauthorize user missing refresh token")
    }
    try {
        //step 2- verify incoming refresh token useing jwt secrect

        const decoded = jwt.verify(
            incomeingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        if (!decoded) {
            throw new ApiError(401, "token missmatch")
        }

        ///step3-find user in database using id embaded  
        //inside refresh token
        const fullUser = await pool.query(
            `select*from users
            where id=$1`,
            [decoded.id]
        )
        if (fullUser.rows.length === 0) {
            throw new ApiError(400, `user did
                 not exist in database`)
        }

        ///step4-check if incoming refrsh token is expired 
        //or mismatch with the one presnt in databse
        const user = fullUser.rows[0]
        if (incomeingRefreshToken !== user.refresh_token) {
            throw new ApiError(401, `refresh token is
                          invlid or expired`)
        }
        ///step5-generate new access and refresh token
        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessTokenAndRefreshToken(fullUser.rows[0])

        ///step6-set access and refresh token to the cookie
        //and send response     
        const filterdUser = responseAuser(fullUser.rows[0])
        return res.
            cookie("AccessToken", accessToken, options).
            cookie("RefreshToken", newRefreshToken, options).
            json(new ApiResponse(
                200,
                {
                    filterdUser,
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "AccessToken refreshed sccessfully"
            ))

    } catch (error) {
        if (error instanceof ApiError) throw error
        console.error("refreshAccessToken error:", error)
        throw new ApiError(401, "invalid refresh token")
    }
}
async function updateEmail(req, res) {
    const { currentPassword, newEmail, confiredNewEmail } = req.body
    try {
        //step1-check all the required field are present or not
        if ([currentPassword, newEmail, confiredNewEmail].
            some(chek => !chek || chek.trim() === "")) {
            throw new ApiError(
                400,
                `all fields are required`
            )
        }

        //email validation
        if (!validator.isEmail(newEmail) ||
            !validator.isEmail(confiredNewEmail)) {
            throw new ApiError(
                400, `invaild email format`)
        }
        //normalize both the email 
        const norm_newEmail = validator.normalizeEmail(newEmail)
        const norm_confirmedEmail = validator.normalizeEmail(confiredNewEmail)
        //compare both the emails
        if (norm_newEmail !== norm_confirmedEmail) {
            throw new ApiError(400,
                `emails do not match`
            )
        }
        //retrive password and email                      
        const data = await pool.query(
            `select password,email from users
        where id=$1`, [req.user.id]
        )

        if (data.rows.length === 0) {
            throw new ApiError(404, `
            user not found`)
        }
        //why even proceed if current email
        // and new email both are same
        if (data.rows[0].email === norm_newEmail) {
            throw new ApiError(400,
                `new email must be different
            from old one`

            )
        }
        const dbCurrentPassword =
            data.rows[0].password

        //check given password belongs to the user or not
        const isPasswordCorrect =
            await bycript.compare(currentPassword, dbCurrentPassword)
        if (!isPasswordCorrect) {
            throw new ApiError(
                400, `incorrect password,please
                   enter valid password`
            )
        }
        //update email
        const updateRes = await pool.query(
            `update users
        set email=$1
        where id=$2 returning*`,
            [norm_newEmail, req.user.id]
        )
        if (updateRes.rows.length === 0) {
            throw new ApiError(400,
                `did not find a matching user`
            )
        }
        return res.
            status(200).
            json(new ApiResponse(
                200,
                { new_email: updateRes.rows[0].email },
                `email updated successsfully`
            ))

    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log("error while updating email:-", error.message)

        if (error.code === '23505') {
            throw new ApiError(400, `this email is already exist`)
        }

        throw new ApiError(500, `internal surver error`)
    }

}

async function updatePassword(req, res) {
    const { currentPassword, newPassword, confirmNewPassword } = req.body
    try {

        if ([currentPassword, newPassword, confirmNewPassword]
            .some(pas => !pas || pas.trim() === "")) {
            throw new ApiError(
                400,
                `all the fields are require`)
        }

        if (currentPassword === newPassword) {
            throw new ApiError(
                400,
                `new password must be different
            from current password`
            )
        }
        if (newPassword !== confirmNewPassword) {
            throw new ApiError(400, "new password and confirm password do not match");
        }
        const getCurrentDbPassword =
            await pool.query(
                `select password from 
                users
                  where id=$1`,
                [req.user.id]
            )
        if (getCurrentDbPassword.rows.length === 0) {
            throw new ApiError(404, "user not found");
        }
        const currentDbPassword =
            getCurrentDbPassword.rows[0].password

        const verifyCurrentPassword
            = await bycript.compare
                (currentPassword,
                    currentDbPassword
                )

        if (!verifyCurrentPassword) {
            throw new ApiError(
                400,
                `please provide correct
         current possword`
            )
        }
        const hashPassword = await bycript.hash(newPassword, 10)
        const update_Password =
            await pool.query(
                `update users
                set password=$1
                where id=$2  returning*`,
                [hashPassword, req.user.id]
            )
        if (update_Password.rows.length === 0) {
            throw new ApiError(400, "problem updating password");
        }
        //security parpose ->todo why ?study    
        await pool.query(
            `update users set refresh_token = null where id = $1`,
            [req.user.id]
        );
        return res.
            status(200).
            json(new ApiResponse(200,
                {},
                `password update successfully`
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log("error while updating email:-", error.message)

        throw new ApiError(500, `internal surver error`)
    }
}

async function getLoginUserDetails(req, res) {
    //step1:fetch token from cookie or header
    const token =
        req.cookies?.AccessToken || req.header("Authorization")?.replace("bearer ", "")

    try {
        //step2:check if there was any token
        if (!token) {
            throw new ApiError(401, "unauthorized user")
        }
        //step 3:verify the token
        const decodedToken =
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        //step4: todo
        console.log(decodedToken)
        const wholeUser = await pool.query(
            `select  id,fullname,username,email,role
      from users 
         where id=$1`,
            [decodedToken.id]
        )
        //step 5: todo
        if (wholeUser.rows.length === 0) {
            throw new ApiError(401, "invalid accesstoken")
        }
        //step 6:set the user in req and call next
        const user = wholeUser.rows[0]
        return res.status(200).json(
            new ApiResponse(200,
                { user: user },
                "user data successfuly fetch"
            )
        )

    } catch (error) {
        if (error instanceof ApiError) throw error
        console.log('error from get user deails')
        throw new ApiError(500, 'internal server error')
    }
}
//future
// async function addWhatsappNo(req, res) {

// }
// async function updateWhatsappNo(req, res) {

// }

module.exports =
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateEmail,
    updatePassword,
    getLoginUserDetails

}