import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3500
const ADMIN = "Admin"

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../views'));

app.get('/', (req, res) => {
    res.render(path.join(__dirname, '../views/index.ejs'));
  });

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/gamePage.html'));
});

app.use(express.static(path.join(__dirname, "../views")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

// state 
const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})

class Card {
    constructor(value, suit) {
      this.value = value;
      this.suit = suit;
    }
}
  
// const card = new Card('',, '');

const execAsync = promisify(exec);

async function callPythonScript() {
  const pythonScriptPath = 'make_move.py';
  const scriptArguments = ['argument1', 'argument2', 'argument3', 'argument4', 'argument5', 'argument6'];
  const command = `python ${pythonScriptPath} ${scriptArguments.join(' ')}`;

  try {
    // Use the promisified exec function
    const { stdout } = await execAsync(command);
    console.log(`Python script output: ${stdout}`);
  } catch (error) {
    console.error(`Error executing Python script: ${error}`);
  }
}

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`)

    // Upon connection - only to user 
    socket.emit('message', buildMsg(ADMIN, "Welcome to Chat App!"))

    socket.on('enterRoom', ({ name, room }) => {

        if (room != "") {
            room = room + "private"
        } else {
            room = assignToRoom()
        } 
        // leave previous room 
        const prevRoom = getUser(socket.id)?.room

        if (prevRoom) {
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`))
        }
        
        var confirmed = false;
        const user = activateUser(socket.id, name, room, confirmed)

        // Cannot update previous room users list until after the state update in activate user 
        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            })
        }

        // join room 
        socket.join(user.room)

        // To user who joined 
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`))

        // To everyone else 
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`))

        // Update user list for room 
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        })

        // Update rooms list for everyone 
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        })
        console.log("Confirmed: " + user.confirmed);
    })

    // When user disconnects - to all others 
    socket.on('disconnect', () => {
        const user = getUser(socket.id)
        userLeavesApp(socket.id)

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`))

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            })

            io.emit('roomList', {
                rooms: getAllActiveRooms()
            })
        }

        console.log(`User ${socket.id} disconnected`)
    })

    // Listening for a message event 
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room
        if (room) {
            io.to(room).emit('message', buildMsg(name, text))
        }
    })

    // Listen for activity 
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room
        if (room) {
            socket.broadcast.to(room).emit('activity', name)
        }
    })

    socket.on('confirmedGame', (data) => {
        let start = true 
        let userRoom = "";
        console.log("OG Name: " + data.name)
        const rooms = getAllActiveRooms();
        rooms.forEach((room, i) => {
            const users = getUsersInRoom(room);
            users.forEach((user, i) => {
                if (data.name === user.name) {
                    userRoom = room;
                }
            });
        });
        let users = getUsersInRoom(userRoom);
        users.forEach((user, i) => {
            console.log("OUTSIDE Username: " + data.name + " " + user.name)
            if (data.name == user.name) {
                console.log("INSIDE Username: " + data.name + " " + user.name)
                user.confirmed = true
            }
        })
        users.forEach((user) => {
            if (user.confirmed == false) {
                start = false;
            }
        })
        io.to(userRoom).emit('gameResult', { start });        
    })
    socket.on('dealCards', (data) => {
        let name = data.name
        const rooms = getAllActiveRooms();
        rooms.forEach((room, i) => {
            const users = getUsersInRoom(room);
            users.forEach((user, i) => {
                if (data.name === user.name) {
                    let hand = [] 
                    for (let i = 1; i <= 5; i++) {
                        // Generate a random number between 1 and 13
                        let minValue = 1;
                        let maxValue = 13;
                        let randomInRange = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
                        hand.push(randomInRange)
                    }
                    io.emit('showHand', { param1: hand, param2: name, param3: users })
                    console.log("NAME: " + data.name + ",  HAND: " + hand)
                    callPythonScript()
                }
            });
        });
    })
})

function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

// User functions 
function activateUser(id, name, room, confirmed) {
    const user = { id, name, room, confirmed }
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])
    return user
}

function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

function getUser(id) {
    return UsersState.users.find(user => user.id === id)
}

function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room)
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)))
}

function findUserInRoom(name) {

    console.log("OG Name: " + name)
    const rooms = getAllActiveRooms();
    rooms.forEach((room, i) => {
        console.log("Next Room: " + room)
        const users = getUsersInRoom(room);
        users.forEach((user, i) => {
            console.log("Next User: " + user.name)
            if (name === user.name) {
                console.log("Returned room: " + room)
                return room;
            }
        });
    });
}
function assignToRoom() {
    let roomString = ""
    let rooms = getAllActiveRooms()
    rooms.forEach((room) => {
        if ((getUsersInRoom(room).length < 5) && (room.includes("private") == false)) {
            roomString = room
        }
    });
    if (roomString == "") {
        roomString = generateUniqueRoomId()
    }
    return roomString
}
function generateUniqueRoomId() {
    let newId = Math.random().toString(36).substring(2, 10);
    if (newId.includes("private")) {
        generateUniqueRoomId();
    } else {
        return newId
    }
}