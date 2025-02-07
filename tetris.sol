// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Tetris {
    uint8 constant WIDTH = 8;
    uint8 constant HEIGHT = 8;
    uint256 lastDropTime;
    uint256 dropInterval = 2; // Khoảng thời gian giữa các lần rơi (giây)

    address owner;
    uint256 score;
    uint8[HEIGHT][WIDTH] board;

    struct Piece {
        uint8[4][4] shape; 
        uint8 rotation;
        uint8 x;
        uint8 y;
    }

    Piece currentPiece;
    bool isGameOver = false;
    bool isActive;

    event GameStarted();
    event PieceMoved(uint8 x, uint8 y);
    event PieceRotated(uint8 rotation);
    event LineCleared(uint256 newScore);
    event GameOver();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    modifier onlyPlaying() {
    require(isActive, "No active game found ");
    _;
}

    function startGame() public onlyOwner {
        require(!isActive, "Game already in progress");
        score = 0;
        isGameOver = false;
        isActive = true;
        clearBoard();
        spawnPiece();
        lastDropTime = block.timestamp;
        emit GameStarted();
    }

    function clearBoard() internal {
        for (uint8 i = 0; i < HEIGHT; i++) {
            for (uint8 j = 0; j < WIDTH; j++) {
                board[i][j] = 0;
            }
        }
    }

    function spawnPiece() internal {

        uint8 randomPiece = uint8(uint256(keccak256(abi.encodePacked(block.timestamp))) % 7);
        
        if (randomPiece == 0) {
            currentPiece.shape = [
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]; // Mảnh I
        } else if (randomPiece == 1) {
            currentPiece.shape = [
                [1, 1],
                [1, 1],
                [0, 0],
                [0, 0]
            ]; // Mảnh O
        } else if (randomPiece == 2) {
            currentPiece.shape = [
                [0, 1, 1, 0],
                [0, 1, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]; // Mảnh S
        } else if (randomPiece == 3) {
            currentPiece.shape = [
                [1, 1, 0, 0],
                [0, 1, 1, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]; // Mảnh Z
        } else if (randomPiece == 4) {
            currentPiece.shape = [
                [1, 0, 0, 0],
                [1, 1, 1, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]; // Mảnh L
        } else if (randomPiece == 5) {
            currentPiece.shape = [
                [0, 0, 1, 0],
                [1, 1, 1, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]; // Mảnh J
        } else if (randomPiece == 6) {
            currentPiece.shape = [
                [0, 1, 0, 0],
                [1, 1, 1, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ]; // Mảnh T
        }

        currentPiece.rotation = 0;
        currentPiece.x = WIDTH / 2 - 2;
        currentPiece.y = 0;

        if (checkCollision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
            isGameOver = true;
            isActive = false;
            emit GameOver();
        }
    }

    function updateGame() public onlyPlaying {
    require(!isGameOver, "Game is over");

    if (block.timestamp >= lastDropTime + dropInterval) {
        bool canMove = movePiece(0, 1);
        
        if (!canMove) { 
            lockPiece();
            spawnPiece();
        }

        lastDropTime = block.timestamp;
         if (isGameOver) {
                emit GameOver();
            }
    }
}

function movePiece(int8 dx, int8 dy) public onlyPlaying returns (bool) {
    require(!isGameOver, "Game is over");
    uint8 newX = uint8(int8(currentPiece.x) + dx);
    uint8 newY = uint8(int8(currentPiece.y) + dy);

    if (newX >= 0 && uint8(newX) < WIDTH && newY >= 0 && uint8(newY) < HEIGHT) {
        if (!checkCollision(newX, newY, currentPiece.shape)) {
            currentPiece.x = newX;
            currentPiece.y = newY;
            emit PieceMoved(currentPiece.x, currentPiece.y);
            return true; 
        } else if (dy > 0) {
            lockPiece();
            spawnPiece();
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

    function rotatePiece() public onlyPlaying {
        require(!isGameOver, "Game is over");
        uint8[4][4] memory rotatedShape = rotateMatrix(currentPiece.shape);
        
        if (!checkCollision(currentPiece.x, currentPiece.y, rotatedShape)) {
            currentPiece.shape = rotatedShape;
            currentPiece.rotation = (currentPiece.rotation + 1) % 4;
            emit PieceRotated(currentPiece.rotation);
        }
    }

    function checkCollision(uint8 x, uint8 y, uint8[4][4] memory shape) internal view returns (bool) {
        // Kiểm tra va chạm với các tetromino đã được khóa lại
        for (uint8 i = 0; i < 4; i++) {
            for (uint8 j = 0; j < 4; j++) {
                if (shape[i][j] == 1) {
                    uint8 newX = x + j;
                    uint8 newY = y + i;

                    if (newX >= WIDTH || newY >= HEIGHT || board[newY][newX] == 1) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function hardDropPiece() public onlyPlaying {
    require(!isGameOver, "Game is over");

    uint8 newY = currentPiece.y;
    
    // Tìm vị trí thấp nhất mà tetromino có thể rơi
    while (!checkCollision(currentPiece.x, newY + 1, currentPiece.shape)) {
        newY++;
    }

    currentPiece.y = newY;
    emit PieceMoved(currentPiece.x, currentPiece.y);

    lockPiece();
    spawnPiece(); 
    
    if (isGameOver) {
        emit GameOver();
    }
}


    function lockPiece() internal {
        // Lưu trạng thái tetromino xuống bảng
        for (uint8 i = 0; i < 4; i++) {
            for (uint8 j = 0; j < 4; j++) {
                if (currentPiece.shape[i][j] == 1) {
                    uint8 x = currentPiece.x + j;
                    uint8 y = currentPiece.y + i;
                    if (y < HEIGHT) {
                        board[y][x] = 1;
                    }
                }
            }
        }

        clearLines();
    }

    function clearLines() internal {
        uint256 cleared = 0;

        for (uint8 i = 0; i < HEIGHT; i++) {
            bool full = true;
            for (uint8 j = 0; j < WIDTH; j++) {
                if (board[i][j] == 0) {
                    full = false;
                    break;
                }
            }
            if (full) {
                cleared++;
                for (uint8 k = i; k > 0; k--) {
                    board[k] = board[k - 1];
                }
            }
        }

        if (cleared > 0) {
            score += cleared * 10;
            emit LineCleared(score);
        }
    }

    function getBoard() public view onlyPlaying returns (uint8[HEIGHT][WIDTH] memory) {
        return board;
    }

    function getScore() public view onlyPlaying returns (uint256)
    {
        return score;
    }

    function getCurrentPiece(  )public view onlyPlaying returns (uint8[4][4] memory)
    {
        return currentPiece.shape;    
    }

    function getLocation() public  view onlyPlaying returns (uint8 , uint8 )
    {
        return (currentPiece.x,currentPiece.y);
    }
}
