const express = require('express');
const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
const port = 80;
const jwtKey = '9bF8Hqtb6U8SpelA';
const db = new Sequelize('mysql://jx5qFmWWMd:RZwCEENuEX@remotemysql.com:3306/jx5qFmWWMd');

const Messages = db.define('messages', {
    content: {
        type: Sequelize.STRING.BINARY
    },
    sender: {
        type: Sequelize.STRING
    }
}, {
    freezeTableName: true ,// Model tableName will be the same as the model name
    charset: 'utf8mb4' ,
});


Messages.sync({force: true});
const Users = db.define('users', {
    username: {
        type: Sequelize.STRING
    },
}, {
    freezeTableName: true // Model tableName will be the same as the model name
});
Users.sync({force: true});
const runDate = new Date() / 1000;

function authorized(func) {
    return (req, res) => {
        const token = req.header('Authorization');
        jwt.verify(token, jwtKey, (err, decoded) => {
            if (err)
                res.sendStatus(401);
            else {
                if (decoded.iat >= runDate)
                    func(req, res, decoded.username);
                else
                    res.sendStatus(400);
            }
        });
    }
}

app.get('/check_jwt', authorized((req, res, username) => {
    res.send(username)
}));
app.post('/login', (req, res) => {
    const username = req.body.username;
    Users.findAll({
        where: {username}
    }).then(users => {
        if (users.length)
            res.sendStatus(400);
        else {
            Users.create({username}).then(() =>
                res.send(jwt.sign({username}, jwtKey))
            );
            Messages.create({
                content: '',
                sender: username
            });
        }
    })
});


app.get('/messages', authorized((req, res) => {
    Messages.findAll({
        where: {
            [Sequelize.Op.and]: {
                createdAt: {
                    [Sequelize.Op.gte]: new Date() - 10 * 60 * 1000 // 10 minutes ago
                },
                id: {
                    [Sequelize.Op.gt]: parseInt(req.query.from || '0')
                }
            }
        }
    }).then(messages => res.send(messages));
}));

app.post('/send_message', authorized((req, res, username) => {
    if (req.body.content !== '')
        Messages.create({content: req.body.content, sender: username}).then(() => res.sendStatus(200)
        )
}));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));