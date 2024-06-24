# Custom Chess Game

This is a custom chess game where both white and black players move simultaneously.

## How to Run

1. Install Pygame:
    ```
    pip install pygame
    ```

2. Run the game:
    ```
    python main.py
    ```

## Game Rules

- The game is played on a 5x5 board.
- Both players move simultaneously without knowing the opponent's move.
- Pieces move as per standard chess rules but with simultaneous movement.
- If two pieces collide during movement, both are removed from the board.
- If a moving piece lands on a stationary piece, the stationary piece is removed.

## Controls

- Click on a piece to see its valid moves.
- Click on a valid move to move the piece.
