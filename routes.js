const express = require('express')
const router = express.Router()

const pool = require('./database_config')

const crypto = require('crypto')
const aes256 = require('aes256')


// Check Authentication using session

const isAuth = (req, res, next) => {
    if (req.session.isAuth) next()
    else res.redirect('login')
}

// main page

router.get('/', isAuth, (req, res) => {
    res.redirect('welcome')
})



// login page

router.get('/login', (req, res) => {
    res.render('login')
})



// verify user

router.post('/login', (req, res) => {

    pool.getConnection(function (err, con) {
        if (err) throw err;

        const { username, password } = req.body
        const sql = "SELECT publickey, privatekey FROM user where verifyUser(?, ?, username, password)"

        con.query(sql, [username, md5Hash(password, username)], (err, result) => {
            con.release()
            if (err) throw err

            if (result.length != 1) res.render('login', { error : "data incorrect" });
            else {
                req.session.isAuth = true
                req.session.username = username

                const publicKey = result[0].publickey

                const privateKey = aes256.decrypt(password, result[0].privatekey)

                req.session.userKeys = {
                    privateKey: privateKey,
                    publicKey: publicKey
                }

                res.redirect('/welcome')
            }
        })
    })
})



// register handle

router.get('/register', (req, res) => {
    res.render('register')
})



// register post

router.post('/register', (req, res) => {

    pool.getConnection(function (err, con) {
        if (err) throw err;

        const sql = "INSERT INTO user VALUES ?"
        const { username, password, confirmPassword } = req.body

        if (password !== confirmPassword) {
            res.render('register', { error : "Passwords doesn't match" })
            return
        }

        const user = crypto.createECDH('secp256k1')
        user.generateKeys()

        const publicKey = user.getPublicKey().toString('base64')
        const encryptedPrivateKey = aes256.encrypt(password, user.getPrivateKey().toString('base64'));

        const value = [[username, md5Hash(password, username), publicKey, encryptedPrivateKey]]

        con.query(sql, [value], (err, result) => {
            con.release()
            if (err) throw err

            if (result.affectedRows > 0) {
                usersCache.del(userCacheName)
                res.redirect('/login')
            }
            else res.render('register', { error : "Couldn't create the account" })
        });
    })
})


function md5Hash (str, secret) {
    const md5Hasher = crypto.createHmac("md5", secret)
    const hash = md5Hasher.update(str).digest("hex")
    return hash
}



// logout

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) throw err
    })
    res.redirect('login')
})




// Cache the list of users

const NodeCache = require('node-cache')
const usersCache = new NodeCache()
const userCacheName = 'user'

// welcome

router.get('/welcome', isAuth, (req, res) => {

    if (usersCache.has(userCacheName)) {
        users = usersCache.get(userCacheName)
        return res.render('welcome', { user: req.session.username, users })
    }

    pool.getConnection(function (err, con) {
        if (err) throw err;
        
        const sql = "SELECT username, publickey FROM user"

        con.query(sql, (err, users) => {
            con.release()
            if (err) throw err

            req.session.users = users
            usersCache.set(userCacheName, users)
            res.render('welcome', { user: req.session.username, users })
        })
    })
})



// chat room

router.get('/chat/:othername/:otherPublicKey', isAuth, (req, res) => {
    const { othername, otherPublicKey } = req.params

    const myPrivateKey = req.session.userKeys.privateKey

    const myPublicKey = req.session.userKeys.publicKey

    const user = crypto.createECDH('secp256k1')
    user.setPrivateKey(myPrivateKey, 'base64')
    user.setPublicKey(myPublicKey, 'base64')

    const sharedKey = user.computeSecret(otherPublicKey, 'base64', 'hex')

    req.session.friend = othername
    req.session.friendPubKey = otherPublicKey
    req.session.sharedKey = sharedKey

    res.render('chat', { user : req.session.username, friend : othername, key : sharedKey })
})



module.exports = router