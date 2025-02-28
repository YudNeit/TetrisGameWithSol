import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./GameContract";

const wsProvider = new ethers.WebSocketProvider("wss://bsc-testnet.publicnode.com");

const Game = () => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [nextRoomId, setNextRoomId] = useState(null);
  const [PieceType, setPieceType] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState({ me: 0, enemy: 0 });
  const [gameStarted, setGameStarted] = useState(false);
  const [piecePosition, setPiecePosition] = useState({
    x: 0,
    y: 0,
    ex: 0,
    ey: 0,
  });
  const [pieceShape, setPieceShape] = useState([]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      switch (event.key) {
        case "ArrowUp":
          fetchRotate();
          break;
        case "ArrowDown":
          movePiece(0, 1);
          break;
        case "ArrowLeft":
          movePiece(-1, 0);
          break;
        case "ArrowRight":
          movePiece(1, 0);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [contract, roomId]);

  // Kết nối MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setAccount(await signer.getAddress());

        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        setContract(contractInstance);
      } catch (error) {
        console.error("Lỗi kết nối ví:", error);
      }
    } else {
      alert("Vui lòng cài đặt MetaMask!");
    }
  };

  const movePiece = async (x, y) => {
    if (contract && roomId) {
      try {
        const tx = await contract.movePiece(roomId, x, y);
        await tx.wait();
        console.log(`Di chuyển quân cờ theo hướng:}`);
        await fetchPieceShape();
        await fetchPiecePosition(); // Cập nhật lại vị trí sau khi di chuyển
      } catch (error) {
        console.error("Lỗi khi di chuyển quân cờ:", error);
      }
    }
  };

  // Lấy ID phòng tiếp theo
  async function fetchNextRoomId() {
    try {
      const nextRoomId = await contract.getActiveRooms();
      console.log("Fetching nextRoomId from contract at:", nextRoomId);
      setNextRoomId(nextRoomId);
      console.log("nextRoomId:", nextRoomId.toString());
    } catch (error) {
      console.error("Lỗi gọi nextRoomId:", error);
    }
  }

  const fetchRotate = async () => {
    if (contract && roomId) {
      try {
        const tx = await contract.rotatePiece(roomId);
        await tx.wait();
        await fetchPieceShape();
      } catch (error) {
        console.error("L��i xoay quân c��:", error);
      }
    }
  };

  const fetchPiecePosition = async () => {
    if (contract && roomId) {
      try {
        const [x, y, ex, ey] = await contract.getLocation(roomId);
        setPiecePosition({
          x: Number(x),
          y: Number(y),
          ex: Number(ex),
          ey: Number(ey),
        });
      } catch (error) {
        console.error("Lỗi lấy vị trí quân cờ:", error);
      }
    }
  };

  const fetchPieceShape = async () => {
    if (contract && roomId) {
      try {
        const PieceShape = await contract.getCurrentPiece(roomId);
        setPieceShape(PieceShape);
      } catch (error) {
        console.error("Lỗi lấy vị trí quân cờ:", error);
      }
    }
  };

  // Lấy danh sách người chơi trong phòng
  async function fetchPlayers(roomId) {
    if (!contract) {
      console.error("Contract chưa được khởi tạo");
      return;
    }

    try {
      const players = await contract.getListPlayer(roomId);
      setPlayers(players);
      console.log("Danh sách người chơi:", players);
      return players;
    } catch (error) {
      console.error("Lỗi lấy danh sách người chơi:", error);
    }
  }

  // Lấy bảng trò chơi
  const fetchBoard = async () => {
    if (contract && roomId) {
      const [myX, myY, enemyX, enemyY] = await contract.getLocation(roomId);

      await setPiecePosition({
        x: Number(myX),
        y: Number(myY),
        ex: Number(enemyX),
        ey: Number(enemyY),
      });
      try {
        const PieceShape = await contract.getCurrentPiece(roomId);
        const EnermyPieceShape = await contract.getEnemyPiece(roomId);
        //  const [enemyX, enemyY] = await contract.getEnemyPosition(roomId);
        const boardData = await contract.getBoard(roomId);
        let newBoard = boardData.map((row) =>
          row.map((cell) => (cell === 0n ? "⬜" : cell === 1n ? "⬛" : "🔴"))
        );
        // Hiển thị quân cờ theo hình dạng
        PieceShape.forEach((row, dy) => {
          row.forEach((cell, dx) => {
            if (cell === 1n) {
              // Ô thuộc quân cờ
              const x = piecePosition.x + dx;
              const y = piecePosition.y + dy;
              if (newBoard[y] && newBoard[y][x] !== undefined) {
                newBoard[y][x] = "🟦"; // Quân cờ sẽ hiển thị màu xanh
              }
            }
          });
        });

        EnermyPieceShape.forEach((row, dy) => {
          row.forEach((cell, dx) => {
            if (cell === 1n) {
              const x = piecePosition.ex + dx;
              const y = piecePosition.ey + dy;
              if (newBoard[y] && newBoard[y][x] !== undefined) {
                newBoard[y][x] = "🟥"; // Đối thủ: đỏ
              }
            }
          });
        });

        setBoard(newBoard);
      } catch (error) {
        console.error("Lỗi lấy board:", error);
      }
    }
  };

  const HardDrop = async () => {
    if (contract && roomId) {
      try {
        const tx = await contract.hardDropPiece(roomId);
        await tx.wait();
        console.log("Đánh đáy đầy bảng");
        fetchPiecePosition();
      } catch (error) {
        console.error("L��i khi đánh đáy đầy bảng:", error);
      }
    }
  };

  // Tạo phòng mới
  const createRoom = async () => {
    if (contract) {
      try {
        const tx = await contract.createRoom();
        await tx.wait();
        fetchNextRoomId();
      } catch (error) {
        console.error("Lỗi khi tạo phòng:", error);
      }
    }
  };

  // Tham gia phòng
  const joinRoom = async () => {
    if (contract && roomId) {
      try {
        console.log(roomId);
        const tx = await contract.joinRoom(roomId);
        await tx.wait();
        fetchPlayers(roomId);
      } catch (error) {
        console.error("Lỗi khi tham gia phòng:", error);
      }
    }
  };

  const fetchUpdate = async () => {
    if (contract && roomId) {
      try {
        const tx = await contract.updateGame(roomId);
        await tx.wait();
        await fetchPiecePosition();
        fetchBoard();
      } catch (error) {
        console.error("Lỗi khi tham gia phòng:", error);
      }
    }
  };

  // Bắt đầu trò chơi
  const startGame = async () => {
    if (contract && roomId) {
      try {
        const tx = await contract.startGame(roomId);
        await tx.wait();
        console.log("susscess");
        setGameStarted(true);
        fetchBoard();
      } catch (error) {
        console.error("Lỗi khi bắt đầu game:", error);
      }
    }
  };

  const fetchScore = async () => {
    if (contract && roomId) {
      try {
        const [me, enemy] = await contract.getScore(roomId);

        setScore({ me: Number(me), enemy: Number(enemy) });
      } catch (error) {
        console.error("L��i khi lấy điểm:", error);
      }
    }
  };

  const selectPiece = async () => {
    if (contract && roomId) {
      try {
        const tx = await contract.selectNextPiece(roomId, PieceType);
        await tx.wait();
        console.log("susscess");
      } catch (error) {
        console.error("Lỗi khi bắt đầu game:", error);
      }
    }
  };

  useEffect(() => {
    if (!contract) return;

    const onLineCleared = async (newScore) => {
      const [me, enemy] = await contract.getScore(roomId);

      setScore({ me: Number(me), enemy: Number(enemy) });
    };

    contract.on("LineCleared", onLineCleared);

    return () => {
      contract.off("LineCleared", onLineCleared);
    };
  }, []);

  useEffect(() => {
    if (!contract) return;

    const onPieceRotated = async (rotation) => {
      try {
        const PieceShape = await contract.getCurrentPiece(roomId);
        const EnermyPieceShape = await contract.getEnemyPiece(roomId);
        const [x, y, ex, ey] = await contract.getLocation(roomId);
        await setPiecePosition({
          x: Number(x),
          y: Number(y),
          ex: Number(ex),
          ey: Number(ey),
        });
        const boardData = await contract.getBoard(roomId);
        let newBoard = boardData.map((row) =>
          row.map((cell) => (cell === 0n ? "⬜" : cell === 1n ? "⬛" : "🔴"))
        );
        // Hiển thị quân cờ theo hình dạng
        PieceShape.forEach((row, dy) => {
          row.forEach((cell, dx) => {
            if (cell === 1n) {
              // Ô thuộc quân cờ
              const x = piecePosition.x + dx;
              const y = piecePosition.y + dy;
              if (newBoard[y] && newBoard[y][x] !== undefined) {
                newBoard[y][x] = "🟦"; // Quân cờ sẽ hiển thị màu xanh
              }
            }
          });
        });

        EnermyPieceShape.forEach((row, dy) => {
          row.forEach((cell, dx) => {
            if (cell === 1n) {
              const x = piecePosition.ex + dx;
              const y = piecePosition.ey + dy;
              if (newBoard[y] && newBoard[y][x] !== undefined) {
                newBoard[y][x] = "🟥"; // Đối thủ: đỏ
              }
            }
          });
        });

        setBoard(newBoard);
      } catch (error) {
        console.error("Lỗi lấy board:", error);
      }
      console.log(`♻️ Piece rotated! New rotation: ${rotation}`);
    };

    contract.on("PieceRotated", onPieceRotated);

    return () => {
      contract.off("PieceRotated", onPieceRotated);
    };
  }, []);

  useEffect(() => {
    if (!contract || !roomId) return;

    const onPieceMoved = async () => {
      try {
        const [myX, myY, enemyX, enemyY] = await contract.getLocation(roomId);

        await setPiecePosition({
          x: Number(myX),
          y: Number(myY),
          ex: Number(enemyX),
          ey: Number(enemyY),
        });

        console.log(
          `Updated positions - Me: (${myX}, ${myY}), Enemy: (${enemyX}, ${enemyY})`
        );

        fetchBoard();
      } catch (error) {
        console.error("Lỗi khi cập nhật vị trí:", error);
      }
    };

    contract.on("PieceMoved", onPieceMoved);

    // Cleanup khi component unmount
    return () => {
      contract.off("PieceMoved", onPieceMoved);
    };
  }, []);

  useEffect(() => {
    if (contract) {
      contract.on("PlayerJoined", (roomId) => {
        console.log("Player Joined!");
        fetchPlayers(roomId);
      });

      contract.on("GameStarted", () => {
        console.log("Game Started!");
        fetchBoard();
        setGameStarted(true);
      });

      contract.on("GameOver", () => {
        console.log("Game Over!");
        setGameStarted(false);
      });

      return () => {
        if (contract) {
          contract.removeAllListeners(); // Chỉ gọi nếu contract hợp lệ
        }
      };
    }
  }, []);

  useEffect(() => {
    if (contract) {
      fetchBoard();
      fetchNextRoomId();
      fetchPieceShape();
      fetchPlayers();
    }
  }, [contract]);

  useEffect(() => {
    if (piecePosition) {
      fetchBoard();
    }
  }, [piecePosition, pieceShape]);
  // useEffect(() => {
  //   if (contract && gameStarted) {
  //     const interval = setInterval(() => {
  //       fetchUpdate();
  //       fetchPiecePosition();
  //     },);

  //     return () => clearInterval(interval); // Cleanup khi component unmount
  //   }
  // }, [contract, gameStarted]);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>Game Blockchain</h2>
      {account ? (
        <p>Đã kết nối với: {account}</p>
      ) : (
        <button onClick={connectWallet}>Kết nối MetaMask</button>
      )}
      <h3>Quản lý phòng</h3>
      <p>
        Danh sách phòng:{" "}
        {nextRoomId && nextRoomId.length > 0
          ? nextRoomId.join(", ")
          : "Đang tải..."}
      </p>
      <button onClick={createRoom}>Tạo phòng</button>
      <button onClick={HardDrop}>HardDrop</button>
      <h3>Tham gia trò chơi</h3>
      <input
        type="number"
        placeholder="Nhập Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={joinRoom}>Tham gia phòng</button>
      <button onClick={startGame}>Bắt đầu trò chơi</button>
      <h3>Chọn mảnh gạch</h3>
      <input
        type="number"
        placeholder="Nhập mảnh gạch"
        value={PieceType}
        onChange={(e) => setPieceType(e.target.value)}
      />
      <button onClick={selectPiece}>Chọn Mảnh Gạch</button>
      <h3>Người chơi trong phòng</h3>
      <ul>
        {players.length > 0 ? (
          players.map((player, index) => <li key={index}>{player}</li>)
        ) : (
          <p>Chưa có người chơi nào.</p>
        )}
      </ul>
      <h3>Bảng trò chơi</h3>
      <pre>
        {board.length > 0
          ? board.map((row) => row.join(" ")).join("\n")
          : "Chưa có dữ liệu"}
      </pre>
      <h3>Điều khiển quân cờ</h3>
      <p>
        Vị trí hiện tại: ({piecePosition.x}, {piecePosition.y},{" "}
        {piecePosition.ex}, {piecePosition.ey})
      </p>
      <button onClick={fetchUpdate}>update</button>
      <h3>Điểm số của tôi: {score.me} </h3>
      <h3>Điểm số của đối thủ: {score.enemy}</h3>
    </div>
  );
};

export default Game;
