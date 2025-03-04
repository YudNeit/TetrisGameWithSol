    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract Tetris {
        uint8 constant WIDTH = 8;
        uint8 constant HEIGHT = 8;
        uint8 dropInterval = 2; // Khoảng thời gian giữa các lần rơi (giây) 

        address owner;

        struct Player {
            address playerAddress;
            uint256 score;
            Piece currentPiece;
            bool isGameOver;
            uint256 lastDropTime;
            uint256 lastClearTime;
            uint8 nextPieceType;
        }

        struct Room {
            uint256 id;
            address owner;
            uint8[HEIGHT][WIDTH] board;
            mapping(address => Player) players;
            address[] playerAddresses;
            bool isActive;
            bool isStart;
        }

        mapping(uint256 => Room) public rooms;
        uint256 public nextRoomId;

        struct Piece {
            uint8 Ptype;
            uint8[4][4] shape; 
            uint8 rotation;
            uint8 x;
            uint8 y;
        }
    
        event GameStarted();
        event PieceMoved(uint8 x, uint8 y);
        event PieceRotated(uint8 rotation);
        event LineCleared(uint256 newScore);
        event NextPieceSelected(address indexed player, uint8 pieceType);
        event PlayerJoined(uint256 roomId);
        event GameRestarted(uint256 roomId);
        event GameOver();

        constructor() {
            owner = msg.sender;
        }

        modifier onlyOwner() {
            require(msg.sender == owner, "Only owner can perform this action");
            _;
        }
        
        modifier onlyPlaying(uint256 roomId) {
            require(rooms[roomId].isActive, "No active game found ");
            _;
        }

        modifier onlyPlayer(uint256 roomId) {
            require(rooms[roomId].players[msg.sender].playerAddress == msg.sender, "You are not a player in this room");
            _;
        }


        function createRoom() public {
            require(rooms[nextRoomId].isActive == false, "Room already exists");

            Room storage room = rooms[nextRoomId];
            room.id = nextRoomId;
            room.owner = msg.sender;
            room.isActive = true;
            room.isStart = false;
            nextRoomId++;
        }

        function joinRoom(uint256 roomId) public {
            require(rooms[roomId].isActive, "Room does not exist");
            require(rooms[roomId].players[msg.sender].playerAddress == address(0), "Already in room");
            
            Player storage newPlayer = rooms[roomId].players[msg.sender];
            newPlayer.playerAddress = msg.sender;
            newPlayer.score = 0;
            newPlayer.isGameOver = false;
            newPlayer.lastDropTime = block.timestamp;
            newPlayer.lastClearTime = 0;
            
            clearBoard(roomId);

            rooms[roomId].playerAddresses.push(msg.sender);

            emit PlayerJoined(roomId);
        }


        function startGame(uint256 roomId) public onlyOwner {
            Room storage room = rooms[roomId];
            require(room.isActive, "Room does not exist or is inactive");
            require(!room.isStart, "Room have started");
            room.isStart = true;
            for (uint256 i = 0; i < room.playerAddresses.length; i++) {
                address playerAddress = room.playerAddresses[i];
                Player storage player = room.players[playerAddress];

                player.score = 0;
                player.isGameOver = false;
                clearBoard(roomId);
                spawnPiece(roomId, playerAddress);
            }

            emit GameStarted();
        }

        function clearBoard(uint256 roomId) internal {
            Room storage room = rooms[roomId];
            for (uint8 i = 0; i < HEIGHT; i++) {
                for (uint8 j = 0; j < WIDTH; j++) {
                    room.board[i][j] = 0;
                }
            }
        }

        function selectNextPiece(uint256 roomId, uint8 pieceType) external {
            require(pieceType < 7, "Invalid piece type");

            Player storage player = rooms[roomId].players[msg.sender];
            require(player.playerAddress != address(0), "Player not found in room");

            player.nextPieceType = pieceType;
            emit NextPieceSelected(msg.sender, pieceType);
        }

        function spawnPiece(uint256 roomId, address playerAddress) internal  {
            Player storage player = rooms[roomId].players[playerAddress];
            uint8 selectedPiece = player.nextPieceType; 
            
            if (selectedPiece == 0) {
                player.currentPiece.shape = [
                    [1, 1, 1, 1],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]; // Mảnh I
            } else if (selectedPiece == 1) {
                player.currentPiece.shape = [
                    [1, 1, 0, 0],
                    [1, 1, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]; // Mảnh O
            } else if (selectedPiece == 2) {
                player.currentPiece.shape = [
                    [0, 1, 1, 0],
                    [1, 1, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]; // Mảnh S
            } else if (selectedPiece == 3) {
                player.currentPiece.shape = [
                    [1, 1, 0, 0],
                    [0, 1, 1, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]; // Mảnh Z
            } else if (selectedPiece == 4) {
                player.currentPiece.shape = [
                    [0, 0, 1, 0],
                    [1, 1, 1, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]; // Mảnh L
            } else if (selectedPiece == 5) {
                player.currentPiece.shape = [
                    [1, 0, 0, 0],
                    [1, 1, 1, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]; // Mảnh J
            } else if (selectedPiece == 6) {
                player.currentPiece.shape = [
                    [0, 1, 0, 0],
                    [1, 1, 1, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ]; // Mảnh T
            }


            player.currentPiece.rotation = 0;
            player.currentPiece.Ptype = selectedPiece;
            player.currentPiece.x = WIDTH / 2 - 2;
            player.currentPiece.y = 0;

            emit PieceMoved(player.currentPiece.x, player.currentPiece.y);
            if (checkCollision(roomId,player.currentPiece.x, player.currentPiece.y, player.currentPiece.shape)) {
                player.isGameOver = true;
                rooms[roomId].isActive = false;
                emit GameOver();
            }
        }

        function updateGame(uint256 roomId) public {
            Player storage player = rooms[roomId].players[msg.sender];
            require(!player.isGameOver, "Game is over");

            // Kiểm tra nếu đã đến thời gian rơi tiếp theo
            if (block.timestamp >= player.lastDropTime + dropInterval) {
                bool canMove = movePiece(roomId, 0, 1);

                player.lastDropTime = block.timestamp;

                if (player.isGameOver) {
                    emit GameOver();
                }
            }
        }

        function movePiece(uint256 roomId, int8 dx, int8 dy) public returns (bool) {
            Player storage player = rooms[roomId].players[msg.sender];
            require(!player.isGameOver, "Game is over");
            require(rooms[roomId].isStart, "Room dont have started");

            uint8 newX = uint8(int8(player.currentPiece.x) + dx);
            uint8 newY = uint8(int8(player.currentPiece.y) + dy);

            if (newX <= WIDTH && newY <= HEIGHT) {
                if (!checkCollision(roomId, newX, newY, player.currentPiece.shape)) {
                    player.currentPiece.x = newX;
                    player.currentPiece.y = newY;
                    emit PieceMoved(player.currentPiece.x, player.currentPiece.y);
                    return true;
                } else if (dy > 0) {
                    lockPiece(roomId);
                }
            }
            return false;
        }

        function rotateMatrix(uint8[4][4] memory matrix) internal pure returns (uint8[4][4] memory) {
            uint8[4][4] memory rotated;
            for (uint8 i = 0; i < 4; i++) {
                for (uint8 j = 0; j < 4; j++) {
                    rotated[j][3 - i] = matrix[i][j];
                }
            }
            return rotated;
        }

        function rotatePiece(uint256 roomId) public {
            Player storage player = rooms[roomId].players[msg.sender];
            require(!player.isGameOver, "Game is over");
            player.currentPiece.rotation = (player.currentPiece.rotation + 1) % 4;

            uint8[4][4] memory rotatedShape;

            if (player.currentPiece.Ptype == 0) {
                if (player.currentPiece.rotation % 2 == 0) 
                    rotatedShape = [
                        [1, 1, 1, 1],
                        [0, 0, 0, 0],
                        [0, 0, 0, 0],
                        [0, 0, 0, 0]
                    ];
                else 
                    rotatedShape = [
                        [1, 0, 0, 0],
                        [1, 0, 0, 0],
                        [1, 0, 0, 0],
                        [1, 0, 0, 0]
                    ];
            } else if (player.currentPiece.Ptype == 1) {
                    rotatedShape =  [
                        [1, 1, 0, 0],
                        [1, 1, 0, 0],
                        [0, 0, 0, 0],
                        [0, 0, 0, 0]
                    ]; 
            } else if (player.currentPiece.Ptype == 2) {
                    if (player.currentPiece.rotation % 2 == 0) 
                    rotatedShape = [
                        [0, 1, 1, 0],
                        [1, 1, 0, 0],
                        [0, 0, 0, 0],
                        [0, 0, 0, 0]
                    ];
                    else
                    rotatedShape = [
                        [1, 0, 0, 0],
                        [1, 1, 0, 0],
                        [0, 1, 0, 0],
                        [0, 0, 0, 0]
                    ];
            } else if (player.currentPiece.Ptype == 3) {
                    if(player.currentPiece.rotation % 2 == 0)
                        rotatedShape =  [
                            [1, 1, 0, 0],
                            [0, 1, 1, 0],
                            [0, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else
                        rotatedShape =  [
                            [0, 1, 0, 0],
                            [1, 1, 0, 0],
                            [1, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
            } else if (player.currentPiece.Ptype == 4) {
                    if(player.currentPiece.rotation % 4 == 0)
                        rotatedShape = [
                            [0, 0, 1, 0],
                            [1, 1, 1, 0],
                            [0, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 1)
                        rotatedShape = [
                            [1, 0, 0, 0],
                            [1, 0, 0, 0],
                            [1, 1, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 2)
                        rotatedShape = [
                            [1, 1, 1, 0],
                            [1, 0, 0, 0],
                            [0, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 3)
                        rotatedShape = [
                            [1, 1, 0, 0],
                            [0, 1, 0, 0],
                            [0, 1, 0, 0],
                            [0, 0, 0, 0]
                        ];
            } else if (player.currentPiece.Ptype == 5) {
                    if(player.currentPiece.rotation % 4 == 0)
                        rotatedShape =  [
                            [1, 0, 0, 0],
                            [1, 1, 1, 0],
                            [0, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 1)
                        rotatedShape = [
                            [1, 1, 0, 0],
                            [1, 0, 0, 0],
                            [1, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 2)
                        rotatedShape = [
                            [1, 1, 1, 0],
                            [0, 0, 1, 0],
                            [0, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 3)
                        rotatedShape = [
                            [0, 1, 0, 0],
                            [0, 1, 0, 0],
                            [1, 1, 0, 0],
                            [0, 0, 0, 0]
                        ];
            } else if(player.currentPiece.Ptype == 6) {
                    if(player.currentPiece.rotation % 4 == 0)
                        rotatedShape =  [
                            [0, 1, 0, 0],
                            [1, 1, 1, 0],
                            [0, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 1)
                        rotatedShape = [
                            [1, 0, 0, 0],
                            [1, 1, 0, 0],
                            [1, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 2)
                        rotatedShape = [
                            [1, 1, 1, 0],
                            [0, 1, 0, 0],
                            [0, 0, 0, 0],
                            [0, 0, 0, 0]
                        ];
                    else if (player.currentPiece.rotation == 3)
                        rotatedShape = [
                            [0, 1, 0, 0],
                            [1, 1, 0, 0],
                            [0, 1, 0, 0],
                            [0, 0, 0, 0]
                        ];
            }
            
            if (!checkCollision(roomId, player.currentPiece.x, player.currentPiece.y, rotatedShape)) {
                player.currentPiece.shape = rotatedShape;
                emit PieceRotated(player.currentPiece.rotation);
            }
        }


        function checkCollision(uint256 roomId, uint8 x, uint8 y, uint8[4][4] memory shape) internal view returns (bool) {
            Room storage room = rooms[roomId];
        
            for (uint8 i = 0; i < 4; i++) {
                for (uint8 j = 0; j < 4; j++) {
                    if (shape[i][j] == 1) {
                        uint8 newX = x + j;
                        uint8 newY = y + i;
                        if (newX >= WIDTH || newY >= HEIGHT || room.board[newY][newX] > 0) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        function hardDropPiece(uint256 roomId) public  {
            Player storage player = rooms[roomId].players[msg.sender];
            require(!player.isGameOver, "Game is over");

            uint8 newY = player.currentPiece.y;
            
            while (!checkCollision(roomId, player.currentPiece.x, newY + 1, player.currentPiece.shape)) {
                newY++;
            }

            player.currentPiece.y = newY;
            emit PieceMoved(player.currentPiece.x, player.currentPiece.y);

            lockPiece(roomId);
            
            if (player.isGameOver) {
                emit GameOver();
            }
        }

        function lockPiece(uint256 roomId) internal {
            Player storage player = rooms[roomId].players[msg.sender];
            Room storage room = rooms[roomId];

            uint8 playerIndex = uint8(getPlayerIndex(room, msg.sender));
            bool collisionDetected = false;

            // Kiểm tra trước khi lock
            for (uint8 i = 0; i < 4; i++) {
                for (uint8 j = 0; j < 4; j++) {
                    if (player.currentPiece.shape[i][j] == 1) {
                        uint8 x = player.currentPiece.x + j;
                        uint8 y = player.currentPiece.y + i;
                        
                        // Nếu vị trí đã có piece khác, đánh dấu xung đột
                        if (y < HEIGHT && room.board[y][x] != 0) {
                            collisionDetected = true;
                        }
                    }
                }
            }

            if (collisionDetected) {
                player.currentPiece.y = 0;
                emit PieceMoved(player.currentPiece.x, player.currentPiece.y);
                return;
            }

            // Nếu không có va chạm, tiến hành lock piece
            for (uint8 i = 0; i < 4; i++) {
                for (uint8 j = 0; j < 4; j++) {
                    if (player.currentPiece.shape[i][j] == 1) {
                        uint8 x = player.currentPiece.x + j;
                        uint8 y = player.currentPiece.y + i;
                        if (y < HEIGHT) {
                            room.board[y][x] = playerIndex;
                        }
                    }
                }
            }

            clearLines(roomId);
            spawnPiece(roomId, player.playerAddress);
        }

        function getPlayerIndex(Room storage room, address playerAddress) internal view returns (uint8) {
            for (uint8 i = 0; i < room.playerAddresses.length; i++) {
                if (room.playerAddresses[i] == playerAddress) {
                    return i + 1; 
                }
            }
            return 0;
        }

        function clearLines(uint256 roomId) internal {
            Room storage room = rooms[roomId];
            Player storage player = room.players[msg.sender];
            
            uint256 cleared = 0;

            for (uint8 i = 0; i < HEIGHT; i++) {
                bool full = true;

                // Kiểm tra nếu hàng i đã đầy đủ (không có ô nào = 0)
                for (uint8 j = 0; j < WIDTH; j++) {
                    if (room.board[i][j] == 0) { // Chỉ cần có ô 0 là chưa đầy
                        full = false;
                        break;
                    }
                }

                if (full) {
                    cleared++;

                    // Dịch toàn bộ board xuống
                    for (uint8 k = i; k > 0; k--) {
                        for (uint8 j = 0; j < WIDTH; j++) {
                            room.board[k][j] = room.board[k - 1][j];
                        }
                    }

                    // Xóa hàng trên cùng
                    for (uint8 j = 0; j < WIDTH; j++) {
                        room.board[0][j] = 0;
                    }
                }
            }

            if (cleared > 0) {
                player.score += cleared * 10;
                emit LineCleared(player.score);
            }
        }


        function getBoard(uint256 roomId) public view  returns (uint8[HEIGHT][WIDTH] memory) {
            Room storage room = rooms[roomId];
            return room.board;
        }

        function getScore(uint256 roomId) public view returns (uint256, uint256) {

            address[] storage players = rooms[roomId].playerAddresses;
            require(players.length > 1, "No enemy available");

            address enemyAddress = address(0);
            
            for (uint256 i = 0; i < players.length; i++) {
                if (players[i] != msg.sender) {
                    enemyAddress = players[i];
                    break;
                }
            }

            require(enemyAddress != address(0), "Enemy not found");

            Player storage player = rooms[roomId].players[msg.sender];
            Player storage enemy = rooms[roomId].players[enemyAddress];

            return (player.score, enemy.score);
        }


        function getCurrentPiece( uint256 roomId ) public view  returns (uint8[4][4] memory){
            Player storage player = rooms[roomId].players[msg.sender];
            return player.currentPiece.shape;    
        }

        function getLocation(uint256 roomId) public  view  returns (uint8 , uint8, uint8 , uint8 ){
            address[] storage players = rooms[roomId].playerAddresses;
            require(players.length > 1, "No enemy available");

            address enemyAddress = address(0);
            
            for (uint256 i = 0; i < players.length; i++) {
                if (players[i] != msg.sender) {
                    enemyAddress = players[i];
                    break;
                }
            }

            require(enemyAddress != address(0), "Enemy not found");

            Player storage player = rooms[roomId].players[msg.sender];
            Player storage enemy = rooms[roomId].players[enemyAddress];
            return (player.currentPiece.x, player.currentPiece.y, enemy.currentPiece.x, enemy.currentPiece.y);
        }

        function getListPlayer(uint256 roomId) public view returns (address[] memory) {
            return rooms[roomId].playerAddresses;
        }

        function getEnemyPiece(uint256 roomId) public view returns (uint8[4][4] memory piece) {
            Room storage room = rooms[roomId];

            require(room.isActive, "Room does not exist");

            address[] storage players = room.playerAddresses;
            require(players.length > 1, "No enemy available");

            address enemyAddress;
            for (uint256 i = 0; i < players.length; i++) {
                if (players[i] != msg.sender) {
                    enemyAddress = players[i];
                    break;
                }
            }

            require(enemyAddress != address(0), "No enemy found");

            Player storage enemy = room.players[enemyAddress];
            return (enemy.currentPiece.shape);
        }

        function getEnemyPosition(uint256 roomId) public view returns (uint8 x, uint8 y) {
            Room storage room = rooms[roomId];

            require(room.isActive, "Room does not exist");

            address[] storage players = room.playerAddresses;
            require(players.length > 1, "No enemy available");

            address enemyAddress;
            for (uint256 i = 0; i < players.length; i++) {
                if (players[i] != msg.sender) {
                    enemyAddress = players[i];
                    break;
                }
            }

            require(enemyAddress != address(0), "No enemy found");

            Player storage enemy = room.players[enemyAddress];
            return (enemy.currentPiece.x, enemy.currentPiece.y);
        }

        function getActiveRooms() public view returns (uint256[] memory) {
            uint256 count = 0;

            for (uint256 i = 0; i < nextRoomId; i++) {
                if (rooms[i].isActive) {
                    count++;
                }
            }

            uint256[] memory activeRooms = new uint256[](count);
            uint256 index = 0;

            for (uint256 i = 0; i < nextRoomId; i++) {
                if (rooms[i].isActive) {
                    activeRooms[index] = i;
                    index++;
                }
            }
            return activeRooms;
        }

        function getWinner(uint8 roomId) public view returns (address[] memory) {
            address[] storage players = rooms[roomId].playerAddresses;
            require(players.length > 0, "No players in room");

            uint256 highestScore = 0;
            uint8 winnerCount = 0;

            for (uint8 i = 0; i < players.length; i++) {
                uint256 playerScore = rooms[roomId].players[players[i]].score;
                if (playerScore > highestScore) {
                    highestScore = playerScore;
                    winnerCount = 1;
                } else if (playerScore == highestScore) {
                    winnerCount++;
                }
            }

            address[] memory winners = new address[](winnerCount);
            uint8 index = 0;
            for (uint8 i = 0; i < players.length; i++) {
                if (rooms[roomId].players[players[i]].score == highestScore) {
                    winners[index] = players[i];
                    index++;
                }
            }

            return winners;
        }
        function playAgain(uint8 roomId) public {
            require(!rooms[roomId].isActive, "Room is already active");
            require(rooms[roomId].playerAddresses.length > 0, "No players in room");

            // Kích hoạt lại phòng chơi
            rooms[roomId].isActive = true;
            rooms[roomId].isStart = false;
            clearBoard(roomId);

            emit GameRestarted(roomId);
        }
    }