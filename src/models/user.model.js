// const mongoose = require("mongoose")

// const userSchema = new mongoose.Schema({
//     fullname: {
//         type: String,
//         required: true
//     },
//     username: {
//         type: String,
//         required: true
//     },
//     email: {
//         type: String,
//         required: true
//     },
//     password: {
//         type: String,
//         required: [true, "password needed"]
//     },
//     role: {
//         type: String,
//         enum: ['user', 'admin'],
//         default: 'user'
//     }
// })
// //query in gpt :
// userSchema.pre("save", async function (next) {
//     this.password = await bcrypt.hash(this.password, 10)
//     next()
// })
// //coming user and video modeling chai or code

// const userModel = mongoose.model('users', userSchema)
// module.exports = userModel