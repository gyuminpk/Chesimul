const canvas = document.getElementById('chessBoard');
const ctx = canvas.getContext('2d');
const tileSize = 100;
const boardSize = 5;
canvas.width = tileSize * boardSize;
canvas.height = tileSize * boardSize;

const initialBoard = [
    ['white_rook', null, null, null, 'black_rook'],
    ['white_knight', null, null, null, 'black_knight'],
    ['white_bishop', null, null, null, 'black_bishop'],
    ['white_queen', null, null, null, 'black_queen'],
    ['white_king', null, null, null, 'black_king']
];

let board = JSON.parse(JSON.stringify(initialBoard));
let selectedPiece = null;
let validMoves = [];

const images = {};
const pieces = ['white_rook', 'white_knight', 'white_bishop', 'white_queen', 'white_king', 'white_pawn',
                'black_rook', 'black_knight', 'black_bishop', 'black_queen', 'black_king', 'black_pawn'];

const loadImages = () => {
    return Promise.all(pieces.map(piece => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = `assets/${piece}.png`;
            img.onload = () => {
                images[piece] = img;
                resolve();
            };
            img.onerror = reject;
        });
    }));
};

const drawBoard = () => {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            if (board[row][col]) {
                ctx.drawImage(images[board[row][col]], col * tileSize, row * tileSize, tileSize, tileSize);
            }
        }
    }

    // 유효한 이동 경로 표시
    if (validMoves.length > 0) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        validMoves.forEach(([row, col]) => {
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        });
    }
};

const getPiece = (row, col) => {
    return board[row][col];
};

const getValidMoves = (row, col) => {
    const piece = board[row][col];
    const color = piece.split('_')[0];
    const type = piece.split('_')[1];
    const directions = {
        'rook': [[-1, 0], [1, 0], [0, -1], [0, 1]],
        'bishop': [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        'queen': [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
        'king': [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
        'knight': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
        'pawn': (color === 'white') ? [[0, 1], [1, 1], [-1, 1]] : [[0, -1], [1, -1], [-1, -1]]
    };

    const moves = [];
    if (type === 'pawn') {
        directions['pawn'].forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                if (dr === 0 && !board[newRow][newCol]) {
                    moves.push([newRow, newCol]);
                } else if (dr !== 0 && board[newRow][newCol] && board[newRow][newCol].split('_')[0] !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });
    } else {
        directions[type].forEach(([dr, dc]) => {
            for (let i = 1; i < boardSize; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) break;
                if (board[newRow][newCol]) {
                    if (board[newRow][newCol].split('_')[0] !== color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
                moves.push([newRow, newCol]);
            }
        });
    }
    if (type === 'king' || type === 'knight') {
        return moves.filter(([r, c]) => !board[r][c] || board[r][c].split('_')[0] !== color);
    }
    return moves;
};

const animateMoves = (whiteMove, blackMove) => {
    const maxTime = Math.max(whiteMove.time, blackMove.time);
    let currentTime = 0;

    const interval = setInterval(() => {
        if (currentTime === maxTime) {
            clearInterval(interval);
            drawBoard();
            checkCollision();
            return;
        }

        drawBoard();
        if (currentTime < whiteMove.time) {
            const [startRow, startCol, endRow, endCol] = whiteMove.path[currentTime];
            ctx.drawImage(images[board[startRow][startCol]], endCol * tileSize, endRow * tileSize, tileSize, tileSize);
        }
        if (currentTime < blackMove.time) {
            const [startRow, startCol, endRow, endCol] = blackMove.path[currentTime];
            ctx.drawImage(images[board[startRow][startCol]], endCol * tileSize, endRow * tileSize, tileSize, tileSize);
        }
        currentTime++;
    }, 1000);
};

const checkCollision = () => {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] && board[row][col].includes('white') && board[row][col].includes('black')) {
                setTimeout(() => {
                    board[row][col] = null;
                    drawBoard();
                }, 1000);
            }
        }
    }
};

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const row = Math.floor(y / tileSize);
    const col = Math.floor(x / tileSize);

    if (selectedPiece) {
        if (validMoves.some(([r, c]) => r === row && c === col)) {
            const piece = board[selectedPiece[0]][selectedPiece[1]];
            board[selectedPiece[0]][selectedPiece[1]] = null;
            board[row][col] = piece;

            const whiteMove = {
                path: calculatePath(selectedPiece, [row, col]),
                time: calculateTime(selectedPiece, [row, col])
            };

            selectedPiece = null;
            validMoves = [];
            checkGameOver();
            const blackMove = blackMoveDecision();
            animateMoves(whiteMove, blackMove);
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

const calculatePath = (start, end) => {
    const path = [];
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    const rowDiff = endRow - startRow;
    const colDiff = endCol - startCol;

    const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

    for (let i = 1; i <= Math.max(Math.abs(rowDiff), Math.abs(colDiff)); i++) {
        path.push([startRow + i * rowStep, startCol + i * colStep, endRow, endCol]);
    }
    return path;
};

const calculateTime = (start, end) => {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    const rowDiff = Math.abs(endRow - startRow);
    const colDiff = Math.abs(endCol - startCol);

    return Math.max(rowDiff, colDiff);
};

const blackMoveDecision = () => {
    const moves = [];
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] && board[row][col].startsWith('black')) {
                const validMoves = getValidMoves(row, col);
                validMoves.forEach(move => {
                    moves.push([[row, col], move]);
                });
            }
        }
    }
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const [start, end] = randomMove;
    const path = calculatePath(start, end);
    const time = calculateTime(start, end);

    return { path, time };
};

const checkGameOver = () => {
    let whiteKing = false;
    let blackKing = false;

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'white_king') whiteKing = true;
            if (board[row][col] === 'black_king') blackKing = true;
        }
    }

    if (!whiteKing) {
        alert("Black wins!");
        resetGame();
    } else if (!blackKing) {
        alert("White wins!");
        resetGame();
    }
};

const resetGame = () => {
    board = JSON.parse(JSON.stringify(initialBoard));
    selectedPiece = null;
    validMoves = [];
    drawBoard();
};

loadImages().then(() => {
    drawBoard();
});
