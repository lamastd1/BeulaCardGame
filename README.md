# Beaula Card Game
This repo implements the card game Beaula, as there are no easily accessible implementations.

## Design
Note: This should be moved to a separate document at a later date (which is most likely never)

1 52 card deck

REST API
- Support at least 5 players
- Server Owns:
  - Each player's deck
  - 5 cards in the middle
  - 

Client needs to know:
- Their hand
- Who's turn it is
- Wildcard (maybe)
- Cards in middle flipped
- Person passes
- Who did what action
- Person takes the middle
- Knock or not
- Everyone's hands (at the end)

Client

Problems:
- How does the server update the clients (or do the clients poll)
