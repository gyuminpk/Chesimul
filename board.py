import pygame


class Board:
    def __init__(self):
        self.board = [[None for _ in range(5)] for _ in range(5)]
        self.init_pieces()

    def init_pieces(self):
        self.board[0][0] = 'white_rook'
        self.board[1][0] = 'white_knight'
        self.board[2][0] = 'white_bishop'
        self.board[3][0] = 'white_queen'
        self.board[4][0] = 'white_king'
        for i in range(5):
            self.board[i][1] = 'white_pawn'

        self.board[0][4] = 'black_rook'
        self.board[1][4] = 'black_knight'
        self.board[2][4] = 'black_bishop'
        self.board[3][4] = 'black_queen'
        self.board[4][4] = 'black_king'
        for i in range(5):
            self.board[i][3] = 'black_pawn'

    def get_piece(self, row, col):
        return self.board[row][col]

    def move_piece(self, start_pos, end_pos):
        piece = self.board[start_pos[0]][start_pos[1]]
        self.board[end_pos[0]][end_pos[1]] = piece
        self.board[start_pos[0]][start_pos[1]] = None

    def draw(self, screen):
        for row in range(5):
            for col in range(5):
                piece = self.board[row][col]
                if piece:
                    piece_image = pygame.image.load(f'assets/{piece}.png')
                    screen.blit(piece_image, (col * 100, row * 100))
