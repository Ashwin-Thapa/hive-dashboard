ORG 0000H
MOV R0,#45H ;source pointer
MOV R1,#79H ;destination pointer
MOV R3,#10 ;counter
BACK: MOV A,@R0 ;get a byte from source
ADD A,#02H; add two to each byte
MOV @R1,A ;copy it to destination
INC R0 ;increment source pointer
DEC R1 ;decrement destination pointer
DJNZ R3,BACK ;keep doing for ten bytes
END
