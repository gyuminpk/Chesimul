const canvas = document.getElementById('chessBoard');
const context = canvas.getContext('2d');

const boardSize = 5;
const tileSize = canvas.width / boardSize;

const images = {};
const pieceTypes = ['rook', 'knight', 'bishop', 'queen', 'king', 'pawn'];
const colors = ['white', 'black'];

function loadImages() {
    let loaded = 0;
    const total = pieceTypes.length * colors.length + 1; // +1 for the board

    return new Promise((resolve) => {
        colors.forEach(color => {
            pieceTypes.forEach(type => {
                const img = new Image();
                img.src = `assets/${color}_${type}.png`;
                img.onload = () => {
                    images[`${color}_${type}`] = img;
                    if (++loaded === total) {
                        resolve();
                    }
                };
            });
        });

        const boardImg = new Image();
        boardImg.src = 'assets/board.png';
        boardImg.onload = () => {
            images.board = boardImg;
            if (++loaded === total) {
                resolve();
            }
        };
    });
}

const initialBoard = [
    ['white_rook', 'white_pawn', null, 'black_pawn', 'black_rook'],
    ['white_knight', 'white_pawn', null, 'black_pawn', 'black_knight'],
    ['white_bishop', 'white_pawn', null, 'black_pawn', 'black_bishop'],
    ['white_queen', 'white_pawn', null, 'black_pawn', 'black_queen'],
    ['white_king', 'white_pawn', null, 'black_pawn', 'black_king']
];

let board = JSON.parse(JSON.stringify(initialBoard));
let selectedPiece = null;
let validMoves = [];

function drawBoard() {
    context.drawImage(images.board, 0, 0, canvas.width, canvas.height);
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const piece = board[row][col];
            if (piece) {
                context.drawImage(images[piece], col * tileSize, row * tileSize, tileSize, tileSize);
            }
        }
    }
    validMoves.forEach(([row, col]) => {
        context.strokeStyle = 'green';
        context.lineWidth = 3;
        context.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize);
    });
}

function getPiece(row, col) {
    return board[row][col];
}

function getValidMoves(row, col) {
    const piece = getPiece(row, col);
    if (!piece) return [];

    const [color, type] = piece.split('_');
    let moves = [];
    if (type === 'rook') {
        moves = getRookMoves(row, col, color);
    } else if (type === 'knight') {
        moves = getKnightMoves(row, col, color);
    } else if (type === 'bishop') {
        moves = getBishopMoves(row, col, color);
    } else if (type === 'queen') {
        moves = getQueenMoves(row, col, color);
    } else if (type === 'king') {
        moves = getKingMoves(row, col, color);
    } else if (type === 'pawn') {
        moves = getPawnMoves(row, col, color);
    }
    return moves;
}

function getRookMoves(row, col, color) {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    return getStraightMoves(row, col, directions);
}

function getKnightMoves(row, col, color) {
    const moves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
    return getValidMovesFromOffsets(row, col, moves);
}

function getBishopMoves(row, col, color) {
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    return getStraightMoves(row, col, directions);
}

function getQueenMoves(row, col, color) {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    return getStraightMoves(row, col, directions);
}

function getKingMoves(row, col, color) {
    const moves = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    return getValidMovesFromOffsets(row, col, moves, true);
}

function getPawnMoves(row, col, color) {
    const direction = color === 'white' ? -1 : 1;
    const moves = [];
    if (board[row + direction] && !board[row + direction][col]) {
        moves.push([row + direction, col]);
    }
    if (board[row + direction] && board[row + direction][col - 1] && board[row + direction][col - 1].split('_')[0] !== color) {
        moves.push([row + direction, col - 1]);
    }
    if (board[row + direction] && board[row + direction][col + 1] && board[row + direction][col + 1].split('_')[0] !== color) {
        moves.push([row + direction, col + 1]);
    }
    return moves;
}

function getStraightMoves(row, col, directions) {
    const moves = [];
    directions.forEach(([dRow, dCol]) => {
        let r = row + dRow;
        let c = col + dCol;
        while (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
            if (board[r][c] === null) {
                moves.push([r, c]);
            }
            r += dRow;
            c += dCol;
        }
    });
    return moves;
}

function getValidMovesFromOffsets(row, col, offsets, singleStep = false) {
    const moves = [];
    offsets.forEach(([dRow, dCol]) => {
        const r = row + dRow;
        const c = col + dCol;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
            if (board[r][c] === null || board[r][c].split('_')[0] !== board[row][col].split('_')[0]) {
                moves.push([r, c]);
            }
        }
    });
    return moves;
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const row = Math.floor(y / tileSize);
    const col = Math.floor(x / tileSize);

    if (selectedPiece) {
        if (validMoves.some(([r, c]) => r === row && c === col)) {
            board[row][col] = board[selectedPiece[0]][selectedPiece[1]];
            board[selectedPiece[0]][selectedPiece[1]] = null;
            selectedPiece = null;
            validMoves = [];
            checkGameOver();
            blackMove();
        } else {
            selectedPiece = null;
            validMoves = [];
        }
    } else {
        const piece = getPiece(row, col);
        if (piece && piece.startsWith('white')) {
            selectedPiece = [row, col];
            validMoves = getValidMoves(row, col);
        }
    }
    drawBoard();
});

function checkGameOver() {
    const kings = board.flat().filter(piece => piece && piece.endsWith('_king'));
    if (kings.length === 1) {
        setTimeout(() => {
            alert(kings[0].startsWith('white') ? 'You win!' : 'You lose!');
            board = JSON.parse(JSON.stringify(initialBoard));
            selectedPiece = null;
            validMoves = [];
            drawBoard();
        }, 100);
    }
}

function blackMove() {
    const blackPieces = [];
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] && board[row][col].startsWith('black')) {
                blackPieces.push([row, col]);
            }
        }
    }

    if (blackPieces.length === 0) return;

    const randomPiece = blackPieces[Math.floor(Math.random() * blackPieces.length)];
    const moves = getValidMoves(randomPiece[0], randomPiece[1]);
    if (moves.length === 0) return;

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    board[randomMove[0]][randomMove[1]] = board[randomPiece[0]][randomPiece[1]];
    board[randomPiece[0]][randomPiece[1]] = null;
    checkGameOver();
    drawBoard();
}

loadImages().then(() => {
    drawBoard();
});
