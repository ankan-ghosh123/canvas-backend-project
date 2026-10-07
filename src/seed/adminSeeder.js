// const userModel = require('../models/user.model')
// const bcrypt = require('bcryptjs')
// async function adminSeed() {

//     const isAdminExist =
//         await userModel.findOne({
//             role: "admin"
//         })
//     if (isAdminExist) {
//         console.log("admin already exist")
//         return
//     }
//     //create a admin mannually
//     //create a password first
//     const password = "kobiterJABcanvas007"
//     const Hashpassword = await bcrypt.hash(password, 10)

//     const admin = await userModel.create({
//         username: "Kobitar Canvas",
//         email: "kobitarcanvas3@gmail.com",
//         password: Hashpassword,
//         role: "admin"
//     })

//     console.log("adminlogged successfully:", admin);
// }
// module.exports = adminSeed