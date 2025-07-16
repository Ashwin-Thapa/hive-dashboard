ORG 0000H
MOV R0, #0FFH   
MOV R1, #09H
MOV A,#0                  
ADD A,R0
ADD A,R1 
MOV R3,A
MOV P1,#0FFH ;make P1 an input port
MOV A,P1 ;read P1 port
CJNE A,#0FFH,OVER ;jump if A is not 75
SJMP EXIT ;A=75, exit
OVER: JNC NEXT ;if CY=0 then A>75
MOV R3,A ;CY=1, A<75, save in R1
SJMP EXIT ; and exit
NEXT: MOV R4,A ;A>75, save it in R2
EXIT: MOV A,R5
END