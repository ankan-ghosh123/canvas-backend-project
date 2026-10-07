const ApiError = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const { pool } = require('../db/db')
const sendEmail = require('../services/brevoEmail.service')
async function markPoem(req, res) {
    const { post_id } = req.params
    try {
        if (!post_id) throw new ApiError(400, "post id is missing")
        const query = `insert into post_tracking
                     (post_id,status)
                     values
                     ($1,$2) returning*`

        const dbinsert = await pool.query(
            query, [post_id, 'MARKED']
        )

        if (dbinsert.rows.length === 0) {
            throw new ApiError(400, 'porblem inserting data')
        }

        return res.
            status(201).
            json(new ApiResponse(
                201,
                {
                    markedPost: dbinsert.rows[0]
                },
                "resource created successfully"
            ))

    } catch (error) {
        if (error instanceof ApiError) throw error
        console.log("error is:-", error.message)

        // the post_id u try to insert is already present    
        if (error.code === '23505')
            throw new ApiError(409, `post is already
                                        marked`)

        //post not found in post table->post_id deleted
        //or curropted                                      
        if (error.code === '23503')
            throw new ApiError(409, `post not found`)

        throw new ApiError(500, "internal server error")
    }

}
async function fetchMarkPoems(req, res) {

    try {
        const query = `
   select u.fullname,u.avatar_url,p.*,pt.status
   from
   post_tracking as pt
   join 
   posts as p 
   on p.post_id=pt.post_id
   join 
   users as u
   on p.user_id=u.id
   where pt.status in ('MARKED','CANDIDATE')
   order by pt.created_at desc
   `//fixed 
        const result = await pool.query(query)
        if (result.rows.length === 0) {
            return res.
                status(200).
                json(new ApiResponse(
                    200,
                    { markedPosts: [] },
                    `currently no post are marked`
                ))
        }
        return res.
            status(200).
            json(
                new ApiResponse(
                    200,
                    { markedPosts: result.rows },//fixed-invalid string literal
                    "marked posts fetched successfully"
                )
            )

    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("fetchMarkPoems error:", error);
        throw new ApiError(500, "internal server error");

    }
}

async function unmarkPoems(req, res) {
    try {
        const { post_id } = req.params
        if (!post_id) {
            throw new ApiError(400, `post id for a marked 
            post is required`)
        }



        const query = `delete 
    from post_tracking
     where post_id=$1 and status='MARKED' RETURNING *`
        const result = await pool.query(query, [post_id])
        if (result.rows.length === 0) {
            throw new ApiError(400, `u can not unmark this post,please 
                remove this post from candidate or poem of week`)
        }
        return res.status(200).
            json(new ApiResponse(200,
                { deleted_row: result.rows[0] },
                `post unmarked successfully`
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error
        //works only when u try to inser or update 
        //  if (error.code === '23503')
        //    throw new ApiError(409, `post not found`)
        console.log('unmark poem error-', error.message)
        throw new ApiError(500, `internal server error`)
    }
}

async function setCandidatePoem(req, res) {
    const client = await pool.connect();
    try {
        const { post_id } = req.params
        if (!post_id) {
            throw new ApiError(400, `post id for a marked 
            post is required`)
        }

        await client.query('BEGIN')

        //older post status with candidate demote to marked
        await client.query(`update post_tracking
                       set status=$1
                       where status=$2 RETURNING*`,
            ['MARKED', 'CANDIDATE'])
        //new candidate is set
        const setNewCandidate =
            await client.query(
                `update post_tracking
                set status=$1
                  where post_id=$2 and
                     status='MARKED'returning*`,
                ['CANDIDATE', post_id])
        //only marked poem can be candidate
        if (setNewCandidate.rows.length === 0) {
            throw new ApiError(400, `post not found or
                    the post is already marked
                    as candidate or porm of week or post is not yet marked`)
        }
        await client.query('COMMIT')



        return res.status(200).
            json(new ApiResponse(200,
                { candidate: setNewCandidate.rows[0] },
                `poem is set to Candidate`
            ))

    } catch (error) {
        await client.query('ROLLBACK')

        if (error instanceof ApiError) throw error

        throw new ApiError(500, 'internal server error')
    }
    finally {

        client.release();

    }
}

async function removeFromCandidatePoem(req, res) {
    try {
        //update status of last candidate back to marked
        const updateCurrentCandToMarked
            = await pool.query(`update post_tracking
                       set status=$1
                       where status=$2 RETURNING*`,
                ['MARKED', 'CANDIDATE'])


        if (updateCurrentCandToMarked.rows.length === 0) {
            throw new ApiError(404, "no candidate poem found to remove");
        }
        return res.status(200).
            json(new ApiResponse(200,
                { post: updateCurrentCandToMarked.rows[0] },
                `post removed from candidate successfully`
            ))

    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log(`error while removeing a 
        candidate:-`, error.message)

        throw new ApiError(500, "internal server error")
    }
}
async function setAsPoemOfWeek(req, res) {

    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const post_id_pow = await client.query(
            `select post_id 
        from post_tracking 
        where status='POEM_OF_WEEK'`
        )
        //only delete comments if poem of week exist
        if (post_id_pow.rows.length > 0) {
            const post_id = post_id_pow.rows[0].post_id

            await client.query(`
        delete from comments
        where post_id=$1`, [post_id])

        }


        await client.query(
            `delete from post_tracking
         where status='POEM_OF_WEEK'`

        )

        const poemOfWeek =
            await client.query(
                `update post_tracking
           set status=$1
               where status=$2 returning*`,
                ['POEM_OF_WEEK', 'CANDIDATE']
            )
        if (poemOfWeek.rows.length === 0) {
            throw new ApiError(404, `candidate post
                                     is missing`)
        }




        await client.query('COMMIT')
        const getuser = pool.query(`
    select u.fullname,u.email,p.poem_name
    from user u
    join posts p
    on p.user_id=u.id
    where p.post_id=$1`,
            [poemOfWeek.rows[0].post_id])


        return res.status(200).
            json(new ApiResponse(
                200,
                { post: poemOfWeek.rows[0] },
                'poem of the week set successfully'
            ))

    } catch (error) {
        await client.query('ROLLBACK')
        if (error instanceof ApiError) throw error

        console.log(`error while setting
         poem of week:-`, error.message)

        throw new ApiError(500, "internal server error")
    }
    finally {
        client.release();
    }

}

async function deletePoemOfWeek(req, res) {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        const post_id_pow = await client.query(
            `select post_id 
        from post_tracking 
        where status='POEM_OF_WEEK'`
        )

        if (post_id_pow.rows.length === 0) {
            throw new ApiError(404, "no poem of week exists");
        }
        const post_id = post_id_pow.rows[0].post_id
        const delete_comments =
            await client.query(`
        delete from comments
        where post_id=$1`, [post_id])

        const deleted = await client.query(
            `delete from post_tracking
           where status='POEM_OF_WEEK'returning*`
        )

        await client.query('COMMIT')

        return res.status(200).
            json(new ApiResponse(
                200,
                { deletedRow: deleted.rows[0] },
                `poem of week deleted successfully`
            ))

    } catch (error) {
        await client.query('ROLLBACK')
        if (error instanceof ApiError) throw error

        console.log(`error while deleteing poem of
         week:-`, error.message)

        throw new ApiError(500, "internal server error")

    }
    finally {
        client.release()
    }
}
async function fetchPoemOfweek(req, res) {
    try {

        const poemOfWeeK = await pool.query
            (`select u.fullname,u.avatar_url,
        p.*,pt.status
        from post_tracking pt
        join posts p
        on p.post_id=pt.post_id
        join users u
        on p.user_id=u.id
        where pt.status='POEM_OF_WEEK'`)
        if (poemOfWeeK.rows.length === 0) {
            return res.
                status(200).
                json(new ApiResponse(200,
                    { poemOfWeeK: null },
                    `no poem of week exist
                    currently`
                ))
        }
        return res.
            status(200).
            json(new ApiResponse(
                200,
                { poemOfWeek: poemOfWeeK.rows[0] },
                'get poem of week successfully'
            ))

    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log(`error while fetching
         poem of week:-`, error.message)

        throw new ApiError(500, 'internal server error')
    }

}

module.exports = {
    markPoem,
    fetchMarkPoems,
    unmarkPoems,
    setCandidatePoem,
    setAsPoemOfWeek,
    removeFromCandidatePoem,
    deletePoemOfWeek,
    fetchPoemOfweek
}
//fetchpoem of week in feed page