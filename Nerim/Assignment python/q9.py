#Program to find duplication of element in a list

##L = [1,2,3,4,5,1,2,5,6,7,7,8,9,10,11,12,10,1]
##L2 = []
##for i in range(len(L)):
##    for j in range(i+1,len(L)):
##        if(L[i] == L[j]) and L[i] not in L2:
##            L2.append(L[i])
##
##print(L2)

L = [1,2,3,4,5,1,2,3,7,8,9,1,2,9]
L2 = []

for i in L:
    n = L.count(i)
    if n > 1:
        if L2.count(i) == 0:
            L2.append(i)

print(L2)
