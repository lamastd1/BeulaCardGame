const socket = io('ws://localhost:3500')

const msgInput = document.querySelector('#message')
const nameInput = document.querySelector('#name')
const chatRoom = document.querySelector('#room')
const activity = document.querySelector('.activity')
const usersList = document.querySelector('.user-list')
const roomList = document.querySelector('.room-list')
const chatDisplay = document.querySelector('.chat-display')

const userHand = document.querySelector('.user-hand')


function sendMessage(e) {
    e.preventDefault()
    if (nameInput.value && msgInput.value && chatRoom.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        })
        msgInput.value = ""
    }
    msgInput.focus()
}

function enterRoom(e) {

    e.preventDefault()
    if (nameInput.value && chatRoom.value) {
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: chatRoom.value,
            confirmed: false
        })
    } else {
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: "",
            confirmed: false
        })
    }
    var usernameForm = document.getElementById("form-id");
    usernameForm.innerHTML = '';
}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage)

document.querySelector('.form-join')
    .addEventListener('submit', enterRoom)

// document.querySelector('.startGameButton')
//     .addEventListener('click', confirmedGame)

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value)
})

// Listen for messages 
socket.on("message", (data) => {
    activity.textContent = ""
    const { name, text, time } = data
    const li = document.createElement('li')
    li.className = 'post'
    if (name === nameInput.value) li.className = 'post post--left'
    if (name !== nameInput.value && name !== 'Admin') li.className = 'post post--right'
    if (name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === nameInput.value
            ? 'post__header--user'
            : 'post__header--reply'
            }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`
    }
    document.querySelector('.chat-display').appendChild(li)

    chatDisplay.scrollTop = chatDisplay.scrollHeight
})

let activityTimer
socket.on("activity", (name) => {
    activity.textContent = `${name} is typing...`

    // Clear after 3 seconds 
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => {
        activity.textContent = ""
    }, 3000)
})

socket.on('userList', ({ users }) => {
    showUsers(users)
})

socket.on('roomList', ({ rooms }) => {
    showRooms(rooms)
})

// socket.on('userHand', ({ hand }) => {
//     showRooms(hand)
// })

// socket.on('confirmedGame', (name) => {
    
// })

function showUsers(users) {
    usersList.textContent = ''
    if (users) {
        usersList.innerHTML = `<em>Users in ${users[0].room}:</em>`
        users.forEach((user, i) => {
            usersList.textContent += ` ${user.name}`
            if (users.length > 1 && i !== users.length - 1) {
                usersList.textContent += ","
            }
        })
    }
    var startGameButton = document.getElementById('startGameButton');
    if (users.length == 5) {
        startGameButton.style.display = 'block';
    } else {
        startGameButton.style.display = 'none';
    }
}

function showRooms(rooms) {
    roomList.textContent = ''
    if (rooms) {
        roomList.innerHTML = '<em>Active Rooms:</em>'
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomList.textContent += ","
            }
        })
    }
}

function startGame() {
    socket.emit('confirmedGame', { name: nameInput.value });
    // console.log("Game has started");
    // var entirePageHTML = document.documentElement.outerHTML;
    // localStorage.setItem('savedHTML', entirePageHTML);
    // var savedHTML = localStorage.getItem('savedHTML');
    // console.log(savedHTML);
}

socket.on('gameResult', (data) => {
    console.log('Server response:', data.start);
    if (data.start === true) {
        // window.location.href = 'gamePage.html';
        socket.emit('dealCards', { name: nameInput.value })
    }
});

// socket.on('showHand', (hand) => {
//     console.log(hand)
//     const li = document.createElement('li')
//     li.innerHTML = `<div class="post__text">${hand}</div>`
//     document.querySelector('.user-hand').appendChild(li)
// })

socket.on('showHand', (data) => {
    let hand = data.param1; // Extracting 'hand' from the received data
    let name = data.param2; // Extracting 'hand' from the received data
    let users = data.param3;
    displayHand(hand, name, users); // Call a function to display the hand
});

// Function to display the hand on the screen
function displayHand(hand, name, users) {

    if (nameInput.value === name) {
         // Assuming there is an element with id 'handDisplay' where you want to display the hand
        const handDisplay = document.getElementById('handDisplay');
        // Clear previous content
        handDisplay.innerHTML = '';
        // Create elements to display the hand
        const ul = document.createElement('ul');
        hand.forEach(card => {
            const li = document.createElement('li');
            li.textContent = card;
            ul.appendChild(li);
        });
        // Append the list to the display element
        handDisplay.appendChild(ul);
    }
}