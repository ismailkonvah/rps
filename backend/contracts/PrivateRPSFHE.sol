// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// Minimal Private RPS contract (same as provided earlier)
contract PrivateRPSFHE {
    uint256 public nextGameId;
    address public admin;

    struct Game {
        address player1;
        address player2;
        bytes encMove1;
        bytes encMove2;
        bool finished;
        uint256 createdAt;
    }

    mapping(uint256 => Game) public games;

    event GameCreated(uint256 indexed gameId, address indexed creator);
    event Joined(uint256 indexed gameId, address indexed player);
    event MoveSubmitted(uint256 indexed gameId, address indexed player);
    event NeedsOffchainFinalize(uint256 indexed gameId, bytes encMove1, bytes encMove2);
    event GameFinalized(uint256 indexed gameId, address winner, string result);

    error NotInGame();
    error GameFull();
    error AlreadySubmitted();
    error GameFinished();
    error WrongPlayer();
    error NeedBothMoves();
    error NotAdmin();
    error InvalidWinner();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "admin required");
        admin = _admin;
        nextGameId = 1;
    }

    function createGame(uint256 wagerWei_) external returns (uint256) {
        uint256 gid = nextGameId++;
        Game storage g = games[gid];
        g.player1 = msg.sender;
        g.createdAt = block.timestamp;
        emit GameCreated(gid, msg.sender);
        return gid;
    }

    function joinGame(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.player1 == address(0)) revert NotInGame();
        if (g.player2 != address(0)) revert GameFull();
        if (g.player1 == msg.sender) revert WrongPlayer();
        g.player2 = msg.sender;
        emit Joined(gameId, msg.sender);
    }

    function submitMove(uint256 gameId, bytes calldata encMove) external {
        Game storage g = games[gameId];
        if (g.finished) revert GameFinished();
        if (g.player1 == address(0)) revert NotInGame();
        if (msg.sender != g.player1 && msg.sender != g.player2) revert NotInGame();

        if (msg.sender == g.player1) {
            if (g.encMove1.length != 0) revert AlreadySubmitted();
            g.encMove1 = encMove;
        } else {
            if (g.encMove2.length != 0) revert AlreadySubmitted();
            g.encMove2 = encMove;
        }

        emit MoveSubmitted(gameId, msg.sender);

        if (g.encMove1.length != 0 && g.encMove2.length != 0) {
            emit NeedsOffchainFinalize(gameId, g.encMove1, g.encMove2);
            g.finished = true;
        }
    }

    function finalizeResult(uint256 gameId, uint8 winner) external onlyAdmin {
        Game storage g = games[gameId];
        if (!g.finished) revert NotInGame();
        address winnerAddr;
        string memory resultStr;

        if (winner == 0) {
            winnerAddr = address(0);
            resultStr = "Draw";
        } else if (winner == 1) {
            winnerAddr = g.player1;
            resultStr = "P1";
        } else if (winner == 2) {
            winnerAddr = g.player2;
            resultStr = "P2";
        } else {
            revert InvalidWinner();
        }

        emit GameFinalized(gameId, winnerAddr, resultStr);
    }

    function getEncryptedMoves(uint256 gameId) external view returns (bytes memory, bytes memory) {
        Game storage g = games[gameId];
        return (g.encMove1, g.encMove2);
    }
}
