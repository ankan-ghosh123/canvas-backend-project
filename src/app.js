
// const adminRoutes = require('./routers/admin.posts.routes')
const express = require("express")
const cors = require('cors');
const cookieParser = require('cookie-parser')

const app = express()
const authRouters = require('./routers/auth.routes')
const userRoutes = require('./routers/users.post.routes')
const adminRoutes = require('./routers/admin.posts.routes')
const selectionFeatureRoutes = require('./routers/poem.selection.feature.routes')
const commentRoutes = require('./routers/comments.routes')
const publicRouter = require('./routers/public.routers')
//json data read korar jonno use hoy
app.use(express.json({ limit: "16kb" }))


//this allwos the request that has cookie /credentials to make request to our server
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true
    })
);
// app.use(cors()); 
//data can come from url,to understand 
//this url we use this middleware
app.use(express.urlencoded({ extended: true, limit: "16kb" }))

// onek somoy kichu file ba data amra 
// amader server a store kore rakhte chay
//je gulo ato sensitive noy,sei jnno amra
// static  folder  use kori 
app.use(express.static("public"))

app.use(cookieParser())

app.use('/api/auth', authRouters)  // 7
app.use('/api/admin', adminRoutes) //
app.use('/api/user', userRoutes)
app.use('/api/feature', selectionFeatureRoutes)
app.use('/api/comment', commentRoutes)
app.use('/api/public', publicRouter)

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "internal server error";

    console.error("Global error handler:", err);

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message
    });
});
module.exports = app;