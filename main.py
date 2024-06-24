import pygame
import sys
from board import Board
from game import Game


def main():
    pygame.init()
    screen = pygame.display.set_mode((500, 500))
    pygame.display.set_caption('Custom Chess Game')

    board_image = pygame.image.load('assets/board.png')
    game = Game()

    running = True
    selected_piece = None
    valid_moves = []

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                pos = pygame.mouse.get_pos()
                row, col = pos[1] // 100, pos[0] // 100
                if selected_piece:
                    if (row, col) in valid_moves:
                        game.move(selected_piece, (row, col))
                        selected_piece = None
                        valid_moves = []
                    else:
                        selected_piece = None
                        valid_moves = []
                else:
                    piece = game.board.get_piece(row, col)
                    if piece and piece.color == 'white':
                        selected_piece = (row, col)
                        valid_moves = game.get_valid_moves(row, col)

        screen.blit(board_image, (0, 0))
        game.draw(screen, valid_moves)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
