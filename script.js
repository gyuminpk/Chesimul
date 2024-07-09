const canvas = document.getElementById('chessBoard');
const ctx = canvas.getContext('2d');
const phaseText = document.getElementById('phaseText');
const tileSize = 100;
const boardSize = 5;
canvas.width = tileSize * boardSize;
canvas.height = tileSize * boardSize;


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
let moveSelection = { white: null, black: null };
let phase = 'move_selection';

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

    // 선택한 위치 표시
    if (selectedPiece) {
        const [row, col] = selectedPiece;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
    }

    // 선택된 이동 위치 표시
    if (moveSelection.white) {
        const [startRow, startCol] = moveSelection.white.start;
        const [endRow, endCol] = moveSelection.white.end;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(startCol * tileSize, startRow * tileSize, tileSize, tileSize);
        ctx.fillStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.fillRect(endCol * tileSize, endRow * tileSize, tileSize, tileSize);
    }
    if (moveSelection.black) {
        const [startRow, startCol] = moveSelection.black.start;
        const [endRow, endCol] = moveSelection.black.end;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(startCol * tileSize, startRow * tileSize, tileSize, tileSize);
        ctx.fillStyle = 'rgba(255, 99, 71, 0.5)';
        ctx.fillRect(endCol * tileSize, endRow * tileSize, tileSize, tileSize);
    }
};

const drawSelectBoard = () => {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            if (board[row][col]) {
                ctx.drawImage(images[board[row][col]], col * tileSize, row * tileSize, tileSize, tileSize);
            }
        }
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
        'pawn': (color === 'white') ? [[0, 1]] : [[0, -1]]
    };

    const moves = [];
    if (type === 'pawn') {
        directions['pawn'].forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                if (!board[newRow][newCol] || (board[newRow][newCol] && board[newRow][newCol].split('_')[0] !== color)) {
                    moves.push([newRow, newCol]);
                }
            }
        });
    } else if (type === 'knight') {
        directions['knight'].forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                if (!board[newRow][newCol] || board[newRow][newCol].split('_')[0] !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });
    } else {
        directions[type].forEach(([dr, dc]) => {
            let i = 1;
            while (true) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) break;
                if (board[newRow][newCol] && board[newRow][newCol].split('_')[0] === color) break; // 내 기물이 있으면 중단
                moves.push([newRow, newCol]); // 모든 칸을 추가
                // if (board[newRow][newCol]) break; // 상대 기물이 있으면 그 위치까지 가능
                i++;
            }
        });
    }

    return moves;
};


canvas.addEventListener('click', (event) => {
    if (phase !== 'move_selection') return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const row = Math.floor(y / tileSize);
    const col = Math.floor(x / tileSize);

    if (selectedPiece) {
        if (validMoves.some(([r, c]) => r === row && c === col)) {
            const piece = board[selectedPiece[0]][selectedPiece[1]];
            const move = { start: selectedPiece, end: [row, col] };
            if (piece.startsWith('white')) {
                moveSelection.white = move;
            } else if (piece.startsWith('black')) {
                moveSelection.black = move;
            }

            if (moveSelection.white && moveSelection.black) {
                phase = 'move_completion';
                phaseText.textContent = 'move_completion';

                drawBoard();

                setTimeout(() => {
                    completeMoves();
                }, 1); // 1초 대기 후 이동
            } else {
                selectedPiece = null;
                validMoves = [];
                drawBoard();
            }
        } else {
            selectedPiece = null;
            validMoves = [];
        }
    } else {
        const piece = getPiece(row, col);
        if (piece && (piece.startsWith('white') || piece.startsWith('black'))) {
            selectedPiece = [row, col];
            validMoves = getValidMoves(row, col);
        }
    }
    drawBoard();
});

let promotionCallback = null;

const showPromotionSelection = (color, callback) => {
    promotionCallback = callback;
    document.getElementById('promotionSelection').style.display = 'block';
};

const promotePawn = (pieceType) => {
    document.getElementById('promotionSelection').style.display = 'none';
    if (promotionCallback) {
        promotionCallback(pieceType);
    }
};

const animateMoves = (whiteMove, blackMove, callback) => {
    if (!whiteMove && !blackMove) {
        callback();
        return;
    }

    let whiteStartRow, whiteStartCol, whiteEndRow, whiteEndCol, whitePiece, whiteRowStep, whiteColStep, whiteTotalSteps;
    let blackStartRow, blackStartCol, blackEndRow, blackEndCol, blackPiece, blackRowStep, blackColStep, blackTotalSteps;

    if (whiteMove) {
        [whiteStartRow, whiteStartCol] = whiteMove.start;
        [whiteEndRow, whiteEndCol] = whiteMove.end;
        whitePiece = board[whiteStartRow][whiteStartCol];
        whiteRowStep = (whiteEndRow - whiteStartRow) === 0 ? 0 : (whiteEndRow - whiteStartRow) / Math.abs(whiteEndRow - whiteStartRow);
        whiteColStep = (whiteEndCol - whiteStartCol) === 0 ? 0 : (whiteEndCol - whiteStartCol) / Math.abs(whiteEndCol - whiteStartCol);
        whiteTotalSteps = Math.max(Math.abs(whiteEndRow - whiteStartRow), Math.abs(whiteEndCol - whiteStartCol));
    } else {
        whiteTotalSteps = 0;
    }

    if (blackMove) {
        [blackStartRow, blackStartCol] = blackMove.start;
        [blackEndRow, blackEndCol] = blackMove.end;
        blackPiece = board[blackStartRow][blackStartCol];
        blackRowStep = (blackEndRow - blackStartRow) === 0 ? 0 : (blackEndRow - blackStartRow) / Math.abs(blackEndRow - blackStartRow);
        blackColStep = (blackEndCol - blackStartCol) === 0 ? 0 : (blackEndCol - blackStartCol) / Math.abs(blackEndCol - blackStartCol);
        blackTotalSteps = Math.max(Math.abs(blackEndRow - blackStartRow), Math.abs(blackEndCol - blackStartCol));
    } else {
        blackTotalSteps = 0;
    }

    let currentStep = 0;
    const totalSteps = Math.max(whiteTotalSteps, blackTotalSteps);

    const interval = setInterval(() => {
        let whiteCheck = false;
        let blackCheck = false;

        if (currentStep == totalSteps) {
            clearInterval(interval);
            callback();
            return;
        } else {
            if (currentStep < whiteTotalSteps) {
                board[whiteStartRow][whiteStartCol] = null;
                whiteStartRow += whiteRowStep;
                whiteStartCol += whiteColStep;
                whiteCheck = true;
            }
            if (currentStep < blackTotalSteps) {
                board[blackStartRow][blackStartCol] = null;
                blackStartRow += blackRowStep;
                blackStartCol += blackColStep;
                blackCheck = true;
            }
        }

        if (whiteCheck && blackCheck) {
            if (Math.round(whiteStartRow) === Math.round(blackStartRow) && Math.round(whiteStartCol) === Math.round(blackStartCol)) {
                // 두 말이 같은 위치에 도달하면 서로 제거
                board[Math.round(whiteStartRow)][Math.round(whiteStartCol)] = null;
                clearInterval(interval); // 충돌 시 이동 멈춤
                callback();
                return;
            } else {
                if (board[Math.round(whiteStartRow)][Math.round(whiteStartCol)] && board[Math.round(whiteStartRow)][Math.round(whiteStartCol)].split('_')[0] !== whitePiece.split('_')[0]) {
                    whiteTotalSteps = currentStep + 1;
                }
                if (board[Math.round(blackStartRow)][Math.round(blackStartCol)] && board[Math.round(blackStartRow)][Math.round(blackStartCol)].split('_')[0] !== blackPiece.split('_')[0]) {
                    blackTotalSteps = currentStep + 1;
                }
                board[Math.round(whiteStartRow)][Math.round(whiteStartCol)] = whitePiece;
                board[Math.round(blackStartRow)][Math.round(blackStartCol)] = blackPiece;
            }
        } else if (whiteCheck && !blackCheck) {
            if (board[Math.round(whiteStartRow)][Math.round(whiteStartCol)] && board[Math.round(whiteStartRow)][Math.round(whiteStartCol)].split('_')[0] !== whitePiece.split('_')[0]) {
                whiteTotalSteps = currentStep + 1;
            }
            board[Math.round(whiteStartRow)][Math.round(whiteStartCol)] = whitePiece;
        } else if (!whiteCheck && blackCheck) {
            if (board[Math.round(blackStartRow)][Math.round(blackStartCol)] && board[Math.round(blackStartRow)][Math.round(blackStartCol)].split('_')[0] !== blackPiece.split('_')[0]) {
                blackTotalSteps = currentStep + 1;
            }
            board[Math.round(blackStartRow)][Math.round(blackStartCol)] = blackPiece;
        }

        drawBoard();
        currentStep += 1;
    }, 1); // move after 1 second
};


const highlightMoves = (whiteMove, blackMove) => {
    drawBoard();

    if (whiteMove) {
        const [whiteStartRow, whiteStartCol] = whiteMove.start;
        const [whiteEndRow, whiteEndCol] = whiteMove.end;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // 반투명 노란색
        ctx.fillRect(whiteStartCol * tileSize, whiteStartRow * tileSize, tileSize, tileSize);
        ctx.fillStyle = (board[whiteEndRow][whiteEndCol] && board[whiteEndRow][whiteEndCol].startsWith('black')) ? 'rgba(128, 0, 128, 0.5)' : 'rgba(0, 0, 255, 0.5)'; // 반투명 파란색 또는 보라색
        ctx.fillRect(whiteEndCol * tileSize, whiteEndRow * tileSize, tileSize, tileSize);
    }

    if (blackMove) {
        const [blackStartRow, blackStartCol] = blackMove.start;
        const [blackEndRow, blackEndCol] = blackMove.end;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // 반투명 노란색
        ctx.fillRect(blackStartCol * tileSize, blackStartRow * tileSize, tileSize, tileSize);
        ctx.fillStyle = (board[blackEndRow][blackEndCol] && board[blackEndRow][blackEndCol].startsWith('white')) ? 'rgba(128, 0, 128, 0.5)' : 'rgba(255, 0, 0, 0.5)'; // 반투명 빨간색 또는 보라색
        ctx.fillRect(blackEndCol * tileSize, blackEndRow * tileSize, tileSize, tileSize);
    }
};

const completeMoves = () => {
    const whiteMove = moveSelection.white;
    const blackMove = moveSelection.black;

    if (whiteMove && blackMove) {
        highlightMoves(whiteMove, blackMove);

        setTimeout(() => {
            const [whiteStartRow, whiteStartCol] = whiteMove.start;
            const [whiteEndRow, whiteEndCol] = whiteMove.end;
            const [blackStartRow, blackStartCol] = blackMove.start;
            const [blackEndRow, blackEndCol] = blackMove.end;

            const whitePiece = board[whiteStartRow][whiteStartCol];
            const blackPiece = board[blackStartRow][blackStartCol];

            // 나이트 즉시 이동 처리
            if (whitePiece.endsWith('king')) {
                board[whiteStartRow][whiteStartCol] = null;
                    board[whiteEndRow][whiteEndCol] = whitePiece;
                    moveSelection.white = null;
            }
            if (blackPiece.endsWith('king') {
                board[blackStartRow][blackStartCol] = null;
                    board[blackEndRow][blackEndCol] = blackPiece;
                    moveSelection.black = null;
            }
            
            if (whitePiece.endsWith('knight') && blackPiece.endsWith('knight')) {
                board[whiteStartRow][whiteStartCol] = null;
                board[blackStartRow][blackStartCol] = null;
                if (whiteEndRow === blackEndRow && whiteEndCol === blackEndCol) {
                    board[whiteEndRow][whiteEndCol] = null; // 두 나이트가 충돌하여 서로 제거
                } else {
                    board[whiteEndRow][whiteEndCol] = whitePiece;
                    board[blackEndRow][blackEndCol] = blackPiece;
                }
                drawBoard();
                checkGameOver();
                moveSelection = { white: null, black: null };
                drawSelectBoard();
                phase = 'move_selection';
                phaseText.textContent = 'move_selection';
                return;
            } else {
                if (whitePiece.endsWith('knight')) {
                    board[whiteStartRow][whiteStartCol] = null;
                    board[whiteEndRow][whiteEndCol] = whitePiece;
                    moveSelection.white = null;
                }
                if (blackPiece.endsWith('knight')) {
                    board[blackStartRow][blackStartCol] = null;
                    board[blackEndRow][blackEndCol] = blackPiece;
                    moveSelection.black = null;
                }
            }

            drawBoard();

            // 나이트 이동 후 일반 기물 이동
            setTimeout(() => {
                // 만약 whiteMove와 blackMove가 모두 null이면 animateMoves 호출을 건너뜀
                if (!moveSelection.white && !moveSelection.black) {
                    checkGameOver();
                    moveSelection = { white: null, black: null };
                    phase = 'move_selection';
                    phaseText.textContent = 'move_selection';
                } else {
                    animateMoves(moveSelection.white, moveSelection.black, () => {
                        // 이동 후 프로모션 처리
                        if (whiteMove && whiteMove.end[1] === boardSize - 1 && whitePiece === 'white_pawn') {
                            board[whiteMove.end[0]][whiteMove.end[1]] = 'white_queen';
                        }
                        if (blackMove && blackMove.end[1] === 0 && blackPiece === 'black_pawn') {
                            board[blackMove.end[0]][blackMove.end[1]] = 'black_queen';
                        }
                        drawBoard();
                        checkGameOver();
                        moveSelection = { white: null, black: null };
                        drawSelectBoard();
                        phase = 'move_selection';
                        phaseText.textContent = 'move_selection';
                    });
                }
            }, 1); // 1초 대기 후 이동 시작
        }, 1); // 1초 대기 후 선택 표시
    }
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
    moveSelection = { white: null, black: null };
    phase = 'move_selection';
    phaseText.textContent = 'move_selection';
    drawBoard();
};

loadImages().then(() => {
    drawBoard();
});
