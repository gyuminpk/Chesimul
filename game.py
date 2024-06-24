from board import Board
from pieces import *


class Game:
    def __init__(self):
        self.board = Board()
        self.turn = 'white'

    def draw(self, screen, valid_moves=[]):
        self.board.draw(screen)
        for move in valid_moves:
            pygame.draw.rect(screen, (0, 255, 0), (move[1] * 100, move[0] * 100, 100, 100), 3)

    def get_valid_moves(self, row, col):
        piece_type = self.board.get_piece(row, col)
        if not piece_type:
            return []

        piece_color, piece_kind = piece_type.split('_')
        piece = None

        if piece_kind == 'rook':
            piece = Rook(piece_color, (row, col))
        elif piece_kind == 'knight':
            piece = Knight(piece_color, (row, col))
        elif piece_kind == 'bishop':
            piece = Bishop(piece_color, (row, col))
        elif piece_kind == 'queen':
            piece = Queen(piece_color, (row, col))
        elif piece_kind == 'king':
            piece = King(piece_color, (row, col))
        elif piece_kind == 'pawn':
            piece = Pawn(piece_color, (row, col))

        return piece.valid_moves(self.board.board)

    def move(self, start_pos, end_pos):
        self.board.move_piece(start_pos, end_pos)
        self.turn = 'black'
        self.black_move()

    def black_move(self):
        import random
        black_pieces = [(row, col) for row in range(5) for col in range(5) if
                        self.board.board[row][col] and self.board.board[row][col].startswith('black')]
        if not black_pieces:
            return
        piece_pos = random.choice(black_pieces)
        valid_moves = self.get_valid_moves(piece_pos[0], piece_pos[1])
        if valid_moves:
            move = random.choice(valid_moves)
            self.board.move_piece(piece_pos, move)
        self.turn = 'white'
