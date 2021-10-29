data16 myRectangle = { $A3, $1B, $04, $10 }

structure Rectangle {
  x: $2,
  y: $2,
  w: $2,
  h: $2
}

start_of_code:
  mov &[ <Rectangle> myRectangle.y ], r1
