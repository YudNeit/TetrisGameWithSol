import React, { useState, useEffect, useRef } from "react";
import { debounce } from "lodash";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./GameContract";

const WSS_URL =
  "wss://bsc-testnet.core.chainstack.com/4822a4a82ada9ebff2a817f4f77e0310";
const RPC_URL = "https://rpc.buildbear.io/sad-doctorstrange-ea8ef310";
const Game = () => {
  const timeoutRef = useRef(null);
  const [PRIVATE_KEY, setPriveteKey] = useState("");
  const [winner, setWinner] = useState([]);
  const [tempRoomId, setTempRoomId] = useState("");
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
    try {
      const provider = new ethers.WebSocketProvider(WSS_URL);

      // Tạo Wallet từ Private Key
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      setAccount(wallet.address);

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );
      setContract(contractInstance);

      console.log("Kết nối thành công! Địa chỉ ví:", wallet.address);
    } catch (error) {
      console.error("Lỗi kết nối ví:", error);
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
        console.log("Updatedá");
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

  const fetchWinner = async () => {
    if (contract && roomId) {
      try {
        const result = await contract.getWinner(roomId);
        if (!result) {
          console.error("getWinner returned null or undefined");
          return;
        }
        setWinner(result);
      } catch (error) {
        console.error("❌ Error fetching getWinner:", error);
      }
    }
  };

  const handleRestartGame = async () => {
    if (contract && roomId) {
      try {
        const tx = await contract.playAgain(roomId);
        await tx.wait();
        console.log("Game restarted");
        setGameStarted(false);
        setWinner(null);
        await  fetchBoard();
      } catch (error) {
        console.error("�� Error resetting game:", error);
      }
    }
  };

  useEffect(() => {
    if (!contract || roomId == null) {
      console.error("Contract or roomId is not defined");
      return;
    }

    const onLineCleared = async () => {
      try {
        const result = await contract.getScore(roomId);
        if (!result) {
          console.error("🚨 getScore returned null or undefined");
          return;
        }

        const [me, enemy] = result;
        await fetchScore(roomId);
        setScore({ me: Number(me), enemy: Number(enemy) });
      } catch (error) {
        console.error("❌ Error fetching score:", error);
      }
    };

    contract.removeAllListeners("LineCleared");

    contract.on("LineCleared", onLineCleared);

    return () => {
      contract.removeListener("LineCleared", onLineCleared);
    };
  }, [contract, roomId]);

  useEffect(() => {
    if (!contract) return;

    const onPieceRotated = async (rotation) => {
      await fetchBoard();
      console.log(`♻️ Piece rotated! New rotation: ${rotation}`);
    };
    contract.removeAllListeners("PieceRotated");

    contract.on("PieceRotated", onPieceRotated);

    return () => {
      contract.removeListener("PieceRotated", onPieceRotated);
    };
  }, [contract]);

  // Move event
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
        //  fetchBoard();
      } catch (error) {
        console.error("Lỗi khi cập nhật vị trí:", error);
      }
    };

    contract.on("PieceMoved", onPieceMoved);

    return () => {
      contract.off("PieceMoved", onPieceMoved);
    };
  }, [contract]);

  useEffect(() => {
    if (!contract) return;

    const handlePlayerJoined = async (roomId) => {
      console.log("Player Joined!", roomId);
      await fetchPlayers(roomId);
    };

    const handleGameStart = async () => {
      console.log("Game Started!");
      await fetchBoard();
      setGameStarted(true);
    };

    const handleGameOver = async () => {
      console.log("Game Over!");
      alert("Game Over!");
      setGameStarted(false);
    };

    // 🔹 Xóa listener cũ trước khi thêm mới để tránh chồng chéo sự kiện
    contract.removeAllListeners("PlayerJoined");
    contract.removeAllListeners("GameStarted");
    contract.removeAllListeners("GameOver");

    contract.on("PlayerJoined", handlePlayerJoined);
    contract.on("GameStarted", handleGameStart);
    contract.on("GameOver", handleGameOver);

    return () => {
      contract.removeListener("PlayerJoined", handlePlayerJoined);
      contract.removeListener("GameStarted", handleGameStart);
      contract.removeListener("GameOver", handleGameOver);
    };
  }, [contract]);

  useEffect(() => {
    if (contract) {
      fetchBoard();
      fetchNextRoomId();
      fetchPieceShape();
      fetchPlayers();
    }
  }, [contract]);

  useEffect(() => {
    if (!piecePosition || !roomId) return;

    const fetchData = debounce(async () => {
      try {
        await fetchScore(roomId);
        await fetchBoard(roomId);
        console.log("🔍 Fetching data...");
      } catch (error) {
        console.error("🚨 Lỗi khi fetch dữ liệu:", error);
      }
    }, 1000);

    fetchData();
  }, [piecePosition, roomId]);

  useEffect(() => {
    if (!gameStarted) return;

    const fetchData = async () => {
      try {
        await fetchBoard(roomId);
        console.log("Game started:", gameStarted);
      } catch (error) {
        console.error("🚨 Lỗi khi fetch dữ liệu:", error);
      }
    };

    const debouncedFetch = debounce(fetchData, 500);

    debouncedFetch();

    return () => {
      debouncedFetch.cancel();
    };
  }, [gameStarted]);

  useEffect(() => {
    if (gameStarted) return;

    const fetchData = async () => {
      try {
        await fetchWinner();
        console.log("Game over:", gameStarted);
      } catch (error) {
        console.error("🚨 Lỗi khi fetch dữ liệu:", error);
      }
    };

    const debouncedFetch = debounce(fetchData, 500);

    debouncedFetch();

    return () => {
      debouncedFetch.cancel();
    };
  }, [gameStarted]);

  useEffect(() => {
    let isMounted = true;

    const runUpdateLoop = async () => {
      if (!isMounted) return;

      console.log("Gọi fetchUpdate()");
      await fetchUpdate(); // Chờ fetchUpdate() hoàn tất

      if (!isMounted) return;

      console.log("Chờ 3 giây trước lần gọi tiếp theo...");
      timeoutRef.current = setTimeout(runUpdateLoop, 4000); // Chờ 3 giây rồi gọi lại
    };

    if (contract && gameStarted) {
      runUpdateLoop(); // Bắt đầu vòng lặp khi đủ điều kiện
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutRef.current);
      console.log("Cleanup timeout");
    };
  }, [contract, gameStarted]);


  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>Game Blockchain</h2>
      <input
        type="text"
        placeholder="Nhập khóa"
        value={PRIVATE_KEY}
        onChange={(e) => setPriveteKey(e.target.value)}
      />
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
      <button onClick={fetchScore}>score</button>
      <h3>Điểm số của tôi: {score.me} </h3>
      <h3>Điểm số của đối thủ: {score.enemy}</h3>
      <div className="game-over-modal">
        <h2>
          🎉 {winner ? `Người thắng: ${winner}` : "Trận đấu kết thúc!"} 🎉  
        </h2>
        <button onClick={handleRestartGame}>🔄 Chơi lại</button>
      </div>
    </div>
  );
};

export default Game;
