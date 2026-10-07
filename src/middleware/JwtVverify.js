const jwt = require('jsonwebtoken')
const ApiError = require('../utils/ApiError')
const { pool } = require('../db/db')
async function jwtUserVerification(req, res, next) {
  //step1:fetch token from cookie or header
  const token =
    req.cookies?.AccessToken || req.header("Authorization")?.replace("bearer ", "")

  try {
    console.log('token', token)
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
    req.user = user
    next()

  } catch (error) {
    next(error)
  }
}
module.exports = jwtUserVerification;