window.onload = function () {
  // The initial setup
  var gameBoard = [
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2],
    [2, 0, 2, 0, 2, 0, 2, 0]
  ];
  // Arrays to store the instances
  var pieces = [];
  var tiles = [];
  
  // Array to store moves
  var moveHistory = [];

  // Function to update move history
  function updateMoveHistory(move) {
    moveHistory.push(move);
    $('#moveHistory').append("<div>" + move + "</div>"); // Assuming you have a div with id 'moveHistory'
  }

  // Distance formula
  var dist = function (x1, y1, x2, y2) {
    return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
  }

  // Function to convert row and column to tile number
  function convertToTileNumber(row, column) {
    return (row % 2 === 0 ? (row * 4) + (column / 2) + 1 : (row * 4) + (column / 2) + 1);
  }

  // Piece object
  function Piece(element, position) {
    this.allowedtomove = true;
    this.element = element;
    this.position = position;
    this.player = this.element.attr("id") < 12 ? 1 : 2;
    this.king = false;

    this.makeKing = function () {
      this.element.css("backgroundImage", "url('img/king" + this.player + ".png')");
      this.king = true;
      // Notify that the piece has been crowned
      console.log("Player " + this.player + "'s piece has been crowned a king!");
    }

    this.move = function (tile) {
      this.element.removeClass('selected');
      if (!Board.isValidPlacetoMove(tile.position[0], tile.position[1])) return false;

      // Ensure piece doesn't move backwards if not a king
      if ((this.player == 1 && !this.king && tile.position[0] < this.position[0]) ||
          (this.player == 2 && !this.king && tile.position[0] > this.position[0])) {
        return false;
      }

      // Remove the mark from Board.board and put it in the new spot
      Board.board[this.position[0]][this.position[1]] = 0;
      Board.board[tile.position[0]][tile.position[1]] = this.player;
      this.position = [tile.position[0], tile.position[1]];
      this.element.css('top', Board.dictionary[this.position[0]]);
      this.element.css('left', Board.dictionary[this.position[1]]);
      
      // Crown the piece if it reaches the opposite side
      if (!this.king && (this.position[0] == 0 || this.position[0] == 7)) {
        this.makeKing();
      }
      return true;
    };

    this.canJumpAny = function () {
      return (this.canOpponentJump([this.position[0] + 2, this.position[1] + 2]) ||
              this.canOpponentJump([this.position[0] + 2, this.position[1] - 2]) ||
              this.canOpponentJump([this.position[0] - 2, this.position[1] + 2]) ||
              this.canOpponentJump([this.position[0] - 2, this.position[1] - 2]));
    };

    this.canOpponentJump = function (newPosition) {
      var dx = newPosition[1] - this.position[1];
      var dy = newPosition[0] - this.position[0];

      // Ensure object doesn't go backwards if not a king
      if ((this.player == 1 && !this.king && newPosition[0] < this.position[0]) ||
          (this.player == 2 && !this.king && newPosition[0] > this.position[0])) {
        return false;
      }

      // Must be in bounds
      if (newPosition[0] > 7 || newPosition[1] > 7 || newPosition[0] < 0 || newPosition[1] < 0) return false;

      var tileToCheckx = this.position[1] + dx / 2;
      var tileToChecky = this.position[0] + dy / 2;

      if (tileToCheckx > 7 || tileToChecky > 7 || tileToCheckx < 0 || tileToChecky < 0) return false;

      // If there is a piece there and there is no piece in the space after that
      if (!Board.isValidPlacetoMove(tileToChecky, tileToCheckx) && Board.isValidPlacetoMove(newPosition[0], newPosition[1])) {
        for (let pieceIndex in pieces) {
          if (pieces[pieceIndex].position[0] == tileToChecky && pieces[pieceIndex].position[1] == tileToCheckx) {
            if (this.player != pieces[pieceIndex].player) {
              // Notify that a piece has been captured
              console.log("Player " + pieces[pieceIndex].player + "'s piece has been captured!");
              return pieces[pieceIndex]; // Return the piece sitting there
            }
          }
        }
      }
      return false;
    };

    this.opponentJump = function (tile) {
      var pieceToRemove = this.canOpponentJump(tile.position);
      if (pieceToRemove) {
        pieceToRemove.remove();
        return true;
      }
      return false;
    };

    this.remove = function () {
      this.element.css("display", "none");
      if (this.player == 1) {
        $('#player2').append("<div class='capturedPiece'></div>");
        Board.score.player2 += 1;
      } else {
        $('#player1').append("<div class='capturedPiece'></div>");
        Board.score.player1 += 1;
      }
      Board.board[this.position[0]][this.position[1]] = 0;
      this.position = [];
      Board.checkForWin();
    }
  }

  // Tile object
  function Tile(element, position) {
    this.element = element;
    this.position = position;

    this.inRange = function (piece) {
      for (let k of pieces)
        if (k.position[0] == this.position[0] && k.position[1] == this.position[1]) return 'wrong';
      if (!piece.king && piece.player == 1 && this.position[0] < piece.position[0]) return 'wrong';
      if (!piece.king && piece.player == 2 && this.position[0] > piece.position[0]) return 'wrong';
      if (dist(this.position[0], this.position[1], piece.position[0], piece.position[1]) == Math.sqrt(2)) {
        return 'regular'; // Regular move
      } else if (dist(this.position[0], this.position[1], piece.position[0], piece.position[1]) == 2 * Math.sqrt(2)) {
        return 'jump'; // Jump move
      }
    };
  }

  // Board object
  var Board = {
    board: gameBoard,
    score: {
      player1: 0,
      player2: 0
    },
    playerTurn: 1,
    jumpexist: false,
    continuousjump: false,
    tilesElement: $('div.tiles'),
    dictionary: ["0vmin", "10vmin", "20vmin", "30vmin", "40vmin", "50vmin", "60vmin", "70vmin", "80vmin", "90vmin"],

    // Initialize the 8x8 board
    initalize: function () {
      var countPieces = 0;
      var countTiles = 0;
      for (let row in this.board) {
        for (let column in this.board[row]) {
          if (row % 2 == 1) {
            if (column % 2 == 0) {
              countTiles = this.tileRender(row, column, countTiles);
            }
          } else {
            if (column % 2 == 1) {
              countTiles = this.tileRender(row, column, countTiles);
            }
          }
          if (this.board[row][column] == 1) {
            countPieces = this.playerPiecesRender(1, row, column, countPieces);
          } else if (this.board[row][column] == 2) {
            countPieces = this.playerPiecesRender(2, row, column, countPieces);
          }
        }
      }
    },

    tileRender: function (row, column, countTiles) {
      this.tilesElement.append("<div class='tile' id='tile" + countTiles + "' style='top:" + this.dictionary[row] + ";left:" + this.dictionary[column] + ";'></div>");
      tiles[countTiles] = new Tile($("#tile" + countTiles), [parseInt(row), parseInt(column)]);
      return countTiles + 1;
    },

    playerPiecesRender: function (playerNumber, row, column, countPieces) {
      $(`.player${playerNumber}pieces`).append("<div class='piece' id='" + countPieces + "' style='top:" + this.dictionary[row] + ";left:" + this.dictionary[column] + ";'></div>");
      pieces[countPieces] = new Piece($("#" + countPieces), [parseInt(row), parseInt(column)]);
      return countPieces + 1;
    },

    // Check if the location has an object
    isValidPlacetoMove: function (row, column) {
      if (row < 0 || row > 7 || column < 0 || column > 7) return false;
      return this.board[row][column] == 0;
    },

    // Change the active player
    changePlayerTurn: function () {
      this.playerTurn = this.playerTurn == 1 ? 2 : 1;
      $('.turn').css("background", this.playerTurn == 1 ? "linear-gradient(to right, #BEEE62 50%, transparent 50%)" : "linear-gradient(to right, transparent 50%, #BEEE62 50%)");
      this.check_if_jump_exist();
    },

    checkifAnybodyWon: function () {
      if (this.score.player1 == 12) {
        alert("Player 1 wins!"); // Notify Player 1 wins
        return 1; // Player 1 wins
      } else if (this.score.player2 == 12) {
        alert("Player 2 wins!"); // Notify Player 2 wins
        return 2; // Player 2 wins
      }
      return false;
    },

    // Reset the game
    clear: function () {
      location.reload();
    },

    check_if_jump_exist: function () {
      this.jumpexist = false;
      this.continuousjump = false;
      for (let k of pieces) {
        k.allowedtomove = false;
        if (k.position.length != 0 && k.player == this.playerTurn && k.canJumpAny()) {
          this.jumpexist = true;
          k.allowedtomove = true;
        }
      }
      if (!this.jumpexist) {
        for (let k of pieces) k.allowedtomove = true;
      }
    },

    // Check for win conditions
    checkForWin: function () {
      if (this.score.player1 >= 12) {
        alert("Player 1 wins!"); // Notify Player 1 wins
        this.clear();
      } else if (this.score.player2 >= 12) {
        alert("Player 2 wins!"); // Notify Player 2 wins
        this.clear();
      }
    },

    // Possibly helpful for communication with back-end.
    str_board: function () {
      let ret = "";
      for (let i in this.board) {
        for (let j in this.board[i]) {
          let found = false;
          for (let k of pieces) {
            if (k.position[0] == i && k.position[1] == j) {
              ret += k.king ? (this.board[i][j] + 2) : this.board[i][j];
              found = true;
              break;
            }
          }
          if (!found) ret += '0';
        }
      }
      return ret;
    }
  }

  // Initialize the board
  Board.initalize();

  /***
  Events
  ***/

  // Select the piece on click if it is the player's turn
  $('.piece').on("click", function () {
    var selected;
    var isPlayersTurn = ($(this).parent().attr("class").split(' ')[0] == "player" + Board.playerTurn + "pieces");
    if (isPlayersTurn) {
      if (!Board.continuousjump && pieces[$(this).attr("id")].allowedtomove) {
        if ($(this).hasClass('selected')) selected = true;
        $('.piece').removeClass('selected');
        if (!selected) {
          $(this).addClass('selected');
        }
      } else {
        let message = !Board.continuousjump ? "Jump exists for other pieces, that piece is not allowed to move" : "Continuous jump exists, you have to jump the same piece";
        console.log(message);
      }
    }
  });

  // Reset game when clear button is pressed
  $('#cleargame').on("click", function () {
    Board.clear();
  });

  // Move piece when tile is clicked
  $('.tile').on("click", function () {
    if ($('.selected').length != 0) {
      var tileID = $(this).attr("id").replace(/tile/, '');
      var tile = tiles[tileID];
      var piece = pieces[$('.selected').attr("id")];
      var inRange = tile.inRange(piece);
      
      // Check if the selected tile is the same as the piece's current position
      if (tile.position[0] === piece.position[0] && tile.position[1] === piece.position[1]) {
          console.log("You cannot move to the same tile!");
          return; // Prevent moving to the same tile
      }

      // Log the tile number instead of coordinates
      console.log("Moving to tile number: " + convertToTileNumber(tile.position[0], tile.position[1]));

      if (inRange != 'wrong') {
        if (inRange == 'jump') {
          if (piece.opponentJump(tile)) {
            piece.move(tile);
            updateMoveHistory("Player " + piece.player + " jumped from " + piece.position + " to " + tile.position + " (captured opponent's piece)");
            if (piece.canJumpAny()) {
              piece.element.addClass('selected');
              Board.continuousjump = true;
            } else {
              Board.changePlayerTurn();
            }
          }
        } else if (inRange == 'regular' && !Board.jumpexist) {
          if (!piece.canJumpAny()) {
            piece.move(tile);
            updateMoveHistory("Player " + piece.player + " moved from " + piece.position + " to " + tile.position);
            Board.changePlayerTurn();
          } else {
            alert("You must jump when possible!");
          }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function() {
  const instructionsButton = document.getElementById("instructions-button");
  const instructionsPopup = document.getElementById("instructions-popup");
  const closePopup = document.getElementById("close-popup");

  instructionsButton.addEventListener("click", function() {
      instructionsPopup.style.display = "block";
  });

  closePopup.addEventListener("click", function() {
      instructionsPopup.style.display = "none";
  });

  window.addEventListener("click", function(event) {
      if (event.target == instructionsPopup) {
          instructionsPopup.style.display = "none";
      }
  });
});
