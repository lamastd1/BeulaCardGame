import sys
userDeck = [sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]]
cardToRemove = int(input("select which card to remove: "))
# print(userDeck)
# hiddenDeck = [2, 3, 4, 5, 6]
for i in range(len(userDeck)):
  print(userDeck[i] + " ")
