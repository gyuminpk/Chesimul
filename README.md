# Custom Chess Game

This is a custom chess game where both white and black players move simultaneously. I named this as 'Chesimul' (chess + simulator or chess + simultaneous)
I wrote the rules below. But It is more like the results of the debugging than the official rule book. So if you don't have time or hate reading, just play the game against your self or remember only this. Kings move first, kinghts second, and other pieces move simultaneously with the same speed.

## General Rules

- The game is played on a 5x5 board.
- Both players move simultaneously without knowing the opponent's move.
- Pieces(except for pawns) move as per standard chess rules but with simultaneous movement.
- The game has 2 modes. Playing against myself and playing against AI it is.

## Detail Rules

- The game has two states; move selection and move completion. At the move selection phase, the players should make their moves. After both players made their moves, the state proceeded to the completion phase. At the move completion phase, the moves will be executed conforming following rules.
- **King** is the piece that moves first. Before all the other pieces move, the king's move executes very first. Of course the white and black king move simultaneously. 
- **Knight** is the piece that moves after the king's move. If other pieces(obviously, the king is the only piece to get this chance) moved into the tile where the knight is before the knight's move executes, the knight cannot move and would be eliminated from the board.
- **Queen, rook, bishop, pawn** have the same priority of movement. They can move anywhere as far as the board's end, but they cannot move to their destination directly. They would move one tile by one tile, and if they collide with other pieces on the way to their destination, their moving would stop at that tile. If the collision occurs between two moving pieces, both pieces are eliminated. But the collision occurred between one moving piece and one stationary piece, only the stationary piece is eliminated, and the moving piece stop at the collision point. But, because of the limited workload, I didn't make the logic about the collision at the borderline between tiles. So basically, the pieces that move in the opposite direction can pass each other. You might want to use this :)
- **Pawn** has a special move rule in this Chesimul. Actually, not special. Because it is a very intuitive rule. Pawns can move forward against the opponent, even though the opponent's pieces are in the front adjacent tile to the pawn's tile. That means the pawn can capture the piece that is in the front tile. So, pawns cannot move to diagonal tile and never deviate from the row they were born, except for one case as you can expect. the promotion.
- **Promotion** happens when the pawn arrives at the end side of the opponent. But, different from real chess, by the limited workload again, the pawn would be automatically promoted to queen. Sorry Hikaru :( [Legend Under Promotion Game](https://www.chessgames.com/perl/chessgame?gid=1688934)

## Controls

- Click on a piece to see its valid moves.
- Click on a valid move to move the piece. If you want to move another piece, just click the other piece twice.
- In the AI mode, the AI model will choose its move after you make your move. But don't worry, I made a strong contract with AI not to cheat. AI decides the movement only with the prior state of the board.
- In the practice mode(playing against myself), you can decide on white and black pieces' movement.

## Condition of Victory
- If you get the opponent's king, you win. If your king is eliminated, you lose. 
- If you and your opponent's king are eliminated from the board at the same time, you draw.
- If there are no pieces but kings, you draw.

