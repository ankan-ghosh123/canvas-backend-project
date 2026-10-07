const jwt = require('jsonwebtoken')
const ApiError = require('../utils/ApiError')
const { pool } = require('../db/db')
async function authorizeRoleAccess(req, res, next) {
    //step1:define allowed role 
    const allowedRole = "admin"
    //step2:get role from pervious middleware
    const role = req.user?.role

    try {
        //step3:check if role even exist? ,
        // if exist is it same as allowed role?

        // role="" then !role->!false->true
        // ->enter inside  if block
        //if there is role ,role=user,admin!=user ->true
        //enter inside if block
        if (!role || allowedRole !== role) {
            throw new ApiError(403, `Access Denied: Role
        '${req.user?.role}' is 
        not allowed to access this resource`)
        }
        //step 4:if role=admin call next  
        next()
    } catch (error) {
        next(error)
    }
}
module.exports = authorizeRoleAccess