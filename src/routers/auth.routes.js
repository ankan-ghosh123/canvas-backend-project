const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controllers')
const registerMiddleware = require('../middleware/register.validator')
const JwtVerify = require('../middleware/JwtVverify')
//1.get me -use full when user refresh the page
router.get('/get/me', authController.getLoginUserDetails)

//2.register  a user
router.post('/registeruser', registerMiddleware.validatorMiddleware, authController.registerUser)

//3.login a user done
router.post('/post/login', authController.loginUser)

//4.logout a user
console.log("logout user", typeof authController.logoutUser)
router.post('/logout', JwtVerify, authController.logoutUser)

//5. refresh access token done
router.post('/refresh-accesstoken', authController.refreshAccessToken)

//6.update password done
router.put('/put/update-password', JwtVerify, authController.updatePassword)

//7.update email done
router.put('/put/update-email', JwtVerify, authController.updateEmail)





module.exports = router