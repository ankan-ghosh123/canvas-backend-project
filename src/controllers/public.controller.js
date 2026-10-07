const ApiError = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const { pool } = require('../db/db')

async function fetchBackgrounds(req, res) {
    try {
        console.log("its calling")
        const backgrounds =
            await pool.query(`select * from backgrounds where is_active=true`)

        return res.
            status(200).
            json(new ApiResponse(
                200,
                { backgrounds: backgrounds.rows },
                `backgrounds fetch successfully`
            ))

    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log(`error while fetching 
        backgrounds:-`, error.message)

        throw new ApiError(500, `internal server error`)
    }

}


async function fetchYtVideos(req, res) {

    try {
        const videos = await pool.query(
            `select * from yt_vid 
        order by added_at desc limit 5`
        )

        return res.
            status(200).
            json(new ApiResponse(
                200,
                { videos: videos.rows },
                `videos fetch successfully`
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log(`error while fetching yt
        videos:-`, error.message)

        throw new ApiError(500, `internal server error`)
    }
}
async function fetchPoster(req, res) {
    try {
        const posters = await pool.query(
            `select * from 
        ytposters 
         order by created_at desc limit 1  `
        )
        if (posters.rows.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, { poster: [] }, "no poster available")
            );
        }

        return res.
            status(200).
            json(new ApiResponse(
                200,
                { posters: posters.rows[0] },
                `poster fetch successfully`
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log(`error while fetching yt
        poster:-`, error.message)

        throw new ApiError(500, `internal server error`)
    }

}


async function fetchAusersProfile(req, res) {
    try {
        const user_id = req.params.id
        const cursor = req.query.cursor
        const limit = Math.min(Number(req.query.limit) || 10, 50)
        if (limit <= 0) {
            throw new ApiError(400, "limit must be positive number")
        }
        if (!user_id) {
            throw new ApiError(400, "user id is missing")
        }

        let created_at; let post_id;
        try {
            if (cursor) {

                ({ created_at, post_id } = JSON.parse(Buffer.from(cursor, 'base64').toString()))
            }
        } catch (error) {
            throw new ApiError(400, error.message || "invalid cursor")
        }
        if (cursor) {
            if (!(created_at && post_id))
                throw new ApiError(400, "cursor have empty property")
        }

        const getuser = await pool.query(
            `select fullname,avatar_url
          from users 
          where id=$1`,
            [user_id]

        )
        if (getuser.rows.length === 0) {
            throw new ApiError(404, "user not find")
        }
        const user = getuser.rows[0]

        const query = cursor
            ?
            ` select *from 
            posts
            where user_id=$1
            and 
            (created_at,post_id)<($2,$3)
            order by  created_at desc ,post_id desc
            limit $4`

            : `select *from 
         posts
         where user_id=$1 
         order by created_at desc ,post_id desc 
         limit $2`

        const parameters = cursor
            ? [user_id, created_at, post_id, limit + 1]
            : [user_id, limit + 1]
        const resultData = await pool.query(query, parameters)
        const has_more = resultData.rows.length > limit
        const posts = has_more
            ? resultData.rows.slice(0, limit)
            : resultData.rows
        if (!has_more && posts.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        user: user,
                        posts: posts,
                        has_more: has_more,
                        cursor: null
                    },
                    "no posts to sned"
                )
            )
        }
        const last = posts[posts.length - 1]
        const next_created_at = last.created_at
        const next_post_id = last.post_id
        const next_cursor = has_more
            ? Buffer.from(JSON.stringify({
                created_at: next_created_at,
                post_id: next_post_id
            })).toString('base64')
            : null
        return res.status(200).json(
            new ApiResponse(200, {
                user: user,
                posts: posts,
                has_more: has_more,
                cursor: next_cursor
            },
                'user profile  fetched successfully'
            )
        )
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500,
            `something went wrong while
                        fetching the profile`
        )
    }
}

async function fetchGlobalFeed(req, res) {


    try {
        const limit = Math.min(Number(req.query.limit) || 10, 50)
        if (limit <= 0) {
            throw new ApiError(400, "limit must be positive number")
        }
        const cursor = req.query.cursor
        let created_at; let post_id;

        try {
            if (cursor) {
                ({ created_at, post_id } = JSON.parse(Buffer.from(cursor, 'base64').toString()));
            }
        } catch (error) {
            throw new ApiError(400, error.message || `
        invalid cursor`)
        }
        if (cursor) {
            if (!(created_at && post_id))
                throw new ApiError(400, "cursor have empty property")
        }

        const query = cursor
            ? `
       select u.fullname,u.avatar_url,p.* 
       from 
       posts as p 
       join
       users as u
       on p.user_id=u.id
       where (p.created_at,p.post_id)<($1,$2)
       order by p.created_at desc,p.post_id desc
       limit $3
       `
            : `select u.fullname,u.avatar_url,p.* 
       from 
       posts as p join users as u
       on p.user_id=u.id
       order by p.created_at desc,p.post_id desc
       limit $1
       `
        const parameters = cursor
            ? [created_at, post_id, limit + 1] : [limit + 1]

        const resultData = await pool.query(query, parameters)

        const has_more = resultData.rows.length > limit
        const posts = has_more ? resultData.rows.slice(0, limit)
            : resultData.rows
        if (!has_more && posts.length === 0) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        posts,
                        has_more: has_more,
                        cursor: null
                    },
                    "no more data to send "
                )
            )
        }


        const last = posts[posts.length - 1]
        const next_created_at = last.created_at
        const next_post_id = last.post_id
        const next_cursor = has_more
            ? Buffer.from(JSON.stringify({
                created_at: next_created_at,
                post_id: next_post_id
            })).toString('base64')
            : null
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    posts: posts,
                    has_more: has_more,
                    cursor: next_cursor
                },
                has_more ? "post fetched successfully"
                    : "no more data to send"
            )
        )

    } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError(500,
            `something went wrong while
             fetching the posts`)
    }
}
module.exports = {
    fetchBackgrounds,
    fetchYtVideos,
    fetchPoster,
    fetchAusersProfile,
    fetchGlobalFeed
}
