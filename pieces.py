class Piece:
    def __init__(self, color, position):
        self.color = color
        self.position = position

    def move(self, new_position):
        self.position = new_position

    def valid_moves(self, board):
        raise NotImplementedError

class Rook(Piece):
    def valid_moves(self, board):
        directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        return self._get_straight_moves(board, directions)

class Knight(Piece):
    def valid_moves(self, board):
        moves = [(2, 1), (2, -1), (-2, 1), (-2, -1), (1, 2), (1, -2), (-1, 2), (-1, -2)]
        return self._get_knight_moves(board, moves)

class Bishop(Piece):
    def valid_moves(self, board):
        directions = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
        return self._get_straight_moves(board, directions)

class Queen(Piece):
    def valid_moves(self, board):
        directions = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)]
        return self._get_straight_moves(board, directions)

class King(Piece):
    def valid_moves(self, board):
        moves = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)]
        return self._get_king_moves(board, moves)

class Pawn(Piece):
    def valid_moves(self, board):
        return self._get_pawn_moves(board)

# Helper functions for piece movements
def _get_straight_moves(self, board, directions):
    moves = []
    for direction in directions:
        row, col = self.position
        while True:
            row += direction[0]
            col += direction[1]
            if 0 <= row < 5 and 0 <= col < 5 and (board[row][col] is None or board[row][col][0] != self.color):
                moves.append((row, col))
            else:
                break
    return moves

def _get_knight_moves(self, board, moves):
    valid_moves = []
    for move in moves:
        row = self.position[0] + move[0]
        col = self.position[1] + move[1]
        if 0 <= row < 5 and 0 <= col < 5 and (board[row][col] is None or board[row][col][0] != self.color):
            valid_moves.append((row, col))
    return valid_moves

def _get_king_moves(self, board, moves):
    valid_moves = []
    for move in moves:
        row = self.position[0] + move[0]
        col = self.position[1] + move[1]
        if 0 <= row < 5 and 0 <= col < 5 and (board[row][col] is None or board[row][col][0] != self.color):
            valid_moves.append((row, col))
    return valid_moves

def _get_pawn_moves(self, board):
    valid_moves = []
    row, col = self.position
    if self.color == 'white':
        if row > 0 and board[row - 1][col] is None:
            valid_moves.append((row - 1, col))
        if row > 0 and col > 0 and board[row - 1][col - 1] and board[row - 1][col - 1][0] == 'black':
            valid_moves.append((row - 1, col - 1))
        if row > 0 and col < 4 and board[row - 1][col + 1] and board[row - 1][col + 1][0] == 'black':
            valid_moves.append((row - 1, col + 1))
    else:
        if row < 4 and board[row + 1][col] is None:
            valid_moves.append((row + 1, col))
        if row < 4 and col > 0 and board[row + 1][col - 1] and board[row + 1][col - 1][0] == 'white':
            valid_moves.append((row + 1, col - 1))
        if row < 4 and col < 4 and board[row + 1][col + 1] and board[row + 1][col + 1][0] == 'white':
            valid_moves.append((row + 1, col + 1))
    return valid_moves

Piece._get_straight_moves = _get_straight_moves
Piece._get_knight_moves = _get_knight_moves
Piece._get_king_moves = _get_king_moves
Piece._get_pawn_moves = _get_pawn_moves
