const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const server = express();

const mongoose = require('./db/mongoose');
const { List, Task, User } = require('./db/models');
const { authenticate, verifySession } = require('./middleware/token')
/* MIDDLEWARE */

//load MiddleWare
server.use(bodyParser.json());

// CORS HEARDER MIDDLEWARE
server.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept , x-access-token ,  x-refresh-token , _id");
    res.header("Access-Control-Expose-Headers", "x-access-token,x-refresh-token");
    next();
});

// END middleware 

/*ROUTE HANDLERS*/

/*LIST ROUTES*/

/**
 * GET /lists
 * Purpose: get all lists
 * 
*/
server.get('/', (req, res) => {

    return res.status(200).json({ message: 'you are welcome from my API!!' });
});

/**
 * GET /lists
 * Purpose: get all lists
 * 
*/
server.get('/lists', authenticate, (req, res) => {

    // we want return an array of all the lists that belong to the authenticate user
    List.find({
        _userId: req.user_id
    }).then(data => {
        return res.status(200).json(data);
    }).catch(err => {
        return res.status(500).json('Error during fetch');
    })
});

/**
 * POST /lists
 * Purpose: Create a list
 * 
*/
server.post('/lists', authenticate, (req, res) => {
    const title = req.body.title;
    const _userId = req.user_id;
    let newList = new List({ title, _userId });

    newList.save()
        .then(data => {
            return res.status(201).json(data);
        }).catch(err => {
            return res.status(500).json(err);
        })
});

/**
 * PATCH /lists/:id
 * Purpose: update a specified list
*/
server.patch('/lists/:id', authenticate, (req, res) => {
    const _userId = req.user_id;

    List.findOneAndUpdate(
        {
            _id: req.params.id,
            _userId
        }
        , {
            $set: req.body
        }).then(data => {
            return res.status(200).json(data);
        }).catch(err => {
            return res.sendStatus(500);
        })
});

/**
 * DELETE /lists/:id
 * Purpose: Delete a specified list
*/
server.delete('/lists/:id', authenticate, (req, res) => {
    const _userId = req.user_id;

    List.findByIdAndRemove({ _id: req.params.id, _userId })
        .then(data => {
            deleteTasksFromList(data._id);
            return res.status(200).json('OK')
        }).catch(err => {
            return res.status(500).json(err);
        })

});

/* TASKS ROUTES */

/**
 * get All tasks by listId
 * Purpose: get tasks
 */
server.get('/lists/:listId/tasks', authenticate, (req, res) => {
    Task.find({ _listId: req.params.listId })
        .then(data => {
            res.status(200).json(data);
        }).catch(err => {
            return res.status(500).json(err);
        })
})

/**
 * Create new tasks for a lists
 * Purpose: create a new tasks
 */
server.post('/lists/:listId/tasks', authenticate, (req, res) => {
    const _userId = req.user_id;

    List.findOne({
        _id: req.params.listId,
        _userId
    }).then((list) => {
        if (!list) {
            // Can not edit list because it is not found 
            return false;
        }
        //Can edit list cause it is found
        return true;
    }).then((canEdit) => {
        if (canEdit) {
            const newTask = new Task({
                title: req.body.title,
                _listId: req.params.listId
            });
            newTask.save()
                .then((data) => {
                    return res.status(200).json(data);
                });
        } else {
            res.sendStatus(404);
        }
    }).catch((err) => {
        return res.status(500).json(err);
    });
})

/**
 * Update tasks for a lists
 * Purpose: create a new tasks
 */
server.patch('/lists/:listId/tasks/:taskId', authenticate, async (req, res) => {
    const _userId = req.user_id;

    try {
        const list = await List.findOne({
            _id: req.params.listId,
            _userId
        });
        if (list) {
            const task = await Task.findOneAndUpdate(
                {
                    _id: req.params.taskId,
                    _listId: req.params.listId
                }
                , {
                    $set: req.body
                })

            return res.status(200).json('OK');
        }
        return res.sendStatus(404)

    } catch (error) {
        return res.sendStatus(500);
    }
})

// 
/**
 * Get Data for Chart Line
 * Purpose get list whit number of her tasks 
*/

server.get('/chartline/data', authenticate, async (req, res) => {
    const _userId = req.user_id;
    try {
        let lists = await List.find({ _userId });
        let data = lists.map(async (value) => {
            let length = await Task.find({ _listId: value._id }).countDocuments();
            return { title: value.title.split(' ')[0], size: length }
        });
        data = await Promise.all(data);
        res.status(200).json(data);
    } catch (error) {
        return res.status(500).json(error);
    }
})

server.get('/chartPie/data', authenticate, async (req, res) => {
    const _userId = req.user_id;
    let data = [];
    try {

        // get all list for authenticate user
        let lists = await List.find({ _userId });
        data = lists.map(async (value) => {
            let tasks = [];
            // for each items of list get her tasks
            tasks = await Task.find({ _listId: value._id });
            return tasks;
        })

        data = await Promise.all(data);
        let finalData = [];

        data.forEach(d => {
            finalData.push(...d);
        })

        let initresult = [
            { name: true, value: 0 },
            { name: false, value: 0 }
        ];

        // reduce arrays and perform group by 
        finalData = finalData.reduce((accumulateur, valeur) => {
            let val = accumulateur.find(v => v.name === valeur.complete)
            val.value += 1;

            return accumulateur;
        }, initresult);

        finalData = finalData.map(val => ({ name: val.name ? 'complele' : 'uncomplete', value: val.value }));

        return res.status(200).json(finalData);
    } catch (error) {
        return res.status(500).json(error);
    }
})
/**
 * Delete task for a lists
 * Purpose: delete a task
 */
server.delete('/lists/:listId/tasks/:taskId', authenticate, async (req, res) => {
    const _userId = req.user_id;

    try {
        const list = await List.findOne({
            _id: req.params.listId,
            _userId
        });
        if (list) {
            const task = await Task.findOneAndRemove(
                {
                    _id: req.params.taskId,
                    _listId: req.params.listId
                })
            return res.status(200).json('OK')
        }
        return res.sendStatus(404)

    } catch (error) {
        return res.sendStatus(500);
    }
})

/* User routes */

/**
 * POST /users
 * Purpose: Sign Up 
*/

server.post('/users', (req, res) => {
    // user sign up
    let body = req.body
    let newUser = new User(body);
    newUser.save().then((user) => {
        return newUser.createSession();
    }).then((refreshToken) => {
        return newUser.generateAccessAuthToken().then(accessToken => {
            return { accessToken, refreshToken };
        })
    }).then((authToken) => {
        return res
            .header('x-refresh-token', authToken.refreshToken)
            .header('x-access-token', authToken.accessToken)
            .send(newUser);
    }).catch(err => {
        return res.status(500).json(err)
    })
})

/**
 * POST /users/login
 * Purpose:Login
*/
server.post('/users/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    let us;
    User.findByCredentials(email, password).then((user) => {
        us = user;
        return user.createSession().then((refreshToken) => {
            return user.generateAccessAuthToken().then((accessToken) => {
                // Access auth token 
                return { accessToken, refreshToken }
            })
        })
    }).then((authToken) => {
        return res
            .header('x-refresh-token', authToken.refreshToken)
            .header('x-access-token', authToken.accessToken)
            .send(us);
    }).catch(err => {
        (err.message) ? res.status(404).json(err) : res.status(500).json(err)
    })
})

/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
*/
server.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user is authenticated
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken })
    }).catch((e) => {
        res.status(400).json(e)
    });
})

/* Delete tasks from list*/

let deleteTasksFromList = (_listId) => {
    Task.deleteMany({
        _listId
    }).then(() => {
        console.log('OK delete tasks for lists');
    });
}



server.listen(parseInt(process.env.PORT || "5000"), () => {
    console.log(`Serveur listen on ${process.env.PORT}`);
})
