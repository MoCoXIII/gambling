let room;
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('roomId');
let password = urlParams.get('password');
history.replaceState({}, '', window.location.pathname);  // clears arguments from the URL
askRoomId();
askPassword();
function askRoomId() {
    if (!roomId) {
        const roomIdInput = document.createElement('input');
        roomIdInput.type = 'text';
        roomIdInput.placeholder = 'Room ID';
        document.body.appendChild(roomIdInput);
        roomIdInput.focus();
        roomIdInput.addEventListener('keyup', event => {
            if (event.key === 'Enter') {
                roomId = roomIdInput.value;
                document.body.removeChild(roomIdInput);
                askPassword();
            }
        });
    }
}

function askPassword() {
    if (roomId) {
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.placeholder = 'Password';
        document.body.appendChild(passwordInput);
        passwordInput.focus();
        passwordInput.addEventListener('keyup', event => {
            if (event.key === 'Enter') {
                password = passwordInput.value;
                if (password) {
                    password = passwordInput.value;
                    document.body.removeChild(passwordInput);
                    connect();
                }
            }
        });
    }
}

function connect() {
    (async () => {
        const { joinRoom, selfId } = await import('https://esm.run/trystero');
        const config = { appId: 'mocoxiii-middl', password: password };
        room = await joinRoom(config, roomId);
        console.log("You joined as", selfId);
        room.onPeerJoin(peerId => console.log(`${peerId} joined`));
        room.onPeerLeave(peerId => console.log(`${peerId} left`));

        let [sendMessage, getMessage] = room.makeAction('message');

        getMessage((message, peerId) => {
            console.log(`Message from ${peerId}: ${message}`);
        });

        const leaveButton = document.createElement('button');
        leaveButton.textContent = 'Leave';
        leaveButton.addEventListener('click', () => {
            room.leave();
            window.location.reload();
        });
        document.body.appendChild(leaveButton);

        const testButton = document.createElement('button');
        testButton.textContent = 'Test';
        testButton.addEventListener('click', () => {
            sendMessage("test");
        });
        document.body.appendChild(testButton);
    })();
}