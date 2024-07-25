document.addEventListener('DOMContentLoaded', async () => {
    // Define the function to load the ONNX model
    const loadModel = async (modelPath) => {
        const session = new onnx.InferenceSession();
        await session.loadModel(modelPath);
        return session;
    };

    // AI model paths
    const models = {
        intermediate: "assets/black_model_intermediate.onnx",
        god: "assets/black_model_god.onnx"
    };

    let currentModel = models.intermediate; // Set the default model

    // Function to encode the board state as numbers
    const encodeBoardState = (boardState) => {
        const pieceMap = {
            'white_pawn': 1, 'white_rook': 2, 'white_knight': 3, 'white_bishop': 4, 'white_queen': 5, 'white_king': 6,
            'black_pawn': 7, 'black_rook': 8, 'black_knight': 9, 'black_bishop': 10, 'black_queen': 11, 'black_king': 12,
            null: 0
        };
        return boardState.map(row => row.map(cell => pieceMap[cell]));
    };

    // Function to decode numbers to strings
    const decodeMove = (startX, startY, endX, endY) => {
        return {
            start: [startX, startY],
            end: [endX, endY]
        };
    };

    const getValidMoves = (row, col, board) => {
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
                if (newRow >= 0 && newRow < board.length && newCol >= 0 && newCol < board[0].length) {
                    if (!board[newRow][newCol] || (board[newRow][newCol] && board[newRow][newCol].split('_')[0] !== color)) {
                        moves.push([newRow, newCol]);
                    }
                }
            });
        } else if (type === 'knight') {
            directions['knight'].forEach(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < board.length && newCol >= 0 && newCol < board[0].length) {
                    if (!board[newRow][newCol] || board[newRow][newCol].split('_')[0] !== color) {
                        moves.push([newRow, newCol]);
                    }
                }
            });
        } else if (type === 'king') {
            directions['king'].forEach(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < board.length && newCol >= 0 && newCol < board[0].length) {
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
                    if (newRow < 0 || newRow >= board.length || newCol < 0 || newCol >= board[0].length) break;
                    if (board[newRow][newCol] && board[newRow][newCol].split('_')[0] === color) break; // 내 기물이 있으면 중단
                    moves.push([newRow, newCol]); // 모든 칸을 추가
                    i++;
                }
            });
        }

        return moves;
    };

    const isValidMove = (boardState, startX, startY, endX, endY) => {
        const validMoves = getValidMoves(startX, startY, boardState);
        return validMoves.some(([r, c]) => r === endX && c === endY);
    };

    const getAISelect = async (boardState, session) => {
        // Encode the boardState as numbers
        const encodedState = encodeBoardState(boardState);
        const flattenedState = encodedState.flat();
    
        // Convert the state to a flat array
        const inputTensor = new onnx.Tensor(new Float32Array(flattenedState), 'float32', [1, 1, 5, 5]);
    
        // Perform model inference
        const outputMap = await session.run([inputTensor]);
    
        // Access the 'policy' output tensor
        const outputTensor = outputMap.get('policy'); // Get the output named 'policy'
    
        // Convert the tensor data to a flat array of probabilities
        const probabilities = Array.from(outputTensor.data);
    
        // Apply softmax to convert logits to probabilities
        const softmax = (logits) => {
            const maxLogit = Math.max(...logits);
            const exps = logits.map((logit) => Math.exp(logit - maxLogit));
            const sumExps = exps.reduce((a, b) => a + b, 0);
            return exps.map((exp) => exp / sumExps);
        };
       
        const softmaxProbabilities = softmax(probabilities);
    
        // Select a move based on the softmax probabilities
        let moveIndex = -1;
        let piece, startX, startY, endX, endY;
    
        const sampleIndexFromProbabilities = (probs) => {
            const cumulativeProbs = probs.reduce((acc, prob, i) => {
                if (i === 0) {
                    acc.push(prob);
                } else {
                    acc.push(acc[acc.length - 1] + prob);
                }
                return acc;
            }, []);
    
            const randomValue = Math.random();
            return cumulativeProbs.findIndex((cumProb) => randomValue < cumProb);
        };
        
        do {
            // Get the index based on the probabilities
            moveIndex = sampleIndexFromProbabilities(softmaxProbabilities);
            if (moveIndex === -1) {
                console.error("No valid move found. Check the softmax probabilities and board state.");
                return null;
            }
            // Convert the index to coordinates
            piece = Math.floor(moveIndex / (5 * 5 * 5 * 5));
            startX = Math.floor((moveIndex % (5 * 5 * 5 * 5)) / (5 * 5 * 5));
            startY = Math.floor((moveIndex % (5 * 5 * 5)) / (5 * 5));
            endX = Math.floor((moveIndex % (5 * 5)) / 5);
            endY = moveIndex % 5;
    
            softmaxProbabilities[moveIndex] = 0; // Invalidate the probability to avoid reselection
        } while (boardState[startX][startY] === null || !boardState[startX][startY].startsWith('black') || !isValidMove(boardState, startX, startY, endX, endY) || piece < 7);
        
        // Decode the move to a string and return it
        return decodeMove(startX, startY, endX, endY);
    };
    
    
    // Define startSelfGame
    const startSelfGame = () => {
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

            // Display the valid tile
            if (validMoves.length > 0) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                validMoves.forEach(([row, col]) => {
                    ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
                });
            }

            // Display the selected piece
            if (selectedPiece) {
                const [row, col] = selectedPiece;
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            }

            // Display the selected tile to move
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
                            selectedPiece = null;
                            validMoves = [];
                        }, 1000); // Move after 1 sec
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
                    validMoves = getValidMoves(row, col, board);
                }
            }
            drawBoard();
        });

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
                        // Eliminate two pieces in the same tile
                        board[Math.round(whiteStartRow)][Math.round(whiteStartCol)] = null;
                        clearInterval(interval); // stop moving if there a collision
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
            }, 1000); // Move after 1 sec
        }; 

        const highlightMoves = (whiteMove, blackMove) => {
            drawBoard();

            if (whiteMove) {
                const [whiteStartRow, whiteStartCol] = whiteMove.start;
                const [whiteEndRow, whiteEndCol] = whiteMove.end;
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Translucent yellow
                ctx.fillRect(whiteStartCol * tileSize, whiteStartRow * tileSize, tileSize, tileSize);
                ctx.fillStyle = (board[whiteEndRow][whiteEndCol] && board[whiteEndRow][whiteEndCol].startsWith('black')) ? 'rgba(128, 0, 128, 0.5)' : 'rgba(0, 0, 255, 0.5)'; // 반투명 파란색 또는 보라색
                ctx.fillRect(whiteEndCol * tileSize, whiteEndRow * tileSize, tileSize, tileSize);
            }

            if (blackMove) {
                const [blackStartRow, blackStartCol] = blackMove.start;
                const [blackEndRow, blackEndCol] = blackMove.end;
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Translucent yellow
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

                    // Move kings first
                    if (whitePiece.endsWith('king') && blackPiece.endsWith('king')) {
                        board[whiteStartRow][whiteStartCol] = null;
                        board[blackStartRow][blackStartCol] = null;
                        if (whiteEndRow === blackEndRow && whiteEndCol === blackEndCol) {
                            board[whiteEndRow][whiteEndCol] = null; // Eliminate two kings in the same tile
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
                        if (whitePiece.endsWith('king')) {
                            board[whiteStartRow][whiteStartCol] = null;
                            board[whiteEndRow][whiteEndCol] = whitePiece;
                            moveSelection.white = null;
                            if (whiteEndRow === blackStartRow && whiteEndCol === blackStartCol) {
                                moveSelection.black = null;
                            }
                        }
                        if (blackPiece.endsWith('king')) {
                            board[blackStartRow][blackStartCol] = null;
                            board[blackEndRow][blackEndCol] = blackPiece;
                            moveSelection.black = null;
                            if (blackEndRow === whiteStartRow && blackEndCol === whiteStartCol) {
                                moveSelection.white = null;
                            }
                        }
                    }
                    // Move knights second
                    if (whitePiece.endsWith('knight') && blackPiece.endsWith('knight')) {
                        board[whiteStartRow][whiteStartCol] = null;
                        board[blackStartRow][blackStartCol] = null;
                        if (whiteEndRow === blackEndRow && whiteEndCol === blackEndCol) {
                            board[whiteEndRow][whiteEndCol] = null; // Eliminate two knights in the same tile
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
                            if (board[whiteStartRow][whiteStartCol] == whitePiece){
                                board[whiteStartRow][whiteStartCol] = null;
                                board[whiteEndRow][whiteEndCol] = whitePiece;
                                moveSelection.white = null;
                            }
                            if (whiteEndRow === blackStartRow && whiteEndCol === blackStartCol) {
                                moveSelection.black = null;
                            }
                        }
                        if (blackPiece.endsWith('knight')) {
                            if (board[blackStartRow][blackStartCol] == blackPiece){
                                board[blackStartRow][blackStartCol] = null;
                                board[blackEndRow][blackEndCol] = blackPiece;
                                moveSelection.black = null;
                            }
                            if (blackEndRow === whiteStartRow && blackEndCol === whiteStartCol) {
                                moveSelection.white = null;
                            }
                        }
                    }

                    drawBoard();

                    // Move other pieces
                    setTimeout(() => {
                        // Pass the animateMoves if the both pieces are already moved
                        if (!moveSelection.white && !moveSelection.black) {
                            checkGameOver();
                            moveSelection = { white: null, black: null };
                            drawSelectBoard();
                            phase = 'move_selection';
                            phaseText.textContent = 'move_selection';
                        } else {
                            animateMoves(moveSelection.white, moveSelection.black, () => {
                                // Check promotion after move
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
                    }, 1000); // Move after 1 sec
                }, 1000); // Display selections after 1 sec
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
    };

    // Define startAIGame 
    const startAIGame = async () => {
        const session = await loadModel(currentModel);
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

            // Display the valid tiles
            if (validMoves.length > 0) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                validMoves.forEach(([row, col]) => {
                    ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
                });
            }

            // Display the selected piece
            if (selectedPiece) {
                const [row, col] = selectedPiece;
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            }

            // Display the selected tile to move
            if (moveSelection.white) {
                const [startRow, startCol] = moveSelection.white.start;
                const [endRow, endCol] = moveSelection.white.end;
                console.log(startRow, startCol, endRow, endCol)
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

                    if (piece && piece.startsWith('white')) {
                        moveSelection.white = move;
                    }

                    if (moveSelection.white) {
                        phase = 'enemy_is_selecting';
                        phaseText.textContent = 'enemy_is_selecting';

                        drawBoard();

                        setTimeout(async () => {
                            const black_move = await getAISelect(board, session);
                            moveSelection.black = black_move;
                            console.log(black_move)

                            // Proceed to move_completion affter moveSelection.black
                            if (moveSelection.white && moveSelection.black) {
                                phase = 'move_completion';
                                phaseText.textContent = 'move_completion';

                                drawBoard();

                                setTimeout(() => {
                                    completeMoves();
                                    selectedPiece = null;
                                    validMoves = [];
                                }, 1000); // Move after 1 sec
                            } else {
                                selectedPiece = null;
                                validMoves = [];
                                drawBoard();
                            }
                        }, 1000); // Black select after 1 sec
                    }
                } else {
                    selectedPiece = null;
                    validMoves = [];
                }
            } else {
                const piece = getPiece(row, col);
                if (piece && (piece.startsWith('white') || piece.startsWith('black'))) {
                    selectedPiece = [row, col];
                    validMoves = getValidMoves(row, col, board);
                }
            }
            drawBoard();
        });

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
                        // Eliminate two pieces in the same tile
                        board[Math.round(whiteStartRow)][Math.round(whiteStartCol)] = null;
                        clearInterval(interval); // Stop moving if there a collision
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
            }, 1000); // Move after 1 sec
        };

        const highlightMoves = (whiteMove, blackMove) => {
            drawBoard();

            if (whiteMove) {
                const [whiteStartRow, whiteStartCol] = whiteMove.start;
                const [whiteEndRow, whiteEndCol] = whiteMove.end;
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Translucent yellow
                ctx.fillRect(whiteStartCol * tileSize, whiteStartRow * tileSize, tileSize, tileSize);
                ctx.fillStyle = (board[whiteEndRow][whiteEndCol] && board[whiteEndRow][whiteEndCol].startsWith('black')) ? 'rgba(128, 0, 128, 0.5)' : 'rgba(0, 0, 255, 0.5)'; // 반투명 파란색 또는 보라색
                ctx.fillRect(whiteEndCol * tileSize, whiteEndRow * tileSize, tileSize, tileSize);
            }

            if (blackMove) {
                const [blackStartRow, blackStartCol] = blackMove.start;
                const [blackEndRow, blackEndCol] = blackMove.end;
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Translucent yellow
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

                    // Move kings first
                    if (whitePiece.endsWith('king') && blackPiece.endsWith('king')) {
                        board[whiteStartRow][whiteStartCol] = null;
                        board[blackStartRow][blackStartCol] = null;
                        if (whiteEndRow === blackEndRow && whiteEndCol === blackEndCol) {
                            board[whiteEndRow][whiteEndCol] = null; // Eliminate two kings in the same tile
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
                        if (whitePiece.endsWith('king')) {
                            board[whiteStartRow][whiteStartCol] = null;
                            board[whiteEndRow][whiteEndCol] = whitePiece;
                            moveSelection.white = null;
                            if (whiteEndRow === blackStartRow && whiteEndCol === blackStartCol) {
                                moveSelection.black = null;
                            }
                        }
                        if (blackPiece.endsWith('king')) {
                            board[blackStartRow][blackStartCol] = null;
                            board[blackEndRow][blackEndCol] = blackPiece;
                            moveSelection.black = null;
                            if (blackEndRow === whiteStartRow && blackEndCol === whiteStartCol) {
                                moveSelection.white = null;
                            }
                        }
                    }
                    // Move knights second
                    if (whitePiece.endsWith('knight') && blackPiece.endsWith('knight')) {
                        board[whiteStartRow][whiteStartCol] = null;
                        board[blackStartRow][blackStartCol] = null;
                        if (whiteEndRow === blackEndRow && whiteEndCol === blackEndCol) {
                            board[whiteEndRow][whiteEndCol] = null; // Eliminate two knights in the same tile
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
                            if (board[whiteStartRow][whiteStartCol] == whitePiece){
                                board[whiteStartRow][whiteStartCol] = null;
                                board[whiteEndRow][whiteEndCol] = whitePiece;
                                moveSelection.white = null;
                            }
                            if (whiteEndRow === blackStartRow && whiteEndCol === blackStartCol) {
                                moveSelection.black = null;
                            }
                        }
                        if (blackPiece.endsWith('knight')) {
                            if (board[blackStartRow][blackStartCol] == blackPiece){
                                board[blackStartRow][blackStartCol] = null;
                                board[blackEndRow][blackEndCol] = blackPiece;
                                moveSelection.black = null;
                            }
                            if (blackEndRow === whiteStartRow && blackEndCol === whiteStartCol) {
                                moveSelection.white = null;
                            }
                        }
                    }

                    drawBoard();

                    // Move other pieces
                    setTimeout(() => {
                        // Pass animateMoves if both pieces are moved already
                        if (!moveSelection.white && !moveSelection.black) {
                            checkGameOver();
                            moveSelection = { white: null, black: null };
                            drawSelectBoard();
                            phase = 'move_selection';
                            phaseText.textContent = 'move_selection';
                        } else {
                            animateMoves(moveSelection.white, moveSelection.black, () => {
                                // Check promotion after move
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
                    }, 1000); // Move after 1 sec
                }, 1000); // Display selections after 1 sec
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
    };

    // Set the eventlistner
    document.getElementById('play-myself').addEventListener('click', function() {
        document.querySelector('.buttons').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        document.getElementById('modeText').textContent = 'Play Against Myself';
        startSelfGame();
    });

    document.getElementById('intermediate-ai').addEventListener('click', function() {
        document.querySelector('.buttons').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        document.getElementById('modeText').textContent = 'Intermediate AI';
        currentModel = models.intermediate;
        startAIGame();
    });

    document.getElementById('god-ai').addEventListener('click', function() {
        document.querySelector('.buttons').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        document.getElementById('modeText').textContent = 'God AI';
        currentModel = models.god;
        startAIGame();
    });

    document.getElementById('how-to-play').addEventListener('click', function() {
        window.location.href = 'https://github.com/gyuminpk/Chesimul';
    });
});
